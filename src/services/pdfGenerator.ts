import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

export async function downloadQuotationPdf(elementId: string, filename: string): Promise<void> {
  const element = document.getElementById(elementId);
  if (!element) {
    throw new Error('Preview element not found');
  }

  try {
    // Render the element to a high-resolution canvas
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      logging: false,
    });

    const imgData = canvas.toDataURL('image/jpeg', 0.98);

    const pdf = new jsPDF({
      unit: 'mm',
      format: 'a4',
      orientation: 'portrait',
    });

    const margin = 10; // mm
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const printableWidth = pageWidth - margin * 2;
    const printableHeight = pageHeight - margin * 2;

    // Scale canvas to fit the printable width
    const imgWidthPx = canvas.width;
    const imgHeightPx = canvas.height;
    const imgHeightMm = (imgHeightPx * printableWidth) / imgWidthPx;

    let remainingHeight = imgHeightMm;
    let pageIndex = 0;

    while (remainingHeight > 0) {
      if (pageIndex > 0) pdf.addPage();

      // y offset in mm within the source image for this page
      const srcYMm = pageIndex * printableHeight;

      pdf.addImage(
        imgData,
        'JPEG',
        margin,              // x on page
        margin - srcYMm,    // y on page (shifts image up for subsequent pages)
        printableWidth,
        imgHeightMm,
      );

      // Clip to the printable area (white out anything outside the margin box)
      // by drawing white rectangles over the overflow regions
      pdf.setFillColor(255, 255, 255);
      pdf.rect(0, 0, pageWidth, margin, 'F');                         // top
      pdf.rect(0, pageHeight - margin, pageWidth, margin, 'F');       // bottom
      pdf.rect(0, 0, margin, pageHeight, 'F');                        // left
      pdf.rect(pageWidth - margin, 0, margin, pageHeight, 'F');       // right

      remainingHeight -= printableHeight;
      pageIndex++;
    }

    pdf.save(filename);
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw new Error('Failed to generate PDF document. Please try again.');
  }
}
