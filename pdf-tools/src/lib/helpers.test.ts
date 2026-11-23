import { describe, expect, it } from "vitest";
import { fileStem, formatBytes, isPdfFile, pluralize } from "./files";
import { moveItem } from "./order";

describe("moveItem", () => {
  it("moves an item forwards and backwards", () => {
    expect(moveItem(["a", "b", "c", "d"], 0, 2)).toEqual(["b", "c", "a", "d"]);
    expect(moveItem(["a", "b", "c", "d"], 3, 1)).toEqual(["a", "d", "b", "c"]);
  });

  it("ignores moves that are out of range or to the same place", () => {
    const items = ["a", "b"];
    expect(moveItem(items, 0, 0)).toBe(items);
    expect(moveItem(items, 0, 5)).toBe(items);
    expect(moveItem(items, -1, 1)).toBe(items);
  });
});

describe("file helpers", () => {
  it("recognises PDFs by type or extension", () => {
    expect(isPdfFile(new File([], "a.bin", { type: "application/pdf" }))).toBe(true);
    expect(isPdfFile(new File([], "Report.PDF"))).toBe(true);
    expect(isPdfFile(new File([], "photo.jpg", { type: "image/jpeg" }))).toBe(false);
  });

  it("makes safe file names", () => {
    expect(fileStem("Q3 report (final).pdf")).toBe("Q3-report-final");
    expect(fileStem("!!!.pdf")).toBe("document");
  });

  it("formats sizes and counts", () => {
    expect(formatBytes(0)).toBe("0 B");
    expect(formatBytes(1536)).toBe("1.50 KB");
    expect(formatBytes(5 * 1024 * 1024)).toBe("5.00 MB");
    expect(pluralize(1, "page")).toBe("1 page");
    expect(pluralize(3, "page")).toBe("3 pages");
  });
});
