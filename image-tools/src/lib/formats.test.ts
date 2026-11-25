import { describe, expect, it } from "vitest";
import { formatForType, imageType, outputName, rejectReason, uniqueNames } from "./formats";

const MB = 1024 * 1024;

describe("formats", () => {
  it("names output files with the new extension", () => {
    expect(outputName("My holiday photo.PNG", "jpeg")).toBe("My-holiday-photo.jpg");
    expect(outputName("logo.svg", "png", "1080x1080")).toBe("logo-1080x1080.png");
    expect(outputName("ශ්‍රී.jpg", "webp")).toBe("image.webp");
  });

  it("keeps names in a ZIP unique", () => {
    expect(uniqueNames(["a.jpg", "b.jpg", "a.jpg", "A.jpg", "a-2.jpg"])).toEqual([
      "a.jpg",
      "b.jpg",
      "a-2.jpg",
      "A-3.jpg",
      "a-2-2.jpg",
    ]);
  });

  it("uses the extension when the browser reports no type", () => {
    expect(imageType({ name: "scan.JPEG", type: "" })).toBe("image/jpeg");
    expect(imageType({ name: "photo.heic", type: "" })).toBe("image/heic");
    expect(imageType({ name: "notes.txt", type: "" })).toBe("");
  });

  it("saves formats we cannot write as PNG", () => {
    expect(formatForType("image/jpeg")).toBe("jpeg");
    expect(formatForType("image/webp")).toBe("webp");
    expect(formatForType("image/gif")).toBe("png");
    expect(formatForType("image/svg+xml")).toBe("png");
  });

  it("explains why a file cannot be used", () => {
    expect(rejectReason({ name: "a.png", type: "image/png", size: MB }, 50 * MB)).toBe("");
    expect(rejectReason({ name: "big.png", type: "image/png", size: 60 * MB }, 50 * MB)).toBe(
      "big.png is larger than 50 MB",
    );
    expect(rejectReason({ name: "IMG_1.HEIC", type: "", size: MB }, 50 * MB)).toContain("HEIC");
    expect(rejectReason({ name: "doc.pdf", type: "application/pdf", size: MB }, 50 * MB)).toBe(
      "doc.pdf is not a supported image",
    );
  });
});
