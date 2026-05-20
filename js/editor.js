/* moved from js/design/panel-canvas.js */
/* =========================================================
 * Pickr 인스턴스
========================================================= */
let bgPickr = null;
let activePickrTarget = "solid";
let activePickrAnchor = null;

let isAltResizePressed = false;

window.addEventListener("keydown", (e) => {
  if (e.key === "Alt") isAltResizePressed = true;
});

window.addEventListener("keyup", (e) => {
  if (e.key === "Alt") isAltResizePressed = false;
});

window.addEventListener("blur", () => {
  isAltResizePressed = false;
});
let activeResizePointerId = null;

// 시안 리스트에서 저장된 시안을 불러오는 동안
// 캔버스 상태가 잠깐 비어 있는 값을 원본 시안에 덮어쓰지 않도록 막습니다.
let isLoadingItemToCanvas = false;
let canvasLoadToken = 0;

/* =========================================================
 * 모바일 스포이드
========================================================= */
let mobileEyedropperMode = false;

function isTouchDevice() {
  return "ontouchstart" in window || navigator.maxTouchPoints > 0;
}

function setMobileEyedropperMode(active) {
  mobileEyedropperMode = !!active;
  canvasWrapEl?.classList.toggle("isEyedropperMode", mobileEyedropperMode);
}

function rgbToHex(r, g, b) {
  return (
    "#" +
    [r, g, b]
      .map((v) => Number(v).toString(16).padStart(2, "0"))
      .join("")
      .toLowerCase()
  );
}

function pickCanvasColorAtClientPoint(clientX, clientY) {
  if (!canvas) return null;

  const rect = canvas.getBoundingClientRect();
  if (!rect.width || !rect.height) return null;

  const x = Math.floor(((clientX - rect.left) / rect.width) * canvas.width);
  const y = Math.floor(((clientY - rect.top) / rect.height) * canvas.height);

  if (x < 0 || y < 0 || x >= canvas.width || y >= canvas.height) {
    return null;
  }

  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;

  const pixel = ctx.getImageData(x, y, 1, 1).data;
  if (!pixel || pixel.length < 4) return null;

  if (pixel[3] < 10) {
    return {
      ok: false,
      reason: "transparent",
    };
  }

  return {
    ok: true,
    hex: rgbToHex(pixel[0], pixel[1], pixel[2]),
  };
}

function isAltPressed(ev) {
  return !!(ev?.altKey || ev?.getModifierState?.("Alt") || isAltResizePressed);
}

function syncAltPressed(ev) {
  isAltResizePressed = isAltPressed(ev);
}

function getPickrPanel() {
  return bgPickr?.getRoot?.()?.app || null;
}

function positionPickrPanel() {
  const panel = getPickrPanel();
  const anchor = activePickrAnchor || bgPickBtn;
  if (!panel || !anchor) return;

  const rect = anchor.getBoundingClientRect();
  const panelWidth = panel.offsetWidth || 260;
  const gap = 10;

  let left = rect.left;
  let top = rect.bottom + gap;

  if (left + panelWidth > window.innerWidth - 16) {
    left = Math.max(16, window.innerWidth - panelWidth - 16);
  }

  panel.style.position = "fixed";
  panel.style.left = `${left}px`;
  panel.style.top = `${top}px`;
  panel.style.zIndex = "99999";
}

function isLaserFixedBg() {
  const profile = safeTrim(profileEl?.value || "");
  const laser = safeTrim(laserEl?.value || "none");
  return profile === "OEM" && (laser === "black" || laser === "white");
}

/* =========================================================
 * 배경 모드 / 그라데이션 유틸
========================================================= */
function normalizeBgMode(mode) {
  return mode === "gradient" ? "gradient" : "solid";
}


function normalizeHexInput(value, fallback = "#ffffff") {
  let v = String(value || "").trim().toLowerCase();
  if (!v) return fallback;
  if (!v.startsWith("#")) v = `#${v}`;
  if (/^#[0-9a-f]{3}$/i.test(v)) {
    v = `#${v[1]}${v[1]}${v[2]}${v[2]}${v[3]}${v[3]}`.toLowerCase();
  }
  return /^#[0-9a-f]{6}$/i.test(v) ? v.toLowerCase() : fallback;
}

function isCompleteHexInput(value) {
  const v = String(value || "").trim();
  return /^#?[0-9a-f]{6}$/i.test(v) || /^#?[0-9a-f]{3}$/i.test(v);
}

function getBgLabelFromState(type, color1, color2, direction) {
  if (normalizeBgMode(type) === "gradient") {
    return `그라데이션 ${color1 || "#ffffff"} → ${color2 || "#fdcc63"}`;
  }
  return color1 || "#ffffff";
}

function normalizeGradientDirection(direction) {
  return ["to-left", "to-right", "to-top", "to-bottom"].includes(direction) ? direction : "to-right";
}

function getGradientPoints(direction, w, h) {
  switch (normalizeGradientDirection(direction)) {
    case "to-left":
      return [w, 0, 0, 0];
    case "to-top":
      return [0, h, 0, 0];
    case "to-bottom":
      return [0, 0, 0, h];
    case "to-right":
    default:
      return [0, 0, w, 0];
  }
}

function createBackgroundFill(c, w, h, bgType, color1, color2, direction) {
  if (normalizeBgMode(bgType) !== "gradient") {
    return color1 || "#ffffff";
  }

  const [x0, y0, x1, y1] = getGradientPoints(direction, w, h);
  const gradient = c.createLinearGradient(x0, y0, x1, y1);
  gradient.addColorStop(0, color1 || "#ffffff");
  gradient.addColorStop(1, color2 || "#fdcc63");
  return gradient;
}

function getPickrTargetColor(target = activePickrTarget) {
  if (target === "text") return normalizeHexInput(textColor, "#111827");
  if (target === "gradient2") return normalizeHexInput(draftBgColor2, "#fdcc63");
  if (target === "gradient1") return normalizeHexInput(draftBgColor, "#ffffff");
  return normalizeHexInput(draftBgColor, "#ffffff");
}

function setActivePickrTarget(target = "solid", anchor = bgPickBtn) {
  activePickrTarget = target;
  activePickrAnchor = anchor || bgPickBtn;

  if (bgPickr) {
    try {
      bgPickr.setColor(getPickrTargetColor(target), true);
    } catch (e) {
      console.warn("Pickr 색상 타깃 반영 실패:", e);
    }
  }
}

function getDraftBgLabel() {
  return draftBgSet
    ? getBgLabelFromState(draftBgType, draftBgColor, draftBgColor2, draftBgDirection)
    : "-";
}

function syncGradientUI() {
  const isGradient = draftBgType === "gradient";
  const toolBgPanel = document.getElementById("toolBg");
  if (toolBgPanel) toolBgPanel.dataset.bgMode = isGradient ? "gradient" : "solid";

  bgModeSolidBtn?.classList.toggle("is-active", !isGradient);
  bgModeGradientBtn?.classList.toggle("is-active", isGradient);

  if (gradientPanelEl) gradientPanelEl.hidden = false;
  const gradientSection = gradientPanelEl?.closest?.(".bgToolSectionGradient");
  // 그라데이션은 단색 모드에서도 클릭 즉시 전환되어야 하므로
  // 섹션 자체를 비활성화하지 않습니다.
  gradientSection?.classList.remove("is-disabled");
  const g1 = normalizeHexInput(draftBgColor, "#ffffff");
  const g2 = normalizeHexInput(draftBgColor2, "#fdcc63");
  if (gradientColor1El) gradientColor1El.dataset.color = g1;
  if (gradientColor2El) gradientColor2El.dataset.color = g2;
  if (gradientColor1ValueEl) gradientColor1ValueEl.textContent = g1;
  if (gradientColor2ValueEl) gradientColor2ValueEl.textContent = g2;
  if (gradientColor1SwatchEl) gradientColor1SwatchEl.style.background = g1;
  if (gradientColor2SwatchEl) gradientColor2SwatchEl.style.background = g2;

  gradientDirBtnEls?.forEach((btn) => {
    btn.classList.toggle("is-active", btn.dataset.gradientDir === draftBgDirection);
  });
}

function getNormalizedItemBgType(it) {
  return it?.design?.bgSet && it?.design?.bgType === "gradient" ? "gradient" : "solid";
}

