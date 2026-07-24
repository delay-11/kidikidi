/* split from editor.js: 텍스트 도구 */


/* =========================================================
 * 텍스트 UI / 렌더 유틸
========================================================= */
function getTextFontFamily(type = textFontType) {
  const map = {
    basic: "'Pretendard', system-ui, -apple-system, 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif",
    bold: "'JalnanGothic', 'Pretendard', 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif",
    round: "'Cafe24 Ssurround', 'Pretendard', 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif",
    hand: "'GriunMongtori', 'Pretendard', 'Apple SD Gothic Neo', 'Noto Sans KR', cursive",
    retro: "'BinggreIi', 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif",
    calli: "'HakgyoansimGaeulsopungB', 'Pretendard', 'Apple SD Gothic Neo', 'Noto Sans KR', cursive",
    soft: "'HakgyoansimGaeulsopungB', 'Pretendard', 'Apple SD Gothic Neo', 'Noto Sans KR', cursive",
    giants: "'GiantsInline', 'Pretendard', 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif",
    court: "'KBLCourt', 'Pretendard', 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif",
    jump: "'KBLJump', 'Pretendard', 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif",
  };
  return map[type] || map.basic;
}

function getTextFontWeight(type = textFontType) {
  // JalnanGothic / Cafe24 Ssurround / GriunMongtori는 단일 굵기 폰트라
  // 그 자체 디자인으로 이미 원하는 인상을 내므로 400을 사용.
  // BinggreIi / HakgyoansimGaeulsopungB / GiantsInline은 Bold(700) 파일 하나만 배포되어 700을 그대로 사용.
  if (type === "basic") return 700;
  if (type === "retro") return 700;
  if (type === "calli") return 700;
  if (type === "giants") return 700;
  return 400;
}

function getTextFontSize(size = textSize) {
  const base = { small: 28, medium: 42, large: 58 }[size] || 42;
  const ratio = Math.min(canvasLogicalW || 330, canvasLogicalH || 330) / 330;
  return Math.max(12, Math.round(base * ratio));
}

function getTextLines(value = textValue) {
  return String(value || "")
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 3);
}

/* =========================================================
 * 여러 텍스트 객체 관리 (js/editor-image.js의 userImages/activeImageIndex 패턴과 동일)
========================================================= */
function syncActiveTextFromLegacy() {
  if (!Array.isArray(textObjects)) textObjects = [];
  if (activeTextIndex < 0 || activeTextIndex >= textObjects.length) return;
  const obj = textObjects[activeTextIndex];
  if (!obj) return;
  obj.value = textValue;
  obj.fontType = textFontType;
  obj.color = textColor;
  obj.align = textAlign;
  obj.size = textSize;
  obj.cx = textCX;
  obj.cy = textCY;
  obj.scale = textScale;
  obj.rot = textRot;
}

function setActiveTextIndex(index) {
  if (!Array.isArray(textObjects)) textObjects = [];
  if (activeTextIndex >= 0 && activeTextIndex < textObjects.length) {
    syncActiveTextFromLegacy();
  }

  activeTextIndex = Number.isFinite(index) ? index : -1;
  if (activeTextIndex < 0 || activeTextIndex >= textObjects.length) {
    activeTextIndex = textObjects.length ? textObjects.length - 1 : -1;
  }

  const obj = activeTextIndex >= 0 ? textObjects[activeTextIndex] : null;
  textValue = obj?.value || "";
  textFontType = obj?.fontType || "basic";
  textColor = obj?.color || "#111827";
  textAlign = obj?.align || "center";
  textSize = obj?.size || "medium";
  textCX = Number.isFinite(obj?.cx) ? obj.cx : canvasLogicalW / 2;
  textCY = Number.isFinite(obj?.cy) ? obj.cy : canvasLogicalH / 2;
  textScale = Number.isFinite(obj?.scale) ? obj.scale : 1;
  textRot = Number.isFinite(obj?.rot) ? obj.rot : 0;
  textEnabled = !!(obj && safeTrim(obj.value || ""));
}

function getActiveTextObject() {
  if (!Array.isArray(textObjects) || !textObjects.length) return null;
  if (activeTextIndex < 0 || activeTextIndex >= textObjects.length) {
    setActiveTextIndex(textObjects.length - 1);
  }
  syncActiveTextFromLegacy();
  return textObjects[activeTextIndex] || null;
}

