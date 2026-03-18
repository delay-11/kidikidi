/* =========================================================
 * PNG 렌더
========================================================= */
async function renderItemFinalPng(item) {
  const size = getCanvasSize(item.profile, item.capType);

  const off = document.createElement("canvas");
  off.width = size.w;
  off.height = size.h;

  const ctx = off.getContext("2d");

  ctx.fillStyle = getItemBgColor(item);
  ctx.fillRect(0, 0, off.width, off.height);

  if (item.design?.imgDataUrl) {
    const img = new Image();

    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.src = item.design.imgDataUrl;
    });

    const scale = item.design.scale ?? 1;
    const rot = item.design.rot ?? 0;
    const cx = item.design.cx ?? off.width / 2;
    const cy = item.design.cy ?? off.height / 2;

    const w = img.width * scale;
    const h = img.height * scale;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rot);
    ctx.drawImage(img, -w / 2, -h / 2, w, h);
    ctx.restore();
  }

  return off.toDataURL("image/png");
}

/* =========================================================
 * ZIP 생성
========================================================= */
async function buildZip(designs, orderNo) {
  const zip = new JSZip();
  const folder = zip.folder(`${orderNo}_designs`);

  designs.forEach((d) => {
    const base64 = d.dataUrl.split(",")[1];
    folder.file(d.filename, base64, { base64: true });
  });

  const blob = await zip.generateAsync({ type: "blob" });

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(blob);
  });
}

/* =========================================================
 * 첨부파일 생성
========================================================= */
async function buildAttachments(orderNo) {
  const designs = [];
  const counters = {};

  for (const it of cartItems) {
    if (!it.design?.imgDataUrl) continue;

    const png = await renderItemFinalPng(it);

    const profile = safeFilePart(it.profile);
    const capType = safeFilePart(it.capType);
    const key = `${profile}__${capType}`;

    counters[key] = (counters[key] || 0) + 1;
    const seq = String(counters[key]).padStart(2, "0");

    const name = [safeFilePart(orderNo), profile, capType, seq].join("_");

    designs.push({
      filename: `${name}.png`,
      dataUrl: png,
    });
  }

  if (designs.length >= 10) {
    const zipData = await buildZip(designs, orderNo);

    return {
      attachment_mode: "zip",
      zip_filename: `${orderNo}_designs.zip`,
      zip_file: zipData,
    };
  }

  const obj = { attachment_mode: "files" };

  designs.forEach((d, i) => {
    const idx = i + 1;
    obj[`design_${idx}_filename`] = d.filename;
    obj[`design_${idx}_file`] = d.dataUrl;
  });

  return obj;
}
