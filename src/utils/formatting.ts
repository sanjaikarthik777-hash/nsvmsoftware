export function formatCurrency(amount: number): string {
  const rounded = Math.round((amount + Number.EPSILON) * 100) / 100;
  // Use Intl formatting for Indian Rupee
  const formatter = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  
  // Replace narrow no-break space (U+202F) or standard space with empty string after currency symbol
  // some browsers format as '₹ 45,500.00' and others as '₹45,500.00'
  return formatter.format(rounded).replace(/\s/g, '');
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-').map(Number);
  if (!year || !month || !day) return dateStr;
  
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
}

// Convert a number into Indian currency words (e.g., "Forty-Five Thousand Five Hundred Rupees Only")
export function numberToWords(amount: number): string {
  const absoluteAmount = Math.floor(Math.abs(amount));
  const paise = Math.round((Math.abs(amount) - absoluteAmount) * 100);
  
  const singleDigits = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const teenDigits = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const doubleDigits = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  
  function convertLessThanThousand(num: number): string {
    let str = '';
    if (num >= 100) {
      str += singleDigits[Math.floor(num / 100)] + ' Hundred ';
      num %= 100;
    }
    if (num >= 10 && num < 20) {
      str += teenDigits[num - 10] + ' ';
    } else if (num >= 20) {
      str += doubleDigits[Math.floor(num / 10)] + ' ';
      num %= 10;
      if (num > 0) {
        str += singleDigits[num] + ' ';
      }
    } else if (num > 0) {
      str += singleDigits[num] + ' ';
    }
    return str.trim();
  }
  
  if (absoluteAmount === 0) return 'Zero Rupees Only';
  
  let result = '';
  let remaining = absoluteAmount;
  
  // Crores
  if (remaining >= 10000000) {
    const crores = Math.floor(remaining / 10000000);
    result += convertLessThanThousand(crores) + ' Crore ';
    remaining %= 10000000;
  }
  
  // Lakhs
  if (remaining >= 100000) {
    const lakhs = Math.floor(remaining / 100000);
    result += convertLessThanThousand(lakhs) + ' Lakh ';
    remaining %= 100000;
  }
  
  // Thousands
  if (remaining >= 1000) {
    const thousands = Math.floor(remaining / 1000);
    result += convertLessThanThousand(thousands) + ' Thousand ';
    remaining %= 1000;
  }
  
  // Hundreds / Tens / Units
  if (remaining > 0) {
    result += convertLessThanThousand(remaining) + ' ';
  }
  
  result = result.trim() + ' Rupees';
  
  if (paise > 0) {
    result += ' and ' + convertLessThanThousand(paise) + ' Paise';
  }
  
  return result + ' Only';
}
