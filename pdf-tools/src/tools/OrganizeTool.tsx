import { useEffect, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  FileText,
  LoaderCircle,
  RotateCcw,
  RotateCw,
  Save,
  Trash2,
  Undo2,
} from "lucide-react";
import {
  Dropzone,
  ErrorMessage,
  PrivacyNote,
  SuccessMessage,
  ToolLayout,
  useDragReorder,
} from "../components";
import { downloadPdf, errorMessage, fileStem, formatBytes, pluralize } from "../lib/files";
import { moveItem } from "../lib/order";
import type { ToolInfo } from "../tools";
import { useSinglePdf } from "../useSinglePdf";

interface PageState {
  sourceIndex: number;
  rotation: number;
  deleted: boolean;
}

const initialPages = (count: number): PageState[] =>
  Array.from({ length: count }, (_, sourceIndex) => ({ sourceIndex, rotation: 0, deleted: false }));

export default function OrganizeTool({ tool }: { tool: ToolInfo }) {
  const { pdf, thumbnails, loading, error: loadError, open, clear } = useSinglePdf();
  const [pages, setPages] = useState<PageState[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const move = (from: number, to: number) => setPages((current) => moveItem(current, from, to));
  const { itemProps, itemClass } = useDragReorder(move);
  const patchPage = (position: number, patch: Partial<PageState>) =>
    setPages((current) =>
      current.map((page, index) => (index === position ? { ...page, ...patch } : page)),
    );

  const openFile = async (files: File[]) => {
    setError("");
    setSuccess("");
    await open(files);
  };

  // Start with the original page order whenever a new PDF is opened.
  useEffect(() => {
    setPages(pdf ? initialPages(pdf.pageCount) : []);
  }, [pdf]);

  const kept = pages.filter((page) => !page.deleted);
  const changed = pages.some(
    (page, index) => page.deleted || page.rotation % 360 !== 0 || page.sourceIndex !== index,
  );

  const save = async () => {
    if (!pdf) return;
    setError("");
    setSuccess("");
    if (!kept.length) return setError("Keep at least one page.");
    setBusy(true);
    try {
      const { organizePdf } = await import("../lib/pdf");
      const result = await organizePdf(
        pdf.bytes,
        kept.map(({ sourceIndex, rotation }) => ({ sourceIndex, rotation })),
      );
      downloadPdf(result, `${fileStem(pdf.file.name)}-edited.pdf`);
      setSuccess(
        `Saved a PDF with ${pluralize(kept.length, "page")} (${formatBytes(result.byteLength)}).`,
      );
    } catch (reason) {
      setError(errorMessage(reason, "The PDF could not be saved. Please try again."));
    } finally {
      setBusy(false);
    }
  };

  const rotateAll = (delta: number) =>
    setPages((current) => current.map((page) => ({ ...page, rotation: page.rotation + delta })));

  return (
    <ToolLayout tool={tool}>
      {!pdf ? (
        <Dropzone
          accept="application/pdf,.pdf"
          multiple={false}
          title="Drop a PDF here"
          hint="One PDF file up to 100 MB"
          onFiles={(files) => void openFile(files)}
        />
      ) : (
        <>
          <div className="file-bar">
            <FileText size={20} aria-hidden />
            <div>
              <b title={pdf.file.name}>{pdf.file.name}</b>
              <small>
                {formatBytes(pdf.file.size)} · {pluralize(pdf.pageCount, "page")}
              </small>
            </div>
            <button type="button" className="text-button" onClick={clear} disabled={busy}>
              Choose another file
            </button>
          </div>

          <div className="toolbar">
            <span>Drag pages to reorder them, or use the buttons on each page.</span>
            <div>
              <button type="button" className="ghost-button" onClick={() => rotateAll(-90)}>
                <RotateCcw size={15} /> Rotate all left
              </button>
              <button type="button" className="ghost-button" onClick={() => rotateAll(90)}>
                <RotateCw size={15} /> Rotate all right
              </button>
              <button
                type="button"
                className="ghost-button"
                onClick={() => setPages(initialPages(pdf.pageCount))}
                disabled={!changed}
              >
                <Undo2 size={15} /> Undo all changes
              </button>
            </div>
          </div>

          <div className="page-grid organize">
            {pages.map((page, position) => {
              const thumbnail = thumbnails[page.sourceIndex];
              return (
                <div
                  key={page.sourceIndex}
                  className={`page-tile${page.deleted ? " deleted" : ""}${itemClass(position)}`}
                  {...itemProps(position)}
                >
                  <span className="page-thumb">
                    {thumbnail ? (
                      <img
                        src={thumbnail}
                        alt={`Page ${page.sourceIndex + 1}`}
                        style={{ transform: `rotate(${page.rotation}deg)` }}
                        draggable={false}
                      />
                    ) : (
                      <span className="thumb-loading" />
                    )}
                    {page.deleted ? <span className="deleted-badge">Will be removed</span> : null}
                  </span>
                  <span className="page-label">Page {page.sourceIndex + 1}</span>
                  <div className="tile-actions">
                    <button
                      type="button"
                      className="icon-button"
                      aria-label={`Move page ${page.sourceIndex + 1} earlier`}
                      disabled={position === 0}
                      onClick={() => move(position, position - 1)}
                    >
                      <ArrowLeft size={14} />
                    </button>
                    <button
                      type="button"
                      className="icon-button"
                      aria-label={`Rotate page ${page.sourceIndex + 1} left`}
                      onClick={() => patchPage(position, { rotation: page.rotation - 90 })}
                    >
                      <RotateCcw size={14} />
                    </button>
                    <button
                      type="button"
                      className="icon-button"
                      aria-label={`Rotate page ${page.sourceIndex + 1} right`}
                      onClick={() => patchPage(position, { rotation: page.rotation + 90 })}
                    >
                      <RotateCw size={14} />
                    </button>
                    <button
                      type="button"
                      className={page.deleted ? "icon-button" : "icon-button danger"}
                      aria-label={
                        page.deleted
                          ? `Keep page ${page.sourceIndex + 1}`
                          : `Delete page ${page.sourceIndex + 1}`
                      }
                      onClick={() => patchPage(position, { deleted: !page.deleted })}
                    >
                      {page.deleted ? <Undo2 size={14} /> : <Trash2 size={14} />}
                    </button>
                    <button
                      type="button"
                      className="icon-button"
                      aria-label={`Move page ${page.sourceIndex + 1} later`}
                      disabled={position === pages.length - 1}
                      onClick={() => move(position, position + 1)}
                    >
                      <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {loading ? (
        <p className="message info">
          <LoaderCircle size={15} className="spin" /> Opening PDF…
        </p>
      ) : null}
      <ErrorMessage>{loadError || error}</ErrorMessage>
      <SuccessMessage>{success}</SuccessMessage>

      {pdf ? (
        <div className="action-row">
          <span className="action-summary">
            {pluralize(kept.length, "page")} will be kept
            {pages.length - kept.length ? ` · ${pages.length - kept.length} removed` : ""}
          </span>
          <button
            type="button"
            className="primary-button"
            onClick={() => void save()}
            disabled={busy || !kept.length}
          >
            {busy ? <LoaderCircle size={17} className="spin" /> : <Save size={17} />}
            {busy ? "Saving…" : "Save & download"}
          </button>
        </div>
      ) : null}
      <PrivacyNote />
    </ToolLayout>
  );
}
