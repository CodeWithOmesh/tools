import { PdfToolError } from "./errors";
import { ACCEPTED_IMAGE_TYPES } from "./files";
import type { PreparedImage } from "./pdf";

/** Very large photos are scaled down so the PDF stays a sensible size. */
const MAX_EDGE = 4000;

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) =>
        blob ? resolve(blob) : reject(new PdfToolError("This image could not be processed.")),
      type,
      quality,
    );
  });
}

/**
 * Re-draws an image through a canvas so that:
 * - phone photos come out the right way up (EXIF orientation is applied by the browser),
 * - WebP images become JPEG, which PDFs support,
 * - huge images are scaled to a printable size.
 * PNGs stay PNG so transparency is kept.
 */
export async function prepareImage(file: File): Promise<PreparedImage> {
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
    throw new PdfToolError("Use JPG, PNG or WebP images.");
  }
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new PdfToolError("This image could not be opened. It may be damaged.");
  }
  try {
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const keepPng = file.type === "image/png";
    const context = canvas.getContext("2d", { alpha: keepPng });
    if (!context) throw new PdfToolError("Your browser could not process this image.");
    if (!keepPng) {
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, width, height);
    }
    context.drawImage(bitmap, 0, 0, width, height);
    const blob = await canvasToBlob(canvas, keepPng ? "image/png" : "image/jpeg", 0.92);
    return {
      bytes: new Uint8Array(await blob.arrayBuffer()),
      format: keepPng ? "png" : "jpeg",
      width,
      height,
    };
  } finally {
    bitmap.close();
  }
}
