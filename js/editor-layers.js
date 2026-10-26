/* 레이어 (이미지/텍스트 앞뒤 순서 + 잠금) */

/* =========================================================
 * 레이어 목록
 * - 실제로 캔버스에 보이는 오브젝트만 대상 (이미지 있는 슬롯, 글자가 있는 텍스트)
 * - z가 작을수록 뒤에 그려진다. 순서를 매길 때마다 0,1,2... 로 다시 정리해서
 *   구버전 시안(z 없음)이나 새로 끼워 넣은 소수 z도 정수 순서로 맞춘다.
========================================================= */
function getLayerEntries() {
  syncActiveImageFromLegacy?.();
  syncActiveTextFromLegacy?.();

  const images = (Array.isArray(userImages) ? userImages : []).map((obj) => (obj?.img ? obj : null));
  const texts = (Array.isArray(textObjects) ? textObjects : []).map((obj) =>
    obj && safeTrim(obj.value || "") ? obj : null,
  );

  const entries = sortLayerStates(images, texts)
    .filter((entry) => !!entry.state)
    .map((entry) => ({ kind: entry.kind, index: entry.index, obj: entry.state }));

  entries.forEach((entry, i) => {
    entry.obj.z = i;
  });

  return entries;
}

function getLayerIndexesFrontToBack(kind) {
  return getLayerEntries()
    .filter((entry) => entry.kind === kind)
    .reverse()
    .map((entry) => entry.index);
}

// 새 이미지는 기존 이미지들 바로 위(= 텍스트 아래)에 들어가서, 레이어 기능이
// 생기기 전처럼 텍스트가 이미지에 가려지지 않게 한다.
function getNewImageLayerZ() {
  const entries = getLayerEntries();
  const images = entries.filter((entry) => entry.kind === "image");
  if (images.length) return images[images.length - 1].obj.z + 0.5;
  return entries.length ? entries[0].obj.z - 0.5 : 0;
}

function getNewTextLayerZ() {
  const entries = getLayerEntries();
  return entries.length ? entries[entries.length - 1].obj.z + 1 : 0;
}

function getActiveLayerObject() {
  const type = getActiveObjectType?.();
  if (type === "image") return userImages?.[activeImageIndex] || null;
  if (type === "text") return textObjects?.[activeTextIndex] || null;
  return null;
}

function isActiveObjectLocked() {
  return !!getActiveLayerObject()?.locked;
}

/* =========================================================
 * 레이어 조작
========================================================= */
function selectLayer(kind, index) {
  if (kind === "image") {
    setActiveImageIndex(index);
  } else {
    setActiveTextIndex(index);
    syncTextUI?.();
  }
  activeObjectType = kind;
  redraw();
}

// dir: +1 = 앞으로, -1 = 뒤로
function moveLayer(kind, index, dir) {
  const entries = getLayerEntries();
  const from = entries.findIndex((entry) => entry.kind === kind && entry.index === index);
  const to = from + dir;
  if (from < 0 || to < 0 || to >= entries.length) return;

  const fromZ = entries[from].obj.z;
  entries[from].obj.z = entries[to].obj.z;
  entries[to].obj.z = fromZ;

  selectLayer(kind, index);
  syncActiveItemDesign?.();
}

function toggleLayerLock(kind, index) {
  const obj = kind === "image" ? userImages?.[index] : textObjects?.[index];
  if (!obj) return;

  obj.locked = !obj.locked;

  // 잠그는 순간 진행 중이던 드래그/핸들 조작은 끊는다.
  draggingMove = false;
  handleDrag = null;
  rotateDrag = null;
  pinchDrag = null;

  selectLayer(kind, index);
  syncActiveItemDesign?.();
  showToast?.(obj.locked ? "레이어를 잠갔어요. 캔버스에서 움직이지 않아요." : "레이어 잠금을 풀었어요.", "ok");
}

/* =========================================================
 * 레이어 패널 UI
 * - 오브젝트(이미지/텍스트)가 2개 이상일 때만 표시
 * - PC에서 캔버스 옆에 빈 공간이 있으면 옆에 작은 카드(side),
 *   가로로 긴 OEM 특수키처럼 공간이 없거나 모바일이면 캔버스 아래 한 줄(bar)
 * - 모바일 bar는 기본 접힘
========================================================= */
const LAYER_SIDE_MIN_SPACE = 140;
const LAYER_MOBILE_QUERY = "(max-width: 767px)";

