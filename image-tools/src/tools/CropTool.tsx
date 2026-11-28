import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import {
  Crop,
  FlipHorizontal2,
  FlipVertical2,
  ImageIcon,
  LoaderCircle,
  RotateCcw,
  RotateCw,
  Undo2,
} from "lucide-react";
import {
  Dropzone,
  ErrorMessage,
  FormatPicker,
  PrivacyNote,
  ProgressMessage,
  QualitySlider,
  SuccessMessage,
  ToolLayout,
} from "../components";
import { downloadBlob, errorMessage, formatBytes } from "../lib/files";
import {
  ACCEPT_ATTRIBUTE,
  ACCEPTED_LABEL,
  formatForType,
  outputName,
  type OutputFormat,
} from "../lib/formats";
import {
  centeredCrop,
  moveCrop,
  resizeCrop,
  rotatedSize,
  roundCrop,
  type Corner,
  type Rect,
  type Size,
} from "../lib/geometry";
import {
  drawPreview,
  loadImage,
  renderCropped,
  type LoadedImage,
  type Transform,
} from "../lib/render";
import type { ToolInfo } from "../tools";
import { useImageList } from "../useImageList";

const ASPECTS: { id: string; label: string; ratio?: number }[] = [
  { id: "free", label: "Free" },
  { id: "original", label: "Original" },
  { id: "1:1", label: "1:1", ratio: 1 },
  { id: "4:5", label: "4:5", ratio: 4 / 5 },
  { id: "3:2", label: "3:2", ratio: 3 / 2 },
  { id: "4:3", label: "4:3", ratio: 4 / 3 },
  { id: "16:9", label: "16:9", ratio: 16 / 9 },
  { id: "9:16", label: "9:16", ratio: 9 / 16 },
];

const CORNERS: Corner[] = ["nw", "ne", "sw", "se"];
const NO_TRANSFORM: Transform = { rotation: 0, flipX: false, flipY: false };

type FormatChoice = OutputFormat | "original";