function syncImageCountBadge() {
  if (!imageCountBadgeEl) return;
  imageCountBadgeEl.textContent = userImg ? "현재 1개" : "현재 0개";
}

function refreshCurrentItemPreview() {
  const it = cartItems.find((x) => x.id === selectedItemId);
  if (!it) return;
  saveCanvasToItem(it);
}

function setBgTextFromCurrentItem() {
  const it = cartItems.find((x) => x.id === selectedItemId);
  if (!bgTextEl) return;

  if (isLaserFixedBg()) {
    bgTextEl.textContent = "-";
    return;
  }

  if (it) {
    bgTextEl.textContent = it.design?.bgSet ? getItemBgLabel(it) : "-";
  } else {
    bgTextEl.textContent = getDraftBgLabel();
  }
}

function applyBgMode(mode) {
  if (uiLocked) return;
  if (!validateUserInfo(false)) return;

  if (isLaserFixedBg()) {
    draftBgType = "solid";
    draftBgSet = false;
    syncGradientUI();
    setBgTextFromCurrentItem();
    return;
  }

  draftBgType = normalizeBgMode(mode);
  draftBgSet = true;

  // 그라데이션 전환 시 기본값이 비어 있으면 즉시 채워서
  // 버튼을 눌렀을 때 바로 캔버스에 반영되게 합니다.
  draftBgColor = normalizeHexInput(draftBgColor || "#ffffff", "#ffffff");
  draftBgColor2 = normalizeHexInput(draftBgColor2 || "#fdcc63", "#fdcc63");
  draftBgDirection = normalizeGradientDirection(draftBgDirection || "to-right");

  const it = cartItems.find((x) => x.id === selectedItemId);
  if (it) {
    it.design = it.design || {};
    it.design.bgSet = true;
    it.design.bgType = draftBgType === "gradient" ? "gradient" : "solid";
    it.design.bgColor = draftBgColor || "#ffffff";
    it.design.bgColor2 = draftBgColor2 || "#fdcc63";
    it.design.bgDirection = normalizeGradientDirection(draftBgDirection || "to-right");
    it.design.background = {
      type: it.design.bgType,
      color: it.design.bgColor,
      color2: it.design.bgColor2,
      direction: normalizeGradientDirection(it.design.bgDirection),
    };
    it.bgColor = it.design.bgColor;
  }

  syncGradientUI();
  setBgTextFromCurrentItem();
  redraw();
  refreshCurrentItemPreview?.();
  renderCart?.();
  updateActionLocks();
}

function applyGradientSettings({ color1, color2, direction } = {}) {
  if (uiLocked) return;
  if (!validateUserInfo(false)) return;
  if (isLaserFixedBg()) return;

  draftBgType = "gradient";
  draftBgSet = true;
  if (color1) draftBgColor = normalizeHexInput(color1, draftBgColor || "#ffffff");
  if (color2) draftBgColor2 = normalizeHexInput(color2, draftBgColor2 || "#fdcc63");
  if (direction) draftBgDirection = normalizeGradientDirection(direction);

  const it = cartItems.find((x) => x.id === selectedItemId);
  if (it) {
    it.bgColor = draftBgColor || "#ffffff";
    it.design = it.design || {};
    it.design.bgSet = true;
    it.design.bgType = "gradient";
    it.design.bgColor = it.bgColor;
    it.design.bgColor2 = draftBgColor2 || "#fdcc63";
    it.design.bgDirection = normalizeGradientDirection(draftBgDirection || "to-right");
    it.design.background = {
      type: "gradient",
      color: it.design.bgColor,
      color2: it.design.bgColor2,
      direction: normalizeGradientDirection(it.design.bgDirection),
    };
  }

  setBgUI(draftBgColor);
  syncGradientUI();
  setBgTextFromCurrentItem();
  redraw();
  refreshCurrentItemPreview?.();
  renderCart?.();
  updateActionLocks();
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

/* =========================================================
 * 배경색 UI 반영
========================================================= */
function setBgUI(hex) {
  const v = (hex || "#ffffff").toLowerCase();

  if (bgColorSwatchEl) {
    bgColorSwatchEl.style.background = v;
  }

  if (bgColorValueEl) {
    bgColorValueEl.textContent = v;
  }

  if (bgPickr && activePickrTarget === "solid") {
    try {
      bgPickr.setColor(v, true);
    } catch (e) {
      console.warn("Pickr 색상 반영 실패:", e);
    }
  }
}

/* =========================================================
 * 텍스트 UI / 렌더 유틸
========================================================= */
function getTextFontFamily(type = textFontType) {
  const map = {
    basic: "'Pretendard', system-ui, -apple-system, 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif",
    bold: "'Paperlogy', 'Pretendard', 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif",
    round: "'Jua', 'Pretendard', 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif",
    hand: "'SejongGeulggot', 'Pretendard', 'Apple SD Gothic Neo', 'Noto Sans KR', cursive",
    pixel: "'x12y12pxMaruMinyaHangul', 'D2Coding', 'Courier New', monospace",
    calli: "'OngleIpSeaBreeze', 'Pretendard', 'Apple SD Gothic Neo', 'Noto Sans KR', cursive",
    soft: "'OngleIpSeaBreeze', 'Pretendard', 'Apple SD Gothic Neo', 'Noto Sans KR', cursive",
  };
  return map[type] || map.basic;
}

function getTextFontWeight(type = textFontType) {
  if (type === "bold") return 900;
  if (type === "basic") return 700;
  return 400;
}

function getTextFontSize(size = textSize) {
  const base = { small: 28, medium: 42, large: 58 }[size] || 42;
  const ratio = Math.min(canvas.width || 330, canvas.height || 330) / 330;
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

function syncTextUI() {
  if (textInputEl) textInputEl.value = textValue || "";
  const color = normalizeHexInput(textColor, "#111827");
  if (textColorSwatchEl) textColorSwatchEl.style.background = color;
  if (textColorValueEl) textColorValueEl.textContent = color;

  textFontBtnEls?.forEach((btn) => btn.classList.toggle("is-active", btn.dataset.textFont === textFontType));
  textAlignBtnEls?.forEach((btn) => btn.classList.toggle("is-active", btn.dataset.textAlign === textAlign));
  textSizeBtnEls?.forEach((btn) => btn.classList.toggle("is-active", btn.dataset.textSize === textSize));

  if (textClearBtnEl) textClearBtnEl.disabled = uiLocked || !textEnabled;
}

function applyTextToCurrentItem() {
  const it = cartItems.find((x) => x.id === selectedItemId);
  if (!it) return;
  it.design = it.design || {};
  it.design.text = {
    enabled: !!textEnabled,
    value: textValue || "",
    fontType: textFontType || "basic",
    color: normalizeHexInput(textColor, "#111827"),
    align: ["left", "center", "right"].includes(textAlign) ? textAlign : "center",
    size: ["small", "medium", "large"].includes(textSize) ? textSize : "medium",
    cx: Number.isFinite(textCX) && textCX ? textCX : canvas.width / 2,
    cy: Number.isFinite(textCY) && textCY ? textCY : canvas.height / 2,
    scale: Number.isFinite(textScale) ? textScale : 1,
    rot: Number.isFinite(textRot) ? textRot : 0,
  };
}

function applyTextSettings(partial = {}) {
  if (uiLocked) return;
  if (!validateUserInfo(false)) return;

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
    textCX = canvas.width / 2;
    textCY = canvas.height / 2;
  }
  if (textEnabled) activeObjectType = "text";

  applyTextToCurrentItem();
  syncTextUI();
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
  if (widest > maxWidth) {
    const ratio = maxWidth / widest;
    fontSize = Math.max(10, Math.floor(fontSize * ratio));
    targetCtx.font = `${weight} ${fontSize}px ${family}`;
    widest = Math.max(...lines.map((line) => targetCtx.measureText(line).width));
  }
  targetCtx.restore();

  const lineHeight = Math.round(fontSize * 1.18);
  const totalH = Math.max(lineHeight, lineHeight * lines.length);
  return { lines, color, fontType, fontSize, family, weight, lineHeight, totalH, widest: Math.max(24, widest) };
}

function drawTextObjectToContext(targetCtx, w, h, textState = {}) {
  if (!textState?.enabled || !safeTrim(textState?.value || "")) return;

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
    cx: Number.isFinite(textCX) && textCX ? textCX : canvas.width / 2,
    cy: Number.isFinite(textCY) && textCY ? textCY : canvas.height / 2,
    scale: Number.isFinite(textScale) ? textScale : 1,
    rot: Number.isFinite(textRot) ? textRot : 0,
  };
}

