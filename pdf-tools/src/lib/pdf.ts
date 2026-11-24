import { degrees, EncryptedPDFError, PDFDocument, rgb, StandardFonts, type PDFPage } from "pdf-lib";
import { PdfToolError } from "./errors";
import { rangesToIndices, type PageRange } from "./ranges";
import {
  centeredTextOrigin,
  clampPlacement,
  formatPageNumber,
  hexToRgb,
  pageNumberOrigin,
  unsupportedCharacters,
  visualSize,
  visualToUser,
  watermarkAngle,
  watermarkCenters,
  watermarkFontSize,
  type NumberFormat,
  type NumberPosition,
  type PageFrame,
  type Placement,
  type Point,
  type WatermarkLayout,
  type WatermarkSize,
} from "./stamp";

export { PdfToolError } from "./errors";
export * from "./ranges";
export * from "./stamp";

const PRODUCER = "Code with Omesh PDF Tools (codewithomesh.com)";

function stamp(document: PDFDocument) {
  document.setProducer(PRODUCER);
  document.setCreator(PRODUCER);
}

/** Loads a PDF, turning library errors into messages a user can act on. */
export async function loadPdf(bytes: Uint8Array): Promise<PDFDocument> {
  try {
    return await PDFDocument.load(bytes, { updateMetadata: false });
  } catch (error) {
    if (error instanceof EncryptedPDFError) {
      throw new PdfToolError(
        "This PDF is password-protected. Remove the password first, then try again.",
      );
    }
    throw new PdfToolError("This file could not be read as a PDF. It may be damaged.");
  }
}

export async function getPageCount(bytes: Uint8Array): Promise<number> {
  return (await loadPdf(bytes)).getPageCount();
}

/** Combines several PDFs, in the given order, into one document. */
export async function mergePdfs(files: Uint8Array[]): Promise<Uint8Array> {
  if (files.length < 2) throw new PdfToolError("Add at least two PDF files to merge.");
  const output = await PDFDocument.create();
  for (const bytes of files) {
    const source = await loadPdf(bytes);
    const pages = await output.copyPages(source, source.getPageIndices());
    pages.forEach((page) => output.addPage(page));
  }
  stamp(output);
  return output.save();
}

/** Builds a new PDF containing the given 0-based pages, in order. */
export async function extractPages(bytes: Uint8Array, indices: number[]): Promise<Uint8Array> {
  if (!indices.length) throw new PdfToolError("Choose at least one page.");
  const source = await loadPdf(bytes);
  const output = await PDFDocument.create();
  const pages = await output.copyPages(source, indices);
  pages.forEach((page) => output.addPage(page));
  stamp(output);
  return output.save();
}

/** Creates one PDF per range. */
export async function splitByRanges(bytes: Uint8Array, ranges: PageRange[]): Promise<Uint8Array[]> {
  const results: Uint8Array[] = [];
  for (const range of ranges) results.push(await extractPages(bytes, rangesToIndices([range])));
  return results;
}

// ---------------------------------------------------------------------------
// Organize (reorder, rotate, delete)
// ---------------------------------------------------------------------------

export interface PageEdit {
  /** 0-based index of the page in the original document. */
  sourceIndex: number;
  /** Extra clockwise rotation in degrees (a multiple of 90). */
  rotation: number;
}

export function normalizeRotation(angle: number): number {
  return (((Math.round(angle / 90) * 90) % 360) + 360) % 360;
}

/** Rebuilds a PDF with pages in the given order and rotation. Omitted pages are removed. */
export async function organizePdf(bytes: Uint8Array, edits: PageEdit[]): Promise<Uint8Array> {
  if (!edits.length) throw new PdfToolError("Keep at least one page.");
  const source = await loadPdf(bytes);
  const output = await PDFDocument.create();
  const pages = await output.copyPages(
    source,
    edits.map((edit) => edit.sourceIndex),
  );
  pages.forEach((page, index) => {
    const extra = edits[index].rotation;
    if (extra) page.setRotation(degrees(normalizeRotation(page.getRotation().angle + extra)));
    output.addPage(page);
  });
  stamp(output);
  return output.save();
}

// ---------------------------------------------------------------------------
// Images to PDF
// ---------------------------------------------------------------------------

