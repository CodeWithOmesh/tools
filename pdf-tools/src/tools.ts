export type ToolId = "merge" | "split" | "images" | "organize";

export interface ToolInfo {
  id: ToolId;
  /** Route path, relative to /tools/pdf-tools/. */
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

export const SITE_URL = "https://codewithomesh.com/tools/pdf-tools";

export const TOOLS: ToolInfo[] = [
  {
    id: "merge",
    path: "merge-pdf",
    name: "Merge PDF",
    headingLead: "Merge",
    headingHighlight: "PDF files",
    summary: "Combine several PDFs into one file in the order you choose.",
    title: "Merge PDF Files Online for Free – No Upload | Code with Omesh",
    description:
      "Combine multiple PDF files into one document for free. Drag to reorder, then download. Files are merged in your browser and never uploaded.",
    steps: [
      ["Add your PDFs", "Drop two or more PDF files, or browse your device."],
      ["Put them in order", "Drag the files, or use the arrows, to set the order."],
      ["Download", "Merge and save a single combined PDF."],
    ],
  },
  {
    id: "split",
    path: "split-pdf",
    name: "Split PDF",
    headingLead: "Split",
    headingHighlight: "PDF pages",
    summary: "Extract pages, split by ranges or save every page as its own PDF.",
    title: "Split PDF Online for Free – Extract Pages | Code with Omesh",
    description:
      "Split a PDF into separate files or extract the pages you need. Choose pages visually or type ranges like 1-3, 5. Free, private and processed in your browser.",
    steps: [
      ["Add a PDF", "Choose the PDF you want to split."],
      ["Pick pages", "Click page previews or type ranges such as 1-3, 5."],
      ["Download", "Save one PDF, or a ZIP with a file per range or page."],
    ],
  },
  {
    id: "images",
    path: "jpg-to-pdf",
    name: "JPG to PDF",
    headingLead: "Convert images to",
    headingHighlight: "PDF",
    summary: "Turn JPG, PNG or WebP images and scans into a single PDF.",
    title: "JPG to PDF Converter – Images to PDF for Free | Code with Omesh",
    description:
      "Convert JPG, PNG and WebP images into one PDF for free. Reorder images, choose A4 or Letter pages and margins. Images are converted in your browser and never uploaded.",
    steps: [
      ["Add images", "Drop photos or scans in JPG, PNG or WebP format."],
      ["Arrange and set up", "Order the images and choose page size and margins."],
      ["Download", "Create one PDF with an image on each page."],
    ],
  },
  {
    id: "organize",
    path: "organize-pdf",
    name: "Organize PDF",
    headingLead: "Rotate, reorder &",
    headingHighlight: "delete pages",
    summary: "Rotate, rearrange or remove pages with live page previews.",
    title: "Rotate, Reorder & Delete PDF Pages Online | Code with Omesh",
    description:
      "Rotate PDF pages, change their order or delete pages you don't need, with live page previews. Free, private and processed entirely in your browser.",
    steps: [
      ["Add a PDF", "Choose the PDF you want to change."],
      ["Edit the pages", "Rotate, move or delete pages using the previews."],
      ["Download", "Save the updated PDF."],
    ],
  },
];

export const HOME_META = {
  title: "Free PDF Tools – Merge, Split, Convert & Organize | Code with Omesh",
  description:
    "Free online PDF tools: merge PDFs, split pages, convert JPG to PDF and rotate or reorder pages. Everything runs in your browser, so your files are never uploaded.",
};
