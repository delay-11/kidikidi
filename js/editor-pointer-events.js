/* split from editor.js: 드래그/리사이즈/회전/핀치줌 포인터 이벤트 */



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

function getTouchPointerPair(pointerIds = null) {
  const ids = Array.isArray(pointerIds) ? pointerIds : Array.from(touchPointerMap.keys()).slice(0, 2);
  if (ids.length < 2) return null;

  const a = touchPointerMap.get(ids[0]);
  const b = touchPointerMap.get(ids[1]);
  if (!a || !b) return null;

  return { ids, a, b };
}

function getPointerDistance(a, b) {
  return Math.hypot((b.clientX || 0) - (a.clientX || 0), (b.clientY || 0) - (a.clientY || 0));
}

function getPointerMidpointCanvas(a, b) {
  return getCanvasPointFromClient(
    ((a.clientX || 0) + (b.clientX || 0)) / 2,
    ((a.clientY || 0) + (b.clientY || 0)) / 2,
  );
}

function beginPinchDrag() {
  if (uiLocked || !hasImageObject()) return;

  const pair = getTouchPointerPair();
  if (!pair) return;

  const midpoint = getPointerMidpointCanvas(pair.a, pair.b);
  let targetIndex = getImageIndexAtPoint(midpoint.x, midpoint.y);
  if (targetIndex < 0 && activeImageIndex >= 0) targetIndex = activeImageIndex;
  if (targetIndex < 0) return;

  setActiveImageIndex(targetIndex);
  activeObjectType = "image";

  const obj = getActiveImageObject();
  if (!obj?.img) return;

  draggingMove = false;
  handleDrag = null;
  rotateDrag = null;
  activeResizePointerId = null;

  pinchDrag = {
    pointerIds: pair.ids,
    startDistance: Math.max(1, getPointerDistance(pair.a, pair.b)),
    startMidX: midpoint.x,
    startMidY: midpoint.y,
    startCX: Number.isFinite(obj.cx) ? obj.cx : canvasLogicalW / 2,
    startCY: Number.isFinite(obj.cy) ? obj.cy : canvasLogicalH / 2,
    startScaleX: Number.isFinite(obj.scaleX) ? obj.scaleX : 1,
    startScaleY: Number.isFinite(obj.scaleY) ? obj.scaleY : 1,
  };

  showCanvasHelpTip("두 손가락을 벌리거나 모아 이미지 크기를 조절합니다.", 2200);
  redraw();
}

function updatePinchDrag() {
  if (uiLocked || !pinchDrag) return;

  const pair = getTouchPointerPair(pinchDrag.pointerIds);
  if (!pair) return;

  const obj = getActiveImageObject();
  if (!obj?.img) return;

  const currentDistance = Math.max(1, getPointerDistance(pair.a, pair.b));
  const scaleRatio = currentDistance / Math.max(1, pinchDrag.startDistance);
  const currentMid = getPointerMidpointCanvas(pair.a, pair.b);

  imgScaleX = clamp(pinchDrag.startScaleX * scaleRatio, 0.05, 10);
  imgScaleY = clamp(pinchDrag.startScaleY * scaleRatio, 0.05, 10);
  obj.scaleX = imgScaleX;
  obj.scaleY = imgScaleY;

  setObjectCenter(
    "image",
    pinchDrag.startCX + (currentMid.x - pinchDrag.startMidX),
    pinchDrag.startCY + (currentMid.y - pinchDrag.startMidY),
  );

  redraw();
}

function endPinchDrag() {
  if (!pinchDrag) return;

  pinchDrag = null;
  draggingMove = false;
  handleDrag = null;
  rotateDrag = null;
  activeResizePointerId = null;

  redraw();
  syncActiveItemDesign?.();
  hideCanvasHelpTip();
  updateActionLocks();
}

function trackTouchPointerDown(e) {
  if (uiLocked || e.pointerType !== "touch") return;
  touchPointerMap.set(e.pointerId, { clientX: e.clientX, clientY: e.clientY });

  if (touchPointerMap.size >= 2) {
    e.preventDefault();
    e.stopPropagation();
    beginPinchDrag();
  }
}

function trackTouchPointerMove(e) {
  if (e.pointerType !== "touch" || !touchPointerMap.has(e.pointerId)) return false;

  touchPointerMap.set(e.pointerId, { clientX: e.clientX, clientY: e.clientY });

  if (pinchDrag) {
    e.preventDefault();
    updatePinchDrag();
    return true;
  }

  return false;
}

function trackTouchPointerEnd(e) {
  if (e.pointerType !== "touch" || !touchPointerMap.has(e.pointerId)) return false;

  touchPointerMap.delete(e.pointerId);

  if (pinchDrag && touchPointerMap.size < 2) {
    endPinchDrag();
    return true;
  }

  return false;
}

