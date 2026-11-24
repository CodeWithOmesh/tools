import { useMemo, useState } from "react";
import { Hash, LoaderCircle } from "lucide-react";
import {
  ALL_PAGES,
  ErrorMessage,
  PageChoice,
  PrivacyNote,
  resolvePageChoice,
  SinglePdfPicker,
  SuccessMessage,
  ToolLayout,
  type PageChoiceValue,
} from "../components";
import { downloadPdf, errorMessage, fileStem, formatBytes, pluralize } from "../lib/files";
import { formatPageNumber, type NumberFormat, type NumberPosition } from "../lib/stamp";
import type { ToolInfo } from "../tools";
import { useSinglePdf } from "../useSinglePdf";

const POSITIONS: { id: NumberPosition; label: string }[] = [
  { id: "top-left", label: "Top left" },
  { id: "top-center", label: "Top centre" },
  { id: "top-right", label: "Top right" },
  { id: "bottom-left", label: "Bottom left" },
  { id: "bottom-center", label: "Bottom centre" },
  { id: "bottom-right", label: "Bottom right" },
];

const FORMATS: { id: NumberFormat; label: string }[] = [
  { id: "n", label: "1" },
  { id: "page-n", label: "Page 1" },
  { id: "n-of-total", label: "1 / 10" },
  { id: "page-n-of-total", label: "Page 1 of 10" },
];

const SIZES = [
  { value: 9, label: "Small" },
  { value: 11, label: "Medium" },
  { value: 14, label: "Large" },
];

const MARGINS = [
  { value: 18, label: "Narrow" },
  { value: 28, label: "Normal" },
  { value: 42, label: "Wide" },
];

export default function PageNumbersTool({ tool }: { tool: ToolInfo }) {
  const { pdf, thumbnails, loading, error: loadError, open, clear } = useSinglePdf();
  const [position, setPosition] = useState<NumberPosition>("bottom-center");
  const [format, setFormat] = useState<NumberFormat>("page-n-of-total");
  const [startAt, setStartAt] = useState("1");
  const [fontSize, setFontSize] = useState(11);
  const [margin, setMargin] = useState(28);
  const [choice, setChoice] = useState<PageChoiceValue>(ALL_PAGES);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const pageCount = pdf?.pageCount ?? 0;
  const chosen = useMemo(() => resolvePageChoice(choice, pageCount), [choice, pageCount]);
  const start = Number.parseInt(startAt, 10);
  const startValid = Number.isInteger(start) && start >= 0 && start <= 99999;
  const firstPage = chosen.pages ? chosen.pages[0] : 0;
  const previewText = formatPageNumber(
    format,
    startValid ? start : 1,
    (startValid ? start : 1) + Math.max(chosen.count, 1) - 1,
  );

  const openFile = async (files: File[]) => {
    setError("");
    setSuccess("");
    setChoice(ALL_PAGES);
    await open(files);
  };

  const save = async () => {
    if (!pdf) return;
    setError("");
    setSuccess("");
    if (chosen.error) return setError(chosen.error);
    if (!startValid) return setError("The first number must be a whole number from 0 to 99999.");
    setBusy(true);
    try {
      const { addPageNumbers } = await import("../lib/pdf");
      const result = await addPageNumbers(pdf.bytes, {
        position,
        format,
        startAt: start,
        fontSize,
        margin,
        pages: chosen.pages,
      });
      downloadPdf(result, `${fileStem(pdf.file.name)}-numbered.pdf`);
      setSuccess(
        `Numbered ${pluralize(chosen.count, "page")} and saved the PDF (${formatBytes(result.byteLength)}).`,
      );
    } catch (reason) {
      setError(errorMessage(reason, "The page numbers could not be added. Please try again."));
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
        <div className="stamp-editor">
          <div className="stamp-preview-panel">
            <span className="preview-caption">
              Preview{firstPage !== undefined ? ` · page ${firstPage + 1}` : ""}
            </span>
            <div className="stamp-preview">
              {firstPage !== undefined && thumbnails[firstPage] ? (
                <img src={thumbnails[firstPage]} alt="" />
              ) : (
                <span className="thumb-loading" />
              )}
              <span
                className={`number-badge ${position}`}
                style={{ fontSize: `${fontSize - 1}px` }}
              >
                {previewText}
              </span>
            </div>
          </div>

          <div className="stamp-options">
            <div className="field">
              <span>Position</span>
              <div className="position-grid" role="radiogroup" aria-label="Position">
                {POSITIONS.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    role="radio"
                    aria-checked={position === option.id}
                    aria-label={option.label}
                    title={option.label}
                    className={position === option.id ? "active" : ""}
                    onClick={() => setPosition(option.id)}
                  >
                    <i />
                  </button>
                ))}
              </div>
            </div>
            <label className="field">
              <span>Style</span>
              <select
                value={format}
                onChange={(event) => setFormat(event.target.value as NumberFormat)}
              >
                {FORMATS.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <div className="options-row">
              <label className="field">
                <span>First number</span>
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={99999}
                  value={startAt}
                  onChange={(event) => setStartAt(event.target.value)}
                  aria-invalid={!startValid}
                />
              </label>
              <label className="field">
                <span>Text size</span>
                <select
                  value={fontSize}
                  onChange={(event) => setFontSize(Number(event.target.value))}
                >
                  {SIZES.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Margin</span>
                <select value={margin} onChange={(event) => setMargin(Number(event.target.value))}>
                  {MARGINS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <PageChoice
              value={choice}
              pageCount={pdf.pageCount}
              onChange={setChoice}
              label="Pages to number"
            />
          </div>
        </div>
      ) : null}

      <ErrorMessage>{loadError || error}</ErrorMessage>
      <SuccessMessage>{success}</SuccessMessage>

      {pdf ? (
        <div className="action-row">
          <span className="action-summary">
            {chosen.count
              ? `${pluralize(chosen.count, "page")} will be numbered`
              : "No pages chosen"}
          </span>
          <button
            type="button"
            className="primary-button"
            onClick={() => void save()}
            disabled={busy || !chosen.count}
          >
            {busy ? <LoaderCircle size={17} className="spin" /> : <Hash size={17} />}
            {busy ? "Adding numbers…" : "Add numbers & download"}
          </button>
        </div>
      ) : null}
      <PrivacyNote />
    </ToolLayout>
  );
}
