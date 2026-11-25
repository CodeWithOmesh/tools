import { useState } from "react";
import { LoaderCircle, Lock, Scaling } from "lucide-react";
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
  formatForType,
  outputName,
  type OutputFormat,
} from "../lib/formats";
import { matchSide, MAX_SIDE, planResize, tooLarge, type ResizeSpec } from "../lib/geometry";
import { renderResized } from "../lib/render";
import type { ToolInfo } from "../tools";
import { useImageList, type ImageItem } from "../useImageList";

type Mode = "size" | "percent" | "preset";

const MODES: { id: Mode; label: string; hint: string }[] = [
  { id: "size", label: "By size", hint: "Set the width and height in pixels." },
  { id: "percent", label: "By percentage", hint: "Make images a % of their size." },
  { id: "preset", label: "Social media", hint: "Instagram, Facebook, YouTube…" },
];

const PERCENTAGES = [25, 50, 75, 150, 200];

const PRESETS = [
  { id: "ig-square", label: "Instagram post (square)", width: 1080, height: 1080 },
  { id: "ig-portrait", label: "Instagram post (portrait)", width: 1080, height: 1350 },
  { id: "story", label: "Instagram / WhatsApp story", width: 1080, height: 1920 },
  { id: "fb-post", label: "Facebook post / link", width: 1200, height: 630 },
  { id: "fb-cover", label: "Facebook cover", width: 851, height: 315 },
  { id: "yt-thumb", label: "YouTube thumbnail", width: 1280, height: 720 },
  { id: "x-post", label: "X (Twitter) post", width: 1600, height: 900 },
  { id: "li-banner", label: "LinkedIn banner", width: 1584, height: 396 },
  { id: "full-hd", label: "Full HD (1920 × 1080)", width: 1920, height: 1080 },
];

type FormatChoice = OutputFormat | "original";

const toNumber = (value: string) => {
  const number = Number.parseInt(value, 10);
  return Number.isFinite(number) && number > 0 ? number : undefined;
};