/* =========================================================
 * 배경색 적용
 * - 레이저 선택 시에는 흰색 고정
 * - 인쇄일 때만 사용자 배경색 적용 가능
========================================================= */
function applyBgColor(hex) {
  if (uiLocked) return;
  if (!validateUserInfo(false)) return;

  const v = isLaserFixedBg() ? "#ffffff" : (hex || "#ffffff").toLowerCase();
  setBgUI(v);

  const it = cartItems.find((x) => x.id === selectedItemId);

  draftBgColor = v;
  draftBgType = "solid";
  draftBgSet = !isLaserFixedBg();

  if (it) {
    it.bgColor = v;
    it.design = it.design || {};
    it.design.bgSet = !isLaserFixedBg();
    it.design.bgType = "solid";
    it.design.bgColor = v;
    it.design.bgColor2 = draftBgColor2 || "#fdcc63";
    it.design.bgDirection = normalizeGradientDirection(draftBgDirection || "to-right");
    it.design.background = {
      type: "solid",
      color: v,
      color2: it.design.bgColor2,
      direction: it.design.bgDirection,
    };
  }

  syncGradientUI?.();
  setBgTextFromCurrentItem?.();
  redraw();
  updateActionLocks();
}

/* =========================================================
 * 배경색 잠금 UI
 * - 인쇄: 배경 설정 가능
 * - 레이저 블랙/화이트: 흰색 고정 + 버튼 잠금
========================================================= */
function updateBgLockUI(profile, laser) {
  const wrap = bgPickBtn?.closest(".colorPick");
  const locked = profile === "OEM" && (laser === "black" || laser === "white");

  if (wrap) {
    wrap.classList.toggle("isLocked", locked);
  }

  const it = cartItems.find((x) => x.id === selectedItemId);

  if (locked) {
    const fixed = "#ffffff";

    if (it) {
      it.bgColor = fixed;
      it.design = it.design || {};
      it.design.bgSet = false;
      it.design.bgType = "solid";
    } else {
      draftBgColor = fixed;
      draftBgType = "solid";
      draftBgSet = false;
    }

    setBgUI(fixed);

    if (bgTextEl) {
      bgTextEl.textContent = "-";
    }
  } else {
    const color = it?.bgColor || draftBgColor || "#ffffff";
    setBgUI(color);

    if (it) {
      draftBgColor = it.bgColor || "#ffffff";
      draftBgColor2 = it.design?.bgColor2 || "#fdcc63";
      draftBgType = it.design?.bgType === "gradient" ? "gradient" : "solid";
      draftBgDirection = normalizeGradientDirection(it.design?.bgDirection || it.design?.background?.direction || "to-right");
    }

    syncGradientUI?.();
    setBgTextFromCurrentItem?.();
  }

  if (bgPickBtn) {
    bgPickBtn.disabled = uiLocked || locked;
  }

  if (bgEyeBtn) {
    bgEyeBtn.disabled = uiLocked || locked;
  }

  if (bgModeSolidBtn) bgModeSolidBtn.disabled = uiLocked || locked;
  if (bgModeGradientBtn) bgModeGradientBtn.disabled = uiLocked || locked;
  if (gradientColor1El) gradientColor1El.disabled = uiLocked || locked;
  if (gradientColor2El) gradientColor2El.disabled = uiLocked || locked;
  gradientDirBtnEls?.forEach((btn) => (btn.disabled = uiLocked || locked));

  return locked;
}

/* =========================================================
 * 스포이드 열기
========================================================= */
async function openEyeDropper() {
  if (uiLocked) return;

  if (isLaserFixedBg()) {
    setCanvasNotice("레이저 선택 시 배경색은 흰색으로 고정됩니다.", "error");
    showToast("레이저 옵션에서는 배경 설정을 변경할 수 없습니다.", "warn");
    return;
  }

  if (!validateUserInfo(true)) {
    updateActionLocks();
    return;
  }

  /* =========================================================
   * 모바일 / 터치 환경: 캔버스 터치 추출 모드
  ========================================================= */
  if (isTouchDevice()) {
    setMobileEyedropperMode(true);
    clearCanvasNotice();
    setCanvasNotice("캔버스에서 원하는 색상을 터치해 주세요.", "ok");
    showToast("캔버스에서 원하는 색상을 터치해 주세요.", "info");
    return;
  }

  /* =========================================================
   * PC + 브라우저 지원 시 기존 EyeDropper 사용
  ========================================================= */
  if (!window.EyeDropper) {
    setCanvasNotice(
      "현재 브라우저에서는 스포이드 기능이 지원되지 않습니다.",
      "error",
    );
    showToast("현재 브라우저에서는 스포이드를 사용할 수 없습니다.", "warn");
    return;
  }

  try {
    const eyeDropper = new EyeDropper();
    const result = await eyeDropper.open();

    if (!result?.sRGBHex) return;

    clearCanvasNotice();
    applyBgColor(result.sRGBHex);
    setCanvasNotice("스포이드로 배경색을 적용했습니다.", "ok");
    showToast("배경색을 적용했습니다.", "ok");
  } catch (e) {
    if (e?.name !== "AbortError") {
      console.error("스포이드 사용 실패:", e);
      setCanvasNotice("스포이드 사용 중 문제가 발생했습니다.", "error");
    }
  }
}

/* =========================================================
 * 제작 도구 탭 / 그라데이션 이벤트
========================================================= */
function bindEditorToolEvents() {
  toolTabEls?.forEach((tab) => {
    tab.addEventListener("click", () => {
      const targetId = tab.dataset.toolTarget;

      toolTabEls.forEach((btn) => btn.classList.toggle("is-active", btn === tab));
      toolPanelEls?.forEach((panel) => {
        panel.classList.toggle("is-active", panel.id === targetId);
      });
    });
  });

  bgModeSolidBtn?.addEventListener("click", () => applyBgMode("solid"));
  bgModeGradientBtn?.addEventListener("click", () => applyBgMode("gradient"));

  gradientColor1El?.addEventListener("click", () => {
    if (uiLocked || isLaserFixedBg()) return;
    setMobileEyedropperMode(false);
    applyBgMode("gradient");
    setActivePickrTarget("gradient1", gradientColor1El);
    bgPickr?.show();
    requestAnimationFrame(positionPickrPanel);
  });

  gradientColor2El?.addEventListener("click", () => {
    if (uiLocked || isLaserFixedBg()) return;
    setMobileEyedropperMode(false);
    applyBgMode("gradient");
    setActivePickrTarget("gradient2", gradientColor2El);
    bgPickr?.show();
    requestAnimationFrame(positionPickrPanel);
  });

  gradientDirBtnEls?.forEach((btn) => {
    btn.addEventListener("click", () => {
      applyGradientSettings({ direction: btn.dataset.gradientDir || "to-right" });
    });
  });

  textApplyBtnEl?.addEventListener("click", () => {
    const value = safeTrim(textInputEl?.value || "");
    if (!value) {
      showToast("텍스트를 입력해 주세요.", "warn");
      return;
    }
    applyTextSettings({ value, enabled: true });
    showToast("텍스트를 추가했습니다.", "ok", 1200);
  });

  textInputEl?.addEventListener("input", () => {
    if (textEnabled) applyTextSettings({ value: textInputEl.value, enabled: !!safeTrim(textInputEl.value) });
  });

  textClearBtnEl?.addEventListener("click", () => {
    applyTextSettings({ value: "", enabled: false });
    showToast("텍스트를 삭제했습니다.", "info", 1200);
  });

  textColorBtnEl?.addEventListener("click", () => {
    if (uiLocked) return;
    setMobileEyedropperMode(false);
    setActivePickrTarget("text", textColorBtnEl);
    bgPickr?.show();
    requestAnimationFrame(positionPickrPanel);
  });

  textFontBtnEls?.forEach((btn) => {
    btn.addEventListener("click", () => applyTextSettings({ fontType: btn.dataset.textFont || "basic" }));
  });

  textAlignBtnEls?.forEach((btn) => {
    btn.addEventListener("click", () => applyTextSettings({ align: btn.dataset.textAlign || "center" }));
  });

  textSizeBtnEls?.forEach((btn) => {
    btn.addEventListener("click", () => applyTextSettings({ size: btn.dataset.textSize || "medium" }));
  });
}

