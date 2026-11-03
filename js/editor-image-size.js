/* =========================================================
 * 이미지 크기 % 입력 + [캔버스 채우기]
 *
 * 손가락/마우스로 늘리고 줄이면 여러 시안을 똑같은 크기·비율로 맞추기 어렵다는
 * 의견이 많아서, 이미지가 있으면 "안내사항" 자리에 크기(%) 칸을 보여준다.
 *
 * - 100% = 비율 그대로 캔버스를 꽉 채우는 크기 ([캔버스 채우기]와 같은 크기)
 *   이미지가 달라도 같은 %면 캔버스에서 차지하는 크기가 같은 기준으로 맞춰진다.
 * - 크기를 바꿔도 가로세로 비율과 위치(가운데 기준)는 그대로
 * - [캔버스 채우기]: 100%로 키우고 회전을 풀어 가운데 배치
 * - [초기화]: 처음 올렸을 때 상태로 (업로드 시 배치가 캔버스 채우기와 같아서 동작도 같음)
 *
 * 캔버스에서 끌어서 바꾸면 redraw()에서 syncImageSizePanel()을 불러 숫자도 따라간다.
========================================================= */

const IMAGE_SCALE_MIN = 0.05;
const IMAGE_SCALE_MAX = 10;

const imageSizePanelEl = document.getElementById("imageSizePanel");
const imageToolInfoEl = imageSizePanelEl?.closest(".imageToolInfo") || null;
const imgSizePctEl = document.getElementById("imgSizePct");
const imgFillBtnEl = document.getElementById("imgFillBtn");
const imgResetBtnEl = document.getElementById("imgResetBtn");

function getSizePanelImage() {
  if (typeof getActiveObjectType !== "function") return null;
  if (getActiveObjectType() !== "image") return null;
  const obj = getActiveImageObject?.();
  return obj?.img ? obj : null;
}

// 비율 그대로 캔버스 가로·세로를 모두 덮는 배율 (= 100%)
function getCanvasFillScale(img) {
  return Math.max(canvasLogicalW / img.width, canvasLogicalH / img.height);
}

function getImageSizePercent(obj) {
  const fill = getCanvasFillScale(obj.img);
  const s = Math.max(obj.scaleX ?? 1, obj.scaleY ?? 1);
  return Math.round((s / fill) * 100);
}

function syncImageSizePanel(force = false) {
  if (!imageSizePanelEl) return;
  const obj = getSizePanelImage();
  imageToolInfoEl?.classList.toggle("has-image", !!obj);
  if (!obj) return;

  // 입력 중인 칸은 덮어쓰지 않음
  if (imgSizePctEl && (force || document.activeElement !== imgSizePctEl)) {
    imgSizePctEl.value = String(getImageSizePercent(obj));
  }

  const disabled = !!uiLocked || !!obj.locked;
  if (imgSizePctEl) imgSizePctEl.disabled = disabled;
  if (imgFillBtnEl) imgFillBtnEl.disabled = disabled;
  if (imgResetBtnEl) imgResetBtnEl.disabled = disabled;
}

function setImageScale(obj, sx, sy) {
  obj.scaleX = clamp(sx, IMAGE_SCALE_MIN, IMAGE_SCALE_MAX);
  obj.scaleY = clamp(sy, IMAGE_SCALE_MIN, IMAGE_SCALE_MAX);
  imgScaleX = obj.scaleX;
  imgScaleY = obj.scaleY;
}

async function canEditSizePanelImage(obj) {
  if (await applyConfirmedLockIfNeeded(true)) return false;
  if (obj.locked) {
    showToast?.("잠긴 레이어예요. 레이어 잠금을 풀고 조절해 주세요.", "warn");
    return false;
  }
  return true;
}

function commitImageChange() {
  redraw();
  syncActiveItemDesign?.();
  updateDraftInfo?.();
  // 범위를 넘어 잘린 값도 실제 값으로 다시 보여줌
  syncImageSizePanel(true);
}

async function applyImageSizePercent() {
  const obj = getSizePanelImage();
  if (!obj) return;

  const pct = Number(String(imgSizePctEl.value).replace(",", "."));
  if (!Number.isFinite(pct) || pct <= 0 || !(await canEditSizePanelImage(obj))) {
    syncImageSizePanel(true);
    return;
  }

  // 지금 가로세로 비율은 유지하고 크기만 바꿈
  const cur = Math.max(obj.scaleX ?? 1, obj.scaleY ?? 1);
  const ratio = (getCanvasFillScale(obj.img) * (pct / 100)) / cur;
  setImageScale(obj, (obj.scaleX ?? 1) * ratio, (obj.scaleY ?? 1) * ratio);
  commitImageChange();
}

imgSizePctEl?.addEventListener("change", applyImageSizePercent);
imgSizePctEl?.addEventListener("focus", () => imgSizePctEl.select?.());
imgSizePctEl?.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    imgSizePctEl.blur();
  } else if (e.key === "Escape") {
    e.preventDefault();
    syncImageSizePanel(true);
    imgSizePctEl.blur();
  }
});

// 캔버스 꽉 채움 · 가운데 · 회전 0 (= 이미지를 처음 올렸을 때 배치, js/editor-image.js 업로드 참고)
async function placeImageFillingCanvas(message) {
  const obj = getSizePanelImage();
  if (!obj || !(await canEditSizePanelImage(obj))) return;

  const s = getCanvasFillScale(obj.img);
  setImageScale(obj, s, s);
  setObjectRot("image", 0);
  setObjectCenter("image", canvasLogicalW / 2, canvasLogicalH / 2);
  commitImageChange();
  showToast?.(message, "ok");
}

imgFillBtnEl?.addEventListener("click", () => placeImageFillingCanvas("이미지로 캔버스 전체를 채웠어요."));
imgResetBtnEl?.addEventListener("click", () => placeImageFillingCanvas("이미지를 처음 올린 상태로 되돌렸어요."));

syncImageSizePanel();
