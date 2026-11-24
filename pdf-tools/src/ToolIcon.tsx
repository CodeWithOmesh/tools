import {
  FileImage,
  Files,
  Hash,
  ImageDown,
  LayoutGrid,
  RotateCw,
  Scissors,
  Signature,
  Stamp,
} from "lucide-react";
import type { ToolId } from "./tools";

export function ToolIcon({ id, size = 18 }: { id: ToolId; size?: number }) {
  switch (id) {
    case "merge":
      return <Files size={size} />;
    case "split":
      return <Scissors size={size} />;
    case "organize":
      return <LayoutGrid size={size} />;
    case "rotate":
      return <RotateCw size={size} />;
    case "images":
      return <FileImage size={size} />;
    case "to-images":
      return <ImageDown size={size} />;
    case "page-numbers":
      return <Hash size={size} />;
    case "watermark":
      return <Stamp size={size} />;
    case "sign":
      return <Signature size={size} />;
  }
}
