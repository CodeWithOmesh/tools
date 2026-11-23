import { describe, expect, it } from "vitest";
import { contrastWarning } from "./qr";

describe("QR colour contrast", () => {
  it("accepts dark-on-light colour pairs", () => {
    expect(contrastWarning("#111827", "#ffffff")).toBe("");
    expect(contrastWarning("#7c2d12", "#fff7ed")).toBe("");
  });

  it("warns about inverted codes", () => {
    expect(contrastWarning("#ffffff", "#111827")).toContain("inverted");
  });

  it("warns about low contrast", () => {
    expect(contrastWarning("#999999", "#bbbbbb")).toContain("contrast");
  });

  it("ignores incomplete hex values while the user is typing", () => {
    expect(contrastWarning("#12", "#ffffff")).toBe("");
  });
});
