/* =========================================================
 * UV DTF 스티커 시안 - 제작 화면 (캔버스 편집)
========================================================= */
const stickerCanvas = byId("stickerCanvas");
const stickerCtx = stickerCanvas?.getContext("2d");
const canvasWrapEl = byId("canvasWrap");
const paperTextEl = byId("paperText");

const selEmptyTextEl = byId("selEmptyText");
const selBodyEl = byId("selBody");
const selWEl = byId("selW");
const selHEl = byId("selH");
const selXEl = byId("selX");
const selYEl = byId("selY");
const selRotEl = byId("selRot");
const selLockRatioEl = byId("selLockRatio");
const selDpiWarnEl = byId("selDpiWarn");
const selDupBtn = byId("selDupBtn");
const selDelBtn = byId("selDelBtn");

const toolTabEls = Array.from(document.querySelectorAll("[data-tool-target]"));
const toolPanelEls = Array.from(document.querySelectorAll(".stkToolPanel"));

const addSizeCmEl = byId("addSizeCm");
const fileEl = byId("file");
const fileBtn = byId("fileBtn");
const libraryGridEl = byId("libraryGrid");

const textInputEl = byId("textInput");
const textFontRowEl = byId("textFontRow");
const textHeightCmEl = byId("textHeightCm");
const textColorEl = byId("textColor");
const textAddBtn = byId("textAddBtn");

const fillWEl = byId("fillW");
const fillHEl = byId("fillH");
const fillGapEl = byId("fillGap");
const fillInfoEl = byId("fillInfo");
const fillBtn = byId("fillBtn");

const paperQuickBtn = byId("paperQuickBtn");
const paperModalEl = byId("paperModal");
const paperModalOptionsEl = byId("paperModalOptions");
const paperModalCancelEl = byId("paperModalCancel");
const paperModalApplyEl = byId("paperModalApply");

// 화면 표시 배율 (CSS px / mm) - 캔버스 실제 해상도는 devicePixelRatio를 곱해서 사용
let editorPxPerMm = 1;
let textFontId = STICKER_TEXT_FONTS[0].id;

/* =========================================================
 * 캔버스 크기 / 다시 그리기
========================================================= */
function resizeEditorCanvas() {
  if (!stickerCanvas || !canvasWrapEl) return;

  const paper = getPaper();
  const wrapW = canvasWrapEl.clientWidth;
  if (!wrapW) return;

  const maxH = Math.max(320, Math.min(window.innerHeight * 0.74, 980));
  editorPxPerMm = Math.min(wrapW / paper.w, maxH / paper.h);

  const cssW = Math.floor(paper.w * editorPxPerMm);
  const cssH = Math.floor(paper.h * editorPxPerMm);
  const dpr = Math.min(window.devicePixelRatio || 1, 3);

  stickerCanvas.style.width = `${cssW}px`;
  stickerCanvas.style.height = `${cssH}px`;
  stickerCanvas.width = Math.round(cssW * dpr);
  stickerCanvas.height = Math.round(cssH * dpr);

  redrawEditor();
}

function redrawEditor() {
  if (!stickerCtx || !stickerCanvas.width) return;

  const dpr = stickerCanvas.width / (parseFloat(stickerCanvas.style.width) || stickerCanvas.width);
  stickerCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

  renderStickerSheet(stickerCtx, editorPxPerMm, {
    checker: true,
    guides: true,
    guideLabel: true,
    highlightOutOfSafe: true,
    selection: !stickerState.locked,
  });
}

function refreshEditor() {
  syncEditorControls();
  syncSelectionPanel();
  updateStepButtons();
}

/* =========================================================
 * 스티커 추가
========================================================= */
function getAddWidthMm() {
  const cm = parseFloat(addSizeCmEl?.value);
  return Number.isFinite(cm) && cm > 0 ? cm * 10 : STICKER_DEFAULT_SIZE_MM;
}

