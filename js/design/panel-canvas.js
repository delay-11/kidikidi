/* =========================================================
 * Pickr 인스턴스
========================================================= */
let bgPickr = null;

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
  if (!panel || !bgPickBtn) return;

  const rect = bgPickBtn.getBoundingClientRect();
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

  if (bgPickr) {
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

  if (it) {
    it.bgColor = v;
    it.design = it.design || {};
    it.design.bgSet = !isLaserFixedBg();

    if (bgTextEl) {
      bgTextEl.textContent = isLaserFixedBg() ? "-" : getItemBgColor(it);
    }
  } else {
    draftBgColor = v;
    draftBgSet = !isLaserFixedBg();

    if (bgTextEl) {
      bgTextEl.textContent = isLaserFixedBg() ? "-" : v;
    }
  }

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
    } else {
      draftBgColor = fixed;
      draftBgSet = false;
    }

    setBgUI(fixed);

    if (bgTextEl) {
      bgTextEl.textContent = "-";
    }
  } else {
    const color = it?.bgColor || draftBgColor || "#ffffff";
    setBgUI(color);

    if (bgTextEl) {
      bgTextEl.textContent = it?.design?.bgSet || draftBgSet ? color : "-";
    }
  }

  if (bgPickBtn) {
    bgPickBtn.disabled = uiLocked || locked;
  }

  if (bgEyeBtn) {
    bgEyeBtn.disabled = uiLocked || locked;
  }

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

  if (!window.EyeDropper) {
    setCanvasNotice(
      "현재 브라우저에서는 스포이드 기능이 지원되지 않습니다.",
      "error",
    );
    showToast("스포이드는 웹 / PC 환경에서만 사용할 수 있습니다.", "warn");
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
 * Pickr 초기화
========================================================= */
function initPickr() {
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
    applyBgColor(hex);
  });

  window.addEventListener("resize", positionPickrPanel);
  window.addEventListener("scroll", positionPickrPanel, { passive: true });

  setBgUI("#ffffff");
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
  const cap = safeTrim(capTypeEl?.value || "") || "-";

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

  const outline = document.createElement("img");
  outline.id = "maoGuideOutline";
  outline.src = "./image/guides/mao-outline.svg";
  outline.alt = "";
  outline.draggable = false;
  outline.style.position = "absolute";
  outline.style.inset = "0";
  outline.style.width = "100%";
  outline.style.height = "100%";
  outline.style.pointerEvents = "none";

  const inner = document.createElement("img");
  inner.id = "maoGuideInner";
  inner.src = "./image/guides/mao-inner.svg";
  inner.alt = "";
  inner.draggable = false;
  inner.style.position = "absolute";
  inner.style.inset = "0";
  inner.style.width = "100%";
  inner.style.height = "100%";
  inner.style.pointerEvents = "none";

  wrap.appendChild(outline);
  wrap.appendChild(inner);

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
    draftBgSet = false;
    setBgUI("#ffffff");
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

  if (bgTextEl) {
    if (it) {
      bgTextEl.textContent = it.design?.bgSet ? getItemBgColor(it) : "-";
    } else {
      bgTextEl.textContent = draftBgSet ? draftBgColor : "-";
    }
  }

  updateSelectedInfoText();
  updateDraftInfo();
}

