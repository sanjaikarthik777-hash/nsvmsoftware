import Dexie, { type Table } from 'dexie';
import { Quotation, BusinessSettings } from '../types/quotation';

export class NsvmDatabase extends Dexie {
  quotations!: Table<Quotation>;
  settings!: Table<{ key: string; value: any }>;

  constructor() {
    super('NsvmDatabase');
    this.version(1).stores({
      quotations: 'id, quotationNumber, date, status, createdAt',
      settings: 'key',
    });
  }
}

export const db = new NsvmDatabase();

// Default initial settings
export const DEFAULT_SETTINGS: BusinessSettings = {
  companyName: 'NSVM INDUSTRIES',
  tagline: 'Quality Fabrication & Engineering Works',
  logo: '', // Seeded at runtime from /nsvm-logo.png
  address: 'Plot No. 42, Industrial Area, Sector 5, Gandhinagar, Gujarat - 382010',
  phone: '+91 98765 43210',
  email: 'info@nsvmindustries.com',
  gstNumber: '24AAACN1234F1Z5',
  prefix: 'NSVM-',
  startingNumber: 100,
  defaultValidityDays: 30,
  defaultGstPercentage: 18,
  defaultTerms: [
    'Final measurements will be confirmed at site before fabrication.',
    'Work will begin after quotation approval and agreed advance payment.',
    'Design changes or additional work will be charged separately.',
    'Delivery, installation and transport will be as specified in the quotation.',
    'This quotation is valid until the stated validity date.',
    'Balance payment is due as mutually agreed.'
  ]
};

// Convert a URL to a Base64 data URL
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

// Seeding function
export async function initializeDatabase() {
  const count = await db.settings.count();
  if (count === 0) {
    // Fetch the NSVM logo and embed it as the default company logo
    const logoBase64 = await urlToBase64('/nsvm-logo.png');
    await db.settings.add({
      key: 'business_info',
      value: { ...DEFAULT_SETTINGS, logo: logoBase64 }
    });
  }
}
