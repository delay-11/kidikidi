/* split from editor.js: 이미지 업로드/상태/변환 */


function syncActiveImageFromLegacy() {
  if (!Array.isArray(userImages)) userImages = [];
  if (activeImageIndex < 0 || activeImageIndex >= userImages.length) return;
  const obj = userImages[activeImageIndex];
  if (!obj) return;
  obj.img = userImg || obj.img || null;
  obj.file = userImgFile || obj.file || null;
  obj.cx = imgCX;
  obj.cy = imgCY;
  obj.scaleX = imgScaleX;
  obj.scaleY = imgScaleY;
  obj.rot = imgRot;
}

function setActiveImageIndex(index) {
  if (!Array.isArray(userImages)) userImages = [];
  if (activeImageIndex >= 0 && activeImageIndex < userImages.length) {
    syncActiveImageFromLegacy();
  }

  activeImageIndex = Number.isFinite(index) ? index : -1;
  if (activeImageIndex < 0 || activeImageIndex >= userImages.length) {
    activeImageIndex = userImages.length ? userImages.length - 1 : -1;
  }

  const obj = activeImageIndex >= 0 ? userImages[activeImageIndex] : null;
  userImg = obj?.img || null;
  userImgFile = obj?.file || null;
  imgCX = Number.isFinite(obj?.cx) ? obj.cx : canvasLogicalW / 2;
  imgCY = Number.isFinite(obj?.cy) ? obj.cy : canvasLogicalH / 2;
  imgScaleX = Number.isFinite(obj?.scaleX) ? obj.scaleX : 1;
  imgScaleY = Number.isFinite(obj?.scaleY) ? obj.scaleY : 1;
  imgRot = Number.isFinite(obj?.rot) ? obj.rot : 0;
}

function hasImageObject() {
  return Array.isArray(userImages) && userImages.some((obj) => !!obj?.img);
}

function getActiveImageObject() {
  if (!Array.isArray(userImages) || !userImages.length) return null;
  if (activeImageIndex < 0 || activeImageIndex >= userImages.length) {
    setActiveImageIndex(userImages.length - 1);
  }
  syncActiveImageFromLegacy();
  return userImages[activeImageIndex] || null;
}

function serializeImageObjects() {
  syncActiveImageFromLegacy();
  return (Array.isArray(userImages) ? userImages : [])
    .filter((obj) => !!obj?.img?.src)
    .map((obj) => ({
      imgDataUrl: obj.img.src,
      cx: Number.isFinite(obj.cx) ? obj.cx : canvasLogicalW / 2,
      cy: Number.isFinite(obj.cy) ? obj.cy : canvasLogicalH / 2,
      scaleX: Number.isFinite(obj.scaleX) ? obj.scaleX : 1,
      scaleY: Number.isFinite(obj.scaleY) ? obj.scaleY : 1,
      rot: Number.isFinite(obj.rot) ? obj.rot : 0,
      fileName: obj.file?.name || "",
    }));
}

// 수정 이유: design.images[]로 직렬화되는 이미지들과 항상 같은 순서/개수로
// 원본파일도 함께 저장해야 시안 확정 메일에 업로드된 원본파일이 전부
// 첨부됨 - serializeImageObjects()와 완전히 같은 필터 조건을 사용해서
// 인덱스가 어긋나지 않게 한다.
function collectOriginalFiles() {
  syncActiveImageFromLegacy();
  return (Array.isArray(userImages) ? userImages : [])
    .filter((obj) => !!obj?.img?.src)
    .map((obj) => obj.file || null);
}

function syncImageCountBadge() {
  const count = Array.isArray(userImages) ? userImages.filter((obj) => !!obj?.img).length : (userImg ? 1 : 0);
  if (imageCountBadgeEl) imageCountBadgeEl.textContent = `현재 ${count}개`;
  if (fileNameEl) {
    fileNameEl.textContent = count
      ? count === 1
        ? (userImgFile?.name || "이미지 1개")
        : `이미지 ${count}개`
      : "선택된 파일 없음";
  }
}