function serializeTextObjects() {
  syncActiveTextFromLegacy();
  return (Array.isArray(textObjects) ? textObjects : [])
    .filter((obj) => !!obj && !!safeTrim(obj.value || ""))
    .map((obj) => ({
      enabled: true,
      value: obj.value || "",
      fontType: obj.fontType || "basic",
      color: normalizeHexInput(obj.color, "#111827"),
      align: ["left", "center", "right"].includes(obj.align) ? obj.align : "center",
      size: ["small", "medium", "large"].includes(obj.size) ? obj.size : "medium",
      cx: Number.isFinite(obj.cx) ? obj.cx : canvasLogicalW / 2,
      cy: Number.isFinite(obj.cy) ? obj.cy : canvasLogicalH / 2,
      scale: Number.isFinite(obj.scale) ? obj.scale : 1,
      rot: Number.isFinite(obj.rot) ? obj.rot : 0,
    }));
}

function syncTextCountBadge() {
  const count = Array.isArray(textObjects)
    ? textObjects.filter((obj) => !!obj && !!safeTrim(obj.value || "")).length
    : 0;
  if (textCountBadgeEl) textCountBadgeEl.textContent = `현재 ${count}/${MAX_TEXT_COUNT}개`;
}

function getTextIndexAtPoint(px, py) {
  if (!hasTextObject()) return -1;
  syncActiveTextFromLegacy();

  for (let i = textObjects.length - 1; i >= 0; i -= 1) {
    const obj = textObjects[i];
    if (!obj || !safeTrim(obj.value || "")) continue;

    const dx = px - (Number.isFinite(obj.cx) ? obj.cx : canvasLogicalW / 2);
    const dy = py - (Number.isFinite(obj.cy) ? obj.cy : canvasLogicalH / 2);

    const rot = -(obj.rot || 0);
    const cos = Math.cos(rot);
    const sin = Math.sin(rot);

    const lx = dx * cos - dy * sin;
    const ly = dx * sin + dy * cos;

    const size = getTextHalfSize(obj);
    if (!size) continue;

    if (lx >= -size.halfW && lx <= size.halfW && ly >= -size.halfH && ly <= size.halfH) return i;
  }

  return -1;
}

function createEmptyTextObject() {
  return {
    value: "",
    fontType: "basic",
    color: "#111827",
    align: "center",
    size: "medium",
    cx: canvasLogicalW / 2,
    cy: canvasLogicalH / 2,
    scale: 1,
    rot: 0,
  };
}

function addNewTextSlot() {
  if (uiLocked) return false;
  if (!validateUserInfo(false)) return false;

  syncActiveTextFromLegacy();

  const active = getActiveTextObject();
  if (active && !safeTrim(active.value || "")) {
    showToast("텍스트를 입력해 주세요.", "warn");
    textInputEl?.focus();
    return false;
  }

  const validCount = Array.isArray(textObjects)
    ? textObjects.filter((obj) => !!obj && !!safeTrim(obj.value || "")).length
    : 0;
  if (validCount >= MAX_TEXT_COUNT) {
    showToast(`텍스트는 최대 ${MAX_TEXT_COUNT}개까지 추가할 수 있습니다.`, "warn");
    return false;
  }

  if (!Array.isArray(textObjects)) textObjects = [];
  textObjects.push(createEmptyTextObject());
  setActiveTextIndex(textObjects.length - 1);
  activeObjectType = "text";

  if (textInputEl) textInputEl.value = "";
  syncTextUI();
  syncTextCountBadge();
  textInputEl?.focus();
  return true;
}

function deleteActiveTextObject() {
  if (!hasTextObject()) return false;

  if (activeTextIndex >= 0 && Array.isArray(textObjects)) {
    textObjects.splice(activeTextIndex, 1);
  } else {
    textObjects = [];
  }

  setActiveTextIndex(textObjects.length ? Math.min(activeTextIndex, textObjects.length - 1) : -1);
  if (activeObjectType === "text") activeObjectType = hasTextObject() ? "text" : hasImageObject() ? "image" : null;

  syncTextUI();
  syncTextCountBadge();
  return true;
}


// 미사용 확인 (2026-07-09) - 호출부 없음, 필요시 복원
// function getTextFontDefaultLabel(type = "basic") {
//   const map = {
//     basic: "Aa 기본",
//     bold: "Aa 굵게",
//     round: "Aa 둥근",
//     hand: "Aa 손글씨",
//     pixel: "Aa 픽셀",
//     calli: "Aa 캘리",
//   };
//   return map[type] || map.basic;
// }


function syncTextFontPreviewButtons() {
  // 폰트 타입 버튼은 입력값 미리보기가 아니라, 각 폰트 이름표를 해당 폰트로 보여주는 용도입니다.
  const labels = {
    basic: "Aa 기본",
    bold: "Aa 굵게",
    round: "Aa 둥근",
    hand: "Aa 손글씨",
    retro: "Aa 레트로",
    calli: "Aa 캘리",
    giants: "Aa 자이언츠",
    court: "Aa 코트",
    jump: "Aa 점프",
  };

  textFontBtnEls?.forEach((btn) => {
    const type = btn.dataset.textFont || "basic";
    const label = labels[type] || labels.basic;
    btn.textContent = label;
    btn.title = label;
    btn.setAttribute("aria-label", label);
  });
}