/* =========================================================
 * Pickr 초기화
========================================================= */
function initPickr() {
  bindEditorToolEvents?.();
  if (!bgPickMountEl || !window.Pickr || bgPickr) return;

  bgPickr = Pickr.create({
    el: bgPickMountEl,
    theme: "nano",
    default: "#ffffff",
    showAlways: false,
    closeOnScroll: false,
    defaultRepresentation: "HEX",
    components: {
      preview: true,
      opacity: false,
      hue: true,
      interaction: {
        input: true,
        save: false,
      },
    },
  });

  bgPickBtn?.addEventListener("click", (e) => {
    if (uiLocked) return;

    if (isLaserFixedBg()) {
      e.preventDefault();
      e.stopPropagation();
      setCanvasNotice("레이저 선택 시 배경색은 흰색으로 고정됩니다.", "error");
      showToast("레이저 옵션에서는 배경 설정을 변경할 수 없습니다.", "warn");
      return;
    }

    setMobileEyedropperMode(false);
    applyBgMode("solid");
    setActivePickrTarget("solid", bgPickBtn);
    bgPickr?.show();
    requestAnimationFrame(positionPickrPanel);
  });

  bgEyeBtn?.addEventListener("click", async () => {
    await openEyeDropper();
  });

  bgPickr.on("show", () => {
    requestAnimationFrame(positionPickrPanel);
  });

  bgPickr.on("change", (color) => {
    if (uiLocked || !color) return;
    if (!validateUserInfo(false)) return;
    if (isLaserFixedBg()) return;

    const hex = color.toHEXA().toString().toLowerCase();

    if (activePickrTarget === "gradient1") {
      applyGradientSettings({ color1: hex });
      return;
    }

    if (activePickrTarget === "gradient2") {
      applyGradientSettings({ color2: hex });
      return;
    }

    if (activePickrTarget === "text") {
      applyTextSettings({ color: hex });
      return;
    }

    applyBgColor(hex);
  });

  window.addEventListener("resize", positionPickrPanel);
  window.addEventListener("scroll", positionPickrPanel, { passive: true });

  setBgUI("#ffffff");
  syncGradientUI?.();
  syncTextUI?.();
}

/* =========================================================
 * 캔버스 크기 / 기본 표시 / MAO 가이드 / 상태 반영
========================================================= */
function getCanvasSize(profile, capType) {
  if (profile === "OEM") {
    return CANVAS_SIZE_MAP[capType] || { w: 330, h: 330 };
  }

  return CANVAS_SIZE_MAP[profile] || CANVAS_SIZE_MAP.STD;
}

function resizeCanvas(w, h) {
  canvas.width = w;
  canvas.height = h;
  canvasTextEl.textContent = `${w}×${h}`;
}

function resizeCanvasKeepView(w, h) {
  const oldW = canvas.width;
  const oldH = canvas.height;

  const rx = oldW ? imgCX / oldW : 0.5;
  const ry = oldH ? imgCY / oldH : 0.5;

  resizeCanvas(w, h);

  imgCX = canvas.width * rx;
  imgCY = canvas.height * ry;
  redraw();
}

function updateSelectedInfoText() {
  const profile = safeTrim(profileEl?.value || "") || "-";
  const cap = getCapTypeDisplayName(capTypeEl?.value);

  if (selTextEl) {
    selTextEl.textContent = `${profile} / ${cap}`;
  }
}

/* =========================================================
 * MAO SVG 가이드
========================================================= */
function ensureMaoGuide() {
  if (!canvasWrapEl) return null;

  let wrap = document.getElementById("maoGuideWrap");
  if (wrap) return wrap;

  wrap = document.createElement("div");
  wrap.id = "maoGuideWrap";
  wrap.style.position = "absolute";
  wrap.style.inset = "0";
  wrap.style.pointerEvents = "none";
  wrap.style.zIndex = "2";
  wrap.style.display = "none";

  // MAO는 SVG 파일 3개를 겹쳐서 표시한다.
  // outer/inner/safe를 모두 별도 이미지로 올려야 OEM/XDA와 동일하게 3중 가이드가 보인다.
  const maoGuides = [
    { id: "maoGuideOutline", src: "./image/guides/mao-outline.svg" },
    { id: "maoGuideInner", src: "./image/guides/mao-inner.svg" },
    { id: "maoGuideSafe", src: "./image/guides/mao-safe.svg" },
  ];

  maoGuides.forEach((guide) => {
    const img = document.createElement("img");
    img.id = guide.id;
    img.src = guide.src;
    img.alt = "";
    img.draggable = false;
    img.style.position = "absolute";
    img.style.inset = "0";
    img.style.width = "100%";
    img.style.height = "100%";
    img.style.pointerEvents = "none";
    wrap.appendChild(img);
  });

  if (bboxEl && bboxEl.parentNode === canvasWrapEl) {
    canvasWrapEl.insertBefore(wrap, bboxEl);
  } else {
    canvasWrapEl.appendChild(wrap);
  }

  return wrap;
}

function updateMaoGuide() {
  const wrap = ensureMaoGuide();
  if (!wrap) return;

  wrap.style.display = profileEl?.value === "MAO" ? "block" : "none";
}

/* =========================================================
 * 캔버스 설정 반영
========================================================= */
function syncDraftBgFromLaser(profile, laser) {
  if (selectedItemId) return;

  const isLaserFixed =
    profile === "OEM" && (laser === "black" || laser === "white");

  if (isLaserFixed) {
    draftBgColor = "#ffffff";
    draftBgType = "solid";
    draftBgSet = false;
    setBgUI("#ffffff");
    syncGradientUI?.();
    return;
  }

  if (!draftBgSet && (!draftBgColor || draftBgColor === "#000000")) {
    draftBgColor = "#ffffff";
    setBgUI("#ffffff");
  }
}

function syncCanvasMetaFromForm() {
  const profile = profileEl?.value || "OEM";
  const laser = profile === "OEM" ? laserEl?.value || "none" : "none";
  const it = cartItems.find((x) => x.id === selectedItemId);

  syncDraftBgFromLaser(profile, laser);
  updateBgLockUI(profile, laser);
  updateMaoGuide();

  setBgTextFromCurrentItem?.();
  syncGradientUI?.();

  updateSelectedInfoText();
  updateDraftInfo();
}

function applyCanvasSizeFromForm() {
  const profile = profileEl?.value || "OEM";
  const capType = capTypeEl?.value || "-";
  const size = getCanvasSize(profile, capType);

  // 캔버스 리사이즈
  if (canvas.width !== size.w || canvas.height !== size.h) {
    resizeCanvas(size.w, size.h);
  }

  // 수정: 사이즈 텍스트는 무조건 갱신
  if (canvasTextEl) {
    canvasTextEl.textContent = `${size.w}×${size.h}`;
  }

  // 이미지 위치 보정
  if (!userImg) {
    imgCX = canvas.width / 2;
    imgCY = canvas.height / 2;
  } else {
    imgCX = clamp(imgCX, 0, canvas.width);
    imgCY = clamp(imgCY, 0, canvas.height);
  }

  syncCanvasMetaFromForm();
  redraw();
  updateActionLocks();
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

  offCtx.save();
  offCtx.fillStyle = createBackgroundFill(offCtx, off.width, off.height, bgType, color1, color2, direction);
  offCtx.fillRect(0, 0, off.width, off.height);
  offCtx.restore();

  if (it.design?.imgDataUrl) {
    const previewImg = new Image();
    previewImg.src = it.design.imgDataUrl;

    // dataURL 이미지도 브라우저 상황에 따라 즉시 decode 되지 않을 수 있습니다.
    // 이때 배경만 그린 previewDataUrl을 저장해버리면, 특히 그라데이션 시안이
    // 리스트에서 "배경만 있는 시안"처럼 보입니다. 이미지가 아직 준비 전이면
    // 빈 값을 반환해서 makeCartThumb()가 원본 이미지 fallback을 쓰게 합니다.
    if (!previewImg.complete || !previewImg.naturalWidth) {
      return "";
    }

    offCtx.save();
    offCtx.translate(it.design?.cx ?? off.width / 2, it.design?.cy ?? off.height / 2);
    offCtx.rotate(it.design?.rot ?? 0);
    const sx = it.design?.scaleX ?? it.design?.scale ?? 1;
    const sy = it.design?.scaleY ?? it.design?.scale ?? 1;
    offCtx.scale(sx, sy);
    offCtx.drawImage(previewImg, -previewImg.width / 2, -previewImg.height / 2);
    offCtx.restore();
  } else if (userImg) {
    offCtx.save();
    offCtx.translate(it.design?.cx ?? off.width / 2, it.design?.cy ?? off.height / 2);
    offCtx.rotate(it.design?.rot ?? 0);
    const sx = it.design?.scaleX ?? it.design?.scale ?? 1;
    const sy = it.design?.scaleY ?? it.design?.scale ?? 1;
    offCtx.scale(sx, sy);
    offCtx.drawImage(userImg, -userImg.width / 2, -userImg.height / 2);
    offCtx.restore();
  }

  drawTextObjectToContext?.(offCtx, off.width, off.height, it.design?.text);

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
  if (userImg) {
    it.design.imgDataUrl = userImg.src;
  } else if (!isLoadingItemToCanvas) {
    it.design.imgDataUrl = null;
  }
  it.design.cx = imgCX;
  it.design.cy = imgCY;
  it.design.scaleX = imgScaleX;
  it.design.scaleY = imgScaleY;
  it.design.rot = imgRot;
  it.design.bgSet = !!draftBgSet;
  it.design.bgType = draftBgSet && draftBgType === "gradient" ? "gradient" : "solid";
  it.design.bgColor = draftBgColor || "#ffffff";
  it.design.bgColor2 = draftBgColor2 || "#fdcc63";
  it.design.bgDirection = normalizeGradientDirection(draftBgDirection || "to-right");
  it.design.background = {
    type: it.design.bgType,
    color: it.design.bgColor,
    color2: it.design.bgColor2,
    direction: normalizeGradientDirection(it.design.bgDirection),
  };
  it.design.text = getCurrentTextState?.() || { enabled: false, value: "" };
  it.bgColor = it.design.bgColor;
  it.design.previewDataUrl = renderItemPreviewDataUrl(it);
  it.originalFile = userImgFile || it.originalFile || null;
}

