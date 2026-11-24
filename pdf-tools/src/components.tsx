import { useRef, useState, type DragEvent, type ReactNode } from "react";
import { Check, FileText, LoaderCircle, ShieldCheck, Sparkles, UploadCloud } from "lucide-react";
import { formatBytes, pluralize } from "./lib/files";
import { parsePageRanges, rangesToIndices } from "./lib/ranges";
import type { ToolInfo } from "./tools";
import type { LoadedPdf } from "./useSinglePdf";

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
// Opening a single PDF
// ---------------------------------------------------------------------------

/** The drop area before a PDF is chosen, and the file name bar afterwards. */
export function SinglePdfPicker({
  pdf,
  loading,
  busy,
  onFiles,
  onClear,
}: {
  pdf: LoadedPdf | null;
  loading: boolean;
  busy: boolean;
  onFiles: (files: File[]) => void;
  onClear: () => void;
}) {
  return (
    <>
      {pdf ? (
        <div className="file-bar">
          <FileText size={20} aria-hidden />
          <div>
            <b title={pdf.file.name}>{pdf.file.name}</b>
            <small>
              {formatBytes(pdf.file.size)} · {pluralize(pdf.pageCount, "page")}
            </small>
          </div>
          <button type="button" className="text-button" onClick={onClear} disabled={busy}>
            Choose another file
          </button>
        </div>
      ) : (
        <Dropzone
          accept="application/pdf,.pdf"
          multiple={false}
          title="Drop a PDF here"
          hint="One PDF file up to 100 MB"
          onFiles={onFiles}
        />
      )}
      {loading ? (
        <p className="message info">
          <LoaderCircle size={15} className="spin" /> Opening PDF…
        </p>
      ) : null}
    </>
  );
}

// ---------------------------------------------------------------------------
// Choosing which pages a change applies to
// ---------------------------------------------------------------------------

export interface PageChoiceValue {
  all: boolean;
  input: string;
}

export const ALL_PAGES: PageChoiceValue = { all: true, input: "" };

/** The 0-based pages chosen, `undefined` for all pages, or an error to show. */
export function resolvePageChoice(
  value: PageChoiceValue,
  pageCount: number,
): { pages?: number[]; count: number; error: string } {
  if (value.all) return { count: pageCount, error: "" };
  if (!value.input.trim()) return { pages: [], count: 0, error: "Type the pages to use." };
  try {
    const pages = rangesToIndices(parsePageRanges(value.input, pageCount));
    return { pages, count: pages.length, error: "" };
  } catch (reason) {
    return {
      pages: [],
      count: 0,
      error: reason instanceof Error ? reason.message : "Check the pages.",
    };
  }
}

export function PageChoice({
  value,
  pageCount,
  onChange,
  label = "Pages",
}: {
  value: PageChoiceValue;
  pageCount: number;
  onChange: (value: PageChoiceValue) => void;
  label?: string;
}) {
  const { error } = resolvePageChoice(value, pageCount);
  return (
    <div className="field">
      <span>{label}</span>
      <div className="segmented" role="radiogroup" aria-label={label}>
        <button
          type="button"
          role="radio"
          aria-checked={value.all}
          className={value.all ? "active" : ""}
          onClick={() => onChange({ ...value, all: true })}
        >
          All pages
        </button>
        <button
          type="button"
          role="radio"
          aria-checked={!value.all}
          className={!value.all ? "active" : ""}
          onClick={() => onChange({ ...value, all: false })}
        >
          Choose pages
        </button>
      </div>
      {!value.all ? (
        <>
          <input
            value={value.input}
            onChange={(event) => onChange({ ...value, input: event.target.value })}
            placeholder={`e.g. 1-3, 5 (1–${pageCount})`}
            aria-label="Pages to use"
            aria-invalid={Boolean(error && value.input.trim())}
          />
          <small className={error && value.input.trim() ? "field-error" : "field-hint"}>
            {value.input.trim() && error ? error : "Separate pages and ranges with commas."}
          </small>
        </>
      ) : null}
    </div>
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