function applyCanvasSizeFromForm() {
  const profile = profileEl?.value || "OEM";
  const capType = capTypeEl?.value || "-";
  const size = getCanvasSize(profile, capType);

  if (canvas.width !== size.w || canvas.height !== size.h) {
    resizeCanvas(size.w, size.h);
  }

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

function applyLaserOptionFromForm() {
  syncCanvasMetaFromForm();
  redraw();
  updateActionLocks();
}

/* =========================================================
 * 현재 캔버스 상태 저장 / 로드
========================================================= */
function saveCanvasToItem(it) {
  it.design = it.design || {};
  it.design.imgDataUrl = userImg ? userImg.src : null;
  it.design.cx = imgCX;
  it.design.cy = imgCY;
  it.design.scaleX = imgScaleX;
  it.design.scaleY = imgScaleY;
  it.design.rot = imgRot;
  it.design.bgSet = !!draftBgSet;
  it.bgColor = draftBgColor || "#ffffff";
}

async function loadItemToCanvas(it) {
  userImg = null;
  imgCX = it.design?.cx ?? canvas.width / 2;
  imgCY = it.design?.cy ?? canvas.height / 2;
  imgScaleX = it.design?.scaleX ?? it.design?.scale ?? 1;
  imgScaleY = it.design?.scaleY ?? it.design?.scale ?? 1;
  imgRot = it.design?.rot ?? 0;

  draftBgColor = it.bgColor || "#ffffff";
  draftBgSet = !!it.design?.bgSet;

  if (it.design?.imgDataUrl) {
    const img = new Image();
    await new Promise((res, rej) => {
      img.onload = res;
      img.onerror = rej;
      img.src = it.design.imgDataUrl;
    });
    userImg = img;
  }

  if (fileNameEl) {
    fileNameEl.textContent = it.design?.imgDataUrl
      ? "저장된 이미지 불러옴"
      : "선택된 파일 없음";
  }

  updateSelectedInfoText();
  updateMaoGuide();
  redraw();
  updateDraftInfo();
  updateActionLocks();
}

function clearEditor() {
  userImg = null;
  imgCX = canvas.width / 2;
  imgCY = canvas.height / 2;
  imgScaleX = 1;
  imgScaleY = 1;
  imgRot = 0;

  draftBgColor = "#ffffff";
  draftBgSet = false;
  selectedItemId = null;

  if (fileNameEl) fileNameEl.textContent = "선택된 파일 없음";
  if (bgTextEl) bgTextEl.textContent = "-";
  setBgUI("#ffffff");

  updateSelectedInfoText();
  updateMaoGuide();
  redraw();
  updateDraftInfo();
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

  let bg = "#ffffff";

  if (it) {
    bg = getItemBgColor(it);
  } else {
    bg = draftBgColor || "#ffffff";
  }

  ctx.save();
  ctx.fillStyle = bg;
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
  const safeW = guide.safe.w;
  const safeH = guide.safe.h;

  const outerX = (canvas.width - outerW) / 2;
  const outerY = (canvas.height - outerH) / 2;

  const safeX = (canvas.width - safeW) / 2;
  const safeY = (canvas.height - safeH) / 2;

  ctx.save();

  ctx.strokeStyle = "rgba(217,45,32,0.95)";
  ctx.lineWidth = 2;
  ctx.setLineDash([]);
  roundRectPath(ctx, outerX, outerY, outerW, outerH, 18);
  ctx.stroke();

  ctx.strokeStyle = "rgba(253,176,34,0.95)";
  ctx.lineWidth = 2;
  ctx.setLineDash([8, 6]);
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

function getImageAxes() {
  const cos = Math.cos(imgRot);
  const sin = Math.sin(imgRot);

  return {
    ux: cos,
    uy: sin,
    vx: -sin,
    vy: cos,
  };
}

function getImageHalfSize() {
  if (!userImg) return null;

  return {
    halfW: (userImg.width * imgScaleX) / 2,
    halfH: (userImg.height * imgScaleY) / 2,
  };
}

function localToWorldPoint(x, y) {
  const axes = getImageAxes();
  return {
    x: imgCX + x * axes.ux + y * axes.vx,
    y: imgCY + x * axes.uy + y * axes.vy,
  };
}

function getImageAABB() {
  if (!userImg) return null;

  const size = getImageHalfSize();
  if (!size) return null;

  const corners = [
    localToWorldPoint(-size.halfW, -size.halfH),
    localToWorldPoint(size.halfW, -size.halfH),
    localToWorldPoint(size.halfW, size.halfH),
    localToWorldPoint(-size.halfW, size.halfH),
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
  if (!userImg) {
    bboxEl.style.display = "none";
    return;
  }

  const cr = canvas.getBoundingClientRect();
  const wr = canvasWrapEl.getBoundingClientRect();
  const sx = cr.width / canvas.width;
  const sy = cr.height / canvas.height;

  const offsetX = cr.left - wr.left;
  const offsetY = cr.top - wr.top;

  const w = userImg.width * imgScaleX;
  const h = userImg.height * imgScaleY;

  bboxEl.style.display = "block";
  bboxEl.style.left = `${offsetX + (imgCX - w / 2) * sx}px`;
  bboxEl.style.top = `${offsetY + (imgCY - h / 2) * sy}px`;
  bboxEl.style.width = `${w * sx}px`;
  bboxEl.style.height = `${h * sy}px`;
  bboxEl.style.transform = `rotate(${imgRot}rad)`;
}

function redraw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawBackground();
  drawImageTransformed();
  drawCenterGuide();
  drawGuide();
  updateBBox();
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

function startMoveDrag(e) {
  if (!userImg) return;
  if (handleDrag || rotateDrag) return;

  draggingMove = true;

  const p = screenToCanvasPoint(e);
  moveStart.x = p.x;
  moveStart.y = p.y;

  centerStart.x = imgCX;
  centerStart.y = imgCY;
}

function onMainPointerDown(e) {
  if (uiLocked) return;
  if (!userImg) return;
  if (e.pointerType === "mouse" && e.button !== 0) return;

  if (e.target.closest(".h")) return;
  if (e.target.id === "rotHandle") return;

  const p = screenToCanvasPoint(e);
  if (!isPointOnImage(p.x, p.y)) return;

  e.preventDefault();
  e.stopPropagation();

  (e.currentTarget || canvasWrapEl)?.setPointerCapture?.(e.pointerId);
  startMoveDrag(e);
}

canvasWrapEl?.addEventListener("pointerdown", onMainPointerDown, {
  capture: true,
});

bboxEl?.addEventListener("pointerdown", onMainPointerDown);

bboxEl?.querySelectorAll(".h").forEach((h) => {
  h.addEventListener("pointerdown", (e) => {
    if (uiLocked || !userImg) return;
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
    };
    activeResizePointerId = e.pointerId;
    syncAltPressed(e);
  });
});

rotHandleEl?.addEventListener("pointerdown", (e) => {
  if (uiLocked || !userImg) return;
  if (e.pointerType === "mouse" && e.button !== 0) return;

  e.preventDefault();
  e.stopPropagation();

  bboxEl?.setPointerCapture?.(e.pointerId);
  draggingMove = false;

  const p = screenToCanvasPoint(e);

  rotateDrag = {
    cx: imgCX,
    cy: imgCY,
    startRot: imgRot,
    startAngle: Math.atan2(p.y - imgCY, p.x - imgCX),
  };
});

document.addEventListener("keydown", (e) => {
  if (
    e.key === "Alt" ||
    e.code === "AltLeft" ||
    e.code === "AltRight" ||
    e.altKey
  ) {
    isAltResizePressed = true;
  }
});

window.addEventListener("keydown", (e) => {
  if (
    e.key === "Alt" ||
    e.code === "AltLeft" ||
    e.code === "AltRight" ||
    e.altKey
  ) {
    isAltResizePressed = true;
  }
});

document.addEventListener("keyup", (e) => {
  if (e.key === "Alt" || e.code === "AltLeft" || e.code === "AltRight") {
    isAltResizePressed = false;
  }
});

window.addEventListener("keyup", (e) => {
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
    syncAltPressed(e);
  }

  const p = screenToCanvasPoint(e);

  if (draggingMove) {
    imgCX = centerStart.x + (p.x - moveStart.x);
    imgCY = centerStart.y + (p.y - moveStart.y);
    redraw();
    return;
  }

  if (handleDrag) {
    const axes = getImageAxes();
    const isAlt = isAltPressed(e) || handleDrag.startedWithAlt;
    const minHalf = 10;

    let halfW = handleDrag.startHalfW;
    let halfH = handleDrag.startHalfH;

    if (isAlt) {
      // 중심 기준 확대/축소
      // "현재 포인터 절대 위치"가 아니라
      // "드래그 시작 지점 대비 이동량"으로 계산해야 자연스럽게 됨
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

      imgCX = handleDrag.startCX;
      imgCY = handleDrag.startCY;
    } else {
      // 일반 리사이즈
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

      imgCX =
        handleDrag.anchorX +
        axes.ux * (handleDrag.signX * halfW) +
        axes.vx * (handleDrag.signY * halfH);

      imgCY =
        handleDrag.anchorY +
        axes.uy * (handleDrag.signX * halfW) +
        axes.vy * (handleDrag.signY * halfH);
    }

    imgScaleX = clamp((halfW * 2) / userImg.width, 0.05, 10);
    imgScaleY = clamp((halfH * 2) / userImg.height, 0.05, 10);

    redraw();
    return;
  }

  if (rotateDrag) {
    const angle = Math.atan2(p.y - rotateDrag.cy, p.x - rotateDrag.cx);
    imgRot = rotateDrag.startRot + (angle - rotateDrag.startAngle);
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
    fitImageToCanvas(userImg);

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

    if (await applyConfirmedLockIfNeeded(true)) return;

    userImg = null;
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
