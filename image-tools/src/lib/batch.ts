import { downloadBlob, downloadZip } from "./files";
import { uniqueNames } from "./formats";
import { loadImage, type LoadedImage } from "./render";

export interface Output {
  id: string;
  name: string;
  blob: Blob;
}

/**
 * Opens and processes images one at a time, so memory use stays low even for large batches.
 * Errors name the file that failed.
 */
export async function processImages<T extends { id: string; file: File }>(
  items: T[],
  work: (item: T, image: LoadedImage) => Promise<{ name: string; blob: Blob }>,
  onProgress: (message: string) => void,
): Promise<Output[]> {
  const outputs: Output[] = [];
  for (const [index, item] of items.entries()) {
    onProgress(
      items.length > 1 ? `Processing image ${index + 1} of ${items.length}…` : "Processing image…",
    );
    const image = await loadImage(item.file);
    try {
      outputs.push({ id: item.id, ...(await work(item, image)) });
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : "it could not be processed";
      throw new Error(items.length > 1 ? `${item.file.name}: ${message}` : message);
    } finally {
      image.close();
    }
  }
  return outputs;
}

/** Downloads one file directly, or several in a ZIP. */
export async function saveOutputs(outputs: Output[], zipName: string) {
  if (outputs.length === 1) return downloadBlob(outputs[0].blob, outputs[0].name);
  const names = uniqueNames(outputs.map((output) => output.name));
  await downloadZip(
    outputs.map((output, index) => ({ name: names[index], data: output.blob })),
    zipName,
  );
}
