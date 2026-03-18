/* =========================================================
 * 초기 옵션 / 오더바 정보 동기화
========================================================= */
function updateDraftInfo() {
  const profile = safeTrim(profileEl?.value) || "-";
  const capType = safeTrim(capTypeEl?.value) || "-";
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
  updatePriceUI();
  refreshOpenTooltips();
}

/* =========================================================
 * 아이템 배경색 / 시안 여부 / 레이저 라벨
========================================================= */
function getItemBgColor(it) {
  const profile = it?.profile || profileEl.value;
  const laser = it?.laser || (profile === "OEM" ? laserEl.value : "none");

  if (profile === "OEM" && laser === "black") return "#000000";
  if (profile === "OEM" && laser === "white") return "#ffffff";
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
 * 가격 UI
========================================================= */
function updatePriceUI() {
  if (!unitPriceText) return;

  const p = profileEl.value;
  const cap = capTypeEl.value;
  const laser = p === "OEM" ? laserEl.value : "none";
  const q = Math.max(1, toInt(qtyEl?.value, 1));

  const { base, unit } = getUnitPrice(p, cap, laser);

  if (!base) {
    unitPriceText.textContent = "가격 미설정";
    return;
  }

  const baseLine = unit * q;
  const discRate = getVolumeDiscountRate(q);
  const afterDiscount = Math.round(baseLine * (1 - discRate));

  const rate = quoteEnabled ? getRushRate(quoteProd) : 0;
  const total = cartTotal();

  const discText = discRate
    ? `할인 ${Math.round(discRate * 100)}%`
    : "할인 없음";

  const rushText = rate
    ? `총액 할증 +${Math.round(rate * 100)}%`
    : "총액 할증 없음";

  unitPriceText.textContent =
    `${afterDiscount.toLocaleString()}원` +
    ` (단가 ${unit.toLocaleString()}원 · ${q}개 · ${discText})` +
    ` | 총액 ${total.toLocaleString()}원 (${rushText})` +
    (quoteEnabled ? ` / 희망 납기 ${quoteDue || "-"}` : "");
}

/* =========================================================
 * 이벤트: 옵션 변경
========================================================= */
profileEl?.addEventListener("change", () => {
  if (uiLocked) return;

  setCapTypeOptions();
  applyCanvasSizeFromForm();

  selectedItemId = null;
  updateDraftInfo();
  redraw();
  updateActionLocks();
  refreshOpenTooltips();
});

capTypeEl?.addEventListener("change", () => {
  if (uiLocked) return;

  selectedItemId = null;
  applyCanvasSizeFromForm();
  updateDraftInfo();
  redraw();
  updateActionLocks();
  refreshOpenTooltips();
});

qtyEl?.addEventListener("input", () => {
  if (uiLocked) return;

  updatePriceUI();

  const it = cartItems.find((x) => x.id === selectedItemId);
  if (it) {
    it.qty = Math.max(1, toInt(qtyEl.value, 1));
    renderCart();
  }

  updateActionLocks();
});

laserEl?.addEventListener("change", () => {
  if (uiLocked) return;

  selectedItemId = null;
  updateBgLockUI(profileEl.value, laserEl.value);
  updateDraftInfo();
  redraw();
  updateActionLocks();
});
