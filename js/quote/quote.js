/* =========================================================
 * 견적 페이지 DOM
========================================================= */
const productTypeEls = Array.from(document.querySelectorAll('input[name="productType"]'));
const keycapFieldsEl = document.getElementById("keycapFields");
const keyringFieldsEl = document.getElementById("keyringFields");

const companyNameEl = document.getElementById("companyName");
const managerNameEl = document.getElementById("managerName");
const phoneQuoteEl = document.getElementById("phone");
const emailQuoteEl = document.getElementById("email");

const profileQuoteEl = document.getElementById("profile");
const keycapSizeEl = document.getElementById("keycapSize");
const keycapQtyEl = document.getElementById("keycapQty");
const laserTypeEl = document.getElementById("laserType");

const keyringColorEl = document.getElementById("keyringColor");
const keyringTypeEl = document.getElementById("keyringType");
const keyringQtyEl = document.getElementById("keyringQty");
const keyringEtcEl = document.getElementById("keyringEtc");

const dueDateEl = document.getElementById("dueDate");
const rushTypeEl = document.getElementById("rushType");
const memoEl = document.getElementById("memo");

const selectedOptionListEl = document.getElementById("selectedOptionList");
const basePriceTextEl = document.getElementById("basePriceText");
const qtyPriceTextEl = document.getElementById("qtyPriceText");
const discountTextEl = document.getElementById("discountText");
const rushTextEl = document.getElementById("rushText");
const finalPriceTextEl = document.getElementById("finalPriceText");

const calcBtnEl = document.getElementById("calcBtn");
const resetBtnEl = document.getElementById("resetBtn");
const submitQuoteBtnEl = document.getElementById("submitQuoteBtn");

function getSelectedProductType() {
  return productTypeEls.find((el) => el.checked)?.value || "keycap";
}

function syncProductTypeUI() {
  const isKeycap = getSelectedProductType() === "keycap";
  keycapFieldsEl?.classList.toggle("isHidden", !isKeycap);
  keyringFieldsEl?.classList.toggle("isHidden", isKeycap);
}

function syncKeycapOptions() {
  const profile = safeTrim(profileQuoteEl?.value || "");
  const options = QUOTE_CAP_OPTIONS[profile] || [];
  const placeholder = profile ? "규격을 선택해주세요" : "프로파일을 먼저 선택해주세요";
  const prev = safeTrim(keycapSizeEl?.value || "");

  buildSelectOptions(keycapSizeEl, options, placeholder);

  if (options.includes(prev)) {
    keycapSizeEl.value = prev;
  }

  if (profile !== "OEM") {
    laserTypeEl.value = "none";
    laserTypeEl.disabled = true;
  } else {
    laserTypeEl.disabled = false;
  }
}

function syncKeyringOptions() {
  const color = safeTrim(keyringColorEl?.value || "");
  const types = Object.keys(QUOTE_PRICE.keyring?.[color] || {});
  const placeholder = color ? "종류를 선택해주세요" : "재질 / 컬러를 먼저 선택해주세요";
  const prev = safeTrim(keyringTypeEl?.value || "");

  buildSelectOptions(keyringTypeEl, types, placeholder);

  if (types.includes(prev)) {
    keyringTypeEl.value = prev;
  }
}

function calculateQuote() {
  const type = getSelectedProductType();
  const rushRate = getRushRate(rushTypeEl?.value || "normal");

  let unitPrice = 0;
  let qty = 0;

  if (type === "keycap") {
    unitPrice = getKeycapUnitPrice(
      safeTrim(profileQuoteEl?.value || ""),
      safeTrim(keycapSizeEl?.value || ""),
      safeTrim(laserTypeEl?.value || "none"),
    );
    qty = toInt(keycapQtyEl?.value, 0);
  } else {
    unitPrice = getKeyringUnitPrice(
      safeTrim(keyringColorEl?.value || ""),
      safeTrim(keyringTypeEl?.value || ""),
    );
    qty = toInt(keyringQtyEl?.value, 0);
  }

  const subtotal = unitPrice * qty;
  const discountRate = getDiscountRate(qty);
  const discountAmount = Math.round(subtotal * discountRate);
  const discounted = subtotal - discountAmount;
  const rushAmount = Math.round(discounted * rushRate);
  const finalAmount = discounted + rushAmount;

  return { type, unitPrice, qty, subtotal, discountRate, discountAmount, rushRate, rushAmount, finalAmount };
}

function renderSelectedOptions(result) {
  if (!selectedOptionListEl) return;

  const items = [];
  const type = result?.type || getSelectedProductType();

  const companyName = safeTrim(companyNameEl?.value || "");
  const managerName = safeTrim(managerNameEl?.value || "");
  const phone = safeTrim(phoneQuoteEl?.value || "");
  const email = safeTrim(emailQuoteEl?.value || "");

  if (companyName) items.push(["업체명", companyName]);
  if (managerName) items.push(["담당자", managerName]);
  if (phone) items.push(["연락처", phone]);
  if (email) items.push(["이메일", email]);

  if (type === "keycap") {
    items.push(["제품", "키캡"]);
    if (safeTrim(profileQuoteEl?.value || "")) items.push(["프로파일", safeTrim(profileQuoteEl?.value)]);
    if (safeTrim(keycapSizeEl?.value || "")) items.push(["규격", safeTrim(keycapSizeEl?.value)]);
    items.push(["레이저", getLaserLabel(laserTypeEl?.value || "none")]);
    if (result.qty) items.push(["수량", `${numberWithCommas(result.qty)}개`]);
  } else {
    items.push(["제품", "키링"]);
    if (safeTrim(keyringColorEl?.value || "")) items.push(["재질 / 컬러", safeTrim(keyringColorEl?.value)]);
    if (safeTrim(keyringTypeEl?.value || "")) items.push(["종류", safeTrim(keyringTypeEl?.value)]);
    if (result.qty) items.push(["수량", `${numberWithCommas(result.qty)}개`]);
    const etc = safeTrim(keyringEtcEl?.value || "");
    if (etc) items.push(["기타 옵션", etc]);
  }

  const dueDate = safeTrim(dueDateEl?.value || "");
  if (dueDate) items.push(["희망 납기일", dueDate]);

  items.push(["제작 속도", getRushLabel(rushTypeEl?.value || "normal")]);

  const packaging = collectCheckedPackaging();
  if (packaging.length) items.push(["포장", packaging.join(" / ")]);

  const memo = safeTrim(memoEl?.value || "");
  if (memo) items.push(["요청사항", memo]);

  if (!items.length) {
    selectedOptionListEl.innerHTML = '<li class="quoteEmpty">선택한 옵션이 없습니다.</li>';
    return;
  }

  selectedOptionListEl.innerHTML = items.map(([label, value]) => `
    <li class="quoteOptionItem">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
    </li>
  `).join("");
}

