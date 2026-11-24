import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
  type RefObject,
} from "react";
import {
  Copy,
  Eraser,
  LoaderCircle,
  PenLine,
  Plus,
  Signature,
  Type,
  Upload,
  X,
} from "lucide-react";
import {
  ErrorMessage,
  PrivacyNote,
  SinglePdfPicker,
  SuccessMessage,
  ToolLayout,
} from "../components";
import {
  downloadPdf,
  errorMessage,
  fileStem,
  formatBytes,
  makeId,
  MAX_IMAGE_BYTES,
  pluralize,
} from "../lib/files";
import {
  canvasToSignature,
  SIGNATURE_FONTS,
  typedSignature,
  uploadedSignature,
  type SignatureImage,
} from "../lib/signature";
import { clampPlacement, type Placement } from "../lib/stamp";
import { openRenderer, type PdfRenderer } from "../lib/thumbnails";
import type { ToolInfo } from "../tools";
import { useSinglePdf } from "../useSinglePdf";

type Method = "draw" | "type" | "upload";

const INKS = [
  { value: "#1a1f2b", label: "Black" },
  { value: "#1d3f9e", label: "Blue" },
];

interface PlacedSignature extends Placement {
  id: string;
}

interface PageImage {
  url: string;
  /** Height ÷ width of the page as displayed. */
  aspect: number;
}

// ---------------------------------------------------------------------------
// Drawing pad
// ---------------------------------------------------------------------------

function DrawPad({
  ink,
  onCreate,
}: {
  ink: string;
  onCreate: (canvas: HTMLCanvasElement) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const last = useRef<{ x: number; y: number } | null>(null);
  const [hasInk, setHasInk] = useState(false);

  // Match the canvas resolution to the screen so lines stay sharp.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ratio = Math.min(window.devicePixelRatio || 1, 3);
    canvas.width = Math.round(canvas.clientWidth * ratio);
    canvas.height = Math.round(canvas.clientHeight * ratio);
    canvas.getContext("2d")?.scale(ratio, ratio);
  }, []);

  const point = (event: PointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };

  const drawTo = (event: PointerEvent<HTMLCanvasElement>, to = point(event)) => {
    const context = event.currentTarget.getContext("2d");
    const from = last.current;
    if (!context || !from) return;
    context.strokeStyle = ink;
    context.lineWidth = event.pointerType === "pen" ? 1.5 + event.pressure * 2.5 : 2.6;
    context.lineCap = "round";
    context.lineJoin = "round";
    context.beginPath();
    context.moveTo(from.x, from.y);
    context.lineTo(to.x, to.y);
    context.stroke();
    last.current = to;
    if (!hasInk) setHasInk(true);
  };

  const clear = () => {
    const canvas = canvasRef.current;
    canvas?.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
    setHasInk(false);
  };

  return (
    <div className="sign-pad-wrap">
      <canvas
        ref={canvasRef}
        className="sign-pad"
        aria-label="Signature drawing area. Draw with your mouse, finger or pen."
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          const start = point(event);
          last.current = start;
          // A single tap still leaves a dot.
          drawTo(event, { x: start.x + 0.5, y: start.y });
        }}
        onPointerMove={(event) => {
          if (last.current) drawTo(event);
        }}
        onPointerUp={() => {
          last.current = null;
        }}
        onPointerCancel={() => {
          last.current = null;
        }}
      />
      {!hasInk ? <span className="sign-pad-hint">Sign here</span> : null}
      <div className="sign-pad-actions">
        <button type="button" className="ghost-button" onClick={clear} disabled={!hasInk}>
          <Eraser size={15} /> Clear
        </button>
        <button
          type="button"
          className="ghost-button accent"
          disabled={!hasInk}
          onClick={() => canvasRef.current && onCreate(canvasRef.current)}
        >
          <Signature size={15} /> Use this signature
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Creating a signature (draw, type or upload)
// ---------------------------------------------------------------------------

