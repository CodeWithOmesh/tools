import {
  outputExtension,
  outputMimeType,
  resizedDimensions,
  type CompressorSettings,
} from "./types";

export interface CompressedImage {
  blob: Blob;
  width: number;
  height: number;
  mimeType: string;
  filename: string;
}

function canvasToBlob(canvas: HTMLCanvasElement, mimeType: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("The browser could not create the compressed image."));
          return;
        }
        if (blob.type !== mimeType) {
          reject(
            new Error(
              `This browser cannot export ${mimeType.replace("image/", "").toUpperCase()} images.`,
            ),
          );
          return;
        }
        resolve(blob);
      },
      mimeType,
      quality,
    );
  });
}

export async function compressImage(
  file: File,
  settings: CompressorSettings,
): Promise<CompressedImage> {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    throw new Error("Choose a JPG, PNG or WebP image.");
  }

  let bitmap: ImageBitmap | undefined;
  try {
    bitmap = await createImageBitmap(file);
    const dimensions = resizedDimensions(bitmap.width, bitmap.height, settings.maxDimension);
    const mimeType = outputMimeType(file.type, settings.format);
    const canvas = document.createElement("canvas");
    canvas.width = dimensions.width;
    canvas.height = dimensions.height;

    const context = canvas.getContext("2d", { alpha: mimeType !== "image/jpeg" });
    if (!context) throw new Error("Your browser could not prepare the image canvas.");

    if (mimeType === "image/jpeg") {
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, dimensions.width, dimensions.height);
    }
    context.drawImage(bitmap, 0, 0, dimensions.width, dimensions.height);

    const quality = Math.min(1, Math.max(0.1, settings.quality / 100));
    const blob = await canvasToBlob(canvas, mimeType, quality);
    const extension = outputExtension(mimeType);
    const filename = file.name.replace(/\.[^.]+$/, "") + "-compressed." + extension;

    return {
      blob,
      width: dimensions.width,
      height: dimensions.height,
      mimeType,
      filename,
    };
  } finally {
    bitmap?.close();
  }
}
