import { FileImage, Files, LayoutGrid, Scissors } from "lucide-react";
import type { ToolId } from "./tools";

export function ToolIcon({ id, size = 18 }: { id: ToolId; size?: number }) {
  switch (id) {
    case "merge":
      return <Files size={size} />;
    case "split":
      return <Scissors size={size} />;
    case "images":
      return <FileImage size={size} />;
    case "organize":
      return <LayoutGrid size={size} />;
  }
}