function resetEditorStateBeforeLoad() {
  userImg = null;
  userImgFile = null;

  imgCX = canvas.width / 2;
  imgCY = canvas.height / 2;
  imgScaleX = 1;
  imgScaleY = 1;
  imgRot = 0;

  draftBgSet = false;
  draftBgType = "solid";
  draftBgColor = "#ffffff";
  draftBgColor2 = "#fdcc63";
  draftBgDirection = "to-right";

  textEnabled = false;
  textValue = "";
  textFontType = "basic";
  textColor = "#111827";
  textAlign = "center";
  textSize = "medium";
  textCX = canvas.width / 2;
  textCY = canvas.height / 2;
  textScale = 1;
  textRot = 0;
  activeObjectType = null;
  syncTextUI?.();

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

  imgCX = it.design?.cx ?? canvas.width / 2;
  imgCY = it.design?.cy ?? canvas.height / 2;
  imgScaleX = it.design?.scaleX ?? it.design?.scale ?? 1;
  imgScaleY = it.design?.scaleY ?? it.design?.scale ?? 1;
  imgRot = it.design?.rot ?? 0;

  const savedBgSet = !!it.design?.bgSet;
  const savedBgType = it.design?.bgType || it.design?.background?.type || "solid";
  const nextBgType = savedBgSet && savedBgType === "gradient" ? "gradient" : "solid";
  const nextBgColor = normalizeHexInput(it.design?.bgColor || it.bgColor || it.design?.background?.color || "#ffffff", "#ffffff");
  const nextBgColor2 = normalizeHexInput(it.design?.bgColor2 || it.design?.background?.color2 || "#fdcc63", "#fdcc63");
  const nextBgDirection = normalizeGradientDirection(it.design?.bgDirection || it.design?.background?.direction || "to-right");

  draftBgSet = savedBgSet;
  draftBgType = nextBgType;
  draftBgColor = nextBgColor;
  draftBgColor2 = nextBgColor2;
  draftBgDirection = nextBgDirection;

  it.design = it.design || {};
  it.bgColor = draftBgColor;
  it.design.bgSet = draftBgSet;
  it.design.bgColor = draftBgColor;
  it.design.bgType = draftBgType;
  it.design.bgColor2 = draftBgColor2;
  it.design.bgDirection = draftBgDirection;
  it.design.background = {
    type: draftBgType,
    color: draftBgColor,
    color2: draftBgColor2,
    direction: draftBgDirection,
  };

  const savedText = it.design?.text || {};
  textEnabled = !!savedText.enabled && !!safeTrim(savedText.value || "");
  textValue = savedText.value || "";
  textFontType = savedText.fontType || "basic";
  textColor = normalizeHexInput(savedText.color || "#111827", "#111827");
  textAlign = ["left", "center", "right"].includes(savedText.align) ? savedText.align : "center";
  textSize = ["small", "medium", "large"].includes(savedText.size) ? savedText.size : "medium";
  textCX = Number.isFinite(savedText.cx) ? savedText.cx : canvas.width / 2;
  textCY = Number.isFinite(savedText.cy) ? savedText.cy : canvas.height / 2;
  textScale = Number.isFinite(savedText.scale) ? savedText.scale : 1;
  textRot = Number.isFinite(savedText.rot) ? savedText.rot : 0;
  if (textEnabled) activeObjectType = "text";
  syncTextUI?.();

  setActivePickrTarget(draftBgType === "gradient" ? "gradient1" : "solid", draftBgType === "gradient" ? gradientColor1El : bgPickBtn);
  setBgUI(draftBgColor);
  syncGradientUI?.();

  if (it.design?.imgDataUrl) {
    const img = new Image();
    try {
      await new Promise((res, rej) => {
        img.onload = res;
        img.onerror = rej;
        img.src = it.design.imgDataUrl;
      });

      // 더 늦게 시작된 불러오기가 있으면 이전 결과는 버립니다.
      if (loadToken !== canvasLoadToken) return;

      userImg = img;
      activeObjectType = "image";
    } catch (e) {
      console.warn("저장된 시안 이미지 불러오기 실패:", e);
      if (loadToken !== canvasLoadToken) return;
      userImg = null;
      if (activeObjectType === "image") activeObjectType = hasTextObject() ? "text" : null;
    }
  }

  if (loadToken !== canvasLoadToken) return;
  isLoadingItemToCanvas = false;

  if (fileNameEl) {
    fileNameEl.textContent = it.originalFile?.name
      ? it.originalFile.name
      : it.design?.imgDataUrl
        ? "저장된 이미지 불러옴"
        : "선택된 파일 없음";
  }

  updateSelectedInfoText();
  updateMaoGuide();
  redraw();
  updateDraftInfo();
  syncImageCountBadge();
  updateActionLocks();
}

function clearEditor() {
  userImg = null;
  userImgFile = null;
  imgCX = canvas.width / 2;
  imgCY = canvas.height / 2;
  imgScaleX = 1;
  imgScaleY = 1;
  imgRot = 0;

  draftBgColor = "#ffffff";
  draftBgColor2 = "#fdcc63";
  draftBgType = "solid";
  draftBgDirection = "to-right";
  draftBgSet = false;

  textEnabled = false;
  textValue = "";
  textFontType = "basic";
  textColor = "#111827";
  textAlign = "center";
  textSize = "medium";
  textCX = canvas.width / 2;
  textCY = canvas.height / 2;
  textScale = 1;
  textRot = 0;
  activeObjectType = null;
  syncTextUI?.();

  selectedItemId = null;
  setMobileEyedropperMode(false);

  if (fileNameEl) fileNameEl.textContent = "선택된 파일 없음";
  if (bgTextEl) bgTextEl.textContent = "-";
  setBgUI("#ffffff");
  syncGradientUI?.();
  syncTextUI?.();

  updateSelectedInfoText();
  updateMaoGuide();
  redraw();
  updateDraftInfo();
  syncImageCountBadge();
  updateActionLocks();
}

/* =========================================================
 * 캔버스 드로잉
========================================================= */
function roundRectPath(c, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  c.beginPath();
  c.moveTo(x + rr, y);
  c.arcTo(x + w, y, x + w, y + h, rr);
  c.arcTo(x + w, y + h, x, y + h, rr);
  c.arcTo(x, y + h, x, y, rr);
  c.arcTo(x, y, x + w, y, rr);
  c.closePath();
}

