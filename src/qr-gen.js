import QRCode from 'qrcode';

/**
 * ถอดราคาเต็มจากบาร์โค้ด 13 หลัก (format: 2 PPPPPP NNNNN C)
 * digits 8-12 = ราคา × 100
 */
export function decodeBarcode(barcode) {
  const b = barcode.replace(/\D/g, '');
  if (b.length !== 13 || b[0] !== '2') return null;

  const plu = b.slice(1, 7);
  const priceRaw = parseInt(b.slice(7, 12), 10);
  const price = priceRaw / 100;

  return { plu, price, raw: b };
}

/**
 * ปัดขึ้นหาจุดทศนิยมที่ใกล้ที่สุด (.00 .25 .50 .75)
 */
export function roundToQuarter(value) {
  return Math.ceil(value * 4) / 4;
}

/**
 * คำนวณราคาหลังลด
 */
export function calcSalePrice(fullPrice, pct) {
  return roundToQuarter(fullPrice * (1 - pct / 100));
}

/**
 * คำนวณ EAN-13 check digit
 */
function ean13Check(digits12) {
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(digits12[i]) * (i % 2 === 0 ? 1 : 3);
  }
  return (10 - (sum % 10)) % 10;
}

/**
 * สร้างบาร์โค้ด 13 หลักใหม่ที่มีราคาลดแล้ว
 */
export function buildDiscountBarcode(plu, salePrice) {
  const priceInt = Math.round(salePrice * 100);
  const priceStr = priceInt.toString().padStart(5, '0');
  const base12 = '2' + plu + priceStr;
  const check = ean13Check(base12);
  return base12 + check;
}

/**
 * วาด QR code ลงบน canvas element
 */
export async function renderQR(canvas, text, size = 200) {
  await QRCode.toCanvas(canvas, text, {
    width: size,
    margin: 1,
    errorCorrectionLevel: 'M',
    color: { dark: '#000000', light: '#ffffff' },
  });
}

/**
 * สร้าง QR data URL (สำหรับ PDF)
 */
export async function qrToDataURL(text, size = 180) {
  return await QRCode.toDataURL(text, {
    width: size,
    margin: 1,
    errorCorrectionLevel: 'M',
    color: { dark: '#000000', light: '#ffffff' },
  });
}

export function formatPrice(n) {
  return n.toFixed(2);
}
