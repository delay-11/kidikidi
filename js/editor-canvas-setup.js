/* split from editor.js: 캔버스 크기/가이드/메인 draw 루프 */


/* =========================================================
 * 캔버스 크기 / 기본 표시 / MAO 가이드 / 상태 반영
========================================================= */
function getCanvasSize(profile, capType) {
  if (profile === "OEM") {
    return CANVAS_SIZE_MAP[capType] || { w: 330, h: 330 };
  }

  return CANVAS_SIZE_MAP[profile] || CANVAS_SIZE_MAP.STD;
}

/* =========================================================
 * 수정 이유:
 * canvas.width/height를 논리 크기(330 등) 그대로 쓰면 고밀도(레티나 등)
 * 화면에서 캔버스가 낮은 해상도로 확대되어 이미지/텍스트/손글씨 등이
 * 흐릿하고 계단현상처럼 보임. 실제 렌더링 해상도(backing store)는
 * devicePixelRatio만큼 키우고, 화면 표시 크기(CSS)와 그리기 좌표는
 * 그대로 논리 크기를 쓰도록 canvasLogicalW/H에 별도로 저장해서
 * 위치 계산 코드(이미지/텍스트 좌표, 저장값 등)는 전혀 건드리지 않음.
 *
 * 추가 수정 이유:
 * R1-6.25U(스페이스바)처럼 가로로 아주 긴 규격은 `canvas { max-width:100% }`
 * 때문에 화면(카드) 폭보다 넓으면 CSS로 강제 축소되는데, 기존에는
 * 세로 크기(style.height)를 논리 크기로 고정해둬서 가로만 줄어들며
 * 비율이 찌그러지고, backing store 해상도도 "줄어들기 전" 논리 크기
 * 기준이라 브라우저가 다시 리샘플링하면서 가이드선이 뭉개져 보였음.
 * aspect-ratio로 가로가 줄어들 때 세로도 같은 비율로 줄도록 하고,
 * 실제로 화면에 렌더링된 크기(축소된 뒤 크기)를 기준으로 backing store
 * 해상도를 잡아서 추가 리샘플링이 필요 없게 함. 창 크기가 바뀌어도
 * 다시 맞추도록 resize 리스너에서 재계산.
========================================================= */
function resizeCanvas(w, h) {
  canvasLogicalW = w;
  canvasLogicalH = h;

  canvas.style.width = `${w}px`;
  canvas.style.aspectRatio = `${w} / ${h}`;

  syncCanvasRenderResolution();

  canvasTextEl.textContent = `${w}×${h}`;
}

function syncCanvasRenderResolution() {
  const dpr = window.devicePixelRatio || 1;

  // style.width/aspect-ratio를 반영한 뒤, 실제로 화면에 렌더링되는
  // (max-width:100% 등으로 줄어들었을 수 있는) 크기를 측정
  const rect = canvas.getBoundingClientRect();
  const displayW = rect.width || canvasLogicalW;
  const displayH = rect.height || canvasLogicalH;

  canvas.width = Math.max(1, Math.round(displayW * dpr));
  canvas.height = Math.max(1, Math.round(displayH * dpr));

  // 그리기 코드는 계속 논리 좌표(0~canvasLogicalW, 0~canvasLogicalH)를
  // 쓰면 되도록, "화면 축소 비율 × dpr"을 합쳐서 컨텍스트를 스케일
  const scaleX = (displayW / canvasLogicalW) * dpr;
  const scaleY = (displayH / canvasLogicalH) * dpr;
  ctx.setTransform(scaleX, 0, 0, scaleY, 0, 0);
}

let canvasResyncRaf = null;
window.addEventListener("resize", () => {
  if (!canvasLogicalW || !canvasLogicalH) return;
  if (canvasResyncRaf) cancelAnimationFrame(canvasResyncRaf);
  // 리사이즈 중 매 프레임 재계산하지 않도록 다음 프레임에 한 번만 반영
  canvasResyncRaf = requestAnimationFrame(() => {
    syncCanvasRenderResolution();
    redraw();
    updateMaoGuide();
  });
});