// 안전선 안에서 기존 스티커와 겹치지 않는 첫 위치 (위→아래, 왼→오른쪽)
function findFreeSpot(w, h, gap = 2) {
  const safe = getSafeRect();
  const boxes = stickerState.objects.map(getObjectBounds);
  const step = 2;

  for (let y = safe.y; y + h <= safe.y + safe.h + 0.001; y += step) {
    for (let x = safe.x; x + w <= safe.x + safe.w + 0.001; x += step) {
      const hit = boxes.some(
        (b) => x < b.maxX + gap && x + w + gap > b.minX && y < b.maxY + gap && y + h + gap > b.minY,
      );
      if (!hit) return { cx: x + w / 2, cy: y + h / 2 };
    }
  }

  return { cx: safe.x + safe.w / 2, cy: safe.y + safe.h / 2 };
}

function canAddObjects(count = 1) {
  if (stickerState.objects.length + count > STICKER_MAX_OBJECTS) {
    showToast(`스티커는 용지 1장에 최대 ${STICKER_MAX_OBJECTS}개까지 배치할 수 있어요.`, "warn", 2600);
    return false;
  }
  return true;
}

function addObjectFromSource(src, widthMm) {
  if (!src?.img || !canAddObjects(1)) return null;

  const safe = getSafeRect();
  const ratio = src.pxH / src.pxW;
  let w = Math.max(STICKER_MIN_SIZE_MM, widthMm);
  let h = w * ratio;

  // 안전선보다 크면 안전선 안에 들어오도록 줄임
  const fit = Math.min(1, safe.w / w, safe.h / h);
  w *= fit;
  h *= fit;

  const spot = findFreeSpot(w, h);
  const obj = { id: nextStickerId(), sourceId: src.id, cx: spot.cx, cy: spot.cy, w, h, rot: 0 };

  stickerState.objects.push(obj);
  stickerState.selectedId = obj.id;

  if (fit < 1) showToast("안전선보다 커서 안쪽에 맞게 크기를 줄였어요.", "info", 2200);

  refreshEditor();
  return obj;
}

/* =========================================================
 * 이미지 업로드
========================================================= */
function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("이미지를 불러오지 못했습니다."));
    img.src = src;
  });
}

async function handleUploadFiles(files) {
  const list = Array.from(files || []);
  if (!list.length) return;

  for (const file of list) {
    if (!/^image\/(png|jpeg|webp)$/.test(file.type)) {
      showToast(`${file.name}: PNG / JPG / WEBP 파일만 올릴 수 있어요.`, "warn", 2600);
      continue;
    }

    if (file.size > STICKER_MAX_UPLOAD_BYTES) {
      showToast(`${file.name}: 20MB 이하 파일만 올릴 수 있어요.`, "warn", 2600);
      continue;
    }

    try {
      const url = URL.createObjectURL(file);
      const img = await loadImage(url);
      const src = {
        id: nextStickerId("src"),
        kind: "upload",
        name: file.name,
        file,
        img,
        pxW: img.naturalWidth,
        pxH: img.naturalHeight,
      };
      stickerState.sources.set(src.id, src);
      addObjectFromSource(src, getAddWidthMm());
    } catch (err) {
      console.error(err);
      showToast(`${file.name}: 이미지를 불러오지 못했어요.`, "error", 2600);
    }
  }
}

/* =========================================================
 * 기본 스티커 (메뉴에서 눌러서 추가)
========================================================= */
function renderLibrary() {
  if (!libraryGridEl) return;

  libraryGridEl.innerHTML = STICKER_LIBRARY.map(
    (item) => `
      <button class="stkLibraryItem" data-library-id="${escapeHtml(item.id)}" type="button" title="${escapeHtml(item.name)}">
        <img alt="" src="${escapeHtml(item.src)}" loading="lazy" />
        <span>${escapeHtml(item.name)}</span>
      </button>
    `,
  ).join("");
}

async function getLibrarySource(item) {
  const id = `lib_${item.id}`;
  const cached = stickerState.sources.get(id);
  if (cached) return cached;

  const img = await loadImage(item.src);
  const src = {
    id,
    kind: "library",
    name: item.name,
    file: null,
    img,
    pxW: img.naturalWidth || 400,
    pxH: img.naturalHeight || 400,
  };
  stickerState.sources.set(id, src);
  return src;
}

