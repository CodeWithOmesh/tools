export type ToolId =
  | "merge"
  | "split"
  | "organize"
  | "rotate"
  | "images"
  | "to-images"
  | "page-numbers"
  | "watermark"
  | "sign";

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
  {
    id: "rotate",
    path: "rotate-pdf",
    name: "Rotate PDF",
    headingLead: "Rotate",
    headingHighlight: "PDF pages",
    summary: "Turn every page, or just the sideways ones, and save the fixed PDF.",
    title: "Rotate PDF Online for Free – Fix Sideways Pages | Code with Omesh",
    description:
      "Rotate all pages of a PDF or only the pages you choose, with live previews. Free, private and processed in your browser, so your file is never uploaded.",
    steps: [
      ["Add a PDF", "Choose the PDF with sideways or upside-down pages."],
      ["Rotate", "Rotate all pages at once, or click a page to turn just that one."],
      ["Download", "Save the PDF with every page the right way up."],
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
    id: "to-images",
    path: "pdf-to-jpg",
    name: "PDF to JPG",
    headingLead: "Convert PDF to",
    headingHighlight: "JPG images",
    summary: "Save PDF pages as sharp JPG or PNG images, one image per page.",
    title: "PDF to JPG Converter – Save Pages as Images Free | Code with Omesh",
    description:
      "Convert PDF pages to high-quality JPG or PNG images for free. Choose the pages and resolution, then download. Converted in your browser, never uploaded.",
    steps: [
      ["Add a PDF", "Choose the PDF you want to turn into images."],
      ["Choose options", "Pick the pages, JPG or PNG, and the image quality."],
      ["Download", "Get one image, or a ZIP with an image for each page."],
    ],
  },
  {
    id: "page-numbers",
    path: "add-page-numbers",
    name: "Page Numbers",
    headingLead: "Add page numbers to",
    headingHighlight: "PDF",
    summary: "Number your PDF pages in the position and style you choose.",
    title: "Add Page Numbers to PDF Online for Free | Code with Omesh",
    description:
      'Add page numbers to a PDF for free. Choose the position, style such as "Page 1 of 10", starting number and pages. Processed in your browser, never uploaded.',
    steps: [
      ["Add a PDF", "Choose the PDF you want to number."],
      ["Pick a style", "Choose where the numbers go and how they look."],
      ["Download", "Save the numbered PDF."],
    ],
  },
  {
    id: "watermark",
    path: "add-watermark",
    name: "Watermark",
    headingLead: "Add a watermark to",
    headingHighlight: "PDF",
    summary: "Stamp text such as CONFIDENTIAL or DRAFT across your PDF pages.",
    title: "Add Watermark to PDF Online for Free | Code with Omesh",
    description:
      "Add a text watermark such as CONFIDENTIAL, DRAFT or your company name to a PDF. Choose the style, colour and opacity. Free and processed in your browser.",
    steps: [
      ["Add a PDF", "Choose the PDF you want to protect."],
      ["Design the watermark", "Type the text and pick the layout, size, colour and opacity."],
      ["Download", "Save the watermarked PDF."],
    ],
  },
  {
    id: "sign",
    path: "sign-pdf",
    name: "Sign PDF",
    headingLead: "Sign a",
    headingHighlight: "PDF",
    summary: "Draw, type or upload your signature and place it on any page.",
    title: "Sign PDF Online for Free – Add Your Signature | Code with Omesh",
    description:
      "Sign a PDF for free: draw, type or upload your signature, then drag it into place on any page. Your document and signature never leave your device.",
    steps: [
      ["Add a PDF", "Choose the document you need to sign."],
      ["Create your signature", "Draw it, type your name or upload an image."],
      ["Place and download", "Drag the signature into place on each page, then save."],
    ],
  },
];

export const HOME_META = {
  title: "Free PDF Tools – Merge, Split, Convert, Sign & More | Code with Omesh",
  description:
    "Free online PDF tools: merge, split, rotate, convert PDF to JPG and JPG to PDF, add page numbers or a watermark, and sign PDFs. Everything runs in your browser.",
};
