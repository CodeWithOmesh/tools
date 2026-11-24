// pdf.js is large, so it is only downloaded when a tool needs page previews.
// The "legacy" build supports older browsers (for example Safari before 17.4).
type PdfJs = typeof import("pdfjs-dist/legacy/build/pdf.mjs");

let pdfjsPromise: Promise<PdfJs> | null = null;

function loadPdfJs(): Promise<PdfJs> {
  pdfjsPromise ??= Promise.all([
    import("pdfjs-dist/legacy/build/pdf.mjs"),
    import("pdfjs-dist/legacy/build/pdf.worker.min.mjs?url"),
  ]).then(([pdfjs, worker]) => {
    pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
    return pdfjs;
  });
  return pdfjsPromise;
}

export interface ThumbnailJob {
  cancel: () => void;
  done: Promise<void>;
}

/**
 * Renders a small preview image of every page, calling `onPage` as each one is ready.
 * Rendering stops early if the job is cancelled (for example when the user picks another file).
 */
export function renderThumbnails(
  bytes: Uint8Array,
  onPage: (index: number, dataUrl: string) => void,
  maxWidth = 200,
): ThumbnailJob {
  let cancelled = false;
  const done = (async () => {
    const pdfjs = await loadPdfJs();
    // pdf.js takes ownership of the buffer it is given, so pass a copy.
    const document = await pdfjs.getDocument({ data: bytes.slice() }).promise;
    try {
      for (let pageNumber = 1; pageNumber <= document.numPages && !cancelled; pageNumber += 1) {
        const page = await document.getPage(pageNumber);
        const baseViewport = page.getViewport({ scale: 1 });
        const viewport = page.getViewport({ scale: maxWidth / baseViewport.width });
        const canvas = window.document.createElement("canvas");
        canvas.width = Math.ceil(viewport.width);
        canvas.height = Math.ceil(viewport.height);
        const context = canvas.getContext("2d");
        if (!context) return;
        await page.render({ canvasContext: context, viewport }).promise;
        page.cleanup();
        if (!cancelled) onPage(pageNumber - 1, canvas.toDataURL("image/jpeg", 0.8));
      }
    } finally {
      await document.destroy();
    }
  })();
  return {
    cancel: () => {
      cancelled = true;
    },
    done,
  };
}

// ---------------------------------------------------------------------------
// Full-size page rendering (PDF to image, signature placement)
// ---------------------------------------------------------------------------

/** Browsers refuse to draw canvases much larger than this (Safari's limit is ~16.7 MP). */
const MAX_CANVAS_PIXELS = 16_000_000;
const MAX_CANVAS_SIDE = 8000;

export interface RenderedPage {
  blob: Blob;
  width: number;
  height: number;
}

export interface PdfRenderer {
  pageCount: number;
  /**
   * Renders one 0-based page. `scale` 1 = 72 DPI, or `{ width }` renders it that many pixels
   * wide. The scale is reduced if the page would be too large for the browser to draw.
   */
  render: (
    pageIndex: number,
    scale: number | { width: number },
    type?: "image/jpeg" | "image/png",
    quality?: number,
  ) => Promise<RenderedPage>;
  destroy: () => Promise<void>;
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("The page image could not be created."))),
      type,
      quality,
    ),
  );
}

/** Opens a PDF once so several pages can be rendered without parsing it again. */
export async function openRenderer(bytes: Uint8Array): Promise<PdfRenderer> {
  const pdfjs = await loadPdfJs();
  const document = await pdfjs.getDocument({ data: bytes.slice() }).promise;
  return {
    pageCount: document.numPages,
    async render(pageIndex, scale, type = "image/jpeg", quality = 0.92) {
      const page = await document.getPage(pageIndex + 1);
      try {
        const base = page.getViewport({ scale: 1 });
        const limit = Math.min(
          Math.sqrt(MAX_CANVAS_PIXELS / (base.width * base.height)),
          MAX_CANVAS_SIDE / Math.max(base.width, base.height),
        );
        const wanted = typeof scale === "number" ? scale : scale.width / base.width;
        const viewport = page.getViewport({ scale: Math.min(wanted, limit) });
        const canvas = window.document.createElement("canvas");
        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        const context = canvas.getContext("2d");
        if (!context) throw new Error("Your browser could not draw the page.");
        // A white background, so transparent areas are not black in JPG files.
        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, canvas.width, canvas.height);
        await page.render({ canvasContext: context, viewport }).promise;
        const blob = await canvasToBlob(canvas, type, type === "image/jpeg" ? quality : undefined);
        // Free the canvas memory straight away; large pages use a lot of it.
        canvas.width = 0;
        canvas.height = 0;
        return { blob, width: Math.floor(viewport.width), height: Math.floor(viewport.height) };
      } finally {
        page.cleanup();
      }
    },
    destroy: () => document.destroy(),
  };
}
