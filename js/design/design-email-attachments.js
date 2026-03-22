/* =========================================================
 * 시안 첨부용 렌더링 / ZIP 생성
 * - canvas-core.js 와 이름 충돌나는 함수는 두지 않음
========================================================= */

function loadImageFromDataUrl(dataUrl) {
  return new Promise((resolve, reject) => {
    if (!dataUrl) {
      resolve(null);
      return;
    }

    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = dataUrl;
  });
}

async function renderItemToPngDataUrl(item) {
  const profile = safeTrim(item?.profile) || "OEM";
  const capType = safeTrim(item?.capType) || "-";
  const size = getCanvasSize(profile, capType);

  const off = document.createElement("canvas");
  off.width = size.w;
  off.height = size.h;

  const offCtx = off.getContext("2d");
  if (!offCtx) {
    throw new Error("첨부용 캔버스 컨텍스트를 생성할 수 없습니다.");
  }

  const bg = item?.design?.bgSet ? item?.bgColor || "#ffffff" : "#ffffff";
  offCtx.fillStyle = bg;
  offCtx.fillRect(0, 0, off.width, off.height);

  if (item?.design?.imgDataUrl) {
    const img = await loadImageFromDataUrl(item.design.imgDataUrl);

    if (img) {
      const scale = Number(item?.design?.scale ?? 1);
      const rot = Number(item?.design?.rot ?? 0);
      const cx = Number(item?.design?.cx ?? off.width / 2);
      const cy = Number(item?.design?.cy ?? off.height / 2);
      const w = img.width * scale;
      const h = img.height * scale;

      offCtx.save();
      offCtx.translate(cx, cy);
      offCtx.rotate(rot);
      offCtx.drawImage(img, -w / 2, -h / 2, w, h);
      offCtx.restore();
    }
  }

  return off.toDataURL("image/png");
}

async function buildAttachments(orderNo = "order") {
  if (!window.JSZip) {
    throw new Error("JSZip 라이브러리가 로드되지 않았습니다.");
  }

  const items = Array.isArray(cartItems) ? cartItems : [];

  if (!items.length) {
    return {
      zip_filename: `${safeFilePart(orderNo)}_designs.zip`,
      zip_file: "",
    };
  }

  const zip = new JSZip();
  const folder = zip.folder(`${safeFilePart(orderNo)}_designs`);

  for (let i = 0; i < items.length; i += 1) {
    const item = items[i];
    const filename = getItemDisplayName(item, i, items);
    const dataUrl = await renderItemToPngDataUrl(item);
    const base64 = dataUrlToBase64(dataUrl);

    if (!base64) continue;
    folder.file(filename, base64, { base64: true });
  }

  const zipBlob = await zip.generateAsync({ type: "blob" });

  const zipBase64 = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || "").split(",")[1] || "");
    reader.onerror = reject;
    reader.readAsDataURL(zipBlob);
  });

  return {
    zip_filename: `${safeFilePart(orderNo)}_designs.zip`,
    zip_file: zipBase64,
  };
}
