import { describe, expect, it } from "vitest";
import {
  formatBytes,
  isSupportedImage,
  outputExtension,
  outputMimeType,
  resizedDimensions,
  safeOutputName,
  savingsPercent,
  shouldKeepOriginal,
} from "./types";

describe("image compressor utilities", () => {
  it("keeps dimensions when no resize limit is selected", () => {
    expect(resizedDimensions(2400, 1600, 0)).toEqual({ width: 2400, height: 1600 });
  });

  it("resizes the longest edge and preserves the aspect ratio", () => {
    expect(resizedDimensions(4000, 2000, 1000)).toEqual({ width: 1000, height: 500 });
    expect(resizedDimensions(1200, 2400, 800)).toEqual({ width: 400, height: 800 });
  });

  it("rejects invalid dimensions", () => {
    expect(() => resizedDimensions(0, 100, 500)).toThrow("positive");
    expect(() => resizedDimensions(100, 100, -1)).toThrow("negative");
  });

  it("maps output formats to MIME types and extensions", () => {
    expect(outputMimeType("image/png", "original")).toBe("image/png");
    expect(outputMimeType("image/png", "jpeg")).toBe("image/jpeg");
    expect(outputExtension("image/jpeg")).toBe("jpg");
    expect(outputExtension("image/webp")).toBe("webp");
  });

  it("formats bytes into readable units", () => {
    expect(formatBytes(0)).toBe("0 B");
    expect(formatBytes(1024)).toBe("1.00 KB");
    expect(formatBytes(1024 * 1024 * 2)).toBe("2.00 MB");
  });

  it("calculates positive and negative savings correctly", () => {
    expect(savingsPercent(1000, 750)).toBe(25);
    expect(savingsPercent(1000, 1250)).toBe(-25);
    expect(savingsPercent(0, 100)).toBe(0);
  });

  it("accepts supported images below the size limit", () => {
    expect(isSupportedImage({ type: "image/jpeg", size: 1024 })).toBe(true);
    expect(isSupportedImage({ type: "image/png", size: 0 })).toBe(false);
    expect(isSupportedImage({ type: "image/gif", size: 1024 })).toBe(false);
  });

  it("creates a safe output filename", () => {
    expect(safeOutputName("my holiday photo.jpg", "webp")).toBe("my-holiday-photo-compressed.webp");
    expect(safeOutputName("!!!.png", "png")).toBe("image-compressed.png");
  });

  it("keeps the original when re-encoding would not make it smaller", () => {
    const base = { originalBytes: 1000, sameFormat: true, resized: false };
    expect(shouldKeepOriginal({ ...base, outputBytes: 1200 })).toBe(true);
    expect(shouldKeepOriginal({ ...base, outputBytes: 1000 })).toBe(true);
    expect(shouldKeepOriginal({ ...base, outputBytes: 800 })).toBe(false);
  });

  it("returns the converted or resized output even when it is larger", () => {
    expect(
      shouldKeepOriginal({
        originalBytes: 1000,
        outputBytes: 1200,
        sameFormat: false,
        resized: false,
      }),
    ).toBe(false);
    expect(
      shouldKeepOriginal({
        originalBytes: 1000,
        outputBytes: 1200,
        sameFormat: true,
        resized: true,
      }),
    ).toBe(false);
  });
});
