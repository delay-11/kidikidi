/* moved from js/design/panel-canvas.js */
/* =========================================================
 * Pickr 인스턴스
========================================================= */
let bgPickr = null;
let solidInlinePickr = null;
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

function clamp01(value, fallback = 0) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.min(1, n));
}

function normalizeGradientPosition(value) {
  return clamp01(value, 0.5);
}

function normalizeGradientSoftness(value) {
  return clamp01(value, 1);
}

function getGradientPercentLabel(value) {
  return `${Math.round(clamp01(value, 0) * 100)}%`;
}

function getGradientPositionFromItem(it) {
  return normalizeGradientPosition(
    it?.design?.bgPosition ??
    it?.design?.gradientPosition ??
    it?.design?.background?.position ??
    0.5,
  );
}

function getGradientSoftnessFromItem(it) {
  return normalizeGradientSoftness(
    it?.design?.bgSoftness ??
    it?.design?.gradientSoftness ??
    it?.design?.background?.softness ??
    1,
  );
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

function createBackgroundFill(c, w, h, bgType, color1, color2, direction, position = 0.5, softness = 1) {
  if (normalizeBgMode(bgType) !== "gradient") {
    return color1 || "#ffffff";
  }

  const [x0, y0, x1, y1] = getGradientPoints(direction, w, h);
  const gradient = c.createLinearGradient(x0, y0, x1, y1);
  const pos = normalizeGradientPosition(position);
  const soft = normalizeGradientSoftness(softness);
  const half = soft / 2;
  const start = Math.max(0, Math.min(pos, pos - half));
  const end = Math.min(1, Math.max(pos, pos + half));

  gradient.addColorStop(0, color1 || "#ffffff");
  gradient.addColorStop(start, color1 || "#ffffff");
  gradient.addColorStop(end, color2 || "#fdcc63");
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

  const solidSection = document.querySelector("#toolBg .bgToolSectionSolid");
  const gradientSection = document.querySelector("#toolBg .bgToolSectionGradient");

  if (solidSection) solidSection.hidden = isGradient;
  if (gradientSection) gradientSection.hidden = !isGradient;
  if (gradientPanelEl) gradientPanelEl.hidden = !isGradient;

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

  const pos = normalizeGradientPosition(draftGradientPosition);
  const soft = normalizeGradientSoftness(draftGradientSoftness);
  if (gradientPositionRangeEl) gradientPositionRangeEl.value = String(Math.round(pos * 100));
  if (gradientPositionValueEl) gradientPositionValueEl.textContent = getGradientPercentLabel(pos);
  if (gradientSoftnessRangeEl) gradientSoftnessRangeEl.value = String(Math.round(soft * 100));
  if (gradientSoftnessValueEl) gradientSoftnessValueEl.textContent = getGradientPercentLabel(soft);

  // 모드 전환 직후 HTML의 disabled 기본값이 남아 있으면
  // 그라데이션 설정이 보이는데도 조작이 막히는 문제가 생길 수 있어 여기서 한 번 더 동기화합니다.
  syncBgControlDisabledState?.();
}

function setSoftDisabled(el, disabled) {
  if (!el) return;
  el.classList.toggle("is-disabled", !!disabled);
  el.setAttribute("aria-disabled", disabled ? "true" : "false");
}

function syncBgControlDisabledState() {
  const hasUserInfoForBg = typeof validateUserInfo === "function" ? validateUserInfo(false) : true;
  const laserLocked = isLaserFixedBg();
  const canEditBg = !uiLocked && hasUserInfoForBg && !laserLocked;

  // 모드 전환 버튼은 disabled로 완전히 막지 않습니다.
  // disabled 상태가 한 번 남으면 클릭 이벤트 자체가 안 들어와서
  // 그라데이션 탭이 먹통처럼 보이는 문제가 생기기 때문입니다.
  if (bgModeSolidBtn) {
    bgModeSolidBtn.disabled = !!uiLocked;
    setSoftDisabled(bgModeSolidBtn, !hasUserInfoForBg);
  }

  if (bgModeGradientBtn) {
    bgModeGradientBtn.disabled = !!uiLocked;
    setSoftDisabled(bgModeGradientBtn, !hasUserInfoForBg || laserLocked);
  }

  if (bgPickBtn) bgPickBtn.disabled = !canEditBg;
  if (bgEyeBtn) bgEyeBtn.disabled = !canEditBg;
  if (typeof solidNativeColorEl !== "undefined" && solidNativeColorEl) solidNativeColorEl.disabled = !canEditBg;
  if (typeof solidHexInputEl !== "undefined" && solidHexInputEl) solidHexInputEl.disabled = !canEditBg;
  if (typeof solidColorBoardEl !== "undefined" && solidColorBoardEl) solidColorBoardEl.closest(".solidColorBoardBox")?.classList.toggle("is-disabled", !canEditBg);

  if (gradientColor1El) gradientColor1El.disabled = !canEditBg;
  if (gradientColor2El) gradientColor2El.disabled = !canEditBg;
  if (gradientPositionRangeEl) gradientPositionRangeEl.disabled = !canEditBg;
  if (gradientSoftnessRangeEl) gradientSoftnessRangeEl.disabled = !canEditBg;
  if (typeof gradientResetBtnEl !== "undefined" && gradientResetBtnEl) gradientResetBtnEl.disabled = !canEditBg;
  gradientDirBtnEls?.forEach((btn) => (btn.disabled = !canEditBg));
}

function getNormalizedItemBgType(it) {
  return it?.design?.bgSet && it?.design?.bgType === "gradient" ? "gradient" : "solid";
}

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
  imgCX = Number.isFinite(obj?.cx) ? obj.cx : canvas.width / 2;
  imgCY = Number.isFinite(obj?.cy) ? obj.cy : canvas.height / 2;
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
      cx: Number.isFinite(obj.cx) ? obj.cx : canvas.width / 2,
      cy: Number.isFinite(obj.cy) ? obj.cy : canvas.height / 2,
      scaleX: Number.isFinite(obj.scaleX) ? obj.scaleX : 1,
      scaleY: Number.isFinite(obj.scaleY) ? obj.scaleY : 1,
      rot: Number.isFinite(obj.rot) ? obj.rot : 0,
      fileName: obj.file?.name || "",
    }));
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
  draftGradientPosition = normalizeGradientPosition(draftGradientPosition);
  draftGradientSoftness = normalizeGradientSoftness(draftGradientSoftness);

  const it = cartItems.find((x) => x.id === selectedItemId);
  if (it) {
    it.design = it.design || {};
    it.design.bgSet = true;
    it.design.bgType = draftBgType === "gradient" ? "gradient" : "solid";
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
    it.bgColor = it.design.bgColor;
  }

  syncGradientUI();
  setBgTextFromCurrentItem();
  redraw();
  refreshCurrentItemPreview?.();
  renderCart?.();
  updateActionLocks();
}

