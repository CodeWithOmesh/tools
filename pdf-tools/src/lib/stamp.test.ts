import { describe, expect, it } from "vitest";
import { contentBounds } from "./signature";
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
  type PageFrame,
} from "./stamp";

const frame = (rotation: number): PageFrame => ({
  x: 10,
  y: 20,
  width: 600,
  height: 800,
  rotation,
});
const round = (point: { x: number; y: number }) => ({
  x: Math.round(point.x * 1000) / 1000,
  y: Math.round(point.y * 1000) / 1000,
});

describe("visualToUser", () => {
  it("swaps width and height for sideways pages", () => {
    expect(visualSize(frame(0))).toEqual({ width: 600, height: 800 });
    expect(visualSize(frame(90))).toEqual({ width: 800, height: 600 });
    expect(visualSize(frame(270))).toEqual({ width: 800, height: 600 });
  });

  it("maps the displayed bottom-left corner for every rotation", () => {
    // Bottom-left as the reader sees it, in user space (crop box starts at 10, 20).
    expect(visualToUser(frame(0), { x: 0, y: 0 })).toEqual({ x: 10, y: 20 });
    expect(visualToUser(frame(90), { x: 0, y: 0 })).toEqual({ x: 610, y: 20 });
    expect(visualToUser(frame(180), { x: 0, y: 0 })).toEqual({ x: 610, y: 820 });
    expect(visualToUser(frame(270), { x: 0, y: 0 })).toEqual({ x: 10, y: 820 });
  });

  it("maps the displayed top-right corner for every rotation", () => {
    for (const rotation of [0, 90, 180, 270]) {
      const size = visualSize(frame(rotation));
      const bottomLeft = visualToUser(frame(rotation), { x: 0, y: 0 });
      const topRight = visualToUser(frame(rotation), { x: size.width, y: size.height });
      // Opposite corners of the crop box.
      expect(Math.abs(topRight.x - bottomLeft.x)).toBe(600);
      expect(Math.abs(topRight.y - bottomLeft.y)).toBe(800);
    }
  });
});

describe("centeredTextOrigin", () => {
  it("centres horizontal text", () => {
    expect(centeredTextOrigin({ x: 100, y: 100 }, 40, 10, 0)).toEqual({ x: 80, y: 96.5 });
  });
  it("centres text turned 90°", () => {
    expect(round(centeredTextOrigin({ x: 100, y: 100 }, 40, 10, 90))).toEqual({ x: 103.5, y: 80 });
  });
});

describe("page numbers", () => {
  it("formats every style", () => {
    expect(formatPageNumber("n", 3, 9)).toBe("3");
    expect(formatPageNumber("page-n", 3, 9)).toBe("Page 3");
    expect(formatPageNumber("n-of-total", 3, 9)).toBe("3 / 9");
    expect(formatPageNumber("page-n-of-total", 3, 9)).toBe("Page 3 of 9");
  });

  it("places numbers inside the margins", () => {
    const page = { width: 600, height: 800 };
    expect(pageNumberOrigin("bottom-center", page, 40, 10, 30)).toEqual({ x: 280, y: 30 });
    expect(pageNumberOrigin("bottom-left", page, 40, 10, 30)).toEqual({ x: 30, y: 30 });
    expect(pageNumberOrigin("top-right", page, 40, 10, 30)).toEqual({ x: 530, y: 762.8 });
  });
});

describe("watermarks", () => {
  const page = { width: 600, height: 800 };

  it("runs diagonal text corner to corner", () => {
    expect(watermarkAngle("diagonal", { width: 100, height: 100 })).toBeCloseTo(45);
    expect(watermarkAngle("horizontal", page)).toBe(0);
  });

  it("keeps single watermarks within the page", () => {
    const size = watermarkFontSize("diagonal", "large", page, 7);
    expect(size * 7).toBeLessThanOrEqual(Math.hypot(600, 800));
    // A very short word is capped instead of filling the page.
    expect(watermarkFontSize("horizontal", "large", page, 0.6)).toBeLessThanOrEqual(600 * 0.26);
  });

  it("covers the whole page when tiled", () => {
    const centers = watermarkCenters("tiled", page, 120, 24);
    expect(centers.length).toBeGreaterThan(10);
    expect(Math.min(...centers.map((c) => c.y))).toBeLessThan(100);
    expect(Math.max(...centers.map((c) => c.y))).toBeGreaterThan(700);
    expect(watermarkCenters("diagonal", page, 120, 24)).toEqual([{ x: 300, y: 400 }]);
  });

  it("reads colours", () => {
    expect(hexToRgb("#ff0000")).toEqual([1, 0, 0]);
    expect(hexToRgb("nope")).toEqual([0, 0, 0]);
  });
});

describe("unsupportedCharacters", () => {
  it("accepts Latin text and common symbols", () => {
    expect(unsupportedCharacters("Café – DRAFT © 2026 €")).toEqual([]);
  });
  it("lists characters the PDF font cannot draw", () => {
    expect(unsupportedCharacters("ශ්‍රී ₹ ₹")).toContain("₹");
    expect(unsupportedCharacters("₹₹")).toEqual(["₹"]);
  });
});

describe("clampPlacement", () => {
  it("keeps a signature on the page", () => {
    const placed = clampPlacement({ pageIndex: 0, left: 0.9, top: 0.95, width: 0.3 }, 0.5, 1.4);
    expect(placed.left).toBeCloseTo(0.7);
    expect(placed.top + (0.3 * 0.5) / 1.4).toBeCloseTo(1);
  });
  it("limits the size", () => {
    expect(clampPlacement({ pageIndex: 0, left: 0, top: 0, width: 3 }, 0.3, 1.4).width).toBe(1);
    expect(clampPlacement({ pageIndex: 0, left: 0, top: 0, width: 0 }, 0.3, 1.4).width).toBe(0.05);
  });
});

describe("contentBounds", () => {
  it("finds the drawn area and ignores white and transparent pixels", () => {
    const width = 5;
    const height = 4;
    const data = new Uint8ClampedArray(width * height * 4);
    const paint = (x: number, y: number, value: number, alpha = 255) =>
      data.set([value, value, value, alpha], (y * width + x) * 4);
    paint(0, 0, 255); // white paper
    paint(1, 1, 0);
    paint(3, 2, 20);
    paint(4, 3, 0, 0); // transparent
    expect(contentBounds(data, width, height)).toEqual({ x: 1, y: 1, width: 3, height: 2 });
  });
  it("returns null for an empty image", () => {
    expect(contentBounds(new Uint8ClampedArray(16), 2, 2)).toBeNull();
  });
});
