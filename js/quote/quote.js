/* =========================================================
 * 견적 페이지 전용 DOM
========================================================= */
const quotePageEl = document.body;
const companyNameEl = document.getElementById("companyName");
const useKeycapEl = document.getElementById("useKeycap");
const useKeyringEl = document.getElementById("useKeyring");
const keycapFieldsEl = document.getElementById("keycapFields");
const keyringFieldsEl = document.getElementById("keyringFields");
const keycapCanvasSectionEl = document.getElementById("keycapCanvasSection");

const keyringColorEl = document.getElementById("keyringColor");
const keyringTypeEl = document.getElementById("keyringType");
const keyringQtyEl = document.getElementById("keyringQty");
const keyringLedEl = document.getElementById("keyringLed");

const dueDateEl = document.getElementById("dueDate");
const rushTypeEl = document.getElementById("rushType");
const memoEl = document.getElementById("memo");

const bizFileEl = document.getElementById("bizFile");
const bizFileBtnEl = document.getElementById("bizFileBtn");
const bizFileDelBtnEl = document.getElementById("bizFileDelBtn");
const bizFileNameEl = document.getElementById("bizFileName");

const selectedOptionListEl = document.getElementById("selectedOptionList");
const keycapPriceTextEl = document.getElementById("keycapPriceText");
const keyringPriceTextEl = document.getElementById("keyringPriceText");
const discountTextEl = document.getElementById("discountText");
const rushTextEl = document.getElementById("rushText");
const finalPriceTextEl = document.getElementById("finalPriceText");
const mobileFinalPriceTextEl = document.getElementById("mobileFinalPriceText");
const mobileSelectedTextEl = document.getElementById("mobileSelectedText");
const rowKeycapPriceEl = document.getElementById("rowKeycapPrice");
const rowKeyringPriceEl = document.getElementById("rowKeyringPrice");
const rowDiscountPriceEl = document.getElementById("rowDiscountPrice");
const rowRushPriceEl = document.getElementById("rowRushPrice");

const resetBtnEl = document.getElementById("resetBtn");
const submitQuoteBtnEl = document.getElementById("submitQuoteBtn");

/* =========================================================
 * 견적 페이지용 기본 상태 보정
========================================================= */
let bizPdfFile = null;

didReadProfileTooltip = true;
didReadUploadTooltip = true;

function generateQuoteOrderNo() {
  const now = String(Date.now());
  const rand = String(Math.floor(Math.random() * 1e10)).padStart(10, "0");
  return (now + rand).slice(0, 16);
}

function ensureQuoteOrderNo() {
  if (!orderEl) return;
  const current = safeTrim(orderEl.value || "");
  if (/^[0-9]{16}$/.test(current)) return;
  orderEl.value = generateQuoteOrderNo();
}

function updateQuoteFormReadyState() {
  if (!formReadyBoxEl || !formReadyTitleEl || !formReadyDescEl) return;

  const hasName = !!safeTrim(nameEl?.value);
  const hasPhone = !!safeTrim(phoneEl?.value);
  const hasEmail = !!safeTrim(emailEl?.value);
  const ready = hasName && hasPhone && hasEmail;

  formReadyBoxEl.classList.toggle("is-ready", ready);

  if (ready) {
    formReadyTitleEl.textContent = "담당자 정보 입력이 완료되었습니다.";
    formReadyDescEl.textContent = "프로파일 / 규격 확인 후 이미지를 업로드하거나 배경을 설정해 주세요.";
  } else {
    formReadyTitleEl.textContent = "담당자 정보 입력 후 시안 제작이 가능합니다.";
    formReadyDescEl.textContent = "담당자명, 연락처, 이메일을 입력하면 이미지 업로드와 시안 추가가 활성화됩니다.";
  }
}

validateDesignUserInfo = function validateDesignUserInfoForQuote(showMessage = false) {
  const manager = safeTrim(nameEl?.value);
  const phone = safeTrim(phoneEl?.value);
  const email = safeTrim(emailEl?.value);

  if (showMessage) {
    clearFieldErrors();
    clearFormNotice();
  }

  let ok = true;

  if (!manager) {
    ok = false;
    if (showMessage) setFieldError("name", "담당자명을 입력해주세요.");
  }

  if (!PHONE_RE.test(phone)) {
    ok = false;
    if (showMessage) setFieldError("phone", "핸드폰 번호 형식이 올바르지 않습니다. (예: 01012345678)");
  }

  if (!EMAIL_RE.test(email)) {
    ok = false;
    if (showMessage) setFieldError("email", "이메일 형식이 올바르지 않습니다.");
  }

  setFieldError("order", "");

  if (showMessage) {
    setFormNotice(ok ? "" : "담당자 정보를 먼저 입력해주세요.", ok ? "" : "error");
  }

  return ok;
};

