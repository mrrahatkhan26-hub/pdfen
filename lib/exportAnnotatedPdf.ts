import { AnnotationItem } from "./types";

export function downloadCompositePagePng(
  baseCanvas: HTMLCanvasElement,
  annotations: AnnotationItem[],
  pageNum: number,
  fileBaseName: string
) {
  const out = document.createElement("canvas");
  out.width = baseCanvas.width;
  out.height = baseCanvas.height;
  const ctx = out.getContext("2d");
  if (!ctx) return;

  // ১. মূল রেন্ডার্ড PDF পৃষ্ঠা আঁকা
  ctx.drawImage(baseCanvas, 0, 0);

  // ২. ওই পৃষ্ঠার পেন ও হাইলাইটার স্ট্রোক আঁকা
  const strokes = annotations.filter(
    (a) => (a.type === "pen" || a.type === "highlighter") && a.page === pageNum
  );

  for (const s of strokes) {
    if (s.type !== "pen" && s.type !== "highlighter") continue;
    if (!s.points.length) continue;

    ctx.save();
    ctx.beginPath();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    // Scale line width according to the canvas width ratio
    const scaleFactor = out.width / 800; // baseline normalized scale
    const lineWidth = Math.max(1, s.width * scaleFactor);

    if (s.type === "highlighter") {
      ctx.globalAlpha = 0.35;
      ctx.strokeStyle = s.color || "#FACC15";
      ctx.lineWidth = lineWidth;
    } else {
      ctx.globalAlpha = 1;
      ctx.strokeStyle = s.color || "#111827";
      ctx.lineWidth = lineWidth;
    }

    s.points.forEach((pt, i) => {
      const px = pt.x * out.width;
      const py = pt.y * out.height;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.stroke();
    ctx.restore();
  }

  // ৩. ওই পৃষ্ঠার টেক্সট অ্যানোটেশন আঁকা
  const texts = annotations.filter((a) => a.type === "text" && a.page === pageNum);
  for (const t of texts) {
    if (t.type !== "text" || !t.content.trim()) continue;

    ctx.save();
    const fontWeight = t.style.bold ? "700" : "400";
    const fontStyle = t.style.italic ? "italic" : "normal";
    ctx.font = `${fontStyle} ${fontWeight} ${t.style.fontSize}px "Tiro Bangla", sans-serif`;
    ctx.textBaseline = "top";

    const x = t.x * out.width;
    const y = t.y * out.height;
    const maxPxWidth = Math.max(80, t.maxWidth * out.width);

    const words = t.content.split(" ");
    const lines: string[] = [];
    let currentLine = "";

    for (const w of words) {
      const test = currentLine ? `${currentLine} ${w}` : w;
      if (ctx.measureText(test).width > maxPxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = w;
      } else {
        currentLine = test;
      }
    }
    if (currentLine) lines.push(currentLine);

    const lineHeight = t.style.fontSize * 1.35;
    lines.forEach((line, idx) => {
      const lineY = y + idx * lineHeight;
      const metrics = ctx.measureText(line);
      const boxW = metrics.width + 8;
      const boxH = lineHeight;

      if (t.style.backgroundColor && t.style.backgroundColor !== "transparent") {
        ctx.fillStyle = t.style.backgroundColor;
        ctx.fillRect(x - 4, lineY, boxW, boxH);
      }

      ctx.fillStyle = t.style.textColor;
      ctx.fillText(line, x, lineY + 2);
    });

    ctx.restore();
  }

  const link = document.createElement("a");
  link.download = `${fileBaseName}-page-${pageNum}-annotated.png`;
  link.href = out.toDataURL("image/png");
  link.click();
}