function SignatureCreator({
  onCreate,
  onCancel,
}: {
  onCreate: (signature: SignatureImage) => void;
  onCancel?: () => void;
}) {
  const [method, setMethod] = useState<Method>("draw");
  const [ink, setInk] = useState(INKS[0].value);
  const [name, setName] = useState("");
  const [font, setFont] = useState(SIGNATURE_FONTS[0].family);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const finish = async (create: () => Promise<SignatureImage | null>, emptyMessage: string) => {
    setError("");
    setWorking(true);
    try {
      const signature = await create();
      if (signature) onCreate(signature);
      else setError(emptyMessage);
    } catch (reason) {
      setError(errorMessage(reason, "The signature could not be created."));
    } finally {
      setWorking(false);
    }
  };

  const upload = (file: File | undefined) => {
    if (!file) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      return setError("Choose a PNG, JPG or WebP image of your signature.");
    }
    if (file.size > MAX_IMAGE_BYTES) return setError("Choose an image smaller than 25 MB.");
    void finish(() => uploadedSignature(file), "No signature was found in this image.");
  };

  const methods: { id: Method; label: string; icon: JSX.Element }[] = [
    { id: "draw", label: "Draw", icon: <PenLine size={15} /> },
    { id: "type", label: "Type", icon: <Type size={15} /> },
    { id: "upload", label: "Upload", icon: <Upload size={15} /> },
  ];

  return (
    <div className="sign-creator">
      <div className="sign-creator-head">
        <h2>Create your signature</h2>
        {onCancel ? (
          <button type="button" className="text-button" onClick={onCancel}>
            Cancel
          </button>
        ) : null}
      </div>
      <div className="sign-creator-bar">
        <div className="segmented" role="tablist" aria-label="Signature method">
          {methods.map((option) => (
            <button
              key={option.id}
              type="button"
              role="tab"
              aria-selected={method === option.id}
              className={method === option.id ? "active" : ""}
              onClick={() => {
                setMethod(option.id);
                setError("");
              }}
            >
              {option.icon} {option.label}
            </button>
          ))}
        </div>
        {method !== "upload" ? (
          <div className="swatches" role="radiogroup" aria-label="Ink colour">
            {INKS.map((option) => (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={ink === option.value}
                aria-label={`${option.label} ink`}
                title={`${option.label} ink`}
                className={ink === option.value ? "swatch active" : "swatch"}
                style={{ background: option.value }}
                onClick={() => setInk(option.value)}
              />
            ))}
          </div>
        ) : null}
      </div>

      {method === "draw" ? (
        <DrawPad
          ink={ink}
          onCreate={(canvas) =>
            void finish(() => canvasToSignature(canvas), "Draw your signature first.")
          }
        />
      ) : null}

      {method === "type" ? (
        <div className="sign-type">
          <label className="field">
            <span>Your name</span>
            <input
              value={name}
              maxLength={50}
              placeholder="Type your full name"
              onChange={(event) => setName(event.target.value)}
            />
          </label>
          <div className="font-options" role="radiogroup" aria-label="Signature style">
            {SIGNATURE_FONTS.map((option) => (
              <button
                key={option.family}
                type="button"
                role="radio"
                aria-checked={font === option.family}
                className={font === option.family ? "font-option active" : "font-option"}
                style={{ fontFamily: `"${option.family}", cursive`, color: ink }}
                onClick={() => setFont(option.family)}
              >
                {name.trim() || "Your signature"}
                <small>{option.label}</small>
              </button>
            ))}
          </div>
          <div className="sign-pad-actions">
            <button
              type="button"
              className="ghost-button accent"
              disabled={!name.trim() || working}
              onClick={() =>
                void finish(() => typedSignature(name, font, ink), "Type your name first.")
              }
            >
              <Signature size={15} /> Use this signature
            </button>
          </div>
        </div>
      ) : null}

      {method === "upload" ? (
        <div className="sign-upload">
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            hidden
            onChange={(event) => {
              upload(event.target.files?.[0]);
              event.target.value = "";
            }}
          />
          <p>
            Use a photo or scan of your signature on white paper. The white background is removed
            automatically.
          </p>
          <button
            type="button"
            className="ghost-button accent"
            disabled={working}
            onClick={() => fileRef.current?.click()}
          >
            <Upload size={15} /> Choose image
          </button>
        </div>
      ) : null}

      {working ? (
        <p className="message info">
          <LoaderCircle size={15} className="spin" /> Preparing signature…
        </p>
      ) : null}
      <ErrorMessage>{error}</ErrorMessage>
    </div>
  );
}

