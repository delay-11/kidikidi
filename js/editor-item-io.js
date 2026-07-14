/* split from editor.js: 캔버스 ↔ 장바구니 아이템 저장/로드, 미리보기 PNG */


function refreshCurrentItemPreview() {
  const it = cartItems.find((x) => x.id === selectedItemId);
  if (!it) return;
  saveCanvasToItem(it);
}

/* =========================================================
 * 현재 캔버스 상태 저장 / 로드
========================================================= */
function renderItemPreviewDataUrl(it) {
  if (!it || !canvas) return "";

  const off = document.createElement("canvas");
  const size = getCanvasSize(it.profile || profileEl?.value || "OEM", it.capType || capTypeEl?.value || "-");
  off.width = size.w;
  off.height = size.h;
  const offCtx = off.getContext("2d");
  if (!offCtx) return "";

  const bgType = getNormalizedItemBgType(it);
  const color1 = it.design?.bgSet ? (it.design?.bgColor || it.bgColor || it.design?.background?.color || "#ffffff") : "#ffffff";
  const color2 = it.design?.bgColor2 || it.design?.background?.color2 || "#fdcc63";
  const direction = it.design?.bgDirection || it.design?.background?.direction || "to-right";
  const position = getGradientPositionFromItem(it);
  const softness = getGradientSoftnessFromItem(it);

  offCtx.save();
  offCtx.fillStyle = createBackgroundFill(offCtx, off.width, off.height, bgType, color1, color2, direction, position, softness);
  offCtx.fillRect(0, 0, off.width, off.height);
  offCtx.restore();

  // 수정 이유:
  // 이전에는 it.design.images의 dataURL을 새 Image로 다시 디코딩하면서
  // img.complete를 바로 체크했는데, data URL 디코딩이 항상 동기적이라는
  // 보장이 없어 업로드 직후 첫 저장에서 미리보기가 빈 값으로 나올 수 있었음.
  // 이 함수는 현재 캔버스 상태(userImages)를 저장하는 시점에만 호출되므로
  // 이미 로드가 끝난 live Image 객체를 그대로 재사용하면 됨.
  if (hasImageObject()) {
    syncActiveImageFromLegacy();
    userImages.forEach((obj) => {
      if (!obj?.img) return;
      drawTransformedImageObject(offCtx, obj.img, obj, off.width / 2, off.height / 2);
    });
  }

  const previewTexts = Array.isArray(it.design?.texts) && it.design.texts.length
    ? it.design.texts
    : it.design?.text?.value
      ? [it.design.text]
      : [];
  previewTexts.forEach((t) => drawTextObjectToContext?.(offCtx, off.width, off.height, t));

  try {
    return off.toDataURL("image/png");
  } catch (e) {
    console.warn("시안 미리보기 생성 실패:", e);
    return "";
  }
}

function saveCanvasToItem(it) {
  it.design = it.design || {};

  // 시안 불러오기 중에는 resetEditorStateBeforeLoad() 때문에 userImg가
  // 잠깐 null이 됩니다. 그 순간 저장 로직이 끼어들면 기존 이미지 데이터가
  // null로 덮여서, 더블클릭/빠른 클릭 후 이미지가 사라질 수 있습니다.
  if (hasImageObject()) {
    const images = serializeImageObjects();
    it.design.images = images;
    const active = images[activeImageIndex] || images[images.length - 1] || images[0];
    it.design.imgDataUrl = active?.imgDataUrl || null;
    it.design.cx = active?.cx ?? canvasLogicalW / 2;
    it.design.cy = active?.cy ?? canvasLogicalH / 2;
    it.design.scaleX = active?.scaleX ?? 1;
    it.design.scaleY = active?.scaleY ?? 1;
    it.design.rot = active?.rot ?? 0;
  } else if (!isLoadingItemToCanvas) {
    it.design.images = [];
    it.design.imgDataUrl = null;
    it.design.cx = imgCX;
    it.design.cy = imgCY;
    it.design.scaleX = imgScaleX;
    it.design.scaleY = imgScaleY;
    it.design.rot = imgRot;
  }
  it.design.bgSet = !!draftBgSet;
  it.design.bgType = draftBgSet && draftBgType === "gradient" ? "gradient" : "solid";
  it.design.bgColor = draftBgColor || "#ffffff";
  it.design.bgColor2 = draftBgColor2 || "#fdcc63";
  it.design.bgDirection = normalizeGradientDirection(draftBgDirection || "to-right");
  it.design.bgPosition = normalizeGradientPosition(draftGradientPosition);
  it.design.bgSoftness = normalizeGradientSoftness(draftGradientSoftness);
  it.design.background = {
    type: it.design.bgType,
    color: it.design.bgColor,
    color2: it.design.bgColor2,
    direction: normalizeGradientDirection(it.design.bgDirection),
    position: normalizeGradientPosition(draftGradientPosition),
    softness: normalizeGradientSoftness(draftGradientSoftness),
  };
  it.design.texts = serializeTextObjects?.() || [];
  it.design.text = getCurrentTextState?.() || { enabled: false, value: "" };
  it.bgColor = it.design.bgColor;
  it.design.previewDataUrl = renderItemPreviewDataUrl(it);
  it.originalFile = userImgFile || it.originalFile || null;
}

