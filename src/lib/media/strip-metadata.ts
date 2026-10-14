/**
 * A fotó újrakódolása böngészőben: a vászonra rajzolás eldobja az EXIF-metaadatokat (GPS-koordináta, készülék,
 * időpont), amelyek a nyilvános oldalon pontos címet árulnának el. A forgatás a képbe kerül.
 * Hibánál kivételt dob: inkább ne töltsünk fel fotót, mint hogy metaadattal menjen ki.
 */
export interface CleanImage {
  blob: Blob;
  type: "image/jpeg" | "image/png" | "image/webp";
  width: number;
  height: number;
}

const MAX_SIDE = 4096;

async function encode(canvas: HTMLCanvasElement, type: CleanImage["type"]): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, 0.92));
}

export async function stripImageMetadata(file: File): Promise<CleanImage> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  try {
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("A vászon nem érhető el");
    context.drawImage(bitmap, 0, 0, width, height);

    // PNG és WebP megmarad; a többi (pl. AVIF, amit a böngésző nem tud visszaírni) JPEG lesz.
    const preferred: CleanImage["type"] = file.type === "image/png" ? "image/png" : file.type === "image/webp" ? "image/webp" : "image/jpeg";
    let blob = await encode(canvas, preferred);
    let type = preferred;
    if (!blob || blob.type !== preferred) {
      blob = await encode(canvas, "image/jpeg");
      type = "image/jpeg";
    }
    if (!blob) throw new Error("A kép újrakódolása nem sikerült");
    return { blob, type, width, height };
  } finally {
    bitmap.close();
  }
}