function drawBackground() {
  const it = cartItems.find((x) => x.id === selectedItemId);

  // 에디터 캔버스는 항상 현재 draft 상태를 기준으로 그립니다.
  // 시안 카드 선택/전환 시 loadItemToCanvas()가 draft를 먼저 복원하므로,
  // 여기서 cart item 값을 다시 읽으면 단색↔그라데이션 전환 때 이전 상태가 남을 수 있습니다.
  const color1 = draftBgSet ? (draftBgColor || "#ffffff") : "#ffffff";
  const color2 = draftBgColor2 || "#fdcc63";
  const bgType = draftBgSet && draftBgType === "gradient" ? "gradient" : "solid";
  const direction = normalizeGradientDirection(draftBgDirection || "to-right");

  ctx.save();
  ctx.fillStyle = createBackgroundFill(ctx, canvas.width, canvas.height, bgType, color1, color2, direction);
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.restore();
}

function drawCenterGuide() {
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;

  ctx.save();
  ctx.strokeStyle = "rgba(17, 25, 40, 0.18)";
  ctx.lineWidth = 1;
  ctx.setLineDash([6, 6]);

  ctx.beginPath();
  ctx.moveTo(cx, 0);
  ctx.lineTo(cx, canvas.height);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(0, cy);
  ctx.lineTo(canvas.width, cy);
  ctx.stroke();

  ctx.setLineDash([]);
  ctx.fillStyle = "rgba(17, 25, 40, 0.25)";
  ctx.beginPath();
  ctx.arc(cx, cy, 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawGuide() {
  const profile = profileEl.value;

  if (profile === "MAO") return;

  const capType = capTypeEl.value;
  const key = profile === "OEM" ? capType : profile;

  const guide = GUIDE_SIZE_MAP[key] || GUIDE_SIZE_MAP.STD;
  if (!guide) return;

  const outerW = guide.outer.w;
  const outerH = guide.outer.h;

  const innerW = guide.inner.w;
  const innerH = guide.inner.h;

  const safeW = guide.safe.w;
  const safeH = guide.safe.h;

  const outerX = (canvas.width - outerW) / 2;
  const outerY = (canvas.height - outerH) / 2;

  const innerX = (canvas.width - innerW) / 2;
  const innerY = (canvas.height - innerH) / 2;

  const safeX = (canvas.width - safeW) / 2;
  const safeY = (canvas.height - safeH) / 2;

  ctx.save();

  ctx.strokeStyle = "#d2d2d2";
  ctx.lineWidth = 0.8;
  ctx.setLineDash([]);
  roundRectPath(ctx, outerX, outerY, outerW, outerH, 18);
  ctx.stroke();

  ctx.strokeStyle = "#b8b8b8";
  ctx.lineWidth = 0.8;
  ctx.setLineDash([]);
  roundRectPath(ctx, innerX, innerY, innerW, innerH, 16);
  ctx.stroke();

  ctx.strokeStyle = "#d92d20";
  ctx.lineWidth = 2;
  ctx.setLineDash([8, 8]);
  roundRectPath(ctx, safeX, safeY, safeW, safeH, 14);
  ctx.stroke();

  ctx.restore();
}

function drawImageTransformed() {
  if (!userImg) return;

  const w = userImg.width * imgScaleX;
  const h = userImg.height * imgScaleY;

  ctx.save();
  ctx.translate(imgCX, imgCY);
  ctx.rotate(imgRot);
  ctx.drawImage(userImg, -w / 2, -h / 2, w, h);
  ctx.restore();
}

function drawTextTransformed() {
  drawTextObjectToContext(ctx, canvas.width, canvas.height, getCurrentTextState());
}

function getImageAxes() {
  return getObjectAxes(getActiveObjectType() || "image");
}

function getImageHalfSize() {
  return getObjectHalfSize(getActiveObjectType() || "image");
}

function localToWorldPoint(x, y) {
  return objectLocalToWorldPoint(getActiveObjectType() || "image", x, y);
}

function getImageAABB() {
  const type = getActiveObjectType();
  if (!type) return null;

  const size = getObjectHalfSize(type);
  if (!size) return null;

  const corners = [
    objectLocalToWorldPoint(type, -size.halfW, -size.halfH),
    objectLocalToWorldPoint(type, size.halfW, -size.halfH),
    objectLocalToWorldPoint(type, size.halfW, size.halfH),
    objectLocalToWorldPoint(type, -size.halfW, size.halfH),
  ];

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const p of corners) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }

  return { minX, minY, maxX, maxY, w: maxX - minX, h: maxY - minY };
}

function getHandleSpec(handle) {
  const map = {
    e: { anchorLocal: { x: -1, y: 0 }, signX: 1, signY: 0 },
    w: { anchorLocal: { x: 1, y: 0 }, signX: -1, signY: 0 },
    s: { anchorLocal: { x: 0, y: -1 }, signX: 0, signY: 1 },
    n: { anchorLocal: { x: 0, y: 1 }, signX: 0, signY: -1 },
    se: { anchorLocal: { x: -1, y: -1 }, signX: 1, signY: 1 },
    sw: { anchorLocal: { x: 1, y: -1 }, signX: -1, signY: 1 },
    ne: { anchorLocal: { x: -1, y: 1 }, signX: 1, signY: -1 },
    nw: { anchorLocal: { x: 1, y: 1 }, signX: -1, signY: -1 },
  };

  return map[handle] || null;
}

function updateBBox() {
  const type = getActiveObjectType();
  if (!type) {
    bboxEl.style.display = "none";
    return;
  }

  const cr = canvas.getBoundingClientRect();
  const wr = canvasWrapEl.getBoundingClientRect();
  const sx = cr.width / canvas.width;
  const sy = cr.height / canvas.height;

  const offsetX = cr.left - wr.left;
  const offsetY = cr.top - wr.top;
  const center = getObjectCenter(type);
  const size = getObjectHalfSize(type);
  if (!size) {
    bboxEl.style.display = "none";
    return;
  }

  const w = size.halfW * 2;
  const h = size.halfH * 2;

  bboxEl.style.display = "block";
  bboxEl.style.left = `${offsetX + (center.x - w / 2) * sx}px`;
  bboxEl.style.top = `${offsetY + (center.y - h / 2) * sy}px`;
  bboxEl.style.width = `${w * sx}px`;
  bboxEl.style.height = `${h * sy}px`;
  bboxEl.style.transform = `rotate(${getObjectRot(type)}rad)`;
}

function redraw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawBackground();
  drawImageTransformed();
  drawTextTransformed();
  drawCenterGuide();
  drawGuide();
  updateBBox();
}


/* =========================================================
 * 조작 안내 툴팁
========================================================= */
let canvasHelpTimer = null;

function showCanvasHelpTip(message, delay = 1800) {
  if (!canvasHelpTipEl || !message) return;
  window.clearTimeout(canvasHelpTimer);
  canvasHelpTipEl.textContent = message;
  canvasHelpTipEl.classList.add("is-show");

  if (delay > 0) {
    canvasHelpTimer = window.setTimeout(() => {
      canvasHelpTipEl.classList.remove("is-show");
    }, delay);
  }
}

function hideCanvasHelpTip() {
  if (!canvasHelpTipEl) return;
  window.clearTimeout(canvasHelpTimer);
  canvasHelpTipEl.classList.remove("is-show");
}


function hasTextObject() {
  return !!(textEnabled && safeTrim(textValue || ""));
}

function hasActiveObject() {
  if (activeObjectType === "text") return hasTextObject();
  if (activeObjectType === "image") return !!userImg;
  return !!userImg || hasTextObject();
}

function getActiveObjectType() {
  if (activeObjectType === "text" && hasTextObject()) return "text";
  if (activeObjectType === "image" && userImg) return "image";
  if (hasTextObject()) return "text";
  if (userImg) return "image";
  return null;
}

function getObjectCenter(type = getActiveObjectType()) {
  if (type === "text") return { x: textCX || canvas.width / 2, y: textCY || canvas.height / 2 };
  return { x: imgCX, y: imgCY };
}

function setObjectCenter(type, x, y) {
  if (type === "text") {
    textCX = x;
    textCY = y;
  } else {
    imgCX = x;
    imgCY = y;
  }
}

function getObjectRot(type = getActiveObjectType()) {
  return type === "text" ? (textRot || 0) : (imgRot || 0);
}

function setObjectRot(type, rot) {
  if (type === "text") textRot = rot;
  else imgRot = rot;
}

