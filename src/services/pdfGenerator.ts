import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

// Fetch the logo and convert to base64 for embedding in PDFs when needed
async function urlToBase64(url: string): Promise<string> {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return '';
  }
}

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
  const originalPosition = scaleWrapper?.style.position ?? '';

  if (scaleWrapper) {
    scaleWrapper.style.transform = 'scale(1)';
    scaleWrapper.style.transformOrigin = 'top left';
    // Ensure the wrapper is visible to html2canvas even when off-screen
    scaleWrapper.style.position = 'fixed';
  }

  // Also temporarily remove contentVisibility:auto which skips off-screen rendering
  const originalContentVisibility = element.style.contentVisibility;
  element.style.contentVisibility = 'visible';

  // Allow two animation frames so the browser applies the style change before capturing
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

    // Validate canvas has content
    if (canvas.width === 0 || canvas.height === 0) {
      throw new Error('Captured canvas is empty');
    }

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
    const pxPerMm   = canvas.width / printableW;
    const pageHPx   = Math.round(printableH * pxPerMm);   // canvas pixels per page
    const totalPages = Math.ceil(canvas.height / pageHPx);

    for (let page = 0; page < totalPages; page++) {
      if (page > 0) pdf.addPage();

      const srcY      = page * pageHPx;
      const srcHeight = Math.min(pageHPx, canvas.height - srcY);

      // Create an off-screen canvas for this page's slice
      const sliceCanvas  = document.createElement('canvas');
      sliceCanvas.width  = canvas.width;
      sliceCanvas.height = pageHPx;

      const ctx = sliceCanvas.getContext('2d')!;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);

      ctx.drawImage(
        canvas,
        0, srcY,
        canvas.width, srcHeight,
        0, 0,
        canvas.width, srcHeight,
      );

      const imgData = sliceCanvas.toDataURL('image/jpeg', 0.95);
      pdf.addImage(imgData, 'JPEG', margin, margin, printableW, printableH);
    }

    // ─── Step 4: Generate blob and validate ───────────────────────────────
    const pdfBlob = pdf.output('blob');

    if (!pdfBlob || pdfBlob.size === 0) {
      throw new Error('PDF generation failed — empty output');
    }

    // ─── Step 5: Download with mobile-compatible method ───────────────────
    await downloadBlob(pdfBlob, filename, 'application/pdf');

  } catch (error) {
    console.error('Error generating PDF:', error);
    throw new Error('Unable to generate PDF. Please try again.');
  } finally {
    // ─── Always restore the original styles ───────────────────────────────
    if (scaleWrapper) {
      scaleWrapper.style.transform = originalTransform;
      scaleWrapper.style.transformOrigin = originalTransformOrigin;
      scaleWrapper.style.position = originalPosition;
    }
    element.style.contentVisibility = originalContentVisibility;
  }
}

/**
 * Universal blob download helper.
 * On mobile browsers that support the Web Share API with file sharing,
 * we offer the share sheet (so it goes to Files, WhatsApp, etc.).
 * On desktop / unsupported mobile browsers we use a regular anchor download.
 */
export async function downloadBlob(blob: Blob, filename: string, mimeType: string): Promise<void> {
  const file = new File([blob], filename, { type: mimeType });

  // Try Web Share API (works on Android Chrome, iOS Safari 15.1+)
  if (
    typeof navigator.share === 'function' &&
    typeof navigator.canShare === 'function' &&
    navigator.canShare({ files: [file] })
  ) {
    try {
      await navigator.share({ files: [file], title: filename });
      return; // success via share sheet
    } catch (err: any) {
      // User cancelled the share dialog — fall through to anchor download
      if (err?.name === 'AbortError') {
        return;
      }
      // Other share errors — fall through to anchor download
    }
  }

  // Standard anchor-based download (desktop + most mobile browsers)
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  // Revoke after a short delay so the browser has time to start the download
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

// Re-export urlToBase64 for use in docxGenerator
export { urlToBase64 };
