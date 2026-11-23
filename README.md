# Code with Omesh – Free Online Tools

A collection of independent, privacy-first online tools built by Code with Omesh.

## Repository structure

Each tool lives in its own top-level directory and owns its application code, dependencies, build configuration, tests, public assets and documentation.

```text
.
├── receipt-generator/
├── invoice-generator/
├── qr-code-generator/
├── image-compressor/
├── scripts/
│   └── run-tools.mjs
├── .github/workflows/
└── netlify.toml
```

Add future tools as sibling folders such as `image-compressor/`, `word-counter/` and `json-formatter/`.

## Available tools

| Tool | URL path | Project folder |
|---|---|---|
| Receipt Generator | `/tools/receipt-generator/` | `receipt-generator/` |
| Invoice Generator | `/tools/invoice-generator/` | `invoice-generator/` |
| QR Code Generator | `/tools/qr-code-generator/` | `qr-code-generator/` |
| Image Compressor | `/tools/image-compressor/` | `image-compressor/` |

## Run one tool locally

```bash
cd qr-code-generator
npm install
npm run dev
```

Change to `receipt-generator`, `invoice-generator` or `image-compressor` to run the other tools.

## Build and verify all tools

From the repository root:

```bash
npm run build
npm run verify
```

The root scripts automatically discover top-level tool folders containing a `package.json` with a build script. Each project is installed, checked and built independently. For the combined website build, tool output is placed under `dist/tools/<tool-name>/`.

Each tool's Vite config should use its production route as the base path and write to `../dist/tools/<tool-name>` with `emptyOutDir: false`. This lets the tools share a single deployable `dist` directory without one build erasing another.

## Deployment

Connect the repository to Netlify using the repository root as the base directory. The root `netlify.toml` runs `npm run build` and publishes `dist`. A route rewrite is configured for every tool so its client-side app can load on direct navigation.

## Privacy

Tools should process sensitive user content in the browser whenever practical. Each tool's README documents its own storage and privacy behavior.
