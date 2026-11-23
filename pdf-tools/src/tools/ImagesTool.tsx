import { useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowUp, FileImage, GripVertical, LoaderCircle, X } from "lucide-react";
import {
  Dropzone,
  ErrorMessage,
  PrivacyNote,
  SuccessMessage,
  ToolLayout,
  useDragReorder,
} from "../components";
import {
  ACCEPTED_IMAGE_TYPES,
  downloadPdf,
  errorMessage,
  fileStem,
  formatBytes,
  makeId,
  MAX_IMAGE_BYTES,
  pluralize,
} from "../lib/files";
import { moveItem } from "../lib/order";
import type { ImagePdfOptions, Orientation, PageSize } from "../lib/pdf";
import type { ToolInfo } from "../tools";

interface ImageItem {
  id: string;
  file: File;
  previewUrl: string;
}

const MARGINS = [
  { label: "No margin", value: 0 },
  { label: "Small", value: 18 },
  { label: "Normal", value: 36 },
];

export default function ImagesTool({ tool }: { tool: ToolInfo }) {
  const [items, setItems] = useState<ImageItem[]>([]);
  const [options, setOptions] = useState<ImagePdfOptions>({
    pageSize: "a4",
    orientation: "auto",
    margin: 18,
  });
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const itemsRef = useRef(items);
  itemsRef.current = items;

  // Release preview images when the page is closed.
  useEffect(
    () => () => itemsRef.current.forEach((item) => URL.revokeObjectURL(item.previewUrl)),
    [],
  );

  const move = (from: number, to: number) => setItems((current) => moveItem(current, from, to));
  const { itemProps, itemClass } = useDragReorder(move);

  const addFiles = (files: File[]) => {
    setError("");
    setSuccess("");
    const rejected: string[] = [];
    const accepted: ImageItem[] = [];
    for (const file of files) {
      if (!ACCEPTED_IMAGE_TYPES.includes(file.type))
        rejected.push(`${file.name} is not a JPG, PNG or WebP image`);
      else if (file.size > MAX_IMAGE_BYTES) rejected.push(`${file.name} is larger than 25 MB`);
      else accepted.push({ id: makeId("img"), file, previewUrl: URL.createObjectURL(file) });
    }
    if (rejected.length) setError(`Skipped: ${rejected.join("; ")}.`);
    if (accepted.length) setItems((current) => [...current, ...accepted]);
  };

  const remove = (id: string) =>
    setItems((current) => {
      const target = current.find((item) => item.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return current.filter((item) => item.id !== id);
    });

  const clearAll = () => {
    items.forEach((item) => URL.revokeObjectURL(item.previewUrl));
    setItems([]);
    setError("");
    setSuccess("");
  };

  const create = async () => {
    setError("");
    setSuccess("");
    if (!items.length) return setError("Add at least one image.");
    setBusy(true);
    try {
      const [{ prepareImage }, { imagesToPdf }] = await Promise.all([
        import("../lib/images"),
        import("../lib/pdf"),
      ]);
      const prepared = [];
      for (const [index, item] of items.entries()) {
        setProgress(`Preparing image ${index + 1} of ${items.length}…`);
        try {
          prepared.push(await prepareImage(item.file));
        } catch (reason) {
          throw new Error(`${item.file.name}: ${errorMessage(reason, "could not be processed")}`);
        }
      }
      setProgress("Creating PDF…");
      const result = await imagesToPdf(prepared, options);
      const name = items.length === 1 ? fileStem(items[0].file.name) : "images";
      downloadPdf(result, `${name}.pdf`);
      setSuccess(
        `Created a PDF with ${pluralize(items.length, "page")} (${formatBytes(result.byteLength)}).`,
      );
    } catch (reason) {
      setError(errorMessage(reason, "The PDF could not be created. Please try again."));
    } finally {
      setBusy(false);
      setProgress("");
    }
  };

  return (
    <ToolLayout tool={tool}>
      <Dropzone
        accept={ACCEPTED_IMAGE_TYPES.join(",")}
        multiple
        compact={items.length > 0}
        title={items.length ? "Add more images" : "Drop your images here"}
        hint="JPG, PNG or WebP · up to 25 MB each"
        onFiles={addFiles}
      />

      {items.length > 0 ? (
        <>
          <div className="list-heading">
            <h2>
              Images <span className="count">{items.length}</span>
            </h2>
            <button type="button" className="text-button" onClick={clearAll} disabled={busy}>
              Clear all
            </button>
          </div>
          <p className="list-hint">Each image becomes one page. Drag to change the order.</p>
          <ol className="image-grid">
            {items.map((item, index) => (
              <li key={item.id} className={`image-tile${itemClass(index)}`} {...itemProps(index)}>
                <span className="image-thumb">
                  <img src={item.previewUrl} alt="" draggable={false} />
                  <span className="page-number">{index + 1}</span>
                </span>
                <span className="image-name" title={item.file.name}>
                  <GripVertical size={13} aria-hidden /> {item.file.name}
                </span>
                <div className="tile-actions">
                  <button
                    type="button"
                    className="icon-button"
                    aria-label={`Move ${item.file.name} earlier`}
                    disabled={index === 0 || busy}
                    onClick={() => move(index, index - 1)}
                  >
                    <ArrowUp size={14} />
                  </button>
                  <button
                    type="button"
                    className="icon-button"
                    aria-label={`Move ${item.file.name} later`}
                    disabled={index === items.length - 1 || busy}
                    onClick={() => move(index, index + 1)}
                  >
                    <ArrowDown size={14} />
                  </button>
                  <button
                    type="button"
                    className="icon-button danger"
                    aria-label={`Remove ${item.file.name}`}
                    disabled={busy}
                    onClick={() => remove(item.id)}
                  >
                    <X size={14} />
                  </button>
                </div>
              </li>
            ))}
          </ol>

          <div className="options-grid">
            <label className="field">
              <span>Page size</span>
              <select
                value={options.pageSize}
                onChange={(event) =>
                  setOptions((current) => ({
                    ...current,
                    pageSize: event.target.value as PageSize,
                  }))
                }
              >
                <option value="a4">A4 (210 × 297 mm)</option>
                <option value="letter">US Letter (8.5 × 11 in)</option>
                <option value="fit">Same size as image</option>
              </select>
            </label>
            <label className="field">
              <span>Orientation</span>
              <select
                value={options.orientation}
                disabled={options.pageSize === "fit"}
                onChange={(event) =>
                  setOptions((current) => ({
                    ...current,
                    orientation: event.target.value as Orientation,
                  }))
                }
              >
                <option value="auto">Automatic (match each image)</option>
                <option value="portrait">Portrait</option>
                <option value="landscape">Landscape</option>
              </select>
            </label>
            <label className="field">
              <span>Margin</span>
              <select
                value={options.margin}
                onChange={(event) =>
                  setOptions((current) => ({ ...current, margin: Number(event.target.value) }))
                }
              >
                {MARGINS.map((margin) => (
                  <option key={margin.value} value={margin.value}>
                    {margin.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </>
      ) : null}

      {progress ? (
        <p className="message info">
          <LoaderCircle size={15} className="spin" /> {progress}
        </p>
      ) : null}
      <ErrorMessage>{error}</ErrorMessage>
      <SuccessMessage>{success}</SuccessMessage>

      <div className="action-row">
        <span className="action-summary">
          {items.length
            ? `${pluralize(items.length, "image")} → ${pluralize(items.length, "page")}`
            : "Add images to convert them."}
        </span>
        <button
          type="button"
          className="primary-button"
          onClick={() => void create()}
          disabled={busy || !items.length}
        >
          {busy ? <LoaderCircle size={17} className="spin" /> : <FileImage size={17} />}
          {busy ? "Creating…" : "Create PDF"}
        </button>
      </div>
      <PrivacyNote />
    </ToolLayout>
  );
}
