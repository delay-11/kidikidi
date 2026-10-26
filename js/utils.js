/* moved from js/common/utils.js */
/* =========================================================
 * 검증용 정규식
========================================================= */
const PHONE_RE = /^010\d{8}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/* =========================================================
 * 공용 메시지 표시
========================================================= */
function setMsg(text = "") {
  if (msgEl) msgEl.textContent = text;
}

function setOk(text = "") {
  if (okEl) okEl.textContent = text;
}

function clearMsgOk() {
  setMsg("");
  setOk("");
}

/* =========================================================
 * 주문자 정보 안내문구 표시
========================================================= */
function setFormNotice(text = "", type = "") {
  if (!formNoticeEl) return;

  formNoticeEl.textContent = text;
  formNoticeEl.classList.remove("isOk", "isError");

  if (type === "ok") formNoticeEl.classList.add("isOk");
  if (type === "error") formNoticeEl.classList.add("isError");
}

function clearFormNotice() {
  setFormNotice("", "");
}

/* =========================================================
 * 캔버스 안내문구 표시
========================================================= */
function setCanvasNotice(text = "", type = "") {
  if (!canvasNoticeEl) return;

  // 성공/완료 안내는 토스트로만 보여주고, 캔버스 아래 고정 초록 문구는 숨김 처리합니다.
  if (type === "ok") {
    canvasNoticeEl.textContent = "";
    canvasNoticeEl.classList.remove("isOk", "isError");
    return;
  }

  canvasNoticeEl.textContent = text;
  canvasNoticeEl.classList.remove("isOk", "isError");

  if (type === "error") canvasNoticeEl.classList.add("isError");
}

function clearCanvasNotice() {
  setCanvasNotice("", "");
}

/* =========================================================
 * 값 보정 / 변환
========================================================= */
function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n));
}

function toInt(v, fallback = 1) {
  const n = parseInt(String(v ?? ""), 10);
  return Number.isFinite(n) ? n : fallback;
}

function safeTrim(v) {
  return String(v ?? "").trim();
}

function numberWithCommas(v) {
  const n = Number(v ?? 0);
  if (!Number.isFinite(n)) return "0";
  return n.toLocaleString("ko-KR");
}

/* =========================================================
 * 파일 / 데이터 변환
========================================================= */
function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

function dataUrlToBase64(dataUrl) {
  return String(dataUrl || "").split(",")[1] || "";
}

function loadImageFromDataUrl(dataUrl) {
  return new Promise((resolve, reject) => {
    if (!dataUrl) {
      resolve(null);
      return;
    }

    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = dataUrl;
  });
}

/* =========================================================
 * 레이어 순서 (캔버스 편집 / 미리보기 / 첨부 공용)
 * - 이미지/텍스트 오브젝트마다 z(작을수록 뒤)를 저장한다.
 * - z가 없는 구버전 시안은 기존처럼 "이미지 전부 → 텍스트 전부" 순서로 그린다.
========================================================= */
function getLayerZ(obj, kind, index) {
  if (Number.isFinite(obj?.z)) return obj.z;
  return (kind === "text" ? 1000 : 0) + index;
}

function sortLayerStates(images = [], texts = []) {
  const list = [];
  (Array.isArray(images) ? images : []).forEach((state, index) => {
    list.push({ kind: "image", state, index, z: getLayerZ(state, "image", index) });
  });
  (Array.isArray(texts) ? texts : []).forEach((state, index) => {
    list.push({ kind: "text", state, index, z: getLayerZ(state, "text", index) });
  });

  return list.sort((a, b) => {
    if (a.z !== b.z) return a.z - b.z;
    if (a.kind !== b.kind) return a.kind === "image" ? -1 : 1;
    return a.index - b.index;
  });
}

/* =========================================================
 * 이미지 오브젝트 변환 후 그리기 (캔버스 편집 / 미리보기 / 첨부 공용)
========================================================= */
function drawTransformedImageObject(targetCtx, img, obj = {}, fallbackCx, fallbackCy) {
  if (!targetCtx || !img) return;

  const scaleX = Number(obj.scaleX ?? obj.scale ?? 1);
  const scaleY = Number(obj.scaleY ?? obj.scale ?? 1);
  const rot = Number(obj.rot ?? 0);
  const cx = Number.isFinite(obj.cx) ? obj.cx : fallbackCx;
  const cy = Number.isFinite(obj.cy) ? obj.cy : fallbackCy;

  const w = img.width * scaleX;
  const h = img.height * scaleY;

  targetCtx.save();
  targetCtx.translate(cx, cy);
  targetCtx.rotate(rot);
  targetCtx.drawImage(img, -w / 2, -h / 2, w, h);
  targetCtx.restore();
}

/* =========================================================
 * 공통 화면 갱신
========================================================= */
function rerenderAll() {
  redraw();
  renderCart();
  updateActionLocks();
}

/* =========================================================
 * HTML 이스케이프
========================================================= */
function escapeHtml(v) {
  return String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
