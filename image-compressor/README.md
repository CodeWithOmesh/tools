# Image Compressor

A privacy-first image compressor for JPG, PNG and WebP images. This app processes images locally in the browser using the Canvas API.

## Features

- Compress multiple JPG, PNG and WebP files at once
- Choose to keep the original format or convert to JPG, PNG or WebP
- Adjust JPEG/WebP quality
- Resize the longest edge while preserving aspect ratio
- Preview processed images and compare original/output file sizes
- Download one image or all completed images in a ZIP archive
- Drag-and-drop upload
- No image uploads and no account required

## Run locally

\`\`\`bash
npm install
npm run dev
\`\`\`

## Verify and build

\`\`\`bash
npm test
npm run typecheck
npm run build
\`\`\`

## Limits and behavior

- JPG, PNG and WebP only; maximum input size is 25 MB per image.
- Quality affects lossy JPEG and WebP output. PNG is lossless and the browser ignores the quality parameter for PNG.
- When converting an image with transparency to JPEG, transparent areas are flattened onto white.
- An output can occasionally be larger than the original if the source was already optimized.
- Compression occurs on the user's device. Images are not uploaded to an application server.
- Very large images may use significant device memory because decoding and canvas rendering happen locally.

The app does not preserve all source metadata such as EXIF data. Re-encoding removes most metadata.
