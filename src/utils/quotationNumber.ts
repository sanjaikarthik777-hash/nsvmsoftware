import { db } from '../db/dexie';

function padNumber(num: number): string {
  if (num < 10) return `00${num}`;
  if (num < 100) return `0${num}`;
  return `${num}`;
}

export async function generateNextQuotationNumber(prefix: string, startingNumber: number): Promise<string> {
  const quotations = await db.quotations.toArray();
  
  // Find numbers that match the current prefix
  const matchingNumbers = quotations
    .map(q => q.quotationNumber)
    .filter(num => num.startsWith(prefix));
    
  if (matchingNumbers.length === 0) {
    return `${prefix}${padNumber(startingNumber)}`;
  }
  
  // Parse numeric suffixes
  const numericSuffixes = matchingNumbers.map(num => {
    const suffixStr = num.slice(prefix.length);
    const parsed = parseInt(suffixStr, 10);
    return isNaN(parsed) ? 0 : parsed;
  });
  
  const maxNumber = Math.max(...numericSuffixes, 0);
  const nextNumber = Math.max(maxNumber + 1, startingNumber);
  
  return `${prefix}${padNumber(nextNumber)}`;
}
