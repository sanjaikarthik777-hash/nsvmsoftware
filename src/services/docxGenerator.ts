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
  VerticalAlign
} from 'docx';
import { Quotation } from '../types/quotation';
import { formatCurrency, formatDate } from '../utils/formatting';
import { calculateQuotationTotals } from '../utils/calculations';

// Professional styling colors
const COLOR_PRIMARY = '0F172A';   // Dark Slate
const COLOR_SECONDARY = '475569'; // Muted Slate
const COLOR_BORDER = 'E2E8F0';    // Light Gray
const COLOR_BG_HEADER = 'F8FAFC'; // Off-white/slate-50
const COLOR_WHITE = 'FFFFFF';

// Simple text run helper
function createTextRun(text: string, options: { bold?: boolean; size?: number; color?: string; italic?: boolean } = {}): TextRun {
  return new TextRun({
    text,
    bold: options.bold,
    size: options.size ? options.size * 2 : 20, // docx uses half-points (e.g. 10pt = 20)
    color: options.color || COLOR_PRIMARY,
    italics: options.italic
  });
}

// Simple paragraph helper
function createParagraph(children: TextRun[], options: { alignment?: any; spaceAfter?: number } = {}): Paragraph {
  return new Paragraph({
    alignment: options.alignment || AlignmentType.LEFT,
    spacing: { after: options.spaceAfter || 100 },
    children
  });
}

// Clean border configuration
const borderNone = { style: BorderStyle.NONE, size: 0, color: 'auto' };
const borderThin = { style: BorderStyle.SINGLE, size: 4, color: COLOR_BORDER };

