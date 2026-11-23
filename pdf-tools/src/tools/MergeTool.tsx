import { useState } from "react";
import { ArrowDown, ArrowUp, FileText, GripVertical, LoaderCircle, Merge, X } from "lucide-react";
import {
  Dropzone,
  ErrorMessage,
  PrivacyNote,
  SuccessMessage,
  ToolLayout,
  useDragReorder,
} from "../components";
import {
  downloadPdf,
  errorMessage,
  fileStem,
  formatBytes,
  isPdfFile,
  makeId,
  MAX_PDF_BYTES,
  pluralize,
  readBytes,
} from "../lib/files";
import { moveItem } from "../lib/order";
import type { ToolInfo } from "../tools";

interface PdfItem {
  id: string;
  file: File;
  bytes?: Uint8Array;
  pages?: number;
  status: "loading" | "ready" | "error";
  error?: string;
}

const loadPdfLib = () => import("../lib/pdf");

export default function MergeTool({ tool }: { tool: ToolInfo }) {
  const [items, setItems] = useState<PdfItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const update = (id: string, patch: Partial<PdfItem>) =>
    setItems((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  const move = (from: number, to: number) => setItems((current) => moveItem(current, from, to));
  const { itemProps, itemClass } = useDragReorder(move);

  const addFiles = (files: File[]) => {
    setError("");
    setSuccess("");
    const rejected: string[] = [];
    const accepted: PdfItem[] = [];
    for (const file of files) {
      if (!isPdfFile(file)) rejected.push(`${file.name} is not a PDF`);
      else if (file.size > MAX_PDF_BYTES) rejected.push(`${file.name} is larger than 100 MB`);
      else accepted.push({ id: makeId("pdf"), file, status: "loading" });
    }
    if (rejected.length) setError(`Skipped: ${rejected.join("; ")}.`);
    if (!accepted.length) return;
    setItems((current) => [...current, ...accepted]);
    for (const item of accepted) {
      void (async () => {
        try {
          const [bytes, { getPageCount }] = await Promise.all([readBytes(item.file), loadPdfLib()]);
          update(item.id, { bytes, pages: await getPageCount(bytes), status: "ready" });
        } catch (reason) {
          update(item.id, {
            status: "error",
            error: errorMessage(reason, "This file could not be read."),
          });
        }
      })();
    }
  };

  const ready = items.filter((item) => item.status === "ready");
  const hasProblems = items.some((item) => item.status !== "ready");
  const totalPages = ready.reduce((sum, item) => sum + (item.pages ?? 0), 0);

  const merge = async () => {
    setError("");
    setSuccess("");
    if (items.length < 2) return setError("Add at least two PDF files to merge.");
    if (items.some((item) => item.status === "loading"))
      return setError("Please wait until every file has been read.");
    if (items.some((item) => item.status === "error"))
      return setError("Remove the files that could not be read, then try again.");
    setBusy(true);
    try {
      const { mergePdfs } = await loadPdfLib();
      const merged = await mergePdfs(ready.map((item) => item.bytes!));
      downloadPdf(merged, `${fileStem(items[0].file.name)}-merged.pdf`);
      setSuccess(
        `Merged ${pluralize(items.length, "file")} into one PDF with ${pluralize(totalPages, "page")} (${formatBytes(merged.byteLength)}).`,
      );
    } catch (reason) {
      setError(errorMessage(reason, "The PDFs could not be merged. Please try again."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <ToolLayout tool={tool}>
      <Dropzone
        accept="application/pdf,.pdf"
        multiple
        compact={items.length > 0}
        title={items.length ? "Add more PDFs" : "Drop your PDF files here"}
        hint="PDF files up to 100 MB each"
        onFiles={addFiles}
      />

      {items.length > 0 ? (
        <>
          <div className="list-heading">
            <h2>
              Files to merge <span className="count">{items.length}</span>
            </h2>
            <button
              type="button"
              className="text-button"
              onClick={() => {
                setItems([]);
                setError("");
                setSuccess("");
              }}
              disabled={busy}
            >
              Clear all
            </button>
          </div>
          <p className="list-hint">Drag files, or use the arrows, to change the order.</p>
          <ol className="file-list">
            {items.map((item, index) => (
              <li key={item.id} className={`file-row${itemClass(index)}`} {...itemProps(index)}>
                <GripVertical size={16} className="grip" aria-hidden />
                <span className="file-order">{index + 1}</span>
                <FileText size={20} className="file-icon" aria-hidden />
                <div className="file-info">
                  <b title={item.file.name}>{item.file.name}</b>
                  <small>
                    {formatBytes(item.file.size)}
                    {item.status === "ready" ? ` · ${pluralize(item.pages ?? 0, "page")}` : null}
                    {item.status === "loading" ? " · Reading…" : null}
                  </small>
                  {item.status === "error" ? (
                    <small className="row-error">{item.error}</small>
                  ) : null}
                </div>
                <div className="row-actions">
                  <button
                    type="button"
                    className="icon-button"
                    aria-label={`Move ${item.file.name} up`}
                    disabled={index === 0 || busy}
                    onClick={() => move(index, index - 1)}
                  >
                    <ArrowUp size={15} />
                  </button>
                  <button
                    type="button"
                    className="icon-button"
                    aria-label={`Move ${item.file.name} down`}
                    disabled={index === items.length - 1 || busy}
                    onClick={() => move(index, index + 1)}
                  >
                    <ArrowDown size={15} />
                  </button>
                  <button
                    type="button"
                    className="icon-button danger"
                    aria-label={`Remove ${item.file.name}`}
                    disabled={busy}
                    onClick={() =>
                      setItems((current) => current.filter((row) => row.id !== item.id))
                    }
                  >
                    <X size={15} />
                  </button>
                </div>
              </li>
            ))}
          </ol>
        </>
      ) : null}

      <ErrorMessage>{error}</ErrorMessage>
      <SuccessMessage>{success}</SuccessMessage>

      <div className="action-row">
        <span className="action-summary">
          {ready.length >= 2 && !hasProblems
            ? `${pluralize(items.length, "file")} · ${pluralize(totalPages, "page")} in total`
            : "Add two or more PDFs to merge them."}
        </span>
        <button
          type="button"
          className="primary-button"
          onClick={() => void merge()}
          disabled={busy || items.length < 2}
        >
          {busy ? <LoaderCircle size={17} className="spin" /> : <Merge size={17} />}
          {busy ? "Merging…" : "Merge & download"}
        </button>
      </div>
      <PrivacyNote />
    </ToolLayout>
  );
}
