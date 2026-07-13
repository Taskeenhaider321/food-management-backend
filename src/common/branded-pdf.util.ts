import axios from 'axios';
import sharp from 'sharp';
import {
  PDFDocument,
  PDFFont,
  PDFImage,
  PDFPage,
  StandardFonts,
  rgb,
} from 'pdf-lib';

const BRAND_FOOTER = 'Powered By Feat Technology';
const INK = rgb(0.1, 0.1, 0.1);
const MUTED = rgb(0.35, 0.35, 0.35);
const RULE = rgb(0.55, 0.55, 0.55);
const ACCENT = rgb(0.18, 0.27, 0.42);

export type BrandedPdfCompany = {
  companyName: string;
  address?: string;
  companyLogo?: string;
};

export type PdfColumn = {
  key: string;
  label: string;
  width: number;
};

function formatDate(date: Date | string | null | undefined): string {
  if (!date) return '---';
  return new Date(date).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function asText(value: unknown): string {
  if (Array.isArray(value)) return value.filter(Boolean).join(', ');
  if (value == null || value === '') return '---';
  return String(value);
}

function truncate(text: string, font: PDFFont, size: number, maxWidth: number) {
  const value = asText(text);
  if (font.widthOfTextAtSize(value, size) <= maxWidth) return value;
  let truncated = value;
  while (
    truncated.length > 0 &&
    font.widthOfTextAtSize(`${truncated}...`, size) > maxWidth
  ) {
    truncated = truncated.slice(0, -1);
  }
  return `${truncated}...`;
}

function wrapText(
  text: unknown,
  font: PDFFont,
  size: number,
  maxWidth: number,
): string[] {
  const words = asText(text).split(/\s+/).filter(Boolean);
  if (words.length === 0) return ['---'];
  const lines: string[] = [];
  let current = words[0];
  for (let i = 1; i < words.length; i += 1) {
    const next = `${current} ${words[i]}`;
    if (font.widthOfTextAtSize(next, size) <= maxWidth) current = next;
    else {
      lines.push(current);
      current = words[i];
    }
  }
  lines.push(current);
  return lines;
}

function toCloudinaryCandidates(url: string): string[] {
  const urls = [url];
  if (/res\.cloudinary\.com/i.test(url) && /\/upload\//i.test(url)) {
    // Prefer raster formats pdf-lib can embed reliably.
    urls.unshift(url.replace(/\/upload\//i, '/upload/f_png,q_auto,fl_sanitize/'));
    urls.unshift(url.replace(/\/upload\//i, '/upload/f_jpg,q_auto/'));
    urls.unshift(url.replace(/\/upload\//i, '/upload/f_png/'));
  }
  return [...new Set(urls)];
}

function looksLikeImage(buffer: Buffer): boolean {
  if (!buffer?.length || buffer.length < 4) return false;
  // PNG
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return true;
  }
  // JPEG
  if (buffer[0] === 0xff && buffer[1] === 0xd8) return true;
  // GIF
  if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46) {
    return true;
  }
  // WEBP (RIFF....WEBP)
  if (
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer.length > 11 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return true;
  }
  // SVG / XML
  const head = buffer.subarray(0, 64).toString('utf8').toLowerCase();
  if (head.includes('<svg') || head.includes('<?xml')) return true;
  return false;
}

async function bufferFromLogoUrl(logoUrl: string): Promise<Buffer | null> {
  const trimmed = logoUrl.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith('data:image/')) {
    const match = trimmed.match(/^data:image\/[a-zA-Z0-9+.-]+;base64,(.+)$/);
    if (!match?.[1]) return null;
    return Buffer.from(match[1], 'base64');
  }

  for (const candidate of toCloudinaryCandidates(trimmed)) {
    try {
      const response = await axios.get(candidate, {
        responseType: 'arraybuffer',
        timeout: 20000,
        maxRedirects: 5,
        headers: {
          Accept: 'image/png,image/jpeg,image/webp,image/*,*/*',
          'User-Agent': 'FeatFoodSafetyPdf/1.0',
        },
        validateStatus: (status) => status >= 200 && status < 400,
      });
      const raw = Buffer.from(response.data);
      if (!raw.length) continue;
      if (!looksLikeImage(raw)) continue;
      return raw;
    } catch (error) {
      console.warn(
        `[branded-pdf] logo fetch failed for ${candidate}:`,
        error instanceof Error ? error.message : error,
      );
    }
  }
  return null;
}

async function embedLogo(
  pdfDoc: PDFDocument,
  logoUrl?: string,
): Promise<PDFImage | null> {
  if (!logoUrl?.trim()) return null;

  const raw = await bufferFromLogoUrl(logoUrl);
  if (!raw) return null;

  // Preferred path: normalize any raster/SVG via sharp → PNG
  try {
    const pngBytes = await sharp(raw)
      .rotate()
      .resize({
        width: 800,
        height: 800,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .ensureAlpha()
      .png()
      .toBuffer();
    return await pdfDoc.embedPng(pngBytes);
  } catch (error) {
    console.warn(
      '[branded-pdf] sharp logo normalize failed, trying direct embed:',
      error instanceof Error ? error.message : error,
    );
  }

  // Fallbacks without sharp
  try {
    return await pdfDoc.embedPng(raw);
  } catch {
    // continue
  }
  try {
    return await pdfDoc.embedJpg(raw);
  } catch (error) {
    console.warn(
      '[branded-pdf] direct logo embed failed:',
      error instanceof Error ? error.message : error,
    );
  }

  return null;
}

/** Circular portrait PNG suitable for profile covers. */
async function embedCircularPortrait(
  pdfDoc: PDFDocument,
  imageUrl?: string,
  size = 320,
): Promise<PDFImage | null> {
  if (!imageUrl?.trim()) return null;
  const raw = await bufferFromLogoUrl(imageUrl);
  if (!raw) return null;

  try {
    const mask = Buffer.from(
      `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
        <circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="#fff"/>
      </svg>`,
    );

    const pngBytes = await sharp(raw)
      .rotate()
      .resize(size, size, { fit: 'cover', position: 'centre' })
      .composite([{ input: mask, blend: 'dest-in' }])
      .png()
      .toBuffer();

    return await pdfDoc.embedPng(pngBytes);
  } catch (error) {
    console.warn(
      '[branded-pdf] circular portrait failed, falling back to square:',
      error instanceof Error ? error.message : error,
    );
    try {
      const pngBytes = await sharp(raw)
        .rotate()
        .resize(size, size, { fit: 'cover', position: 'centre' })
        .png()
        .toBuffer();
      return await pdfDoc.embedPng(pngBytes);
    } catch {
      return null;
    }
  }
}

async function drawCoverPage(
  page: PDFPage,
  pdfDoc: PDFDocument,
  company: BrandedPdfCompany,
  options: {
    title: string;
    subtitle?: string;
    rows: Array<[string, string]>;
  },
  logo: PDFImage | null,
  portrait: PDFImage | null = null,
) {
  const { width, height } = page.getSize();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const centerX = width / 2;
  const companyName = company.companyName || 'Company';
  const addressLines = company.address
    ? wrapText(company.address, font, 9, 280).slice(0, 2)
    : [];

  page.drawRectangle({
    x: 0,
    y: height - 8,
    width,
    height: 8,
    color: ACCENT,
  });

  // Centered brand stack: logo above company name (not side-by-side)
  let y = height - 46;

  if (logo) {
    const maxW = 110;
    const maxH = 70;
    const scale = Math.min(maxW / logo.width, maxH / logo.height, 1);
    const logoW = logo.width * scale;
    const logoH = logo.height * scale;
    const tilePad = 6;

    page.drawRectangle({
      x: centerX - logoW / 2 - tilePad,
      y: y - logoH - tilePad,
      width: logoW + tilePad * 2,
      height: logoH + tilePad * 2,
      color: rgb(1, 1, 1),
      borderWidth: 0.8,
      borderColor: rgb(0.82, 0.85, 0.9),
    });
    page.drawImage(logo, {
      x: centerX - logoW / 2,
      y: y - logoH,
      width: logoW,
      height: logoH,
    });
    y -= logoH + tilePad + 16;
  }

  const nameSize = 18;
  const displayName = truncate(companyName, bold, nameSize, width - 120);
  page.drawText(displayName, {
    x: centerX - bold.widthOfTextAtSize(displayName, nameSize) / 2,
    y,
    size: nameSize,
    font: bold,
    color: INK,
  });
  y -= 16;

  for (const line of addressLines) {
    page.drawText(line, {
      x: centerX - font.widthOfTextAtSize(line, 10) / 2,
      y,
      size: 10,
      font,
      color: MUTED,
    });
    y -= 13;
  }

  y -= 12;
  page.drawLine({
    start: { x: 72, y },
    end: { x: width - 72, y },
    thickness: 1.1,
    color: ACCENT,
  });
  y -= 24;

  if (portrait) {
    const portraitSize = 100;
    const ringPad = 5;
    const ringSize = portraitSize + ringPad * 2;
    const ringX = centerX;
    const ringY = y - ringSize / 2;

    page.drawCircle({
      x: ringX,
      y: ringY,
      size: ringSize / 2,
      borderWidth: 2.5,
      borderColor: ACCENT,
      color: rgb(1, 1, 1),
    });
    page.drawCircle({
      x: ringX,
      y: ringY,
      size: portraitSize / 2 + 1.5,
      borderWidth: 1,
      borderColor: rgb(0.82, 0.85, 0.9),
      color: rgb(1, 1, 1),
    });

    page.drawImage(portrait, {
      x: centerX - portraitSize / 2,
      y: y - ringPad - portraitSize,
      width: portraitSize,
      height: portraitSize,
    });
    y -= ringSize + 14;
  }

  page.drawText(options.title, {
    x: centerX - bold.widthOfTextAtSize(options.title, 17) / 2,
    y,
    size: 17,
    font: bold,
    color: INK,
  });
  y -= 16;

  if (options.subtitle) {
    page.drawText(options.subtitle, {
      x: centerX - font.widthOfTextAtSize(options.subtitle, 11) / 2,
      y,
      size: 11,
      font,
      color: MUTED,
    });
    y -= 24;
  } else {
    y -= 12;
  }

  const detailsBottom = 58;
  page.drawRectangle({
    x: 56,
    y: detailsBottom,
    width: width - 112,
    height: Math.max(80, y + 8 - detailsBottom),
    color: rgb(0.985, 0.987, 0.99),
    borderWidth: 0.7,
    borderColor: rgb(0.88, 0.9, 0.93),
  });

  y -= 6;
  for (const [label, value] of options.rows) {
    if (y < detailsBottom + 16) break;
    page.drawText(String(label), {
      x: 76,
      y,
      size: 10,
      font,
      color: MUTED,
    });
    page.drawText(truncate(asText(value), bold, 11, width - 300), {
      x: 250,
      y,
      size: 11,
      font: bold,
      color: INK,
    });
    y -= 18;
  }
}

function drawContentHeader(
  page: PDFPage,
  company: BrandedPdfCompany,
  title: string,
  font: PDFFont,
  bold: PDFFont,
  logo: PDFImage | null,
) {
  const { width, height } = page.getSize();
  const top = height - 10;
  const companyName = company.companyName || 'Company';

  page.drawRectangle({
    x: 18,
    y: height - 44,
    width: width - 36,
    height: 36,
    color: rgb(0.965, 0.97, 0.98),
    borderWidth: 0.6,
    borderColor: rgb(0.86, 0.88, 0.92),
  });

  let textX = 28;
  if (logo) {
    const maxW = 28;
    const maxH = 22;
    const scale = Math.min(maxW / logo.width, maxH / logo.height, 1);
    const logoW = logo.width * scale;
    const logoH = logo.height * scale;
    page.drawImage(logo, {
      x: 26,
      y: height - 18 - logoH,
      width: logoW,
      height: logoH,
    });
    textX = 26 + logoW + 10;
  }

  page.drawText(truncate(companyName, bold, 10, 260), {
    x: textX,
    y: top - 8,
    size: 10,
    font: bold,
    color: INK,
  });
  page.drawText(truncate(title, font, 8.5, 260), {
    x: textX,
    y: top - 22,
    size: 8.5,
    font,
    color: MUTED,
  });

  page.drawLine({
    start: { x: 18, y: height - 48 },
    end: { x: width - 18, y: height - 48 },
    thickness: 1,
    color: ACCENT,
  });
}

function drawContentFooter(
  page: PDFPage,
  pageNo: number,
  totalPages: number,
  font: PDFFont,
) {
  const { width } = page.getSize();
  page.drawLine({
    start: { x: 18, y: 36 },
    end: { x: width - 18, y: 36 },
    thickness: 0.8,
    color: RULE,
  });
  page.drawText(BRAND_FOOTER, {
    x: 20,
    y: 18,
    size: 8,
    font,
    color: MUTED,
  });
  const pageLabel = `Page ${pageNo} of ${totalPages}`;
  page.drawText(pageLabel, {
    x: width - font.widthOfTextAtSize(pageLabel, 9) - 20,
    y: 18,
    size: 9,
    font,
    color: INK,
  });
}

function applyChrome(
  pages: PDFPage[],
  company: BrandedPdfCompany,
  title: string,
  font: PDFFont,
  bold: PDFFont,
  logo: PDFImage | null,
) {
  const total = pages.length;
  pages.forEach((page, index) => {
    if (index > 0) drawContentHeader(page, company, title, font, bold, logo);
    drawContentFooter(page, index + 1, total, font);
  });
}

export function safePdfFileName(name: string, suffix = 'export'): string {
  return `${(name || suffix)
    .replace(/[^\w-]+/g, '_')
    .replace(/_+/g, '_')
    .slice(0, 70)}_${suffix}.pdf`;
}

export async function buildBrandedListPdf(options: {
  company: BrandedPdfCompany;
  title: string;
  subtitle?: string;
  exportedBy?: string;
  columns: PdfColumn[];
  rows: Record<string, unknown>[];
  coverExtraRows?: Array<[string, string]>;
}): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const logo = await embedLogo(pdfDoc, options.company.companyLogo);

  const cover = pdfDoc.addPage();
  await drawCoverPage(
    cover,
    pdfDoc,
    options.company,
    {
      title: options.title,
      subtitle: options.subtitle || `${options.rows.length} record(s)`,
      rows: [
        ['Report Type', options.title],
        ['Total Records', String(options.rows.length)],
        ['Generated By', options.exportedBy || '---'],
        ['Generated Date', formatDate(new Date())],
        ...(options.coverExtraRows || []),
      ],
    },
    logo,
  );

  const usableWidth = 512;
  const totalWeight = options.columns.reduce((sum, col) => sum + col.width, 0);
  const colLayout = options.columns.map((col) => ({
    ...col,
    px: (col.width / totalWeight) * usableWidth,
  }));

  let page = pdfDoc.addPage();
  let y = page.getSize().height - 70;

  const drawHeader = () => {
    let x = 40;
    page.drawRectangle({
      x: 36,
      y: y - 6,
      width: usableWidth + 8,
      height: 20,
      color: rgb(0.93, 0.94, 0.96),
    });
    for (const col of colLayout) {
      page.drawText(col.label, {
        x: x + 2,
        y,
        size: 8,
        font: bold,
        color: MUTED,
      });
      x += col.px;
    }
    y -= 24;
  };

  drawHeader();

  for (const row of options.rows) {
    if (y < 70) {
      page = pdfDoc.addPage();
      y = page.getSize().height - 70;
      drawHeader();
    }
    let x = 40;
    let rowHeight = 14;
    const cellLines = colLayout.map((col) => {
      const lines = wrapText(row[col.key], font, 8, col.px - 4).slice(0, 2);
      rowHeight = Math.max(rowHeight, lines.length * 11);
      return lines;
    });
    colLayout.forEach((col, index) => {
      let textY = y;
      for (const line of cellLines[index]) {
        page.drawText(line, {
          x: x + 2,
          y: textY,
          size: 8,
          font,
          color: INK,
        });
        textY -= 11;
      }
      x += col.px;
    });
    y -= rowHeight + 8;
  }

  if (options.rows.length === 0) {
    page.drawText('No records found.', {
      x: 48,
      y,
      size: 11,
      font,
      color: MUTED,
    });
  }

  applyChrome(
    pdfDoc.getPages(),
    options.company,
    options.title,
    font,
    bold,
    logo,
  );
  return pdfDoc.save();
}

export async function buildBrandedDetailPdf(options: {
  company: BrandedPdfCompany;
  title: string;
  subtitle?: string;
  exportedBy?: string;
  /** Optional profile/person photo shown as a circular portrait on the cover. */
  portraitUrl?: string;
  coverRows: Array<[string, string]>;
  sections?: Array<{ heading: string; rows: Array<[string, string]> }>;
}): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const logo = await embedLogo(pdfDoc, options.company.companyLogo);
  const portrait = await embedCircularPortrait(pdfDoc, options.portraitUrl);

  const cover = pdfDoc.addPage();
  await drawCoverPage(
    cover,
    pdfDoc,
    options.company,
    {
      title: options.title,
      subtitle: options.subtitle,
      rows: [
        ...options.coverRows,
        ['Generated By', options.exportedBy || '---'],
        ['Generated Date', formatDate(new Date())],
      ],
    },
    logo,
    portrait,
  );

  // Only add extra pages when callers provide additional sections.
  // Avoid duplicating coverRows on a second "Details" page.
  const sections = (options.sections || []).filter(
    (section) => section.rows?.length,
  );

  if (sections.length > 0) {
    let page = pdfDoc.addPage();
    let y = page.getSize().height - 70;

    for (const section of sections) {
      if (y < 100) {
        page = pdfDoc.addPage();
        y = page.getSize().height - 70;
      }
      page.drawText(section.heading, {
        x: 48,
        y,
        size: 12,
        font: bold,
        color: INK,
      });
      y -= 20;

      for (const [label, value] of section.rows) {
        if (y < 70) {
          page = pdfDoc.addPage();
          y = page.getSize().height - 70;
        }
        page.drawText(`${label} :`, {
          x: 48,
          y,
          size: 10,
          font,
          color: MUTED,
        });
        const lines = wrapText(value, font, 10, 340);
        let valueY = y;
        for (const line of lines.slice(0, 5)) {
          page.drawText(line, {
            x: 180,
            y: valueY,
            size: 10,
            font,
            color: INK,
          });
          valueY -= 13;
        }
        y = valueY - 8;
      }
      y -= 10;
    }
  }

  applyChrome(
    pdfDoc.getPages(),
    options.company,
    options.title,
    font,
    bold,
    logo,
  );
  return pdfDoc.save();
}

export async function resolveActorCompany(
  companyModel: { findById: (id: string) => { exec: () => Promise<any> } },
  actor: any,
  fallback: BrandedPdfCompany = { companyName: 'Feat Technology' },
): Promise<BrandedPdfCompany> {
  const pickLogo = (source: any): string => {
    if (!source || typeof source !== 'object') return '';
    const raw =
      source.companyLogo ||
      source.CompanyLogo ||
      source.logo ||
      source.Logo ||
      '';
    return typeof raw === 'string' ? raw.trim() : '';
  };

  const pickName = (source: any): string =>
    source?.companyName ||
    source?.CompanyName ||
    source?.name ||
    '';

  const pickAddress = (source: any): string =>
    source?.address || source?.Address || '';

  const populated =
    actor?.companyId && typeof actor.companyId === 'object'
      ? actor.companyId
      : null;

  const id =
    populated?._id?.toString() ||
    actor?.companyId?._id?.toString() ||
    (typeof actor?.companyId === 'string' ? actor.companyId : undefined);

  let companyDoc: any = null;
  if (id) {
    try {
      companyDoc = await companyModel.findById(id).exec();
    } catch {
      companyDoc = null;
    }
  }

  const source = companyDoc || populated;
  if (!source) return fallback;

  const logo = pickLogo(source) || pickLogo(populated);

  return {
    companyName: pickName(source) || fallback.companyName,
    address: pickAddress(source) || '',
    companyLogo: logo,
  };
}

export { formatDate, asText };