function resizeCanvasKeepView(w, h) {
  const oldW = canvasLogicalW;
  const oldH = canvasLogicalH;

  const rx = oldW ? imgCX / oldW : 0.5;
  const ry = oldH ? imgCY / oldH : 0.5;

  syncActiveTextFromLegacy();
  const textRatios = (Array.isArray(textObjects) ? textObjects : []).map((obj) => ({
    obj,
    rx: oldW && Number.isFinite(obj?.cx) ? obj.cx / oldW : 0.5,
    ry: oldH && Number.isFinite(obj?.cy) ? obj.cy / oldH : 0.5,
  }));

  resizeCanvas(w, h);

  imgCX = canvasLogicalW * rx;
  imgCY = canvasLogicalH * ry;

  textRatios.forEach(({ obj, rx: tx, ry: ty }) => {
    if (!obj) return;
    obj.cx = clamp(canvasLogicalW * tx, 0, canvasLogicalW);
    obj.cy = clamp(canvasLogicalH * ty, 0, canvasLogicalH);
  });
  setActiveTextIndex(activeTextIndex);

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

/* =========================================================
 * 수정 이유: maoGuideWrap이 canvasWrapEl 전체(inset:0)를 기준으로
 * 꽉 채워졌는데, 모바일 반응형(767px 이하)에서는 canvasWrapEl 안의
 * 안내 문구(.canvasGuideOverlay)가 position:static + order:-1로 바뀌어
 * 캔버스 위에 실제 공간을 차지하는 요소가 되면서 canvasWrapEl 박스가
 * 캔버스보다 커지고 위쪽으로 밀림. 그 상태에서 가이드가 canvasWrapEl
 * 기준으로 꽉 차면 실제 캔버스와 어긋난 위치에 그려져서, 사용자가
 * 화면에 보이는 가이드에 맞춰 이미지를 배치해도 실제 저장되는 좌표는
 * 다르게 되는 문제가 있었음(모바일에서 만든 시안이 위로 밀려 보인다는
 * 문의와 일치). canvasWrapEl이 아니라 실제 <canvas> 요소의 화면상
 * 박스에 정확히 맞춰서 위치/크기를 지정한다.
========================================================= */
function positionMaoGuide(wrap) {
  if (!wrap || !canvas || !canvasWrapEl) return;

  const canvasRect = canvas.getBoundingClientRect();
  const wrapRect = canvasWrapEl.getBoundingClientRect();

  wrap.style.left = `${canvasRect.left - wrapRect.left}px`;
  wrap.style.top = `${canvasRect.top - wrapRect.top}px`;
  wrap.style.width = `${canvasRect.width}px`;
  wrap.style.height = `${canvasRect.height}px`;
  wrap.style.right = "auto";
  wrap.style.bottom = "auto";
}

function updateMaoGuide() {
  const wrap = ensureMaoGuide();
  if (!wrap) return;

  const isMao = profileEl?.value === "MAO";
  wrap.style.display = isMao ? "block" : "none";
  if (!isMao) return;

  positionMaoGuide(wrap);
}

/* =========================================================
 * 수정 이유:
 * updateMaoGuide()는 프로파일 변경 시점에 호출되는데, 그 시점에 아직
 * 에디터 화면(캔버스)이 CSS로 숨겨져 있으면(display:none) canvas의
 * getBoundingClientRect()가 0x0으로 잡혀서 가이드 위치/크기가 0으로
 * 저장되어버림. 이후 실제로 화면이 보여져도 다시 계산해주는 트리거가
 * 없으면 가이드가 안 보이거나 잘못된 위치에 남게 됨.
 * ResizeObserver로 캔버스/캔버스랩의 실제 렌더 크기가 바뀔 때마다
 * (숨김→표시 전환 포함) 자동으로 재계산하도록 해서, 호출 시점과
 * 무관하게 항상 실제 렌더링된 캔버스 위치를 따라가게 함.
========================================================= */
if (typeof ResizeObserver !== "undefined") {
  const maoGuideResizeObserver = new ResizeObserver(() => {
    if (profileEl?.value !== "MAO") return;
    const wrap = document.getElementById("maoGuideWrap");
    if (wrap) positionMaoGuide(wrap);
  });

  if (canvas) maoGuideResizeObserver.observe(canvas);
  if (canvasWrapEl) maoGuideResizeObserver.observe(canvasWrapEl);
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
  if (canvasLogicalW !== size.w || canvasLogicalH !== size.h) {
    resizeCanvas(size.w, size.h);
  }

  // 수정: 사이즈 텍스트는 무조건 갱신
  if (canvasTextEl) {
    canvasTextEl.textContent = `${size.w}×${size.h}`;
  }

  // 이미지 위치 보정
  if (!hasImageObject()) {
    imgCX = canvasLogicalW / 2;
    imgCY = canvasLogicalH / 2;
  } else {
    syncActiveImageFromLegacy();
    userImages.forEach((obj) => {
      obj.cx = clamp(obj.cx, 0, canvasLogicalW);
      obj.cy = clamp(obj.cy, 0, canvasLogicalH);
    });
    setActiveImageIndex(activeImageIndex);
  }

  // 텍스트 위치 보정
  if (!hasTextObject()) {
    textCX = canvasLogicalW / 2;
    textCY = canvasLogicalH / 2;
  } else {
    syncActiveTextFromLegacy();
    textObjects.forEach((obj) => {
      if (!obj) return;
      obj.cx = clamp(obj.cx, 0, canvasLogicalW);
      obj.cy = clamp(obj.cy, 0, canvasLogicalH);
    });
    setActiveTextIndex(activeTextIndex);
  }

  syncCanvasMetaFromForm();
  redraw();
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

  // 배경을 안 정했으면 빈 곳을 체크무늬로 (스티커처럼 "투명 = 비어 있음"을 보여줌).
  // 화면에만 보이고, 접수 이미지 · 썸네일은 따로 그려서 흰색으로 나감.
  // 레이저(흰색 고정) 시안은 옆면 인쇄가 없어서 예전처럼 흰색.
  if (typeof syncBgUnsetUI === "function") syncBgUnsetUI();
  if (!draftBgSet && !(typeof isLaserFixedBg === "function" && isLaserFixedBg())) {
    drawEmptyCanvasPattern(ctx, canvasLogicalW, canvasLogicalH);
    return;
  }

  ctx.save();
  ctx.fillStyle = createBackgroundFill(ctx, canvasLogicalW, canvasLogicalH, bgType, color1, color2, direction, position, softness);
  ctx.fillRect(0, 0, canvasLogicalW, canvasLogicalH);
  ctx.restore();
}

const EMPTY_CANVAS_CELL = 10;

function drawEmptyCanvasPattern(c, W, H) {
  c.save();
  c.fillStyle = "#ffffff";
  c.fillRect(0, 0, W, H);
  c.fillStyle = "#e9ebef";
  for (let y = 0; y < H; y += EMPTY_CANVAS_CELL) {
    for (let x = (y / EMPTY_CANVAS_CELL) % 2 ? EMPTY_CANVAS_CELL : 0; x < W; x += EMPTY_CANVAS_CELL * 2) {
      c.fillRect(x, y, EMPTY_CANVAS_CELL, EMPTY_CANVAS_CELL);
    }
  }
  c.restore();
}

/* 이미지만으로 캔버스가 꽉 덮였는지 (배경을 안 정했을 때 [시안 추가] 가능 여부)
 * - 이미지 레이어만 투명 캔버스에 그려 보고, 덜 덮인 칸이 거의 없으면 OK
 * - 투명 PNG의 투명한 부분은 비어 있는 것으로 봄 (실제로 흰색으로 찍힘)
 * - 이미지를 캔버스 크기에 딱 맞춘 경우 가장자리 반 픽셀 번짐은 무시 (바깥 1칸 제외) */
function isCanvasFullyCoveredByImages() {
  if (typeof hasImageObject !== "function" || !hasImageObject()) return false;
  if (typeof syncActiveImageFromLegacy === "function") syncActiveImageFromLegacy();

  const W = Math.max(1, Math.round(canvasLogicalW));
  const H = Math.max(1, Math.round(canvasLogicalH));
  const off = document.createElement("canvas");
  off.width = W;
  off.height = H;
  const c = off.getContext("2d", { willReadFrequently: true });
  if (!c) return true;

  userImages.forEach((obj) => {
    if (obj?.img) drawTransformedImageObject(c, obj.img, obj, W / 2, H / 2);
  });

  const data = c.getImageData(0, 0, W, H).data;
  let empty = 0;
  let total = 0;
  for (let y = 1; y < H - 1; y++) {
    for (let x = 1; x < W - 1; x++) {
      total++;
      if (data[(y * W + x) * 4 + 3] < 250) empty++;
    }
  }
  return total > 0 && empty / total < 0.002;
}

/* =========================================================
 * 중앙 맞춤 가이드 (스냅)
 * - 예전에는 캔버스 중앙 십자선이 항상 떠 있었는데, 포토샵처럼
 *   오브젝트를 끌 때만 중앙선을 보여주고, 오브젝트 중심이 캔버스 중앙
 *   근처(화면 기준 약 6px)에 오면 그 축으로 착 붙으면서 선이 강조된다.
 * - 가로/세로 따로 붙어서 한 축만 맞추는 것도 가능.
========================================================= */
const SNAP_THRESHOLD_SCREEN_PX = 6;
const snapGuideState = { active: false, x: false, y: false };

function getSnapThresholdLogical() {
  const rect = canvas?.getBoundingClientRect();
  if (!rect || !rect.width) return 4;
  return (SNAP_THRESHOLD_SCREEN_PX * canvasLogicalW) / rect.width;
}

// 끌고 있는 오브젝트의 새 중심을 받아서, 중앙 근처면 중앙으로 붙인 좌표를 돌려준다.
function applyCenterSnap(x, y) {
  const cx = canvasLogicalW / 2;
  const cy = canvasLogicalH / 2;
  const th = getSnapThresholdLogical();
  const snapX = Math.abs(x - cx) <= th;
  const snapY = Math.abs(y - cy) <= th;

  // 새로 붙는 순간 짧게 진동 (지원하는 안드로이드 기기만, iOS는 무시됨)
  if ((snapX && !snapGuideState.x) || (snapY && !snapGuideState.y)) {
    try {
      navigator.vibrate?.(8);
    } catch (e) {
      // 진동 미지원 무시
    }
  }

  snapGuideState.x = snapX;
  snapGuideState.y = snapY;
  return { x: snapX ? cx : x, y: snapY ? cy : y };
}

function setSnapGuideActive(active) {
  snapGuideState.active = !!active;
  if (!active) {
    snapGuideState.x = false;
    snapGuideState.y = false;
  }
}

// c: 논리 좌표로 스케일된 컨텍스트. 키캡 미리보기가 켜져 있으면 음영 위(오버레이)에 그린다.
function drawCenterGuide(c = ctx) {
  if (!snapGuideState.active) return;
  if (c === ctx && typeof isKeycapMockupOn === "function" && isKeycapMockupOn()) return;

  const cx = canvasLogicalW / 2;
  const cy = canvasLogicalH / 2;
  const snapColor = "#d444f1";

  const line = (x1, y1, x2, y2, snapped) => {
    c.save();
    c.strokeStyle = snapped ? snapColor : "rgba(17, 25, 40, 0.28)";
    c.lineWidth = snapped ? 1.5 : 1;
    c.setLineDash(snapped ? [] : [6, 6]);
    c.beginPath();
    c.moveTo(x1, y1);
    c.lineTo(x2, y2);
    c.stroke();
    c.restore();
  };

  line(cx, 0, cx, canvasLogicalH, snapGuideState.x);
  line(0, cy, canvasLogicalW, cy, snapGuideState.y);

  if (snapGuideState.x && snapGuideState.y) {
    c.save();
    c.fillStyle = snapColor;
    c.beginPath();
    c.arc(cx, cy, 3, 0, Math.PI * 2);
    c.fill();
    c.restore();
  }
}

function drawGuide() {
  const profile = profileEl.value;

  if (profile === "MAO") return;
  // 키캡 미리보기(목업)가 켜져 있으면 가이드는 오버레이 캔버스가 음영 + 안전선으로 그린다.
  if (typeof isKeycapMockupOn === "function" && isKeycapMockupOn()) return;

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

  const outerX = (canvasLogicalW - outerW) / 2;
  const outerY = (canvasLogicalH - outerH) / 2;

  const innerX = (canvasLogicalW - innerW) / 2;
  const innerY = (canvasLogicalH - innerH) / 2;

  const safeX = (canvasLogicalW - safeW) / 2;
  const safeY = (canvasLogicalH - safeH) / 2;

  ctx.save();

  ctx.strokeStyle = "#d2d2d2";
  ctx.lineWidth = 0.8;
  ctx.setLineDash([]);
  const radius = guide.radius || {};
  roundRectPath(ctx, outerX, outerY, outerW, outerH, radius.outer ?? 18);
  ctx.stroke();

  ctx.strokeStyle = "#b8b8b8";
  ctx.lineWidth = 0.8;
  ctx.setLineDash([]);
  roundRectPath(ctx, innerX, innerY, innerW, innerH, radius.inner ?? 16);
  ctx.stroke();

  ctx.strokeStyle = "#d92d20";
  ctx.lineWidth = 2;
  ctx.setLineDash([8, 8]);
  roundRectPath(ctx, safeX, safeY, safeW, safeH, radius.safe ?? 14);
  ctx.stroke();

  ctx.restore();
}

// 이미지/텍스트를 레이어 순서(z)대로 섞어서 그린다.
function drawObjectsInLayerOrder() {
  getLayerEntries().forEach((entry) => {
    if (entry.kind === "image") {
      drawTransformedImageObject(ctx, entry.obj.img, entry.obj, canvasLogicalW / 2, canvasLogicalH / 2);
    } else {
      drawTextObjectToContext(ctx, canvasLogicalW, canvasLogicalH, entry.obj);
    }
  });
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
  // 잠긴 레이어는 선택돼 있어도 이동/크기/회전 핸들을 보여주지 않는다.
  if (!type || isActiveObjectLocked()) {
    bboxEl.style.display = "none";
    return;
  }

  const cr = canvas.getBoundingClientRect();
  const wr = canvasWrapEl.getBoundingClientRect();
  const sx = cr.width / canvasLogicalW;
  const sy = cr.height / canvasLogicalH;

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

  const rot = getObjectRot(type);

  bboxEl.style.display = "block";
  bboxEl.style.left = `${offsetX + (center.x - w / 2) * sx}px`;
  bboxEl.style.top = `${offsetY + (center.y - h / 2) * sy}px`;
  bboxEl.style.width = `${w * sx}px`;
  bboxEl.style.height = `${h * sy}px`;
  bboxEl.style.transform = `rotate(${rot}rad)`;

  // 선택 박스는 오브젝트와 같이 회전하되, 회전/삭제 버튼 아이콘은 항상 똑바로 보이게 보정합니다.
  if (bboxActionGroupEl) placeBBoxActionGroup(offsetX, offsetY, cr, center, w * sx, h * sy, sx, sy, rot);
}

/* 회전/삭제 버튼 위치
 * 기본은 선택 박스 위쪽(48px 위). 그런데 이미지가 캔버스 위쪽 끝까지 오면 버튼이 캔버스 밖으로
 * 나가서 캔버스 위 안내 문구와 겹쳐 가려졌음 → 버튼 묶음이 항상 캔버스 안에 있도록 화면 기준으로
 * 위치를 잡아 가둔다(남는 공간이 있으면 원래처럼 박스 위, 없으면 캔버스 안쪽 끝).
 * 버튼은 박스(회전됨) 안의 요소라, 화면 좌표 → 박스 기준 좌표로 되돌려서 넣는다. */
const BBOX_ACTION_GAP = 48;
const BBOX_ACTION_EDGE = 6;

function placeBBoxActionGroup(offsetX, offsetY, cr, center, boxW, boxH, sx, sy, rot) {
  const g = bboxActionGroupEl;
  const gw = g.offsetWidth || 0;
  const gh = g.offsetHeight || 0;
  const cos = Math.cos(rot);
  const sin = Math.sin(rot);

  // 박스 가운데 (canvasWrap 기준 화면 px)
  const cx = offsetX + center.x * sx;
  const cy = offsetY + center.y * sy;

  // 원래 자리: 박스 위쪽 가운데에서 위로 BBOX_ACTION_GAP (박스와 같이 회전)
  const dy0 = -boxH / 2 - BBOX_ACTION_GAP + gh / 2;
  let dx = -sin * dy0;
  let dy = cos * dy0;

  // 캔버스 안으로 가두기
  const minX = offsetX + gw / 2 + BBOX_ACTION_EDGE;
  const maxX = offsetX + cr.width - gw / 2 - BBOX_ACTION_EDGE;
  const minY = offsetY + gh / 2 + BBOX_ACTION_EDGE;
  const maxY = offsetY + cr.height - gh / 2 - BBOX_ACTION_EDGE;
  const px = Math.min(Math.max(cx + dx, minX), Math.max(minX, maxX));
  const py = Math.min(Math.max(cy + dy, minY), Math.max(minY, maxY));
  dx = px - cx;
  dy = py - cy;

  // 화면 기준 → 박스(회전 전) 기준
  const lx = cos * dx + sin * dy;
  const ly = -sin * dx + cos * dy;

  g.style.left = `${boxW / 2 + lx}px`;
  g.style.top = `${boxH / 2 + ly}px`;
  g.style.transform = `translate(-50%, -50%) rotate(${-rot}rad)`;
}

function redraw() {
  ctx.clearRect(0, 0, canvasLogicalW, canvasLogicalH);
  drawBackground();
  drawObjectsInLayerOrder();
  drawCenterGuide();
  drawGuide();
  if (typeof drawKeycapMockup === "function") drawKeycapMockup();
  // 레이어 패널이 오브젝트 1개일 때 잠금을 자동으로 풀어주므로 선택 박스보다 먼저 갱신
  renderLayerPanel();
  updateBBox();
  // 이미지 크기·위치 숫자 칸도 캔버스와 같이 갱신 (손으로 늘려도 숫자가 따라감)
  if (typeof syncImageSizePanel === "function") syncImageSizePanel();
  if (typeof scheduleDraftSave === "function") scheduleDraftSave();
}