async function addLibrarySticker(libraryId) {
  const item = STICKER_LIBRARY.find((x) => x.id === libraryId);
  if (!item) return;

  try {
    const src = await getLibrarySource(item);
    const widthMm = item.sizeMm || getAddWidthMm();
    addObjectFromSource(src, widthMm);
  } catch (err) {
    console.error(err);
    showToast("기본 스티커를 불러오지 못했어요.", "error");
  }
}

/* =========================================================
 * 텍스트 (고해상도 이미지로 만들어서 스티커처럼 배치)
========================================================= */
function renderTextFontButtons() {
  if (!textFontRowEl) return;

  textFontRowEl.innerHTML = STICKER_TEXT_FONTS.map(
    (font) => `
      <button class="stkFontBtn${font.id === textFontId ? " is-active" : ""}" data-font-id="${font.id}"
        style="font-family:'${font.family}';font-weight:${font.weight};" type="button">Aa ${escapeHtml(font.label)}</button>
    `,
  ).join("");
}

async function addTextSticker() {
  const value = safeTrim(textInputEl?.value);
  if (!value) {
    showToast("텍스트를 입력해주세요.", "warn");
    return;
  }
  if (!canAddObjects(1)) return;

  const font = STICKER_TEXT_FONTS.find((f) => f.id === textFontId) || STICKER_TEXT_FONTS[0];
  const color = textColorEl?.value || "#111827";
  const fontPx = 200;
  const fontCss = `${font.weight} ${fontPx}px "${font.family}", Pretendard, sans-serif`;

  try {
    await document.fonts?.load?.(fontCss, value);
  } catch {
    // 폰트 로딩 실패 시 대체 폰트로 그림
  }

  const lines = value.split(/\r?\n/).filter((line, i, arr) => line || arr.length === 1);
  const measure = document.createElement("canvas").getContext("2d");
  measure.font = fontCss;
  const lineH = fontPx * 1.25;
  const pad = Math.round(fontPx * 0.2);
  const textW = Math.max(...lines.map((line) => measure.measureText(line).width), 1);

  const c = document.createElement("canvas");
  c.width = Math.ceil(textW + pad * 2);
  c.height = Math.ceil(lineH * lines.length + pad * 2);
  const tctx = c.getContext("2d");
  tctx.font = fontCss;
  tctx.fillStyle = color;
  tctx.textAlign = "center";
  tctx.textBaseline = "middle";
  lines.forEach((line, i) => {
    tctx.fillText(line, c.width / 2, pad + lineH * i + lineH / 2);
  });

  const src = {
    id: nextStickerId("src"),
    kind: "text",
    name: `텍스트 "${value.replace(/\s+/g, " ").slice(0, 20)}"`,
    file: null,
    img: c,
    pxW: c.width,
    pxH: c.height,
  };
  stickerState.sources.set(src.id, src);

  const heightCm = parseFloat(textHeightCmEl?.value);
  const lineMm = (Number.isFinite(heightCm) && heightCm > 0 ? heightCm : 1.5) * 10;
  const widthMm = (c.width / fontPx) * lineMm;
  addObjectFromSource(src, widthMm);
}

/* =========================================================
 * 꽉 채우기 - 선택한 스티커를 같은 크기로 안전선 안에 바둑판 배치
========================================================= */
function getFillLayout() {
  const obj = getSelectedObject();
  if (!obj) return null;

  const src = stickerState.sources.get(obj.sourceId);
  const ratio = src ? src.pxH / src.pxW : obj.h / obj.w;
  const wCm = parseFloat(fillWEl?.value);
  const gapCm = parseFloat(fillGapEl?.value);
  const w = Number.isFinite(wCm) && wCm > 0 ? wCm * 10 : obj.w;
  const h = w * ratio;
  const gap = Number.isFinite(gapCm) && gapCm >= 0 ? gapCm * 10 : STICKER_DEFAULT_GAP_MM;
  const safe = getSafeRect();

  const cols = Math.floor((safe.w + gap + 0.001) / (w + gap));
  const rows = Math.floor((safe.h + gap + 0.001) / (h + gap));

  return { obj, w, h, gap, cols, rows, count: cols * rows, safe };
}