validateUserInfo = function validateUserInfoForQuote(showMessage = false) {
  return validateDesignUserInfo(showMessage);
};

applyConfirmedLockIfNeeded = async function applyConfirmedLockIfNeededForQuote() {
  setAllLocked(false);
  didConfirmedPopup = false;
  return false;
};

updateActionLocks = function updateActionLocksForQuote() {
  const hasUserInfo = validateUserInfo(false);
  const hasCanvasDesign = !!userImg || !!draftBgSet;
  const hasAnyDesign = Array.isArray(cartItems) && cartItems.some((it) => hasDesign(it));
  const keycapEnabled = !!useKeycapEl?.checked;

  if (fileBtn) fileBtn.disabled = !keycapEnabled || !hasUserInfo;
  if (fileEl) fileEl.disabled = !keycapEnabled || !hasUserInfo;
  if (fileDelBtn) fileDelBtn.disabled = !keycapEnabled || !hasUserInfo || !userImg;
  if (bgPickBtn) bgPickBtn.disabled = !keycapEnabled || !hasUserInfo;
  if (bgEyeBtn) bgEyeBtn.disabled = !keycapEnabled || !hasUserInfo;
  if (btnAddItemEl) btnAddItemEl.disabled = !keycapEnabled || !hasUserInfo || !hasCanvasDesign;
  if (btnConfirmEl) btnConfirmEl.disabled = true;
};

/* =========================================================
 * 견적 전용 장바구니 렌더링
========================================================= */
function buildQuoteCartItemHtml(item) {
  const activeClass = selectedItemId === item.id ? " selected" : "";
  const title = `${safeTrim(item.profile) || "-"} / ${safeTrim(item.capType) || "-"}`;
  const laserText = labelLaser(item);
  const bg = getItemBgColor(item);

  return `
    <div class="cartItem${activeClass}" data-id="${escapeHtml(item.id)}">
      <div class="cartTop">
        ${makeCartThumb(item)}
        <div class="cartBody" style="min-width:0;flex:1;">
          <div class="cartTitle"><b>${escapeHtml(title)}</b></div>
          <div class="cartMeta">
            <span>${escapeHtml(laserText)}</span>
            <span>${escapeHtml(bg)}</span>
          </div>
          <div class="quoteQtyWrap">
            <span class="quoteQtyLabel">수량</span>
            <input
              type="number"
              class="quoteQtyInput"
              data-action="qty"
              data-id="${escapeHtml(item.id)}"
              min="1"
              step="1"
              value="${Math.max(1, toInt(item.qty ?? 1, 1))}"
            />
            <button
              type="button"
              class="cartBtn delete"
              data-action="delete"
              data-id="${escapeHtml(item.id)}"
              aria-label="삭제"
            >x</button>
          </div>
        </div>
      </div>
    </div>
  `;
}

renderCart = function renderQuoteCart() {
  if (!cartListEl) return;

  if (!Array.isArray(cartItems) || !cartItems.length) {
    cartListEl.innerHTML = `
      <div class="cartItem cartEmpty">
        <div class="cartTitle"><b>추가된 시안이 없습니다.</b></div>
        <div class="cartMeta">중앙 캔버스에서 이미지를 업로드하거나 배경을 설정한 뒤 시안을 추가해주세요.</div>
      </div>
    `;
    if (cartCountEl) cartCountEl.textContent = "0";
    renderQuoteSummary();
    updateActionLocks();
    return;
  }

  cartListEl.innerHTML = cartItems.map(buildQuoteCartItemHtml).join("");
  if (cartCountEl) cartCountEl.textContent = String(cartItems.length);
  renderQuoteSummary();
  updateActionLocks();
};

cartListEl?.addEventListener("click", async (e) => {
  const actionBtn = e.target.closest("[data-action]");
  const card = e.target.closest(".cartItem[data-id]");
  const id = actionBtn?.dataset.id || card?.dataset.id;

  if (!id) return;

  if (actionBtn?.dataset.action === "delete") {
    e.preventDefault();
    e.stopPropagation();
    removeItem(id);
    renderQuoteSummary();
    return;
  }

  if (actionBtn?.dataset.action === "qty") return;
  await selectItem(id);
  renderQuoteSummary();
});

