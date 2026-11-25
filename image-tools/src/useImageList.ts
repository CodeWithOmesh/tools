import { useEffect, useRef, useState } from "react";
import { errorMessage, makeId, MAX_IMAGE_BYTES } from "./lib/files";
import { imageType, rejectReason } from "./lib/formats";
import { loadImage } from "./lib/render";

export interface ImageItem {
  id: string;
  file: File;
  type: string;
  /** For showing the image on screen. */
  previewUrl: string;
  width: number;
  height: number;
}

/** A list of added images with their pixel sizes. Invalid files are skipped with a message. */
export function useImageList({ multiple }: { multiple: boolean }) {
  const [items, setItems] = useState<ImageItem[]>([]);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");
  const itemsRef = useRef(items);
  itemsRef.current = items;

  // Release preview images when the tool is closed.
  useEffect(
    () => () => itemsRef.current.forEach((item) => URL.revokeObjectURL(item.previewUrl)),
    [],
  );

  const add = async (files: File[]) => {
    setError("");
    const chosen = multiple ? files : files.slice(0, 1);
    const problems: string[] = [];
    if (!multiple && files.length > 1)
      problems.push("only one image can be used, so the first was added");
    const added: ImageItem[] = [];
    setAdding(true);
    for (const file of chosen) {
      const reason = rejectReason(file, MAX_IMAGE_BYTES);
      if (reason) {
        problems.push(reason);
        continue;
      }
      try {
        const image = await loadImage(file);
        added.push({
          id: makeId("img"),
          file,
          type: imageType(file),
          previewUrl: URL.createObjectURL(file),
          width: image.width,
          height: image.height,
        });
        image.close();
      } catch (reason) {
        problems.push(errorMessage(reason, `${file.name} could not be opened`));
      }
    }
    setAdding(false);
    if (problems.length) {
      const text = problems.map((problem) => problem.replace(/\.$/, "")).join("; ");
      setError(`${text.charAt(0).toUpperCase()}${text.slice(1)}.`);
    }
    if (!added.length) return;
    setItems((current) => {
      if (multiple) return [...current, ...added];
      current.forEach((item) => URL.revokeObjectURL(item.previewUrl));
      return added;
    });
  };

  const remove = (id: string) =>
    setItems((current) => {
      const target = current.find((item) => item.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return current.filter((item) => item.id !== id);
    });

  const clear = () => {
    itemsRef.current.forEach((item) => URL.revokeObjectURL(item.previewUrl));
    setItems([]);
    setError("");
  };

  return { items, adding, error, add, remove, clear };
}