/* =========================================================
 * 규격 표시명 반환
========================================================= */
function getCapTypeDisplayName(capType) {
  if (!capType) return "-";
  if (capType === "R2-1U_HOMING") return "R2-1U 돌기";

  const profile = safeTrim(profileEl?.value || "");
  const options = CAP_OPTIONS?.[profile] || [];
  const found = options.find((opt) => opt.value === capType);

  return found?.label || capType;
}

function getImageIndexAtPoint(px, py) {
  if (!hasImageObject()) return -1;
  syncActiveImageFromLegacy();

  for (let i = userImages.length - 1; i >= 0; i -= 1) {
    const obj = userImages[i];
    if (!obj?.img) continue;

    const dx = px - (obj.cx ?? canvasLogicalW / 2);
    const dy = py - (obj.cy ?? canvasLogicalH / 2);

    const cos = Math.cos(-(obj.rot ?? 0));
    const sin = Math.sin(-(obj.rot ?? 0));

    const lx = dx * cos - dy * sin;
    const ly = dx * sin + dy * cos;

    const halfW = (obj.img.width * (obj.scaleX ?? 1)) / 2;
    const halfH = (obj.img.height * (obj.scaleY ?? 1)) / 2;

    if (lx >= -halfW && lx <= halfW && ly >= -halfH && ly <= halfH) return i;
  }

  return -1;
}

/* =========================================================
 * 이미지 업로드 / 삭제
========================================================= */
function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;

    reader.readAsDataURL(file);
  });
}

