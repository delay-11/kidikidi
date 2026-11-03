/* =========================================================
 * 이미지 크기 · 위치 숫자 입력
 *
 * 손가락/마우스로 늘리고 줄이면 여러 시안을 똑같은 크기·비율로 맞추기 어렵다는
 * 의견이 많아서, 이미지가 있으면 "안내사항" 자리에 숫자 칸을 보여준다.
 *
 * - 가로/세로: 캔버스 기준 px (같은 프로파일이면 모든 시안에서 같은 크기)
 * - 비율 고정(기본 켜짐): 한쪽만 바꿔도 원본 비율 유지
 * - 좌우/상하: 캔버스 가운데를 0으로 한 위치 (오른쪽·아래가 +)
 * - 회전: 도(°)
 * - [캔버스 채우기]: 비율 그대로 캔버스 전체를 덮도록 키우고 가운데 배치
 *
 * 캔버스에서 끌어서 바꾸면 redraw()에서 syncImageSizePanel()을 불러 숫자도 따라간다.
========================================================= */

const IMAGE_SCALE_MIN = 0.05;
const IMAGE_SCALE_MAX = 10;

const imageSizePanelEl = document.getElementById("imageSizePanel");
const imageToolInfoEl = imageSizePanelEl?.closest(".imageToolInfo") || null;
const imgSizeWEl = document.getElementById("imgSizeW");
const imgSizeHEl = document.getElementById("imgSizeH");
const imgPosXEl = document.getElementById("imgPosX");
const imgPosYEl = document.getElementById("imgPosY");
const imgRotDegEl = document.getElementById("imgRotDeg");
const imgRatioLockEl = document.getElementById("imgRatioLock");
const imgFillBtnEl = document.getElementById("imgFillBtn");

let imageRatioLocked = true;

const roundTo = (v, digits = 0) => {
  const m = 10 ** digits;
  return Math.round(v * m) / m;
};

// -180 ~ 180도로 맞춤
function normalizeDeg(deg) {
  let d = deg % 360;
  if (d > 180) d -= 360;
  if (d <= -180) d += 360;
  return d;
}

function getSizePanelImage() {
  if (typeof getActiveObjectType !== "function") return null;
  if (getActiveObjectType() !== "image") return null;
  const obj = getActiveImageObject?.();
  return obj?.img ? obj : null;
}

function setFieldValue(el, value, force) {
  if (!el) return;
  if (!force && document.activeElement === el) return; // 입력 중인 칸은 덮어쓰지 않음
  el.value = String(value);
}

function syncImageSizePanel(force = false) {
  if (!imageSizePanelEl) return;
  const obj = getSizePanelImage();
  imageToolInfoEl?.classList.toggle("has-image", !!obj);
  if (!obj) return;

  const w = obj.img.width * (obj.scaleX ?? 1);
  const h = obj.img.height * (obj.scaleY ?? 1);
  setFieldValue(imgSizeWEl, roundTo(w), force);
  setFieldValue(imgSizeHEl, roundTo(h), force);
  setFieldValue(imgPosXEl, roundTo((obj.cx ?? canvasLogicalW / 2) - canvasLogicalW / 2), force);
  setFieldValue(imgPosYEl, roundTo((obj.cy ?? canvasLogicalH / 2) - canvasLogicalH / 2), force);
  setFieldValue(imgRotDegEl, roundTo(normalizeDeg(((obj.rot ?? 0) * 180) / Math.PI), 1), force);

  const disabled = !!uiLocked || !!obj.locked;
  [imgSizeWEl, imgSizeHEl, imgPosXEl, imgPosYEl, imgRotDegEl, imgRatioLockEl, imgFillBtnEl].forEach((el) => {
    if (el) el.disabled = disabled;
  });
}

function setImageScale(obj, sx, sy) {
  obj.scaleX = clamp(sx, IMAGE_SCALE_MIN, IMAGE_SCALE_MAX);
  obj.scaleY = clamp(sy, IMAGE_SCALE_MIN, IMAGE_SCALE_MAX);
  imgScaleX = obj.scaleX;
  imgScaleY = obj.scaleY;
}

