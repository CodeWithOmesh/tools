import { Crop, Repeat2, Scaling } from "lucide-react";
import type { ToolId } from "./tools";

export function ToolIcon({ id, size = 18 }: { id: ToolId; size?: number }) {
  switch (id) {
    case "resize":
      return <Scaling size={size} />;
    case "convert":
      return <Repeat2 size={size} />;
    case "crop":
      return <Crop size={size} />;
  }
}