export interface PreparedImage {
  bytes: Uint8Array;
  format: "jpeg" | "png";
  width: number;
  height: number;
}

export type PageSize = "a4" | "letter" | "fit";
export type Orientation = "auto" | "portrait" | "landscape";

export interface ImagePdfOptions {
  pageSize: PageSize;
  orientation: Orientation;
  /** Margin in PDF points (1/72 inch). */
  margin: number;
}

const PAGE_SIZES: Record<Exclude<PageSize, "fit">, [number, number]> = {
  a4: [595.28, 841.89],
  letter: [612, 792],
};

/** Pixels are treated as 96 DPI when a page is sized to fit the image. */
const PX_TO_PT = 72 / 96;

export interface ImageLayout {
  pageWidth: number;
  pageHeight: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Works out the page size and where the image sits on it (scaled to fit, centred). */
export function layoutImage(
  imageWidth: number,
  imageHeight: number,
  options: ImagePdfOptions,
): ImageLayout {
  const margin = Math.max(0, options.margin);
  if (options.pageSize === "fit") {
    const width = imageWidth * PX_TO_PT;
    const height = imageHeight * PX_TO_PT;
    return {
      pageWidth: width + margin * 2,
      pageHeight: height + margin * 2,
      x: margin,
      y: margin,
      width,
      height,
    };
  }
  const [short, long] = PAGE_SIZES[options.pageSize];
  const landscape =
    options.orientation === "landscape" ||
    (options.orientation === "auto" && imageWidth > imageHeight);
  const pageWidth = landscape ? long : short;
  const pageHeight = landscape ? short : long;
  const boxWidth = pageWidth - margin * 2;
  const boxHeight = pageHeight - margin * 2;
  const scale = Math.min(boxWidth / imageWidth, boxHeight / imageHeight);
  const width = imageWidth * scale;
  const height = imageHeight * scale;
  return {
    pageWidth,
    pageHeight,
    x: (pageWidth - width) / 2,
    y: (pageHeight - height) / 2,
    width,
    height,
  };
}

/** Places each image on its own page. */
export async function imagesToPdf(
  images: PreparedImage[],
  options: ImagePdfOptions,
): Promise<Uint8Array> {
  if (!images.length) throw new PdfToolError("Add at least one image.");
  const output = await PDFDocument.create();
  for (const image of images) {
    const embedded =
      image.format === "png"
        ? await output.embedPng(image.bytes)
        : await output.embedJpg(image.bytes);
    const layout = layoutImage(image.width, image.height, options);
    const page = output.addPage([layout.pageWidth, layout.pageHeight]);
    page.drawImage(embedded, {
      x: layout.x,
      y: layout.y,
      width: layout.width,
      height: layout.height,
    });
  }
  stamp(output);
  return output.save();
}

// ---------------------------------------------------------------------------
// Drawing on pages (page numbers, watermarks, signatures)
// ---------------------------------------------------------------------------

function pageFrame(page: PDFPage): PageFrame {
  const box = page.getCropBox();
  return {
    x: box.x,
    y: box.y,
    width: box.width,
    height: box.height,
    rotation: normalizeRotation(page.getRotation().angle),
  };
}

/** Rejects text the built-in PDF font cannot draw, with a message naming the characters. */
function assertDrawable(text: string, what: string) {
  const unsupported = unsupportedCharacters(text);
  if (unsupported.length) {
    throw new PdfToolError(
      `The ${what} can only use Latin letters, numbers and common symbols. Remove: ${unsupported.join(" ")}`,
    );
  }
}

/** Every page index, or the given ones after removing out-of-range values. */
function targetPages(pageCount: number, pages?: number[]): number[] {
  if (!pages) return Array.from({ length: pageCount }, (_, index) => index);
  const valid = [...new Set(pages)].filter((index) => index >= 0 && index < pageCount);
  if (!valid.length) throw new PdfToolError("Choose at least one page.");
  return valid.sort((a, b) => a - b);
}

/** Draws text whose origin and angle are given on the displayed page. */
function drawVisualText(
  page: PDFPage,
  frame: PageFrame,
  text: string,
  origin: Point,
  angle: number,
  options: Parameters<PDFPage["drawText"]>[1],
) {
  const point = visualToUser(frame, origin);
  page.drawText(text, {
    ...options,
    x: point.x,
    y: point.y,
    rotate: degrees(angle + frame.rotation),
  });
}

export interface PageNumberOptions {
  position: NumberPosition;
  format: NumberFormat;
  /** Number shown on the first numbered page. */
  startAt: number;
  fontSize: number;
  /** Distance from the page edge, in PDF points. */
  margin: number;
  /** 0-based pages to number. All pages when omitted. */
  pages?: number[];
}

export async function addPageNumbers(
  bytes: Uint8Array,
  options: PageNumberOptions,
): Promise<Uint8Array> {
  const document = await loadPdf(bytes);
  const font = await document.embedFont(StandardFonts.Helvetica);
  const pages = document.getPages();
  const targets = targetPages(pages.length, options.pages);
  const startAt = Math.max(0, Math.round(options.startAt));
  const total = startAt + targets.length - 1;
  targets.forEach((pageIndex, position) => {
    const page = pages[pageIndex];
    const frame = pageFrame(page);
    const text = formatPageNumber(options.format, startAt + position, total);
    const width = font.widthOfTextAtSize(text, options.fontSize);
    const origin = pageNumberOrigin(
      options.position,
      visualSize(frame),
      width,
      options.fontSize,
      options.margin,
    );
    drawVisualText(page, frame, text, origin, 0, {
      font,
      size: options.fontSize,
      color: rgb(0.2, 0.2, 0.2),
    });
  });
  stamp(document);
  return document.save();
}

export interface WatermarkOptions {
  text: string;
  layout: WatermarkLayout;
  size: WatermarkSize;
  /** "#rrggbb" */
  color: string;
  /** 0–1 */
  opacity: number;
  pages?: number[];
}

export async function addWatermark(
  bytes: Uint8Array,
  options: WatermarkOptions,
): Promise<Uint8Array> {
  const text = options.text.replace(/\s+/g, " ").trim();
  if (!text) throw new PdfToolError("Type the watermark text.");
  assertDrawable(text, "watermark text");
  const document = await loadPdf(bytes);
  const font = await document.embedFont(StandardFonts.HelveticaBold);
  const pages = document.getPages();
  const [red, green, blue] = hexToRgb(options.color);
  const unitWidth = font.widthOfTextAtSize(text, 1);
  for (const pageIndex of targetPages(pages.length, options.pages)) {
    const page = pages[pageIndex];
    const frame = pageFrame(page);
    const size = visualSize(frame);
    const fontSize = watermarkFontSize(options.layout, options.size, size, unitWidth);
    const angle = watermarkAngle(options.layout, size);
    const width = unitWidth * fontSize;
    for (const center of watermarkCenters(options.layout, size, width, fontSize)) {
      drawVisualText(page, frame, text, centeredTextOrigin(center, width, fontSize, angle), angle, {
        font,
        size: fontSize,
        color: rgb(red, green, blue),
        opacity: Math.min(Math.max(options.opacity, 0.05), 1),
      });
    }
  }
  stamp(document);
  return document.save();
}

export interface StampImage {
  bytes: Uint8Array;
  format: "png" | "jpeg";
  /** Height ÷ width. */
  aspect: number;
}

/** Places an image (such as a signature) at each placement. */
export async function placeImage(
  bytes: Uint8Array,
  image: StampImage,
  placements: Placement[],
): Promise<Uint8Array> {
  if (!placements.length) throw new PdfToolError("Place your signature on at least one page.");
  const document = await loadPdf(bytes);
  const embedded =
    image.format === "png"
      ? await document.embedPng(image.bytes)
      : await document.embedJpg(image.bytes);
  const pages = document.getPages();
  for (const raw of placements) {
    const page = pages[raw.pageIndex];
    if (!page) continue;
    const frame = pageFrame(page);
    const size = visualSize(frame);
    const placement = clampPlacement(raw, image.aspect, size.height / size.width);
    const width = placement.width * size.width;
    const height = width * image.aspect;
    // Placements are measured from the top-left; PDF drawing starts at the bottom-left.
    const origin = visualToUser(frame, {
      x: placement.left * size.width,
      y: size.height - placement.top * size.height - height,
    });
    page.drawImage(embedded, {
      x: origin.x,
      y: origin.y,
      width,
      height,
      rotate: degrees(frame.rotation),
    });
  }
  stamp(document);
  return document.save();
}
