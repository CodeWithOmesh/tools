import { useRef, useState, type DragEvent, type ReactNode } from "react";
import { Check, ShieldCheck, Sparkles, UploadCloud } from "lucide-react";
import type { ToolInfo } from "./tools";

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
// Drag-to-reorder for lists and grids
// ---------------------------------------------------------------------------

export function useDragReorder(onMove: (from: number, to: number) => void) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const reset = () => {
    setDragIndex(null);
    setOverIndex(null);
  };
  const itemProps = (index: number) => ({
    draggable: true,
    onDragStart: (event: DragEvent) => {
      setDragIndex(index);
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", String(index));
    },
    onDragOver: (event: DragEvent) => {
      if (dragIndex === null) return;
      event.preventDefault();
      if (overIndex !== index) setOverIndex(index);
    },
    onDrop: (event: DragEvent) => {
      if (dragIndex === null) return;
      event.preventDefault();
      if (dragIndex !== index) onMove(dragIndex, index);
      reset();
    },
    onDragEnd: reset,
  });
  const itemClass = (index: number) =>
    index === dragIndex ? " is-dragged" : index === overIndex ? " is-drop-target" : "";
  return { itemProps, itemClass };
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
      <ShieldCheck size={15} /> Your files are processed in your browser and never uploaded.
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
