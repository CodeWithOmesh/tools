import { useEffect, useState } from "react";
import { LoaderCircle, RotateCcw, RotateCw, Save, Undo2 } from "lucide-react";
import {
  ErrorMessage,
  PrivacyNote,
  SinglePdfPicker,
  SuccessMessage,
  ToolLayout,
} from "../components";
import { downloadPdf, errorMessage, fileStem, formatBytes, pluralize } from "../lib/files";
import type { ToolInfo } from "../tools";
import { useSinglePdf } from "../useSinglePdf";

const turned = (rotation: number) => ((rotation % 360) + 360) % 360 !== 0;

export default function RotateTool({ tool }: { tool: ToolInfo }) {
  const { pdf, thumbnails, loading, error: loadError, open, clear } = useSinglePdf();
  /** Extra clockwise rotation for each page, in degrees. */
  const [rotations, setRotations] = useState<number[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    setRotations(pdf ? Array.from({ length: pdf.pageCount }, () => 0) : []);
  }, [pdf]);

  const rotatedCount = rotations.filter(turned).length;

  const openFile = async (files: File[]) => {
    setError("");
    setSuccess("");
    await open(files);
  };

  const rotatePage = (index: number, delta: number) =>
    setRotations((current) =>
      current.map((rotation, position) => (position === index ? rotation + delta : rotation)),
    );
  const rotateAll = (delta: number) =>
    setRotations((current) => current.map((rotation) => rotation + delta));

  const save = async () => {
    if (!pdf) return;
    setError("");
    setSuccess("");
    if (!rotatedCount) return setError("Rotate at least one page first.");
    setBusy(true);
    try {
      const { organizePdf } = await import("../lib/pdf");
      const result = await organizePdf(
        pdf.bytes,
        rotations.map((rotation, sourceIndex) => ({ sourceIndex, rotation })),
      );
      downloadPdf(result, `${fileStem(pdf.file.name)}-rotated.pdf`);
      setSuccess(
        `Rotated ${pluralize(rotatedCount, "page")} and saved the PDF (${formatBytes(result.byteLength)}).`,
      );
    } catch (reason) {
      setError(errorMessage(reason, "The PDF could not be saved. Please try again."));
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
        <>
          <div className="toolbar">
            <span>Click a page to rotate it clockwise, or rotate every page at once.</span>
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
                onClick={() => setRotations((current) => current.map(() => 0))}
                disabled={!rotatedCount}
              >
                <Undo2 size={15} /> Reset
              </button>
            </div>
          </div>

          <div className="page-grid" aria-label="Pages">
            {rotations.map((rotation, index) => {
              const thumbnail = thumbnails[index];
              return (
                <div key={index} className={`page-tile${turned(rotation) ? " selected" : ""}`}>
                  <button
                    type="button"
                    className="page-thumb thumb-button"
                    onClick={() => rotatePage(index, 90)}
                    aria-label={`Rotate page ${index + 1} clockwise`}
                  >
                    {thumbnail ? (
                      <img
                        src={thumbnail}
                        alt=""
                        style={{ transform: `rotate(${rotation}deg)` }}
                        draggable={false}
                      />
                    ) : (
                      <span className="thumb-loading" />
                    )}
                  </button>
                  <span className="page-label">Page {index + 1}</span>
                  <div className="tile-actions">
                    <button
                      type="button"
                      className="icon-button"
                      aria-label={`Rotate page ${index + 1} left`}
                      onClick={() => rotatePage(index, -90)}
                    >
                      <RotateCcw size={14} />
                    </button>
                    <button
                      type="button"
                      className="icon-button"
                      aria-label={`Rotate page ${index + 1} right`}
                      onClick={() => rotatePage(index, 90)}
                    >
                      <RotateCw size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      ) : null}

      <ErrorMessage>{loadError || error}</ErrorMessage>
      <SuccessMessage>{success}</SuccessMessage>

      {pdf ? (
        <div className="action-row">
          <span className="action-summary">
            {rotatedCount
              ? `${pluralize(rotatedCount, "page")} will be rotated`
              : "No pages rotated yet"}
          </span>
          <button
            type="button"
            className="primary-button"
            onClick={() => void save()}
            disabled={busy || !rotatedCount}
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