cartListEl?.addEventListener("input", (e) => {
  const input = e.target.closest('.quoteQtyInput[data-action="qty"]');
  if (!input) return;

  const item = findCartItemById(input.dataset.id);
  if (!item) return;

  item.qty = Math.max(1, toInt(input.value, 1));
  if (selectedItemId === item.id && qtyEl) qtyEl.value = String(item.qty);
  renderQuoteSummary();
});

/* =========================================================
 * 견적 계산
========================================================= */
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

function collectSelectedOptions() {
  const rows = [];
  const company = safeTrim(companyNameEl?.value || "");
  const manager = safeTrim(nameEl?.value || "");
  const phone = safeTrim(phoneEl?.value || "");
  const email = safeTrim(emailEl?.value || "");

  if (company) rows.push(["업체명", company]);
  if (manager) rows.push(["담당자", manager]);
  if (phone) rows.push(["연락처", phone]);
  if (email) rows.push(["이메일", email]);

  if (useKeycapEl?.checked) {
    rows.push(["키캡", `${numberWithCommas(cartItems.length)}개 시안`]);
  }

  if (useKeyringEl?.checked) {
    const color = safeTrim(keyringColorEl?.value || "");
    const type = safeTrim(keyringTypeEl?.value || "");
    const qty = toInt(keyringQtyEl?.value, 0);
    if (color) rows.push(["키링 컬러", color]);
    if (type) rows.push(["키링 종류", type]);
    if (qty) rows.push(["키링 수량", `${numberWithCommas(qty)}개`]);
    rows.push(["LED", safeTrim(keyringLedEl?.value || "없음") || "없음"]);
  }

  const dueDate = safeTrim(dueDateEl?.value || "");
  if (dueDate) rows.push(["희망 납기일", dueDate]);
  rows.push(["제작 속도", getRushLabel(rushTypeEl?.value || "normal")]);

  const packaging = collectCheckedPackaging();
  if (packaging.length) rows.push(["포장", packaging.join(" / ")]);

  if (bizPdfFile) rows.push(["사업자등록증", bizPdfFile.name]);

  const memo = safeTrim(memoEl?.value || "");
  if (memo) rows.push(["요청사항", memo]);

  return rows;
}

function calculateQuoteTotals() {
  const useKeycap = !!useKeycapEl?.checked;
  const useKeyring = !!useKeyringEl?.checked;
  const rushRate = getRushRate(rushTypeEl?.value || "normal");

  let keycapSubtotal = 0;
  let keycapQty = 0;

  if (useKeycap) {
    cartItems.forEach((item) => {
      const unit = getKeycapUnitPrice(item.profile, item.capType, item.laser || "none");
      const qty = Math.max(1, toInt(item.qty, 1));
      keycapSubtotal += unit * qty;
      keycapQty += qty;
    });
  }

  const keycapDiscount = Math.round(keycapSubtotal * getDiscountRate(keycapQty));
  const keycapFinal = keycapSubtotal - keycapDiscount;

  let keyringSubtotal = 0;
  let keyringQty = 0;

  if (useKeyring) {
    const unit = getKeyringUnitPrice(safeTrim(keyringColorEl?.value || ""), safeTrim(keyringTypeEl?.value || ""));
    keyringQty = Math.max(0, toInt(keyringQtyEl?.value, 0));
    keyringSubtotal = unit * keyringQty;
  }

  const keyringDiscount = Math.round(keyringSubtotal * getDiscountRate(keyringQty));
  const keyringFinal = keyringSubtotal - keyringDiscount;

  const subtotal = keycapFinal + keyringFinal;
  const discountTotal = keycapDiscount + keyringDiscount;
  const rushAmount = Math.round(subtotal * rushRate);
  const finalAmount = subtotal + rushAmount;

  return {
    keycapSubtotal,
    keycapQty,
    keycapFinal,
    keyringSubtotal,
    keyringQty,
    keyringFinal,
    discountTotal,
    rushAmount,
    finalAmount,
  };
}