export default function ResizeTool({ tool }: { tool: ToolInfo }) {
  const { items, adding, error: addError, add, remove, clear } = useImageList({ multiple: true });
  const [mode, setMode] = useState<Mode>("size");
  const [width, setWidth] = useState("");
  const [height, setHeight] = useState("");
  const [keepShape, setKeepShape] = useState(true);
  const [percent, setPercent] = useState(50);
  const [presetId, setPresetId] = useState(PRESETS[0].id);
  const [presetFit, setPresetFit] = useState<"cover" | "pad">("cover");
  const [format, setFormat] = useState<FormatChoice>("original");
  const [quality, setQuality] = useState(0.9);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const single = items.length === 1 ? items[0] : undefined;
  const preset = PRESETS.find((item) => item.id === presetId) ?? PRESETS[0];
  const widthValue = toNumber(width);
  const heightValue = toNumber(height);

  const spec: ResizeSpec =
    mode === "percent"
      ? { kind: "percent", percent }
      : mode === "preset"
        ? { kind: "preset", width: preset.width, height: preset.height, fit: presetFit }
        : { kind: "size", width: widthValue, height: heightValue, keepShape };

  const specError =
    mode !== "size"
      ? ""
      : !widthValue && !heightValue
        ? "Type a width, a height or both."
        : !keepShape && (!widthValue || !heightValue)
          ? "Type both the width and height, or turn on “Keep proportions”."
          : (widthValue ?? 0) > MAX_SIDE || (heightValue ?? 0) > MAX_SIDE
            ? `Sizes can be up to ${MAX_SIDE.toLocaleString()} pixels.`
            : "";

  const formatFor = (item: ImageItem) =>
    format === "original" ? formatForType(item.type) : format;
  const lossless =
    format === "png" ||
    (format === "original" && items.every((item) => formatForType(item.type) === "png"));

  // With one image and "keep proportions" on, fill in the other side as the user types.
  const typeSide = (side: "width" | "height", value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 5);
    if (side === "width") setWidth(digits);
    else setHeight(digits);
    if (single && keepShape) {
      const other = matchSide(single, side, Number(digits));
      if (side === "width") setHeight(other ? String(other) : "");
      else setWidth(other ? String(other) : "");
    }
  };

  const detail = (item: ImageItem) => {
    const from = `${item.width} × ${item.height}`;
    if (specError) return from;
    const { output } = planResize(item, spec);
    const enlarged = output.width > item.width || output.height > item.height;
    return (
      <>
        {from} → <b>{`${output.width} × ${output.height}`}</b>
        {tooLarge(output) ? (
          <em className="warn"> too large</em>
        ) : enlarged ? (
          <em className="warn"> enlarged</em>
        ) : null}
      </>
    );
  };

  const addFiles = (files: File[]) => {
    setSuccess("");
    void add(files);
  };

  const run = async () => {
    setError("");
    setSuccess("");
    if (!items.length) return setError("Add at least one image.");
    if (specError) return setError(specError);
    setBusy(true);
    try {
      const outputs = await processImages(
        items,
        async (item, image) => {
          const plan = planResize(image, spec);
          const outputFormat = formatFor(item);
          const blob = await renderResized(image, plan, {
            format: outputFormat,
            quality,
            background: spec.kind === "preset" && spec.fit === "pad" ? "#ffffff" : undefined,
          });
          return {
            name: outputName(
              item.file.name,
              outputFormat,
              `${plan.output.width}x${plan.output.height}`,
            ),
            blob,
          };
        },
        setProgress,
      );
      setProgress(outputs.length > 1 ? "Creating ZIP file…" : "");
      await saveOutputs(outputs, "resized-images.zip");
      const total = outputs.reduce((sum, output) => sum + output.blob.size, 0);
      setSuccess(
        outputs.length === 1
          ? `Saved the resized image (${formatBytes(total)}).`
          : `Saved ${pluralize(outputs.length, "resized image")} in a ZIP file (${formatBytes(total)}).`,
      );
    } catch (reason) {
      setError(errorMessage(reason, "The images could not be resized. Please try again."));
    } finally {
      setBusy(false);
      setProgress("");
    }
  };

  return (
    <ToolLayout tool={tool}>
      <Dropzone
        accept={ACCEPT_ATTRIBUTE}
        multiple
        compact={items.length > 0}
        title={items.length ? "Add more images" : "Drop your images here"}
        hint={`${ACCEPTED_LABEL} · up to 50 MB each`}
        onFiles={addFiles}
      />
      <ProgressMessage>{adding ? "Opening images…" : ""}</ProgressMessage>
      <ErrorMessage>{addError}</ErrorMessage>

      <ImageGrid items={items} busy={busy} detail={detail} onRemove={remove} onClear={clear} />

      {items.length ? (
        <div className="settings">
          <div className="mode-picker" role="radiogroup" aria-label="How to resize">
            {MODES.map((option) => (
              <button
                key={option.id}
                type="button"
                role="radio"
                aria-checked={mode === option.id}
                className={mode === option.id ? "mode active" : "mode"}
                onClick={() => setMode(option.id)}
              >
                <b>{option.label}</b>
                <small>{option.hint}</small>
              </button>
            ))}
          </div>

          {mode === "size" ? (
            <div className="size-row">
              <label className="field">
                <span>Width (px)</span>
                <input
                  inputMode="numeric"
                  value={width}
                  placeholder={single ? String(single.width) : "Auto"}
                  onChange={(event) => typeSide("width", event.target.value)}
                />
              </label>
              <span className="size-times" aria-hidden>
                ×
              </span>
              <label className="field">
                <span>Height (px)</span>
                <input
                  inputMode="numeric"
                  value={height}
                  placeholder={single ? String(single.height) : "Auto"}
                  onChange={(event) => typeSide("height", event.target.value)}
                />
              </label>
              <label className="check">
                <input
                  type="checkbox"
                  checked={keepShape}
                  onChange={(event) => setKeepShape(event.target.checked)}
                />
                <Lock size={14} /> Keep proportions
              </label>
              <small className={specError && (width || height) ? "field-error" : "field-hint"}>
                {specError && (width || height)
                  ? specError
                  : keepShape
                    ? items.length > 1
                      ? "Each image is scaled to fit inside this size without being stretched."
                      : "Type one side and the other is worked out for you."
                    : "Images are stretched to exactly this size."}
              </small>
            </div>
          ) : null}

          {mode === "percent" ? (
            <div className="field">
              <span>
                New size <output>{percent}%</output>
              </span>
              <div className="chip-row">
                {PERCENTAGES.map((value) => (
                  <button
                    key={value}
                    type="button"
                    className={percent === value ? "chip active" : "chip"}
                    onClick={() => setPercent(value)}
                  >
                    {value}%
                  </button>
                ))}
              </div>
              <input
                type="range"
                className="range"
                min={5}
                max={300}
                step={5}
                value={percent}
                aria-label="Percentage"
                onChange={(event) => setPercent(Number(event.target.value))}
              />
            </div>
          ) : null}

          {mode === "preset" ? (
            <div className="options-grid two">
              <label className="field">
                <span>Size</span>
                <select value={presetId} onChange={(event) => setPresetId(event.target.value)}>
                  {PRESETS.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label} – {option.width} × {option.height}
                    </option>
                  ))}
                </select>
              </label>
              <div className="field">
                <span>If the shape is different</span>
                <div className="segmented" role="radiogroup" aria-label="If the shape is different">
                  <button
                    type="button"
                    role="radio"
                    aria-checked={presetFit === "cover"}
                    className={presetFit === "cover" ? "active" : ""}
                    onClick={() => setPresetFit("cover")}
                  >
                    Crop to fill
                  </button>
                  <button
                    type="button"
                    role="radio"
                    aria-checked={presetFit === "pad"}
                    className={presetFit === "pad" ? "active" : ""}
                    onClick={() => setPresetFit("pad")}
                  >
                    Fit with white border
                  </button>
                </div>
              </div>
            </div>
          ) : null}

          <div className="options-grid two">
            <FormatPicker<FormatChoice>
              value={format}
              options={["original", "jpeg", "png", "webp"]}
              onChange={setFormat}
            />
            <QualitySlider value={quality} onChange={setQuality} disabled={lossless} />
          </div>
          {format === "original" &&
          items.some((item) => formatForType(item.type) === "png" && item.type !== "image/png") ? (
            <p className="field-hint">
              GIF, BMP, AVIF and SVG images are saved as {FORMATS.png.label}.
            </p>
          ) : null}
        </div>
      ) : null}

      <ProgressMessage>{progress}</ProgressMessage>
      <ErrorMessage>{error}</ErrorMessage>
      <SuccessMessage>{success}</SuccessMessage>

      <div className="action-row">
        <span className="action-summary">
          {items.length
            ? `${pluralize(items.length, "image")} to resize`
            : "Add images to resize them."}
        </span>
        <button
          type="button"
          className="primary-button"
          onClick={() => void run()}
          disabled={busy || adding || !items.length || Boolean(specError)}
        >
          {busy ? <LoaderCircle size={17} className="spin" /> : <Scaling size={17} />}
          {busy ? "Resizing…" : "Resize & download"}
        </button>
      </div>
      <PrivacyNote />
    </ToolLayout>
  );
}
