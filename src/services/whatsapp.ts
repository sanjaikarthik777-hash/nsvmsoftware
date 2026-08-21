import { Quotation } from '../types/quotation';
import { formatCurrency } from '../utils/formatting';
import { calculateQuotationTotals } from '../utils/calculations';

export function getWhatsAppUrl(quotation: Quotation): string {
  const totals = calculateQuotationTotals({
    items: quotation.items || [],
    labour: quotation.labour || 0,
    installation: quotation.installation || 0,
    discount: quotation.discount || 0,
    discountType: quotation.discountType || 'percentage',
    gstPercentage: quotation.gst || 0,
    gstEnabled: quotation.gstEnabled || false,
    advance: quotation.advance || 0
  });

  const formattedTotal = formatCurrency(totals.grandTotal);
  const formattedBalance = formatCurrency(totals.balance);

  // Itemized summary list
  const itemLines = (quotation.items || []).map((item, i) => {
    const desc = item.description ? item.description.trim() : `Item ${i + 1}`;
    const qtyUnit = `${item.quantity} ${item.unit}`;
    const amt = formatCurrency(item.amount || 0);
    return `• *${desc}* (${qtyUnit}) - ${amt}`;
  });

  const messageLines = [
    `*QUOTATION FROM ${quotation.company?.companyName || 'NSVM INDUSTRIES'}*`,
    `----------------------------------------`,
    `📄 *Quotation No:* ${quotation.quotationNumber}`,
    `📅 *Date:* ${quotation.date || ''}`,
    `👤 *Customer:* ${quotation.customer?.name || 'N/A'}`,
    `🏗️ *Project:* ${quotation.project?.name || 'N/A'}`,
    '',
    `*Work Details:*`,
    ...itemLines,
    '',
    `----------------------------------------`,
    `💰 *Grand Total:* ${formattedTotal}`,
    `💵 *Advance Paid:* ${formatCurrency(quotation.advance || 0)}`,
    `🔴 *Balance Due:* ${formattedBalance}`,
    `----------------------------------------`,
    '',
    `📞 Phone: ${quotation.company?.phone || ''}`,
    `📧 Email: ${quotation.company?.email || ''}`,
    '',
    'Thank you for choosing NSVM INDUSTRIES!'
  ];

  const text = encodeURIComponent(messageLines.join('\n'));

  // Clean customer phone number
  let phone = quotation.customer?.phone ? quotation.customer.phone.trim() : '';
  if (phone) {
    phone = phone.replace(/\D/g, '');
    if (phone.length === 10) {
      phone = '91' + phone;
    }
  }

  if (phone) {
    return `https://wa.me/${phone}?text=${text}`;
  } else {
    return `https://wa.me/?text=${text}`;
  }
}

export function shareViaWhatsApp(quotation: Quotation): void {
  const url = getWhatsAppUrl(quotation);
  // Open synchronously inside the click handler to prevent browser popup blocking
  const win = window.open(url, '_blank');
  if (!win) {
    // Fallback if popup blocker catches window.open
    const a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
}