function syncTextUI() {
  if (textInputEl) textInputEl.value = textValue || "";
  const color = normalizeHexInput(textColor, "#111827");
  if (textColorSwatchEl) textColorSwatchEl.style.background = color;
  if (textColorValueEl) textColorValueEl.textContent = color;

  textFontBtnEls?.forEach((btn) => btn.classList.toggle("is-active", btn.dataset.textFont === textFontType));
  textAlignBtnEls?.forEach((btn) => btn.classList.toggle("is-active", btn.dataset.textAlign === textAlign));
  textSizeBtnEls?.forEach((btn) => btn.classList.toggle("is-active", btn.dataset.textSize === textSize));
  syncTextFontPreviewButtons?.();

  if (textClearBtnEl) textClearBtnEl.disabled = uiLocked || !textEnabled;
}

function applyTextToCurrentItem() {
  const it = cartItems.find((x) => x.id === selectedItemId);
  if (!it) return;
  it.design = it.design || {};
  it.design.texts = serializeTextObjects();
  // 구버전 단일 text 필드도 활성 텍스트 기준으로 계속 채워 하위호환 유지
  it.design.text = getCurrentTextState();
}

function applyTextSettings(partial = {}) {
  if (uiLocked) return;
  if (!validateUserInfo(false)) return;

  const shouldAlignTextToCanvas = !!partial.align;

  // 활성 슬롯이 없으면 새로 만듭니다 — "+ 텍스트 추가" 버튼 없이도
  // 첫 텍스트는 타이핑만으로 바로 생성되는 기존 UX를 유지하기 위함.
  if (activeTextIndex < 0 || activeTextIndex >= textObjects.length) {
    if (!Array.isArray(textObjects)) textObjects = [];
    if (textObjects.length < MAX_TEXT_COUNT) {
      textObjects.push(createEmptyTextObject());
    }
    activeTextIndex = textObjects.length - 1;
    const obj = textObjects[activeTextIndex];
    textValue = obj?.value || "";
    textFontType = obj?.fontType || "basic";
    textColor = obj?.color || "#111827";
    textAlign = obj?.align || "center";
    textSize = obj?.size || "medium";
    textCX = Number.isFinite(obj?.cx) ? obj.cx : canvasLogicalW / 2;
    textCY = Number.isFinite(obj?.cy) ? obj.cy : canvasLogicalH / 2;
    textScale = Number.isFinite(obj?.scale) ? obj.scale : 1;
    textRot = Number.isFinite(obj?.rot) ? obj.rot : 0;
  }

  if (typeof partial.value === "string") {
    textValue = partial.value.slice(0, 80);
  }
  if (partial.fontType) textFontType = partial.fontType;
  if (partial.color) textColor = normalizeHexInput(partial.color, textColor || "#111827");
  if (partial.align) textAlign = ["left", "center", "right"].includes(partial.align) ? partial.align : "center";
  if (partial.size) textSize = ["small", "medium", "large"].includes(partial.size) ? partial.size : "medium";
  if (typeof partial.enabled === "boolean") textEnabled = partial.enabled;

  if (textEnabled && !safeTrim(textValue)) {
    textEnabled = false;
  }

  if (textEnabled && (!textCX || !textCY)) {
    textCX = canvasLogicalW / 2;
    textCY = canvasLogicalH / 2;
  }
  if (textEnabled) activeObjectType = "text";

  if (textEnabled && shouldAlignTextToCanvas) {
    alignTextToCanvas(textAlign);
  }

  syncActiveTextFromLegacy();
  applyTextToCurrentItem();
  syncTextUI();
  syncTextCountBadge();
  redraw();
  refreshCurrentItemPreview?.();
  renderCart?.();
  updateActionLocks?.();
}

