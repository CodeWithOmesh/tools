import { useRef, useState, type DragEvent, type ReactNode } from "react";
import { Check, LoaderCircle, ShieldCheck, Sparkles, UploadCloud, X } from "lucide-react";
import { FORMATS, type OutputFormat } from "./lib/formats";
import type { ToolInfo } from "./tools";
import type { ImageItem } from "./useImageList";

// ---------------------------------------------------------------------------
// File drop area
// ---------------------------------------------------------------------------

export function Dropzone({
  accept,
  multiple,
  title,
  hint,
  compact = false,
  onFiles,
}: {
  accept: string;
  multiple: boolean;
  title: string;
  hint: string;
  compact?: boolean;
  onFiles: (files: File[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const hasFiles = (event: DragEvent) => Array.from(event.dataTransfer.types).includes("Files");

  return (
    <div
      className={`dropzone${dragging ? " is-dragging" : ""}${compact ? " compact" : ""}`}
      onDragOver={(event) => {
        if (!hasFiles(event)) return;
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(event) => {
        if (!hasFiles(event)) return;
        event.preventDefault();
        setDragging(false);
        onFiles(Array.from(event.dataTransfer.files));
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        hidden
        onChange={(event) => {
          if (event.target.files) onFiles(Array.from(event.target.files));
          event.target.value = "";
        }}
      />
      <div className="dropzone-icon">
        <UploadCloud size={compact ? 20 : 26} />
      </div>
      <div className="dropzone-copy">
        <strong>{title}</strong>
        <span>
          Drag and drop, or{" "}
          <button type="button" className="link-button" onClick={() => inputRef.current?.click()}>
            browse your device
          </button>
        </span>
        <small>{hint}</small>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Messages
// ---------------------------------------------------------------------------

export function ErrorMessage({ children }: { children: ReactNode }) {
  if (!children) return null;
  return (
    <p className="message error" role="alert">
      {children}
    </p>
  );
}

export function SuccessMessage({ children }: { children: ReactNode }) {
  if (!children) return null;
  return (
    <p className="message success" role="status">
      <Check size={15} /> {children}
    </p>
  );
}

export function PrivacyNote() {
  return (
    <p className="privacy-note">
      <ShieldCheck size={15} /> Your images are processed in your browser and never uploaded.
    </p>
  );
}

// ---------------------------------------------------------------------------
// Page layout for each tool
// ---------------------------------------------------------------------------

export function ToolLayout({ tool, children }: { tool: ToolInfo; children: ReactNode }) {
  return (
    <>
      <section className="intro">
        <div className="intro-kicker">
          <Sparkles size={14} /> FREE · PRIVATE · NO SIGN-UP
        </div>
        <h1>
          {tool.headingLead} <span>{tool.headingHighlight}</span>
        </h1>
        <p>{tool.summary}</p>
      </section>
      <section className="tool-card">{children}</section>
      <section className="steps">
        <h2>How it works</h2>
        <ol>
          {tool.steps.map(([title, text], index) => (
            <li key={title}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <b>{title}</b>
              <p>{text}</p>
            </li>
          ))}
        </ol>
      </section>
    </>
  );
}

// ---------------------------------------------------------------------------
// Output settings shared by the tools
// ---------------------------------------------------------------------------

export function ProgressMessage({ children }: { children: ReactNode }) {
  if (!children) return null;
  return (
    <p className="message info">
      <LoaderCircle size={15} className="spin" /> {children}
    </p>
  );
}

export function FormatPicker<T extends OutputFormat | "original">({
  value,
  options,
  onChange,
  label = "Save as",
}: {
  value: T;
  options: T[];
  onChange: (value: T) => void;
  label?: string;
}) {
  return (
    <div className="field">
      <span>{label}</span>
      <div className="segmented" role="radiogroup" aria-label={label}>
        {options.map((option) => (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={value === option}
            className={value === option ? "active" : ""}
            onClick={() => onChange(option)}
          >
            {option === "original" ? "Same as original" : FORMATS[option as OutputFormat].label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function QualitySlider({
  value,
  onChange,
  disabled = false,
}: {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}) {
  return (
    <label className="field">
      <span>
        Quality <output>{disabled ? "Lossless" : `${Math.round(value * 100)}%`}</output>
      </span>
      <input
        type="range"
        className="range"
        min={40}
        max={100}
        step={1}
        value={Math.round(value * 100)}
        disabled={disabled}
        onChange={(event) => onChange(Number(event.target.value) / 100)}
      />
      <small className="field-hint">
        {disabled
          ? "PNG keeps every pixel exactly, so it has no quality setting."
          : "Lower quality makes smaller files. 80–90% looks the same to most people."}
      </small>
    </label>
  );
}

// ---------------------------------------------------------------------------
// The list of added images
// ---------------------------------------------------------------------------

export function ImageGrid({
  items,
  busy,
  detail,
  onRemove,
  onClear,
}: {
  items: ImageItem[];
  busy: boolean;
  /** Extra line under each image, such as the new size. */
  detail: (item: ImageItem) => ReactNode;
  onRemove: (id: string) => void;
  onClear: () => void;
}) {
  if (!items.length) return null;
  return (
    <>
      <div className="list-heading">
        <h2>
          Images <span className="count">{items.length}</span>
        </h2>
        <button type="button" className="text-button" onClick={onClear} disabled={busy}>
          Clear all
        </button>
      </div>
      <ul className="image-grid">
        {items.map((item) => (
          <li key={item.id} className="image-tile">
            <span className="image-thumb checkered">
              <img src={item.previewUrl} alt="" draggable={false} />
            </span>
            <span className="image-name" title={item.file.name}>
              {item.file.name}
            </span>
            <span className="image-detail">{detail(item)}</span>
            <button
              type="button"
              className="icon-button danger tile-remove"
              aria-label={`Remove ${item.file.name}`}
              disabled={busy}
              onClick={() => onRemove(item.id)}
            >
              <X size={14} />
            </button>
          </li>
        ))}
      </ul>
    </>
  );
}
