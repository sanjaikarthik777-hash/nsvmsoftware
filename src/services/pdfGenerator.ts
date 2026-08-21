import html2pdf from 'html2pdf.js/dist/html2pdf.min.js';

export async function downloadQuotationPdf(elementId: string, filename: string): Promise<void> {
  const element = document.getElementById(elementId);
  if (!element) {
    throw new Error('Preview element not found');
  }

  // Create configuration options for html2pdf
  const opt = {
    margin: [10, 10, 10, 10] as [number, number, number, number], // top, left, bottom, right in mm
    filename: filename,
    image: { type: 'jpeg' as const, quality: 0.98 },
    html2canvas: { 
      scale: 2, // higher scale for print-ready resolution
      useCORS: true, 
      logging: false 
    },
    jsPDF: { 
      unit: 'mm', 
      format: 'a4', 
      orientation: 'portrait' as const 
    },
    // Avoid page breaking inside key elements like total-rows or signature blocks
    pagebreak: { 
      mode: ['css', 'legacy'], 
      avoid: ['.item-row', '.totals-block', '.signature-section'] 
    }
  };

  try {
    await html2pdf().set(opt).from(element).save();
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw new Error('Failed to generate PDF document. Please try again.');
  }
}
