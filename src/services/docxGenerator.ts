import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  AlignmentType,
  WidthType,
  BorderStyle,
  VerticalAlign,
  ImageRun,
  ShadingType,
} from 'docx';
import { Quotation } from '../types/quotation';
import { formatCurrency, formatDate, numberToWords } from '../utils/formatting';
import { calculateQuotationTotals } from '../utils/calculations';
import { downloadBlob } from './pdfGenerator';

// ─── Design Tokens ────────────────────────────────────────────────────────────
const COLOR_PRIMARY   = '0F172A'; // dark slate (navy)
const COLOR_SECONDARY = '475569'; // muted slate
const COLOR_ACCENT    = '1E3A5F'; // deep navy accent
const COLOR_BORDER    = 'CBD5E1'; // slate-300
const COLOR_BG_LIGHT  = 'F8FAFC'; // slate-50
const COLOR_WHITE     = 'FFFFFF';
const COLOR_EMERALD   = '065F46'; // balance outstanding green-dark
const COLOR_ROSE      = '9F1239'; // discount/rose

type DocxAlignment = (typeof AlignmentType)[keyof typeof AlignmentType];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function txt(text: string, opts: {
  bold?: boolean;
  size?: number;
  color?: string;
  italic?: boolean;
  underline?: boolean;
} = {}): TextRun {
  return new TextRun({
    text: text ?? '',
    bold: opts.bold,
    size: opts.size ? opts.size * 2 : 20, // half-points
    color: opts.color || COLOR_PRIMARY,
    italics: opts.italic,
    underline: opts.underline ? {} : undefined,
  });
}

function para(
  runs: TextRun[],
  opts: {
    align?: DocxAlignment;
    spaceBefore?: number;
    spaceAfter?: number;
  } = {}
): Paragraph {
  return new Paragraph({
    alignment: opts.align ?? AlignmentType.LEFT,
    spacing: {
      before: opts.spaceBefore ?? 0,
      after: opts.spaceAfter ?? 80,
    },
    children: runs,
  });
}

const bdrNone = { style: BorderStyle.NONE, size: 0, color: 'auto' };
const bdrThin = { style: BorderStyle.SINGLE, size: 4, color: COLOR_BORDER };
const bdrThick = { style: BorderStyle.SINGLE, size: 8, color: COLOR_PRIMARY };

const cellBdrNone = { top: bdrNone, bottom: bdrNone, left: bdrNone, right: bdrNone };
const cellBdrBottom = { top: bdrNone, bottom: bdrThin, left: bdrNone, right: bdrNone };

/**
 * Robust, browser-safe logo loader for DOCX ImageRun.
 * Returns an ArrayBuffer of the logo, or null if unavailable.
 */
async function fetchLogoBuffer(logoData?: string): Promise<ArrayBuffer | null> {
  try {
    // 1. If logo is a base64 data URL
    if (logoData && logoData.startsWith('data:')) {
      const commaIndex = logoData.indexOf(',');
      if (commaIndex !== -1) {
        const base64Str = logoData.slice(commaIndex + 1);
        const binary = atob(base64Str);
        const buffer = new ArrayBuffer(binary.length);
        const view = new Uint8Array(buffer);
        for (let i = 0; i < binary.length; i++) {
          view[i] = binary.charCodeAt(i);
        }
        return buffer;
      }
    }

    // 2. Fetch directly from public icons
    const candidates = ['/icons/nsvm-logo.png', '/nsvm-logo.png'];
    for (const url of candidates) {
      try {
        const res = await fetch(url);
        if (res.ok) {
          return await res.arrayBuffer();
        }
      } catch {
        // try next candidate
      }
    }

    return null;
  } catch (err) {
    console.warn('Could not load logo for DOCX, continuing without logo:', err);
    return null;
  }
}

// ─── Main Generator ───────────────────────────────────────────────────────────

