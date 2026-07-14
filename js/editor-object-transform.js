/* split from editor.js: 텍스트/이미지 공용 active-object 추상화 */


// 미사용 확인 (2026-07-09) - 호출부 없음, 필요시 복원
// function getImageAxes() {
//   return getObjectAxes(getActiveObjectType() || "image");
// }

function getImageHalfSize() {
  return getObjectHalfSize(getActiveObjectType() || "image");
}

function localToWorldPoint(x, y) {
  return objectLocalToWorldPoint(getActiveObjectType() || "image", x, y);
}

function hasActiveObject() {
  if (activeObjectType === "text") return hasTextObject();
  if (activeObjectType === "image") return hasImageObject();
  return hasImageObject() || hasTextObject();
}

function deleteActiveObject() {
  const type = getActiveObjectType();
  if (!type) return false;

  if (type === "text") {
    return deleteActiveTextObject();
  }

  if (type === "image") {
    if (!hasImageObject()) return false;
    if (activeImageIndex >= 0 && Array.isArray(userImages)) {
      userImages.splice(activeImageIndex, 1);
    } else {
      userImages = [];
    }
    setActiveImageIndex(userImages.length ? Math.min(activeImageIndex, userImages.length - 1) : -1);
    if (activeObjectType === "image") activeObjectType = hasImageObject() ? "image" : hasTextObject() ? "text" : null;
    syncImageCountBadge?.();
    return true;
  }

  return false;
}

function getActiveObjectType() {
  if (activeObjectType === "text" && hasTextObject()) return "text";
  if (activeObjectType === "image" && hasImageObject()) return "image";
  if (hasTextObject()) return "text";
  if (hasImageObject()) return "image";
  return null;
}

function getObjectCenter(type = getActiveObjectType()) {
  if (type === "text") {
    const obj = getActiveTextObject();
    return { x: obj?.cx ?? textCX ?? canvasLogicalW / 2, y: obj?.cy ?? textCY ?? canvasLogicalH / 2 };
  }
  const obj = getActiveImageObject();
  return { x: obj?.cx ?? imgCX, y: obj?.cy ?? imgCY };
}

function setObjectCenter(type, x, y) {
  if (type === "text") {
    textCX = x;
    textCY = y;
    if (activeTextIndex >= 0 && textObjects[activeTextIndex]) {
      textObjects[activeTextIndex].cx = x;
      textObjects[activeTextIndex].cy = y;
    }
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
  if (type === "text") {
    const obj = getActiveTextObject();
    return obj?.rot ?? textRot ?? 0;
  }
  const obj = getActiveImageObject();
  return obj?.rot ?? imgRot ?? 0;
}

function setObjectRot(type, rot) {
  if (type === "text") {
    textRot = rot;
    if (activeTextIndex >= 0 && textObjects[activeTextIndex]) textObjects[activeTextIndex].rot = rot;
  } else {
    imgRot = rot;
    if (activeImageIndex >= 0 && userImages[activeImageIndex]) userImages[activeImageIndex].rot = rot;
  }
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

function getAxisAlignedHalfSize(type = getActiveObjectType()) {
  const size = getObjectHalfSize(type);
  if (!size) return null;

  const rot = getObjectRot(type) || 0;
  const cos = Math.abs(Math.cos(rot));
  const sin = Math.abs(Math.sin(rot));

  return {
    halfW: size.halfW * cos + size.halfH * sin,
    halfH: size.halfW * sin + size.halfH * cos,
  };
}

function getCanvasAlignedX(type, align) {
  const size = getAxisAlignedHalfSize(type);
  if (!size) return canvasLogicalW / 2;

  const margin = 12;
  const minX = size.halfW + margin;
  const maxX = canvasLogicalW - size.halfW - margin;

  if (minX > maxX) return canvasLogicalW / 2;
  if (align === "left") return minX;
  if (align === "right") return maxX;
  return canvasLogicalW / 2;
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

/* =========================================================
 * 이동 / 리사이즈 / 회전
========================================================= */
function screenToCanvasPoint(e) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((e.clientX - rect.left) / rect.width) * canvasLogicalW,
    y: ((e.clientY - rect.top) / rect.height) * canvasLogicalH,
  };
}

// 미사용 확인 (2026-07-09) - 호출부 없음, 필요시 복원
// function isPointOnImage(px, py) {
//   return getImageIndexAtPoint(px, py) >= 0;
// }

function getCanvasPointFromClient(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((clientX - rect.left) / rect.width) * canvasLogicalW,
    y: ((clientY - rect.top) / rect.height) * canvasLogicalH,
  };
}