canvasWrapEl?.addEventListener("pointerdown", trackTouchPointerDown, {
  capture: true,
});

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
  if (pinchDrag || (e.pointerType === "touch" && touchPointerMap.size >= 2)) return;

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
  if (e.target.id === "rotHandle" || e.target.id === "deleteHandle") return;

  const p = screenToCanvasPoint(e);
  let targetType = null;
  const hitTextIndex = getTextIndexAtPoint(p.x, p.y);
  const hitImageIndex = getImageIndexAtPoint(p.x, p.y);
  if (hitTextIndex >= 0) {
    setActiveTextIndex(hitTextIndex);
    targetType = "text";
  } else if (hitImageIndex >= 0) {
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

    const activeType = getActiveObjectType() || "image";
    const startCenter = getObjectCenter(activeType);

    handleDrag = {
      type: activeType,
      handle,
      signX: spec.signX,
      signY: spec.signY,
      anchorX: anchor.x,
      anchorY: anchor.y,
      startHalfW: size.halfW,
      startHalfH: size.halfH,
      startCX: startCenter.x,
      startCY: startCenter.y,
      startPointerX: p.x,
      startPointerY: p.y,
      startTextScale: textScale || 1,
    };

    activeResizePointerId = e.pointerId;
    showCanvasHelpTip("모서리 핸들을 드래그하면 비율을 유지한 채 크기가 조절됩니다.", 2600);
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


deleteHandleEl?.addEventListener("pointerdown", async (e) => {
  if (uiLocked || !hasActiveObject()) return;
  if (e.pointerType === "mouse" && e.button !== 0) return;

  e.preventDefault();
  e.stopPropagation();

  clearCanvasNotice?.();
  setMobileEyedropperMode?.(false);

  if (await applyConfirmedLockIfNeeded(true)) return;

  const type = getActiveObjectType() || "image";
  const deleted = deleteActiveObject();
  if (!deleted) return;

  redraw();
  syncActiveItemDesign?.();
  updateSelectedInfoText?.();
  updateDraftInfo?.();
  updateActionLocks?.();
  hideCanvasHelpTip?.();
  showToast(type === "text" ? "텍스트를 삭제했습니다." : "이미지를 삭제했습니다.", "ok", 1200);
});

document.addEventListener("pointermove", (e) => {
  if (uiLocked) return;
  if (trackTouchPointerMove(e)) return;
  if (pinchDrag) return;

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
    const minHalf = 10;

    let halfW = handleDrag.startHalfW;
    let halfH = handleDrag.startHalfH;

    /* =========================================================
     * 모든 리사이즈는 원본 비율 유지
     * - Shift / Alt 같은 보조키 없이 동일하게 동작
     * - 반대쪽 핸들을 기준점으로 두고 크기만 비율에 맞게 조절
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

    const startHalfW = Math.max(1, handleDrag.startHalfW);
    const startHalfH = Math.max(1, handleDrag.startHalfH);
    let ratioScale = 1;

    if (handleDrag.signX !== 0 && handleDrag.signY !== 0) {
      const scaleX = halfW / startHalfW;
      const scaleY = halfH / startHalfH;
      ratioScale = Math.abs(scaleX - 1) >= Math.abs(scaleY - 1) ? scaleX : scaleY;
    } else if (handleDrag.signX !== 0) {
      ratioScale = halfW / startHalfW;
    } else if (handleDrag.signY !== 0) {
      ratioScale = halfH / startHalfH;
    }

    if (!Number.isFinite(ratioScale) || ratioScale <= 0) ratioScale = 1;

    halfW = Math.max(minHalf, startHalfW * ratioScale);
    halfH = Math.max(minHalf, startHalfH * ratioScale);

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

    if (type === "text") {
      const scaleRatio = Math.max(halfW / startHalfW, halfH / startHalfH);
      textScale = clamp((handleDrag.startTextScale || 1) * scaleRatio, 0.25, 8);
      if (activeTextIndex >= 0 && textObjects[activeTextIndex]) {
        textObjects[activeTextIndex].scale = textScale;
      }
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
    redraw();
    syncActiveItemDesign();
    hideCanvasHelpTip();
    updateActionLocks();
  }
}

document.addEventListener("pointerup", (e) => {
  if (uiLocked) return;
  if (trackTouchPointerEnd(e)) return;
  endPointerInteraction();
});

document.addEventListener("pointercancel", (e) => {
  if (uiLocked) return;
  if (trackTouchPointerEnd(e)) return;
  endPointerInteraction();
});

canvas.addEventListener("wheel", (e) => e.preventDefault(), { passive: false });
