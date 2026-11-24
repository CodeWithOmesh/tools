import { useMemo, useState } from "react";
import { Check, ImageDown, LoaderCircle } from "lucide-react";
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
import {
  downloadBlob,
  downloadZip,
  errorMessage,
  fileStem,
  formatBytes,
  pluralize,
} from "../lib/files";
import { formatPageSelection } from "../lib/ranges";
import { openRenderer } from "../lib/thumbnails";
import type { ToolInfo } from "../tools";
import { useSinglePdf } from "../useSinglePdf";

type Format = "jpeg" | "png";

const FORMATS: { id: Format; label: string; hint: string }[] = [
  { id: "jpeg", label: "JPG", hint: "Smaller files. Best for sharing." },
  { id: "png", label: "PNG", hint: "Lossless. Best for text and diagrams." },
];

const RESOLUTIONS = [
  { dpi: 96, label: "Screen (96 DPI)" },
  { dpi: 150, label: "Standard (150 DPI)" },
  { dpi: 300, label: "High quality (300 DPI)" },
];

export default function PdfToImagesTool({ tool }: { tool: ToolInfo }) {
  const { pdf, thumbnails, loading, error: loadError, open, clear } = useSinglePdf();
  const [format, setFormat] = useState<Format>("jpeg");
  const [dpi, setDpi] = useState(150);
  const [choice, setChoice] = useState<PageChoiceValue>(ALL_PAGES);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const pageCount = pdf?.pageCount ?? 0;
  const chosen = useMemo(() => resolvePageChoice(choice, pageCount), [choice, pageCount]);
  const selected = useMemo(
    () => new Set(chosen.pages ?? Array.from({ length: pageCount }, (_, index) => index)),
    [chosen.pages, pageCount],
  );

  const togglePage = (index: number) => {
    const next = new Set(selected);
    if (next.has(index)) next.delete(index);
    else next.add(index);
    setChoice({ all: false, input: formatPageSelection([...next]) });
  };

  const openFile = async (files: File[]) => {
    setError("");
    setSuccess("");
    setChoice(ALL_PAGES);
    await open(files);
  };

  const convert = async () => {
    if (!pdf) return;
    setError("");
    setSuccess("");
    if (chosen.error) return setError(chosen.error);
    const pages = [...selected].sort((a, b) => a - b);
    const extension = format === "jpeg" ? "jpg" : "png";
    const stem = fileStem(pdf.file.name);
    setBusy(true);
    try {
      const renderer = await openRenderer(pdf.bytes);
      const images: { name: string; data: Blob }[] = [];
      try {
        for (const [position, pageIndex] of pages.entries()) {
          setProgress(`Converting page ${position + 1} of ${pages.length}…`);
          const { blob } = await renderer.render(pageIndex, dpi / 72, `image/${format}`, 0.9);
          images.push({ name: `${stem}-page-${pageIndex + 1}.${extension}`, data: blob });
        }
      } finally {
        await renderer.destroy();
      }
      const totalBytes = images.reduce((sum, image) => sum + image.data.size, 0);
      if (images.length === 1) {
        downloadBlob(images[0].data, images[0].name);
        setSuccess(`Saved 1 image (${formatBytes(totalBytes)}).`);
      } else {
        setProgress("Creating ZIP file…");
        await downloadZip(images, `${stem}-${extension}.zip`);
        setSuccess(
          `Saved ${pluralize(images.length, "image")} in a ZIP file (${formatBytes(totalBytes)}).`,
        );
      }
    } catch (reason) {
      setError(errorMessage(reason, "The pages could not be converted. Please try again."));
    } finally {
      setBusy(false);
      setProgress("");
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
          <div className="mode-picker two" role="radiogroup" aria-label="Image format">
            {FORMATS.map((option) => (
              <button
                key={option.id}
                type="button"
                role="radio"
                aria-checked={format === option.id}
                className={format === option.id ? "mode active" : "mode"}
                onClick={() => setFormat(option.id)}
              >
                <b>{option.label}</b>
                <small>{option.hint}</small>
              </button>
            ))}
          </div>

          <div className="options-grid two">
            <label className="field">
              <span>Image quality</span>
              <select value={dpi} onChange={(event) => setDpi(Number(event.target.value))}>
                {RESOLUTIONS.map((option) => (
                  <option key={option.dpi} value={option.dpi}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <PageChoice value={choice} pageCount={pdf.pageCount} onChange={setChoice} />
          </div>

          <div className="page-grid" aria-label="Pages">
            {thumbnails.map((thumbnail, index) => {
              const isSelected = selected.has(index);
              return (
                <button
                  key={index}
                  type="button"
                  className={`page-tile${isSelected ? " selected" : ""}`}
                  onClick={() => togglePage(index)}
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
      ) : null}

      {progress ? (
        <p className="message info">
          <LoaderCircle size={15} className="spin" /> {progress}
        </p>
      ) : null}
      <ErrorMessage>{loadError || error}</ErrorMessage>
      <SuccessMessage>{success}</SuccessMessage>

      {pdf ? (
        <div className="action-row">
          <span className="action-summary">
            {selected.size
              ? `${pluralize(selected.size, "page")} → ${pluralize(selected.size, `${format === "jpeg" ? "JPG" : "PNG"} image`)}`
              : "No pages selected yet"}
          </span>
          <button
            type="button"
            className="primary-button"
            onClick={() => void convert()}
            disabled={busy || !selected.size}
          >
            {busy ? <LoaderCircle size={17} className="spin" /> : <ImageDown size={17} />}
            {busy ? "Converting…" : "Convert & download"}
          </button>
        </div>
      ) : null}
      <PrivacyNote />
    </ToolLayout>
  );
}
