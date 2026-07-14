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

  ctx.save();
  ctx.fillStyle = createBackgroundFill(ctx, canvasLogicalW, canvasLogicalH, bgType, color1, color2, direction, position, softness);
  ctx.fillRect(0, 0, canvasLogicalW, canvasLogicalH);
  ctx.restore();
}

function drawCenterGuide() {
  const cx = canvasLogicalW / 2;
  const cy = canvasLogicalH / 2;

  ctx.save();
  ctx.strokeStyle = "rgba(17, 25, 40, 0.18)";
  ctx.lineWidth = 1;
  ctx.setLineDash([6, 6]);

  ctx.beginPath();
  ctx.moveTo(cx, 0);
  ctx.lineTo(cx, canvasLogicalH);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(0, cy);
  ctx.lineTo(canvasLogicalW, cy);
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
    drawTransformedImageObject(ctx, obj.img, obj, canvasLogicalW / 2, canvasLogicalH / 2);
  });
}

function drawTextTransformed() {
  if (!hasTextObject()) return;
  syncActiveTextFromLegacy();

  textObjects.forEach((obj) => {
    if (!obj) return;
    drawTextObjectToContext(ctx, canvasLogicalW, canvasLogicalH, obj);
  });
}

// 미사용 확인 (2026-07-09) - 호출부 없음, 필요시 복원
// function getImageAABB() {
//   const type = getActiveObjectType();
//   if (!type) return null;
//
//   const size = getObjectHalfSize(type);
//   if (!size) return null;
//
//   const corners = [
//     objectLocalToWorldPoint(type, -size.halfW, -size.halfH),
//     objectLocalToWorldPoint(type, size.halfW, -size.halfH),
//     objectLocalToWorldPoint(type, size.halfW, size.halfH),
//     objectLocalToWorldPoint(type, -size.halfW, size.halfH),
//   ];
//
//   let minX = Infinity;
//   let minY = Infinity;
//   let maxX = -Infinity;
//   let maxY = -Infinity;
//
//   for (const p of corners) {
//     minX = Math.min(minX, p.x);
//     minY = Math.min(minY, p.y);
//     maxX = Math.max(maxX, p.x);
//     maxY = Math.max(maxY, p.y);
//   }
//
//   return { minX, minY, maxX, maxY, w: maxX - minX, h: maxY - minY };
// }

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
  if (bboxActionGroupEl) {
    bboxActionGroupEl.style.transform = `translateX(-50%) rotate(${-rot}rad)`;
  }
}

function redraw() {
  ctx.clearRect(0, 0, canvasLogicalW, canvasLogicalH);
  drawBackground();
  drawImageTransformed();
  drawTextTransformed();
  drawCenterGuide();
  drawGuide();
  updateBBox();
}
