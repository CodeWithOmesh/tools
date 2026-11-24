import { describe, expect, it } from "vitest";
import { degrees, PDFDocument } from "pdf-lib";
import {
  addPageNumbers,
  addWatermark,
  extractPages,
  formatPageSelection,
  imagesToPdf,
  layoutImage,
  mergePdfs,
  normalizeRotation,
  organizePdf,
  parsePageRanges,
  placeImage,
  rangesToIndices,
  splitByRanges,
} from "./pdf";

/** Builds a PDF whose page widths (100, 101, …) identify each page. */
async function makePdf(pageCount: number, firstWidth = 100): Promise<Uint8Array> {
  const document = await PDFDocument.create();
  for (let i = 0; i < pageCount; i += 1) document.addPage([firstWidth + i, 200]);
  return document.save();
}

async function pageWidths(bytes: Uint8Array): Promise<number[]> {
  const document = await PDFDocument.load(bytes);
  return document.getPages().map((page) => Math.round(page.getWidth()));
}

// A 1×1 red PNG.
const PNG_1X1 = Uint8Array.from(
  atob(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  ),
  (char) => char.charCodeAt(0),
);

describe("merge", () => {
  it("combines files in the given order", async () => {
    const merged = await mergePdfs([await makePdf(2, 100), await makePdf(3, 200)]);
    expect(await pageWidths(merged)).toEqual([100, 101, 200, 201, 202]);
  });

  it("needs at least two files", async () => {
    await expect(mergePdfs([await makePdf(1)])).rejects.toThrow("at least two");
  });

  it("explains unreadable files", async () => {
    const broken = new TextEncoder().encode("not a pdf");
    await expect(mergePdfs([broken, await makePdf(1)])).rejects.toThrow("could not be read");
  });
});

describe("page ranges", () => {
  it("parses single pages, ranges and open-ended ranges", () => {
    expect(parsePageRanges("1-3, 5, 8-", 10)).toEqual([
      { start: 1, end: 3 },
      { start: 5, end: 5 },
      { start: 8, end: 10 },
    ]);
    expect(parsePageRanges("-2", 10)).toEqual([{ start: 1, end: 2 }]);
    expect(parsePageRanges(" 2 – 4 ", 10)).toEqual([{ start: 2, end: 4 }]);
  });

  it("rejects pages that do not exist and backwards ranges", () => {
    expect(() => parsePageRanges("12", 10)).toThrow("Page 12 does not exist");
    expect(() => parsePageRanges("0", 10)).toThrow("Page 0 does not exist");
    expect(() => parsePageRanges("5-2", 10)).toThrow("backwards");
    expect(() => parsePageRanges("abc", 10)).toThrow("not a valid");
    expect(() => parsePageRanges("-", 10)).toThrow("not a valid");
    expect(() => parsePageRanges("  ", 10)).toThrow("Enter the pages");
  });

  it("converts ranges to indexes and back to compact text", () => {
    expect(
      rangesToIndices([
        { start: 1, end: 3 },
        { start: 5, end: 5 },
      ]),
    ).toEqual([0, 1, 2, 4]);
    expect(formatPageSelection([4, 0, 1, 2, 9, 2])).toBe("1-3, 5, 10");
    expect(formatPageSelection([])).toBe("");
  });
});

describe("extract and split", () => {
  it("extracts chosen pages in order", async () => {
    const source = await makePdf(5);
    expect(await pageWidths(await extractPages(source, [4, 0, 2]))).toEqual([104, 100, 102]);
  });

  it("creates one file per range", async () => {
    const source = await makePdf(5);
    const parts = await splitByRanges(source, parsePageRanges("1-2, 5", 5));
    expect(parts).toHaveLength(2);
    expect(await pageWidths(parts[0])).toEqual([100, 101]);
    expect(await pageWidths(parts[1])).toEqual([104]);
  });
});

describe("organize", () => {
  it("reorders, rotates and removes pages", async () => {
    const source = await makePdf(4);
    const result = await organizePdf(source, [
      { sourceIndex: 3, rotation: 90 },
      { sourceIndex: 0, rotation: 0 },
      { sourceIndex: 1, rotation: -90 },
    ]);
    const document = await PDFDocument.load(result);
    expect(document.getPages().map((page) => Math.round(page.getWidth()))).toEqual([103, 100, 101]);
    expect(document.getPages().map((page) => page.getRotation().angle)).toEqual([90, 0, 270]);
  });

  it("keeps at least one page", async () => {
    await expect(organizePdf(await makePdf(2), [])).rejects.toThrow("at least one page");
  });

  it("normalizes rotation angles", () => {
    expect(normalizeRotation(-90)).toBe(270);
    expect(normalizeRotation(450)).toBe(90);
    expect(normalizeRotation(360)).toBe(0);
  });
});

