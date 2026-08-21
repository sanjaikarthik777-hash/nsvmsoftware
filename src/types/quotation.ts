export interface CustomerDetails {
  name: string;
  phone: string;
  billingAddress: string;
}

export interface ProjectDetails {
  name: string; // Project / Work
  siteLocation: string;
}

export interface QuotationItem {
  id: string; // UI list key
  description: string;
  length: number | null;
  width: number | null;
  height: number | null;
  area: number | null;
  material: string;
  quantity: number;
  unit: string;
  rate: number;
  amount: number;
}

export interface CompanySnapshot {
  companyName: string;
  tagline: string;
  logo: string; // Base64 representation of company logo
  address: string;
  phone: string;
  email: string;
  gstNumber: string;
  bankName?: string;
  accountName?: string;
  accountNumber?: string;
  ifsc?: string;
  upiId?: string;
}

export type QuotationStatus = 'draft' | 'ready' | 'sent';
export type DiscountType = 'fixed' | 'percentage';

export interface Quotation {
  id?: string; // Auto-incremented or UUID string
  quotationNumber: string;
  date: string; // YYYY-MM-DD
  validUntil: string; // YYYY-MM-DD
  customer: CustomerDetails;
  project: ProjectDetails;
  preparedBy: string;
  items: QuotationItem[];
  remarks: string;
  labour: number;
  installation: number;
  discount: number;
  discountType: DiscountType;
  gst: number; // Percentage, e.g. 18
  gstEnabled: boolean;
  subtotal: number; // Work Subtotal
  grandTotal: number;
  advance: number;
  balance: number;
  paymentMode: string;
  bankUpi?: string;
  terms: string[];
  status: QuotationStatus;
  company: CompanySnapshot;
  createdAt: number; // timestamp
  updatedAt: number; // timestamp
}

export interface BusinessSettings {
  companyName: string;
  tagline: string;
  logo: string; // Base64 logo
  address: string;
  phone: string;
  email: string;
  gstNumber: string;
  
  // Quotation number default config
  prefix: string;
  startingNumber: number;
  defaultValidityDays: number;
  defaultGstPercentage: number;
  defaultTerms: string[];
}

