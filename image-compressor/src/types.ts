export type OutputFormat = "original" | "jpeg" | "png" | "webp";

export interface CompressorSettings {
  format: OutputFormat;
  quality: number;
  maxDimension: number;
}

export interface ImageDimensions {
  width: number;
  height: number;
}

export const DEFAULT_SETTINGS: CompressorSettings = {
  format: "original",
  quality: 78,
  maxDimension: 0,
};

export const ACCEPTED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const MAX_FILE_SIZE = 25 * 1024 * 1024;

export function isSupportedImage(file: Pick<File, "type" | "size">): boolean {
  return (
    (ACCEPTED_MIME_TYPES as readonly string[]).includes(file.type) &&
    file.size > 0 &&
    file.size <= MAX_FILE_SIZE
  );
}

export function outputMimeType(originalMime: string, format: OutputFormat): string {
  if (format === "original") return originalMime;
  if (format === "jpeg") return "image/jpeg";
  if (format === "png") return "image/png";
  return "image/webp";
}

export function outputExtension(mimeType: string): string {
  switch (mimeType) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    default:
      throw new Error("Unsupported output image format.");
  }
}

export function resizedDimensions(
  width: number,
  height: number,
  maxDimension: number,
): ImageDimensions {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    throw new Error("Image dimensions must be positive numbers.");
  }
  if (!Number.isFinite(maxDimension) || maxDimension < 0) {
    throw new Error("Maximum dimension cannot be negative.");
  }
  if (maxDimension === 0 || Math.max(width, height) <= maxDimension) {
    return { width: Math.round(width), height: Math.round(height) };
  }
  const ratio = maxDimension / Math.max(width, height);
  return {
    width: Math.max(1, Math.round(width * ratio)),
    height: Math.max(1, Math.round(height * ratio)),
  };
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

export function savingsPercent(originalBytes: number, outputBytes: number): number {
  if (originalBytes <= 0) return 0;
  return Math.round((1 - outputBytes / originalBytes) * 1000) / 10;
}

export function safeOutputName(name: string, extension: string): string {
  const stem =
    name
      .replace(/\.[^.]+$/, "")
      .replace(/[^a-zA-Z0-9_-]+/g, "-")
      .replace(/^-+|-+$/g, "") || "image";
  return `${stem}-compressed.${extension}`;
}