export async function downloadQuotationDocx(quotation: Quotation): Promise<void> {
  const totals = calculateQuotationTotals({
    items: quotation.items || [],
    labour: quotation.labour || 0,
    installation: quotation.installation || 0,
    discount: quotation.discount || 0,
    discountType: quotation.discountType || 'percentage',
    gstPercentage: quotation.gst || 0,
    gstEnabled: quotation.gstEnabled || false,
    advance: quotation.advance || 0,
  });

  const co = quotation.company || {
    companyName: 'NSVM INDUSTRIES',
    tagline: 'Quality Fabrication & Engineering Works',
    address: '',
    phone: '',
    email: '',
    gstNumber: '',
  };
  const cu = quotation.customer || { name: 'Customer', phone: '', billingAddress: '' };
  const pr = quotation.project || { name: 'Project', siteLocation: '' };

  // ── Load logo ──────────────────────────────────────────────────────────────
  const logoBuffer = await fetchLogoBuffer(co.logo);
  let logoRun: ImageRun | null = null;
  if (logoBuffer) {
    try {
      logoRun = new ImageRun({
        type: 'png',
        data: logoBuffer,
        transformation: { width: 120, height: 80 },
      });
    } catch (e) {
      console.warn('ImageRun creation failed:', e);
      logoRun = null;
    }
  }

  // ── Section 1 ─ Company Header ─────────────────────────────────────────────
  const headerTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: bdrNone, bottom: bdrThick, left: bdrNone, right: bdrNone,
      insideHorizontal: bdrNone, insideVertical: bdrNone,
    },
    rows: [
      new TableRow({
        children: [
          // Left: company text
          new TableCell({
            width: { size: logoRun ? 70 : 100, type: WidthType.PERCENTAGE },
            borders: cellBdrNone,
            children: [
              para([txt(co.companyName, { bold: true, size: 18, color: COLOR_PRIMARY })], { spaceAfter: 40 }),
              ...(co.tagline ? [para([txt(co.tagline, { italic: true, size: 9, color: COLOR_SECONDARY })], { spaceAfter: 40 })] : []),
              para([txt(co.address || '', { size: 9, color: COLOR_SECONDARY })], { spaceAfter: 30 }),
              para([
                txt(`Phone: ${co.phone || 'N/A'}`, { size: 9, color: COLOR_SECONDARY }),
                txt('   |   ', { size: 9, color: COLOR_BORDER }),
                txt(`Email: ${co.email || 'N/A'}`, { size: 9, color: COLOR_SECONDARY }),
              ], { spaceAfter: 30 }),
              ...(co.gstNumber
                ? [para([txt('GSTIN: ', { bold: true, size: 9 }), txt(co.gstNumber, { size: 9, color: COLOR_SECONDARY })], { spaceAfter: 0 })]
                : []),
            ],
          }),
          // Right: logo
          ...(logoRun
            ? [
                new TableCell({
                  width: { size: 30, type: WidthType.PERCENTAGE },
                  borders: cellBdrNone,
                  verticalAlign: VerticalAlign.CENTER,
                  children: [
                    new Paragraph({
                      alignment: AlignmentType.RIGHT,
                      spacing: { after: 0 },
                      children: [logoRun],
                    }),
                  ],
                }),
              ]
            : []),
        ],
      }),
    ],
  });

  // ── Section 2 ─ Title ──────────────────────────────────────────────────────
  const titlePara = para(
    [txt('QUOTATION', { bold: true, size: 14, color: COLOR_PRIMARY })],
    { align: AlignmentType.CENTER, spaceBefore: 160, spaceAfter: 160 }
  );

  // ── Section 3 ─ Meta Table (Quot No / Date / Validity / Prepared By) ──────
  const metaTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: bdrThin, bottom: bdrThin, left: bdrThin, right: bdrThin,
      insideHorizontal: bdrNone, insideVertical: bdrThin,
    },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            shading: { type: ShadingType.SOLID, fill: COLOR_BG_LIGHT },
            borders: { top: bdrNone, bottom: bdrNone, left: bdrNone, right: bdrThin },
            children: [
              para([txt('Quotation No: ', { bold: true, size: 9.5 }), txt(quotation.quotationNumber || 'Draft', { size: 9.5 })], { spaceAfter: 30 }),
              para([txt('Quotation Date: ', { bold: true, size: 9.5 }), txt(formatDate(quotation.date), { size: 9.5 })], { spaceAfter: 30 }),
              para([txt('Valid Until: ', { bold: true, size: 9.5 }), txt(formatDate(quotation.validUntil), { size: 9.5 })], { spaceAfter: 0 }),
            ],
          }),
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            shading: { type: ShadingType.SOLID, fill: COLOR_BG_LIGHT },
            borders: cellBdrNone,
            children: [
              para([txt('Prepared By: ', { bold: true, size: 9.5 }), txt(quotation.preparedBy || 'N/A', { size: 9.5 })], { spaceAfter: 30 }),
              para([txt('Project / Work: ', { bold: true, size: 9.5 }), txt(pr.name || 'N/A', { size: 9.5 })], { spaceAfter: 0 }),
            ],
          }),
        ],
      }),
    ],
  });

  // ── Section 4 ─ Customer & Project Table ──────────────────────────────────
  const cpTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: bdrThin, bottom: bdrThin, left: bdrThin, right: bdrThin,
      insideHorizontal: bdrNone, insideVertical: bdrThin,
    },
    rows: [
      // Header row
      new TableRow({
        children: [
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            shading: { type: ShadingType.SOLID, fill: COLOR_PRIMARY },
            borders: { top: bdrNone, bottom: bdrThin, left: bdrNone, right: bdrNone },
            children: [para([txt('CUSTOMER DETAILS', { bold: true, size: 9, color: COLOR_WHITE })], { spaceAfter: 0 })],
          }),
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            shading: { type: ShadingType.SOLID, fill: COLOR_PRIMARY },
            borders: { top: bdrNone, bottom: bdrThin, left: bdrNone, right: bdrNone },
            children: [para([txt('SITE / PROJECT DETAILS', { bold: true, size: 9, color: COLOR_WHITE })], { spaceAfter: 0 })],
          }),
        ],
      }),
      // Data row
      new TableRow({
        children: [
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            borders: { top: bdrNone, bottom: bdrNone, left: bdrNone, right: bdrThin },
            children: [
              para([txt(cu.name || 'N/A', { bold: true, size: 10 })], { spaceAfter: 40 }),
              ...(cu.phone ? [para([txt('Phone: ', { bold: true, size: 9, color: COLOR_SECONDARY }), txt(cu.phone, { size: 9 })], { spaceAfter: 30 })] : []),
              ...(cu.billingAddress ? [para([txt(cu.billingAddress, { size: 9, color: COLOR_SECONDARY })], { spaceAfter: 0 })] : []),
            ],
          }),
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            borders: cellBdrNone,
            children: [
              ...(pr.siteLocation
                ? [para([txt(pr.siteLocation, { size: 9 })], { spaceAfter: 0 })]
                : [para([txt('No site location specified.', { size: 9, italic: true, color: COLOR_SECONDARY })], { spaceAfter: 0 })]),
            ],
          }),
        ],
      }),
    ],
  });

  // ── Section 5 ─ Work Items Table ──────────────────────────────────────────
  const COL_W = [5, 28, 16, 9, 12, 8, 11, 11]; // percentages (sum=100)
  const hdTxt = (t: string, align: DocxAlignment = AlignmentType.LEFT) =>
    new TableCell({
      shading: { type: ShadingType.SOLID, fill: COLOR_PRIMARY },
      borders: cellBdrNone,
      children: [para([txt(t, { bold: true, size: 9, color: COLOR_WHITE })], { align, spaceAfter: 0 })],
    });

  const workHeaderRow = new TableRow({
    tableHeader: true,
    children: [
      hdTxt('#', AlignmentType.CENTER),
      hdTxt('Work Description'),
      hdTxt('Dimensions (L×W×H)', AlignmentType.CENTER),
      hdTxt('Area', AlignmentType.RIGHT),
      hdTxt('Material / Grade', AlignmentType.CENTER),
      hdTxt('Qty', AlignmentType.CENTER),
      hdTxt('Rate (₹)', AlignmentType.RIGHT),
      hdTxt('Amount (₹)', AlignmentType.RIGHT),
    ],
  });

  const items = quotation.items || [];
  const itemRows: TableRow[] = items.map((item, idx) => {
    let dimStr = '-';
    if (item.length !== null || item.width !== null || item.height !== null) {
      const parts = [
        item.length !== null && item.length !== undefined ? `${item.length}L` : '',
        item.width !== null && item.width !== undefined ? `${item.width}W` : '',
        item.height !== null && item.height !== undefined ? `${item.height}H` : '',
      ].filter(Boolean);
      dimStr = parts.join(' × ');
    }
    const areaStr = item.area !== null && item.area !== undefined ? `${item.area} ${item.unit || ''}` : '-';
    const rowFill = idx % 2 === 1 ? COLOR_BG_LIGHT : COLOR_WHITE;

    const dc = (text: string, align: DocxAlignment = AlignmentType.LEFT, bold = false) =>
      new TableCell({
        shading: { type: ShadingType.SOLID, fill: rowFill },
        borders: cellBdrBottom,
        children: [para([txt(text, { size: 9, bold })], { align, spaceAfter: 0 })],
      });

    return new TableRow({
      children: [
        dc(String(idx + 1), AlignmentType.CENTER),
        dc(item.description || '-', AlignmentType.LEFT, true),
        dc(dimStr, AlignmentType.CENTER),
        dc(areaStr, AlignmentType.RIGHT),
        dc(item.material || '-', AlignmentType.CENTER),
        dc(`${item.quantity ?? 1} ${item.unit || ''}`, AlignmentType.CENTER),
        dc(formatCurrency(item.rate || 0), AlignmentType.RIGHT),
        dc(formatCurrency(item.amount || 0), AlignmentType.RIGHT, true),
      ],
    });
  });

  // Empty state row
  if (itemRows.length === 0) {
    itemRows.push(new TableRow({
      children: [
        new TableCell({
          columnSpan: 8,
          borders: cellBdrBottom,
          children: [para([txt('No work items added.', { size: 9, italic: true, color: COLOR_SECONDARY })], { align: AlignmentType.CENTER, spaceAfter: 0 })],
        }),
      ],
    }));
  }

  // Totals rows appended to the work table
  const totalsLabel = (text: string, bold = false, fill = COLOR_WHITE, color = COLOR_PRIMARY) =>
    new TableCell({
      columnSpan: 7,
      shading: { type: ShadingType.SOLID, fill },
      borders: cellBdrBottom,
      children: [para([txt(text, { size: 9.5, bold, color })], { align: AlignmentType.RIGHT, spaceAfter: 0 })],
    });

  const totalsValue = (text: string, bold = false, fill = COLOR_WHITE, color = COLOR_PRIMARY) =>
    new TableCell({
      shading: { type: ShadingType.SOLID, fill },
      borders: cellBdrBottom,
      children: [para([txt(text, { size: 9.5, bold, color })], { align: AlignmentType.RIGHT, spaceAfter: 0 })],
    });

  const totalsRows: TableRow[] = [
    // Work subtotal
    new TableRow({ children: [totalsLabel('Work Subtotal:'), totalsValue(formatCurrency(totals.itemsSubtotal))] }),

    // Labour (conditional)
    ...((quotation.labour || 0) > 0
      ? [new TableRow({ children: [totalsLabel('Labour & Fabrication:'), totalsValue(formatCurrency(quotation.labour))] })]
      : []),

    // Installation (conditional)
    ...((quotation.installation || 0) > 0
      ? [new TableRow({ children: [totalsLabel('Installation & Transport:'), totalsValue(formatCurrency(quotation.installation))] })]
      : []),

    // Subtotal
    new TableRow({
      children: [
        totalsLabel('Subtotal:', true, COLOR_BG_LIGHT),
        totalsValue(formatCurrency(totals.subtotal), true, COLOR_BG_LIGHT),
      ],
    }),

    // Discount (conditional)
    ...((quotation.discount || 0) > 0
      ? [new TableRow({
          children: [
            totalsLabel(`Discount (${quotation.discountType === 'percentage' ? `${quotation.discount}%` : 'Fixed'}):`, false, COLOR_WHITE, COLOR_ROSE),
            totalsValue(`-${formatCurrency(totals.discountAmount)}`, false, COLOR_WHITE, COLOR_ROSE),
          ],
        })]
      : []),

    // GST (conditional)
    ...(quotation.gstEnabled
      ? [new TableRow({ children: [totalsLabel(`GST (${quotation.gst}%):`) , totalsValue(formatCurrency(totals.gstAmount))] })]
      : []),

    // Grand Total (highlighted)
    new TableRow({
      children: [
        new TableCell({
          columnSpan: 7,
          shading: { type: ShadingType.SOLID, fill: COLOR_ACCENT },
          borders: cellBdrNone,
          children: [para([txt('GRAND TOTAL:', { bold: true, size: 11, color: COLOR_WHITE })], { align: AlignmentType.RIGHT, spaceAfter: 0 })],
        }),
        new TableCell({
          shading: { type: ShadingType.SOLID, fill: COLOR_ACCENT },
          borders: cellBdrNone,
          children: [para([txt(formatCurrency(totals.grandTotal), { bold: true, size: 11, color: COLOR_WHITE })], { align: AlignmentType.RIGHT, spaceAfter: 0 })],
        }),
      ],
    }),

    // Advance received
    new TableRow({ children: [totalsLabel('Advance Received:', false, COLOR_WHITE, COLOR_EMERALD), totalsValue(formatCurrency(quotation.advance || 0), false, COLOR_WHITE, COLOR_EMERALD)] }),

    // Balance outstanding
    new TableRow({
      children: [
        totalsLabel('Balance Outstanding:', true, COLOR_BG_LIGHT, COLOR_ROSE),
        totalsValue(formatCurrency(totals.balance), true, COLOR_BG_LIGHT, COLOR_ROSE),
      ],
    }),
  ];

  const workTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    columnWidths: COL_W.map(w => Math.round((w / 100) * 9360)), // twips (total ~9360 for A4 - margins)
    borders: {
      top: bdrThin, bottom: bdrThin, left: bdrThin, right: bdrThin,
      insideHorizontal: bdrThin, insideVertical: bdrThin,
    },
    rows: [workHeaderRow, ...itemRows, ...totalsRows],
  });

  // ── Section 6 ─ Amount in Words ───────────────────────────────────────────
  const amountInWordsPara = para(
    [
      txt('Total Amount in Words: ', { bold: true, size: 9.5 }),
      txt(numberToWords(totals.grandTotal), { size: 9.5, italic: true }),
    ],
    { spaceBefore: 160, spaceAfter: 80 }
  );

  // ── Section 7 ─ Remarks ───────────────────────────────────────────────────
  const remarksBlock: Paragraph[] = quotation.remarks
    ? [
        para([txt('ADDITIONAL WORK / REMARKS', { bold: true, size: 10, color: COLOR_PRIMARY })], { spaceBefore: 120, spaceAfter: 40 }),
        para([txt(quotation.remarks, { size: 9, color: COLOR_SECONDARY })], { spaceAfter: 160 }),
      ]
    : [];

  // ── Section 8 ─ Terms & Conditions ───────────────────────────────────────
  const termsBlock: Paragraph[] = (quotation.terms?.length ?? 0) > 0
    ? [
        para([txt('TERMS & CONDITIONS', { bold: true, size: 10, color: COLOR_PRIMARY })], { spaceBefore: 120, spaceAfter: 60 }),
        ...(quotation.terms ?? []).map((term, i) =>
          para(
            [txt(`${i + 1}.  `, { bold: true, size: 8.5, color: COLOR_SECONDARY }), txt(term, { size: 8.5, color: COLOR_SECONDARY })],
            { spaceAfter: 30 }
          )
        ),
      ]
    : [];

  // ── Section 9 ─ Signature Block ───────────────────────────────────────────
  const signTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: bdrNone, bottom: bdrNone, left: bdrNone, right: bdrNone,
      insideHorizontal: bdrNone, insideVertical: bdrNone,
    },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            borders: cellBdrNone,
            children: [
              para([txt('CUSTOMER ACCEPTANCE', { bold: true, size: 9.5, color: COLOR_SECONDARY })], { spaceBefore: 480, spaceAfter: 480 }),
              para([txt('Name:   ______________________________', { size: 9, color: COLOR_SECONDARY })], { spaceAfter: 200 }),
              para([txt('Signature:   _________________________', { size: 9, color: COLOR_SECONDARY })], { spaceAfter: 0 }),
            ],
          }),
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            borders: cellBdrNone,
            children: [
              para([txt(`For  ${co.companyName.toUpperCase()}`, { bold: true, size: 9, color: COLOR_SECONDARY })], { align: AlignmentType.RIGHT, spaceBefore: 480, spaceAfter: 600 }),
              para([txt('Authorized Signatory / Seal', { size: 9, color: COLOR_SECONDARY })], { align: AlignmentType.RIGHT, spaceAfter: 0 }),
            ],
          }),
        ],
      }),
    ],
  });

  // Footer note
  const footerPara = para(
    [txt('Thank you for your business! This is a computer-generated document.', { size: 8, color: COLOR_SECONDARY, italic: true })],
    { align: AlignmentType.CENTER, spaceBefore: 200, spaceAfter: 0 }
  );

  // ── Spacer helper ─────────────────────────────────────────────────────────
  const spacer = para([], { spaceAfter: 200 });

  // ── Assemble Document ─────────────────────────────────────────────────────
  const doc = new Document({
    creator: co.companyName,
    title: `Quotation ${quotation.quotationNumber || ''}`,
    description: `Quotation generated by ${co.companyName}`,
    sections: [
      {
        properties: {
          page: {
            margin: { top: 864, bottom: 864, left: 1080, right: 1080 }, // ~0.6in top/bottom, 0.75in sides
          },
        },
        children: [
          headerTable,
          titlePara,
          metaTable,
          spacer,
          cpTable,
          spacer,
          workTable,
          amountInWordsPara,
          ...remarksBlock,
          ...termsBlock,
          signTable,
          footerPara,
        ],
      },
    ],
  });

  // ── Pack → Blob → Validate → Download ────────────────────────────────────
  const blob = await Packer.toBlob(doc);

  if (!blob || blob.size === 0) {
    throw new Error('Word document generation failed — empty output');
  }

  const filename = `Quotation_${quotation.quotationNumber || 'Draft'}.docx`;
  await downloadBlob(blob, filename, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
}