function syncFillPanel() {
  const obj = getSelectedObject();
  const enabled = !!obj && !stickerState.locked;

  if (fillBtn) fillBtn.disabled = !enabled;
  if (fillWEl) fillWEl.disabled = !enabled;
  if (fillGapEl) fillGapEl.disabled = !enabled;

  if (!obj) {
    if (fillHEl) fillHEl.value = "";
    if (fillInfoEl) fillInfoEl.textContent = "먼저 캔버스에서 채울 스티커를 선택해 주세요.";
    return;
  }

  if (fillWEl && document.activeElement !== fillWEl && fillWEl.dataset.objId !== obj.id) {
    fillWEl.value = mmToCmText(obj.w);
    fillWEl.dataset.objId = obj.id;
  }

  const layout = getFillLayout();
  if (fillHEl) fillHEl.value = mmToCmText(layout.h);

  if (!fillInfoEl) return;
  if (!layout.count) {
    fillInfoEl.textContent = "스티커가 안전선보다 커서 채울 수 없어요. 크기를 줄여주세요.";
    if (fillBtn) fillBtn.disabled = true;
  } else {
    fillInfoEl.innerHTML = `가로 <b>${layout.cols}개</b> × 세로 <b>${layout.rows}개</b> = 총 <b>${layout.count}개</b> 배치`;
    if (layout.count > STICKER_MAX_OBJECTS && fillBtn) fillBtn.disabled = true;
  }
}

function fillSafeArea() {
  if (stickerState.locked) return;

  const layout = getFillLayout();
  if (!layout?.count) return;

  if (layout.count > STICKER_MAX_OBJECTS) {
    showToast(`한 번에 최대 ${STICKER_MAX_OBJECTS}개까지 채울 수 있어요. 크기를 키워주세요.`, "warn", 2600);
    return;
  }

  const others = stickerState.objects.filter((o) => o.id !== layout.obj.id).length;
  if (others) {
    askConfirm(`기존에 배치한 스티커 ${others}개가 지워지고 선택한 스티커로 채워집니다. 계속할까요?`, "꽉 채우기").then(
      (ok) => ok && applyFillLayout(layout),
    );
    return;
  }

  applyFillLayout(layout);
}

function applyFillLayout(layout) {

  const { w, h, gap, cols, rows, safe } = layout;
  const gridW = cols * w + (cols - 1) * gap;
  const gridH = rows * h + (rows - 1) * gap;
  const startX = safe.x + (safe.w - gridW) / 2;
  const startY = safe.y + (safe.h - gridH) / 2;
  const sourceId = layout.obj.sourceId;

  const next = [];
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      next.push({
        id: nextStickerId(),
        sourceId,
        cx: startX + c * (w + gap) + w / 2,
        cy: startY + r * (h + gap) + h / 2,
        w,
        h,
        rot: 0,
      });
    }
  }

  stickerState.objects = next;
  stickerState.selectedId = null;
  pruneUnusedSources();
  refreshEditor();
  showToast(`안전선 안에 ${next.length}개를 꽉 채웠어요.`, "ok", 2200);
}

/* =========================================================
 * 확인 질문 모달 (window.confirm은 일부 환경에서 표시되지 않아 직접 구현)
========================================================= */
const askModalEl = byId("askModal");
let askResolve = null;

function askConfirm(message, title = "확인") {
  if (!askModalEl) return Promise.resolve(true);

  byId("askModalTitle").textContent = title;
  byId("askModalText").textContent = message;
  askModalEl.classList.add("is-open");
  askModalEl.setAttribute("aria-hidden", "false");

  return new Promise((resolve) => {
    askResolve = resolve;
  });
}