const LAYER_ICONS = {
  up: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 15 6-6 6 6"/></svg>',
  down: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>',
  lock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>',
  unlock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 7.5-2"/></svg>',
};

let layerSideOpen = true;
let layerBarOpen = null; // null이면 화면 크기 기준 기본값 (PC 펼침 / 모바일 접힘)
let layerPanelSignature = "";
let layerSideEl = null;
let layerBarEl = null;

const layerObjectIds = new WeakMap();
let layerObjectIdSeq = 0;
function getLayerObjectId(obj) {
  if (!layerObjectIds.has(obj)) layerObjectIds.set(obj, ++layerObjectIdSeq);
  return layerObjectIds.get(obj);
}

function ensureLayerPanelEls() {
  if (!layerSideEl && canvasWrapEl) {
    layerSideEl = document.createElement("div");
    layerSideEl.className = "layerSide";
    layerSideEl.hidden = true;
    canvasWrapEl.appendChild(layerSideEl);
    // canvasWrap에 걸린 캔버스 드래그(capture) 처리로 넘어가지 않게 막음
    layerSideEl.addEventListener("pointerdown", (e) => e.stopPropagation());
    layerSideEl.addEventListener("click", onLayerPanelClick);
  }

  if (!layerBarEl) {
    const toolBox = document.querySelector(".editorToolBox");
    if (toolBox?.parentNode) {
      layerBarEl = document.createElement("div");
      layerBarEl.className = "layerBar";
      layerBarEl.hidden = true;
      toolBox.parentNode.insertBefore(layerBarEl, toolBox);
      layerBarEl.addEventListener("click", onLayerPanelClick);
    }
  }
}

function getLayerPanelMode() {
  if (window.matchMedia?.(LAYER_MOBILE_QUERY).matches) return "bar";
  if (!canvas || !canvasWrapEl) return "bar";

  const canvasRect = canvas.getBoundingClientRect();
  const wrapRect = canvasWrapEl.getBoundingClientRect();
  return canvasRect.left - wrapRect.left >= LAYER_SIDE_MIN_SPACE ? "side" : "bar";
}

function isLayerBarOpen() {
  if (layerBarOpen === null) return !window.matchMedia?.(LAYER_MOBILE_QUERY).matches;
  return layerBarOpen;
}

function renderLayerThumb(entry) {
  if (entry.kind === "text") {
    const label = escapeLayerHtml(Array.from(safeTrim(entry.obj.value || "")).slice(0, 2).join(""));
    const color = normalizeHexInput(entry.obj.color, "#111827");
    return `<span class="layerThumb isText" style="color:${color}">${label}</span>`;
  }
  return `<span class="layerThumb"><img alt="" src="${entry.obj.img.src}" draggable="false" /></span>`;
}

function escapeLayerHtml(value) {
  return String(value).replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]);
}

function renderLayerBtn(action, entry, { disabled = false, label = "" } = {}) {
  const locked = !!entry?.obj.locked;
  const icon = action === "lock" ? (locked ? LAYER_ICONS.lock : LAYER_ICONS.unlock) : LAYER_ICONS[action];
  const title = { up: "앞으로", down: "뒤로", lock: locked ? "잠금 해제" : "잠금" }[action];
  const data = entry ? ` data-kind="${entry.kind}" data-index="${entry.index}"` : "";
  return `<button class="layerBtn${action === "lock" && locked ? " isLocked" : ""}" type="button" data-layer-action="${action}"${data}
    title="${title}" aria-label="${title}"${disabled || uiLocked ? " disabled" : ""}>${icon}${label ? `<em>${locked && action === "lock" ? "해제" : title}</em>` : ""}</button>`;
}

