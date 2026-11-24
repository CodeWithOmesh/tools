// Turns a drawn, typed or uploaded signature into a trimmed PNG that can be placed on a PDF.

export interface SignatureImage {
  /** PNG bytes for the PDF. */
  bytes: Uint8Array;
  /** Same image, for showing on screen. */
  url: string;
  /** Height ÷ width. */
  aspect: number;
}

export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Smallest box containing every pixel that is visible (alpha above `threshold`) and not
 * near-white, so blank space and white paper backgrounds are cut off. `null` when empty.
 */
export function contentBounds(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  threshold = 16,
): Bounds | null {
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const offset = (y * width + x) * 4;
      const visible = data[offset + 3] > threshold;
      const white = data[offset] > 235 && data[offset + 1] > 235 && data[offset + 2] > 235;
      if (visible && !white) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) return null;
  return { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 };
}

function toPngBytes(canvas: HTMLCanvasElement): Promise<Uint8Array> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => {
      if (!blob) return reject(new Error("The signature image could not be created."));
      blob.arrayBuffer().then((buffer) => resolve(new Uint8Array(buffer)), reject);
    }, "image/png"),
  );
}

/**
 * Crops a canvas to its content (plus a little padding) and returns it as a PNG.
 * When `removeWhite` is set, near-white pixels become transparent, which helps photos of
 * signatures on paper sit cleanly on the document.
 */
export async function canvasToSignature(
  source: HTMLCanvasElement,
  removeWhite = false,
): Promise<SignatureImage | null> {
  const context = source.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("Your browser could not process the signature.");
  const image = context.getImageData(0, 0, source.width, source.height);
  if (removeWhite) {
    const { data } = image;
    for (let offset = 0; offset < data.length; offset += 4) {
      const lightest = Math.min(data[offset], data[offset + 1], data[offset + 2]);
      // Fade pixels out smoothly between light grey and white to keep edges soft.
      if (lightest > 200) data[offset + 3] = Math.round(data[offset + 3] * ((255 - lightest) / 55));
    }
  }
  const bounds = contentBounds(image.data, source.width, source.height);
  if (!bounds) return null;
  const padding = Math.round(Math.max(bounds.width, bounds.height) * 0.03) + 2;
  const output = document.createElement("canvas");
  output.width = bounds.width + padding * 2;
  output.height = bounds.height + padding * 2;
  const outputContext = output.getContext("2d");
  if (!outputContext) throw new Error("Your browser could not process the signature.");
  outputContext.putImageData(
    image,
    padding - bounds.x,
    padding - bounds.y,
    bounds.x,
    bounds.y,
    bounds.width,
    bounds.height,
  );
  const bytes = await toPngBytes(output);
  return {
    bytes,
    url: URL.createObjectURL(new Blob([bytes], { type: "image/png" })),
    aspect: output.height / output.width,
  };
}

export const SIGNATURE_FONTS = [
  { family: "Dancing Script", label: "Flowing" },
  { family: "Great Vibes", label: "Elegant" },
  { family: "Caveat", label: "Casual" },
];

/** Draws a typed name in a handwriting font and returns it as a signature. */
export async function typedSignature(
  name: string,
  family: string,
  color: string,
): Promise<SignatureImage | null> {
  const text = name.trim();
  if (!text) return null;
  const fontSize = 120;
  const font = `${fontSize}px "${family}", cursive`;
  // Make sure the web font has downloaded before drawing, or a fallback font is used.
  await document.fonts.load(font, text).catch(() => undefined);
  const canvas = document.createElement("canvas");
  const measure = canvas.getContext("2d");
  if (!measure) throw new Error("Your browser could not draw the signature.");
  measure.font = font;
  canvas.width = Math.ceil(measure.measureText(text).width + fontSize);
  canvas.height = Math.ceil(fontSize * 2);
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Your browser could not draw the signature.");
  context.font = font;
  context.fillStyle = color;
  context.textBaseline = "middle";
  context.fillText(text, fontSize / 2, canvas.height / 2);
  return canvasToSignature(canvas);
}

/** Loads an uploaded image (PNG or JPG), shrinks very large ones and removes a white background. */
export async function uploadedSignature(file: File): Promise<SignatureImage | null> {
  const bitmap = await createImageBitmap(file).catch(() => {
    throw new Error("This image could not be opened. Try a PNG or JPG file.");
  });
  const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Your browser could not process the image.");
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvasToSignature(canvas, true);
}
