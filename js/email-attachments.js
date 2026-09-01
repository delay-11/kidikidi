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

/* =========================================================
 * 지정한 배율로 시안을 캔버스에 렌더링
 * - renderItemToPngDataUrl()에서 용량 초과 시 배율을 낮춰 재렌더링하거나,
 *   PNG 대신 JPEG로도 내보낼 수 있도록 캔버스 자체를 반환한다
========================================================= */
async function renderItemToCanvasAtScale(item, size, exportScale) {
  const off = document.createElement("canvas");
  off.width = Math.max(1, Math.round(size.w * exportScale));
  off.height = Math.max(1, Math.round(size.h * exportScale));

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

  return off;
}

/* =========================================================
 * 캔버스를 흰 배경의 JPEG data URL로 변환 (알파 없는 포맷이라 배경을 먼저 채움)
========================================================= */
function canvasToJpegDataUrl(canvas, quality) {
  const flat = document.createElement("canvas");
  flat.width = canvas.width;
  flat.height = canvas.height;

  const flatCtx = flat.getContext("2d");
  flatCtx.fillStyle = "#ffffff";
  flatCtx.fillRect(0, 0, flat.width, flat.height);
  flatCtx.drawImage(canvas, 0, 0);

  return flat.toDataURL("image/jpeg", quality);
}

/* =========================================================
 * 시안 요약 이메일용 작은 썸네일
 * - 수정 이유: 첨부용으로 이미 만들어둔 고해상도 PNG(dataUrl)를 메일
 *   본문에 그대로 넣으면, 시안이 많은 주문은 본문 용량이 크게 늘어나는데
 *   이 용량은 배치 나누기 계산(EMAIL_ATTACHMENT_BATCH_MAX_BYTES)에
 *   반영되지 않아 요청 자체가 실패할 위험이 있음. 이미 렌더링된
 *   이미지를 다시 그리지 않고 축소만 해서 아주 가벼운 JPEG 썸네일을
 *   따로 만들고, 같은 시안이면 재사용하도록 캐시해둔다(회사/고객
 *   메일 두 번 만들 때 중복 렌더링 방지).
========================================================= */
const SUMMARY_THUMB_MAX_SIDE = 180;
const SUMMARY_THUMB_JPEG_QUALITY = 0.7;
const itemThumbnailCache = new WeakMap();

async function buildItemThumbnailDataUrl(item, sourceDataUrl) {
  if (!item || !sourceDataUrl) return "";
  if (itemThumbnailCache.has(item)) return itemThumbnailCache.get(item);

  try {
    const img = await loadImageFromDataUrl(sourceDataUrl);
    if (!img) return "";

    const scale = Math.min(1, SUMMARY_THUMB_MAX_SIDE / Math.max(img.width, img.height));
    const w = Math.max(1, Math.round(img.width * scale));
    const h = Math.max(1, Math.round(img.height * scale));

    const off = document.createElement("canvas");
    off.width = w;
    off.height = h;
    const offCtx = off.getContext("2d");
    offCtx.fillStyle = "#ffffff";
    offCtx.fillRect(0, 0, w, h);
    offCtx.imageSmoothingEnabled = true;
    offCtx.imageSmoothingQuality = "high";
    offCtx.drawImage(img, 0, 0, w, h);

    const thumbDataUrl = off.toDataURL("image/jpeg", SUMMARY_THUMB_JPEG_QUALITY);
    itemThumbnailCache.set(item, thumbDataUrl);
    return thumbDataUrl;
  } catch (err) {
    console.warn("[시안 썸네일 생성 실패]", err);
    return "";
  }
}

function getCachedItemThumbnailDataUrl(item) {
  return itemThumbnailCache.get(item) || "";
}