describe("images to PDF", () => {
  it("fits a landscape image on a landscape A4 page, centred", () => {
    const layout = layoutImage(2000, 1000, { pageSize: "a4", orientation: "auto", margin: 36 });
    expect(Math.round(layout.pageWidth)).toBe(842);
    expect(Math.round(layout.pageHeight)).toBe(595);
    expect(Math.round(layout.width)).toBe(770);
    expect(Math.round(layout.x)).toBe(36);
    expect(Math.round(layout.y + layout.height / 2)).toBe(Math.round(layout.pageHeight / 2));
  });

  it("respects a forced orientation", () => {
    const layout = layoutImage(2000, 1000, {
      pageSize: "letter",
      orientation: "portrait",
      margin: 0,
    });
    expect([layout.pageWidth, layout.pageHeight]).toEqual([612, 792]);
    expect(layout.width).toBe(612);
  });

  it("sizes the page to the image when asked", () => {
    const layout = layoutImage(960, 480, { pageSize: "fit", orientation: "auto", margin: 10 });
    expect([layout.pageWidth, layout.pageHeight]).toEqual([740, 380]);
  });

  it("creates one page per image", async () => {
    const image = { bytes: PNG_1X1, format: "png" as const, width: 1, height: 1 };
    const result = await imagesToPdf([image, image, image], {
      pageSize: "a4",
      orientation: "auto",
      margin: 0,
    });
    expect((await PDFDocument.load(result)).getPageCount()).toBe(3);
  });
});

describe("drawing on pages", () => {
  async function rotatedPdf(): Promise<Uint8Array> {
    const document = await PDFDocument.create();
    document.addPage([300, 400]);
    document.addPage([300, 400]).setRotation(degrees(90));
    document.addPage([300, 400]).setRotation(degrees(270));
    return document.save();
  }

  async function contentLength(bytes: Uint8Array, pageIndex: number): Promise<number> {
    const document = await PDFDocument.load(bytes);
    const contents = document.getPage(pageIndex).node.Contents();
    return contents ? contents.toString().length : 0;
  }

  it("adds page numbers to the chosen pages only", async () => {
    const source = await rotatedPdf();
    const result = await addPageNumbers(source, {
      position: "bottom-center",
      format: "page-n-of-total",
      startAt: 1,
      fontSize: 11,
      margin: 28,
      pages: [1, 2],
    });
    expect(await pageWidths(result)).toEqual([300, 300, 300]);
    expect(await contentLength(result, 0)).toBe(await contentLength(source, 0));
    expect(await contentLength(result, 1)).toBeGreaterThan(await contentLength(source, 1));
  });

  it("adds a watermark to every page", async () => {
    const result = await addWatermark(await rotatedPdf(), {
      text: "CONFIDENTIAL",
      layout: "tiled",
      size: "medium",
      color: "#ff0000",
      opacity: 0.3,
    });
    const document = await PDFDocument.load(result);
    expect(document.getPageCount()).toBe(3);
    expect(document.getPage(2).getRotation().angle).toBe(270);
  });

  it("explains watermark text the PDF font cannot draw", async () => {
    await expect(
      addWatermark(await rotatedPdf(), {
        text: "₹ PAID",
        layout: "diagonal",
        size: "medium",
        color: "#000000",
        opacity: 0.3,
      }),
    ).rejects.toThrow("Remove: ₹");
  });

  it("places a signature image on the chosen pages", async () => {
    const result = await placeImage(
      await rotatedPdf(),
      { bytes: PNG_1X1, format: "png", aspect: 1 },
      [
        { pageIndex: 1, left: 0.6, top: 0.8, width: 0.3 },
        { pageIndex: 2, left: 0.1, top: 0.1, width: 0.2 },
      ],
    );
    const document = await PDFDocument.load(result);
    expect(document.getPageCount()).toBe(3);
    await expect(
      placeImage(result, { bytes: PNG_1X1, format: "png", aspect: 1 }, []),
    ).rejects.toThrow("at least one page");
  });
});