function closeAskModal(result) {
  askModalEl?.classList.remove("is-open");
  askModalEl?.setAttribute("aria-hidden", "true");
  askResolve?.(result);
  askResolve = null;
}

/* =========================================================
 * 선택 / 복제 / 삭제
========================================================= */
function selectObject(id) {
  stickerState.selectedId = id;
  if (fillWEl) delete fillWEl.dataset.objId;
  refreshEditor();
}

function pruneUnusedSources() {
  const used = new Set(stickerState.objects.map((o) => o.sourceId));
  stickerState.sources.forEach((src, id) => {
    if (used.has(id) || src.kind === "library") return;
    if (src.img instanceof HTMLImageElement && src.img.src.startsWith("blob:")) {
      URL.revokeObjectURL(src.img.src);
    }
    stickerState.sources.delete(id);
  });
}

function deleteSelected() {
  const obj = getSelectedObject();
  if (!obj || stickerState.locked) return;

  stickerState.objects = stickerState.objects.filter((o) => o.id !== obj.id);
  stickerState.selectedId = null;
  pruneUnusedSources();
  refreshEditor();
}

function duplicateSelected() {
  const obj = getSelectedObject();
  if (!obj || stickerState.locked || !canAddObjects(1)) return;

  const copy = { ...obj, id: nextStickerId() };
  const rotated = Math.abs(Math.sin(copy.rot || 0)) > 0.01 || Math.abs(Math.cos(copy.rot || 0) - 1) > 0.01;

  if (rotated) {
    copy.cx += 5;
    copy.cy += 5;
  } else {
    const spot = findFreeSpot(copy.w, copy.h);
    copy.cx = spot.cx;
    copy.cy = spot.cy;
  }
  nudgeObjectIntoSafe(copy);

  stickerState.objects.push(copy);
  selectObject(copy.id);
}

/* =========================================================
 * 선택한 스티커 크기 / 위치 패널 (cm)
========================================================= */
function normalizeDeg(rad) {
  let deg = Math.round(((rad || 0) * 180) / Math.PI) % 360;
  if (deg > 180) deg -= 360;
  if (deg <= -180) deg += 360;
  return deg;
}

function setFieldValue(el, value) {
  if (!el || document.activeElement === el) return;
  el.value = value;
}

function syncSelectionPanel() {
  const obj = getSelectedObject();

  if (selBodyEl) selBodyEl.hidden = !obj;
  if (selEmptyTextEl) selEmptyTextEl.hidden = !!obj;
  if (!obj) return;

  setFieldValue(selWEl, mmToCmText(obj.w));
  setFieldValue(selHEl, mmToCmText(obj.h));
  setFieldValue(selXEl, mmToCmText(obj.cx - obj.w / 2));
  setFieldValue(selYEl, mmToCmText(obj.cy - obj.h / 2));
  setFieldValue(selRotEl, String(normalizeDeg(obj.rot)));

  const src = stickerState.sources.get(obj.sourceId);
  const dpi = src?.kind === "upload" ? Math.round(src.pxW / (obj.w / 25.4)) : null;
  if (selDpiWarnEl) {
    const low = dpi !== null && dpi < STICKER_LOW_DPI;
    selDpiWarnEl.hidden = !low;
    selDpiWarnEl.textContent = low
      ? `이미지 해상도에 비해 크게 배치되어 인쇄 시 흐리게 보일 수 있어요. (약 ${dpi}dpi, ${STICKER_LOW_DPI}dpi 이상 권장)`
      : "";
  }
}

function readCmInput(el) {
  const v = parseFloat(el?.value);
  return Number.isFinite(v) ? v * 10 : null;
}