function renderQuoteSummary() {
  const rows = collectSelectedOptions();
  const totals = calculateQuoteTotals();
  const useKeycap = !!useKeycapEl?.checked;
  const useKeyring = !!useKeyringEl?.checked;

  if (selectedOptionListEl) {
    selectedOptionListEl.innerHTML = rows.length
      ? rows.map(([label, value]) => `
          <li class="quoteOptionItem">
            <span>${escapeHtml(label)}</span>
            <strong>${escapeHtml(value)}</strong>
          </li>
        `).join("")
      : '<li class="quoteEmpty">선택한 옵션이 없습니다.</li>';
  }

  if (keycapPriceTextEl) keycapPriceTextEl.textContent = formatPrice(totals.keycapFinal);
  if (keyringPriceTextEl) keyringPriceTextEl.textContent = formatPrice(totals.keyringFinal);

  if (discountTextEl) {
    discountTextEl.textContent = totals.discountTotal ? `-${formatPrice(totals.discountTotal)}` : formatPrice(0);
    discountTextEl.classList.toggle("priceMinus", totals.discountTotal > 0);
  }

  if (rushTextEl) {
    rushTextEl.textContent = totals.rushAmount ? `+${formatPrice(totals.rushAmount)}` : formatPrice(0);
    rushTextEl.classList.toggle("pricePlus", totals.rushAmount > 0);
  }

  if (rowKeycapPriceEl) rowKeycapPriceEl.classList.toggle("isHidden", !useKeycap);
  if (rowKeyringPriceEl) rowKeyringPriceEl.classList.toggle("isHidden", !useKeyring);
  if (rowDiscountPriceEl) {
    rowDiscountPriceEl.classList.toggle("isHidden", totals.discountTotal <= 0);
    rowDiscountPriceEl.classList.add("discountRow");
  }
  if (rowRushPriceEl) {
    rowRushPriceEl.classList.toggle("isHidden", totals.rushAmount <= 0);
    rowRushPriceEl.classList.add("rushRow");
  }

  if (finalPriceTextEl) finalPriceTextEl.textContent = formatPrice(totals.finalAmount);
  if (mobileFinalPriceTextEl) mobileFinalPriceTextEl.textContent = formatPrice(totals.finalAmount);
  if (mobileSelectedTextEl) {
    const labels = [];
    if (useKeycap) labels.push("키캡");
    if (useKeyring) labels.push("키링");
    mobileSelectedTextEl.textContent = labels.length ? `${labels.join(" + ")} 선택` : "선택 없음";
  }

  return totals;
}

/* =========================================================
 * 토글 / 파일 / 검증
========================================================= */
function syncProductUI() {
  const useKeycap = !!useKeycapEl?.checked;
  const useKeyring = !!useKeyringEl?.checked;

  keycapFieldsEl?.classList.toggle("isHidden", !useKeycap);
  keycapCanvasSectionEl?.classList.toggle("isHidden", !useKeycap);
  keyringFieldsEl?.classList.toggle("isHidden", !useKeyring);

  if (!useKeycap && selectedItemId) {
    selectedItemId = null;
    clearEditor();
  }

  updateActionLocks();
  renderQuoteSummary();
}

function handleBizFileChange() {
  const file = bizFileEl?.files?.[0] || null;
  if (!file) return;

  if (file.type !== "application/pdf") {
    showToast?.("사업자등록증은 PDF 파일만 첨부할 수 있어요.", "warn", 2200);
    bizFileEl.value = "";
    return;
  }

  bizPdfFile = file;
  if (bizFileNameEl) bizFileNameEl.textContent = file.name;
  if (bizFileDelBtnEl) bizFileDelBtnEl.disabled = false;
  renderQuoteSummary();
}

function clearBizFile() {
  bizPdfFile = null;
  if (bizFileEl) bizFileEl.value = "";
  if (bizFileNameEl) bizFileNameEl.textContent = "선택된 파일 없음";
  if (bizFileDelBtnEl) bizFileDelBtnEl.disabled = true;
  renderQuoteSummary();
}

function validateQuoteSubmit() {
  const company = safeTrim(companyNameEl?.value || "");

  if (!company) {
    showToast?.("업체명을 입력해주세요.", "warn", 2200);
    companyNameEl?.focus();
    return false;
  }

  if (!validateUserInfo(true)) {
    return false;
  }

  if (!useKeycapEl?.checked && !useKeyringEl?.checked) {
    showToast?.("키캡 또는 키링을 하나 이상 선택해주세요.", "warn", 2200);
    return false;
  }

  if (useKeycapEl?.checked) {
    if (!Array.isArray(cartItems) || !cartItems.length) {
      showToast?.("키캡 시안을 한 개 이상 추가해주세요.", "warn", 2200);
      return false;
    }
  }

  if (useKeyringEl?.checked) {
    if (!safeTrim(keyringColorEl?.value || "") || !safeTrim(keyringTypeEl?.value || "") || toInt(keyringQtyEl?.value, 0) <= 0) {
      showToast?.("키링 옵션과 수량을 입력해주세요.", "warn", 2200);
      return false;
    }
  }

  if (!bizPdfFile) {
    showToast?.("사업자등록증 PDF를 첨부해주세요.", "warn", 2200);
    bizFileBtnEl?.focus();
    return false;
  }

  return true;
}

