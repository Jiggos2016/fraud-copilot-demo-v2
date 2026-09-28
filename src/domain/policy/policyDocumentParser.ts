import { GlobalWorkerOptions, getDocument } from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

GlobalWorkerOptions.workerSrc = pdfWorker;

export type ParsedPolicySection = {
  heading: string;
  text: string;
  page?: number;
};

export type ParsedPolicyFile = {
  text: string;
  sections: ParsedPolicySection[];
  pageCount?: number;
  parser: 'pdfjs' | 'browser-text' | 'browser-html';
};

const HEADING_RE = /^(section|chapter|article|part|appendix)\s+[a-z0-9ivx.-]+\b|^\d+(?:\.\d+)+\s+\S|^[A-Z][A-Z\s/&-]{6,}$/i;
const PAGE_MARKER_RE = /^--- Page (\d+) ---$/;

const clean = (value: string) => value
  .replace(/\u0000/g, '')
  .replace(/[ \t]+/g, ' ')
  .replace(/\n{3,}/g, '\n\n')
  .trim();

export function detectPolicySections(rawText: string): ParsedPolicySection[] {
  const text = clean(rawText);
  if (!text) return [];

  const lines = text.split('\n').map(line => line.trim()).filter(Boolean);
  const sections: ParsedPolicySection[] = [];
  let page: number | undefined;
  let heading = 'Imported policy text';
  let body: string[] = [];

  const flush = () => {
    const value = clean(body.join(' '));
    if (value) sections.push({ heading, text: value, ...(page ? { page } : {}) });
    body = [];
  };

  for (const line of lines) {
    const pageMatch = line.match(PAGE_MARKER_RE);
    if (pageMatch) {
      page = Number(pageMatch[1]);
      continue;
    }

    const looksLikeHeading = HEADING_RE.test(line) && line.length < 180;
    if (looksLikeHeading) {
      flush();
      heading = line;
    } else {
      body.push(line);
    }
  }
  flush();

  if (sections.length > 1) return sections;

  const paragraphs = text
    .split(/\n\s*\n/)
    .map(value => clean(value))
    .filter(Boolean);

  return paragraphs.map((paragraph, index) => ({
    heading: `Imported section ${index + 1}`,
    text: paragraph,
  }));
}

async function extractPdf(file: File): Promise<ParsedPolicyFile> {
  const data = new Uint8Array(await file.arrayBuffer());
  const pdf = await getDocument({ data }).promise;
  const pages: string[] = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    const lines: string[] = [];
    let current = '';

    for (const item of content.items) {
      if (!('str' in item)) continue;
      const value = String(item.str).trim();
      if (value) current = current ? `${current} ${value}` : value;
      if ('hasEOL' in item && item.hasEOL && current) {
        lines.push(current);
        current = '';
      }
    }
    if (current) lines.push(current);
    pages.push(`--- Page ${pageNumber} ---\n${lines.join('\n')}`);
  }

  const text = clean(pages.join('\n\n'));
  return {
    text,
    sections: detectPolicySections(text),
    pageCount: pdf.numPages,
    parser: 'pdfjs',
  };
}

export async function parsePolicyFile(file: File): Promise<ParsedPolicyFile> {
  const lower = file.name.toLowerCase();
  if (lower.endsWith('.pdf') || file.type === 'application/pdf') return extractPdf(file);

  const raw = await file.text();
  if (lower.endsWith('.html') || lower.endsWith('.htm') || file.type === 'text/html') {
    const text = new DOMParser().parseFromString(raw, 'text/html').body.textContent || '';
    const cleaned = clean(text);
    return { text: cleaned, sections: detectPolicySections(cleaned), parser: 'browser-html' };
  }

  const text = clean(raw);
  return { text, sections: detectPolicySections(text), parser: 'browser-text' };
}