function getTextHalfSize() {
  if (!hasTextObject()) return null;
  const metrics = getTextRenderMetrics(ctx, canvas.width, canvas.height, getCurrentTextState());
  if (!metrics) return null;
  return {
    halfW: Math.max(16, metrics.widest / 2 + 10),
    halfH: Math.max(12, metrics.totalH / 2 + 8),
  };
}

function getObjectHalfSize(type = getActiveObjectType()) {
  if (type === "text") return getTextHalfSize();
  if (!userImg) return null;
  return {
    halfW: (userImg.width * imgScaleX) / 2,
    halfH: (userImg.height * imgScaleY) / 2,
  };
}

function getObjectAxes(type = getActiveObjectType()) {
  const rot = getObjectRot(type);
  const cos = Math.cos(rot);
  const sin = Math.sin(rot);

  return {
    ux: cos,
    uy: sin,
    vx: -sin,
    vy: cos,
  };
}

function objectLocalToWorldPoint(type, x, y) {
  const center = getObjectCenter(type);
  const axes = getObjectAxes(type);
  return {
    x: center.x + x * axes.ux + y * axes.vx,
    y: center.y + x * axes.uy + y * axes.vy,
  };
}

function isPointOnText(px, py) {
  if (!hasTextObject()) return false;
  const center = getObjectCenter("text");
  const dx = px - center.x;
  const dy = py - center.y;
  const rot = -getObjectRot("text");
  const cos = Math.cos(rot);
  const sin = Math.sin(rot);
  const lx = dx * cos - dy * sin;
  const ly = dx * sin + dy * cos;
  const size = getTextHalfSize();
  if (!size) return false;
  return lx >= -size.halfW && lx <= size.halfW && ly >= -size.halfH && ly <= size.halfH;
}

function syncActiveItemDesign() {
  if (isLoadingItemToCanvas) return;

  const it = cartItems.find((x) => x.id === selectedItemId);
  if (!it) return;
  saveCanvasToItem(it);
  refreshCurrentItemPreview?.();
  renderCart?.();
}

/* =========================================================
 * 이동 / 리사이즈 / 회전
========================================================= */
function screenToCanvasPoint(e) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((e.clientX - rect.left) / rect.width) * canvas.width,
    y: ((e.clientY - rect.top) / rect.height) * canvas.height,
  };
}

function isPointOnImage(px, py) {
  if (!userImg) return false;

  const dx = px - imgCX;
  const dy = py - imgCY;

  const cos = Math.cos(-imgRot);
  const sin = Math.sin(-imgRot);

  const lx = dx * cos - dy * sin;
  const ly = dx * sin + dy * cos;

  const halfW = (userImg.width * imgScaleX) / 2;
  const halfH = (userImg.height * imgScaleY) / 2;

  return lx >= -halfW && lx <= halfW && ly >= -halfH && ly <= halfH;
}

function isAltPressed(ev) {
  return !!(ev?.altKey || ev?.getModifierState?.("Alt") || isAltResizePressed);
}

function isShiftPressed(ev) {
  return !!(ev?.shiftKey || ev?.getModifierState?.("Shift"));
}

function syncModifierPressed(ev) {
  isAltResizePressed = isAltPressed(ev);
}

function startMoveDrag(e, type = getActiveObjectType()) {
  if (!type) return;
  if (handleDrag || rotateDrag) return;

  activeObjectType = type;
  draggingMove = true;

  const p = screenToCanvasPoint(e);
  const center = getObjectCenter(type);
  moveStart.x = p.x;
  moveStart.y = p.y;

  centerStart.x = center.x;
  centerStart.y = center.y;
}

function onMainPointerDown(e) {
  if (uiLocked) return;

  /* =========================================================
 * 모바일 스포이드 모드
========================================================= */
  if (mobileEyedropperMode) {
    if (e.pointerType === "mouse" && e.button !== 0) return;

    e.preventDefault();
    e.stopPropagation();

    const picked = pickCanvasColorAtClientPoint(e.clientX, e.clientY);

    if (!picked) {
      showToast("색상을 읽을 수 없습니다. 다시 시도해 주세요.", "error");
      return;
    }

    if (!picked.ok && picked.reason === "transparent") {
      showToast("투명한 영역은 선택할 수 없습니다.", "warn");
      return;
    }

    if (!picked.ok || !picked.hex) {
      showToast("색상을 읽을 수 없습니다. 다시 시도해 주세요.", "error");
      return;
    }

    applyBgColor(picked.hex);
    setMobileEyedropperMode(false);
    showToast("배경색을 적용했습니다.", "ok");
    return;
  }

  if (!userImg && !hasTextObject()) return;
  if (e.pointerType === "mouse" && e.button !== 0) return;

  if (e.target.closest(".h")) return;
  if (e.target.id === "rotHandle") return;

  const p = screenToCanvasPoint(e);
  let targetType = null;
  if (isPointOnText(p.x, p.y)) targetType = "text";
  else if (isPointOnImage(p.x, p.y)) targetType = "image";
  if (!targetType) return;

  e.preventDefault();
  e.stopPropagation();

  activeObjectType = targetType;
  (e.currentTarget || canvasWrapEl)?.setPointerCapture?.(e.pointerId);
  showCanvasHelpTip(targetType === "text" ? "텍스트 드래그로 위치를 조절합니다." : "이미지 드래그로 위치를 조절합니다.");
  startMoveDrag(e, targetType);
}

canvasWrapEl?.addEventListener("pointerdown", onMainPointerDown, {
  capture: true,
});

bboxEl?.addEventListener("pointerdown", onMainPointerDown);

bboxEl?.querySelectorAll(".h").forEach((h) => {
  h.addEventListener("pointerdown", (e) => {
    if (uiLocked || !hasActiveObject()) return;
    if (e.pointerType === "mouse" && e.button !== 0) return;

    e.preventDefault();
    e.stopPropagation();

    bboxEl?.setPointerCapture?.(e.pointerId);
    draggingMove = false;

    const handle = h.dataset.h;
    const spec = getHandleSpec(handle);
    const size = getImageHalfSize();
    const p = screenToCanvasPoint(e);

    if (!spec || !size) return;

    const anchor = localToWorldPoint(
      size.halfW * spec.anchorLocal.x,
      size.halfH * spec.anchorLocal.y,
    );

    handleDrag = {
      type: getActiveObjectType() || "image",
      handle,
      signX: spec.signX,
      signY: spec.signY,
      anchorX: anchor.x,
      anchorY: anchor.y,
      startHalfW: size.halfW,
      startHalfH: size.halfH,
      startCX: imgCX,
      startCY: imgCY,
      startPointerX: p.x,
      startPointerY: p.y,
      startedWithAlt: isAltPressed(e),
      startedWithShift: isShiftPressed(e),
      startTextScale: textScale || 1,
    };

    activeResizePointerId = e.pointerId;
    syncModifierPressed(e);
    showCanvasHelpTip(e.pointerType === "touch" ? "모바일은 중심 기준으로 비율 고정 확대/축소됩니다." : "Shift: 비율 고정 · Alt: 중심 기준 확대/축소", 2600);
  });
});

rotHandleEl?.addEventListener("pointerdown", (e) => {
  if (uiLocked || !hasActiveObject()) return;
  if (e.pointerType === "mouse" && e.button !== 0) return;

  e.preventDefault();
  e.stopPropagation();

  bboxEl?.setPointerCapture?.(e.pointerId);
  draggingMove = false;

  const p = screenToCanvasPoint(e);
  const type = getActiveObjectType() || "image";
  const center = getObjectCenter(type);

  rotateDrag = {
    type,
    cx: center.x,
    cy: center.y,
    startRot: getObjectRot(type),
    startAngle: Math.atan2(p.y - center.y, p.x - center.x),
  };

  showCanvasHelpTip("상단 핸들을 드래그해 회전합니다.", 2000);
});

/* =========================================================
 * ALT 상태 추적
 * 중복 리스너 제거: document 기준으로만 관리
========================================================= */
document.addEventListener("keydown", (e) => {
  if (e.key === "Alt" || e.code === "AltLeft" || e.code === "AltRight") {
    isAltResizePressed = true;
  }
});

document.addEventListener("keyup", (e) => {
  if (e.key === "Alt" || e.code === "AltLeft" || e.code === "AltRight") {
    isAltResizePressed = false;
  }
});

