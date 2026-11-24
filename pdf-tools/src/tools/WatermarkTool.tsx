import { useMemo, useState } from "react";
import { LoaderCircle, Stamp } from "lucide-react";
import {
  ALL_PAGES,
  ErrorMessage,
  PageChoice,
  PrivacyNote,
  resolvePageChoice,
  SinglePdfPicker,
  SuccessMessage,
  ToolLayout,
  type PageChoiceValue,
} from "../components";
import { downloadPdf, errorMessage, fileStem, formatBytes, pluralize } from "../lib/files";
import {
  unsupportedCharacters,
  watermarkAngle,
  watermarkCenters,
  watermarkFontSize,
  type WatermarkLayout,
  type WatermarkSize,
} from "../lib/stamp";
import type { ToolInfo } from "../tools";
import { useSinglePdf } from "../useSinglePdf";

const LAYOUTS: { id: WatermarkLayout; label: string; hint: string }[] = [
  { id: "diagonal", label: "Diagonal", hint: "Once, corner to corner." },
  { id: "horizontal", label: "Horizontal", hint: "Once, across the middle." },
  { id: "tiled", label: "Tiled", hint: "Repeated over the whole page." },
];

const COLORS = [
  { value: "#7f8792", label: "Grey" },
  { value: "#d23b3b", label: "Red" },
  { value: "#2f62d0", label: "Blue" },
  { value: "#1f2430", label: "Black" },
];

const PRESETS = ["CONFIDENTIAL", "DRAFT", "COPY", "SAMPLE", "DO NOT COPY"];

/** Width of the text at 1 pt in a Helvetica-like bold font, measured by the browser. */
function measureUnitWidth(text: string): number {
  const context = document.createElement("canvas").getContext("2d");
  if (!context) return text.length * 0.6;
  context.font = "bold 100px Helvetica, Arial, sans-serif";
  return context.measureText(text).width / 100;
}

function WatermarkPreview({
  thumbnail,
  aspect,
  text,
  layout,
  size,
  color,
  opacity,
  onAspect,
}: {
  thumbnail?: string;
  /** Page height ÷ width */
  aspect: number;
  text: string;
  layout: WatermarkLayout;
  size: WatermarkSize;
  color: string;
  opacity: number;
  onAspect: (aspect: number) => void;
}) {
  // Draw in PDF points on an A4-width page so the preview matches the real result closely.
  const page = { width: 595, height: 595 * aspect };
  const unitWidth = useMemo(() => measureUnitWidth(text), [text]);
  const fontSize = watermarkFontSize(layout, size, page, unitWidth);
  const angle = watermarkAngle(layout, page);
  const centers = text ? watermarkCenters(layout, page, unitWidth * fontSize, fontSize) : [];
  return (
    <div className="stamp-preview">
      {thumbnail ? (
        <img
          src={thumbnail}
          alt=""
          onLoad={(event) => {
            const image = event.currentTarget;
            if (image.naturalWidth) onAspect(image.naturalHeight / image.naturalWidth);
          }}
        />
      ) : (
        <span className="thumb-loading" />
      )}
      <svg
        className="stamp-overlay"
        viewBox={`0 0 ${page.width} ${page.height}`}
        preserveAspectRatio="none"
        aria-hidden
      >
        {centers.map((center, index) => {
          const y = page.height - center.y;
          return (
            <text
              key={index}
              x={center.x}
              y={y}
              fill={color}
              fillOpacity={opacity}
              fontSize={fontSize}
              fontWeight={700}
              fontFamily="Helvetica, Arial, sans-serif"
              textAnchor="middle"
              dominantBaseline="central"
              transform={`rotate(${-angle} ${center.x} ${y})`}
            >
              {text}
            </text>
          );
        })}
      </svg>
    </div>
  );
}

