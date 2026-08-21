import { QuotationItem, DiscountType } from '../types/quotation';

// Round to 2 decimal places to avoid floating point issues
export function roundToTwoDecimals(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export interface CalculationResults {
  itemsSubtotal: number;
  subtotal: number;
  discountAmount: number;
  taxableAmount: number;
  gstAmount: number;
  grandTotal: number;
  balance: number;
}

export function calculateQuotationTotals(params: {
  items: QuotationItem[];
  labour: number;
  installation: number;
  discount: number;
  discountType: DiscountType;
  gstPercentage: number;
  gstEnabled: boolean;
  advance: number;
}): CalculationResults {
  const itemsSubtotal = params.items.reduce((sum, item) => sum + (item.amount || 0), 0);
  
  const labour = params.labour || 0;
  const installation = params.installation || 0;
  
  const subtotal = roundToTwoDecimals(itemsSubtotal + labour + installation);
  
  const discountInput = params.discount || 0;
  let discountAmount = 0;
  if (params.discountType === 'percentage') {
    discountAmount = roundToTwoDecimals(subtotal * (discountInput / 100));
  } else {
    discountAmount = roundToTwoDecimals(discountInput);
  }
  
  // Taxable amount cannot be less than zero
  const taxableAmount = Math.max(0, roundToTwoDecimals(subtotal - discountAmount));
  
  let gstAmount = 0;
  if (params.gstEnabled) {
    const gstPercent = params.gstPercentage || 0;
    gstAmount = roundToTwoDecimals(taxableAmount * (gstPercent / 100));
  }
  
  const grandTotal = roundToTwoDecimals(taxableAmount + gstAmount);
  
  const advance = params.advance || 0;
  const balance = roundToTwoDecimals(grandTotal - advance);
  
  return {
    itemsSubtotal,
    subtotal,
    discountAmount,
    taxableAmount,
    gstAmount,
    grandTotal,
    balance
  };
}

export function calculateArea(length: number | null, width: number | null, _height: number | null): number | null {
  if (length === null || width === null) return null;
  // If height is provided, calculate volume or 3D area, but traditionally:
  // for flat grills/gates: Area = Length * Width.
  // If height is also provided, we can either do length * width * height or length * width.
  // Usually, in fabrication, Area = Length * Width. Height might be a third dimension for reference,
  // or it could be Length * Height if Width is thickness.
  // Let's assume Area = Length * Width. If height is supplied and width is null, maybe Length * Height.
  // We'll suggest Length * Width as standard, but allow the user to override.
  const l = Number(length) || 0;
  const w = Number(width) || 1; // Default to 1 if not specified to avoid zeroing out
  return roundToTwoDecimals(l * w);
}
