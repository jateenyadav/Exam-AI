/**
 * Shrink a photo in the browser so it always fits the 2 MB upload limit (lib/validation.ts).
 * Phone photos are often 4–12 MB; they used to be rejected by the server and silently lost.
 * Output is always JPEG (the server accepts JPEG/PNG/WebP).
 */
export const UPLOAD_TARGET_BYTES = 1_500_000;
const MAX_SIDE = 1600;

/** Size in bytes of the data a `data:...;base64,` URL holds. */
export function dataUrlBytes(dataUrl: string): number {
  const base64 = dataUrl.slice(dataUrl.indexOf(",") + 1);
  const padding = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;
  return Math.floor((base64.length * 3) / 4) - padding;
}

/** Fit (w, h) inside a max side, keeping the aspect ratio. */
export function fitWithin(width: number, height: number, maxSide = MAX_SIDE): { width: number; height: number } {
  const scale = Math.min(1, maxSide / Math.max(width, height));
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("This photo format can't be read here. Please take the photo with the camera button or upload a JPG/PNG."));
    img.src = src;
  });
}

/** Compress a File or data URL to a JPEG data URL under UPLOAD_TARGET_BYTES. */
export async function compressImage(input: File | string): Promise<string> {
  const src = typeof input === "string" ? input : URL.createObjectURL(input);
  try {
    const img = await loadImage(src);
    let { width, height } = fitWithin(img.naturalWidth, img.naturalHeight);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Your browser can't process images.");
    for (let attempt = 0; attempt < 6; attempt++) {
      canvas.width = width;
      canvas.height = height;
      ctx.fillStyle = "#fff"; // transparent PNGs become white, not black
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);
      for (const quality of [0.85, 0.72, 0.6]) {
        const out = canvas.toDataURL("image/jpeg", quality);
        if (dataUrlBytes(out) <= UPLOAD_TARGET_BYTES) return out;
      }
      width = Math.round(width * 0.8);
      height = Math.round(height * 0.8);
    }
    throw new Error("This photo is too large even after compressing. Please retake it closer to the page.");
  } finally {
    if (typeof input !== "string") URL.revokeObjectURL(src);
  }
}
