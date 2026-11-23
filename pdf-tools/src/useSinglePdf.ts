import { useEffect, useRef, useState } from "react";
import { errorMessage, isPdfFile, MAX_PDF_BYTES, readBytes } from "./lib/files";
import { renderThumbnails, type ThumbnailJob } from "./lib/thumbnails";

export interface LoadedPdf {
  file: File;
  bytes: Uint8Array;
  pageCount: number;
}

/** Opens one PDF, counts its pages and renders page previews in the background. */
export function useSinglePdf() {
  const [pdf, setPdf] = useState<LoadedPdf | null>(null);
  const [thumbnails, setThumbnails] = useState<(string | undefined)[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const job = useRef<ThumbnailJob | null>(null);
  const requestId = useRef(0);

  useEffect(() => () => job.current?.cancel(), []);

  const clear = () => {
    job.current?.cancel();
    job.current = null;
    requestId.current += 1;
    setPdf(null);
    setThumbnails([]);
    setError("");
    setLoading(false);
  };

  const open = async (files: File[]) => {
    const file = files[0];
    if (!file) return;
    clear();
    if (files.length > 1) setError("Only one PDF can be used here, so the first file was opened.");
    if (!isPdfFile(file)) return setError(`${file.name} is not a PDF file.`);
    if (file.size > MAX_PDF_BYTES) return setError("Choose a PDF smaller than 100 MB.");

    const id = requestId.current;
    setLoading(true);
    try {
      const [bytes, { getPageCount }] = await Promise.all([readBytes(file), import("./lib/pdf")]);
      const pageCount = await getPageCount(bytes);
      if (id !== requestId.current) return;
      setPdf({ file, bytes, pageCount });
      setThumbnails(Array.from({ length: pageCount }, () => undefined));
      job.current = renderThumbnails(bytes, (index, dataUrl) => {
        if (id !== requestId.current) return;
        setThumbnails((current) => {
          const next = [...current];
          next[index] = dataUrl;
          return next;
        });
      });
      // Previews are a convenience; the tools still work if they fail to render.
      job.current.done.catch(() => undefined);
    } catch (reason) {
      if (id === requestId.current) setError(errorMessage(reason, "This PDF could not be opened."));
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  };

  return { pdf, thumbnails, loading, error, setError, open, clear };
}