function resetQuotePage() {
  companyNameEl.value = "";
  nameEl.value = "";
  phoneEl.value = "";
  emailEl.value = "";
  profileEl.value = "OEM";
  laserEl.value = "none";
  keyringColorEl.value = "";
  buildSelectOptions(keyringTypeEl, [], "재질 / 컬러를 먼저 선택해주세요");
  keyringQtyEl.value = "";
  keyringLedEl.value = "없음";
  dueDateEl.value = "";
  rushTypeEl.value = "normal";
  memoEl.value = "";
  ["packOpp", "packBundle", "packSet", "packCase", "needJig", "needSticker"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.checked = false;
  });

  useKeycapEl.checked = false;
  useKeyringEl.checked = false;
  clearBizFile();
  cartItems = [];
  selectedItemId = null;
  clearEditor();
  ensureQuoteOrderNo();
  initProfileOptions();
  syncProductUI();
  renderCart();
  updateQuoteFormReadyState();
  renderQuoteSummary();
  showToast?.("견적 입력값을 초기화했어요.", "info", 1800);
}

/* =========================================================
 * 견적 페이지 전용 초기화
========================================================= */
function bindQuoteEvents() {
  [companyNameEl, nameEl, phoneEl, emailEl, dueDateEl, rushTypeEl, memoEl, keyringQtyEl].forEach((el) => {
    if (!el) return;
    const eventName = el.tagName === "SELECT" || el.type === "date" ? "change" : "input";
    el.addEventListener(eventName, () => {
      updateQuoteFormReadyState();
      updateActionLocks();
      renderQuoteSummary();
    });
  });

  [profileEl, capTypeEl, laserEl].forEach((el) => {
    el?.addEventListener("change", () => {
      updateQuoteFormReadyState();
      updateActionLocks();
      renderQuoteSummary();
    });
  });

  [useKeycapEl, useKeyringEl].forEach((el) => {
    el?.addEventListener("change", () => {
      syncProductUI();
    });
  });

  keyringColorEl?.addEventListener("change", () => {
    syncKeyringOptions();
    renderQuoteSummary();
  });

  keyringTypeEl?.addEventListener("change", renderQuoteSummary);
  keyringLedEl?.addEventListener("change", renderQuoteSummary);

  ["packOpp", "packBundle", "packSet", "packCase", "needJig", "needSticker"].forEach((id) => {
    document.getElementById(id)?.addEventListener("change", renderQuoteSummary);
  });

  bizFileBtnEl?.addEventListener("click", () => bizFileEl?.click());
  bizFileEl?.addEventListener("change", handleBizFileChange);
  bizFileDelBtnEl?.addEventListener("click", clearBizFile);

  resetBtnEl?.addEventListener("click", resetQuotePage);

  submitQuoteBtnEl?.addEventListener("click", () => {
    if (!validateQuoteSubmit()) return;
    renderQuoteSummary();
    showToast?.("견적 요청 전송 준비까지 완료됐어요. 이제 EmailJS만 연결하면 됩니다.", "ok", 2400);
  });

  btnAddItemEl?.addEventListener("click", () => {
    clearFormNotice?.();
    if (!validateUserInfo?.(true)) return;
    addCurrentItemToCart?.();
    setTimeout(renderQuoteSummary, 0);
  });
}

function initQuotePage() {
  if (!quotePageEl.classList.contains("quotePage")) return;

  ensureQuoteOrderNo();
  if (typeof initPickr === "function") initPickr();
  if (typeof initProfileOptions === "function") initProfileOptions();
  if (typeof redraw === "function") redraw();

  updateQuoteFormReadyState();
  updateDraftInfo();
  syncKeyringOptions();
  bindQuoteEvents();
  syncProductUI();
  renderCart();
  renderQuoteSummary();
}

document.addEventListener("DOMContentLoaded", initQuotePage);