function applySelectionInput(field) {
  const obj = getSelectedObject();
  if (!obj || stickerState.locked) return;

  const lock = !!selLockRatioEl?.checked;
  const ratio = obj.h / obj.w;

  if (field === "w" || field === "h") {
    const v = readCmInput(field === "w" ? selWEl : selHEl);
    if (v === null || v < STICKER_MIN_SIZE_MM / 2) return;

    if (field === "w") {
      obj.w = v;
      if (lock) obj.h = v * ratio;
    } else {
      obj.h = v;
      if (lock) obj.w = v / ratio;
    }
  }

  if (field === "x" || field === "y") {
    const v = readCmInput(field === "x" ? selXEl : selYEl);
    if (v === null) return;
    if (field === "x") obj.cx = v + obj.w / 2;
    else obj.cy = v + obj.h / 2;
  }

  if (field === "rot") {
    const deg = parseFloat(selRotEl?.value);
    if (!Number.isFinite(deg)) return;
    obj.rot = (deg * Math.PI) / 180;
  }

  if (fillWEl) delete fillWEl.dataset.objId;
  refreshEditor();
}

/* =========================================================
 * 캔버스 포인터 조작 (이동 / 크기 / 회전 / 삭제 / 두 손가락 확대)
========================================================= */
const activePointers = new Map();
let dragState = null;

function eventToMm(e) {
  const rect = stickerCanvas.getBoundingClientRect();
  return {
    x: (e.clientX - rect.left) / editorPxPerMm,
    y: (e.clientY - rect.top) / editorPxPerMm,
  };
}

function hitHandle(obj, p) {
  const local = toObjectLocal(obj, p.x, p.y);
  const handles = getHandleLocalPositions(obj, editorPxPerMm);
  const isTouch = dragState?.pointerType === "touch";
  const tol = (isTouch ? 20 : 12) / editorPxPerMm;

  const near = (h) => Math.hypot(local.x - h.x, local.y - h.y) <= tol;

  if (near(handles.del)) return "del";
  if (near(handles.rot)) return "rot";
  return ["nw", "ne", "se", "sw"].find((key) => near(handles[key])) || null;
}

function hitObject(p) {
  for (let i = stickerState.objects.length - 1; i >= 0; i -= 1) {
    if (isPointInObject(stickerState.objects[i], p.x, p.y)) return stickerState.objects[i];
  }
  return null;
}

function startPinch() {
  const obj = getSelectedObject();
  const pts = Array.from(activePointers.values());
  if (!obj || pts.length < 2) return;

  dragState = {
    mode: "pinch",
    obj,
    startDist: Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y) || 1,
    startAngle: Math.atan2(pts[1].y - pts[0].y, pts[1].x - pts[0].x),
    startW: obj.w,
    startH: obj.h,
    startRot: obj.rot || 0,
  };
}

function onCanvasPointerDown(e) {
  if (stickerState.locked || currentStep !== "editor") return;

  const p = eventToMm(e);
  activePointers.set(e.pointerId, p);
  stickerCanvas.setPointerCapture?.(e.pointerId);
  e.preventDefault();

  if (activePointers.size >= 2) {
    startPinch();
    return;
  }

  dragState = { pointerType: e.pointerType };
  const selected = getSelectedObject();
  const handle = selected ? hitHandle(selected, p) : null;

  if (handle === "del") {
    dragState = null;
    deleteSelected();
    return;
  }

  if (handle === "rot") {
    dragState = {
      mode: "rotate",
      obj: selected,
      startAngle: Math.atan2(p.y - selected.cy, p.x - selected.cx),
      startRot: selected.rot || 0,
    };
    return;
  }

  if (handle) {
    const local = toObjectLocal(selected, p.x, p.y);
    dragState = {
      mode: "resize",
      obj: selected,
      startDist: Math.hypot(local.x, local.y) || 1,
      startW: selected.w,
      startH: selected.h,
    };
    return;
  }

  const target = hitObject(p);
  if (!target) {
    dragState = null;
    if (stickerState.selectedId) selectObject(null);
    return;
  }

  if (target.id !== stickerState.selectedId) selectObject(target.id);
  dragState = { mode: "move", obj: target, start: p, startCx: target.cx, startCy: target.cy };
}

function snapAngle(rad) {
  const step = Math.PI / 2;
  const nearest = Math.round(rad / step) * step;
  return Math.abs(rad - nearest) < (5 * Math.PI) / 180 ? nearest : rad;
}