function getTextRenderMetrics(targetCtx, w, h, textState = {}) {
  const lines = getTextLines(textState.value || textValue);
  if (!lines.length) return null;

  const color = normalizeHexInput(textState.color, "#111827");
  const fontType = textState.fontType || "basic";
  const sizeKey = textState.size || "medium";
  const scale = Number.isFinite(textState.scale) ? textState.scale : 1;
  let fontSize = Math.max(10, Math.round(getTextFontSize(sizeKey) * scale));
  const maxWidth = Math.max(24, w - 36);
  const family = getTextFontFamily(fontType);
  const weight = getTextFontWeight(fontType);

  targetCtx.save();
  targetCtx.font = `${weight} ${fontSize}px ${family}`;
  let widest = Math.max(...lines.map((line) => targetCtx.measureText(line).width));

  // 수정 이유:
  // 축소 비율 계산 후 Math.floor로 반올림하는 과정에서 재측정한 폭이
  // 여전히 maxWidth를 살짝 넘는 경우가 있어, 폰트 크기가 최소값에
  // 도달하거나 더 이상 줄어들지 않을 때까지 반복 보정
  while (widest > maxWidth && fontSize > 10) {
    const ratio = maxWidth / widest;
    const nextFontSize = Math.max(10, Math.floor(fontSize * ratio));
    if (nextFontSize >= fontSize) break;
    fontSize = nextFontSize;
    targetCtx.font = `${weight} ${fontSize}px ${family}`;
    widest = Math.max(...lines.map((line) => targetCtx.measureText(line).width));
  }
  targetCtx.restore();

  const lineHeight = Math.round(fontSize * 1.18);
  const totalH = Math.max(lineHeight, lineHeight * lines.length);
  return { lines, color, fontType, fontSize, family, weight, lineHeight, totalH, widest: Math.max(24, widest) };
}

function drawTextObjectToContext(targetCtx, w, h, textState = {}) {
  if (!safeTrim(textState?.value || "")) return;

  const metrics = getTextRenderMetrics(targetCtx, w, h, textState);
  if (!metrics) return;

  const align = ["left", "center", "right"].includes(textState.align) ? textState.align : "center";
  const cx = Number.isFinite(textState.cx) ? textState.cx : w / 2;
  const cy = Number.isFinite(textState.cy) ? textState.cy : h / 2;
  const rot = Number.isFinite(textState.rot) ? textState.rot : 0;
  const x = align === "left" ? -metrics.widest / 2 : align === "right" ? metrics.widest / 2 : 0;
  const startY = -metrics.totalH / 2 + metrics.lineHeight / 2;

  targetCtx.save();
  targetCtx.translate(cx, cy);
  targetCtx.rotate(rot);
  targetCtx.fillStyle = metrics.color;
  targetCtx.textBaseline = "middle";
  targetCtx.textAlign = align;
  targetCtx.font = `${metrics.weight} ${metrics.fontSize}px ${metrics.family}`;

  metrics.lines.forEach((line, idx) => {
    targetCtx.fillText(line, x, startY + idx * metrics.lineHeight, metrics.widest);
  });

  targetCtx.restore();
}

function getCurrentTextState() {
  return {
    enabled: !!textEnabled,
    value: textValue || "",
    fontType: textFontType || "basic",
    color: normalizeHexInput(textColor, "#111827"),
    align: textAlign || "center",
    size: textSize || "medium",
    cx: Number.isFinite(textCX) && textCX ? textCX : canvasLogicalW / 2,
    cy: Number.isFinite(textCY) && textCY ? textCY : canvasLogicalH / 2,
    scale: Number.isFinite(textScale) ? textScale : 1,
    rot: Number.isFinite(textRot) ? textRot : 0,
  };
}


function hasTextObject() {
  return Array.isArray(textObjects) && textObjects.some((obj) => !!obj && !!safeTrim(obj.value || ""));
}

function getTextHalfSize(textState = getCurrentTextState()) {
  if (!textState || !safeTrim(textState.value || "")) return null;
  const metrics = getTextRenderMetrics(ctx, canvasLogicalW, canvasLogicalH, textState);
  if (!metrics) return null;
  return {
    halfW: Math.max(16, metrics.widest / 2 + 10),
    halfH: Math.max(12, metrics.totalH / 2 + 8),
  };
}

function alignTextToCanvas(align = textAlign || "center") {
  if (!hasTextObject()) return;
  textCX = getCanvasAlignedX("text", align);
  if (!Number.isFinite(textCY) || !textCY) textCY = canvasLogicalH / 2;
}

// 미사용 확인 (다중 텍스트 지원 후) - getTextIndexAtPoint()로 대체됨, 필요시 복원
// function isPointOnText(px, py) {
//   if (!hasTextObject()) return false;
//   const center = getObjectCenter("text");
//   const dx = px - center.x;
//   const dy = py - center.y;
//   const rot = -getObjectRot("text");
//   const cos = Math.cos(rot);
//   const sin = Math.sin(rot);
//   const lx = dx * cos - dy * sin;
//   const ly = dx * sin + dy * cos;
//   const size = getTextHalfSize();
//   if (!size) return false;
//   return lx >= -size.halfW && lx <= size.halfW && ly >= -size.halfH && ly <= size.halfH;
// }
