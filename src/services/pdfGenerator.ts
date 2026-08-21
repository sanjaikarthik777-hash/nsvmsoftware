import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

export async function downloadQuotationPdf(elementId: string, filename: string): Promise<void> {
  const element = document.getElementById(elementId);
  if (!element) {
    throw new Error('Preview element not found');
  }

  // ─── Step 1: Temporarily force full-scale rendering ───────────────────────
  // The preview uses CSS transform:scale() for responsive display.
  // html2canvas captures the element AS RENDERED — so on mobile (scale ~0.4)
  // the captured image is tiny / almost blank.
  // We temporarily reset the transform so html2canvas always sees the full A4.
  const scaleWrapper = element.parentElement as HTMLElement | null;
  const originalTransform = scaleWrapper?.style.transform ?? '';
  const originalTransformOrigin = scaleWrapper?.style.transformOrigin ?? '';

  if (scaleWrapper) {
    scaleWrapper.style.transform = 'scale(1)';
    scaleWrapper.style.transformOrigin = 'top left';
  }

  // Also temporarily remove contentVisibility:auto which skips off-screen rendering
  const originalContentVisibility = element.style.contentVisibility;
  element.style.contentVisibility = 'visible';

  // Allow the browser one frame to apply the style change before capturing
  await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));

  try {
    // ─── Step 2: Capture the element at 2× resolution ─────────────────────
    const canvas = await html2canvas(element, {
      scale: 2,              // 2× for crisp text on retina / high-DPI screens
      useCORS: true,
      logging: false,
      allowTaint: false,
      backgroundColor: '#ffffff',
      // Capture the full scrollHeight so nothing is clipped
      height: element.scrollHeight,
      windowHeight: element.scrollHeight,
    });

    // ─── Step 3: Build the PDF, slicing the canvas per A4 page ───────────
    const pdf = new jsPDF({
      unit: 'mm',
      format: 'a4',
      orientation: 'portrait',
    });

    const margin = 10; // mm
    const pageWidth  = pdf.internal.pageSize.getWidth();   // 210 mm
    const pageHeight = pdf.internal.pageSize.getHeight();  // 297 mm
    const printableW = pageWidth  - margin * 2;            // 190 mm
    const printableH = pageHeight - margin * 2;            // 277 mm

    // How many canvas pixels represent one page's printable height?
    // canvas.width maps to printableW mm → px-per-mm = canvas.width / printableW
    const pxPerMm   = canvas.width / printableW;
    const pageHPx   = Math.round(printableH * pxPerMm);   // canvas pixels per page
    const totalPages = Math.ceil(canvas.height / pageHPx);

    for (let page = 0; page < totalPages; page++) {
      if (page > 0) pdf.addPage();

      const srcY      = page * pageHPx;
      const srcHeight = Math.min(pageHPx, canvas.height - srcY); // last page may be shorter

      // Create an off-screen canvas for this page's slice
      const sliceCanvas  = document.createElement('canvas');
      sliceCanvas.width  = canvas.width;
      sliceCanvas.height = pageHPx; // always full page height (last slice padded with white)

      const ctx = sliceCanvas.getContext('2d')!;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height); // white background

      // Draw just this page's slice of the source canvas
      ctx.drawImage(
        canvas,
        0, srcY,              // source x, y
        canvas.width, srcHeight, // source width, height
        0, 0,                 // dest x, y
        canvas.width, srcHeight, // dest width, height
      );

      const imgData = sliceCanvas.toDataURL('image/jpeg', 0.95);
      pdf.addImage(imgData, 'JPEG', margin, margin, printableW, printableH);
    }

    pdf.save(filename);
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw new Error('Failed to generate PDF document. Please try again.');
  } finally {
    // ─── Step 4: Always restore the original styles ────────────────────────
    if (scaleWrapper) {
      scaleWrapper.style.transform = originalTransform;
      scaleWrapper.style.transformOrigin = originalTransformOrigin;
    }
    element.style.contentVisibility = originalContentVisibility;
  }
}
