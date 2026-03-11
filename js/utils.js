/* =========================================================
 * 유틸
========================================================= */
const PHONE_RE = /^01[0-9]-?[0-9]{3,4}-?[0-9]{4}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

function rerenderAll() {
  redraw();
  renderCart();
  updatePriceUI();
  updateActionLocks();
}
