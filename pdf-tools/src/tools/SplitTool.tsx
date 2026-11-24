import { useMemo, useState } from "react";
import { Check, FileText, LoaderCircle, Scissors } from "lucide-react";
import { Dropzone, ErrorMessage, PrivacyNote, SuccessMessage, ToolLayout } from "../components";
import {
  downloadPdf,
  downloadZip,
  errorMessage,
  fileStem,
  formatBytes,
  pluralize,
} from "../lib/files";
import { formatPageSelection, parsePageRanges, rangesToIndices } from "../lib/ranges";
import type { ToolInfo } from "../tools";
import { useSinglePdf } from "../useSinglePdf";

type Mode = "extract" | "ranges" | "every";

const MODES: { id: Mode; label: string; hint: string }[] = [
  { id: "extract", label: "Extract pages", hint: "Save the chosen pages as one new PDF." },
  {
    id: "ranges",
    label: "Split by ranges",
    hint: "Save each range (e.g. 1-3, 4-6) as its own PDF.",
  },
  { id: "every", label: "Every page", hint: "Save every page as a separate PDF." },
];

export default function SplitTool({ tool }: { tool: ToolInfo }) {
  const { pdf, thumbnails, loading, error: loadError, open, clear } = useSinglePdf();
  const [mode, setMode] = useState<Mode>("extract");
  const [pagesInput, setPagesInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const parsed = useMemo(() => {
    if (!pdf || mode === "every") return { ranges: [], error: "" };
    try {
      return { ranges: parsePageRanges(pagesInput, pdf.pageCount), error: "" };
    } catch (reason) {
      return {
        ranges: [],
        error: pagesInput.trim() ? errorMessage(reason, "Check the pages.") : "",
      };
    }
  }, [pdf, pagesInput, mode]);

  const selected = useMemo(() => new Set(rangesToIndices(parsed.ranges)), [parsed.ranges]);

  const togglePage = (index: number) => {
    const next = new Set(selected);
    if (next.has(index)) next.delete(index);
    else next.add(index);
    setPagesInput(formatPageSelection([...next]));
  };

  const openFile = async (files: File[]) => {
    setError("");
    setSuccess("");
    setPagesInput("");
    await open(files);
  };

  const run = async () => {
    if (!pdf) return;
    setError("");
    setSuccess("");
    if (mode !== "every" && !parsed.ranges.length) {
      return setError(parsed.error || "Choose pages by clicking the previews or typing ranges.");
    }
    setBusy(true);
    try {
      const { extractPages, splitByRanges } = await import("../lib/pdf");
      const stem = fileStem(pdf.file.name);
      if (mode === "extract") {
        const result = await extractPages(pdf.bytes, rangesToIndices(parsed.ranges));
        downloadPdf(result, `${stem}-pages.pdf`);
        setSuccess(
          `Saved ${pluralize(selected.size, "page")} as one PDF (${formatBytes(result.byteLength)}).`,
        );
        return;
      }
      const ranges =
        mode === "every"
          ? Array.from({ length: pdf.pageCount }, (_, index) => ({
              start: index + 1,
              end: index + 1,
            }))
          : parsed.ranges;
      const parts = await splitByRanges(pdf.bytes, ranges);
      const files = parts.map((bytes, index) => {
        const { start, end } = ranges[index];
        return {
          name: `${stem}-${start === end ? `page-${start}` : `pages-${start}-${end}`}.pdf`,
          bytes,
        };
      });
      if (files.length === 1) downloadPdf(files[0].bytes, files[0].name);
      else
        await downloadZip(
          files.map((file) => ({ name: file.name, data: file.bytes })),
          `${stem}-split.zip`,
        );
      setSuccess(
        files.length === 1
          ? "Saved 1 PDF."
          : `Saved ${pluralize(files.length, "PDF")} in a ZIP file.`,
      );
    } catch (reason) {
      setError(errorMessage(reason, "The PDF could not be split. Please try again."));
    } finally {
      setBusy(false);
    }
  };

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

          <div className="mode-picker" role="radiogroup" aria-label="How to split">
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

          {mode !== "every" ? (
            <label className="field">
              <span>{mode === "extract" ? "Pages to extract" : "Ranges (one PDF per range)"}</span>
              <input
                value={pagesInput}
                onChange={(event) => setPagesInput(event.target.value)}
                placeholder={mode === "extract" ? "e.g. 1-3, 5, 8-" : "e.g. 1-3, 4-6, 7-"}
                aria-invalid={Boolean(parsed.error)}
              />
              <small className={parsed.error ? "field-error" : "field-hint"}>
                {parsed.error ||
                  (mode === "extract"
                    ? "Click the page previews below, or type pages and ranges."
                    : "Separate ranges with commas. “8-” means page 8 to the end.")}
              </small>
            </label>
          ) : (
            <p className="field-hint">
              You will get a ZIP file with {pluralize(pdf.pageCount, "PDF")}, one for each page.
            </p>
          )}

          <div className="page-grid" aria-label="Pages">
            {thumbnails.map((thumbnail, index) => {
              const isSelected = mode === "every" || selected.has(index);
              return (
                <button
                  key={index}
                  type="button"
                  className={`page-tile${isSelected ? " selected" : ""}`}
                  onClick={() => mode !== "every" && togglePage(index)}
                  disabled={mode === "every"}
                  aria-pressed={isSelected}
                  aria-label={`Page ${index + 1}`}
                >
                  <span className="page-thumb">
                    {thumbnail ? (
                      <img src={thumbnail} alt="" />
                    ) : (
                      <span className="thumb-loading" />
                    )}
                  </span>
                  <span className="page-label">
                    {isSelected ? <Check size={12} /> : null} Page {index + 1}
                  </span>
                </button>
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
            {mode === "every"
              ? `${pluralize(pdf.pageCount, "file")} will be created`
              : selected.size
                ? `${pluralize(selected.size, "page")} selected`
                : "No pages selected yet"}
          </span>
          <button
            type="button"
            className="primary-button"
            onClick={() => void run()}
            disabled={busy}
          >
            {busy ? <LoaderCircle size={17} className="spin" /> : <Scissors size={17} />}
            {busy ? "Working…" : mode === "extract" ? "Extract & download" : "Split & download"}
          </button>
        </div>
      ) : null}
      <PrivacyNote />
    </ToolLayout>
  );
}
