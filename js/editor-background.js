/* split from editor.js: 배경색/그라데이션/컬러피커(스포이드 포함) */


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

// 미사용 확인 (2026-07-09) - 호출부 없음, 필요시 복원
// function isCompleteHexInput(value) {
//   const v = String(value || "").trim();
//   return /^#?[0-9a-f]{6}$/i.test(v) || /^#?[0-9a-f]{3}$/i.test(v);
// }

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
      position: it.design.bgPosition,
      softness: it.design.bgSoftness,
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
    if (addNewTextSlot()) {
      showToast("새 텍스트를 추가할 수 있습니다. 입력창에 내용을 입력해 주세요.", "ok", 1200);
    }
  });

  textInputEl?.addEventListener("input", () => {
    syncTextFontPreviewButtons?.();

    const value = textInputEl.value;
    applyTextSettings({ value, enabled: !!safeTrim(value) });
  });

  textClearBtnEl?.addEventListener("click", () => {
    if (deleteActiveTextObject()) {
      redraw();
      syncActiveItemDesign?.();
      updateActionLocks?.();
      showToast("텍스트를 삭제했습니다.", "info", 1200);
    }
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
    btn.addEventListener("click", () => {
      const align = btn.dataset.textAlign || "center";
      applyTextSettings({ align });
      if (hasTextObject()) {
        const label = align === "left" ? "왼쪽" : align === "right" ? "오른쪽" : "가운데";
        showToast(`텍스트를 캔버스 ${label}에 배치했습니다.`, "ok", 1200);
      }
    });
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
