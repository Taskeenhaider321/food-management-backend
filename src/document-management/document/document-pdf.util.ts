import axios from 'axios';
import sharp from 'sharp';
import {
  PDFDocument,
  PDFFont,
  PDFImage,
  PDFPage,
  StandardFonts,
  rgb,
  RGB,
} from 'pdf-lib';

const BRAND_FOOTER = 'Powered By Feat Technology';
const INK = rgb(0.1, 0.1, 0.1);
const MUTED = rgb(0.35, 0.35, 0.35);
const RULE = rgb(0.55, 0.55, 0.55);

export type PdfCompany = {
  companyName: string;
  address?: string;
  companyLogo?: string;
};

export type PdfMeta = {
  documentName: string;
  documentId: string;
  documentType: string;
  revisionNo: number;
  status?: string;
  createdBy: string;
  createdAt: Date;
  reviewedBy: string;
  reviewedAt: Date | null;
  approvedBy: string;
  approvedAt: Date | null;
  departments: string;
};

function formatDate(date: Date | null | undefined): string {
  if (!date) return '---';
  return new Date(date).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function truncate(text: string, font: PDFFont, size: number, maxWidth: number) {
  const value = (text || '').trim() || '---';
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
  text: string,
  font: PDFFont,
  size: number,
  maxWidth: number,
): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [''];
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

function drawCenteredText(
  page: PDFPage,
  text: string,
  y: number,
  size: number,
  font: PDFFont,
  color: RGB = INK,
) {
  const { width } = page.getSize();
  page.drawText(text, {
    x: width / 2 - font.widthOfTextAtSize(text, size) / 2,
    y,
    size,
    font,
    color,
  });
}

function drawHorizontalRule(
  page: PDFPage,
  y: number,
  inset = 48,
  thickness = 1,
  color: RGB = RULE,
) {
  const { width } = page.getSize();
  page.drawLine({
    start: { x: inset, y },
    end: { x: width - inset, y },
    thickness,
    color,
  });
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
      // try next candidate
    }
  }
  return null;
}

/**
 * Professional cover: identity band, document title, clean metadata table.
 * Footer / page number are applied later for every page.
 */
async function drawCoverPage(
  page: PDFPage,
  pdfDoc: PDFDocument,
  company: PdfCompany,
  meta: PdfMeta,
  logo: PDFImage | null,
) {
  const { width, height } = page.getSize();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const centerX = width / 2;
  const side = 48;

  // Top accent bar
  page.drawRectangle({
    x: 0,
    y: height - 8,
    width,
    height: 8,
    color: rgb(0.18, 0.27, 0.42),
  });

  let y = height - 70;

  if (logo) {
    const maxW = 120;
    const maxH = 88;
    const scale = Math.min(maxW / logo.width, maxH / logo.height);
    const logoW = logo.width * scale;
    const logoH = logo.height * scale;
    page.drawImage(logo, {
      x: centerX - logoW / 2,
      y: y - logoH,
      width: logoW,
      height: logoH,
    });
    y -= logoH + 22;
  }

  const companyName = company.companyName || 'Company';
  drawCenteredText(page, companyName, y, 22, bold, rgb(0.12, 0.16, 0.24));
  y -= 18;

  if (company.address) {
    for (const line of wrapText(company.address, font, 10, width - 140).slice(
      0,
      3,
    )) {
      drawCenteredText(page, line, y, 10, font, MUTED);
      y -= 13;
    }
  }

  y -= 20;
  drawHorizontalRule(page, y, side, 1.25, rgb(0.18, 0.27, 0.42));
  y -= 8;
  drawHorizontalRule(page, y, side, 0.4, RULE);
  y -= 26;

  drawCenteredText(page, 'DOCUMENT COVER', y, 9, font, MUTED);
  y -= 18;

  const docTitle = truncate(
    meta.documentName || 'Untitled Document',
    bold,
    16,
    width - 120,
  );
  drawCenteredText(page, docTitle, y, 16, bold, rgb(0.12, 0.16, 0.24));
  y -= 16;

  const subtitleParts = [
    meta.documentType,
    meta.documentId,
    meta.status ? `Status: ${meta.status}` : '',
  ].filter(Boolean);
  if (subtitleParts.length) {
    drawCenteredText(page, subtitleParts.join('  ·  '), y, 10, font, MUTED);
    y -= 14;
  }

  y -= 18;
  drawHorizontalRule(page, y, side, 0.6, RULE);
  y -= 28;

  const rows: Array<[string, string]> = [
    ['Created By', meta.createdBy || '---'],
    ['Creation Date', formatDate(meta.createdAt)],
    ['Document ID', meta.documentId],
    ['Document Name', meta.documentName],
    ['Document Type', meta.documentType],
    ['Department', meta.departments || '---'],
    ['Revision Number', String(meta.revisionNo ?? 0)],
    ['Reviewed By', meta.reviewedBy || '---'],
    ['Reviewed Date', formatDate(meta.reviewedAt)],
    ['Approved By', meta.approvedBy || '---'],
    ['Approval Date', formatDate(meta.approvedAt)],
  ];

  const tableLeft = side;
  const tableWidth = width - side * 2;
  const labelCol = 168;
  const rowH = 26;
  const tableTop = y + 8;
  const tableHeight = rows.length * rowH + 4;

  // Soft table outline
  page.drawRectangle({
    x: tableLeft,
    y: tableTop - tableHeight,
    width: tableWidth,
    height: tableHeight,
    borderColor: rgb(0.78, 0.8, 0.84),
    borderWidth: 0.75,
  });

  let rowY = tableTop - 18;
  rows.forEach(([label, value], index) => {
    if (index % 2 === 0) {
      page.drawRectangle({
        x: tableLeft + 0.5,
        y: rowY - 8,
        width: tableWidth - 1,
        height: rowH,
        color: rgb(0.965, 0.97, 0.98),
      });
    }

    page.drawText(label, {
      x: tableLeft + 16,
      y: rowY,
      size: 11,
      font,
      color: MUTED,
    });
    page.drawText(truncate(value, font, 11, tableWidth - labelCol - 28), {
      x: tableLeft + labelCol,
      y: rowY,
      size: 11,
      font,
      color: INK,
    });
    rowY -= rowH;
  });
}