function applyGradientSettings({ color1, color2, direction, position, softness } = {}) {
  if (uiLocked) return;
  if (!validateUserInfo(false)) return;
  if (isLaserFixedBg()) return;

  draftBgType = "gradient";
  draftBgSet = true;
  if (color1) draftBgColor = normalizeHexInput(color1, draftBgColor || "#ffffff");
  if (color2) draftBgColor2 = normalizeHexInput(color2, draftBgColor2 || "#fdcc63");
  if (direction) draftBgDirection = normalizeGradientDirection(direction);
  if (position !== undefined) draftGradientPosition = normalizeGradientPosition(position);
  if (softness !== undefined) draftGradientSoftness = normalizeGradientSoftness(softness);

  const it = cartItems.find((x) => x.id === selectedItemId);
  if (it) {
    it.bgColor = draftBgColor || "#ffffff";
    it.design = it.design || {};
    it.design.bgSet = true;
    it.design.bgType = "gradient";
    it.design.bgColor = it.bgColor;
    it.design.bgColor2 = draftBgColor2 || "#fdcc63";
    it.design.bgDirection = normalizeGradientDirection(draftBgDirection || "to-right");
    it.design.bgPosition = normalizeGradientPosition(draftGradientPosition);
    it.design.bgSoftness = normalizeGradientSoftness(draftGradientSoftness);
    it.design.background = {
      type: "gradient",
      color: it.design.bgColor,
      color2: it.design.bgColor2,
      direction: normalizeGradientDirection(it.design.bgDirection),
      position: normalizeGradientPosition(draftGradientPosition),
      softness: normalizeGradientSoftness(draftGradientSoftness),
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
 * 단색 전체 컬러 보드
========================================================= */
let solidColorBoardPointerId = null;
let solidColorBoardMarkerRatio = { x: 0, y: 0 };
let isPickingSolidColorBoard = false;

function hexToRgbValue(hex) {
  const v = normalizeHexInput(hex, "#ffffff").slice(1);
  return {
    r: parseInt(v.slice(0, 2), 16),
    g: parseInt(v.slice(2, 4), 16),
    b: parseInt(v.slice(4, 6), 16),
  };
}

function rgbToHsvValue(r, g, b) {
  const rr = r / 255;
  const gg = g / 255;
  const bb = b / 255;
  const max = Math.max(rr, gg, bb);
  const min = Math.min(rr, gg, bb);
  const d = max - min;
  let h = 0;

  if (d) {
    if (max === rr) h = ((gg - bb) / d) % 6;
    else if (max === gg) h = (bb - rr) / d + 2;
    else h = (rr - gg) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }

  return {
    h,
    s: max === 0 ? 0 : d / max,
    v: max,
  };
}

function hsvToRgbValue(h, s, v) {
  const hh = (((Number(h) || 0) % 360) + 360) % 360;
  const ss = clamp01(s, 1);
  const vv = clamp01(v, 1);
  const c = vv * ss;
  const x = c * (1 - Math.abs(((hh / 60) % 2) - 1));
  const m = vv - c;
  let r1 = 0;
  let g1 = 0;
  let b1 = 0;

  if (hh < 60) [r1, g1, b1] = [c, x, 0];
  else if (hh < 120) [r1, g1, b1] = [x, c, 0];
  else if (hh < 180) [r1, g1, b1] = [0, c, x];
  else if (hh < 240) [r1, g1, b1] = [0, x, c];
  else if (hh < 300) [r1, g1, b1] = [x, 0, c];
  else [r1, g1, b1] = [c, 0, x];

  return {
    r: Math.round((r1 + m) * 255),
    g: Math.round((g1 + m) * 255),
    b: Math.round((b1 + m) * 255),
  };
}

function getSolidColorBoardHexFromRatio(x, y) {
  const rx = clamp01(x, 0);
  const ry = clamp01(y, 0);
  const base = hsvToRgbValue(rx * 360, 1, 1);

  if (ry < 0.5) {
    const whiteAlpha = 1 - ry / 0.5;
    return rgbToHex(
      Math.round(base.r * (1 - whiteAlpha) + 255 * whiteAlpha),
      Math.round(base.g * (1 - whiteAlpha) + 255 * whiteAlpha),
      Math.round(base.b * (1 - whiteAlpha) + 255 * whiteAlpha),
    );
  }

  const blackAlpha = (ry - 0.5) / 0.5;
  return rgbToHex(
    Math.round(base.r * (1 - blackAlpha)),
    Math.round(base.g * (1 - blackAlpha)),
    Math.round(base.b * (1 - blackAlpha)),
  );
}

function drawSolidColorBoard() {
  if (typeof solidColorBoardEl === "undefined" || !solidColorBoardEl) return;

  const rect = solidColorBoardEl.getBoundingClientRect();
  const cssW = Math.max(1, Math.round(rect.width || solidColorBoardEl.clientWidth || 900));
  const cssH = Math.max(1, Math.round(rect.height || solidColorBoardEl.clientHeight || 170));
  const dpr = Math.max(1, window.devicePixelRatio || 1);
  const pixelW = Math.round(cssW * dpr);
  const pixelH = Math.round(cssH * dpr);

  if (solidColorBoardEl.width !== pixelW) solidColorBoardEl.width = pixelW;
  if (solidColorBoardEl.height !== pixelH) solidColorBoardEl.height = pixelH;

  const ctx = solidColorBoardEl.getContext("2d", { willReadFrequently: true });
  if (!ctx) return;

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, cssW, cssH);

  const hue = ctx.createLinearGradient(0, 0, cssW, 0);
  hue.addColorStop(0, "#ff0000");
  hue.addColorStop(1 / 6, "#ffff00");
  hue.addColorStop(2 / 6, "#00ff00");
  hue.addColorStop(3 / 6, "#00ffff");
  hue.addColorStop(4 / 6, "#0000ff");
  hue.addColorStop(5 / 6, "#ff00ff");
  hue.addColorStop(1, "#ff0000");
  ctx.fillStyle = hue;
  ctx.fillRect(0, 0, cssW, cssH);

  const tone = ctx.createLinearGradient(0, 0, 0, cssH);
  tone.addColorStop(0, "rgba(255,255,255,1)");
  tone.addColorStop(0.5, "rgba(255,255,255,0)");
  tone.addColorStop(0.5, "rgba(0,0,0,0)");
  tone.addColorStop(1, "rgba(0,0,0,1)");
  ctx.fillStyle = tone;
  ctx.fillRect(0, 0, cssW, cssH);
}

function setSolidColorBoardMarkerRatio(x, y) {
  if (typeof solidColorBoardMarkerEl === "undefined" || !solidColorBoardMarkerEl) return;

  const rx = clamp01(x, 0);
  const ry = clamp01(y, 0);
  solidColorBoardMarkerRatio = { x: rx, y: ry };
  solidColorBoardMarkerEl.style.left = `${rx * 100}%`;
  solidColorBoardMarkerEl.style.top = `${ry * 100}%`;
}

function syncSolidColorBoardMarker(hex) {
  if (typeof solidColorBoardMarkerEl === "undefined" || !solidColorBoardMarkerEl) return;

  const { r, g, b } = hexToRgbValue(hex);
  const hsv = rgbToHsvValue(r, g, b);
  const x = hsv.h / 360;
  const y = hsv.v < 0.5 ? 1 - hsv.v : (1 - hsv.s) * 0.5;
  setSolidColorBoardMarkerRatio(x, y);
}

function pickSolidColorBoardAt(clientX, clientY) {
  if (typeof solidColorBoardEl === "undefined" || !solidColorBoardEl) return;
  if (uiLocked) return;

  if (!validateUserInfo(false)) {
    validateUserInfo(true);
    updateActionLocks?.();
    return;
  }

  if (isLaserFixedBg()) {
    setCanvasNotice("레이저 선택 시 배경색은 흰색으로 고정됩니다.", "error");
    showToast?.("레이저 옵션에서는 배경 설정을 변경할 수 없습니다.", "warn");
    return;
  }

  drawSolidColorBoard();

  const boardBox = solidColorBoardEl.closest?.(".solidColorBoardBox") || solidColorBoardEl;
  const rect = boardBox.getBoundingClientRect();
  if (!rect.width || !rect.height) return;

  const x = Math.max(0, Math.min(rect.width, clientX - rect.left));
  const y = Math.max(0, Math.min(rect.height, clientY - rect.top));
  const rx = clamp01(x / rect.width, 0);
  const ry = clamp01(y / rect.height, 0);
  const hex = getSolidColorBoardHexFromRatio(rx, ry);

  // 컬러보드에서 직접 터치/드래그 중에는
  // 터치 좌표와 원형 마커 좌표를 같은 박스 기준으로 맞춥니다.
  // HEX 값을 다시 HSV로 역산하면 같은 색이어도 위치가 튀어 보일 수 있어서,
  // 직접 고른 좌표를 마커의 최종 위치로 한 번 더 고정합니다.
  isPickingSolidColorBoard = true;
  try {
    setSolidColorBoardMarkerRatio(rx, ry);
    applyBgColor(hex);
    setSolidColorBoardMarkerRatio(rx, ry);
  } finally {
    isPickingSolidColorBoard = false;
  }
}

function initSolidColorBoard() {
  if (typeof solidColorBoardEl === "undefined" || !solidColorBoardEl) return;

  const drawAndSync = () => {
    drawSolidColorBoard();
    if (!isPickingSolidColorBoard && solidColorBoardPointerId === null) {
      syncSolidColorBoardMarker(draftBgColor || "#ffffff");
    }
  };

  requestAnimationFrame(drawAndSync);

  try {
    const ro = new ResizeObserver(drawAndSync);
    ro.observe(solidColorBoardEl);
  } catch {
    window.addEventListener("resize", drawAndSync);
  }

  solidColorBoardEl.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    solidColorBoardPointerId = event.pointerId;
    solidColorBoardEl.setPointerCapture?.(event.pointerId);
    pickSolidColorBoardAt(event.clientX, event.clientY);
  });

  solidColorBoardEl.addEventListener("pointermove", (event) => {
    if (solidColorBoardPointerId !== event.pointerId) return;
    event.preventDefault();
    pickSolidColorBoardAt(event.clientX, event.clientY);
  });

  ["pointerup", "pointercancel", "lostpointercapture"].forEach((type) => {
    solidColorBoardEl.addEventListener(type, () => {
      solidColorBoardPointerId = null;
    });
  });
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

  if (typeof solidNativeColorEl !== "undefined" && solidNativeColorEl) {
    solidNativeColorEl.value = v;
  }

  if (typeof solidHexInputEl !== "undefined" && solidHexInputEl) {
    solidHexInputEl.value = v.toUpperCase();
  }

  if (!isPickingSolidColorBoard) {
    syncSolidColorBoardMarker?.(v);
  }

  if (solidInlinePickr) {
    try {
      solidInlinePickr.setColor(v, true);
    } catch (e) {
      console.warn("인라인 Pickr 색상 반영 실패:", e);
    }
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


function getTextFontDefaultLabel(type = "basic") {
  const map = {
    basic: "Aa 기본",
    bold: "Aa 굵게",
    round: "Aa 둥근",
    hand: "Aa 손글씨",
    pixel: "Aa 픽셀",
    calli: "Aa 캘리",
  };
  return map[type] || map.basic;
}


function syncTextFontPreviewButtons() {
  // 폰트 타입 버튼은 입력값 미리보기가 아니라, 각 폰트 이름표를 해당 폰트로 보여주는 용도입니다.
  const labels = {
    basic: "Aa 기본",
    bold: "Aa 굵게",
    round: "Aa 둥근",
    hand: "Aa 손글씨",
    pixel: "Aa 픽셀",
    calli: "Aa 캘리",
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
    it.design.bgPosition = normalizeGradientPosition(draftGradientPosition);
    it.design.bgSoftness = normalizeGradientSoftness(draftGradientSoftness);
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

  syncBgControlDisabledState?.();

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

      // 배경 탭 진입 시 현재 주문정보/레이저 상태에 맞춰
      // 단색·그라데이션 버튼 잠금을 다시 맞춥니다.
      if (targetId === "toolBg") {
        syncGradientUI?.();
        syncBgControlDisabledState?.();
        requestAnimationFrame(() => drawSolidColorBoard?.());
      }
    });
  });

  const handleBgModeToggle = (event, nextMode) => {
    event?.preventDefault?.();
    if (uiLocked) return;

    const hasUserInfo = typeof validateUserInfo === "function" ? validateUserInfo(false) : true;
    const laserLocked = isLaserFixedBg();

    // disabled 속성이 예전 상태로 남아 있으면 탭 클릭이 먹통처럼 보일 수 있어
    // 실제 조건을 다시 계산해서 먼저 잠금을 정리합니다.
    syncBgControlDisabledState?.();

    if (!hasUserInfo) {
      // 정보 입력 전에는 실제 배경 적용은 막되,
      // 단색/그라데이션 설정 화면 전환은 보여줍니다.
      draftBgType = normalizeBgMode(nextMode);
      draftBgColor = normalizeHexInput(draftBgColor || "#ffffff", "#ffffff");
      draftBgColor2 = normalizeHexInput(draftBgColor2 || "#fdcc63", "#fdcc63");
      draftBgDirection = normalizeGradientDirection(draftBgDirection || "to-right");
      syncGradientUI?.();
      syncBgControlDisabledState?.();
      validateUserInfo?.(true);
      showToast?.("주문자 정보를 입력하면 배경을 적용할 수 있습니다.", "warn", 1600);
      updateActionLocks?.();
      return;
    }

    if (nextMode === "gradient" && laserLocked) {
      showToast?.("레이저 옵션에서는 그라데이션 배경을 사용할 수 없습니다.", "warn", 1800);
      return;
    }

    applyBgMode(nextMode);

    if (nextMode === "solid") {
      setActivePickrTarget("solid", solidColorBoardEl || bgPickBtn);
    } else {
      setActivePickrTarget("gradient1", gradientColor1El);
    }

    syncGradientUI?.();
    syncBgControlDisabledState?.();
  };

  bgModeSolidBtn?.addEventListener("click", (event) => handleBgModeToggle(event, "solid"));
  bgModeGradientBtn?.addEventListener("click", (event) => handleBgModeToggle(event, "gradient"));

  bgModeSolidBtn?.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") handleBgModeToggle(event, "solid");
  });

  bgModeGradientBtn?.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") handleBgModeToggle(event, "gradient");
  });

  gradientColor1El?.addEventListener("click", () => {
    syncBgControlDisabledState?.();
    if (uiLocked || isLaserFixedBg() || !validateUserInfo(false)) return;
    setMobileEyedropperMode(false);
    applyBgMode("gradient");
    setActivePickrTarget("gradient1", gradientColor1El);
    bgPickr?.show();
    requestAnimationFrame(positionPickrPanel);
  });

  gradientColor2El?.addEventListener("click", () => {
    syncBgControlDisabledState?.();
    if (uiLocked || isLaserFixedBg() || !validateUserInfo(false)) return;
    setMobileEyedropperMode(false);
    applyBgMode("gradient");
    setActivePickrTarget("gradient2", gradientColor2El);
    bgPickr?.show();
    requestAnimationFrame(positionPickrPanel);
  });

  gradientDirBtnEls?.forEach((btn) => {
    btn.addEventListener("click", () => {
      if (uiLocked || isLaserFixedBg() || !validateUserInfo(false)) return;
      applyGradientSettings({ direction: btn.dataset.gradientDir || "to-right" });
    });
  });

  gradientPositionRangeEl?.addEventListener("input", () => {
    if (uiLocked || isLaserFixedBg() || !validateUserInfo(false)) return;
    applyGradientSettings({ position: Number(gradientPositionRangeEl.value || 50) / 100 });
  });

  gradientSoftnessRangeEl?.addEventListener("input", () => {
    if (uiLocked || isLaserFixedBg() || !validateUserInfo(false)) return;
    applyGradientSettings({ softness: Number(gradientSoftnessRangeEl.value || 100) / 100 });
  });

  gradientResetBtnEl?.addEventListener("click", () => {
    syncBgControlDisabledState?.();
    if (uiLocked || isLaserFixedBg() || !validateUserInfo(false)) return;

    // 경계 위치와 퍼짐 정도만 기본값으로 되돌립니다.
    // 시작/끝 색상과 방향은 사용자가 선택한 값을 유지합니다.
    applyGradientSettings({ position: 0.5, softness: 1 });
    showToast?.("경계 위치와 퍼짐 정도를 초기화했습니다.", "ok", 1200);
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
    syncTextFontPreviewButtons?.();
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
  initSolidColorBoard?.();

  if (!bgPickMountEl || !window.Pickr || bgPickr) {
    setBgUI("#ffffff");
    syncGradientUI?.();
    syncTextUI?.();
    return;
  }

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

  // 단색은 Pickr hue 슬라이더 대신 커스텀 전체 컬러 보드를 사용합니다.


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
    setActivePickrTarget("solid", solidColorBoardEl || bgPickBtn);
  });

  bgEyeBtn?.addEventListener("click", async () => {
    await openEyeDropper();
  });

  solidNativeColorEl?.addEventListener("input", () => {
    if (uiLocked || isLaserFixedBg()) return;
    applyBgColor(solidNativeColorEl.value || "#ffffff");
  });

  solidHexInputEl?.addEventListener("input", () => {
    if (uiLocked || isLaserFixedBg()) return;
    const raw = safeTrim(solidHexInputEl.value || "");
    const value = raw.startsWith("#") ? raw : `#${raw}`;
    if (/^#[0-9a-fA-F]{6}$/.test(value)) {
      applyBgColor(value);
    }
  });

  solidHexInputEl?.addEventListener("blur", () => {
    setBgUI(normalizeHexInput(solidHexInputEl.value, draftBgColor || "#ffffff"));
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
  const capType = capTypeEl?.value || "-";
  const laser = profile === "OEM" ? laserEl?.value || "none" : "none";
  const qty = Math.max(1, toInt(qtyEl?.value, 1));
  const it = cartItems.find((x) => x.id === selectedItemId);

  // 수정 이유:
  // 기존 시안을 선택한 뒤 레이저 옵션만 바꾸면 화면 표시는 바뀌지만
  // cartItems 안의 실제 item.laser 값은 그대로라서,
  // 메일 첨부 생성 시 "레이저 없음"으로 판단되어 원본파일이 빠질 수 있었습니다.
  if (it) {
    it.profile = profile;
    it.capType = capType;
    it.laser = laser;
    it.qty = qty;
  }

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
  if (!hasImageObject()) {
    imgCX = canvas.width / 2;
    imgCY = canvas.height / 2;
  } else {
    syncActiveImageFromLegacy();
    userImages.forEach((obj) => {
      obj.cx = clamp(obj.cx, 0, canvas.width);
      obj.cy = clamp(obj.cy, 0, canvas.height);
    });
    setActiveImageIndex(activeImageIndex);
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
  const position = getGradientPositionFromItem(it);
  const softness = getGradientSoftnessFromItem(it);

  offCtx.save();
  offCtx.fillStyle = createBackgroundFill(offCtx, off.width, off.height, bgType, color1, color2, direction, position, softness);
  offCtx.fillRect(0, 0, off.width, off.height);
  offCtx.restore();

  const previewImages = Array.isArray(it.design?.images) && it.design.images.length
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

  for (const imageState of previewImages) {
    if (!imageState?.imgDataUrl) continue;
    const previewImg = new Image();
    previewImg.src = imageState.imgDataUrl;

    if (!previewImg.complete || !previewImg.naturalWidth) {
      return "";
    }

    offCtx.save();
    offCtx.translate(imageState.cx ?? off.width / 2, imageState.cy ?? off.height / 2);
    offCtx.rotate(imageState.rot ?? 0);
    const sx = imageState.scaleX ?? imageState.scale ?? 1;
    const sy = imageState.scaleY ?? imageState.scale ?? 1;
    const w = previewImg.width * sx;
    const h = previewImg.height * sy;
    offCtx.drawImage(previewImg, -w / 2, -h / 2, w, h);
    offCtx.restore();
  }

  if (!previewImages.length && userImg) {
    syncActiveImageFromLegacy();
    (Array.isArray(userImages) ? userImages : [{ img: userImg, cx: imgCX, cy: imgCY, scaleX: imgScaleX, scaleY: imgScaleY, rot: imgRot }]).forEach((obj) => {
      if (!obj?.img) return;
      offCtx.save();
      offCtx.translate(obj.cx ?? off.width / 2, obj.cy ?? off.height / 2);
      offCtx.rotate(obj.rot ?? 0);
      const w = obj.img.width * (obj.scaleX ?? 1);
      const h = obj.img.height * (obj.scaleY ?? 1);
      offCtx.drawImage(obj.img, -w / 2, -h / 2, w, h);
      offCtx.restore();
    });
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
  if (hasImageObject()) {
    const images = serializeImageObjects();
    it.design.images = images;
    const active = images[activeImageIndex] || images[images.length - 1] || images[0];
    it.design.imgDataUrl = active?.imgDataUrl || null;
    it.design.cx = active?.cx ?? canvas.width / 2;
    it.design.cy = active?.cy ?? canvas.height / 2;
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
  draftGradientPosition = 0.5;
  draftGradientSoftness = 1;

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
        cx: Number.isFinite(imageState.cx) ? imageState.cx : canvas.width / 2,
        cy: Number.isFinite(imageState.cy) ? imageState.cy : canvas.height / 2,
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
  userImages = [];
  activeImageIndex = -1;
  imgCX = canvas.width / 2;
  imgCY = canvas.height / 2;
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
  textCX = canvas.width / 2;
  textCY = canvas.height / 2;
  textScale = 1;
  textRot = 0;
  activeObjectType = null;
  syncTextUI?.();

  selectedItemId = null;
  setMobileEyedropperMode(false);

  if (fileNameEl) fileNameEl.textContent = "선택된 파일 없음";
  syncImageCountBadge();
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
  const position = normalizeGradientPosition(draftGradientPosition);
  const softness = normalizeGradientSoftness(draftGradientSoftness);

  ctx.save();
  ctx.fillStyle = createBackgroundFill(ctx, canvas.width, canvas.height, bgType, color1, color2, direction, position, softness);
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
  if (!hasImageObject()) return;
  syncActiveImageFromLegacy();

  userImages.forEach((obj) => {
    if (!obj?.img) return;
    const w = obj.img.width * (obj.scaleX ?? 1);
    const h = obj.img.height * (obj.scaleY ?? 1);

    ctx.save();
    ctx.translate(obj.cx ?? canvas.width / 2, obj.cy ?? canvas.height / 2);
    ctx.rotate(obj.rot ?? 0);
    ctx.drawImage(obj.img, -w / 2, -h / 2, w, h);
    ctx.restore();
  });
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
  if (activeObjectType === "image") return hasImageObject();
  return hasImageObject() || hasTextObject();
}

function getActiveObjectType() {
  if (activeObjectType === "text" && hasTextObject()) return "text";
  if (activeObjectType === "image" && hasImageObject()) return "image";
  if (hasTextObject()) return "text";
  if (hasImageObject()) return "image";
  return null;
}

function getObjectCenter(type = getActiveObjectType()) {
  if (type === "text") return { x: textCX || canvas.width / 2, y: textCY || canvas.height / 2 };
  const obj = getActiveImageObject();
  return { x: obj?.cx ?? imgCX, y: obj?.cy ?? imgCY };
}

function setObjectCenter(type, x, y) {
  if (type === "text") {
    textCX = x;
    textCY = y;
  } else {
    imgCX = x;
    imgCY = y;
    if (activeImageIndex >= 0 && userImages[activeImageIndex]) {
      userImages[activeImageIndex].cx = x;
      userImages[activeImageIndex].cy = y;
    }
  }
}

function getObjectRot(type = getActiveObjectType()) {
  if (type === "text") return textRot || 0;
  const obj = getActiveImageObject();
  return obj?.rot ?? imgRot ?? 0;
}

function setObjectRot(type, rot) {
  if (type === "text") textRot = rot;
  else {
    imgRot = rot;
    if (activeImageIndex >= 0 && userImages[activeImageIndex]) userImages[activeImageIndex].rot = rot;
  }
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
  const obj = getActiveImageObject();
  if (!obj?.img) return null;
  return {
    halfW: (obj.img.width * (obj.scaleX ?? imgScaleX ?? 1)) / 2,
    halfH: (obj.img.height * (obj.scaleY ?? imgScaleY ?? 1)) / 2,
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

function getImageIndexAtPoint(px, py) {
  if (!hasImageObject()) return -1;
  syncActiveImageFromLegacy();

  for (let i = userImages.length - 1; i >= 0; i -= 1) {
    const obj = userImages[i];
    if (!obj?.img) continue;

    const dx = px - (obj.cx ?? canvas.width / 2);
    const dy = py - (obj.cy ?? canvas.height / 2);

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

function isPointOnImage(px, py) {
  return getImageIndexAtPoint(px, py) >= 0;
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

  if (!hasImageObject() && !hasTextObject()) return;
  if (e.pointerType === "mouse" && e.button !== 0) return;

  if (e.target.closest(".h")) return;
  if (e.target.id === "rotHandle") return;

  const p = screenToCanvasPoint(e);
  let targetType = null;
  const hitImageIndex = getImageIndexAtPoint(p.x, p.y);
  if (isPointOnText(p.x, p.y)) targetType = "text";
  else if (hitImageIndex >= 0) {
    setActiveImageIndex(hitImageIndex);
    targetType = "image";
  }
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
    } else {
      const obj = getActiveImageObject();
      if (obj?.img) {
        imgScaleX = clamp((halfW * 2) / obj.img.width, 0.05, 10);
        imgScaleY = clamp((halfH * 2) / obj.img.height, 0.05, 10);
        obj.scaleX = imgScaleX;
        obj.scaleY = imgScaleY;
      }
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
      const scale = Math.max(canvas.width / img.width, canvas.height / img.height);
      userImages.push({
        img,
        file: f || null,
        cx: canvas.width / 2,
        cy: canvas.height / 2,
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
    showToast(files.length > 1 ? `이미지 ${files.length}개가 업로드되었습니다.` : "이미지가 업로드되었습니다.", "ok");
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
