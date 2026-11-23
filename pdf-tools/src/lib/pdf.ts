import { degrees, EncryptedPDFError, PDFDocument } from "pdf-lib";
import { PdfToolError } from "./errors";
import { rangesToIndices, type PageRange } from "./ranges";

export { PdfToolError } from "./errors";
export * from "./ranges";

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
