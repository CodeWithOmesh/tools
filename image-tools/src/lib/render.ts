// Decoding and encoding images with the browser's canvas.
import { FORMATS, imageType, type OutputFormat } from "./formats";
import { tooLarge, type Rect, type Size } from "./geometry";

export interface LoadedImage extends Size {
  source: CanvasImageSource;
  close: () => void;
}

function loadWithElement(file: File): Promise<LoadedImage> {
  const url = URL.createObjectURL(file);
  const image = new Image();
  image.decoding = "async";
  image.src = url;
  return image.decode().then(
    () => {
      if (!image.naturalWidth || !image.naturalHeight) {
        URL.revokeObjectURL(url);
        throw new Error(`${file.name} has no size set, so it cannot be converted.`);
      }
      return {
        source: image,
        width: image.naturalWidth,
        height: image.naturalHeight,
        close: () => URL.revokeObjectURL(url),
      };
    },
    () => {
      URL.revokeObjectURL(url);
      throw new Error(
        `${file.name} could not be opened. It may be damaged or in an unsupported format.`,
      );
    },
  );
}

/**
 * Decodes an image file. Phone photos are turned the right way up using their EXIF orientation.
 * SVG files are drawn at their own size.
 */
export async function loadImage(file: File): Promise<LoadedImage> {
  if (imageType(file) === "image/svg+xml") return loadWithElement(file);
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    return {
      source: bitmap,
      width: bitmap.width,
      height: bitmap.height,
      close: () => bitmap.close(),
    };
  } catch {
    // Some browsers cannot make bitmaps from every format but can still show it as an <img>.
    return loadWithElement(file);
  }
}

function makeCanvas({ width, height }: Size) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Your browser could not process the image.");
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  return { canvas, context };
}

/**
 * Draws part of an image scaled into `target`. Large reductions are done in halving steps,
 * which keeps fine detail and text much sharper than a single big jump.
 */
function drawScaled(
  context: CanvasRenderingContext2D,
  source: CanvasImageSource,
  from: Rect,
  target: Rect,
) {
  let current: CanvasImageSource = source;
  let area: Rect = from;
  while (area.width / 2 > target.width && area.height / 2 > target.height) {
    const half = { width: Math.ceil(area.width / 2), height: Math.ceil(area.height / 2) };
    const step = makeCanvas(half);
    step.context.drawImage(
      current,
      area.x,
      area.y,
      area.width,
      area.height,
      0,
      0,
      half.width,
      half.height,
    );
    current = step.canvas;
    area = { x: 0, y: 0, ...half };
  }
  context.drawImage(
    current,
    area.x,
    area.y,
    area.width,
    area.height,
    target.x,
    target.y,
    target.width,
    target.height,
  );
}

export interface EncodeOptions {
  format: OutputFormat;
  /** 0–1, used by JPG and WebP. */
  quality: number;
  /** Fills transparent areas. Always used for JPG, which cannot be transparent. */
  background?: string;
}

function encode(canvas: HTMLCanvasElement, options: EncodeOptions): Promise<Blob> {
  const { mime, lossy, label } = FORMATS[options.format];
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) => {
        // Free the canvas memory straight away; large images use a lot of it.
        canvas.width = 0;
        canvas.height = 0;
        if (!blob) return reject(new Error("The image could not be created. Try a smaller size."));
        // Browsers that cannot write a format silently return PNG instead.
        if (blob.type !== mime) {
          return reject(
            new Error(`Your browser cannot create ${label} files. Choose another format.`),
          );
        }
        resolve(blob);
      },
      mime,
      lossy ? options.quality : undefined,
    ),
  );
}

function prepareCanvas(output: Size, options: EncodeOptions) {
  if (tooLarge(output)) {
    throw new Error(
      `${output.width} × ${output.height} px is too large for the browser to create. Choose a smaller size.`,
    );
  }
  const made = makeCanvas(output);
  const background = options.background ?? (options.format === "jpeg" ? "#ffffff" : undefined);
  if (background) {
    made.context.fillStyle = background;
    made.context.fillRect(0, 0, output.width, output.height);
  }
  return made;
}

/** Draws `source` (part of the image) into `target` on a canvas of size `output`. */
export async function renderResized(
  image: LoadedImage,
  plan: { output: Size; source: Rect; target: Rect },
  options: EncodeOptions,
): Promise<Blob> {
  const { canvas, context } = prepareCanvas(plan.output, options);
  drawScaled(context, image.source, plan.source, plan.target);
  return encode(canvas, options);
}

export interface Transform {
  /** Clockwise, a multiple of 90. */
  rotation: number;
  flipX: boolean;
  flipY: boolean;
}

/** Rotates or flips the image, then keeps only `crop` (measured on the turned image). */
export async function renderCropped(
  image: LoadedImage,
  transform: Transform,
  crop: Rect,
  options: EncodeOptions,
): Promise<Blob> {
  const { canvas, context } = prepareCanvas({ width: crop.width, height: crop.height }, options);
  const sideways = Math.abs(transform.rotation / 90) % 2 === 1;
  const turned = sideways
    ? { width: image.height, height: image.width }
    : { width: image.width, height: image.height };
  context.translate(-crop.x, -crop.y);
  context.translate(turned.width / 2, turned.height / 2);
  // Flip before rotating, so "horizontal" means left-right as the image is shown.
  context.scale(transform.flipX ? -1 : 1, transform.flipY ? -1 : 1);
  context.rotate((transform.rotation * Math.PI) / 180);
  context.drawImage(image.source, -image.width / 2, -image.height / 2);
  return encode(canvas, options);
}

/** Draws the rotated or flipped image into a visible canvas, no larger than `maxSide` pixels. */
export function drawPreview(
  canvas: HTMLCanvasElement,
  image: LoadedImage,
  transform: Transform,
  maxSide: number,
) {
  const sideways = Math.abs(transform.rotation / 90) % 2 === 1;
  const turned = sideways
    ? { width: image.height, height: image.width }
    : { width: image.width, height: image.height };
  const scale = Math.min(1, maxSide / Math.max(turned.width, turned.height));
  canvas.width = Math.max(1, Math.round(turned.width * scale));
  canvas.height = Math.max(1, Math.round(turned.height * scale));
  const context = canvas.getContext("2d");
  if (!context) return;
  context.imageSmoothingQuality = "high";
  context.translate(canvas.width / 2, canvas.height / 2);
  context.scale((transform.flipX ? -1 : 1) * scale, (transform.flipY ? -1 : 1) * scale);
  context.rotate((transform.rotation * Math.PI) / 180);
  context.drawImage(image.source, -image.width / 2, -image.height / 2);
}
