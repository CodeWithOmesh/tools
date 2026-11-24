// Pure layout helpers for drawing on PDF pages. They do not import pdf-lib, so they are
// cheap to test and can be used by the UI to preview where things will be placed.

/**
 * A page as the reader sees it: the crop box after the page's own rotation is applied.
 * `rotation` is the page's clockwise /Rotate value (0, 90, 180 or 270).
 */
export interface PageFrame {
  /** Lower-left corner of the crop box in PDF user space. */
  x: number;
  y: number;
  /** Size of the crop box in PDF user space (before rotation). */
  width: number;
  height: number;
  rotation: number;
}

export interface Point {
  x: number;
  y: number;
}

/** Width and height of the page as displayed (swapped for 90° and 270° pages). */
export function visualSize(frame: PageFrame): { width: number; height: number } {
  const sideways = frame.rotation === 90 || frame.rotation === 270;
  return sideways
    ? { width: frame.height, height: frame.width }
    : { width: frame.width, height: frame.height };
}

/**
 * Converts a point measured on the displayed page (origin at its bottom-left corner)
 * into PDF user space, so drawings line up however the page is rotated.
 */
export function visualToUser(frame: PageFrame, point: Point): Point {
  const { x, y, width, height } = frame;
  switch (frame.rotation) {
    case 90:
      return { x: x + width - point.y, y: y + point.x };
    case 180:
      return { x: x + width - point.x, y: y + height - point.y };
    case 270:
      return { x: x + point.y, y: y + height - point.x };
    default:
      return { x: x + point.x, y: y + point.y };
  }
}

/** Rotates a vector anticlockwise by `degrees`. */
export function rotateVector(point: Point, degrees: number): Point {
  const radians = (degrees * Math.PI) / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  return { x: point.x * cos - point.y * sin, y: point.x * sin + point.y * cos };
}

/**
 * Where to start a line of text (its baseline origin, on the displayed page) so that the
 * text is centred on `center` after being turned anticlockwise by `angle` degrees.
 */
export function centeredTextOrigin(
  center: Point,
  textWidth: number,
  fontSize: number,
  angle: number,
): Point {
  // Capital letters sit roughly 0.35 em above the baseline at their middle.
  const offset = rotateVector({ x: textWidth / 2, y: fontSize * 0.35 }, angle);
  return { x: center.x - offset.x, y: center.y - offset.y };
}

// ---------------------------------------------------------------------------
// Page numbers
// ---------------------------------------------------------------------------

export type NumberPosition =
  | "bottom-left"
  | "bottom-center"
  | "bottom-right"
  | "top-left"
  | "top-center"
  | "top-right";

export type NumberFormat = "n" | "page-n" | "page-n-of-total" | "n-of-total";

export function formatPageNumber(format: NumberFormat, number: number, total: number): string {
  switch (format) {
    case "page-n":
      return `Page ${number}`;
    case "page-n-of-total":
      return `Page ${number} of ${total}`;
    case "n-of-total":
      return `${number} / ${total}`;
    default:
      return String(number);
  }
}

/** Baseline origin of a page number on the displayed page. */
export function pageNumberOrigin(
  position: NumberPosition,
  page: { width: number; height: number },
  textWidth: number,
  fontSize: number,
  margin: number,
): Point {
  const [vertical, horizontal] = position.split("-") as ["top" | "bottom", string];
  const x =
    horizontal === "left"
      ? margin
      : horizontal === "right"
        ? page.width - margin - textWidth
        : (page.width - textWidth) / 2;
  // Keep the whole line of text, not just its baseline, inside the margin.
  const y = vertical === "top" ? page.height - margin - fontSize * 0.72 : margin;
  return { x, y };
}

// ---------------------------------------------------------------------------
// Watermarks
// ---------------------------------------------------------------------------

export type WatermarkLayout = "diagonal" | "horizontal" | "tiled";