function resizeAroundCenter(obj, scale, startW, startH) {
  const minScale = STICKER_MIN_SIZE_MM / Math.min(startW, startH);
  const s = Math.max(scale, minScale);
  obj.w = startW * s;
  obj.h = startH * s;
}

function onCanvasPointerMove(e) {
  if (!activePointers.has(e.pointerId)) return;

  const p = eventToMm(e);
  activePointers.set(e.pointerId, p);
  if (!dragState?.obj) return;
  e.preventDefault();

  const { obj } = dragState;

  if (dragState.mode === "pinch") {
    const pts = Array.from(activePointers.values());
    if (pts.length < 2) return;
    const dist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
    const angle = Math.atan2(pts[1].y - pts[0].y, pts[1].x - pts[0].x);
    resizeAroundCenter(obj, dist / dragState.startDist, dragState.startW, dragState.startH);
    obj.rot = snapAngle(dragState.startRot + angle - dragState.startAngle);
  } else if (dragState.mode === "move") {
    obj.cx = dragState.startCx + (p.x - dragState.start.x);
    obj.cy = dragState.startCy + (p.y - dragState.start.y);
  } else if (dragState.mode === "resize") {
    const local = toObjectLocal(obj, p.x, p.y);
    resizeAroundCenter(obj, Math.hypot(local.x, local.y) / dragState.startDist, dragState.startW, dragState.startH);
  } else if (dragState.mode === "rotate") {
    const angle = Math.atan2(p.y - obj.cy, p.x - obj.cx);
    let rot = dragState.startRot + angle - dragState.startAngle;
    if (e.shiftKey) rot = Math.round(rot / (Math.PI / 12)) * (Math.PI / 12);
    obj.rot = snapAngle(rot);
  }

  if (fillWEl) delete fillWEl.dataset.objId;
  redrawEditor();
  syncSelectionPanel();
}

function onCanvasPointerUp(e) {
  activePointers.delete(e.pointerId);
  stickerCanvas.releasePointerCapture?.(e.pointerId);

  if (activePointers.size >= 2) {
    startPinch();
    return;
  }

  if (dragState?.obj) refreshEditor();
  dragState = null;
}

function onEditorKeyDown(e) {
  if (currentStep !== "editor" || stickerState.locked) return;
  if (e.target.closest?.("input, textarea, select")) return;

  const obj = getSelectedObject();
  if (!obj) return;

  if (e.key === "Delete" || e.key === "Backspace") {
    e.preventDefault();
    deleteSelected();
    return;
  }

  const step = e.shiftKey ? 10 : 1;
  const moves = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
  const move = moves[e.key];
  if (!move) return;

  e.preventDefault();
  obj.cx += move[0];
  obj.cy += move[1];
  refreshEditor();
}

/* =========================================================
 * 용지 사이즈 빠른 변경 모달
========================================================= */
function openPaperModal() {
  if (stickerState.locked || !paperModalEl) return;
  renderPaperOptions(paperModalOptionsEl, "paperModal", stickerState.paper);
  paperModalEl.classList.add("is-open");
  paperModalEl.setAttribute("aria-hidden", "false");
}

function closePaperModal() {
  paperModalEl?.classList.remove("is-open");
  paperModalEl?.setAttribute("aria-hidden", "true");
}

function applyPaperModal() {
  const key = getCheckedPaper(paperModalOptionsEl);
  if (key && key !== stickerState.paper) {
    applyPaper(key);
    const out = getOutOfSafeObjects().length;
    if (out) showToast(`용지를 ${key}로 변경했어요. 안전선 밖 스티커 ${out}개를 안쪽으로 옮겨주세요.`, "warn", 3000);
    else showToast(`용지를 ${key}로 변경했어요.`, "ok", 1800);
  }
  closePaperModal();
}

/* =========================================================
 * 외부(sticker-order.js)에서 부르는 훅
========================================================= */
function onPaperChanged() {
  if (paperTextEl) paperTextEl.textContent = getPaperLabel();
  resizeEditorCanvas();
  syncSelectionPanel();
  syncFillPanel();
}