function resetEditorStateBeforeLoad() {
  userImg = null;
  userImgFile = null;
  userImages = [];
  activeImageIndex = -1;

  imgCX = canvasLogicalW / 2;
  imgCY = canvasLogicalH / 2;
  imgScaleX = 1;
  imgScaleY = 1;
  imgRot = 0;

  draftBgSet = false;
  draftBgType = "solid";
  draftBgColor = "#ffffff";
  draftBgColor2 = "#fdcc63";
  draftBgDirection = "to-right";
  draftGradientPosition = 0.5;
  draftGradientSoftness = 1;

  textEnabled = false;
  textValue = "";
  textFontType = "basic";
  textColor = "#111827";
  textAlign = "center";
  textSize = "medium";
  textCX = canvasLogicalW / 2;
  textCY = canvasLogicalH / 2;
  textScale = 1;
  textRot = 0;
  textObjects = [];
  activeTextIndex = -1;
  activeObjectType = null;
  syncTextUI?.();
  syncTextCountBadge?.();

  setActivePickrTarget("solid", bgPickBtn);
  setBgUI("#ffffff");
  syncGradientUI?.();
  syncTextUI?.();
  setMobileEyedropperMode?.(false);
}

async function loadItemToCanvas(it) {
  const loadToken = ++canvasLoadToken;
  isLoadingItemToCanvas = true;

  resetEditorStateBeforeLoad();

  userImgFile = it.originalFile || null;

  imgCX = it.design?.cx ?? canvasLogicalW / 2;
  imgCY = it.design?.cy ?? canvasLogicalH / 2;
  imgScaleX = it.design?.scaleX ?? it.design?.scale ?? 1;
  imgScaleY = it.design?.scaleY ?? it.design?.scale ?? 1;
  imgRot = it.design?.rot ?? 0;

  const savedBgSet = !!it.design?.bgSet;
  const savedBgType = it.design?.bgType || it.design?.background?.type || "solid";
  const nextBgType = savedBgSet && savedBgType === "gradient" ? "gradient" : "solid";
  const nextBgColor = normalizeHexInput(it.design?.bgColor || it.bgColor || it.design?.background?.color || "#ffffff", "#ffffff");
  const nextBgColor2 = normalizeHexInput(it.design?.bgColor2 || it.design?.background?.color2 || "#fdcc63", "#fdcc63");
  const nextBgDirection = normalizeGradientDirection(it.design?.bgDirection || it.design?.background?.direction || "to-right");
  const nextGradientPosition = getGradientPositionFromItem(it);
  const nextGradientSoftness = getGradientSoftnessFromItem(it);

  draftBgSet = savedBgSet;
  draftBgType = nextBgType;
  draftBgColor = nextBgColor;
  draftBgColor2 = nextBgColor2;
  draftBgDirection = nextBgDirection;
  draftGradientPosition = nextGradientPosition;
  draftGradientSoftness = nextGradientSoftness;

  it.design = it.design || {};
  it.bgColor = draftBgColor;
  it.design.bgSet = draftBgSet;
  it.design.bgColor = draftBgColor;
  it.design.bgType = draftBgType;
  it.design.bgColor2 = draftBgColor2;
  it.design.bgDirection = draftBgDirection;
  it.design.bgPosition = draftGradientPosition;
  it.design.bgSoftness = draftGradientSoftness;
  it.design.background = {
    type: draftBgType,
    color: draftBgColor,
    color2: draftBgColor2,
    direction: draftBgDirection,
    position: normalizeGradientPosition(draftGradientPosition),
    softness: normalizeGradientSoftness(draftGradientSoftness),
  };

  const savedTexts = Array.isArray(it.design?.texts) && it.design.texts.length
    ? it.design.texts
    : it.design?.text?.value
      ? [it.design.text] // 구버전 단일 text 필드 하위호환
      : [];

  textObjects = savedTexts
    .filter((t) => !!safeTrim(t?.value || ""))
    .slice(0, MAX_TEXT_COUNT)
    .map((t) => ({
      value: t.value || "",
      fontType: t.fontType || "basic",
      color: normalizeHexInput(t.color || "#111827", "#111827"),
      align: ["left", "center", "right"].includes(t.align) ? t.align : "center",
      size: ["small", "medium", "large"].includes(t.size) ? t.size : "medium",
      cx: Number.isFinite(t.cx) ? t.cx : canvasLogicalW / 2,
      cy: Number.isFinite(t.cy) ? t.cy : canvasLogicalH / 2,
      scale: Number.isFinite(t.scale) ? t.scale : 1,
      rot: Number.isFinite(t.rot) ? t.rot : 0,
    }));

  setActiveTextIndex(textObjects.length ? textObjects.length - 1 : -1);
  if (hasTextObject()) activeObjectType = "text";
  syncTextUI?.();
  syncTextCountBadge?.();

  setActivePickrTarget(draftBgType === "gradient" ? "gradient1" : "solid", draftBgType === "gradient" ? gradientColor1El : bgPickBtn);
  setBgUI(draftBgColor);
  syncGradientUI?.();

  const savedImages = Array.isArray(it.design?.images) && it.design.images.length
    ? it.design.images
    : it.design?.imgDataUrl
      ? [{
          imgDataUrl: it.design.imgDataUrl,
          cx: it.design?.cx,
          cy: it.design?.cy,
          scaleX: it.design?.scaleX ?? it.design?.scale,
          scaleY: it.design?.scaleY ?? it.design?.scale,
          rot: it.design?.rot,
        }]
      : [];

  userImages = [];
  for (const imageState of savedImages) {
    if (!imageState?.imgDataUrl) continue;
    const img = new Image();
    try {
      await new Promise((res, rej) => {
        img.onload = res;
        img.onerror = rej;
        img.src = imageState.imgDataUrl;
      });

      if (loadToken !== canvasLoadToken) return;

      userImages.push({
        img,
        file: null,
        cx: Number.isFinite(imageState.cx) ? imageState.cx : canvasLogicalW / 2,
        cy: Number.isFinite(imageState.cy) ? imageState.cy : canvasLogicalH / 2,
        scaleX: Number.isFinite(imageState.scaleX) ? imageState.scaleX : Number(imageState.scale ?? 1),
        scaleY: Number.isFinite(imageState.scaleY) ? imageState.scaleY : Number(imageState.scale ?? 1),
        rot: Number.isFinite(imageState.rot) ? imageState.rot : 0,
      });
    } catch (e) {
      console.warn("저장된 시안 이미지 불러오기 실패:", e);
    }
  }

  if (loadToken !== canvasLoadToken) return;
  setActiveImageIndex(userImages.length ? userImages.length - 1 : -1);
  if (hasImageObject()) activeObjectType = "image";
  else if (activeObjectType === "image") activeObjectType = hasTextObject() ? "text" : null;

  if (loadToken !== canvasLoadToken) return;
  isLoadingItemToCanvas = false;

  syncImageCountBadge();
  syncTextCountBadge();

  updateSelectedInfoText();
  updateMaoGuide();
  redraw();
  updateDraftInfo();
  syncImageCountBadge();
  syncTextCountBadge();
  updateActionLocks();
}

