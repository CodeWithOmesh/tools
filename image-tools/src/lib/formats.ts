export type OutputFormat = "jpeg" | "png" | "webp";

export interface FormatInfo {
  id: OutputFormat;
  label: string;
  mime: string;
  extension: string;
  /** Lossy formats take a quality setting. */
  lossy: boolean;
  /** Formats that can keep transparent areas. */
  transparency: boolean;
}

export const FORMATS: Record<OutputFormat, FormatInfo> = {
  jpeg: {
    id: "jpeg",
    label: "JPG",
    mime: "image/jpeg",
    extension: "jpg",
    lossy: true,
    transparency: false,
  },
  png: {
    id: "png",
    label: "PNG",
    mime: "image/png",
    extension: "png",
    lossy: false,
    transparency: true,
  },
  webp: {
    id: "webp",
    label: "WebP",
    mime: "image/webp",
    extension: "webp",
    lossy: true,
    transparency: true,
  },
};

/** Image types people can add. Browsers decode all of these; HEIC is not supported by most. */
export const ACCEPTED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/bmp",
  "image/avif",
  "image/svg+xml",
];
export const ACCEPT_ATTRIBUTE = `${ACCEPTED_TYPES.join(",")},.jpg,.jpeg,.png,.webp,.gif,.bmp,.avif,.svg`;
export const ACCEPTED_LABEL = "JPG, PNG, WebP, GIF, BMP, AVIF or SVG";

const EXTENSION_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  jfif: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  bmp: "image/bmp",
  avif: "image/avif",
  svg: "image/svg+xml",
  heic: "image/heic",
  heif: "image/heif",
};

/** The file's image type, using the extension when the browser does not report one. */
export function imageType(file: { name: string; type: string }): string {
  if (file.type) return file.type;
  const extension = /\.([a-z0-9]+)$/i.exec(file.name)?.[1]?.toLowerCase() ?? "";
  return EXTENSION_TYPES[extension] ?? "";
}

/** Why a file cannot be used, or an empty string when it can. */
export function rejectReason(file: { name: string; type: string; size: number }, maxBytes: number) {
  const type = imageType(file);
  if (type === "image/heic" || type === "image/heif") {
    return `${file.name} is a HEIC photo, which browsers cannot open. On iPhone, set Camera › Formats to “Most Compatible”, or share the photo as JPG.`;
  }
  if (!ACCEPTED_TYPES.includes(type)) return `${file.name} is not a supported image`;
  if (file.size > maxBytes)
    return `${file.name} is larger than ${Math.round(maxBytes / 1048576)} MB`;
  return "";
}

/** The output format matching an input type. Formats we cannot write become PNG. */
export function formatForType(type: string): OutputFormat {
  if (type === "image/jpeg") return "jpeg";
  if (type === "image/webp") return "webp";
  return "png";
}

/** A filename-safe name with the new format's extension, e.g. "My photo.PNG" → "My-photo-small.jpg". */
export function outputName(name: string, format: OutputFormat, suffix = ""): string {
  const stem =
    name
      .replace(/\.[^.]+$/, "")
      .replace(/[^\w\-]+/g, "-")
      .replace(/^-+|-+$/g, "") || "image";
  return `${stem}${suffix ? `-${suffix}` : ""}.${FORMATS[format].extension}`;
}

/** Adds "-2", "-3"… to repeated names so files in a ZIP do not overwrite each other. */
export function uniqueNames(names: string[]): string[] {
  const used = new Set<string>();
  return names.map((name) => {
    if (!used.has(name.toLowerCase())) {
      used.add(name.toLowerCase());
      return name;
    }
    const dot = name.lastIndexOf(".");
    const stem = dot > 0 ? name.slice(0, dot) : name;
    const extension = dot > 0 ? name.slice(dot) : "";
    let counter = 2;
    while (used.has(`${stem}-${counter}${extension}`.toLowerCase())) counter += 1;
    const unique = `${stem}-${counter}${extension}`;
    used.add(unique.toLowerCase());
    return unique;
  });
}
