import fs from "fs";
import path from "path";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import AuditTrail from "../models/AuditTrail.js";
import { sha256, base64ToBuffer } from "../lib/fileUtils.js";

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function stripDataUrl(dataUrl) {
  if (!dataUrl) return { mime: "", b64: "" };

  const str = String(dataUrl);
  const comma = str.indexOf(",");
  if (comma === -1) return { mime: "", b64: str };

  const meta = str.slice(0, comma);
  const b64 = str.slice(comma + 1);
  const match = meta.match(/data:(.*?);base64/i);
  const mime = match ? match[1] : "";
  return { mime, b64 };
}

function getImgKind(buf, mimeHint) {
  const b = Buffer.from(buf || []);
  const isPng =
    b.length >= 4 &&
    b[0] === 0x89 &&
    b[1] === 0x50 &&
    b[2] === 0x4e &&
    b[3] === 0x47;
  const isJpg = b.length >= 2 && b[0] === 0xff && b[1] === 0xd8;

  if (mimeHint === "image/png" || isPng) return "png";
  if (mimeHint === "image/jpeg" || mimeHint === "image/jpg" || isJpg)
    return "jpg";
  return "png";
}

function pctToPdfRect(field, pageW, pageH) {
  const x = field.xPct * pageW;
  const w = field.wPct * pageW;
  const h = field.hPct * pageH;
  const y = pageH - field.yPct * pageH - h;
  return { x, y, w, h };
}

function containRect(box, imgW, imgH) {
  const scale = Math.min(box.w / imgW, box.h / imgH);
  const drawW = imgW * scale;
  const drawH = imgH * scale;
  const drawX = box.x + (box.w - drawW) / 2;
  const drawY = box.y + (box.h - drawH) / 2;
  return { drawW, drawH, drawX, drawY };
}

function isValidField(f) {
  if (!f) return false;
  if (!Number.isFinite(f.page) || f.page < 1) return false;
  if (!["text", "signature", "image", "date", "radio"].includes(f.type))
    return false;

  const keys = ["xPct", "yPct", "wPct", "hPct"];
  for (const k of keys) {
    if (!Number.isFinite(f[k])) return false;
    if (f[k] < 0 || f[k] > 1) return false;
  }

  if (f.wPct <= 0 || f.hPct <= 0) return false;
  if (f.xPct > 1 - f.wPct) return false;
  if (f.yPct > 1 - f.hPct) return false;

  return true;
}

function getRadioChecked(val) {
  if (!val) return false;
  if (typeof val === "boolean") return val;
  if (typeof val === "object") return Boolean(val.checked);
  return Boolean(val);
}

export async function signPdfController(req, res) {
  try {
    const body = req.body || {};
    const pdfId = body.pdfId;
    const pdfBase64 = body.pdfBase64;
    const fields = body.fields;

    if (!pdfBase64 || typeof pdfBase64 !== "string") {
      return res.status(400).json({ error: "pdfBase64 is required" });
    }

    if (!Array.isArray(fields) || fields.length === 0) {
      return res.status(400).json({ error: "fields[] is required" });
    }

    const rawPdfBytes = base64ToBuffer(pdfBase64);
    if (!rawPdfBytes || !rawPdfBytes.length) {
      return res.status(400).json({ error: "Invalid pdfBase64" });
    }

    const originalHash = sha256(rawPdfBytes);
    const finalPdfId = pdfId || originalHash;

    const pdfDoc = await PDFDocument.load(rawPdfBytes);
    const pages = pdfDoc.getPages();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

    for (const f of fields) {
      const field = {
        id: String((f && f.id) || ""),
        page: Number((f && f.page) || 1),
        type: String((f && f.type) || ""),
        xPct: Number(f && f.xPct),
        yPct: Number(f && f.yPct),
        wPct: Number(f && f.wPct),
        hPct: Number(f && f.hPct),
        value: f && f.value != null ? f.value : "",
      };

      if (!isValidField(field)) continue;

      const pageIndex = field.page - 1;
      const page = pages[pageIndex];
      if (!page) continue;

      const size = page.getSize();
      const rect = pctToPdfRect(field, size.width, size.height);

      if (field.type === "text" || field.type === "date") {
        const txt = String(field.value || "").trim();
        if (!txt) continue;

        const fontSize = Math.max(8, Math.min(14, rect.h * 0.55));
        page.drawText(txt, {
          x: rect.x + 4,
          y: rect.y + (rect.h - fontSize) / 2,
          size: fontSize,
          font,
          color: rgb(0, 0, 0),
        });

        continue;
      }

      if (field.type === "radio") {
        const checked = getRadioChecked(field.value);
        if (!checked) continue;

        const sizePx = Math.min(rect.w, rect.h) * 0.5;
        page.drawCircle({
          x: rect.x + sizePx / 1.6,
          y: rect.y + rect.h / 2,
          size: sizePx / 2.2,
          color: rgb(0, 0, 0),
        });

        continue;
      }

      if (field.type === "signature" || field.type === "image") {
        const str = typeof field.value === "string" ? field.value : "";
        if (!str) continue;

        const parts = stripDataUrl(str);
        const imgBytes = base64ToBuffer(parts.b64);
        if (!imgBytes || !imgBytes.length) continue;

        let img;
        try {
          const kind = getImgKind(imgBytes, parts.mime);
          img =
            kind === "jpg"
              ? await pdfDoc.embedJpg(imgBytes)
              : await pdfDoc.embedPng(imgBytes);
        } catch (e) {
          continue;
        }

        const dims = img.scale(1);
        const fit = containRect(rect, dims.width, dims.height);

        page.drawImage(img, {
          x: fit.drawX,
          y: fit.drawY,
          width: fit.drawW,
          height: fit.drawH,
        });
      }
    }

    const finalBytes = await pdfDoc.save();
    const finalHash = sha256(finalBytes);

    const storageDir = path.join(process.cwd(), "storage");
    ensureDir(storageDir);

    const filename = `signed_${finalPdfId}_${Date.now()}.pdf`;
    const filePath = path.join(storageDir, filename);
    await fs.promises.writeFile(filePath, Buffer.from(finalBytes));

    const proto = req.headers["x-forwarded-proto"] || req.protocol;
    const url = `${proto}://${req.get("host")}/files/${filename}`;

    await AuditTrail.create({
      pdfId: finalPdfId,
      originalHash,
      finalHash,
      signedUrl: url,
      fields: fields.map((x) => ({
        id: String((x && x.id) || ""),
        page: Number((x && x.page) || 1),
        type: String((x && x.type) || ""),
        xPct: Number(x && x.xPct),
        yPct: Number(x && x.yPct),
        wPct: Number(x && x.wPct),
        hPct: Number(x && x.hPct),
      })),
    });

    return res.json({
      pdfId: finalPdfId,
      originalHash,
      finalHash,
      url,
    });
  } catch (err) {
    console.error("signPdfController failed:", err);
    return res.status(500).json({ error: "Failed to sign PDF" });
  }
}
