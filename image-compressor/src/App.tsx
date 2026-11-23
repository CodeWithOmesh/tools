import { useCallback, useEffect, useRef, useState } from "react";
import JSZip from "jszip";
import {
  ArrowDownToLine,
  ArrowUpRight,
  Check,
  ChevronDown,
  FileImage,
  LoaderCircle,
  ShieldCheck,
  Sparkles,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react";
import { compressImage, type CompressedImage } from "./compress";
import {
  ACCEPTED_MIME_TYPES,
  DEFAULT_SETTINGS,
  formatBytes,
  isSupportedImage,
  outputExtension,
  safeOutputName,
  savingsPercent,
  type CompressorSettings,
  type OutputFormat,
} from "./types";

interface QueueItem {
  id: string;
  file: File;
  previewUrl: string;
  output?: CompressedImage;
  outputUrl?: string;
  status: "ready" | "processing" | "done" | "error";
  error?: string;
}

const formatOptions: { value: OutputFormat; label: string }[] = [
  { value: "original", label: "Keep original" },
  { value: "jpeg", label: "JPG" },
  { value: "png", label: "PNG" },
  { value: "webp", label: "WebP" },
];

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function App() {
  const [items, setItems] = useState<QueueItem[]>([]);
  const [settings, setSettings] = useState<CompressorSettings>(DEFAULT_SETTINGS);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [notice, setNotice] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const itemsRef = useRef(items);
  itemsRef.current = items;

  useEffect(
    () => () => {
      itemsRef.current.forEach((item) => {
        URL.revokeObjectURL(item.previewUrl);
        if (item.outputUrl) URL.revokeObjectURL(item.outputUrl);
      });
    },
    [],
  );

  const addFiles = useCallback((incoming: FileList | File[]) => {
    const accepted: QueueItem[] = [];
    const rejected: string[] = [];
    Array.from(incoming).forEach((file) => {
      if (!isSupportedImage(file)) {
        rejected.push(
          file.size > 25 * 1024 * 1024
            ? file.name + " is larger than 25 MB"
            : file.name + " is not a supported JPG, PNG or WebP image",
        );
        return;
      }
      accepted.push({
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        file,
        previewUrl: URL.createObjectURL(file),
        status: "ready",
      });
    });
    if (accepted.length) setItems((current) => [...current, ...accepted]);
    setNotice(
      rejected.length
        ? rejected.slice(0, 2).join(" · ") +
            (rejected.length > 2 ? ` · +${rejected.length - 2} more` : "")
        : "",
    );
  }, []);

  const updateSetting = <K extends keyof CompressorSettings>(
    key: K,
    value: CompressorSettings[K],
  ) => {
    setSettings((current) => ({ ...current, [key]: value }));
  };

  const compressAll = async () => {
    if (!items.length || busy) return;
    setBusy(true);
    setNotice("");
    const queue = [...items];
    for (const item of queue) {
      setItems((current) =>
        current.map((row) =>
          row.id === item.id ? { ...row, status: "processing", error: undefined } : row,
        ),
      );
      try {
        const output = await compressImage(item.file, settings);
        const outputUrl = URL.createObjectURL(output.blob);
        setItems((current) =>
          current.map((row) => {
            if (row.id !== item.id) return row;
            if (row.outputUrl) URL.revokeObjectURL(row.outputUrl);
            return { ...row, output, outputUrl, status: "done", error: undefined };
          }),
        );
      } catch (error) {
        setItems((current) =>
          current.map((row) =>
            row.id === item.id
              ? {
                  ...row,
                  status: "error",
                  error: error instanceof Error ? error.message : "Could not process this image.",
                }
              : row,
          ),
        );
      }
    }
    setBusy(false);
  };

  const removeItem = (id: string) => {
    const target = itemsRef.current.find((item) => item.id === id);
    if (target) {
      URL.revokeObjectURL(target.previewUrl);
      if (target.outputUrl) URL.revokeObjectURL(target.outputUrl);
    }
    setItems((current) => current.filter((item) => item.id !== id));
  };

  const clearAll = () => {
    if (busy) return;
    items.forEach((item) => {
      URL.revokeObjectURL(item.previewUrl);
      if (item.outputUrl) URL.revokeObjectURL(item.outputUrl);
    });
    setItems([]);
    setNotice("");
    if (inputRef.current) inputRef.current.value = "";
  };

  const downloadAll = async () => {
    const ready = items.filter((item) => item.output);
    if (!ready.length || busy) return;
    const zip = new JSZip();
    ready.forEach((item) => {
      const output = item.output!;
      const filename = safeOutputName(item.file.name, outputExtension(output.mimeType));
      zip.file(filename, output.blob);
    });
    const blob = await zip.generateAsync({ type: "blob" });
    downloadBlob(blob, "compressed-images.zip");
  };

  const completed = items.filter((item) => item.status === "done" && item.output);
  const totalOriginal = completed.reduce((sum, item) => sum + item.file.size, 0);
  const totalOutput = completed.reduce((sum, item) => sum + (item.output?.blob.size ?? 0), 0);
  const savings = savingsPercent(totalOriginal, totalOutput);

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="https://codewithomesh.com">
          <span className="brand-mark">&lt;O/&gt;</span>
          <span className="brand-name">
            Code <b>with Omesh</b>
            <small>FREE ONLINE TOOLS</small>
          </span>
        </a>
        <div className="header-right">
          <span className="free-pill">
            <i />
            Free tool
          </span>
          <a href="https://codewithomesh.com/tools/" className="header-link">
            More tools <ArrowUpRight size={15} />
          </a>
        </div>
      </header>

      <main className="page">
        <section className="hero">
          <div className="eyebrow">
            <span className="eyebrow-dot" /> FREE ONLINE TOOL
          </div>
          <h1>
            Image <span>Compressor</span>
          </h1>
          <p className="hero-copy">
            Make your images lighter, not worse. Compress, resize and convert JPG, PNG and WebP
            images right in your browser.
          </p>
          <div className="trust-line">
            <ShieldCheck size={15} /> Private by design. Your images never leave your device.
          </div>
        </section>

        <div className="workspace">
          <section className="main-column">
            <div
              className={`dropzone ${dragging ? "is-dragging" : ""}`}
              onDragOver={(event) => {
                event.preventDefault();
                setDragging(true);
              }}
              onDragLeave={(event) => {
                event.preventDefault();
                setDragging(false);
              }}
              onDrop={(event) => {
                event.preventDefault();
                setDragging(false);
                addFiles(event.dataTransfer.files);
              }}
            >
              <input
                ref={inputRef}
                type="file"
                accept={ACCEPTED_MIME_TYPES.join(",")}
                multiple
                hidden
                onChange={(event) => {
                  if (event.target.files) addFiles(event.target.files);
                  event.target.value = "";
                }}
              />
              <div className="upload-icon">
                <UploadCloud size={27} />
              </div>
              <h2>Drop your images here</h2>
              <p>
                or{" "}
                <button className="text-button" onClick={() => inputRef.current?.click()}>
                  browse files
                </button>{" "}
                from your device
              </p>
              <div className="file-hints">
                <span>JPG</span>
                <span>PNG</span>
                <span>WEBP</span>
                <i /> Up to 25 MB each
              </div>
            </div>

            <div className="queue-heading">
              <div>
                <h2>
                  Your images <span className="count">{items.length}</span>
                </h2>
                <p>Preview and compare your results below.</p>
              </div>
              {items.length > 0 && (
                <button className="clear-button" onClick={clearAll} disabled={busy}>
                  <Trash2 size={14} /> Clear all
                </button>
              )}
            </div>

            {items.length === 0 ? (
              <div className="empty-state">
                <div className="empty-stack">
                  <FileImage size={29} />
                </div>
                <b>Your image list is empty</b>
                <span>Add one or more images to get started.</span>
              </div>
            ) : (
              <div className="image-list">
                {items.map((item) => {
                  const output = item.output;
                  const percent = output ? savingsPercent(item.file.size, output.blob.size) : 0;
                  return (
                    <article className="image-card" key={item.id}>
                      <div className="image-thumb">
                        <img src={output ? item.outputUrl : item.previewUrl} alt={item.file.name} />
                      </div>
                      <div className="image-info">
                        <div className="file-title" title={item.file.name}>
                          {item.file.name}
                        </div>
                        <div className="file-meta">
                          {formatBytes(item.file.size)} <span>·</span>{" "}
                          {item.file.type.split("/")[1]?.toUpperCase()}
                        </div>
                        {item.status === "done" && output && (
                          <div className="result-meta">
                            <b>{formatBytes(output.blob.size)}</b>
                            <span>·</span>
                            {output.width} × {output.height}
                            {output.keptOriginal ? (
                              <span className="kept">Already optimized · original kept</span>
                            ) : (
                              <span className={percent >= 0 ? "saved" : "larger"}>
                                {percent >= 0 ? `−${percent}%` : `+${Math.abs(percent)}%`}
                              </span>
                            )}
                          </div>
                        )}
                        {item.status === "error" && <div className="error-text">{item.error}</div>}
                        {item.status === "processing" && (
                          <div className="processing-text">
                            <LoaderCircle size={13} className="spin" /> Processing image…
                          </div>
                        )}
                        {item.status === "ready" && (
                          <div className="ready-text">Ready to compress</div>
                        )}
                      </div>
                      <div className="image-actions">
                        {item.status === "done" && output && (
                          <button
                            className="icon-button download-one"
                            title="Download image"
                            onClick={() =>
                              downloadBlob(
                                output.blob,
                                safeOutputName(item.file.name, outputExtension(output.mimeType)),
                              )
                            }
                          >
                            <ArrowDownToLine size={16} />
                          </button>
                        )}
                        <button
                          className="icon-button remove-one"
                          title="Remove image"
                          disabled={busy}
                          onClick={() => removeItem(item.id)}
                        >
                          <X size={16} />
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}

            {notice && <div className="notice">{notice}</div>}

            {completed.length > 0 && (
              <section className="summary-panel">
                <div className="summary-icon">
                  <Check size={18} />
                </div>
                <div className="summary-content">
                  <b>Compression complete</b>
                  <span>
                    {formatBytes(totalOriginal)} → {formatBytes(totalOutput)} across{" "}
                    {completed.length} {completed.length === 1 ? "image" : "images"}
                  </span>
                </div>
                <div className={savings >= 0 ? "summary-saving" : "summary-saving negative"}>
                  {savings >= 0 ? `−${savings}%` : `+${Math.abs(savings)}%`}
                  <small>{savings >= 0 ? "saved" : "larger"}</small>
                </div>
              </section>
            )}
          </section>

          <aside className="settings-panel">
            <div className="settings-header">
              <div className="settings-symbol">
                <Sparkles size={17} />
              </div>
              <div>
                <h2>Compression settings</h2>
                <p>Fine-tune your output</p>
              </div>
            </div>

            <div className="field-group">
              <label htmlFor="format">Output format</label>
              <div className="select-wrap">
                <select
                  id="format"
                  value={settings.format}
                  onChange={(event) => updateSetting("format", event.target.value as OutputFormat)}
                >
                  {formatOptions.map((option) => (
                    <option value={option.value} key={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <ChevronDown size={15} />
              </div>
              <span className="field-help">Choose a new format or keep the original one.</span>
            </div>

            <div className="field-group quality-field">
              <div className="label-row">
                <label htmlFor="quality">Image quality</label>
                <strong>{settings.quality}%</strong>
              </div>
              <input
                id="quality"
                type="range"
                min="10"
                max="100"
                step="1"
                value={settings.quality}
                onChange={(event) => updateSetting("quality", Number(event.target.value))}
              />
              <div className="range-labels">
                <span>Smaller file</span>
                <span>Higher quality</span>
              </div>
              <span className="field-help">
                {settings.format === "png"
                  ? "PNG is lossless; the quality slider does not affect PNG output."
                  : "Lower quality usually creates a smaller file."}
              </span>
            </div>

            <div className="field-group">
              <label htmlFor="resize">Resize longest edge</label>
              <div className="select-wrap">
                <select
                  id="resize"
                  value={settings.maxDimension}
                  onChange={(event) => updateSetting("maxDimension", Number(event.target.value))}
                >
                  <option value={0}>Original dimensions</option>
                  <option value={2560}>2560 px</option>
                  <option value={1920}>1920 px</option>
                  <option value={1600}>1600 px</option>
                  <option value={1280}>1280 px</option>
                  <option value={1024}>1024 px</option>
                  <option value={800}>800 px</option>
                  <option value={512}>512 px</option>
                </select>
                <ChevronDown size={15} />
              </div>
              <span className="field-help">
                Keeps the aspect ratio. Images smaller than the selected size stay unchanged.
              </span>
            </div>

            <div className="settings-divider" />
            <button
              className="compress-button"
              onClick={compressAll}
              disabled={!items.length || busy}
            >
              {busy ? (
                <>
                  <LoaderCircle size={17} className="spin" /> Compressing…
                </>
              ) : (
                <>
                  <Sparkles size={17} /> Compress{" "}
                  {items.length
                    ? `${items.length} image${items.length === 1 ? "" : "s"}`
                    : "images"}
                </>
              )}
            </button>
            <button
              className="download-zip-button"
              onClick={downloadAll}
              disabled={!completed.length || busy}
            >
              <ArrowDownToLine size={16} /> Download all as ZIP
            </button>
            <p className="privacy-note">
              <ShieldCheck size={14} /> Processing happens locally in your browser.
            </p>
          </aside>
        </div>

        <section className="how-section">
          <div className="section-kicker">SIMPLE BY DESIGN</div>
          <h2>Smaller images in three steps</h2>
          <div className="steps-grid">
            <div className="step">
              <span>01</span>
              <b>Choose images</b>
              <p>Drop files or browse your device. Add several images at once.</p>
            </div>
            <div className="step">
              <span>02</span>
              <b>Set your preferences</b>
              <p>Choose an output format, quality level and maximum dimensions.</p>
            </div>
            <div className="step">
              <span>03</span>
              <b>Download the results</b>
              <p>Compare file sizes, save images individually or download a ZIP.</p>
            </div>
          </div>
        </section>

        <section className="faq-section">
          <div className="section-kicker">GOOD TO KNOW</div>
          <h2>Frequently asked questions</h2>
          <div className="faq-grid">
            <div>
              <h3>Are my images uploaded?</h3>
              <p>
                No. Image processing happens inside your browser. The files are not sent to our
                server.
              </p>
            </div>
            <div>
              <h3>Which formats are supported?</h3>
              <p>
                You can open JPG, PNG and WebP images, then keep the source format or convert to
                another supported format.
              </p>
            </div>
            <div>
              <h3>Why can a compressed image be larger?</h3>
              <p>
                Some images are already optimized. Re-encoding them can add a little overhead, so
                check the before-and-after sizes.
              </p>
            </div>
            <div>
              <h3>Does compression reduce image dimensions?</h3>
              <p>
                Not by default. Choose a maximum longest-edge size to resize large images while
                preserving their proportions.
              </p>
            </div>
          </div>
        </section>
      </main>

      <footer className="footer">
        <span>© {new Date().getFullYear()} Code with Omesh</span>
        <span>Useful tools. Simple solutions.</span>
        <a href="https://codewithomesh.com">
          codewithomesh.com <ArrowUpRight size={13} />
        </a>
      </footer>
    </div>
  );
}

export default App;