function createImageFromSrc(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/* =========================================================
 * 업로드 이미지 최적화
 * - 원본 그대로 캔버스에 올리면 렉이 심해서
 *   긴 쪽 기준으로 축소 후 jpeg로 압축해서 사용
========================================================= */
async function loadImageFromFile(file) {
  const originalDataUrl = await readFileAsDataURL(file);
  const originalImg = await createImageFromSrc(originalDataUrl);

  const MAX_SIZE = 1600;
  let targetWidth = originalImg.width;
  let targetHeight = originalImg.height;

  if (targetWidth > MAX_SIZE || targetHeight > MAX_SIZE) {
    const ratio = Math.min(MAX_SIZE / targetWidth, MAX_SIZE / targetHeight);
    targetWidth = Math.round(targetWidth * ratio);
    targetHeight = Math.round(targetHeight * ratio);
  }

  const tempCanvas = document.createElement("canvas");
  tempCanvas.width = targetWidth;
  tempCanvas.height = targetHeight;

  const tempCtx = tempCanvas.getContext("2d", { alpha: true });
  if (!tempCtx) {
    throw new Error("2D 캔버스를 생성할 수 없습니다.");
  }

  tempCtx.clearRect(0, 0, targetWidth, targetHeight);
  tempCtx.drawImage(originalImg, 0, 0, targetWidth, targetHeight);

  /*
   * PNG 투명 배경이 꼭 필요한 경우까지 전부 JPEG로 바꾸면
   * 투명이 날아갈 수 있음.
   * 그래서 PNG/WEBP는 원본 포맷을 최대한 유지하고,
   * 그 외는 JPEG로 압축.
   */
  const mimeType =
    file.type === "image/png"
      ? "image/png"
      : file.type === "image/webp"
        ? "image/webp"
        : "image/jpeg";

  const quality =
    mimeType === "image/jpeg" || mimeType === "image/webp" ? 0.85 : undefined;
  const optimizedDataUrl =
    quality !== undefined
      ? tempCanvas.toDataURL(mimeType, quality)
      : tempCanvas.toDataURL(mimeType);

  return await createImageFromSrc(optimizedDataUrl);
}

function warnLowResolutionImage(img) {
  if (!img) return false;

  const minSide = Math.min(img.width, img.height);
  const maxSide = Math.max(img.width, img.height);

  return minSide < 600 || maxSide < 600;
}

/* =========================================================
 * 업로드 직후 첨부 용량 사전 확인
 * - 수정 이유: 업로드 시점엔 원본 파일 크기(15MB 제한)만 확인하는데,
 *   배경/기존 이미지와 합쳐진 최종 첨부 PNG 용량은 그 크기만으로 알 수
 *   없음 - 접수 버튼을 눌러야만 화질이 자동으로 낮아진 걸 알게 되면
 *   이미 늦으므로, 업로드 직후 실제 접수 때와 같은 방식으로 한 번
 *   렌더링해 미리 계산해보고 기준(2MB)을 넘으면 바로 알려준다.
 *   (실제 자동 화질 조정 기준인 EMAIL_ATTACHMENT_BATCH_MAX_BYTES(1.6MB)
 *   보다 여유를 더 둬서, 아슬아슬한 경우까지 매번 경고하지 않도록 함)
========================================================= */
const UPLOAD_SIZE_WARNING_BYTES = 2_000_000;

function buildDraftItemSnapshot() {
  return {
    profile: profileEl?.value || "OEM",
    capType: capTypeEl?.value || "-",
    design: {
      images: typeof serializeImageObjects === "function" ? serializeImageObjects() : [],
      texts: typeof serializeTextObjects === "function" ? serializeTextObjects() : [],
      bgSet: !!draftBgSet,
      bgType: draftBgType,
      bgColor: draftBgColor || "#ffffff",
      bgColor2: draftBgColor2 || "#fdcc63",
      bgDirection: draftBgDirection || "to-right",
      bgPosition:
        typeof normalizeGradientPosition === "function"
          ? normalizeGradientPosition(draftGradientPosition)
          : 0.5,
      bgSoftness:
        typeof normalizeGradientSoftness === "function"
          ? normalizeGradientSoftness(draftGradientSoftness)
          : 1,
    },
  };
}

async function isDraftAttachmentTooHeavy() {
  try {
    const item = buildDraftItemSnapshot();
    const size = getCanvasSize(item.profile, item.capType);
    const exportScale =
      size.w === 330 && size.h === 330 ? SMALL_CANVAS_EXPORT_SCALE : 1;

    const canvas = await renderItemToCanvasAtScale(item, size, exportScale);
    const bytes = dataUrlToBase64(canvas.toDataURL("image/png")).length;

    return bytes > UPLOAD_SIZE_WARNING_BYTES;
  } catch (err) {
    console.warn("[업로드 용량 사전 확인 실패]", err);
    return false;
  }
}

// 미사용 확인 (2026-07-09) - 호출부 없음, 필요시 복원
// function fitImageToCanvas(img) {
//   const scale = Math.max(canvas.width / img.width, canvas.height / img.height);
//   imgScaleX = scale;
//   imgScaleY = scale;
//   imgRot = 0;
//   imgCX = canvas.width / 2;
//   imgCY = canvas.height / 2;
// }

fileBtn?.addEventListener(
  "click",
  (e) => {
    e.preventDefault();
    e.stopPropagation();

    clearCanvasNotice();
    setMobileEyedropperMode(false);

    if (!fileEl) {
      console.error("[upload] fileEl이 없습니다.");
      setCanvasNotice("파일 업로드 요소를 찾을 수 없습니다.", "error");
      return;
    }

    /* 이미 접수 완료된 주문번호면 업로드 막기 */
    if (isOrderConfirmed(safeTrim(orderEl?.value || ""))) {
      applyConfirmedLockIfNeeded(true);
      return;
    }

    /* 주문자 정보 미입력 시 업로드 막기 */
    if (!validateUserInfo(true)) {
      updateActionLocks();
      return;
    }

    if (fileEl.disabled) {
      setCanvasNotice(
        "현재 업로드할 수 없는 상태입니다. 주문자 정보와 옵션을 먼저 확인해주세요.",
        "error",
      );
      return;
    }

    /* 여기까지는 반드시 동기적으로 와야 파일창이 뜸 */
    fileEl.click();
  },
  true,
);

fileEl?.addEventListener("change", async () => {
  clearCanvasNotice();
  setMobileEyedropperMode(false);

  console.log("[upload] file change");
  console.log("[upload] selected files:", fileEl.files);

  if (await applyConfirmedLockIfNeeded(true)) {
    fileEl.value = "";
    return;
  }

  if (!validateUserInfo(true)) {
    fileEl.value = "";
    updateActionLocks();
    return;
  }

  const files = Array.from(fileEl.files || []);
  if (!files.length) return;

  const tooLarge = files.find((file) => file.size > 15 * 1024 * 1024);
  if (tooLarge) {
    setCanvasNotice(
      `${tooLarge.name} 파일 용량이 너무 큽니다. 15MB 이하 파일로 다시 시도해주세요.`,
      "error",
    );
    fileEl.value = "";
    updateActionLocks();
    return;
  }

  try {
    setCanvasNotice("이미지를 불러오는 중입니다...", "ok");

    for (const f of files) {
      const img = await loadImageFromFile(f);
      const scale = Math.max(canvasLogicalW / img.width, canvasLogicalH / img.height);
      userImages.push({
        img,
        file: f || null,
        cx: canvasLogicalW / 2,
        cy: canvasLogicalH / 2,
        scaleX: scale,
        scaleY: scale,
        rot: 0,
      });
      warnLowResolutionImage(img);
    }

    setActiveImageIndex(userImages.length - 1);
    activeObjectType = "image";
    syncImageCountBadge();

    redraw();
    syncActiveItemDesign?.();
    updateSelectedInfoText();
    updateDraftInfo();
    updateActionLocks();

    clearCanvasNotice();

    const uploadedText = files.length > 1 ? `이미지 ${files.length}개가 업로드되었습니다.` : "이미지가 업로드되었습니다.";
    const tooHeavy = await isDraftAttachmentTooHeavy();

    if (tooHeavy) {
      showToast(
        `${uploadedText} 다만 이 시안은 용량이 커서 접수 시 화질이 자동으로 낮아질 수 있어요.`,
        "warn",
        3600,
      );
    } else {
      showToast(uploadedText, "ok");
    }
  } catch (e) {
    console.error("이미지 업로드 실패:", e);
    setCanvasNotice(
      "이미지 파일을 불러오는 중 문제가 발생했습니다. 다른 파일로 다시 시도해주세요.",
      "error",
    );
    showToast("이미지 업로드에 실패했습니다.", "error");
  } finally {
    fileEl.value = "";
    updateActionLocks();
  }
});

imageCenterBtn?.addEventListener(
  "click",
  async (e) => {
    e.preventDefault();
    e.stopPropagation();

    clearCanvasNotice();
    setMobileEyedropperMode(false);

    if (await applyConfirmedLockIfNeeded(true)) return;

    const obj = getActiveImageObject();
    if (!obj?.img) {
      showToast("중앙에 배치할 이미지가 없습니다.", "warn");
      updateActionLocks();
      return;
    }

    activeObjectType = "image";
    setObjectCenter("image", canvasLogicalW / 2, canvasLogicalH / 2);

    redraw();
    syncActiveItemDesign?.();
    updateSelectedInfoText();
    updateDraftInfo();
    updateActionLocks();
    showToast("이미지를 중앙에 배치했습니다.", "ok");
  },
  true,
);

fileDelBtn?.addEventListener(
  "click",
  async (e) => {
    e.preventDefault();
    e.stopPropagation();

    clearCanvasNotice();
    setMobileEyedropperMode(false);

    if (await applyConfirmedLockIfNeeded(true)) return;

    if (activeImageIndex >= 0 && Array.isArray(userImages)) {
      userImages.splice(activeImageIndex, 1);
    } else {
      userImages = [];
    }
    setActiveImageIndex(userImages.length ? Math.min(activeImageIndex, userImages.length - 1) : -1);
    if (activeObjectType === "image") activeObjectType = hasImageObject() ? "image" : hasTextObject() ? "text" : null;
    syncImageCountBadge();

    redraw();
    updateSelectedInfoText();
    updateDraftInfo();
    updateActionLocks();
    clearCanvasNotice();
    showToast("이미지가 삭제되었습니다.", "ok");
  },
  true,
);

