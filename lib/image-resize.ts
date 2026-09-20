"use client";

/**
 * Yüklenen görseli küçültüp JPEG veri URL'sine çevirir.
 * Demo verisi tarayıcı depolamasında (~5 MB) tutulduğu için tam boyutlu görsel saklanmaz.
 */
const MAX_SIDE = 480;
const QUALITY = 0.72;
const MAX_INPUT_BYTES = 8 * 1024 * 1024;

export async function resizeImageFile(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error(`${file.name}: yalnızca görsel dosyaları yüklenebilir.`);
  if (file.size > MAX_INPUT_BYTES) throw new Error(`${file.name}: dosya 8 MB'dan büyük.`);
  const url = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error(`${file.name}: görsel okunamadı.`));
      element.src = url;
    });
    const scale = Math.min(1, MAX_SIDE / Math.max(image.naturalWidth, image.naturalHeight));
    const width = Math.max(1, Math.round(image.naturalWidth * scale));
    const height = Math.max(1, Math.round(image.naturalHeight * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Görsel işlenemedi.");
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, width, height);
    context.drawImage(image, 0, 0, width, height);
    return canvas.toDataURL("image/jpeg", QUALITY);
  } finally {
    URL.revokeObjectURL(url);
  }
}
