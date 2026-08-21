import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

// Fetch the logo and convert to base64 for embedding when needed
export async function urlToBase64(url: string): Promise<string> {
  try {
    const response = await fetch(url);
    if (!response.ok) return '';
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

/**
 * Robust, mobile-safe PDF generator.
 *
 * Rather than capturing an in-place element that may be:
 * - CSS transform-scaled (on mobile screen size)
 * - Inside a hidden tab (`display: none`)
 * - Clipped by overflow or off-screen culling
 *
 * This function clones the target A4 element into a dedicated, standard-width (794px / 210mm)
 * off-screen rendering container attached to document.body. It ensures all fonts and images
 * are loaded before triggering html2canvas at 2× scale, slices the canvas per A4 page cleanly,
 * validates the output blob, and triggers a mobile-compatible download.
 */
export async function downloadQuotationPdf(elementId: string, filename: string): Promise<void> {
  const sourceElement = document.getElementById(elementId);
  if (!sourceElement) {
    throw new Error(`Preview element #${elementId} not found in DOM`);
  }

  // ─── Step 1: Create dedicated standard A4 render host on document.body ────
  const A4_WIDTH_PX = 794; // 210mm at 96 DPI
  const A4_MIN_HEIGHT_PX = 1123; // 297mm at 96 DPI

  const renderHost = document.createElement('div');
  renderHost.id = 'pdf-render-host-temp';
  renderHost.style.position = 'fixed';
  renderHost.style.top = '0';
  renderHost.style.left = '0';
  renderHost.style.width = `${A4_WIDTH_PX}px`;
  renderHost.style.minHeight = `${A4_MIN_HEIGHT_PX}px`;
  renderHost.style.zIndex = '-99999';
  renderHost.style.opacity = '1';
  renderHost.style.pointerEvents = 'none';
  renderHost.style.overflow = 'visible';
  renderHost.style.transform = 'none';
  renderHost.style.backgroundColor = '#ffffff';

  // Clone source element
  const clone = sourceElement.cloneNode(true) as HTMLElement;
  clone.id = `${elementId}-clone`;
  clone.style.width = `${A4_WIDTH_PX}px`;
  clone.style.minHeight = `${A4_MIN_HEIGHT_PX}px`;
  clone.style.transform = 'none';
  clone.style.margin = '0';
  clone.style.boxSizing = 'border-box';
  clone.style.display = 'flex';
  clone.style.flexDirection = 'column';
  clone.style.visibility = 'visible';
  clone.style.contentVisibility = 'visible';

  renderHost.appendChild(clone);
  document.body.appendChild(renderHost);

  try {
    // ─── Step 2: Ensure fonts and images inside clone are fully loaded ────────
    if (document.fonts) {
      await document.fonts.ready;
    }

    const images = Array.from(clone.querySelectorAll('img'));
    await Promise.all(
      images.map(
        (img) =>
          new Promise<void>((resolve) => {
            if (img.complete && img.naturalHeight !== 0) {
              resolve();
            } else {
              img.onload = () => resolve();
              img.onerror = () => resolve(); // continue even if image fails
            }
          })
      )
    );

    // Wait 2 animation frames for browser layout & paint
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
    );

    // Measure total rendered height of the clone
    const cloneHeight = Math.max(clone.scrollHeight, clone.offsetHeight, A4_MIN_HEIGHT_PX);

    // ─── Step 3: Capture clone with html2canvas at 2× resolution ──────────────
    const canvas = await html2canvas(clone, {
      scale: 2,
      useCORS: true,
      logging: false,
      allowTaint: false,
      backgroundColor: '#ffffff',
      width: A4_WIDTH_PX,
      height: cloneHeight,
      windowWidth: A4_WIDTH_PX,
      windowHeight: cloneHeight,
    });

    if (!canvas || canvas.width === 0 || canvas.height === 0) {
      throw new Error('Canvas render produced empty dimensions');
    }

    // ─── Step 4: Build multi-page A4 PDF using clean canvas slicing ───────────
    const pdf = new jsPDF({
      unit: 'mm',
      format: 'a4',
      orientation: 'portrait',
    });

    const margin = 10; // mm
    const pageWidth = pdf.internal.pageSize.getWidth(); // 210 mm
    const pageHeight = pdf.internal.pageSize.getHeight(); // 297 mm
    const printableW = pageWidth - margin * 2; // 190 mm
    const printableH = pageHeight - margin * 2; // 277 mm

    // Number of canvas pixels corresponding to one printable page height
    const pxPerMm = canvas.width / printableW;
    const pageHPx = Math.round(printableH * pxPerMm);
    const totalPages = Math.ceil(canvas.height / pageHPx);

    for (let page = 0; page < totalPages; page++) {
      if (page > 0) pdf.addPage();

      const srcY = page * pageHPx;
      const srcHeight = Math.min(pageHPx, canvas.height - srcY);

      // Off-screen slice canvas
      const sliceCanvas = document.createElement('canvas');
      sliceCanvas.width = canvas.width;
      sliceCanvas.height = pageHPx;

      const ctx = sliceCanvas.getContext('2d')!;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);

      ctx.drawImage(
        canvas,
        0,
        srcY,
        canvas.width,
        srcHeight,
        0,
        0,
        canvas.width,
        srcHeight
      );

      const imgData = sliceCanvas.toDataURL('image/jpeg', 0.95);
      pdf.addImage(imgData, 'JPEG', margin, margin, printableW, printableH);
    }

    // ─── Step 5: Validate Blob output ─────────────────────────────────────────
    const pdfBlob = pdf.output('blob');

    if (!pdfBlob || pdfBlob.size === 0) {
      throw new Error('PDF output blob is empty');
    }

    // ─── Step 6: Download via universal mobile-friendly mechanism ─────────────
    await downloadBlob(pdfBlob, filename, 'application/pdf');
  } catch (error) {
    console.error('Error in downloadQuotationPdf:', error);
    throw new Error('Unable to generate PDF. Please try again.');
  } finally {
    // Clean up temporary rendering host from DOM
    if (renderHost.parentNode) {
      document.body.removeChild(renderHost);
    }
  }
}

/**
 * Universal blob download helper.
 * Uses Web Share API if on mobile device and supported, otherwise standard <a> click.
 */
export async function downloadBlob(
  blob: Blob,
  filename: string,
  _mimeType: string
): Promise<void> {
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();

  // Allow enough time for the browser/mobile OS to initiate the download before revoking
  setTimeout(() => {
    if (a.parentNode) {
      document.body.removeChild(a);
    }
    URL.revokeObjectURL(url);
  }, 4000);
}
