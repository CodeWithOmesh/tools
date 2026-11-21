# QR Code Generator

A free, static QR code creator built with React, TypeScript, Vite and the `qrcode` library.

## Supported content

- Website URLs and plain text
- Wi-Fi network credentials (WPA/WPA2/WPA3, WEP and open networks)
- Contact cards (vCard 3.0)
- Email messages and phone links
- WhatsApp chat links
- Geographic coordinates
- Calendar events (iCalendar event payload)

## Customization and export

- Foreground and background colours with quick palettes
- Optional central logo overlay
- PNG and SVG downloads
- Image size presets from 256 to 1600 pixels
- Quiet-zone margin and QR error-correction level
- Responsive live preview and mobile editor tabs
- Browser-local draft persistence
- SEO metadata and FAQ content

## Run locally

```bash
npm install
npm run dev
```

## Verify and build

```bash
npm run typecheck
npm test
npm run build
```

The root repository scripts automatically discover this project and include it in combined build and verification.

## Privacy and reliability

QR payloads and images are created in the browser. Draft settings and the optional logo are stored in this browser's local storage; they are not uploaded to a server by this app. Avoid saving sensitive Wi-Fi credentials on a shared device.

These are static QR codes: the encoded content is stored directly in the code and cannot be edited after download. A code containing a URL will continue to point to that URL, so verify the address before printing or sharing. Always test the final code on a phone. Logo overlays can reduce scan reliability; use a small, high-contrast logo and a higher error-correction level, then test the downloaded result.
