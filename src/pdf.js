import { jsPDF } from 'jspdf';
import { qrToDataURL, buildDiscountBarcode, formatPrice } from './qr-gen.js';

const TAG_W_MM = 51;   // 2 นิ้ว
const TAG_H_MM = 51;   // 2 นิ้ว
const COLS = 3;
const MARGIN_X = 10;   // mm จากขอบ
const MARGIN_Y = 10;
const GAP_X = 4;
const GAP_Y = 4;

export async function exportPDF(items, discountPct) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const now = new Date();
  const dateStr = now.toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: 'numeric' });

  let col = 0;
  let row = 0;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];

    if (i > 0 && col === 0 && row === 0) {
      doc.addPage();
    }

    const x = MARGIN_X + col * (TAG_W_MM + GAP_X);
    const y = MARGIN_Y + row * (TAG_H_MM + GAP_Y);

    await drawTag(doc, x, y, item, discountPct, dateStr);

    col++;
    if (col >= COLS) {
      col = 0;
      row++;
      const maxRows = Math.floor((297 - MARGIN_Y * 2) / (TAG_H_MM + GAP_Y));
      if (row >= maxRows) {
        row = 0;
        if (i < items.length - 1) doc.addPage();
      }
    }
  }

  const filename = `RTC-MS_${discountPct}pct_${now.toISOString().slice(0,10)}.pdf`;
  doc.save(filename);
}

async function drawTag(doc, x, y, item, pct, dateStr) {
  const w = TAG_W_MM;
  const h = TAG_H_MM;

  // กรอบป้าย
  doc.setDrawColor(200);
  doc.setLineWidth(0.3);
  doc.roundedRect(x, y, w, h, 2, 2, 'S');

  // สร้าง QR
  const newBarcode = buildDiscountBarcode(item.plu, item.salePrice);
  const qrDataUrl = await qrToDataURL(newBarcode, 256);

  // QR ~70% ของความกว้าง
  const qrSize = w * 0.68;
  const qrX = x + (w - qrSize) / 2;
  const qrY = y + 2;
  doc.addImage(qrDataUrl, 'PNG', qrX, qrY, qrSize, qrSize);

  // ราคาลด (แดง ตัวใหญ่)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(192, 57, 43);
  const saleLine = `฿${formatPrice(item.salePrice)}`;
  doc.text(saleLine, x + w / 2, qrY + qrSize + 6, { align: 'center' });

  // ราคาเดิม (เทา ขีดทับ)
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  const fullLine = `฿${formatPrice(item.fullPrice)}`;
  const fullX = x + w / 2;
  const fullY = qrY + qrSize + 11;
  doc.text(fullLine, fullX, fullY, { align: 'center' });

  // ขีดทับ
  const textW = doc.getTextWidth(fullLine);
  doc.setDrawColor(150, 150, 150);
  doc.setLineWidth(0.4);
  doc.line(fullX - textW / 2, fullY - 1, fullX + textW / 2, fullY - 1);

  // วันที่ + % เล็กมาก
  doc.setFontSize(6);
  doc.setTextColor(180, 180, 180);
  doc.text(`${dateStr}  ลด${pct}%`, x + w / 2, y + h - 2, { align: 'center' });
}