function commitImageChange() {
  redraw();
  syncActiveItemDesign?.();
  updateDraftInfo?.();
}

async function applyImageSizeField(el) {
  const obj = getSizePanelImage();
  if (!obj) return;
  if (await applyConfirmedLockIfNeeded(true)) {
    syncImageSizePanel(true);
    return;
  }
  if (obj.locked) {
    showToast?.("잠긴 레이어예요. 레이어 잠금을 풀고 조절해 주세요.", "warn");
    syncImageSizePanel(true);
    return;
  }

  const v = Number(String(el.value).replace(",", "."));
  if (!Number.isFinite(v)) {
    syncImageSizePanel(true);
    return;
  }

  if (el === imgSizeWEl || el === imgSizeHEl) {
    if (v <= 0) {
      syncImageSizePanel(true);
      return;
    }
    const isW = el === imgSizeWEl;
    const base = isW ? obj.img.width : obj.img.height;
    const next = v / base;
    if (imageRatioLocked) {
      // 원본 비율 유지: 한쪽 값으로 양쪽 배율을 같은 비율만큼 바꿈
      const cur = isW ? obj.scaleX ?? 1 : obj.scaleY ?? 1;
      const ratio = next / cur;
      setImageScale(obj, (obj.scaleX ?? 1) * ratio, (obj.scaleY ?? 1) * ratio);
    } else if (isW) {
      setImageScale(obj, next, obj.scaleY ?? 1);
    } else {
      setImageScale(obj, obj.scaleX ?? 1, next);
    }
  } else if (el === imgPosXEl) {
    setObjectCenter("image", canvasLogicalW / 2 + v, obj.cy ?? canvasLogicalH / 2);
  } else if (el === imgPosYEl) {
    setObjectCenter("image", obj.cx ?? canvasLogicalW / 2, canvasLogicalH / 2 + v);
  } else if (el === imgRotDegEl) {
    setObjectRot("image", (normalizeDeg(v) * Math.PI) / 180);
  }

  commitImageChange();
  // 범위를 넘어 잘린 값도 실제 값으로 다시 보여줌 (스핀 버튼처럼 포커스가 남아 있어도)
  syncImageSizePanel(true);
}

[imgSizeWEl, imgSizeHEl, imgPosXEl, imgPosYEl, imgRotDegEl].forEach((el) => {
  if (!el) return;
  el.addEventListener("change", () => applyImageSizeField(el));
  el.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      el.blur();
    } else if (e.key === "Escape") {
      e.preventDefault();
      syncImageSizePanel(true);
      el.blur();
    }
  });
  el.addEventListener("focus", () => el.select?.());
});

imgRatioLockEl?.addEventListener("click", () => {
  imageRatioLocked = !imageRatioLocked;
  imgRatioLockEl.classList.toggle("is-on", imageRatioLocked);
  imgRatioLockEl.setAttribute("aria-pressed", imageRatioLocked ? "true" : "false");
  imgRatioLockEl.title = imageRatioLocked ? "가로세로 비율 고정" : "가로세로 따로 조절";
});

imgFillBtnEl?.addEventListener("click", async () => {
  const obj = getSizePanelImage();
  if (!obj) return;
  if (await applyConfirmedLockIfNeeded(true)) return;
  if (obj.locked) {
    showToast?.("잠긴 레이어예요. 레이어 잠금을 풀고 조절해 주세요.", "warn");
    return;
  }

  // 비율 그대로, 캔버스 가로·세로를 모두 덮는 크기 (cover)
  const s = Math.max(canvasLogicalW / obj.img.width, canvasLogicalH / obj.img.height);
  setImageScale(obj, s, s);
  setObjectRot("image", 0);
  setObjectCenter("image", canvasLogicalW / 2, canvasLogicalH / 2);
  commitImageChange();
  showToast?.("이미지로 캔버스 전체를 채웠어요.", "ok");
});

syncImageSizePanel();
