/* moved from js/design/design-email-attachments.js */
/* =========================================================
 * 시안 첨부용 렌더링 / 첨부 파라미터 생성
 * - 1~9개   : PNG 개별 첨부
 * - 10개 이상: ZIP 첨부
 * - OEM + 레이저 선택 시: 업로드 원본파일도 함께 첨부
========================================================= */

function getCapTypeFileText(capType) {
  if (!capType) return "-";
  if (capType === "R2-1U_HOMING") return "R2-1U-돌기";
  return capType;
}

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

function isLaserOriginalAttachTarget(item) {
  return (
    safeTrim(item?.profile) === "OEM" &&
    safeTrim(item?.laser) !== "" &&
    safeTrim(item?.laser) !== "none"
  );
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    if (!file) {
      resolve("");
      return;
    }

    const reader = new FileReader();
    reader.onload = () =>
      resolve(String(reader.result || "").split(",")[1] || "");
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/* =========================================================
 * 웹폰트 렌더링 대기
 * - 텍스트 시안이 첨부 PNG로 변환될 때 폰트가 기본 폰트로 찍히는 문제 방지
========================================================= */
async function waitForDesignFontsReady() {
  try {
    if (document?.fonts?.ready) {
      await document.fonts.ready;
    }
  } catch (err) {
    console.warn(
      "[폰트 로딩 대기 실패] 기본 폰트로 렌더링될 수 있습니다.",
      err,
    );
  }
}

async function renderItemToPngDataUrl(item) {
  await waitForDesignFontsReady();

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

  const bgSet = !!item?.design?.bgSet;

  const bgType =
    bgSet &&
    (item?.design?.bgType === "gradient" ||
      item?.design?.background?.type === "gradient")
      ? "gradient"
      : "solid";

  const color1 = bgSet
    ? item?.design?.bgColor ||
      item?.bgColor ||
      item?.design?.background?.color ||
      "#ffffff"
    : "#ffffff";

  const color2 =
    item?.design?.bgColor2 || item?.design?.background?.color2 || "#fdcc63";

  const direction =
    item?.design?.bgDirection ||
    item?.design?.background?.direction ||
    "to-right";

  offCtx.fillStyle =
    createBackgroundFill?.(
      offCtx,
      off.width,
      off.height,
      bgType,
      color1,
      color2,
      direction,
    ) || color1;

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

  drawTextObjectToContext?.(offCtx, off.width, off.height, item?.design?.text);

  return off.toDataURL("image/png");
}

/* =========================================================
 * 첨부파일 요약
========================================================= */
function buildAttachmentSummaryHtml(items = cartItems) {
  if (!Array.isArray(items) || !items.length) {
    return "<div>-</div>";
  }

  return items
    .map((item) => {
      const profile = escapeHtml(item?.profile || "-");

      const capType = escapeHtml(getCapTypeFileText(item?.capType || "-"));

      const qty = Number(item?.qty || 1);

      return `
        <div>
          ${profile} / ${capType} × ${qty}개
        </div>
      `;
    })
    .join("");
}

/* =========================================================
 * ZIP 첨부 시에도 고객 메일에서 시안별 수량/옵션 확인 가능
========================================================= */
function buildZipAttachmentSummaryHtml(zipFilename, items = cartItems) {
  const zipName = escapeHtml(String(zipFilename || "designs.zip"));

  const summary = buildAttachmentSummaryHtml(items);

  return `
    <div style="
      font-family:Arial,sans-serif;
      font-size:14px;
      line-height:1.7;
      color:#111;
    ">
      <div style="margin-bottom:12px;">
        <b>첨부파일</b> : ${zipName}
      </div>

      ${summary}
    </div>
  `;
}

function createEmptyAttachmentParams() {
  const params = {
    attachment_summary_html: "<div>-</div>",
    zip_filename: "",
    zip_file: "",
  };

  for (let i = 1; i <= 9; i += 1) {
    params[`design_${i}_filename`] = "";
    params[`design_${i}_file`] = "";
  }

  return params;
}

async function buildAttachments(orderNo = "order") {
  await waitForDesignFontsReady();

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

    if (base64) {
      files.push({
        filename,
        file: base64,
      });
    }

    if (isLaserOriginalAttachTarget(item) && item?.originalFile) {
      const ext = (() => {
        const rawName = String(item.originalFile.name || "");

        const dotIndex = rawName.lastIndexOf(".");

        return dotIndex >= 0 ? rawName.slice(dotIndex).toLowerCase() : "";
      })();

      const originalFilename =
        `${safeFilePart(orderNo)}_` +
        `${safeFilePart(item.profile)}_` +
        `${safeFilePart(getCapTypeFileText(item.capType))}_` +
        `${String(i + 1).padStart(2, "0")}` +
        `_original${ext || ".png"}`;

      const originalBase64 = await fileToBase64(item.originalFile);

      if (originalBase64) {
        files.push({
          filename: originalFilename,
          file: originalBase64,
        });
      }
    }
  }

  if (!files.length) {
    return createEmptyAttachmentParams();
  }

  /* =========================================================
   * 1~9개 : PNG 개별 첨부
  ========================================================= */
  if (items.length <= 9) {
    const params = createEmptyAttachmentParams();

    params.attachment_summary_html = buildAttachmentSummaryHtml(items);

    files.forEach((file, index) => {
      const no = index + 1;

      params[`design_${no}_filename`] = file.filename;

      params[`design_${no}_file`] = file.file;
    });

    return params;
  }

  /* =========================================================
   * 10개 이상 : ZIP 첨부
  ========================================================= */
  const zip = new JSZip();

  const folder = zip.folder(`${safeFilePart(orderNo)}_designs`);

  files.forEach((file) => {
    folder.file(file.filename, file.file, { base64: true });
  });

  const zipBlob = await zip.generateAsync({
    type: "blob",
  });

  const zipBase64 = await new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () =>
      resolve(String(reader.result || "").split(",")[1] || "");

    reader.onerror = reject;

    reader.readAsDataURL(zipBlob);
  });

  const params = createEmptyAttachmentParams();

  const zipFilename = `${safeFilePart(orderNo)}_designs.zip`;

  params.attachment_summary_html = buildZipAttachmentSummaryHtml(
    zipFilename,
    items,
  );

  params.zip_filename = zipFilename;

  params.zip_file = zipBase64;

  return params;
}