function onEditorShown() {
  if (paperTextEl) paperTextEl.textContent = getPaperLabel();
  requestAnimationFrame(resizeEditorCanvas);
}

function syncEditorControls() {
  const hasSel = !!getSelectedObject();
  if (selDupBtn) selDupBtn.disabled = stickerState.locked || !hasSel;
  if (selDelBtn) selDelBtn.disabled = stickerState.locked || !hasSel;
  syncFillPanel();
  redrawEditor();
}

/* =========================================================
 * 이벤트 바인딩
========================================================= */
function setActiveToolTab(targetId) {
  toolTabEls.forEach((tab) => tab.classList.toggle("is-active", tab.dataset.toolTarget === targetId));
  toolPanelEls.forEach((panel) => panel.classList.toggle("is-active", panel.id === targetId));
  if (targetId === "toolFill") syncFillPanel();
}

function bindEditorEvents() {
  renderLibrary();
  renderTextFontButtons();

  toolTabEls.forEach((tab) => {
    tab.addEventListener("click", () => setActiveToolTab(tab.dataset.toolTarget));
  });

  fileBtn?.addEventListener("click", () => {
    if (!stickerState.locked) fileEl?.click();
  });

  fileEl?.addEventListener("change", async () => {
    await handleUploadFiles(fileEl.files);
    fileEl.value = "";
  });

  libraryGridEl?.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-library-id]");
    if (btn && !stickerState.locked) addLibrarySticker(btn.dataset.libraryId);
  });

  textFontRowEl?.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-font-id]");
    if (!btn) return;
    textFontId = btn.dataset.fontId;
    renderTextFontButtons();
  });

  textAddBtn?.addEventListener("click", () => {
    if (!stickerState.locked) addTextSticker();
  });

  [fillWEl, fillGapEl].forEach((el) => el?.addEventListener("input", syncFillPanel));
  fillBtn?.addEventListener("click", fillSafeArea);

  selWEl?.addEventListener("input", () => applySelectionInput("w"));
  selHEl?.addEventListener("input", () => applySelectionInput("h"));
  selXEl?.addEventListener("input", () => applySelectionInput("x"));
  selYEl?.addEventListener("input", () => applySelectionInput("y"));
  selRotEl?.addEventListener("input", () => applySelectionInput("rot"));
  [selWEl, selHEl, selXEl, selYEl, selRotEl].forEach((el) => el?.addEventListener("blur", syncSelectionPanel));
  selDupBtn?.addEventListener("click", duplicateSelected);
  selDelBtn?.addEventListener("click", deleteSelected);

  stickerCanvas?.addEventListener("pointerdown", onCanvasPointerDown);
  stickerCanvas?.addEventListener("pointermove", onCanvasPointerMove);
  stickerCanvas?.addEventListener("pointerup", onCanvasPointerUp);
  stickerCanvas?.addEventListener("pointercancel", onCanvasPointerUp);
  document.addEventListener("keydown", onEditorKeyDown);

  paperQuickBtn?.addEventListener("click", openPaperModal);
  paperModalCancelEl?.addEventListener("click", closePaperModal);
  paperModalApplyEl?.addEventListener("click", applyPaperModal);
  paperModalEl?.addEventListener("click", (e) => {
    if (e.target === paperModalEl || e.target.classList.contains("stkPaperModalDim")) closePaperModal();
  });

  byId("askModalOk")?.addEventListener("click", () => closeAskModal(true));
  byId("askModalCancel")?.addEventListener("click", () => closeAskModal(false));
  askModalEl?.addEventListener("click", (e) => {
    if (e.target === askModalEl || e.target.classList.contains("stkPaperModalDim")) closeAskModal(false);
  });

  if (typeof ResizeObserver === "function" && canvasWrapEl) {
    new ResizeObserver(() => {
      if (currentStep === "editor") resizeEditorCanvas();
    }).observe(canvasWrapEl);
  } else {
    window.addEventListener("resize", () => {
      if (currentStep === "editor") resizeEditorCanvas();
    });
  }
}
