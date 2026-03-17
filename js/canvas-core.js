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
function applyCanvasSizeFromForm() {
  const p = profileEl?.value || "OEM";
  const cap = capTypeEl?.value || "-";
  const laser = p === "OEM" ? laserEl?.value || "none" : "none";

  const size = getCanvasSize(p, cap);
  resizeCanvasKeepView(size.w, size.h);

  if (!selectedItemId) {
    if (p === "OEM" && laser === "black") {
      draftBgColor = "#000000";
      draftBgSet = true;
      setBgUI("#000000");
    } else if (p === "OEM" && laser === "white") {
      draftBgColor = "#ffffff";
      draftBgSet = true;
      setBgUI("#ffffff");
    } else if (p === "OEM" && laser === "none") {
      draftBgColor = "#ffffff";
      draftBgSet = false;
      setBgUI("#ffffff");
    }
  }

  updateBgLockUI(p, laser);
  updateMaoGuide();

  const it = cartItems.find((x) => x.id === selectedItemId);
  if (it) {
    bgTextEl.textContent = getItemBgColor(it);
  } else {
    bgTextEl.textContent = draftBgSet ? draftBgColor : "-";
  }

  updateSelectedInfoText();
  updateDraftInfo();
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
  it.design.scale = imgScale;
  it.design.rot = imgRot;
  it.design.bgSet = !!draftBgSet;
  it.bgColor = draftBgColor || "#ffffff";
}

async function loadItemToCanvas(it) {
  userImg = null;
  imgCX = it.design?.cx ?? canvas.width / 2;
  imgCY = it.design?.cy ?? canvas.height / 2;
  imgScale = it.design?.scale ?? 1;
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
  imgScale = 1;
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
