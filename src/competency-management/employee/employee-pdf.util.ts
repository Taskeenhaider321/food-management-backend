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
const ACCENT = rgb(0.18, 0.27, 0.42);
const ROW_BG = rgb(0.965, 0.97, 0.98);

export type EmployeePdfCompany = {
  companyName: string;
  address?: string;
  companyLogo?: string;
};

export type EmployeePdfRow = {
  name: string;
  email: string;
  designation: string;
  department: string;
  trainingsTotal: number;
  trainingsLabel?: string;
};

export type EmployeePdfDetail = {
  name: string;
  email: string;
  userName?: string;
  designation: string;
  department: string;
  phoneNo?: string;
  address?: string;
  qualification?: string;
  experience?: string;
  skills?: string;
  trainings: string[];
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
  const normalized = Array.isArray(text)
    ? text.filter(Boolean).join(', ')
    : text == null
      ? ''
      : String(text);
  const words = normalized.split(/\s+/).filter(Boolean);
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

async function drawCoverPage(
  page: PDFPage,
  pdfDoc: PDFDocument,
  company: EmployeePdfCompany,
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
  const side = 48;

  page.drawRectangle({
    x: 0,
    y: height - 8,
    width,
    height: 8,
    color: ACCENT,
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

  drawCenteredText(
    page,
    company.companyName || 'Company',
    y,
    22,
    bold,
    rgb(0.12, 0.16, 0.24),
  );
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
  drawHorizontalRule(page, y, side, 1.25, ACCENT);
  y -= 8;
  drawHorizontalRule(page, y, side, 0.4, RULE);
  y -= 26;

  drawCenteredText(page, 'COMPETENCY MANAGEMENT', y, 9, font, MUTED);
  y -= 18;
  drawCenteredText(page, options.title, y, 16, bold, rgb(0.12, 0.16, 0.24));
  y -= 16;

  if (options.subtitle) {
    drawCenteredText(page, options.subtitle, y, 10, font, MUTED);
    y -= 14;
  }

  y -= 18;
  drawHorizontalRule(page, y, side, 0.6, RULE);
  y -= 28;

  const tableLeft = side;
  const tableWidth = width - side * 2;
  const labelCol = 168;
  const rowH = 26;
  const tableTop = y + 8;
  const tableHeight = options.rows.length * rowH + 4;

  page.drawRectangle({
    x: tableLeft,
    y: tableTop - tableHeight,
    width: tableWidth,
    height: tableHeight,
    borderColor: rgb(0.78, 0.8, 0.84),
    borderWidth: 0.75,
  });

  let rowY = tableTop - 18;
  options.rows.forEach(([label, value], index) => {
    if (index % 2 === 0) {
      page.drawRectangle({
        x: tableLeft + 0.5,
        y: rowY - 8,
        width: tableWidth - 1,
        height: rowH,
        color: ROW_BG,
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

function drawContentHeader(
  page: PDFPage,
  company: EmployeePdfCompany,
  title: string,
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
  page.drawText(truncate(title, font, 9, 250), {
    x: leftX,
    y: headerTop - 22,
    size: 9,
    font,
    color: MUTED,
  });

  const created = `Generated : ${formatDate(new Date())}`;
  page.drawText(created, {
    x: width - font.widthOfTextAtSize(created, 9) - 20,
    y: headerTop - 14,
    size: 9,
    font,
    color: INK,
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

function applyChrome(
  pages: PDFPage[],
  company: EmployeePdfCompany,
  title: string,
  font: PDFFont,
  bold: PDFFont,
  logo: PDFImage | null,
) {
  const total = pages.length;
  pages.forEach((page, index) => {
    if (index > 0) {
      drawContentHeader(page, company, title, font, bold, logo);
    }
    drawContentFooter(page, index + 1, total, font);
  });
}

function drawTableHeader(
  page: PDFPage,
  y: number,
  font: PDFFont,
  bold: PDFFont,
  cols: Array<{ label: string; x: number; width: number }>,
) {
  const { width } = page.getSize();
  page.drawRectangle({
    x: 40,
    y: y - 6,
    width: width - 80,
    height: 22,
    color: rgb(0.93, 0.94, 0.96),
  });
  for (const col of cols) {
    page.drawText(col.label, {
      x: col.x,
      y,
      size: 9,
      font: bold,
      color: MUTED,
    });
  }
}

export async function buildEmployeesListPdf(options: {
  company: EmployeePdfCompany;
  employees: EmployeePdfRow[];
  exportedBy: string;
}): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const logo = await embedLogo(pdfDoc, options.company.companyLogo);
  const title = 'Employees Directory';

  const cover = pdfDoc.addPage();
  await drawCoverPage(
    cover,
    pdfDoc,
    options.company,
    {
      title,
      subtitle: `${options.employees.length} employee(s)`,
      rows: [
        ['Report Type', 'Employees Directory'],
        ['Total Employees', String(options.employees.length)],
        ['Generated By', options.exportedBy || '---'],
        ['Generated Date', formatDate(new Date())],
        ['Module', 'Competency Management'],
      ],
    },
    logo,
  );

  const cols = [
    { label: 'NAME', x: 48, width: 130 },
    { label: 'DESIGNATION', x: 190, width: 100 },
    { label: 'DEPARTMENT', x: 300, width: 110 },
    { label: 'TRAININGS', x: 420, width: 90 },
    { label: 'EMAIL', x: 48, width: 0 }, // email on second line under name
  ];

  let page = pdfDoc.addPage();
  let y = page.getSize().height - 70;
  drawTableHeader(page, y, font, bold, cols.slice(0, 4));
  y -= 28;

  for (const emp of options.employees) {
    if (y < 70) {
      page = pdfDoc.addPage();
      y = page.getSize().height - 70;
      drawTableHeader(page, y, font, bold, cols.slice(0, 4));
      y -= 28;
    }

    page.drawText(truncate(emp.name, bold, 10, 130), {
      x: 48,
      y,
      size: 10,
      font: bold,
      color: INK,
    });
    page.drawText(truncate(emp.designation || '---', font, 9, 100), {
      x: 190,
      y,
      size: 9,
      font,
      color: INK,
    });
    page.drawText(truncate(emp.department || '---', font, 9, 110), {
      x: 300,
      y,
      size: 9,
      font,
      color: INK,
    });
    page.drawText(
      truncate(
        emp.trainingsLabel || `${emp.trainingsTotal} assigned`,
        font,
        9,
        90,
      ),
      {
        x: 420,
        y,
        size: 9,
        font,
        color: INK,
      },
    );
    y -= 12;
    page.drawText(truncate(emp.email || '---', font, 8, 200), {
      x: 48,
      y,
      size: 8,
      font,
      color: MUTED,
    });
    y -= 22;
  }

  if (options.employees.length === 0) {
    page.drawText('No employees found for this company.', {
      x: 48,
      y,
      size: 11,
      font,
      color: MUTED,
    });
  }

  applyChrome(pdfDoc.getPages(), options.company, title, font, bold, logo);
  return pdfDoc.save();
}

export async function buildEmployeeDetailPdf(options: {
  company: EmployeePdfCompany;
  employee: EmployeePdfDetail;
  exportedBy: string;
}): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const logo = await embedLogo(pdfDoc, options.company.companyLogo);
  const emp = options.employee;
  const title = `Employee — ${emp.name}`;

  const cover = pdfDoc.addPage();
  await drawCoverPage(
    cover,
    pdfDoc,
    options.company,
    {
      title: emp.name || 'Employee Profile',
      subtitle: emp.designation || 'Employee',
      rows: [
        ['Employee Name', emp.name || '---'],
        ['Email', emp.email || '---'],
        ['Username', emp.userName || '---'],
        ['Designation', emp.designation || '---'],
        ['Department', emp.department || '---'],
        ['Phone', emp.phoneNo || '---'],
        ['Generated By', options.exportedBy || '---'],
        ['Generated Date', formatDate(new Date())],
      ],
    },
    logo,
  );

  const page = pdfDoc.addPage();
  let y = page.getSize().height - 70;

  page.drawText('Profile Details', {
    x: 48,
    y,
    size: 12,
    font: bold,
    color: INK,
  });
  y -= 22;

  const detailRows: Array<[string, string]> = [
    ['Address', emp.address || '---'],
    ['Qualification', emp.qualification || '---'],
    ['Experience', emp.experience || '---'],
    ['Skills', emp.skills || '---'],
  ];

  for (const [label, value] of detailRows) {
    page.drawText(`${label} :`, {
      x: 48,
      y,
      size: 10,
      font,
      color: MUTED,
    });
    const lines = wrapText(value, font, 10, 360);
    let valueY = y;
    for (const line of lines.slice(0, 4)) {
      page.drawText(line, {
        x: 170,
        y: valueY,
        size: 10,
        font,
        color: INK,
      });
      valueY -= 14;
    }
    y = valueY - 8;
  }

  y -= 10;
  page.drawText('Assigned Trainings', {
    x: 48,
    y,
    size: 12,
    font: bold,
    color: INK,
  });
  y -= 20;

  if (!emp.trainings.length) {
    page.drawText('No trainings assigned.', {
      x: 48,
      y,
      size: 10,
      font,
      color: MUTED,
    });
  } else {
    emp.trainings.forEach((training, index) => {
      if (y < 60) return;
      page.drawText(`${index + 1}. ${truncate(training, font, 10, 460)}`, {
        x: 48,
        y,
        size: 10,
        font,
        color: INK,
      });
      y -= 16;
    });
  }

  applyChrome(pdfDoc.getPages(), options.company, title, font, bold, logo);
  return pdfDoc.save();
}
