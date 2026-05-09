import { Html5Qrcode } from 'html5-qrcode';

let scanner = null;

function playBeep() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 1800;
    osc.type = 'sine';
    gain.gain.setValueAtTime(0.4, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.15);
  } catch (_) {}
}

export async function startScanner(onSuccess) {
  if (scanner) {
    await stopScanner();
  }

  scanner = new Html5Qrcode('reader');

  const config = {
    fps: 15,
    qrbox: { width: 280, height: 180 },
    aspectRatio: 1.5,
    formatsToSupport: [
      Html5Qrcode.BARCODE_FORMAT?.EAN_13 ?? 'EAN_13',
    ],
  };

  await scanner.start(
    { facingMode: 'environment' },
    config,
    (decodedText) => {
      playBeep();
      stopScanner();
      onSuccess(decodedText);
    },
    () => {}
  );
}

export async function stopScanner() {
  if (scanner) {
    try {
      await scanner.stop();
      await scanner.clear();
    } catch (_) {}
    scanner = null;
  }
}
