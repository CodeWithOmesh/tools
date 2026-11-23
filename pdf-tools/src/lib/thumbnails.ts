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
