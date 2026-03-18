/* =========================================================
 * 메일 공통 / EmailJS 초기화
========================================================= */

let __emailJsInitialized = false;

/* =========================================================
 * EmailJS 초기화
========================================================= */
function ensureEmailJsInit() {
  if (__emailJsInitialized) return;
  emailjs.init({ publicKey: EMAILJS_PUBLIC_KEY });
  __emailJsInitialized = true;
}

/* =========================================================
 * 공통 유틸
========================================================= */
function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function safeFilePart(v) {
  return String(v || "")
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, "-");
}

function emptyText(v) {
  const t = safeTrim(String(v ?? ""));
  return t || "-";
}

function ynText(v) {
  return v ? "포함" : "미포함";
}

function getLaserText(profile, laser) {
  if (profile !== "OEM") return "레이저 없음";
  if (laser === "black") return "레이저 블랙";
  if (laser === "white") return "레이저 화이트";
  return "레이저 없음";
}

function getBizFileName() {
  const nameFromUi = safeTrim(bizFileNameEl?.textContent || "");
  if (
    nameFromUi &&
    nameFromUi !== "선택된 파일 없음" &&
    nameFromUi !== "파일 없음"
  ) {
    return nameFromUi;
  }

  const fileNameFromInput = safeTrim(bizFileEl?.files?.[0]?.name || "");
  if (fileNameFromInput) return fileNameFromInput;

  return "business_license.pdf";
}
