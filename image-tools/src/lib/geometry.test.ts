import { describe, expect, it } from "vitest";
import {
  centeredCrop,
  containTarget,
  coverSource,
  matchSide,
  moveCrop,
  planResize,
  resizeCrop,
  rotatedSize,
  roundCrop,
  tooLarge,
} from "./geometry";

const photo = { width: 4000, height: 3000 };

describe("planResize", () => {
  it("scales by percentage", () => {
    expect(planResize(photo, { kind: "percent", percent: 25 }).output).toEqual({
      width: 1000,
      height: 750,
    });
  });

  it("works out the missing side when only one is given", () => {
    expect(planResize(photo, { kind: "size", width: 800, keepShape: false }).output).toEqual({
      width: 800,
      height: 600,
    });
    expect(planResize(photo, { kind: "size", height: 600, keepShape: true }).output).toEqual({
      width: 800,
      height: 600,
    });
  });

  it("fits inside the box when keeping the shape", () => {
    expect(
      planResize(photo, { kind: "size", width: 1000, height: 1000, keepShape: true }).output,
    ).toEqual({ width: 1000, height: 750 });
    // A portrait image in the same box is limited by its height.
    expect(
      planResize(
        { width: 3000, height: 4000 },
        { kind: "size", width: 1000, height: 1000, keepShape: true },
      ).output,
    ).toEqual({ width: 750, height: 1000 });
  });

  it("stretches to the exact size when not keeping the shape", () => {
    expect(
      planResize(photo, { kind: "size", width: 500, height: 500, keepShape: false }).output,
    ).toEqual({ width: 500, height: 500 });
  });

  it("crops to fill a preset size", () => {
    const plan = planResize(photo, { kind: "preset", width: 1080, height: 1080, fit: "cover" });
    expect(plan.output).toEqual({ width: 1080, height: 1080 });
    expect(plan.source).toEqual({ x: 500, y: 0, width: 3000, height: 3000 });
  });

  it("fits inside a preset size with a border", () => {
    const plan = planResize(photo, { kind: "preset", width: 1080, height: 1920, fit: "pad" });
    expect(plan.output).toEqual({ width: 1080, height: 1920 });
    expect(plan.target).toEqual({ x: 0, y: 555, width: 1080, height: 810 });
  });

  it("never makes an image smaller than one pixel", () => {
    expect(planResize({ width: 3, height: 1 }, { kind: "percent", percent: 10 }).output).toEqual({
      width: 1,
      height: 1,
    });
  });
});

describe("cover and contain", () => {
  it("takes the centre of a tall image for a wide box", () => {
    expect(coverSource({ width: 100, height: 300 }, { width: 200, height: 100 })).toEqual({
      x: 0,
      y: 125,
      width: 100,
      height: 50,
    });
  });
  it("centres a wide image in a square", () => {
    expect(containTarget({ width: 200, height: 100 }, { width: 100, height: 100 })).toEqual({
      x: 0,
      y: 25,
      width: 100,
      height: 50,
    });
  });
});

describe("helpers", () => {
  it("matches the other side", () => {
    expect(matchSide(photo, "width", 1000)).toBe(750);
    expect(matchSide(photo, "height", 1500)).toBe(2000);
    expect(matchSide(photo, "width", 0)).toBe(0);
  });
  it("detects sizes the browser cannot create", () => {
    expect(tooLarge({ width: 4000, height: 4000 })).toBe(false);
    expect(tooLarge({ width: 5000, height: 5000 })).toBe(true);
    expect(tooLarge({ width: 20000, height: 10 })).toBe(true);
  });
  it("swaps the sides of sideways images", () => {
    expect(rotatedSize(photo, 90)).toEqual({ width: 3000, height: 4000 });
    expect(rotatedSize(photo, 270)).toEqual({ width: 3000, height: 4000 });
    expect(rotatedSize(photo, 180)).toEqual(photo);
  });
});

describe("cropping", () => {
  it("starts with the largest centred crop of the chosen shape", () => {
    expect(centeredCrop(photo, 1)).toEqual({ x: 500, y: 0, width: 3000, height: 3000 });
    expect(centeredCrop(photo, 16 / 9)).toEqual({ x: 0, y: 375, width: 4000, height: 2250 });
    expect(centeredCrop(photo)).toEqual({ x: 0, y: 0, ...photo });
  });

  it("keeps a moved crop on the image", () => {
    const crop = { x: 100, y: 100, width: 1000, height: 1000 };
    expect(moveCrop(crop, -500, 50, photo)).toEqual({ ...crop, x: 0, y: 150 });
    expect(moveCrop(crop, 9000, 9000, photo)).toEqual({ ...crop, x: 3000, y: 2000 });
  });

  it("resizes from a corner and keeps the opposite corner fixed", () => {
    const crop = { x: 1000, y: 1000, width: 1000, height: 1000 };
    expect(resizeCrop(crop, "se", 200, 100, photo)).toEqual({
      x: 1000,
      y: 1000,
      width: 1200,
      height: 1100,
    });
    expect(resizeCrop(crop, "nw", 200, 100, photo)).toEqual({
      x: 1200,
      y: 1100,
      width: 800,
      height: 900,
    });
  });

  it("keeps the shape and stays on the image when a ratio is set", () => {
    const crop = { x: 0, y: 0, width: 1000, height: 1000 };
    const square = resizeCrop(crop, "se", 5000, 10, photo, 1);
    expect(square.width).toBeCloseTo(3000);
    expect(square.height).toBeCloseTo(3000);
  });

  it("does not let a crop shrink to nothing", () => {
    const crop = { x: 0, y: 0, width: 100, height: 100 };
    expect(resizeCrop(crop, "se", -500, -500, photo).width).toBe(10);
  });

  it("rounds to whole pixels inside the image", () => {
    expect(roundCrop({ x: -0.4, y: 10.6, width: 4000.4, height: 99.5 }, photo)).toEqual({
      x: 0,
      y: 11,
      width: 4000,
      height: 100,
    });
  });
});
