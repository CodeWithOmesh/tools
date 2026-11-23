export const MAX_PDF_BYTES = 100 * 1024 * 1024;
export const MAX_IMAGE_BYTES = 25 * 1024 * 1024;
export const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

export function isPdfFile(file: File): boolean {
  // Some systems report an empty MIME type, so fall back to the extension.
  return file.type === "application/pdf" || /\.pdf$/i.test(file.name);
}

export async function readBytes(file: File): Promise<Uint8Array> {
  return new Uint8Array(await file.arrayBuffer());
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function downloadPdf(bytes: Uint8Array, filename: string) {
  downloadBlob(new Blob([bytes], { type: "application/pdf" }), filename);
}

/** Bundles several PDFs into a ZIP and downloads it. JSZip is loaded only when needed. */
export async function downloadPdfsAsZip(
  files: { name: string; bytes: Uint8Array }[],
  zipName: string,
) {
  const { default: JSZip } = await import("jszip");
  const zip = new JSZip();
  files.forEach((file) => zip.file(file.name, file.bytes));
  downloadBlob(await zip.generateAsync({ type: "blob" }), zipName);
}

/** A filename-safe version of a file's name without its extension. */
export function fileStem(name: string): string {
  return (
    name
      .replace(/\.[^.]+$/, "")
      .replace(/[^\w\-]+/g, "-")
      .replace(/^-+|-+$/g, "") || "document"
  );
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let index = 0;
  while (value >= 1024 && index < units.length - 1) {
    value /= 1024;
    index += 1;
  }
  return `${value.toFixed(value >= 10 ? 1 : 2)} ${units[index]}`;
}

export function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

let nextId = 0;
export function makeId(prefix: string): string {
  nextId += 1;
  return `${prefix}-${Date.now().toString(36)}-${nextId}`;
}

export function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}