function clearEditor() {
  userImg = null;
  userImgFile = null;
  userImages = [];
  activeImageIndex = -1;
  imgCX = canvasLogicalW / 2;
  imgCY = canvasLogicalH / 2;
  imgScaleX = 1;
  imgScaleY = 1;
  imgRot = 0;

  draftBgColor = "#ffffff";
  draftBgColor2 = "#fdcc63";
  draftBgType = "solid";
  draftBgDirection = "to-right";
  draftGradientPosition = 0.5;
  draftGradientSoftness = 1;
  draftBgSet = false;

  textEnabled = false;
  textValue = "";
  textFontType = "basic";
  textColor = "#111827";
  textAlign = "center";
  textSize = "medium";
  textCX = canvasLogicalW / 2;
  textCY = canvasLogicalH / 2;
  textScale = 1;
  textRot = 0;
  textObjects = [];
  activeTextIndex = -1;
  activeObjectType = null;
  syncTextUI?.();

  selectedItemId = null;
  setMobileEyedropperMode(false);

  if (fileNameEl) fileNameEl.textContent = "선택된 파일 없음";
  syncImageCountBadge();
  syncTextCountBadge();
  if (bgTextEl) bgTextEl.textContent = "-";
  setBgUI("#ffffff");
  syncGradientUI?.();
  syncTextUI?.();

  updateSelectedInfoText();
  updateMaoGuide();
  redraw();
  updateDraftInfo();
  syncImageCountBadge();
  syncTextCountBadge();
  updateActionLocks();
}

function syncActiveItemDesign() {
  if (isLoadingItemToCanvas) return;

  const it = cartItems.find((x) => x.id === selectedItemId);
  if (!it) return;
  saveCanvasToItem(it);
  refreshCurrentItemPreview?.();
  renderCart?.();
}
