/* =========================================================
 * 초기 옵션 / 오더바 정보 동기화
========================================================= */
function updateDraftInfo() {
  const profile = safeTrim(profileEl?.value) || "-";
  const capType = getCapTypeDisplayName(capTypeEl?.value);
  const laserValue = safeTrim(laserEl?.value) || "none";
  const laserLabel =
    profile === "OEM"
      ? laserValue === "black"
        ? "레이저 블랙"
        : laserValue === "white"
          ? "레이저 화이트"
          : "레이저 없음"
      : "레이저 없음";
  const orderNo = safeTrim(orderEl?.value) || "-";

  if (draftProfileEl) draftProfileEl.textContent = profile;
  if (draftCapEl) draftCapEl.textContent = capType;
  if (draftLaserEl) draftLaserEl.textContent = laserLabel;
  if (orderBarNoEl) orderBarNoEl.textContent = orderNo;
}

function initProfileOptions() {
  if (!profileEl || !capTypeEl) return;

  setCapTypeOptions();

  if (!capTypeEl.value) {
    const firstEnabled = [...capTypeEl.options].find((opt) => !opt.disabled);
    if (firstEnabled) capTypeEl.value = firstEnabled.value;
  }

  applyCanvasSizeFromForm();
  updateSelectedInfoText();
  updateDraftInfo();
  updateActionLocks();
}

/* =========================================================
 * 프로파일별 규격 옵션 구성
========================================================= */
function setCapTypeOptions() {
  const p = profileEl.value;

  capTypeEl.innerHTML = "";

  (CAP_OPTIONS[p] || []).forEach((o) => {
    const opt = document.createElement("option");
    const isSoldOut = (SOLD_OUT_OPTIONS[p] || []).includes(o.value);

    opt.value = o.value;
    opt.textContent = isSoldOut ? `${o.label} [품절]` : o.label;
    opt.disabled = isSoldOut;

    capTypeEl.appendChild(opt);
  });

  const firstEnabled = [...capTypeEl.options].find((opt) => !opt.disabled);
  if (firstEnabled) {
    capTypeEl.value = firstEnabled.value;
  }

  const isOEM = p === "OEM";
  laserEl.disabled = !isOEM;

  if (!isOEM) {
    laserEl.value = "none";
  }

  updateBgLockUI(profileEl.value, laserEl.value);
  refreshOpenTooltips();
}

/* =========================================================
 * 아이템 배경색 / 시안 여부 / 레이저 라벨
========================================================= */
function getItemBgColor(it) {
  return it?.bgColor || "#ffffff";
}

function hasDesign(it) {
  return !!it?.design?.imgDataUrl || !!it?.design?.bgSet;
}

function labelLaser(it) {
  if (it.profile !== "OEM") return "레이저 없음";
  if (it.laser === "black") return "레이저 블랙";
  if (it.laser === "white") return "레이저 화이트";
  return "레이저 없음";
}

/* =========================================================
 * 이벤트: 옵션 변경
========================================================= */
profileEl?.addEventListener("change", () => {
  if (uiLocked) return;

  selectedItemId = null;
  setCapTypeOptions();
  applyCanvasSizeFromForm();
  refreshOpenTooltips();
});

capTypeEl?.addEventListener("change", () => {
  if (uiLocked) return;

  applyCanvasSizeFromForm();
  refreshOpenTooltips();
});

qtyEl?.addEventListener("input", () => {
  if (uiLocked) return;

  const it = cartItems.find((x) => x.id === selectedItemId);
  if (it) {
    it.qty = Math.max(1, toInt(qtyEl.value, 1));
    renderCart();
  }

  updateActionLocks();
});

laserEl?.addEventListener("change", () => {
  if (uiLocked) return;

  applyLaserOptionFromForm();
  if (profileEl?.value === "OEM" && (laserEl?.value === "black" || laserEl?.value === "white")) {
    showToast("레이저 옵션 선택 시 배경은 흰색으로 고정됩니다.", "warn");
  }
  refreshOpenTooltips();
});
