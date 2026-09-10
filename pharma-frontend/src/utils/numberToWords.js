/**
 * Convert number to Indian currency words
 * e.g., 923 => "Nine Hundred Twenty Three only"
 */
export function numberToWords(num) {
  const n = Math.round(Number(num) || 0);
  if (n === 0) return 'Zero only';
  if (n < 0) return 'Minus ' + numberToWords(Math.abs(n));

  const units = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function convertChunk(val) {
    let str = '';
    if (val >= 100) {
      str += units[Math.floor(val / 100)] + ' Hundred ';
      val %= 100;
    }
    if (val >= 20) {
      str += tens[Math.floor(val / 10)] + ' ';
      val %= 10;
    }
    if (val > 0) {
      str += units[val] + ' ';
    }
    return str.trim();
  }

  let words = '';
  const crore = Math.floor(n / 10000000);
  let remainder = n % 10000000;

  const lakh = Math.floor(remainder / 100000);
  remainder = remainder % 100000;

  const thousand = Math.floor(remainder / 1000);
  remainder = remainder % 1000;

  if (crore > 0) {
    words += convertChunk(crore) + ' Crore ';
  }
  if (lakh > 0) {
    words += convertChunk(lakh) + ' Lakh ';
  }
  if (thousand > 0) {
    words += convertChunk(thousand) + ' Thousand ';
  }
  if (remainder > 0) {
    words += convertChunk(remainder) + ' ';
  }

  return 'Rs. ' + words.trim() + ' only';
}
