// Size and crop maths. No browser APIs, so everything here is covered by unit tests.

export interface Size {
  width: number;
  height: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Browsers refuse to draw canvases much larger than this (Safari's limit is about 16.7 MP). */
export const MAX_PIXELS = 16_000_000;
export const MAX_SIDE = 16_000;

export function tooLarge({ width, height }: Size): boolean {
  return width > MAX_SIDE || height > MAX_SIDE || width * height > MAX_PIXELS;
}

const whole = (value: number) => Math.max(1, Math.round(value));

// ---------------------------------------------------------------------------
// Resizing
// ---------------------------------------------------------------------------

/**
 * How an image is fitted to a new size:
 * - stretch: exactly the given size, changing the shape if needed
 * - fit: as large as possible inside the size, keeping the shape
 * - cover: fills the size exactly, cutting off the edges that do not fit
 * - pad: the image fits inside and the rest of the size is filled with a background colour
 */
export type FitMode = "stretch" | "fit" | "cover" | "pad";

export type ResizeSpec =
  | { kind: "percent"; percent: number }
  | { kind: "size"; width?: number; height?: number; keepShape: boolean }
  | { kind: "preset"; width: number; height: number; fit: "cover" | "pad" };

export interface ResizePlan {
  /** Final canvas size. */
  output: Size;
  /** Part of the source image to draw. */
  source: Rect;
  /** Where it is drawn on the canvas. */
  target: Rect;
}

/** Works out the output size and drawing rectangles for one image. */
export function planResize(image: Size, spec: ResizeSpec): ResizePlan {
  const full: Rect = { x: 0, y: 0, width: image.width, height: image.height };
  const simple = (size: Size): ResizePlan => ({
    output: size,
    source: full,
    target: { x: 0, y: 0, ...size },
  });

  if (spec.kind === "percent") {
    const scale = Math.max(spec.percent, 0.1) / 100;
    return simple({ width: whole(image.width * scale), height: whole(image.height * scale) });
  }

  if (spec.kind === "size") {
    const width = spec.width && spec.width > 0 ? spec.width : undefined;
    const height = spec.height && spec.height > 0 ? spec.height : undefined;
    if (!width && !height) return simple({ width: image.width, height: image.height });
    if (spec.keepShape || !width || !height) {
      // With only one side given, or "keep shape" on, scale to fit inside the box.
      const scale = Math.min(
        width ? width / image.width : Infinity,
        height ? height / image.height : Infinity,
      );
      return simple({ width: whole(image.width * scale), height: whole(image.height * scale) });
    }
    return simple({ width: whole(width), height: whole(height) });
  }

  const output = { width: whole(spec.width), height: whole(spec.height) };
  if (spec.fit === "cover") {
    return { output, source: coverSource(image, output), target: { x: 0, y: 0, ...output } };
  }
  return { output, source: full, target: containTarget(image, output) };
}

/** The centred part of the image that fills `box` exactly when scaled. */
export function coverSource(image: Size, box: Size): Rect {
  const scale = Math.max(box.width / image.width, box.height / image.height);
  const width = Math.min(image.width, box.width / scale);
  const height = Math.min(image.height, box.height / scale);
  return { x: (image.width - width) / 2, y: (image.height - height) / 2, width, height };
}

/** Where the whole image sits, centred, when scaled to fit inside `box`. */
export function containTarget(image: Size, box: Size): Rect {
  const scale = Math.min(box.width / image.width, box.height / image.height);
  const width = image.width * scale;
  const height = image.height * scale;
  return { x: (box.width - width) / 2, y: (box.height - height) / 2, width, height };
}

/** Fills in the missing side from the image's shape, for live "keep shape" inputs. */
export function matchSide(image: Size, side: "width" | "height", value: number): number {
  if (!(value > 0)) return 0;
  return side === "width"
    ? whole((value * image.height) / image.width)
    : whole((value * image.width) / image.height);
}

// ---------------------------------------------------------------------------
// Cropping
// ---------------------------------------------------------------------------

/** Size after turning the image by a multiple of 90°. */
export function rotatedSize(image: Size, rotation: number): Size {
  const sideways = Math.abs(rotation / 90) % 2 === 1;
  return sideways ? { width: image.height, height: image.width } : image;
}

/** The largest centred crop with the given shape (width ÷ height). Whole image when free. */
export function centeredCrop(image: Size, aspect?: number): Rect {
  if (!aspect) return { x: 0, y: 0, width: image.width, height: image.height };
  let width = image.width;
  let height = width / aspect;
  if (height > image.height) {
    height = image.height;
    width = height * aspect;
  }
  return {
    x: Math.round((image.width - width) / 2),
    y: Math.round((image.height - height) / 2),
    width: Math.round(width),
    height: Math.round(height),
  };
}

const MIN_CROP = 10;

/** Moves a crop by (dx, dy), keeping it on the image. */
export function moveCrop(crop: Rect, dx: number, dy: number, image: Size): Rect {
  return {
    ...crop,
    x: Math.min(Math.max(crop.x + dx, 0), image.width - crop.width),
    y: Math.min(Math.max(crop.y + dy, 0), image.height - crop.height),
  };
}

export type Corner = "nw" | "ne" | "sw" | "se";

/**
 * Drags one corner of the crop by (dx, dy). The opposite corner stays fixed, the crop stays on
 * the image, and a fixed shape (width ÷ height) is kept when `aspect` is given.
 */
export function resizeCrop(
  crop: Rect,
  corner: Corner,
  dx: number,
  dy: number,
  image: Size,
  aspect?: number,
): Rect {
  const west = corner === "nw" || corner === "sw";
  const north = corner === "nw" || corner === "ne";
  // The corner that does not move.
  const anchorX = west ? crop.x + crop.width : crop.x;
  const anchorY = north ? crop.y + crop.height : crop.y;
  // Room available between the fixed corner and the image edge.
  const roomX = west ? anchorX : image.width - anchorX;
  const roomY = north ? anchorY : image.height - anchorY;

  let width = Math.min(Math.max(crop.width + (west ? -dx : dx), MIN_CROP), roomX);
  let height = Math.min(Math.max(crop.height + (north ? -dy : dy), MIN_CROP), roomY);

  if (aspect) {
    // Follow whichever direction moved more, then shrink to fit the room.
    if (Math.abs(dx) >= Math.abs(dy)) height = width / aspect;
    else width = height * aspect;
    const scale = Math.min(1, roomX / width, roomY / height);
    width *= scale;
    height *= scale;
  }

  return {
    x: west ? anchorX - width : anchorX,
    y: north ? anchorY - height : anchorY,
    width,
    height,
  };
}

/** Rounds a crop to whole pixels and keeps it on the image. */
export function roundCrop(crop: Rect, image: Size): Rect {
  const x = Math.min(Math.max(Math.round(crop.x), 0), image.width - 1);
  const y = Math.min(Math.max(Math.round(crop.y), 0), image.height - 1);
  return {
    x,
    y,
    width: Math.min(Math.max(Math.round(crop.width), 1), image.width - x),
    height: Math.min(Math.max(Math.round(crop.height), 1), image.height - y),
  };
}