// ---------------------------------------------------------------------------
// A signature placed on the page preview
// ---------------------------------------------------------------------------

function PlacementBox({
  placement,
  signature,
  pageAspect,
  selected,
  container,
  onSelect,
  onChange,
  onRemove,
}: {
  placement: PlacedSignature;
  signature: SignatureImage;
  pageAspect: number;
  selected: boolean;
  container: RefObject<HTMLDivElement>;
  onSelect: () => void;
  onChange: (placement: PlacedSignature) => void;
  onRemove: () => void;
}) {
  const box = clampPlacement(placement, signature.aspect, pageAspect);
  const update = (patch: Partial<Placement>) =>
    onChange({
      ...placement,
      ...clampPlacement({ ...box, ...patch }, signature.aspect, pageAspect),
    });

  const startDrag = (event: PointerEvent, mode: "move" | "resize") => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    onSelect();
    const rect = container.current?.getBoundingClientRect();
    if (!rect) return;
    const start = { x: event.clientX, y: event.clientY, ...box };
    const move = (moveEvent: globalThis.PointerEvent) => {
      const dx = (moveEvent.clientX - start.x) / rect.width;
      const dy = (moveEvent.clientY - start.y) / rect.height;
      if (mode === "move") update({ left: start.left + dx, top: start.top + dy });
      else update({ width: start.width + dx });
    };
    const stop = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", stop);
      window.removeEventListener("pointercancel", stop);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", stop);
    window.addEventListener("pointercancel", stop);
  };

  const onKeyDown = (event: KeyboardEvent) => {
    const step = event.shiftKey ? 0.05 : 0.01;
    const moves: Record<string, Partial<Placement>> = {
      ArrowLeft: { left: box.left - step },
      ArrowRight: { left: box.left + step },
      ArrowUp: { top: box.top - step },
      ArrowDown: { top: box.top + step },
      "+": { width: box.width + step },
      "=": { width: box.width + step },
      "-": { width: box.width - step },
    };
    if (event.key === "Delete" || event.key === "Backspace") {
      event.preventDefault();
      onRemove();
    } else if (moves[event.key]) {
      event.preventDefault();
      update(moves[event.key]);
    }
  };

  return (
    <div
      className={`placed-signature${selected ? " selected" : ""}`}
      style={{
        left: `${box.left * 100}%`,
        top: `${box.top * 100}%`,
        width: `${box.width * 100}%`,
      }}
      tabIndex={0}
      role="group"
      aria-label="Signature. Drag to move, or use the arrow keys. Plus and minus change the size."
      onPointerDown={(event) => startDrag(event, "move")}
      onFocus={onSelect}
      onKeyDown={onKeyDown}
    >
      <img src={signature.url} alt="" draggable={false} />
      <button
        type="button"
        className="placed-remove"
        aria-label="Remove this signature"
        onPointerDown={(event) => event.stopPropagation()}
        onClick={onRemove}
      >
        <X size={13} />
      </button>
      <span
        className="placed-resize"
        aria-hidden
        onPointerDown={(event) => startDrag(event, "resize")}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// The tool
// ---------------------------------------------------------------------------

export default function SignTool({ tool }: { tool: ToolInfo }) {
  const { pdf, thumbnails, loading, error: loadError, open, clear } = useSinglePdf();
  const [signature, setSignature] = useState<SignatureImage | null>(null);
  const [creating, setCreating] = useState(false);
  const [placements, setPlacements] = useState<PlacedSignature[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pageIndex, setPageIndex] = useState(0);
  const [pageImages, setPageImages] = useState<Record<number, PageImage>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const renderer = useRef<Promise<PdfRenderer> | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const signatureUrl = useRef<string | null>(null);
  const pageUrls = useRef<string[]>([]);

  // Open the PDF once for rendering large page previews, and tidy up when it changes.
  useEffect(() => {
    setPlacements([]);
    setSelectedId(null);
    setPageIndex(0);
    setPageImages({});
    if (!pdf) return;
    const opened = openRenderer(pdf.bytes);
    renderer.current = opened;
    // Previews are optional; failures surface when the page is rendered.
    opened.catch(() => undefined);
    return () => {
      renderer.current = null;
      void opened.then((item) => item.destroy()).catch(() => undefined);
      // Release this PDF's page previews.
      pageUrls.current.forEach((url) => URL.revokeObjectURL(url));
      pageUrls.current = [];
    };
  }, [pdf]);

  useEffect(
    () => () => {
      if (signatureUrl.current) URL.revokeObjectURL(signatureUrl.current);
    },
    [],
  );

  // Render the current page at a size suitable for placing signatures.
  useEffect(() => {
    const current = renderer.current;
    if (!pdf || !current || pageImages[pageIndex]) return;
    let cancelled = false;
    current
      .then((item) => item.render(pageIndex, { width: 1000 }, "image/jpeg", 0.85))
      .then(({ blob, width, height }) => {
        if (cancelled || renderer.current !== current) return;
        const url = URL.createObjectURL(blob);
        pageUrls.current.push(url);
        setPageImages((images) => ({ ...images, [pageIndex]: { url, aspect: height / width } }));
      })
      .catch((reason) => {
        if (!cancelled) setError(errorMessage(reason, "This page could not be shown."));
      });
    return () => {
      cancelled = true;
    };
  }, [pdf, pageIndex, pageImages]);

  const applySignature = (next: SignatureImage) => {
    if (signatureUrl.current) URL.revokeObjectURL(signatureUrl.current);
    signatureUrl.current = next.url;
    setSignature(next);
    setCreating(false);
    setSuccess("");
    // Place it on the current page straight away so the next step is obvious.
    if (!placements.length) addToPage(pageIndex);
  };

  const addToPage = (index: number) => {
    const placement: PlacedSignature = {
      id: makeId("sig"),
      pageIndex: index,
      left: 0.58,
      top: 0.8,
      width: 0.28,
    };
    setPlacements((current) => [...current, placement]);
    setSelectedId(placement.id);
    setSuccess("");
  };

  const copyToAllPages = () => {
    if (!pdf) return;
    const source =
      placements.find((item) => item.id === selectedId && item.pageIndex === pageIndex) ??
      placements.find((item) => item.pageIndex === pageIndex);
    if (!source) return;
    const copies = Array.from({ length: pdf.pageCount }, (_, index) => index)
      .filter((index) => index !== pageIndex)
      .map((index) => ({ ...source, id: makeId("sig"), pageIndex: index }));
    setPlacements((current) => [
      ...current.filter((item) => item.pageIndex === pageIndex),
      ...copies,
    ]);
    setSuccess("");
  };

  const openFile = async (files: File[]) => {
    setError("");
    setSuccess("");
    await open(files);
  };

  const save = async () => {
    if (!pdf || !signature) return;
    setError("");
    setSuccess("");
    if (!placements.length) return setError("Add your signature to at least one page.");
    setBusy(true);
    try {
      const { placeImage } = await import("../lib/pdf");
      const result = await placeImage(
        pdf.bytes,
        { bytes: signature.bytes, format: "png", aspect: signature.aspect },
        placements,
      );
      downloadPdf(result, `${fileStem(pdf.file.name)}-signed.pdf`);
      const pages = new Set(placements.map((item) => item.pageIndex)).size;
      setSuccess(
        `Signed ${pluralize(pages, "page")} and saved the PDF (${formatBytes(result.byteLength)}).`,
      );
    } catch (reason) {
      setError(errorMessage(reason, "The PDF could not be signed. Please try again."));
    } finally {
      setBusy(false);
    }
  };

  const pageImage = pageImages[pageIndex];
  const pageAspect = pageImage?.aspect ?? Math.SQRT2;
  const onThisPage = placements.filter((item) => item.pageIndex === pageIndex);
  const signedPages = new Set(placements.map((item) => item.pageIndex));

  return (
    <ToolLayout tool={tool}>
      <SinglePdfPicker
        pdf={pdf}
        loading={loading}
        busy={busy}
        onFiles={(files) => void openFile(files)}
        onClear={clear}
      />

      {pdf && (!signature || creating) ? (
        <SignatureCreator
          onCreate={applySignature}
          onCancel={signature ? () => setCreating(false) : undefined}
        />
      ) : null}

      {pdf && signature && !creating ? (
        <>
          <div className="toolbar sign-toolbar">
            <div className="signature-chip">
              <img src={signature.url} alt="Your signature" />
              <button
                type="button"
                className="text-button"
                onClick={() => {
                  setCreating(true);
                  setSuccess("");
                }}
              >
                Change
              </button>
            </div>
            <div>
              <button type="button" className="ghost-button" onClick={() => addToPage(pageIndex)}>
                <Plus size={15} /> Add to this page
              </button>
              {pdf.pageCount > 1 ? (
                <button
                  type="button"
                  className="ghost-button"
                  onClick={copyToAllPages}
                  disabled={!onThisPage.length}
                  title="Put the signature in the same place on every page"
                >
                  <Copy size={15} /> Same place on all pages
                </button>
              ) : null}
            </div>
          </div>

          <div className={`sign-workspace${pdf.pageCount > 1 ? "" : " single"}`}>
            {pdf.pageCount > 1 ? (
              <div className="page-strip" aria-label="Pages">
                {thumbnails.map((thumbnail, index) => (
                  <button
                    key={index}
                    type="button"
                    className={`strip-page${index === pageIndex ? " active" : ""}`}
                    onClick={() => setPageIndex(index)}
                    aria-current={index === pageIndex ? "page" : undefined}
                    aria-label={`Page ${index + 1}${signedPages.has(index) ? ", signed" : ""}`}
                  >
                    {thumbnail ? (
                      <img src={thumbnail} alt="" />
                    ) : (
                      <span className="thumb-loading" />
                    )}
                    <span>
                      {index + 1}
                      {signedPages.has(index) ? <Signature size={11} /> : null}
                    </span>
                  </button>
                ))}
              </div>
            ) : null}

            <div className="sign-stage">
              <p className="field-hint">
                Drag the signature into place. Drag its corner to resize it.
              </p>
              <div
                ref={previewRef}
                className="sign-page"
                style={{
                  aspectRatio: `1 / ${pageAspect}`,
                  // Fit the whole page on screen so signatures near the bottom can be placed.
                  width: `min(100%, 720px, calc((100vh - 120px) / ${pageAspect}))`,
                }}
                onPointerDown={() => setSelectedId(null)}
              >
                {pageImage ? (
                  <img src={pageImage.url} alt={`Page ${pageIndex + 1}`} draggable={false} />
                ) : (
                  <span className="thumb-loading" />
                )}
                {pageImage
                  ? onThisPage.map((placement) => (
                      <PlacementBox
                        key={placement.id}
                        placement={placement}
                        signature={signature}
                        pageAspect={pageImage.aspect}
                        selected={placement.id === selectedId}
                        container={previewRef}
                        onSelect={() => setSelectedId(placement.id)}
                        onChange={(next) =>
                          setPlacements((current) =>
                            current.map((item) => (item.id === next.id ? next : item)),
                          )
                        }
                        onRemove={() =>
                          setPlacements((current) =>
                            current.filter((item) => item.id !== placement.id),
                          )
                        }
                      />
                    ))
                  : null}
              </div>
            </div>
          </div>
        </>
      ) : null}

      <ErrorMessage>{loadError || error}</ErrorMessage>
      <SuccessMessage>{success}</SuccessMessage>

      {pdf && signature && !creating ? (
        <div className="action-row">
          <span className="action-summary">
            {placements.length
              ? `Signature on ${pluralize(signedPages.size, "page")}`
              : "Add your signature to a page"}
          </span>
          <button
            type="button"
            className="primary-button"
            onClick={() => void save()}
            disabled={busy || !placements.length}
          >
            {busy ? <LoaderCircle size={17} className="spin" /> : <PenLine size={17} />}
            {busy ? "Signing…" : "Sign & download"}
          </button>
        </div>
      ) : null}
      <PrivacyNote />
    </ToolLayout>
  );
}
