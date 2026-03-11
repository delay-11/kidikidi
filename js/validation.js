/* =========================================================
 * 필드 에러 처리
========================================================= */
function ensureFieldErrorBox(inputEl, key) {
  if (!inputEl) return null;
  const wrap = inputEl.parentElement;
  if (!wrap) return null;

  let box = wrap.querySelector(`.fieldErr[data-err="${key}"]`);
  if (box) return box;

  box = document.createElement("div");
  box.className = "fieldErr";
  box.dataset.err = key;
  wrap.appendChild(box);
  return box;
}

fieldErr.name = ensureFieldErrorBox(nameEl, "name");
fieldErr.phone = ensureFieldErrorBox(phoneEl, "phone");
fieldErr.order = ensureFieldErrorBox(orderEl, "order");
fieldErr.email = ensureFieldErrorBox(emailEl, "email");

function setInputInvalid(inputEl, isInvalid) {
  if (!inputEl) return;
  inputEl.classList.toggle("inputInvalid", !!isInvalid);
}

function setFieldError(key, message) {
  const box = fieldErr[key];
  if (!box) return;

  const mapInput = {
    name: nameEl,
    phone: phoneEl,
    order: orderEl,
    email: emailEl,
  };

  if (!message) {
    box.textContent = "";
    box.classList.remove("show");
    setInputInvalid(mapInput[key], false);
    return;
  }

  box.textContent = message;
  box.classList.add("show");
  setInputInvalid(mapInput[key], true);
}

function clearFieldErrors() {
  setFieldError("name", "");
  setFieldError("phone", "");
  setFieldError("order", "");
  setFieldError("email", "");
}

/* =========================================================
 * 잠금 / 주문번호 확인
========================================================= */
function getOrderFromUrl() {
  try {
    const sp = new URLSearchParams(location.search);
    return safeTrim(sp.get("order") || "");
  } catch {
    return "";
  }
}

function confirmKey(orderNo) {
  return CONFIRM_KEY_PREFIX + safeTrim(orderNo || "");
}

function isOrderConfirmed(orderNo) {
  const o = safeTrim(orderNo || "");
  if (!o) return false;
  return localStorage.getItem(confirmKey(o)) === "true";
}

function markOrderConfirmed(orderNo) {
  const o = safeTrim(orderNo || "");
  if (!o) return;
  localStorage.setItem(confirmKey(o), "true");
}

function setAllLocked(locked) {
  uiLocked = !!locked;

  const lockEls = [
    nameEl,
    phoneEl,
    orderEl,
    emailEl,

    quoteToggleEl,
    quoteProdEl,
    quoteDueEl,
    bizFileEl,
    bizFileBtn,

    keyringQtyEl,
    keyringLedEl,
    keyringColorEl,
    keyringSlotsEl,
    packTypeEl,
    packSheetEl,
    packStickerEl,
    quoteNotesEl,

    profileEl,
    capTypeEl,
    laserEl,
    qtyEl,

    fileEl,
    fileBtn,
    fileDelBtn,

    bgPickBtn,

    btnAddItemEl,
    btnConfirmEl,
  ];

  lockEls.forEach((el) => {
    if (!el) return;
    el.disabled = uiLocked;
  });

  if (cartListEl) {
    cartListEl.style.pointerEvents = uiLocked ? "none" : "auto";
    cartListEl.style.opacity = uiLocked ? "0.55" : "1";
  }

  if (canvasWrapEl) {
    canvasWrapEl.style.pointerEvents = uiLocked ? "none" : "auto";
    canvasWrapEl.style.opacity = uiLocked ? "0.55" : "1";
  }

  if (bboxEl) {
    bboxEl.style.pointerEvents = uiLocked ? "none" : "auto";
  }

  if (uiLocked) {
    setOk("이미 시안이 접수된 주문번호입니다.");
    setMsg("");
  }
}

function applyConfirmedLockIfNeeded(showPopup = false) {
  const orderNo = safeTrim(orderEl?.value || "");
  const locked = isOrderConfirmed(orderNo);

  if (!locked) {
    setAllLocked(false);
    return false;
  }

  setAllLocked(true);

  if (showPopup && !didConfirmedPopup) {
    didConfirmedPopup = true;
    alert("이미 시안 확정된 주문번호입니다");
  }

  return true;
}

/* =========================================================
 * 검증
========================================================= */
function validateUserInfo(showMessage = false) {
  const name = safeTrim(nameEl.value);
  const phone = safeTrim(phoneEl.value);
  const orderNo = safeTrim(orderEl.value);
  const email = safeTrim(emailEl.value);

  if (showMessage) clearFieldErrors();

  let ok = true;

  if (!name) {
    ok = false;
    if (showMessage) setFieldError("name", "주문자명을 입력해주세요.");
  }
  if (!PHONE_RE.test(phone)) {
    ok = false;
    if (showMessage) {
      setFieldError(
        "phone",
        "핸드폰 번호 형식이 올바르지 않습니다. (예: 010-1234-5678)",
      );
    }
  }
  if (!orderNo) {
    ok = false;
    if (showMessage) setFieldError("order", "주문번호를 입력해주세요.");
  }
  if (!EMAIL_RE.test(email)) {
    ok = false;
    if (showMessage) setFieldError("email", "이메일 형식이 올바르지 않습니다.");
  }

  if (showMessage) setMsg(ok ? "" : "필수 정보를 입력해주세요.");
  return ok;
}

function validateQuoteRequest(showMessage = false) {
  if (!quoteEnabled) return true;

  if (!quoteProd || quoteProd === "") {
    if (showMessage) setMsg("제작 일정을 선택해주세요.");
    return false;
  }
  if (!quoteDue) {
    if (showMessage) setMsg("희망 납기일을 선택해주세요.");
    return false;
  }
  if (!bizFileDataUrl) {
    if (showMessage) setMsg("사업자등록증 파일 업로드가 필요합니다.");
    return false;
  }

  const kQty = Math.max(0, toInt(keyringQtyEl?.value ?? keyringQty, 0));
  if (kQty > 0) {
    const led = safeTrim(keyringLedEl?.value ?? keyringLed) || "none";
    if (led === "none") {
      if (showMessage)
        setMsg("키캡 키링 수량이 있으면 LED 유무를 선택해주세요.");
      return false;
    }
  }

  return true;
}

function validateCanConfirm(showMessage = false) {
  if (!validateUserInfo(showMessage)) return false;

  if (cartItems.length === 0) {
    if (showMessage) setMsg("장바구니에 아이템을 추가해주세요.");
    return false;
  }

  if (!cartItems.some((it) => hasDesign(it))) {
    if (showMessage) setMsg("최소 1개 이상 배경색 또는 이미지를 설정해주세요.");
    return false;
  }

  if (!validateQuoteRequest(showMessage)) return false;
  return true;
}

/* =========================================================
 * 버튼 잠금/활성
========================================================= */
function updateActionLocks() {
  if (uiLocked) {
    if (btnAddItemEl) btnAddItemEl.disabled = true;
    if (btnConfirmEl) btnConfirmEl.disabled = true;
    if (fileDelBtn) fileDelBtn.disabled = true;
    return;
  }

  btnAddItemEl.disabled = !validateUserInfo(false);
  btnConfirmEl.disabled = !validateCanConfirm(false);

  const it = cartItems.find((x) => x.id === selectedItemId);
  if (fileDelBtn) {
    fileDelBtn.disabled = !(it && it.design && it.design.imgDataUrl);
  }
}