export default function WatermarkTool({ tool }: { tool: ToolInfo }) {
  const { pdf, thumbnails, loading, error: loadError, open, clear } = useSinglePdf();
  const [text, setText] = useState("CONFIDENTIAL");
  const [layout, setLayout] = useState<WatermarkLayout>("diagonal");
  const [size, setSize] = useState<WatermarkSize>("medium");
  const [color, setColor] = useState(COLORS[0].value);
  const [opacity, setOpacity] = useState(0.25);
  const [choice, setChoice] = useState<PageChoiceValue>(ALL_PAGES);
  const [aspect, setAspect] = useState(Math.SQRT2);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const pageCount = pdf?.pageCount ?? 0;
  const chosen = useMemo(() => resolvePageChoice(choice, pageCount), [choice, pageCount]);
  const cleanText = text.replace(/\s+/g, " ").trim();
  const unsupported = unsupportedCharacters(cleanText);
  const textError = !cleanText
    ? "Type the watermark text."
    : unsupported.length
      ? `Only Latin letters, numbers and common symbols can be used. Remove: ${unsupported.join(" ")}`
      : "";
  const previewIndex = chosen.pages ? chosen.pages[0] : 0;
  const previewThumbnail = previewIndex !== undefined ? thumbnails[previewIndex] : undefined;

  const openFile = async (files: File[]) => {
    setError("");
    setSuccess("");
    setChoice(ALL_PAGES);
    await open(files);
  };

  const save = async () => {
    if (!pdf) return;
    setError("");
    setSuccess("");
    if (textError) return setError(textError);
    if (chosen.error) return setError(chosen.error);
    setBusy(true);
    try {
      const { addWatermark } = await import("../lib/pdf");
      const result = await addWatermark(pdf.bytes, {
        text: cleanText,
        layout,
        size,
        color,
        opacity,
        pages: chosen.pages,
      });
      downloadPdf(result, `${fileStem(pdf.file.name)}-watermarked.pdf`);
      setSuccess(
        `Added the watermark to ${pluralize(chosen.count, "page")} (${formatBytes(result.byteLength)}).`,
      );
    } catch (reason) {
      setError(errorMessage(reason, "The watermark could not be added. Please try again."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <ToolLayout tool={tool}>
      <SinglePdfPicker
        pdf={pdf}
        loading={loading}
        busy={busy}
        onFiles={(files) => void openFile(files)}
        onClear={clear}
      />

      {pdf ? (
        <div className="stamp-editor">
          <div className="stamp-preview-panel">
            <span className="preview-caption">
              Preview{previewIndex !== undefined ? ` · page ${previewIndex + 1}` : ""}
            </span>
            <WatermarkPreview
              thumbnail={previewThumbnail}
              aspect={aspect}
              text={textError ? "" : cleanText}
              layout={layout}
              size={size}
              color={color}
              opacity={opacity}
              onAspect={setAspect}
            />
          </div>

          <div className="stamp-options">
            <label className="field">
              <span>Watermark text</span>
              <input
                value={text}
                maxLength={60}
                onChange={(event) => setText(event.target.value)}
                aria-invalid={Boolean(textError)}
              />
              {textError ? <small className="field-error">{textError}</small> : null}
            </label>
            <div className="chip-row" aria-label="Suggestions">
              {PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  className={cleanText === preset ? "chip active" : "chip"}
                  onClick={() => setText(preset)}
                >
                  {preset}
                </button>
              ))}
            </div>

            <div className="mode-picker compact" role="radiogroup" aria-label="Layout">
              {LAYOUTS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  role="radio"
                  aria-checked={layout === option.id}
                  className={layout === option.id ? "mode active" : "mode"}
                  onClick={() => setLayout(option.id)}
                >
                  <b>{option.label}</b>
                  <small>{option.hint}</small>
                </button>
              ))}
            </div>

            <div className="options-row two">
              <label className="field">
                <span>Size</span>
                <select
                  value={size}
                  onChange={(event) => setSize(event.target.value as WatermarkSize)}
                >
                  <option value="small">Small</option>
                  <option value="medium">Medium</option>
                  <option value="large">Large</option>
                </select>
              </label>
              <div className="field">
                <span>Colour</span>
                <div className="swatches" role="radiogroup" aria-label="Colour">
                  {COLORS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      role="radio"
                      aria-checked={color === option.value}
                      aria-label={option.label}
                      title={option.label}
                      className={color === option.value ? "swatch active" : "swatch"}
                      style={{ background: option.value }}
                      onClick={() => setColor(option.value)}
                    />
                  ))}
                </div>
              </div>
            </div>

            <label className="field">
              <span>
                Opacity <output>{Math.round(opacity * 100)}%</output>
              </span>
              <input
                type="range"
                className="range"
                min={10}
                max={80}
                step={5}
                value={Math.round(opacity * 100)}
                onChange={(event) => setOpacity(Number(event.target.value) / 100)}
              />
            </label>

            <PageChoice value={choice} pageCount={pdf.pageCount} onChange={setChoice} />
          </div>
        </div>
      ) : null}

      <ErrorMessage>{loadError || error}</ErrorMessage>
      <SuccessMessage>{success}</SuccessMessage>

      {pdf ? (
        <div className="action-row">
          <span className="action-summary">
            {chosen.count ? `Watermark on ${pluralize(chosen.count, "page")}` : "No pages chosen"}
          </span>
          <button
            type="button"
            className="primary-button"
            onClick={() => void save()}
            disabled={busy || !chosen.count || Boolean(textError)}
          >
            {busy ? <LoaderCircle size={17} className="spin" /> : <Stamp size={17} />}
            {busy ? "Adding watermark…" : "Add watermark & download"}
          </button>
        </div>
      ) : null}
      <PrivacyNote />
    </ToolLayout>
  );
}