/**
 * Content-page header: company + doc name left, revision / date / Doc ID right.
 */
function drawContentHeader(
  page: PDFPage,
  company: PdfCompany,
  meta: PdfMeta,
  font: PDFFont,
  bold: PDFFont,
  logo: PDFImage | null,
) {
  const { width, height } = page.getSize();
  const headerTop = height - 14;
  const leftInset = 20;

  if (logo) {
    const maxW = 34;
    const maxH = 26;
    const scale = Math.min(maxW / logo.width, maxH / logo.height);
    const logoW = logo.width * scale;
    const logoH = logo.height * scale;
    page.drawImage(logo, {
      x: leftInset,
      y: headerTop - logoH,
      width: logoW,
      height: logoH,
    });
  }

  const leftX = logo ? 62 : leftInset;
  page.drawText(truncate(company.companyName || 'Company', bold, 11, 250), {
    x: leftX,
    y: headerTop - 8,
    size: 11,
    font: bold,
    color: INK,
  });
  page.drawText(truncate(meta.documentName, font, 9, 250), {
    x: leftX,
    y: headerTop - 22,
    size: 9,
    font,
    color: MUTED,
  });

  const rightLines = [
    `Revision No : ${meta.revisionNo ?? 0}`,
    `Creation : ${formatDate(meta.createdAt)}`,
    `Doc ID : ${meta.documentId}`,
  ];
  rightLines.forEach((line, index) => {
    page.drawText(line, {
      x: width - font.widthOfTextAtSize(line, 9) - 20,
      y: headerTop - 6 - index * 12,
      size: 9,
      font,
      color: INK,
    });
  });

  page.drawLine({
    start: { x: 18, y: height - 46 },
    end: { x: width - 18, y: height - 46 },
    thickness: 1,
    color: INK,
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

async function applyPageChrome(
  pdfDoc: PDFDocument,
  company: PdfCompany,
  meta: PdfMeta,
  logo: PDFImage | null,
) {
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const pages = pdfDoc.getPages();
  const total = pages.length;

  pages.forEach((page, index) => {
    if (index > 0) {
      drawContentHeader(page, company, meta, font, bold, logo);
    }
    drawContentFooter(page, index + 1, total, font);
  });
}

function stripHtml(html: string): string {
  return html
    .replace(/<\s*br\s*\/?>/gi, '\n')
    .replace(/<\/\s*p\s*>/gi, '\n\n')
    .replace(/<\/\s*div\s*>/gi, '\n')
    .replace(/<\/\s*h[1-6]\s*>/gi, '\n\n')
    .replace(/<\/\s*li\s*>/gi, '\n')
    .replace(/<\s*li[^>]*>/gi, '• ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

async function appendTextPages(pdfDoc: PDFDocument, bodyText: string) {
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontSize = 12;
  const lineHeight = 18;
  const marginX = 50;
  const topMargin = 70;
  const bottomMargin = 55;

  const paragraphs = (bodyText || 'No content available.').split(/\n/);
  let page = pdfDoc.addPage();
  let y = page.getSize().height - topMargin;
  const maxWidth = page.getSize().width - marginX * 2;

  const ensureSpace = (needed: number) => {
    if (y - needed < bottomMargin) {
      page = pdfDoc.addPage();
      y = page.getSize().height - topMargin;
    }
  };

  for (const paragraph of paragraphs) {
    if (!paragraph.trim()) {
      y -= lineHeight * 0.6;
      continue;
    }
    const lines = wrapText(paragraph, font, fontSize, maxWidth);
    for (const line of lines) {
      ensureSpace(lineHeight);
      page.drawText(line, {
        x: marginX,
        y,
        size: fontSize,
        font,
        color: INK,
      });
      y -= lineHeight;
    }
    y -= 4;
  }
}

async function stampExistingPdf(
  sourceBytes: Buffer,
  company: PdfCompany,
  meta: PdfMeta,
  logo: PDFImage | null,
  targetDoc: PDFDocument,
) {
  const source = await PDFDocument.load(sourceBytes);
  const cover = targetDoc.addPage();
  await drawCoverPage(cover, targetDoc, company, meta, logo);

  const copied = await targetDoc.copyPages(source, source.getPageIndices());
  const topExtra = 52;
  const bottomExtra = 40;

  for (const page of copied) {
    const { width, height } = page.getSize();
    page.setSize(width, height + topExtra + bottomExtra);
    page.translateContent(0, -bottomExtra);
    targetDoc.addPage(page);
  }

  await applyPageChrome(targetDoc, company, meta, logo);
}

export function timelineMeta(
  timeline: Array<{ action: string; user: string; at: Date }>,
) {
  const reviewed = [...timeline].reverse().find((t) => t.action === 'Reviewed');
  const approved = [...timeline].reverse().find((t) => t.action === 'Approved');
  return {
    reviewedBy: reviewed?.user || '---',
    reviewedAt: reviewed?.at ? new Date(reviewed.at) : null,
    approvedBy: approved?.user || '---',
    approvedAt: approved?.at ? new Date(approved.at) : null,
  };
}

export async function buildDocumentPdf(options: {
  company: PdfCompany;
  meta: PdfMeta;
  creationMethod: 'upload' | 'editor';
  editorContent?: string;
  fileUrl?: string;
  fileName?: string;
}): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const logo = await embedLogo(pdfDoc, options.company.companyLogo);

  const looksLikePdf = /\.pdf($|\?)/i.test(
    `${options.fileName || ''} ${options.fileUrl || ''}`,
  );

  if (options.creationMethod === 'upload' && options.fileUrl && looksLikePdf) {
    try {
      const response = await axios.get(options.fileUrl, {
        responseType: 'arraybuffer',
        timeout: 30000,
      });
      await stampExistingPdf(
        Buffer.from(response.data),
        options.company,
        options.meta,
        logo,
        pdfDoc,
      );
      return pdfDoc.save();
    } catch {
      // Fall through
    }
  }

  const cover = pdfDoc.addPage();
  await drawCoverPage(cover, pdfDoc, options.company, options.meta, logo);

  if (options.creationMethod === 'editor') {
    await appendTextPages(pdfDoc, stripHtml(options.editorContent || ''));
  } else {
    await appendTextPages(
      pdfDoc,
      [
        'Original uploaded file',
        options.fileName ? `File name: ${options.fileName}` : '',
        '',
        'Open the original attachment from Document Management for the source file.',
      ]
        .filter(Boolean)
        .join('\n'),
    );
  }

  await applyPageChrome(pdfDoc, options.company, options.meta, logo);
  return pdfDoc.save();
}