window.addEventListener("blur", () => {
  isAltResizePressed = false;
});

document.addEventListener("pointermove", (e) => {
  if (uiLocked) return;

  if (
    handleDrag &&
    activeResizePointerId !== null &&
    e.pointerId === activeResizePointerId
  ) {
    syncModifierPressed(e);
  }

  const p = screenToCanvasPoint(e);

  if (draggingMove) {
    const type = getActiveObjectType() || "image";
    setObjectCenter(type, centerStart.x + (p.x - moveStart.x), centerStart.y + (p.y - moveStart.y));
    redraw();
    return;
  }

  if (handleDrag) {
    const type = handleDrag.type || getActiveObjectType() || "image";
    const axes = getObjectAxes(type);
    const isTouch = e.pointerType === "touch";

    const isAlt = isTouch || isAltPressed(e) || handleDrag.startedWithAlt;

    const isShift = isTouch || isShiftPressed(e) || handleDrag.startedWithShift;

    const keepRatio = isAlt || isShift;
    const minHalf = 10;

    let halfW = handleDrag.startHalfW;
    let halfH = handleDrag.startHalfH;

    if (isAlt) {
      /* =========================================================
       * ALT: 중심 기준 확대/축소
      ========================================================= */
      const moveX = p.x - handleDrag.startPointerX;
      const moveY = p.y - handleDrag.startPointerY;

      const localDx = moveX * axes.ux + moveY * axes.uy;
      const localDy = moveX * axes.vx + moveY * axes.vy;

      if (handleDrag.signX !== 0) {
        halfW = Math.max(
          minHalf,
          handleDrag.startHalfW + handleDrag.signX * localDx,
        );
      }

      if (handleDrag.signY !== 0) {
        halfH = Math.max(
          minHalf,
          handleDrag.startHalfH + handleDrag.signY * localDy,
        );
      }

      setObjectCenter(type, handleDrag.startCX, handleDrag.startCY);
    } else {
      /* =========================================================
       * 일반 리사이즈
      ========================================================= */
      const dx = p.x - handleDrag.anchorX;
      const dy = p.y - handleDrag.anchorY;

      if (handleDrag.signX !== 0) {
        const projX = dx * axes.ux + dy * axes.uy;
        halfW = Math.max(minHalf, (handleDrag.signX * projX) / 2);
      }

      if (handleDrag.signY !== 0) {
        const projY = dx * axes.vx + dy * axes.vy;
        halfH = Math.max(minHalf, (handleDrag.signY * projY) / 2);
      }
    }

    /* =========================================================
     * 비율 고정
     * ALT = 중심 기준 + 비율 고정
     * SHIFT = 비율 고정
    ========================================================= */
    if (keepRatio) {
      const startHalfW = handleDrag.startHalfW;
      const startHalfH = handleDrag.startHalfH;

      let ratioScale = 1;

      if (handleDrag.signX !== 0 && handleDrag.signY !== 0) {
        const scaleX = halfW / startHalfW;
        const scaleY = halfH / startHalfH;

        ratioScale =
          Math.abs(scaleX - 1) >= Math.abs(scaleY - 1) ? scaleX : scaleY;
      } else if (handleDrag.signX !== 0) {
        ratioScale = halfW / startHalfW;
      } else if (handleDrag.signY !== 0) {
        ratioScale = halfH / startHalfH;
      }

      if (!Number.isFinite(ratioScale) || ratioScale <= 0) {
        ratioScale = 1;
      }

      halfW = Math.max(minHalf, startHalfW * ratioScale);
      halfH = Math.max(minHalf, startHalfH * ratioScale);
    }

    /* =========================================================
     * 중심 재계산
    ========================================================= */
    if (isAlt) {
      setObjectCenter(type, handleDrag.startCX, handleDrag.startCY);
    } else {
      if (handleDrag.signX !== 0 && handleDrag.signY !== 0) {
        setObjectCenter(
          type,
          handleDrag.anchorX + axes.ux * (handleDrag.signX * halfW) + axes.vx * (handleDrag.signY * halfH),
          handleDrag.anchorY + axes.uy * (handleDrag.signX * halfW) + axes.vy * (handleDrag.signY * halfH),
        );
      } else if (handleDrag.signX !== 0) {
        setObjectCenter(
          type,
          handleDrag.anchorX + axes.ux * (handleDrag.signX * halfW),
          handleDrag.anchorY + axes.uy * (handleDrag.signX * halfW),
        );
      } else if (handleDrag.signY !== 0) {
        setObjectCenter(
          type,
          handleDrag.anchorX + axes.vx * (handleDrag.signY * halfH),
          handleDrag.anchorY + axes.vy * (handleDrag.signY * halfH),
        );
      }
    }

    if (type === "text") {
      const baseW = Math.max(1, handleDrag.startHalfW);
      const baseH = Math.max(1, handleDrag.startHalfH);
      const scaleRatio = Math.max(halfW / baseW, halfH / baseH);
      textScale = clamp((handleDrag.startTextScale || 1) * scaleRatio, 0.25, 8);
    } else if (userImg) {
      imgScaleX = clamp((halfW * 2) / userImg.width, 0.05, 10);
      imgScaleY = clamp((halfH * 2) / userImg.height, 0.05, 10);
    }

    redraw();
    return;
  }

  if (rotateDrag) {
    const angle = Math.atan2(p.y - rotateDrag.cy, p.x - rotateDrag.cx);
    setObjectRot(rotateDrag.type || getActiveObjectType() || "image", rotateDrag.startRot + (angle - rotateDrag.startAngle));
    redraw();
  }
});

function endPointerInteraction() {
  if (draggingMove || handleDrag || rotateDrag) {
    draggingMove = false;
    handleDrag = null;
    rotateDrag = null;
    activeResizePointerId = null;
    isAltResizePressed = false;
    redraw();
    syncActiveItemDesign();
    hideCanvasHelpTip();
    updateActionLocks();
  }
}

document.addEventListener("pointerup", () => {
  if (uiLocked) return;
  endPointerInteraction();
});

document.addEventListener("pointercancel", () => {
  if (uiLocked) return;
  endPointerInteraction();
});

canvas.addEventListener("wheel", (e) => e.preventDefault(), { passive: false });

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

function fitImageToCanvas(img) {
  const scale = Math.max(canvas.width / img.width, canvas.height / img.height);
  imgScaleX = scale;
  imgScaleY = scale;
  imgRot = 0;
  imgCX = canvas.width / 2;
  imgCY = canvas.height / 2;
}

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

  const f = fileEl.files && fileEl.files[0];

  if (fileNameEl) {
    fileNameEl.textContent = f ? f.name : "선택된 파일 없음";
  }

  if (!f) return;

  userImgFile = f || null;

  /* 너무 큰 파일은 먼저 경고 */
  if (f.size > 15 * 1024 * 1024) {
    setCanvasNotice(
      "이미지 용량이 너무 큽니다. 15MB 이하 파일로 다시 시도해주세요.",
      "error",
    );
    fileEl.value = "";
    updateActionLocks();
    return;
  }

  try {
    setCanvasNotice("이미지를 불러오는 중입니다...", "ok");

    userImg = await loadImageFromFile(f);
    activeObjectType = "image";
    fitImageToCanvas(userImg);
    syncImageCountBadge();

    redraw();
    updateSelectedInfoText();
    updateDraftInfo();
    updateActionLocks();

    warnLowResolutionImage(userImg);

    clearCanvasNotice();
    showToast("이미지가 업로드되었습니다.", "ok");
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

fileDelBtn?.addEventListener(
  "click",
  async (e) => {
    e.preventDefault();
    e.stopPropagation();

    clearCanvasNotice();
    setMobileEyedropperMode(false);

    if (await applyConfirmedLockIfNeeded(true)) return;

    userImg = null;
    userImgFile = null;
    if (activeObjectType === "image") activeObjectType = hasTextObject() ? "text" : null;
    syncImageCountBadge();
    imgScaleX = 1;
    imgScaleY = 1;
    imgRot = 0;
    imgCX = canvas.width / 2;
    imgCY = canvas.height / 2;

    if (fileNameEl) fileNameEl.textContent = "선택된 파일 없음";

    redraw();
    updateSelectedInfoText();
    updateDraftInfo();
    updateActionLocks();
    clearCanvasNotice();
    showToast("이미지가 삭제되었습니다.", "ok");
  },
  true,
);
