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

// loadImageFromDataUrl는 js/utils.js 공용 함수 사용

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
 * 레이저 원본파일 첨부 압축
 * - 수정 이유: EmailJS 요금제(Professional)의 첨부 용량 한도가 2MB로
 *   업로드 허용 크기(15MB)보다 훨씬 작아서, 원본파일을 그대로 첨부하면
 *   회사 메일이 거의 항상 용량 초과로 실패했음. 화질을 약간 타협해서라도
 *   무조건 실패하는 것보다는 압축해서 보내는 쪽을 선택 (사용자 확인 완료).
 * - base64로 인코딩하면 실제 전송 용량이 원본보다 약 37% 커지므로,
 *   목표 용량(targetMaxBytes)은 base64 변환 후 기준으로 역산해서 확인.
========================================================= */
function estimateBase64Bytes(dataUrl) {
  const base64 = dataUrlToBase64(dataUrl);
  return Math.ceil((base64.length * 3) / 4);
}

async function compressFileForEmailAttachment(
  file,
  targetMaxBytes = 900 * 1024,
  maxDimension = 2200,
) {
  if (!file) return null;

  const srcDataUrl = await readFileAsDataURL(file);
  const img = await createImageFromSrc(srcDataUrl);

  let targetWidth = img.width;
  let targetHeight = img.height;

  if (targetWidth > maxDimension || targetHeight > maxDimension) {
    const ratio = Math.min(maxDimension / targetWidth, maxDimension / targetHeight);
    targetWidth = Math.max(1, Math.round(targetWidth * ratio));
    targetHeight = Math.max(1, Math.round(targetHeight * ratio));
  }

  const off = document.createElement("canvas");
  off.width = targetWidth;
  off.height = targetHeight;

  const offCtx = off.getContext("2d");
  if (!offCtx) return null;

  // JPEG는 투명 배경이 없어서, 투명 원본이 검게 찍히지 않도록 흰 배경을 먼저 채움
  offCtx.fillStyle = "#ffffff";
  offCtx.fillRect(0, 0, targetWidth, targetHeight);
  offCtx.drawImage(img, 0, 0, targetWidth, targetHeight);

  let quality = 0.85;
  let outDataUrl = off.toDataURL("image/jpeg", quality);

  while (estimateBase64Bytes(outDataUrl) > targetMaxBytes && quality > 0.35) {
    quality -= 0.1;
    outDataUrl = off.toDataURL("image/jpeg", quality);
  }

  // 화질을 최대한 낮춰도 여전히 크면, 해상도를 한 단계 더 줄여서 재시도
  if (estimateBase64Bytes(outDataUrl) > targetMaxBytes && maxDimension > 700) {
    return compressFileForEmailAttachment(file, targetMaxBytes, Math.round(maxDimension * 0.7));
  }

  return {
    dataUrl: outDataUrl,
    base64: dataUrlToBase64(outDataUrl),
  };
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

/* =========================================================
 * 330x330 규격 첨부 화질 저하 대응
 * - 330x330 캔버스는 대부분의 OEM 단품 시안에 쓰이는 기본 규격인데
 *   화면 편집용 크기 그대로 첨부 PNG로 내보내다 보니 확대해서 보면 뭉개짐
 * - 다른 규격은 화질 문의가 없었으므로 건드리지 않고,
 *   이 규격만 첨부 시점에 한해 해상도를 3배로 키워서 내보냄
 *   (편집 캔버스/목록 썸네일 크기에는 영향 없음)
========================================================= */
const SMALL_CANVAS_EXPORT_SCALE = 3;

async function renderItemToPngDataUrl(item) {
  await waitForDesignFontsReady();

  const profile = safeTrim(item?.profile) || "OEM";
  const capType = safeTrim(item?.capType) || "-";
  const size = getCanvasSize(profile, capType);

  const exportScale =
    size.w === 330 && size.h === 330 ? SMALL_CANVAS_EXPORT_SCALE : 1;

  const off = document.createElement("canvas");
  off.width = size.w * exportScale;
  off.height = size.h * exportScale;

  const offCtx = off.getContext("2d");
  if (!offCtx) {
    throw new Error("첨부용 캔버스 컨텍스트를 생성할 수 없습니다.");
  }

  offCtx.imageSmoothingEnabled = true;
  offCtx.imageSmoothingQuality = "high";
  offCtx.scale(exportScale, exportScale);

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

  const position =
    typeof getGradientPositionFromItem === "function"
      ? getGradientPositionFromItem(item)
      : clamp01(
          item?.design?.bgPosition ?? item?.design?.background?.position,
          0.5,
        );

  const softness =
    typeof getGradientSoftnessFromItem === "function"
      ? getGradientSoftnessFromItem(item)
      : clamp01(
          item?.design?.bgSoftness ?? item?.design?.background?.softness,
          1,
        );

  offCtx.fillStyle =
    createBackgroundFill?.(
      offCtx,
      size.w,
      size.h,
      bgType,
      color1,
      color2,
      direction,
      position,
      softness,
    ) || color1;

  offCtx.fillRect(0, 0, size.w, size.h);

  const imageStates = Array.isArray(item?.design?.images) && item.design.images.length
    ? item.design.images
    : item?.design?.imgDataUrl
      ? [{
          imgDataUrl: item.design.imgDataUrl,
          cx: item?.design?.cx,
          cy: item?.design?.cy,
          scaleX: item?.design?.scaleX ?? item?.design?.scale,
          scaleY: item?.design?.scaleY ?? item?.design?.scale,
          rot: item?.design?.rot,
        }]
      : [];

  for (const imageState of imageStates) {
    if (!imageState?.imgDataUrl) continue;
    const img = await loadImageFromDataUrl(imageState.imgDataUrl);

    if (img) {
      drawTransformedImageObject(offCtx, img, imageState, size.w / 2, size.h / 2);
    }
  }

  const attachmentTexts = Array.isArray(item?.design?.texts) && item.design.texts.length
    ? item.design.texts
    : item?.design?.text?.value
      ? [item.design.text]
      : [];
  attachmentTexts.forEach((t) => drawTextObjectToContext?.(offCtx, size.w, size.h, t));

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

/* =========================================================
 * 첨부 파일 목록 생성 (PNG 렌더링 + 원본파일 base64 변환)
 * - 수정 이유:
 *   기존에는 회사/고객 메일을 각각 만들 때마다 이 무거운 작업
 *   (캔버스 렌더링, 원본파일 인코딩)을 매번 처음부터 다시 했음.
 *   시안이 많거나 원본파일이 클수록 접수 대기 시간이 거의 2배로
 *   늘어났으므로, 이 목록은 한 번만 만들어서 회사/고객 메일 둘 다
 *   재사용한다 (email-send.js의 sendOrderEmails 참고).
 * - files[].isOriginal: 레이저 원본파일 여부. 고객 메일에는 원본파일이
 *   굳이 필요 없고 용량만 커지므로, 패키징 단계(packAttachmentParams)
 *   에서 수신자에 따라 골라서 뺄 수 있도록 표시해둠.
========================================================= */
async function buildAttachmentFileList(orderNo = "order") {
  await waitForDesignFontsReady();

  const items = Array.isArray(cartItems) ? cartItems : [];

  const files = [];
  // 수정 이유: 시안이 많은 주문을 용량 기준으로 여러 메일에 나눠 보내려면
  // "이 시안의 첨부파일들"이 어느 아이템 것인지 알아야 함 -
  // itemFiles[i]는 items[i]에 대응하는 첨부파일 목록 (PNG 1개 + 원본파일 0~1개)
  const itemFiles = [];

  for (let i = 0; i < items.length; i += 1) {
    const item = items[i];
    const currentItemFiles = [];

    const filename = getItemDisplayName(item, items);

    const dataUrl = await renderItemToPngDataUrl(item);

    const base64 = dataUrlToBase64(dataUrl);

    if (base64) {
      const entry = { filename, file: base64, isOriginal: false };
      files.push(entry);
      currentItemFiles.push(entry);
    }

    if (isLaserOriginalAttachTarget(item) && item?.originalFile) {
      // 수정 이유: EmailJS 첨부 용량(2MB) 안에 들어가도록 원본파일을
      // 압축해서 JPEG로 첨부함 - 실제 원본 파일 자체가 훼손되는 건 아니고
      // 메일에 실리는 사본만 압축됨
      // 오리지널 파일 번호는 같은 시안의 PNG 파일명과 항상 같은 번호가
      // 붙도록 getItemGroupSeq()로 동일하게 계산 (프로파일/규격별 순번)
      const originalFilename =
        `${safeFilePart(orderNo)}_` +
        `${safeFilePart(item.profile)}_` +
        `${safeFilePart(getCapTypeFileText(item.capType))}_` +
        `${String(getItemGroupSeq(item, items)).padStart(2, "0")}` +
        `_original.jpg`;

      const compressed = await compressFileForEmailAttachment(item.originalFile);

      if (compressed?.base64) {
        const entry = { filename: originalFilename, file: compressed.base64, isOriginal: true };
        files.push(entry);
        currentItemFiles.push(entry);
      }
    }

    itemFiles.push(currentItemFiles);
  }

  return { items, files, itemFiles };
}

/* =========================================================
 * 시안을 용량 기준으로 여러 메일로 나누기
 * - 수정 이유: 시안이 20~30개처럼 많은 주문은 첨부 용량 합계가
 *   EmailJS 한도(2MB)를 넘길 수밖에 없음 - 시안(과 그 원본파일)을
 *   같은 배치 안에 묶어서, 배치별 용량 합계가 목표치를 넘지 않도록
 *   나눠서 (1/2), (2/2)처럼 여러 통으로 나눠 보낼 수 있게 함
 * - 시안 1개(+원본)가 이미 목표치보다 크면 어쩔 수 없이 그 시안만
 *   단독 배치로 보냄 (더 쪼갤 수 없음)
========================================================= */
function batchItemsByWeight(items, itemFiles, targetMaxBytes, { includeOriginals = true } = {}) {
  const batches = [];
  let current = { items: [], files: [] };
  let currentWeight = 0;

  items.forEach((item, idx) => {
    const entryFiles = (itemFiles[idx] || []).filter(
      (f) => includeOriginals || !f.isOriginal,
    );
    const entryWeight = entryFiles.reduce((sum, f) => sum + f.file.length, 0);

    if (current.items.length && currentWeight + entryWeight > targetMaxBytes) {
      batches.push(current);
      current = { items: [], files: [] };
      currentWeight = 0;
    }

    current.items.push(item);
    current.files.push(...entryFiles);
    currentWeight += entryWeight;
  });

  if (current.items.length) batches.push(current);

  return batches;
}

/* =========================================================
 * 첨부 파일 목록 -> EmailJS 파라미터로 패키징
 * - includeOriginals: false면 레이저 원본파일은 제외하고 패키징
 *   (고객 발송용 - 용량을 줄이기 위함)
 * - 1~9개   : PNG 개별 첨부
 * - 10개 이상: ZIP 첨부
========================================================= */
function packAttachmentParams(orderNo, items, allFiles, { includeOriginals = true } = {}) {
  if (!window.JSZip) {
    throw new Error("JSZip 라이브러리가 로드되지 않았습니다.");
  }

  const files = includeOriginals
    ? allFiles
    : allFiles.filter((f) => !f.isOriginal);

  if (!files.length) {
    return createEmptyAttachmentParams();
  }

  /* =========================================================
   * 1~9개 : PNG 개별 첨부
  ========================================================= */
  // 수정 이유:
  // 레이저 원본파일이 추가되면 시안 1개가 첨부 2개가 됩니다.
  // 기존처럼 items.length 기준으로 판단하면 실제 첨부파일이 10개를 넘어도
  // 개별 첨부 파라미터로 보내려 해서 EmailJS 템플릿 슬롯 밖 파일이 누락될 수 있습니다.
  if (files.length <= 9) {
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
  return packAsZip(orderNo, items, files);
}

async function packAsZip(orderNo, items, files) {
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

// 미사용 확인 (2026-07-10) - 배치 발송 도입으로 email-send.js가
// buildAttachmentFileList + batchItemsByWeight를 직접 사용하도록 바뀌어
// 호출부 없음, 필요시 복원
// async function buildAttachments(orderNo = "order") {
//   const { items, files } = await buildAttachmentFileList(orderNo);
//   return packAttachmentParams(orderNo, items, files);
// }