export async function downloadQuotationDocx(quotation: Quotation): Promise<void> {
  const totals = calculateQuotationTotals({
    items: quotation.items,
    labour: quotation.labour,
    installation: quotation.installation,
    discount: quotation.discount,
    discountType: quotation.discountType,
    gstPercentage: quotation.gst,
    gstEnabled: quotation.gstEnabled,
    advance: quotation.advance
  });

  // 1. Company Header Paragraphs
  const companyHeaderParagraphs = [
    createParagraph([
      createTextRun(quotation.company.companyName, { bold: true, size: 18, color: COLOR_PRIMARY })
    ], { alignment: AlignmentType.CENTER, spaceAfter: 50 }),
    
    createParagraph([
      createTextRun(quotation.company.tagline, { italic: true, size: 10, color: COLOR_SECONDARY })
    ], { alignment: AlignmentType.CENTER, spaceAfter: 150 }),
    
    createParagraph([
      createTextRun(`${quotation.company.address}  |  Phone: ${quotation.company.phone}  |  Email: ${quotation.company.email}`, { size: 9, color: COLOR_SECONDARY })
    ], { alignment: AlignmentType.CENTER, spaceAfter: 50 }),
    
    quotation.company.gstNumber ? createParagraph([
      createTextRun(`GSTIN: ${quotation.company.gstNumber}`, { bold: true, size: 9, color: COLOR_SECONDARY })
    ], { alignment: AlignmentType.CENTER, spaceAfter: 150 }) : null
  ].filter(Boolean) as Paragraph[];

  // 2. Title Paragraph
  const titleParagraph = createParagraph([
    createTextRun('QUOTATION', { bold: true, size: 16, color: COLOR_PRIMARY })
  ], { alignment: AlignmentType.CENTER, spaceAfter: 200 });

  // 3. Meta Data Table (Quotation No, Date, Validity)
  const metaTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: borderThin,
      bottom: borderThin,
      left: borderNone,
      right: borderNone,
      insideHorizontal: borderNone,
      insideVertical: borderNone
    },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            verticalAlign: VerticalAlign.CENTER,
            children: [
              createParagraph([
                createTextRun('Quotation No: ', { bold: true, size: 10 }),
                createTextRun(quotation.quotationNumber, { size: 10 })
              ], { spaceAfter: 40 }),
              createParagraph([
                createTextRun('Date: ', { bold: true, size: 10 }),
                createTextRun(formatDate(quotation.date), { size: 10 })
              ], { spaceAfter: 0 })
            ]
          }),
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            verticalAlign: VerticalAlign.CENTER,
            children: [
              createParagraph([
                createTextRun('Valid Until: ', { bold: true, size: 10 }),
                createTextRun(formatDate(quotation.validUntil), { size: 10 })
              ], { alignment: AlignmentType.RIGHT, spaceAfter: 40 }),
              createParagraph([
                createTextRun('Prepared By: ', { bold: true, size: 10 }),
                createTextRun(quotation.preparedBy || 'N/A', { size: 10 })
              ], { alignment: AlignmentType.RIGHT, spaceAfter: 0 })
            ]
          })
        ]
      })
    ]
  });

  // Separator paragraph
  const spacer = createParagraph([], { spaceAfter: 150 });

  // 4. Customer & Project Details Table
  const customerProjectTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: borderThin,
      bottom: borderThin,
      left: borderThin,
      right: borderThin,
      insideHorizontal: borderNone,
      insideVertical: borderThin
    },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            shading: { fill: COLOR_BG_HEADER },
            children: [
              createParagraph([createTextRun('CUSTOMER DETAILS', { bold: true, size: 10 })], { spaceAfter: 50 })
            ]
          }),
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            shading: { fill: COLOR_BG_HEADER },
            children: [
              createParagraph([createTextRun('PROJECT DETAILS', { bold: true, size: 10 })], { spaceAfter: 50 })
            ]
          })
        ]
      }),
      new TableRow({
        children: [
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            children: [
              createParagraph([createTextRun(quotation.customer.name, { bold: true, size: 10 })], { spaceAfter: 40 }),
              quotation.customer.phone ? createParagraph([
                createTextRun('Phone: ', { bold: true, size: 9, color: COLOR_SECONDARY }),
                createTextRun(quotation.customer.phone, { size: 9, color: COLOR_SECONDARY })
              ], { spaceAfter: 40 }) : null,
              quotation.customer.billingAddress ? createParagraph([
                createTextRun('Address: ', { bold: true, size: 9, color: COLOR_SECONDARY }),
                createTextRun(quotation.customer.billingAddress, { size: 9, color: COLOR_SECONDARY })
              ], { spaceAfter: 0 }) : null
            ].filter(Boolean) as Paragraph[]
          }),
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            children: [
              createParagraph([
                createTextRun('Project: ', { bold: true, size: 9, color: COLOR_SECONDARY }),
                createTextRun(quotation.project.name, { size: 9 })
              ], { spaceAfter: 40 }),
              quotation.project.siteLocation ? createParagraph([
                createTextRun('Site Location: ', { bold: true, size: 9, color: COLOR_SECONDARY }),
                createTextRun(quotation.project.siteLocation, { size: 9 })
              ], { spaceAfter: 0 }) : null
            ].filter(Boolean) as Paragraph[]
          })
        ]
      })
    ]
  });

  // 5. Work Specification Table Header
  const workTableHeaderRow = new TableRow({
    children: [
      new TableCell({ width: { size: 5, type: WidthType.PERCENTAGE }, shading: { fill: COLOR_PRIMARY }, children: [createParagraph([createTextRun('#', { bold: true, color: COLOR_WHITE, size: 9 })], { spaceAfter: 0, alignment: AlignmentType.CENTER })] }),
      new TableCell({ width: { size: 30, type: WidthType.PERCENTAGE }, shading: { fill: COLOR_PRIMARY }, children: [createParagraph([createTextRun('Description', { bold: true, color: COLOR_WHITE, size: 9 })], { spaceAfter: 0 })] }),
      new TableCell({ width: { size: 18, type: WidthType.PERCENTAGE }, shading: { fill: COLOR_PRIMARY }, children: [createParagraph([createTextRun('Dimensions', { bold: true, color: COLOR_WHITE, size: 9 })], { spaceAfter: 0, alignment: AlignmentType.CENTER })] }),
      new TableCell({ width: { size: 10, type: WidthType.PERCENTAGE }, shading: { fill: COLOR_PRIMARY }, children: [createParagraph([createTextRun('Area', { bold: true, color: COLOR_WHITE, size: 9 })], { spaceAfter: 0, alignment: AlignmentType.RIGHT })] }),
      new TableCell({ width: { size: 10, type: WidthType.PERCENTAGE }, shading: { fill: COLOR_PRIMARY }, children: [createParagraph([createTextRun('Material', { bold: true, color: COLOR_WHITE, size: 9 })], { spaceAfter: 0, alignment: AlignmentType.CENTER })] }),
      new TableCell({ width: { size: 7, type: WidthType.PERCENTAGE }, shading: { fill: COLOR_PRIMARY }, children: [createParagraph([createTextRun('Qty', { bold: true, color: COLOR_WHITE, size: 9 })], { spaceAfter: 0, alignment: AlignmentType.CENTER })] }),
      new TableCell({ width: { size: 10, type: WidthType.PERCENTAGE }, shading: { fill: COLOR_PRIMARY }, children: [createParagraph([createTextRun('Rate (₹)', { bold: true, color: COLOR_WHITE, size: 9 })], { spaceAfter: 0, alignment: AlignmentType.RIGHT })] }),
      new TableCell({ width: { size: 10, type: WidthType.PERCENTAGE }, shading: { fill: COLOR_PRIMARY }, children: [createParagraph([createTextRun('Amount (₹)', { bold: true, color: COLOR_WHITE, size: 9 })], { spaceAfter: 0, alignment: AlignmentType.RIGHT })] })
    ]
  });

  // Dynamic Rows
  const itemRows = quotation.items.map((item, index) => {
    // Format dimensions
    let dimStr = '-';
    if (item.length !== null || item.width !== null || item.height !== null) {
      const parts = [
        item.length !== null ? `${item.length}L` : '',
        item.width !== null ? `${item.width}W` : '',
        item.height !== null ? `${item.height}H` : ''
      ].filter(Boolean);
      dimStr = parts.join(' x ');
    }
    
    const areaStr = item.area !== null ? `${item.area} ${item.unit}` : '-';

    return new TableRow({
      children: [
        new TableCell({ width: { size: 5, type: WidthType.PERCENTAGE }, children: [createParagraph([createTextRun((index + 1).toString(), { size: 9 })], { spaceAfter: 0, alignment: AlignmentType.CENTER })] }),
        new TableCell({ width: { size: 30, type: WidthType.PERCENTAGE }, children: [createParagraph([createTextRun(item.description, { size: 9, bold: true })], { spaceAfter: 0 })] }),
        new TableCell({ width: { size: 18, type: WidthType.PERCENTAGE }, children: [createParagraph([createTextRun(dimStr, { size: 9 })], { spaceAfter: 0, alignment: AlignmentType.CENTER })] }),
        new TableCell({ width: { size: 10, type: WidthType.PERCENTAGE }, children: [createParagraph([createTextRun(areaStr, { size: 9 })], { spaceAfter: 0, alignment: AlignmentType.RIGHT })] }),
        new TableCell({ width: { size: 10, type: WidthType.PERCENTAGE }, children: [createParagraph([createTextRun(item.material || '-', { size: 9 })], { spaceAfter: 0, alignment: AlignmentType.CENTER })] }),
        new TableCell({ width: { size: 7, type: WidthType.PERCENTAGE }, children: [createParagraph([createTextRun(`${item.quantity} ${item.unit}`, { size: 9 })], { spaceAfter: 0, alignment: AlignmentType.CENTER })] }),
        new TableCell({ width: { size: 10, type: WidthType.PERCENTAGE }, children: [createParagraph([createTextRun(formatCurrency(item.rate).replace('₹', ''), { size: 9 })], { spaceAfter: 0, alignment: AlignmentType.RIGHT })] }),
        new TableCell({ width: { size: 10, type: WidthType.PERCENTAGE }, children: [createParagraph([createTextRun(formatCurrency(item.amount).replace('₹', ''), { size: 9, bold: true })], { spaceAfter: 0, alignment: AlignmentType.RIGHT })] })
      ]
    });
  });

  // Totals Section Sub-table (or appended rows)
  const totalLabelCell = (text: string, bold = false) => new TableCell({
    width: { size: 80, type: WidthType.PERCENTAGE },
    columnSpan: 7,
    children: [createParagraph([createTextRun(text, { bold, size: 9 })], { spaceAfter: 0, alignment: AlignmentType.RIGHT })]
  });

  const totalValueCell = (text: string, bold = false) => new TableCell({
    width: { size: 20, type: WidthType.PERCENTAGE },
    children: [createParagraph([createTextRun(text, { bold, size: 9 })], { spaceAfter: 0, alignment: AlignmentType.RIGHT })]
  });

  const totalsRows = [
    new TableRow({
      children: [
        totalLabelCell('Work Subtotal:'),
        totalValueCell(formatCurrency(totals.itemsSubtotal))
      ]
    }),
    quotation.labour > 0 ? new TableRow({
      children: [
        totalLabelCell('Labour / Fabrication charges:'),
        totalValueCell(formatCurrency(quotation.labour))
      ]
    }) : null,
    quotation.installation > 0 ? new TableRow({
      children: [
        totalLabelCell('Installation / Transport charges:'),
        totalValueCell(formatCurrency(quotation.installation))
      ]
    }) : null,
    new TableRow({
      children: [
        totalLabelCell('Subtotal:', true),
        totalValueCell(formatCurrency(totals.subtotal), true)
      ]
    }),
    quotation.discount > 0 ? new TableRow({
      children: [
        totalLabelCell(`Discount (${quotation.discountType === 'percentage' ? `${quotation.discount}%` : 'Fixed'}):`),
        totalValueCell(`- ${formatCurrency(totals.discountAmount)}`)
      ]
    }) : null,
    quotation.gstEnabled ? new TableRow({
      children: [
        totalLabelCell(`GST (${quotation.gst}%):`),
        totalValueCell(formatCurrency(totals.gstAmount))
      ]
    }) : null,
    new TableRow({
      children: [
        new TableCell({
          width: { size: 80, type: WidthType.PERCENTAGE },
          columnSpan: 7,
          shading: { fill: COLOR_BG_HEADER },
          children: [createParagraph([createTextRun('GRAND TOTAL:', { bold: true, size: 10 })], { spaceAfter: 0, alignment: AlignmentType.RIGHT })]
        }),
        new TableCell({
          width: { size: 20, type: WidthType.PERCENTAGE },
          shading: { fill: COLOR_BG_HEADER },
          children: [createParagraph([createTextRun(formatCurrency(totals.grandTotal), { bold: true, size: 10, color: COLOR_PRIMARY })], { spaceAfter: 0, alignment: AlignmentType.RIGHT })]
        })
      ]
    }),
    new TableRow({
      children: [
        totalLabelCell('Advance Received:'),
        totalValueCell(formatCurrency(quotation.advance))
      ]
    }),
    new TableRow({
      children: [
        totalLabelCell('Balance Outstanding:', true),
        totalValueCell(formatCurrency(totals.balance), true)
      ]
    })
  ].filter(Boolean) as TableRow[];

  const workTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: borderThin,
      bottom: borderThin,
      left: borderThin,
      right: borderThin,
      insideHorizontal: borderThin,
      insideVertical: borderThin
    },
    rows: [
      workTableHeaderRow,
      ...itemRows,
      ...totalsRows
    ]
  });

  // 6. Additional Remarks Section
  const remarksBlock = quotation.remarks ? [
    createParagraph([createTextRun('ADDITIONAL WORK / REMARKS', { bold: true, size: 10 })], { spaceAfter: 50 }),
    createParagraph([createTextRun(quotation.remarks, { size: 9, color: COLOR_SECONDARY })], { spaceAfter: 150 })
  ] : [];

  // 7. Terms & Conditions
  const termsBlock = quotation.terms && quotation.terms.length > 0 ? [
    createParagraph([createTextRun('TERMS & CONDITIONS', { bold: true, size: 10 })], { spaceAfter: 50 }),
    ...quotation.terms.map((term, index) => 
      createParagraph([
        createTextRun(`${index + 1}. `, { bold: true, size: 8.5, color: COLOR_SECONDARY }),
        createTextRun(term, { size: 8.5, color: COLOR_SECONDARY })
      ], { spaceAfter: 20 })
    ),
    createParagraph([], { spaceAfter: 250 })
  ] : [];

  // 9. Signatures Block
  const signatureTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: borderNone, bottom: borderNone, left: borderNone, right: borderNone,
      insideHorizontal: borderNone, insideVertical: borderNone
    },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            children: [
              createParagraph([
                createTextRun('CUSTOMER ACCEPTANCE', { bold: true, size: 10, color: COLOR_SECONDARY })
              ], { spaceAfter: 400 }),
              createParagraph([
                createTextRun('Name: __________________________', { size: 9, color: COLOR_SECONDARY })
              ], { spaceAfter: 200 }),
              createParagraph([
                createTextRun('Signature: ______________________', { size: 9, color: COLOR_SECONDARY })
              ], { spaceAfter: 0 })
            ]
          }),
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            children: [
              createParagraph([
                createTextRun(`for ${quotation.company.companyName.toUpperCase()}`, { bold: true, size: 9, color: COLOR_SECONDARY })
              ], { alignment: AlignmentType.RIGHT, spaceAfter: 500 }),
              createParagraph([
                createTextRun('Authorized Signatory / Seal', { size: 9, color: COLOR_SECONDARY })
              ], { alignment: AlignmentType.RIGHT, spaceAfter: 0 })
            ]
          })
        ]
      })
    ]
  });

  // Construct Document Object
  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1080,    // 0.75 in
              bottom: 1080,
              left: 1080,
              right: 1080
            }
          }
        },
        children: [
          ...companyHeaderParagraphs,
          titleParagraph,
          metaTable,
          spacer,
          customerProjectTable,
          spacer,
          workTable,
          spacer,
          ...remarksBlock,
          ...termsBlock,
          signatureTable
        ]
      }
    ]
  });

  try {
    // Generate and Download the file
    const blob = await Packer.toBlob(doc);
    const filename = `Quotation_${quotation.quotationNumber}.docx`;
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error generating DOCX:', error);
    throw new Error('Failed to generate Word document. Please try again.');
  }
}