function renderPrice(result) {
  if (basePriceTextEl) basePriceTextEl.textContent = formatPrice(result.unitPrice);
  if (qtyPriceTextEl) qtyPriceTextEl.textContent = formatPrice(result.subtotal);

  if (discountTextEl) {
    discountTextEl.textContent = result.discountAmount ? `-${formatPrice(result.discountAmount)}` : formatPrice(0);
    discountTextEl.classList.toggle("priceMinus", result.discountAmount > 0);
  }

  if (rushTextEl) {
    rushTextEl.textContent = result.rushAmount ? `+${formatPrice(result.rushAmount)}` : formatPrice(0);
    rushTextEl.classList.toggle("pricePlus", result.rushAmount > 0);
  }

  if (finalPriceTextEl) finalPriceTextEl.textContent = formatPrice(result.finalAmount);
}

function renderQuote() {
  const result = calculateQuote();
  renderSelectedOptions(result);
  renderPrice(result);
  return result;
}

function validateBeforeSubmit(result) {
  const companyName = safeTrim(companyNameEl?.value || "");
  const managerName = safeTrim(managerNameEl?.value || "");
  const phone = safeTrim(phoneQuoteEl?.value || "");
  const email = safeTrim(emailQuoteEl?.value || "");

  if (!companyName || !managerName || !phone || !email) {
    showToast?.("업체명, 담당자명, 연락처, 이메일을 먼저 입력해줘야 해.", "warn", 2400);
    return false;
  }

  if (!result.unitPrice || !result.qty) {
    showToast?.("옵션과 수량을 먼저 입력해줘야 견적이 계산돼.", "warn", 2200);
    return false;
  }

  return true;
}

function clearQuoteFields() {
  [companyNameEl, managerNameEl, phoneQuoteEl, emailQuoteEl, keycapQtyEl, keyringQtyEl, keyringEtcEl, memoEl].forEach((el) => {
    if (el) el.value = "";
  });

  if (profileQuoteEl) profileQuoteEl.value = "";
  if (laserTypeEl) {
    laserTypeEl.value = "none";
    laserTypeEl.disabled = false;
  }
  if (keyringColorEl) keyringColorEl.value = "";
  if (dueDateEl) dueDateEl.value = "";
  if (rushTypeEl) rushTypeEl.value = "normal";

  ["packOpp", "packBundle", "packSet", "packCase", "needJig", "needSticker"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.checked = false;
  });

  productTypeEls.forEach((el) => {
    el.checked = el.value === "keycap";
  });

  syncProductTypeUI();
  syncKeycapOptions();
  syncKeyringOptions();
  renderQuote();
}

function bindQuoteEvents() {
  productTypeEls.forEach((el) => {
    el.addEventListener("change", () => {
      syncProductTypeUI();
      renderQuote();
    });
  });

  profileQuoteEl?.addEventListener("change", () => {
    syncKeycapOptions();
    renderQuote();
  });

  keyringColorEl?.addEventListener("change", () => {
    syncKeyringOptions();
    renderQuote();
  });

  [
    companyNameEl,
    managerNameEl,
    phoneQuoteEl,
    emailQuoteEl,
    keycapSizeEl,
    keycapQtyEl,
    laserTypeEl,
    keyringTypeEl,
    keyringQtyEl,
    keyringEtcEl,
    dueDateEl,
    rushTypeEl,
    memoEl,
    document.getElementById("packOpp"),
    document.getElementById("packBundle"),
    document.getElementById("packSet"),
    document.getElementById("packCase"),
    document.getElementById("needJig"),
    document.getElementById("needSticker"),
  ].forEach((el) => {
    if (!el) return;
    const eventName = el.type === "checkbox" || el.tagName === "SELECT" ? "change" : "input";
    el.addEventListener(eventName, renderQuote);
  });

  calcBtnEl?.addEventListener("click", () => {
    const result = renderQuote();
    if (validateBeforeSubmit(result)) {
      showToast?.("예상 견적을 다시 계산했어.", "ok", 1800);
    }
  });

  resetBtnEl?.addEventListener("click", () => {
    clearQuoteFields();
    showToast?.("견적 입력값을 초기화했어.", "info", 1800);
  });

  submitQuoteBtnEl?.addEventListener("click", () => {
    const result = renderQuote();
    if (!validateBeforeSubmit(result)) return;
    showToast?.("견적 요청 메일 연결 전 단계까지 붙여뒀어. 이제 메일 전송만 연결하면 돼.", "info", 2600);
  });
}

(function initQuotePage() {
  syncProductTypeUI();
  syncKeycapOptions();
  syncKeyringOptions();
  bindQuoteEvents();
  renderQuote();
})();
