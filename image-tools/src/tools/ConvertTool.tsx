import { useState } from "react";
import { LoaderCircle, Repeat2 } from "lucide-react";
import {
  Dropzone,
  ErrorMessage,
  FormatPicker,
  ImageGrid,
  PrivacyNote,
  ProgressMessage,
  QualitySlider,
  SuccessMessage,
  ToolLayout,
} from "../components";
import { processImages, saveOutputs } from "../lib/batch";
import { errorMessage, formatBytes, pluralize } from "../lib/files";
import {
  ACCEPT_ATTRIBUTE,
  ACCEPTED_LABEL,
  FORMATS,
  imageType,
  outputName,
  type OutputFormat,
} from "../lib/formats";
import { renderResized } from "../lib/render";
import type { ToolInfo } from "../tools";
import { useImageList, type ImageItem } from "../useImageList";

const BACKGROUNDS = [
  { value: "#ffffff", label: "White" },
  { value: "#000000", label: "Black" },
];

/** Short label for an input type, such as "PNG" for image/png. */
function typeLabel(type: string): string {
  const name = type.replace("image/", "").replace("+xml", "").toUpperCase();
  return name === "JPEG" ? "JPG" : name;
}

export default function ConvertTool({ tool }: { tool: ToolInfo }) {
  const { items, adding, error: addError, add, remove, clear } = useImageList({ multiple: true });
  const [format, setFormat] = useState<OutputFormat>("jpeg");
  const [quality, setQuality] = useState(0.9);
  const [background, setBackground] = useState(BACKGROUNDS[0].value);
  const [sizes, setSizes] = useState<Record<string, number>>({});
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const target = FORMATS[format];
  const changeFormat = (next: OutputFormat) => {
    setFormat(next);
    setSizes({});
    setSuccess("");
  };

  const detail = (item: ImageItem) => {
    const converted = sizes[item.id];
    return (
      <>
        {typeLabel(imageType(item.file))} → <b>{target.label}</b> · {formatBytes(item.file.size)}
        {converted !== undefined ? <> → {formatBytes(converted)}</> : null}
      </>
    );
  };

  const run = async () => {
    setError("");
    setSuccess("");
    if (!items.length) return setError("Add at least one image.");
    setBusy(true);
    try {
      const outputs = await processImages(
        items,
        async (item, image) => ({
          name: outputName(item.file.name, format),
          blob: await renderResized(
            image,
            {
              output: { width: image.width, height: image.height },
              source: { x: 0, y: 0, width: image.width, height: image.height },
              target: { x: 0, y: 0, width: image.width, height: image.height },
            },
            { format, quality, background: target.transparency ? undefined : background },
          ),
        }),
        setProgress,
      );
      setSizes(Object.fromEntries(outputs.map((output) => [output.id, output.blob.size])));
      setProgress(outputs.length > 1 ? "Creating ZIP file…" : "");
      await saveOutputs(outputs, `images-${target.extension}.zip`);
      const before = items.reduce((sum, item) => sum + item.file.size, 0);
      const after = outputs.reduce((sum, output) => sum + output.blob.size, 0);
      setSuccess(
        `Converted ${pluralize(outputs.length, "image")} to ${target.label} · ${formatBytes(before)} → ${formatBytes(after)}${outputs.length > 1 ? " (ZIP file)" : ""}.`,
      );
    } catch (reason) {
      setError(errorMessage(reason, "The images could not be converted. Please try again."));
    } finally {
      setBusy(false);
      setProgress("");
    }
  };

  const hasTransparency = items.some((item) => imageType(item.file) !== "image/jpeg");

  return (
    <ToolLayout tool={tool}>
      <Dropzone
        accept={ACCEPT_ATTRIBUTE}
        multiple
        compact={items.length > 0}
        title={items.length ? "Add more images" : "Drop your images here"}
        hint={`${ACCEPTED_LABEL} · up to 50 MB each`}
        onFiles={(files) => {
          setSuccess("");
          void add(files);
        }}
      />
      <ProgressMessage>{adding ? "Opening images…" : ""}</ProgressMessage>
      <ErrorMessage>{addError}</ErrorMessage>

      <ImageGrid
        items={items}
        busy={busy}
        detail={detail}
        onRemove={(id) => {
          remove(id);
          setSuccess("");
        }}
        onClear={() => {
          clear();
          setSizes({});
          setSuccess("");
        }}
      />

      {items.length ? (
        <div className="settings">
          <div className="options-grid two">
            <FormatPicker<OutputFormat>
              label="Convert to"
              value={format}
              options={["jpeg", "png", "webp"]}
              onChange={changeFormat}
            />
            <QualitySlider
              value={quality}
              onChange={(value) => {
                setQuality(value);
                setSizes({});
              }}
              disabled={!target.lossy}
            />
          </div>
          {!target.transparency && hasTransparency ? (
            <div className="field">
              <span>Fill transparent areas with</span>
              <div className="swatches" role="radiogroup" aria-label="Background colour">
                {BACKGROUNDS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    role="radio"
                    aria-checked={background === option.value}
                    aria-label={option.label}
                    title={option.label}
                    className={background === option.value ? "swatch active" : "swatch"}
                    style={{ background: option.value }}
                    onClick={() => setBackground(option.value)}
                  />
                ))}
                <small className="field-hint">JPG cannot be transparent.</small>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      <ProgressMessage>{progress}</ProgressMessage>
      <ErrorMessage>{error}</ErrorMessage>
      <SuccessMessage>{success}</SuccessMessage>

      <div className="action-row">
        <span className="action-summary">
          {items.length
            ? `${pluralize(items.length, "image")} → ${target.label}`
            : "Add images to convert them."}
        </span>
        <button
          type="button"
          className="primary-button"
          onClick={() => void run()}
          disabled={busy || adding || !items.length}
        >
          {busy ? <LoaderCircle size={17} className="spin" /> : <Repeat2 size={17} />}
          {busy ? "Converting…" : `Convert to ${target.label}`}
        </button>
      </div>
      <PrivacyNote />
    </ToolLayout>
  );
}
