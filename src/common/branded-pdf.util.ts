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
    urls.unshift(url.replace(/\/upload\//i, '/upload/f_png,q_auto/'));
    urls.unshift(url.replace(/\/upload\//i, '/upload/f_jpg,q_auto/'));
  }
  return [...new Set(urls)];
}

async function embedLogo(
  pdfDoc: PDFDocument,
  logoUrl?: string,
): Promise<PDFImage | null> {
  if (!logoUrl?.trim()) return null;
  for (const candidate of toCloudinaryCandidates(logoUrl.trim())) {
    try {
      const response = await axios.get(candidate, {
        responseType: 'arraybuffer',
        timeout: 20000,
        headers: { Accept: 'image/png,image/jpeg,image/*,*/*' },
      });
      const raw = Buffer.from(response.data);
      if (!raw.length) continue;
      const pngBytes = await sharp(raw)
        .rotate()
        .resize({
          width: 800,
          height: 800,
          fit: 'inside',
          withoutEnlargement: true,
        })
        .png()
        .toBuffer();
      return await pdfDoc.embedPng(pngBytes);
    } catch {
      // try next
    }
  }
  return null;
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
) {
  const { width, height } = page.getSize();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const centerX = width / 2;

  page.drawRectangle({
    x: 0,
    y: height - 8,
    width,
    height: 8,
    color: ACCENT,
  });

  let y = height - 90;
  if (logo) {
    const maxW = 180;
    const maxH = 140;
    const scale = Math.min(maxW / logo.width, maxH / logo.height);
    const logoW = logo.width * scale;
    const logoH = logo.height * scale;
    page.drawImage(logo, {
      x: centerX - logoW / 2,
      y: y - logoH,
      width: logoW,
      height: logoH,
    });
    y -= logoH + 24;
  }

  const companyName = company.companyName || 'Company';
  page.drawText(companyName, {
    x: centerX - bold.widthOfTextAtSize(companyName, 22) / 2,
    y,
    size: 22,
    font: bold,
    color: INK,
  });
  y -= 20;

  if (company.address) {
    for (const line of wrapText(company.address, font, 11, width - 120).slice(
      0,
      3,
    )) {
      page.drawText(line, {
        x: centerX - font.widthOfTextAtSize(line, 11) / 2,
        y,
        size: 11,
        font,
        color: MUTED,
      });
      y -= 14;
    }
  }

  y -= 24;
  page.drawLine({
    start: { x: 60, y },
    end: { x: width - 60, y },
    thickness: 1,
    color: RULE,
  });
  y -= 30;

  page.drawText(options.title, {
    x: centerX - bold.widthOfTextAtSize(options.title, 16) / 2,
    y,
    size: 16,
    font: bold,
    color: INK,
  });
  y -= 18;

  if (options.subtitle) {
    page.drawText(options.subtitle, {
      x: centerX - font.widthOfTextAtSize(options.subtitle, 11) / 2,
      y,
      size: 11,
      font,
      color: MUTED,
    });
    y -= 28;
  } else {
    y -= 16;
  }

  for (const [label, value] of options.rows) {
    page.drawText(`${label} :`, {
      x: 80,
      y,
      size: 12,
      font,
      color: INK,
    });
    page.drawText(truncate(asText(value), font, 12, width - 320), {
      x: 280,
      y,
      size: 12,
      font,
      color: INK,
    });
    y -= 24;
  }

  page.drawText(BRAND_FOOTER, {
    x: centerX - font.widthOfTextAtSize(BRAND_FOOTER, 10) / 2,
    y: 40,
    size: 10,
    font,
    color: MUTED,
  });
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
  const top = height - 12;

  if (logo) {
    const maxW = 34;
    const maxH = 26;
    const scale = Math.min(maxW / logo.width, maxH / logo.height);
    const logoW = logo.width * scale;
    const logoH = logo.height * scale;
    page.drawImage(logo, {
      x: 20,
      y: top - logoH,
      width: logoW,
      height: logoH,
    });
  }

  const leftX = logo ? 62 : 20;
  page.drawText(truncate(company.companyName || 'Company', bold, 10, 240), {
    x: leftX,
    y: top - 10,
    size: 10,
    font: bold,
    color: INK,
  });
  page.drawText(truncate(title, font, 9, 240), {
    x: leftX,
    y: top - 24,
    size: 9,
    font,
    color: MUTED,
  });

  page.drawLine({
    start: { x: 18, y: height - 46 },
    end: { x: width - 18, y: height - 46 },
    thickness: 0.8,
    color: RULE,
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
  coverRows: Array<[string, string]>;
  sections?: Array<{ heading: string; rows: Array<[string, string]> }>;
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
      subtitle: options.subtitle,
      rows: [
        ...options.coverRows,
        ['Generated By', options.exportedBy || '---'],
        ['Generated Date', formatDate(new Date())],
      ],
    },
    logo,
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
  const id =
    actor?.companyId?._id?.toString() ||
    actor?.companyId?.toString() ||
    undefined;
  if (!id) return fallback;
  try {
    const company = await companyModel.findById(id).exec();
    if (!company) return fallback;
    return {
      companyName: company.companyName || fallback.companyName,
      address: company.address || '',
      companyLogo: company.companyLogo || '',
    };
  } catch {
    return fallback;
  }
}

export { formatDate, asText };
