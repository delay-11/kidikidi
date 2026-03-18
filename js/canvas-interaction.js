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

  const halfW = (userImg.width * imgScale) / 2;
  const halfH = (userImg.height * imgScale) / 2;

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
    const aabb = getImageAABB();
    if (!aabb) return;

    const p = screenToCanvasPoint(e);

    const opposite =
      handle === "nw"
        ? "se"
        : handle === "ne"
          ? "sw"
          : handle === "sw"
            ? "ne"
            : "nw";

    const anchor = cornerPoint(aabb, opposite);

    handleDrag = {
      anchorX: anchor.x,
      anchorY: anchor.y,
      anchorCorner: opposite,
      startDist: Math.hypot(p.x - anchor.x, p.y - anchor.y),
      startScale: imgScale,
    };
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

document.addEventListener("pointermove", (e) => {
  if (uiLocked) return;

  const p = screenToCanvasPoint(e);

  if (draggingMove) {
    imgCX = centerStart.x + (p.x - moveStart.x);
    imgCY = centerStart.y + (p.y - moveStart.y);
    redraw();
    return;
  }

  if (handleDrag) {
    const alt = e.altKey;
    const ax = handleDrag.anchorX;
    const ay = handleDrag.anchorY;

    const distNow = Math.hypot(p.x - ax, p.y - ay);
    const distStart = handleDrag.startDist;
    if (distStart < 1) return;

    let nextScale = handleDrag.startScale * (distNow / distStart);
    nextScale = clamp(nextScale, 0.1, 10);

    if (alt) {
      imgScale = nextScale;
      redraw();
      return;
    }

    const before = getImageAABB();
    imgScale = nextScale;
    const after = getImageAABB();

    if (before && after) {
      const targetCorner = handleDrag.anchorCorner;
      const afterCorner = cornerPoint(after, targetCorner);
      imgCX += ax - afterCorner.x;
      imgCY += ay - afterCorner.y;
    }

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
