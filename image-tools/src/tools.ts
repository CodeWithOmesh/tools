export type ToolId = "resize" | "convert" | "crop";

export interface ToolInfo {
  id: ToolId;
  /** Route path, relative to /tools/image-tools/. */
  path: string;
  name: string;
  /** Heading shown as "<lead> <highlight>". */
  headingLead: string;
  headingHighlight: string;
  summary: string;
  /** Browser tab title. */
  title: string;
  /** Meta description for search engines. */
  description: string;
  steps: [string, string][];
}

export const SITE_URL = "https://codewithomesh.com/tools/image-tools";

export const TOOLS: ToolInfo[] = [
  {
    id: "resize",
    path: "resize-image",
    name: "Resize Image",
    headingLead: "Resize",
    headingHighlight: "images",
    summary: "Change the size of one image or many, in pixels, by percentage or for social media.",
    title: "Resize Image Online for Free – Pixels, % or Social Sizes | Code with Omesh",
    description:
      "Resize JPG, PNG and WebP images for free. Set exact pixels, a percentage, or Instagram, Facebook and YouTube sizes. Batch resize in your browser, no upload.",
    steps: [
      ["Add images", "Drop one image or many. JPG, PNG, WebP and more."],
      ["Choose the size", "Type pixels, pick a percentage or choose a social media size."],
      ["Download", "Save one image, or a ZIP with all of them."],
    ],
  },
  {
    id: "convert",
    path: "convert-image",
    name: "Convert Image",
    headingLead: "Convert images to",
    headingHighlight: "JPG, PNG or WebP",
    summary: "Change image formats in bulk: PNG to JPG, JPG to WebP, WebP to PNG and more.",
    title: "Image Converter – PNG to JPG, JPG to WebP & More Free | Code with Omesh",
    description:
      "Convert images between JPG, PNG and WebP for free. Works with GIF, BMP, AVIF and SVG too. Batch convert in your browser, so your photos are never uploaded.",
    steps: [
      ["Add images", "Drop the images you want to convert."],
      ["Pick a format", "Choose JPG, PNG or WebP and the quality."],
      ["Download", "Save one image, or a ZIP with all of them."],
    ],
  },
  {
    id: "crop",
    path: "crop-image",
    name: "Crop Image",
    headingLead: "Crop &",
    headingHighlight: "rotate images",
    summary: "Cut an image to any shape, such as square or 16:9, and rotate or flip it.",
    title: "Crop Image Online for Free – Square, 16:9 & Custom | Code with Omesh",
    description:
      "Crop images for free with square, 4:5, 16:9 and custom shapes, or exact pixel sizes. Rotate and flip too. Everything happens in your browser, nothing is uploaded.",
    steps: [
      ["Add an image", "Choose the photo or picture to crop."],
      ["Frame it", "Pick a shape, then drag the box or its corners. Rotate if needed."],
      ["Download", "Save the cropped image."],
    ],
  },
];

export const HOME_META = {
  title: "Free Image Tools – Resize, Convert & Crop Images | Code with Omesh",
  description:
    "Free online image tools: resize images, convert PNG, JPG and WebP, and crop or rotate photos. Everything runs in your browser, so your images are never uploaded.",
};
