/* =========================================================
 * 시안 첨부용 렌더링 / 첨부 파라미터 생성
 * - 1~9개  : PNG 개별 첨부
 * - 10개 이상 : ZIP 첨부
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
      const scaleX = Number(item?.design?.scaleX ?? item?.design?.scale ?? 1);
      const scaleY = Number(item?.design?.scaleY ?? item?.design?.scale ?? 1);
      const rot = Number(item?.design?.rot ?? 0);
      const cx = Number(item?.design?.cx ?? off.width / 2);
      const cy = Number(item?.design?.cy ?? off.height / 2);
      const w = img.width * scaleX;
      const h = img.height * scaleY;

      offCtx.save();
      offCtx.translate(cx, cy);
      offCtx.rotate(rot);
      offCtx.drawImage(img, -w / 2, -h / 2, w, h);
      offCtx.restore();
    }
  }

  return off.toDataURL("image/png");
}

function buildAttachmentSummaryHtml(attachments) {
  if (!Array.isArray(attachments) || !attachments.length) {
    return "<div>-</div>";
  }

  return attachments
    .map((file) => `<div>${file.filename}</div>`)
    .join("");
}

async function buildAttachments(orderNo = "order") {
  if (!window.JSZip) {
    throw new Error("JSZip 라이브러리가 로드되지 않았습니다.");
  }

  const items = Array.isArray(cartItems) ? cartItems : [];
  const files = [];

  for (let i = 0; i < items.length; i += 1) {
    const item = items[i];
    const filename = getItemDisplayName(item, i, items);
    const dataUrl = await renderItemToPngDataUrl(item);
    const base64 = dataUrlToBase64(dataUrl);

    if (!base64) continue;

    files.push({
      filename,
      file: base64,
    });
  }

  if (!files.length) {
    return {
      attachment_summary_html: "<div>-</div>",
    };
  }

  // 1~9개: 개별 첨부
  if (files.length <= 9) {
    const params = {
      attachment_summary_html: buildAttachmentSummaryHtml(files),
    };

    files.forEach((file, index) => {
      const no = index + 1;
      params[`design_${no}_filename`] = file.filename;
      params[`design_${no}_file`] = file.file;
    });

    return params;
  }

  // 10개 이상: ZIP 첨부
  const zip = new JSZip();
  const folder = zip.folder(`${safeFilePart(orderNo)}_designs`);

  files.forEach((file) => {
    folder.file(file.filename, file.file, { base64: true });
  });

  const zipBlob = await zip.generateAsync({ type: "blob" });

  const zipBase64 = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () =>
      resolve(String(reader.result || "").split(",")[1] || "");
    reader.onerror = reject;
    reader.readAsDataURL(zipBlob);
  });

  return {
    attachment_summary_html: `<div>${safeFilePart(orderNo)}_designs.zip</div>`,
    zip_filename: `${safeFilePart(orderNo)}_designs.zip`,
    zip_file: zipBase64,
  };
}