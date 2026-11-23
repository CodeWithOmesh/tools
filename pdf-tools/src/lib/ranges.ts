// Page-range helpers. Kept free of pdf-lib so the UI can use them without loading it.
import { PdfToolError } from "./errors";

/** A 1-based, inclusive page range. */
export interface PageRange {
  start: number;
  end: number;
}

/**
 * Parses input such as "1-3, 5, 8-" into page ranges.
 * "8-" means page 8 to the last page and "-3" means the first page to page 3.
 */
export function parsePageRanges(input: string, pageCount: number): PageRange[] {
  const parts = input
    .replace(/[–—]/g, "-")
    .split(/[,;]+/)
    .map((part) => part.replace(/\s+/g, ""))
    .filter(Boolean);
  if (!parts.length) throw new PdfToolError("Enter the pages you want, for example 1-3, 5.");

  return parts.map((part) => {
    const match = /^(\d*)-(\d*)$/.exec(part) ?? /^(\d+)$/.exec(part);
    if (!match) throw new PdfToolError(`"${part}" is not a valid page or range.`);
    const isRange = part.includes("-");
    const start = match[1] ? Number(match[1]) : 1;
    const end = isRange ? (match[2] ? Number(match[2]) : pageCount) : start;
    if (isRange && !match[1] && !match[2]) {
      throw new PdfToolError(`"${part}" is not a valid page or range.`);
    }
    for (const page of [start, end]) {
      if (page < 1 || page > pageCount) {
        throw new PdfToolError(
          `Page ${page} does not exist. This PDF has ${pageCount} ${pageCount === 1 ? "page" : "pages"}.`,
        );
      }
    }
    if (end < start) throw new PdfToolError(`The range ${start}-${end} runs backwards.`);
    return { start, end };
  });
}

/** Turns ranges into 0-based page indexes, keeping their order (duplicates allowed). */
export function rangesToIndices(ranges: PageRange[]): number[] {
  return ranges.flatMap(({ start, end }) =>
    Array.from({ length: end - start + 1 }, (_, offset) => start - 1 + offset),
  );
}

/** Formats sorted, unique 0-based page indexes as compact text, e.g. "1-3, 5". */
export function formatPageSelection(indices: number[]): string {
  const pages = [...new Set(indices)].sort((a, b) => a - b).map((index) => index + 1);
  const parts: string[] = [];
  for (let i = 0; i < pages.length; i += 1) {
    const start = pages[i];
    while (i + 1 < pages.length && pages[i + 1] === pages[i] + 1) i += 1;
    parts.push(start === pages[i] ? String(start) : `${start}-${pages[i]}`);
  }
  return parts.join(", ");
}