/** Centres of every copy of the watermark on a displayed page. */
export function watermarkCenters(
  layout: WatermarkLayout,
  page: { width: number; height: number },
  textWidth: number,
  fontSize: number,
): Point[] {
  if (layout !== "tiled") return [{ x: page.width / 2, y: page.height / 2 }];
  const stepX = Math.max(textWidth * 0.9 + fontSize * 2, fontSize * 4);
  const stepY = Math.max(fontSize * 4.5, 60);
  const centers: Point[] = [];
  // Offset every other row so the pattern looks woven rather than stacked.
  for (let row = 0, y = stepY / 2; y < page.height + stepY; row += 1, y += stepY) {
    for (let x = row % 2 ? 0 : stepX / 2; x < page.width + stepX; x += stepX) {
      centers.push({ x, y });
    }
  }
  return centers;
}

export type WatermarkSize = "small" | "medium" | "large";

/** Anticlockwise angle of the watermark text on the displayed page. */
export function watermarkAngle(
  layout: WatermarkLayout,
  page: { width: number; height: number },
): number {
  if (layout === "horizontal") return 0;
  if (layout === "tiled") return 30;
  // Run corner to corner, whatever the page shape.
  return (Math.atan2(page.height, page.width) * 180) / Math.PI;
}

/**
 * Font size for the watermark. Single watermarks are sized relative to the page so they look
 * the same on any paper size; tiled ones use a fixed size. `unitWidth` is the text width at 1 pt.
 */
export function watermarkFontSize(
  layout: WatermarkLayout,
  size: WatermarkSize,
  page: { width: number; height: number },
  unitWidth: number,
): number {
  if (layout === "tiled") return { small: 16, medium: 24, large: 34 }[size];
  const share = { small: 0.4, medium: 0.6, large: 0.8 }[size];
  const span = layout === "diagonal" ? Math.hypot(page.width, page.height) : page.width;
  const fitted = (span * share) / Math.max(unitWidth, 0.01);
  // Short words would otherwise become enormous.
  const cap = Math.min(page.width, page.height) * { small: 0.12, medium: 0.18, large: 0.26 }[size];
  return Math.max(8, Math.min(fitted, cap));
}

/** Turns "#rrggbb" into 0–1 RGB parts. Invalid input becomes black. */
export function hexToRgb(hex: string): [number, number, number] {
  const match = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!match) return [0, 0, 0];
  const value = parseInt(match[1], 16);
  return [(value >> 16) / 255, ((value >> 8) & 0xff) / 255, (value & 0xff) / 255];
}

// ---------------------------------------------------------------------------
// Text the standard PDF fonts can draw
// ---------------------------------------------------------------------------

// Helvetica uses WinAnsi encoding: Latin-1 plus a few extra punctuation marks.
const WIN_ANSI_EXTRAS = new Set("€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ");

/** Characters the built-in PDF fonts cannot draw, without duplicates. */
export function unsupportedCharacters(text: string): string[] {
  const found = new Set<string>();
  for (const char of text) {
    const code = char.codePointAt(0) ?? 0;
    const supported =
      (code >= 0x20 && code <= 0x7e) || (code >= 0xa0 && code <= 0xff) || WIN_ANSI_EXTRAS.has(char);
    if (!supported) found.add(char);
  }
  return [...found];
}

// ---------------------------------------------------------------------------
// Signature placement
// ---------------------------------------------------------------------------

/**
 * A signature on a page, in fractions of the displayed page (0–1, origin top-left),
 * so it stays in place whatever size the preview is shown at.
 */
export interface Placement {
  pageIndex: number;
  left: number;
  top: number;
  width: number;
}

/** Keeps a placement fully on its page. `aspect` is the image's height ÷ width. */
export function clampPlacement(
  placement: Placement,
  aspect: number,
  pageAspect: number,
): Placement {
  const width = Math.min(Math.max(placement.width, 0.05), 1);
  // Height as a fraction of the page height.
  const height = Math.min((width * aspect) / pageAspect, 1);
  return {
    ...placement,
    width,
    left: Math.min(Math.max(placement.left, 0), 1 - width),
    top: Math.min(Math.max(placement.top, 0), Math.max(0, 1 - height)),
  };
}