/* =========================================================
 * 시안을 PNG(필요시 JPEG) data URL로 렌더링 - 용량 초과 시 무조건 접수되도록
 * 화질(압축)만 낮춰 재시도
 * - 수정 이유: 기본 규격(330x330)은 화질을 위해 3배 확대해서 내보내는데,
 *   사진처럼 디테일이 많은 이미지는 이 PNG 자체가 이메일 배치 용량
 *   기준(EMAIL_ATTACHMENT_BATCH_MAX_BYTES)을 넘을 수 있음. 레이저
 *   원본파일이 없는 순수 PNG 시안은 뺄 첨부가 없어서 그대로 접수가
 *   막혔음("이미지 두 장을 겹쳐서 만든 시안만 접수가 안 된다"는 문의도
 *   같은 원인 - 합성 이미지일수록 PNG가 무거워지기 쉬움).
 * - 수정 이유(해상도 고정): 처음엔 용량 초과 시 내보내기 배율(해상도)을
 *   단계적으로 낮췄었는데, 그러면 시안마다 실제 픽셀 크기가 제각각이 되어
 *   인쇄 작업(포토샵 등)에서 목표 크기로 맞추는 배율(%)이 시안마다 8%,
 *   11%, 22%처럼 달라지는 부작용이 있었음. 같은 규격이면 픽셀 크기는
 *   항상 동일하게 유지해야 하므로, 해상도는 절대 낮추지 않고 용량이
 *   초과할 때만 같은 해상도에서 JPEG 화질만 단계적으로 낮춘다
 *   (레이저 원본파일 압축과 동일한 방식) - 접수는 보장되면서 규격별
 *   픽셀 크기(그리고 인쇄 시 맞춰야 하는 배율)는 항상 일정하게 유지됨.
========================================================= */
async function renderItemToPngDataUrl(item) {
  await waitForDesignFontsReady();

  const profile = safeTrim(item?.profile) || "OEM";
  const capType = safeTrim(item?.capType) || "-";
  const size = getCanvasSize(profile, capType);

  const exportScale =
    size.w === 330 && size.h === 330 ? SMALL_CANVAS_EXPORT_SCALE : 1;

  const canvas = await renderItemToCanvasAtScale(item, size, exportScale);
  const dataUrl = canvas.toDataURL("image/png");

  if (dataUrlToBase64(dataUrl).length <= EMAIL_ATTACHMENT_BATCH_MAX_BYTES) {
    return dataUrl;
  }

  // 수정 이유: 접수 자체는 무조건 되어야 하므로 마지막 수단으로, 해상도는
  // 그대로 둔 채 JPEG 화질만 단계적으로 낮춰서 기준 용량 안에 들어오게 만든다.
  let quality = 0.85;
  let jpegDataUrl = canvasToJpegDataUrl(canvas, quality);

  while (
    dataUrlToBase64(jpegDataUrl).length > EMAIL_ATTACHMENT_BATCH_MAX_BYTES &&
    quality > 0.25
  ) {
    quality -= 0.1;
    jpegDataUrl = canvasToJpegDataUrl(canvas, quality);
  }

  console.warn(`[PNG 용량 초과, JPEG 화질 ${quality.toFixed(2)}로 변환(해상도 유지)]`);
  return jpegDataUrl;
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
  // 수정 이유: 원본파일 첨부를 건너뛴 시안이 있으면 접수는 성공해도
  // 사용자에게 "일부만 빠졌다"는 걸 알려줘야 함 (오류 메시지 상세화)
  const skippedOriginals = [];

  for (let i = 0; i < items.length; i += 1) {
    const item = items[i];
    const currentItemFiles = [];

    let filename = getItemDisplayName(item, items);

    // 수정 이유: 어느 시안에서 렌더링이 실패했는지 알 수 있도록 원본
    // 오류 메시지 앞에 시안 파일명을 붙여서 다시 던짐 - 이 예외는
    // sendOrderEmails()까지 전파되어 getDesignSubmitFailMessage()의
    // 안내 문구에 그대로 노출됨
    let dataUrl;
    try {
      dataUrl = await renderItemToPngDataUrl(item);
    } catch (err) {
      throw new Error(`[${filename}] 시안 이미지 생성 실패: ${err?.message || err}`);
    }

    // 수정 이유: 극단적인 용량 초과로 JPEG로 최종 변환된 경우, 파일명도
    // 실제 포맷(.jpg)에 맞게 바꿔줘야 확장자와 내용이 어긋나지 않음
    if (dataUrl.startsWith("data:image/jpeg")) {
      filename = filename.replace(/\.png$/i, ".jpg");
    }

    // 수정 이유: 시안 요약(items_summary_html)에 넣을 썸네일을 여기서
    // 미리 만들어 캐시해둔다 - 이미 렌더링된 dataUrl을 축소만 하므로
    // 다시 그리는 비용이 없고, 회사/고객 메일을 만들 때 재사용된다.
    await buildItemThumbnailDataUrl(item, dataUrl);

    const base64 = dataUrlToBase64(dataUrl);

    if (base64) {
      const entry = { filename, file: base64, isOriginal: false };
      files.push(entry);
      currentItemFiles.push(entry);
    }

    // 수정 이유: 이미지를 여러 장 업로드해 합성한 시안은 원본파일도 여러
    // 개일 수 있음 - 예전에는 마지막에 활성이었던 이미지 1개만 저장돼서
    // 나머지 원본파일이 메일에서 통째로 누락됐음. 이제 업로드된 원본파일을
    // 전부 순회하며 각각 압축/첨부한다.
    const originalFiles = Array.isArray(item?.originalFiles)
      ? item.originalFiles.filter(Boolean)
      : [];

    if (isLaserOriginalAttachTarget(item) && originalFiles.length) {
      // 오리지널 파일 번호는 같은 시안의 PNG 파일명과 항상 같은 번호가
      // 붙도록 getItemGroupSeq()로 동일하게 계산 (프로파일/규격별 순번)
      const groupSeq = String(getItemGroupSeq(item, items)).padStart(2, "0");
      const compressedEntries = [];

      for (let fileIdx = 0; fileIdx < originalFiles.length; fileIdx += 1) {
        const originalFile = originalFiles[fileIdx];
        // 수정 이유: 원본파일이 1개일 때는 기존 파일명을 그대로 유지하고,
        // 2개 이상일 때만 몇 번째 원본인지 서브 인덱스를 붙인다.
        const subIndexSuffix =
          originalFiles.length > 1 ? `_${String(fileIdx + 1).padStart(2, "0")}` : "";
        const originalFilename =
          `${safeFilePart(orderNo)}_` +
          `${safeFilePart(item.profile)}_` +
          `${safeFilePart(getCapTypeFileText(item.capType))}_` +
          `${groupSeq}` +
          `_original${subIndexSuffix}.jpg`;

        // 수정 이유: EmailJS 첨부 용량(2MB) 안에 들어가도록 원본파일을
        // 압축해서 JPEG로 첨부함 - 실제 원본 파일 자체가 훼손되는 건 아니고
        // 메일에 실리는 사본만 압축됨
        // 원본파일 압축 단계에서 예외가 나면(예: 파일을 다시 읽지 못하는
        // 경우) 이 파일 하나 때문에 시안 접수 전체가 막혔음. 원본파일은
        // 참고용 첨부일 뿐이므로 실패해도 나머지 원본파일/PNG 시안 첨부는
        // 그대로 진행하고, 실패한 파일만 건너뛴다.
        let compressed = null;
        try {
          compressed = await compressFileForEmailAttachment(originalFile);
        } catch (err) {
          console.warn("[레이저 원본파일 첨부 실패, 건너뜀]", originalFile?.name, err);
          skippedOriginals.push({
            filename:
              originalFiles.length > 1
                ? `${filename} (원본 ${fileIdx + 1}/${originalFiles.length})`
                : filename,
            reason: err?.message || String(err),
          });
          continue;
        }

        if (compressed?.base64) {
          compressedEntries.push({
            filename: originalFilename,
            file: compressed.base64,
            isOriginal: true,
            fileIdx,
          });
        }
      }

      // 수정 이유: 원본파일을 여러 개 압축해도, 이 시안 하나(PNG + 원본
      // 전체)의 첨부 용량 합계가 배치 목표치(EMAIL_ATTACHMENT_BATCH_MAX_BYTES)
      // 를 넘으면 batchItemsByWeight()가 이 시안만 단독 배치로 뺄 수밖에
      // 없는데, 그 배치는 용량 자체가 문제라 몇 번을 재시도해도 항상 같은
      // 이유로 실패해서 시안이 통째로 누락됐음(재시도로 해결 불가능한
      // 유형). PNG 시안 원본은 그대로 지키고, 용량이 큰 원본파일부터
      // 순서대로 제외해 최소한 PNG 시안만이라도 확실히 접수되게 한다.
      const pngWeight = currentItemFiles.reduce((sum, f) => sum + f.file.length, 0);
      let totalWeight =
        pngWeight + compressedEntries.reduce((sum, e) => sum + e.file.length, 0);

      compressedEntries.sort((a, b) => b.file.length - a.file.length);

      while (totalWeight > EMAIL_ATTACHMENT_BATCH_MAX_BYTES && compressedEntries.length) {
        const dropped = compressedEntries.shift();
        totalWeight -= dropped.file.length;
        console.warn("[레이저 원본파일 첨부 용량 초과로 제외]", dropped.filename);
        skippedOriginals.push({
          filename:
            originalFiles.length > 1
              ? `${filename} (원본 ${dropped.fileIdx + 1}/${originalFiles.length})`
              : filename,
          reason: "첨부 용량 초과로 제외됨 (PNG 시안은 정상 첨부)",
        });
      }

      compressedEntries
        .sort((a, b) => a.fileIdx - b.fileIdx)
        .forEach((entry) => {
          files.push(entry);
          currentItemFiles.push(entry);
        });
    }

    itemFiles.push(currentItemFiles);
  }

  return { items, files, itemFiles, skippedOriginals };
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
  // 수정 이유: JSZip은 첨부가 10개 이상일 때만 필요함. 예전에는 이 검사를
  // packAttachmentParams() 맨 앞에서 무조건 했기 때문에, ZIP을 전혀 쓰지
  // 않는 소량 주문도 JSZip CDN 로딩이 실패하면 접수 자체가 막혔음.
  if (!window.JSZip) {
    throw new Error("JSZip 라이브러리가 로드되지 않았습니다.");
  }

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