export default function CropTool({ tool }: { tool: ToolInfo }) {
  const { items, adding, error: addError, add, clear } = useImageList({ multiple: false });
  const item = items[0];
  const [image, setImage] = useState<LoadedImage | null>(null);
  const [transform, setTransform] = useState<Transform>(NO_TRANSFORM);
  const [aspectId, setAspectId] = useState("free");
  const [crop, setCrop] = useState<Rect>({ x: 0, y: 0, width: 1, height: 1 });
  const [format, setFormat] = useState<FormatChoice>("original");
  const [quality, setQuality] = useState(0.92);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);

  const turned: Size = image ? rotatedSize(image, transform.rotation) : { width: 1, height: 1 };
  const aspectRatio = (id: string, size: Size) =>
    id === "original" ? size.width / size.height : ASPECTS.find((a) => a.id === id)?.ratio;
  const ratio = aspectRatio(aspectId, turned);
  const rounded = roundCrop(crop, turned);

  // Decode the chosen image once and keep it for previews and saving.
  useEffect(() => {
    setImage(null);
    setTransform(NO_TRANSFORM);
    setSuccess("");
    if (!item) return;
    let cancelled = false;
    let loaded: LoadedImage | null = null;
    loadImage(item.file)
      .then((result) => {
        if (cancelled) return result.close();
        loaded = result;
        setImage(result);
        setCrop(centeredCrop(result, aspectRatio(aspectId, result)));
      })
      .catch((reason) => setError(errorMessage(reason, "This image could not be opened.")));
    return () => {
      cancelled = true;
      loaded?.close();
    };
    // The aspect only sets the starting crop; changing it later is handled separately.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item]);

  // Redraw the preview when the image is rotated or flipped.
  useEffect(() => {
    if (image && canvasRef.current) drawPreview(canvasRef.current, image, transform, 1400);
  }, [image, transform]);

  const chooseAspect = (id: string) => {
    setAspectId(id);
    setCrop(centeredCrop(turned, aspectRatio(id, turned)));
    setSuccess("");
  };

  const rotate = (delta: number) => {
    if (!image) return;
    const next = { ...transform, rotation: (transform.rotation + delta + 360) % 360 };
    const size = rotatedSize(image, next.rotation);
    setTransform(next);
    setCrop(centeredCrop(size, aspectRatio(aspectId, size)));
    setSuccess("");
  };

  // Mirror the crop box too, so it keeps framing the same part of the picture.
  const flip = (axis: "x" | "y") => {
    setTransform((current) =>
      axis === "x" ? { ...current, flipX: !current.flipX } : { ...current, flipY: !current.flipY },
    );
    setCrop((current) =>
      axis === "x"
        ? { ...current, x: turned.width - current.x - current.width }
        : { ...current, y: turned.height - current.y - current.height },
    );
    setSuccess("");
  };

  const reset = () => {
    if (!image) return;
    setTransform(NO_TRANSFORM);
    setAspectId("free");
    setCrop(centeredCrop(image));
    setSuccess("");
  };

  const startDrag = (event: PointerEvent, corner?: Corner) => {
    if (event.button !== 0 || !stageRef.current) return;
    event.preventDefault();
    event.stopPropagation();
    const rect = stageRef.current.getBoundingClientRect();
    // Screen pixels → image pixels.
    const scale = turned.width / rect.width;
    const start = { x: event.clientX, y: event.clientY, crop };
    const move = (moveEvent: globalThis.PointerEvent) => {
      const dx = (moveEvent.clientX - start.x) * scale;
      const dy = (moveEvent.clientY - start.y) * scale;
      setCrop(
        corner
          ? resizeCrop(start.crop, corner, dx, dy, turned, ratio)
          : moveCrop(start.crop, dx, dy, turned),
      );
    };
    const stop = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", stop);
      window.removeEventListener("pointercancel", stop);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", stop);
    window.addEventListener("pointercancel", stop);
    setSuccess("");
  };

  const onKeyDown = (event: KeyboardEvent) => {
    const step = Math.max(1, Math.round(turned.width / (event.shiftKey ? 20 : 100)));
    const moves: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
    };
    const delta = moves[event.key];
    if (!delta) return;
    event.preventDefault();
    setCrop((current) => moveCrop(current, delta[0], delta[1], turned));
  };

  // Typing an exact size keeps the box centred where it was.
  const typeSize = (side: "width" | "height", value: string) => {
    const number = Number.parseInt(value.replace(/\D/g, ""), 10);
    if (!(number > 0)) return;
    let width = side === "width" ? number : ratio ? number * ratio : crop.width;
    let height = side === "height" ? number : ratio ? number / ratio : crop.height;
    const fit = Math.min(1, turned.width / width, turned.height / height);
    width *= fit;
    height *= fit;
    const centerX = crop.x + crop.width / 2;
    const centerY = crop.y + crop.height / 2;
    setCrop(
      moveCrop({ x: centerX - width / 2, y: centerY - height / 2, width, height }, 0, 0, turned),
    );
    setSuccess("");
  };

  const save = async () => {
    if (!item || !image) return;
    setError("");
    setSuccess("");
    setBusy(true);
    try {
      const outputFormat = format === "original" ? formatForType(item.type) : format;
      const blob = await renderCropped(image, transform, rounded, {
        format: outputFormat,
        quality,
      });
      downloadBlob(blob, outputName(item.file.name, outputFormat, "cropped"));
      setSuccess(
        `Saved a ${rounded.width} × ${rounded.height} px image (${formatBytes(blob.size)}).`,
      );
    } catch (reason) {
      setError(errorMessage(reason, "The image could not be saved. Please try again."));
    } finally {
      setBusy(false);
    }
  };

  const percent = (value: number, total: number) => `${(value / total) * 100}%`;
  const outputFormat = format === "original" && item ? formatForType(item.type) : format;

  return (
    <ToolLayout tool={tool}>
      {!item ? (
        <Dropzone
          accept={ACCEPT_ATTRIBUTE}
          multiple={false}
          title="Drop an image here"
          hint={`${ACCEPTED_LABEL} · up to 50 MB`}
          onFiles={(files) => {
            setError("");
            void add(files);
          }}
        />
      ) : (
        <div className="file-bar">
          <ImageIcon size={20} aria-hidden />
          <div>
            <b title={item.file.name}>{item.file.name}</b>
            <small>
              {item.width} × {item.height} px · {formatBytes(item.file.size)}
            </small>
          </div>
          <button type="button" className="text-button" onClick={clear} disabled={busy}>
            Choose another image
          </button>
        </div>
      )}
      <ProgressMessage>
        {adding || (item && !image && !error) ? "Opening image…" : ""}
      </ProgressMessage>
      <ErrorMessage>{addError}</ErrorMessage>

      {item && image ? (
        <>
          <div className="toolbar">
            <div className="segmented aspect-picker" role="radiogroup" aria-label="Shape">
              {ASPECTS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  role="radio"
                  aria-checked={aspectId === option.id}
                  className={aspectId === option.id ? "active" : ""}
                  onClick={() => chooseAspect(option.id)}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <div>
              <button
                type="button"
                className="icon-button"
                aria-label="Rotate left"
                title="Rotate left"
                onClick={() => rotate(-90)}
              >
                <RotateCcw size={16} />
              </button>
              <button
                type="button"
                className="icon-button"
                aria-label="Rotate right"
                title="Rotate right"
                onClick={() => rotate(90)}
              >
                <RotateCw size={16} />
              </button>
              <button
                type="button"
                className="icon-button"
                aria-label="Flip horizontally"
                title="Flip horizontally"
                onClick={() => flip("x")}
              >
                <FlipHorizontal2 size={16} />
              </button>
              <button
                type="button"
                className="icon-button"
                aria-label="Flip vertically"
                title="Flip vertically"
                onClick={() => flip("y")}
              >
                <FlipVertical2 size={16} />
              </button>
              <button
                type="button"
                className="icon-button"
                aria-label="Reset"
                title="Reset"
                onClick={reset}
              >
                <Undo2 size={16} />
              </button>
            </div>
          </div>

          <div className="crop-area">
            <div
              ref={stageRef}
              className="crop-stage checkered"
              style={{
                aspectRatio: `${turned.width} / ${turned.height}`,
                // Keep the whole picture on screen, whatever its shape.
                width: `min(100%, calc((100vh - 160px) * ${turned.width / turned.height}))`,
              }}
            >
              <canvas ref={canvasRef} aria-label="Image preview" />
              <div
                className="crop-box"
                style={{
                  left: percent(crop.x, turned.width),
                  top: percent(crop.y, turned.height),
                  width: percent(crop.width, turned.width),
                  height: percent(crop.height, turned.height),
                }}
                tabIndex={0}
                role="group"
                aria-label="Crop area. Drag to move, drag a corner to resize, or use the arrow keys."
                onPointerDown={(event) => startDrag(event)}
                onKeyDown={onKeyDown}
              >
                <span className="crop-grid" aria-hidden />
                {CORNERS.map((corner) => (
                  <span
                    key={corner}
                    className={`crop-handle ${corner}`}
                    aria-hidden
                    onPointerDown={(event) => startDrag(event, corner)}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="settings">
            <div className="options-grid crop-options">
              <label className="field">
                <span>Width (px)</span>
                <input
                  key={`w-${rounded.width}`}
                  inputMode="numeric"
                  defaultValue={rounded.width}
                  onBlur={(event) => typeSize("width", event.target.value)}
                  onKeyDown={(event) =>
                    event.key === "Enter" && typeSize("width", event.currentTarget.value)
                  }
                />
              </label>
              <label className="field">
                <span>Height (px)</span>
                <input
                  key={`h-${rounded.height}`}
                  inputMode="numeric"
                  defaultValue={rounded.height}
                  onBlur={(event) => typeSize("height", event.target.value)}
                  onKeyDown={(event) =>
                    event.key === "Enter" && typeSize("height", event.currentTarget.value)
                  }
                />
              </label>
              <FormatPicker<FormatChoice>
                value={format}
                options={["original", "jpeg", "png", "webp"]}
                onChange={setFormat}
              />
            </div>
            {outputFormat !== "png" ? (
              <QualitySlider value={quality} onChange={setQuality} />
            ) : null}
          </div>
        </>
      ) : null}

      <ErrorMessage>{error}</ErrorMessage>
      <SuccessMessage>{success}</SuccessMessage>

      {item && image ? (
        <div className="action-row">
          <span className="action-summary">
            New size: {rounded.width} × {rounded.height} px
          </span>
          <button
            type="button"
            className="primary-button"
            onClick={() => void save()}
            disabled={busy}
          >
            {busy ? <LoaderCircle size={17} className="spin" /> : <Crop size={17} />}
            {busy ? "Saving…" : "Crop & download"}
          </button>
        </div>
      ) : null}
      <PrivacyNote />
    </ToolLayout>
  );
}