function renderLayerPanel() {
  ensureLayerPanelEls();
  if (!layerSideEl || !layerBarEl) return;

  const entries = getLayerEntries();

  // 2개 미만이 되면 패널이 사라져서 잠금을 풀 방법이 없으므로 자동으로 풀어준다.
  if (entries.length < 2) {
    entries.forEach((entry) => {
      entry.obj.locked = false;
    });
  }

  const visible = entries.length >= 2;
  const mode = getLayerPanelMode();
  const activeObj = getActiveLayerObject();
  const front = entries.slice().reverse(); // 위에 있을수록 앞

  const signature = JSON.stringify([
    visible,
    mode,
    layerSideOpen,
    isLayerBarOpen(),
    uiLocked,
    front.map((e) => [e.kind, e.index, getLayerObjectId(e.obj), !!e.obj.locked, e.obj === activeObj, e.obj.value || "", e.obj.color || ""]),
  ]);

  if (mode === "side" && visible) positionLayerSide();
  if (signature === layerPanelSignature) return;
  layerPanelSignature = signature;

  layerSideEl.hidden = !visible || mode !== "side";
  layerBarEl.hidden = !visible || mode !== "bar";
  if (!visible) return;

  if (mode === "side") {
    layerSideEl.innerHTML = `
      <button class="layerHead" type="button" data-layer-action="toggle" aria-expanded="${layerSideOpen}">
        <b>레이어</b>${layerSideOpen ? LAYER_ICONS.up : LAYER_ICONS.down}
      </button>
      ${layerSideOpen ? `<div class="layerRows">${front
        .map((entry, i) => `
          <div class="layerRow${entry.obj === activeObj ? " isActive" : ""}${entry.obj.locked ? " isLocked" : ""}"
            data-layer-action="select" data-kind="${entry.kind}" data-index="${entry.index}">
            ${renderLayerThumb(entry)}
            <span class="layerBtns">
              ${renderLayerBtn("up", entry, { disabled: i === 0 })}
              ${renderLayerBtn("down", entry, { disabled: i === front.length - 1 })}
              ${renderLayerBtn("lock", entry)}
            </span>
          </div>`)
        .join("")}</div>` : ""}`;
    positionLayerSide();
    return;
  }

  const open = isLayerBarOpen();
  const activeEntry = front.find((entry) => entry.obj === activeObj) || null;
  const activePos = activeEntry ? front.indexOf(activeEntry) : -1;

  layerBarEl.innerHTML = `
    <button class="layerToggle" type="button" data-layer-action="toggle" aria-expanded="${open}">
      레이어${open ? "" : ` <span class="layerCount">${entries.length}</span>`}${open ? LAYER_ICONS.up : LAYER_ICONS.down}
    </button>
    ${open ? `
      <div class="layerChips">${front
        .map((entry) => `
          <button class="layerChip${entry.obj === activeObj ? " isActive" : ""}${entry.obj.locked ? " isLocked" : ""}" type="button"
            data-layer-action="select" data-kind="${entry.kind}" data-index="${entry.index}"
            aria-label="${entry.kind === "text" ? "텍스트" : "이미지"} 레이어 선택">
            ${renderLayerThumb(entry)}${entry.obj.locked ? `<i class="layerLockBadge">${LAYER_ICONS.lock}</i>` : ""}
          </button>`)
        .join("")}</div>
      <div class="layerActions">
        ${renderLayerBtn("up", activeEntry, { disabled: !activeEntry || activePos === 0, label: true })}
        ${renderLayerBtn("down", activeEntry, { disabled: !activeEntry || activePos === front.length - 1, label: true })}
        ${renderLayerBtn("lock", activeEntry, { disabled: !activeEntry, label: true })}
      </div>` : ""}`;
}

// 캔버스 왼쪽 빈 공간, 캔버스 윗선에 맞춰 띄운다. 높이는 캔버스를 넘지 않게.
function positionLayerSide() {
  if (!layerSideEl || !canvas || !canvasWrapEl) return;
  const canvasRect = canvas.getBoundingClientRect();
  const wrapRect = canvasWrapEl.getBoundingClientRect();
  const gap = canvasRect.left - wrapRect.left;

  layerSideEl.style.top = `${canvasRect.top - wrapRect.top}px`;
  layerSideEl.style.left = `${Math.max(0, (gap - layerSideEl.offsetWidth) / 2)}px`;
  layerSideEl.style.maxHeight = `${canvasRect.height}px`;
}

function onLayerPanelClick(e) {
  const target = e.target.closest("[data-layer-action]");
  if (!target || target.disabled) return;

  e.preventDefault();
  e.stopPropagation();

  const action = target.dataset.layerAction;
  if (action === "toggle") {
    if (target.closest(".layerSide")) layerSideOpen = !layerSideOpen;
    else layerBarOpen = !isLayerBarOpen();
    renderLayerPanel();
    return;
  }

  const kind = target.dataset.kind;
  const index = Number(target.dataset.index);
  if (!kind || !Number.isFinite(index)) return;

  if (action === "select") {
    selectLayer(kind, index);
    return;
  }

  if (uiLocked) return;
  if (action === "up") moveLayer(kind, index, 1);
  if (action === "down") moveLayer(kind, index, -1);
  if (action === "lock") toggleLayerLock(kind, index);
}
