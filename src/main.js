import { decodeBarcode, calcSalePrice, formatPrice } from './qr-gen.js';
import { startScanner, stopScanner } from './scanner.js';
import { exportPDF } from './pdf.js';

// ===== State =====
let discountPct = null;
let items = [];
let pendingItem = null;

// ===== DOM =====
const pageSelect = document.getElementById('page-select');
const pageScan   = document.getElementById('page-scan');
const pctBtns    = document.querySelectorAll('.pct-btn');
const btnStart   = document.getElementById('btn-start');
const btnBack    = document.getElementById('btn-back');
const pctBadge   = document.getElementById('pct-badge');
const scannerModal = document.getElementById('scanner-modal');
const btnScan    = document.getElementById('btn-scan');
const btnCloseScan = document.getElementById('btn-close-scan');
const resultCard = document.getElementById('result-card');
const resBarcode = document.getElementById('res-barcode');
const resFull    = document.getElementById('res-full');
const resSale    = document.getElementById('res-sale');
const btnSaveItem   = document.getElementById('btn-save-item');
const btnCancelItem = document.getElementById('btn-cancel-item');
const itemList   = document.getElementById('item-list');
const itemCount  = document.getElementById('item-count');
const btnClear   = document.getElementById('btn-clear');
const exportBar  = document.getElementById('export-bar');
const btnExport  = document.getElementById('btn-export');
const toast      = document.getElementById('toast');

// ===== Toast =====
function showToast(msg, ms = 2000) {
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), ms);
}

// ===== หน้า 1: เลือก % =====
pctBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    pctBtns.forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    discountPct = parseInt(btn.dataset.pct);
    btnStart.disabled = false;
  });
});

btnStart.addEventListener('click', () => {
  if (!discountPct) return;
  pctBadge.textContent = `ลด ${discountPct}%`;
  showPage(pageScan);
});

// ===== หน้า 2: แสกน =====
btnBack.addEventListener('click', () => {
  stopScanner();
  hideResultCard();
  showPage(pageSelect);
});

btnScan.addEventListener('click', async () => {
  hideResultCard();
  scannerModal.style.display = 'flex';
  try {
    await startScanner(onBarcodeScanned);
  } catch (e) {
    scannerModal.style.display = 'none';
    showToast('ไม่สามารถเปิดกล้องได้ กรุณาอนุญาตการใช้กล้อง');
  }
});

btnCloseScan.addEventListener('click', async () => {
  await stopScanner();
  scannerModal.style.display = 'none';
});

function onBarcodeScanned(rawText) {
  scannerModal.style.display = 'none';

  const decoded = decodeBarcode(rawText);
  if (!decoded) {
    showToast('บาร์โค้ดไม่ถูกรูปแบบ (ต้องขึ้นต้นด้วย 2)');
    return;
  }

  const salePrice = calcSalePrice(decoded.price, discountPct);
  pendingItem = {
    barcode: rawText,
    plu: decoded.plu,
    fullPrice: decoded.price,
    salePrice,
  };

  resBarcode.textContent = rawText;
  resFull.textContent = `฿${formatPrice(decoded.price)}`;
  resSale.textContent  = `฿${formatPrice(salePrice)}`;
  resultCard.style.display = 'block';
}

btnSaveItem.addEventListener('click', () => {
  if (!pendingItem) return;
  items.push({ ...pendingItem, id: Date.now() });
  pendingItem = null;
  hideResultCard();
  renderList();
  showToast('บันทึกแล้ว ✓');
});

btnCancelItem.addEventListener('click', () => {
  pendingItem = null;
  hideResultCard();
});

function hideResultCard() {
  resultCard.style.display = 'none';
  pendingItem = null;
}

// ===== รายการ =====
function renderList() {
  itemCount.textContent = items.length;

  if (items.length === 0) {
    itemList.innerHTML = '<div class="empty-state">ยังไม่มีรายการ<br>กดแสกนเพื่อเริ่ม</div>';
    btnClear.style.display = 'none';
    exportBar.style.display = 'none';
    return;
  }

  btnClear.style.display = 'inline';
  exportBar.style.display = 'block';

  itemList.innerHTML = items.map((item, idx) => `
    <div class="item-card">
      <div class="item-left">
        <span class="item-num">#${idx + 1}</span>
        <span class="item-barcode">${item.barcode}</span>
      </div>
      <div class="item-right">
        <span class="item-full">฿${formatPrice(item.fullPrice)}</span>
        <span class="item-sale">฿${formatPrice(item.salePrice)}</span>
      </div>
      <button class="item-delete" data-id="${item.id}" title="ลบ">✕</button>
    </div>
  `).join('');

  itemList.querySelectorAll('.item-delete').forEach(btn => {
    btn.addEventListener('click', () => {
      items = items.filter(it => it.id !== parseInt(btn.dataset.id));
      renderList();
    });
  });
}

btnClear.addEventListener('click', () => {
  if (confirm('ล้างรายการทั้งหมด?')) {
    items = [];
    renderList();
  }
});

// ===== Export PDF =====
btnExport.addEventListener('click', async () => {
  if (items.length === 0) return;
  btnExport.disabled = true;
  btnExport.textContent = '⏳ กำลังสร้าง PDF...';
  try {
    await exportPDF(items, discountPct);
    showToast('สร้าง PDF สำเร็จ ✓');
  } catch (e) {
    showToast('เกิดข้อผิดพลาด: ' + e.message);
  } finally {
    btnExport.disabled = false;
    btnExport.textContent = '📄 Export PDF';
  }
});

// ===== Helpers =====
function showPage(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  page.classList.add('active');
}
