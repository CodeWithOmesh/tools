import * as QRCode from "qrcode";
import type { ErrorCorrection } from "./types";

export interface RenderOptions {
  size: number;
  errorCorrection: ErrorCorrection;
  dark: string;
  light: string;
  margin: number;
}

export async function renderQrPng(
  payload: string,
  options: RenderOptions,
  logoDataUrl = "",
): Promise<string> {
  const dataUrl = await QRCode.toDataURL(payload, {
    errorCorrectionLevel: options.errorCorrection,
    margin: options.margin,
    width: options.size,
    color: { dark: options.dark, light: options.light },
  });
  if (!logoDataUrl) return dataUrl;
  return overlayLogo(dataUrl, logoDataUrl, options.size, options.light);
}

function relativeLuminance(hex: string): number | null {
  const match = /^#?([\da-f]{3}|[\da-f]{6})$/i.exec(hex.trim());
  if (!match) return null;
  const digits =
    match[1].length === 3
      ? match[1]
          .split("")
          .map((digit) => digit + digit)
          .join("")
      : match[1];
  const [r, g, b] = [0, 2, 4].map((offset) => {
    const channel = parseInt(digits.slice(offset, offset + 2), 16) / 255;
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Returns a user-facing warning when the chosen colours are likely to scan poorly. */
export function contrastWarning(dark: string, light: string): string {
  const darkLuminance = relativeLuminance(dark);
  const lightLuminance = relativeLuminance(light);
  if (darkLuminance === null || lightLuminance === null) return "";
  if (darkLuminance >= lightLuminance) {
    return "The QR colour is lighter than the background. Many phone scanners cannot read inverted codes, so use a dark QR colour on a light background.";
  }
  const ratio = (lightLuminance + 0.05) / (darkLuminance + 0.05);
  if (ratio < 4) {
    return "The QR and background colours are quite similar. Increase the contrast so the code scans reliably.";
  }
  return "";
}

function loadImage(source: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Unable to load the selected logo image."));
    image.src = source;
  });
}

function roundedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  const r = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + r, y);
  context.lineTo(x + width - r, y);
  context.quadraticCurveTo(x + width, y, x + width, y + r);
  context.lineTo(x + width, y + height - r);
  context.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  context.lineTo(x + r, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - r);
  context.lineTo(x, y + r);
  context.quadraticCurveTo(x, y, x + r, y);
  context.closePath();
}

async function overlayLogo(
  qrDataUrl: string,
  logoDataUrl: string,
  size: number,
  background: string,
): Promise<string> {
  const [qrImage, logoImage] = await Promise.all([loadImage(qrDataUrl), loadImage(logoDataUrl)]);
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Your browser could not create the QR image.");
  context.drawImage(qrImage, 0, 0, size, size);

  const box = Math.round(size * 0.22);
  const padding = Math.round(box * 0.13);
  const inner = box - padding * 2;
  const x = (size - box) / 2;
  const y = (size - box) / 2;
  context.fillStyle = background;
  roundedRect(context, x, y, box, box, Math.round(box * 0.14));
  context.fill();

  const scale = Math.min(inner / logoImage.width, inner / logoImage.height);
  const width = logoImage.width * scale;
  const height = logoImage.height * scale;
  context.drawImage(logoImage, (size - width) / 2, (size - height) / 2, width, height);
  return canvas.toDataURL("image/png");
}

export async function renderQrSvg(
  payload: string,
  options: RenderOptions,
  logoDataUrl = "",
): Promise<string> {
  let svg = await QRCode.toString(payload, {
    type: "svg",
    errorCorrectionLevel: options.errorCorrection,
    margin: options.margin,
    width: options.size,
    color: { dark: options.dark, light: options.light },
  });
  if (!logoDataUrl) return svg;
  const match = svg.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/);
  if (!match) return svg;
  const width = Number(match[1]);
  const height = Number(match[2]);
  const box = Math.min(width, height) * 0.22;
  const padding = box * 0.13;
  const inner = box - padding * 2;
  const x = (width - box) / 2;
  const y = (height - box) / 2;
  const overlay = `<rect x="${x}" y="${y}" width="${box}" height="${box}" rx="${box * 0.14}" fill="${options.light}"/><image href="${logoDataUrl}" x="${(width - inner) / 2}" y="${(height - inner) / 2}" width="${inner}" height="${inner}" preserveAspectRatio="xMidYMid meet"/>`;
  return svg.replace("</svg>", `${overlay}</svg>`);
}
