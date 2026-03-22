/* =========================================================
 * 필드 에러 요소
========================================================= */
const fieldErr = {
  name: null,
  phone: null,
  order: null,
  email: null,
};

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

/* =========================================================
 * 필드 에러 표시
========================================================= */
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
 * 시안 제작 사용자 정보 검증
========================================================= */
function validateDesignUserInfo(showMessage = false) {
  const name = safeTrim(nameEl?.value);
  const phone = safeTrim(phoneEl?.value);
  const orderNo = safeTrim(orderEl?.value);
  const email = safeTrim(emailEl?.value);

  if (showMessage) {
    clearFieldErrors();
    clearFormNotice();
  }

  let ok = true;

  if (!name) {
    ok = false;
    if (showMessage) setFieldError("name", "주문자명을 입력해주세요.");
  }

  if (!PHONE_RE.test(phone)) {
    ok = false;
    if (showMessage) {
      setFieldError("phone", "핸드폰 번호 형식이 올바르지 않습니다. (예: 01012345678)");
    }
  }

  if (!/^[0-9]{16}$/.test(orderNo)) {
    ok = false;
    if (showMessage) {
      setFieldError("order", "주문번호 형식이 올바르지 않습니다. (숫자 16자리)");
    }
  }

  if (!EMAIL_RE.test(email)) {
    ok = false;
    if (showMessage) setFieldError("email", "이메일 형식이 올바르지 않습니다.");
  }

  if (showMessage) {
    setFormNotice(ok ? "" : "필수 정보를 입력해주세요.", ok ? "" : "error");
  }

  return ok;
}

/* =========================================================
 * 디자인 페이지 검증 별칭
========================================================= */
function validateUserInfo(showMessage = false) {
  return validateDesignUserInfo(showMessage);
}

/* =========================================================
 * 주문번호 입력 제한
========================================================= */
orderEl?.addEventListener("input", () => {
  orderEl.value = orderEl.value.replace(/[^0-9]/g, "").slice(0, 16);
});

/* =========================================================
 * 핸드폰 번호 입력 제한
========================================================= */
phoneEl?.addEventListener("input", () => {
  phoneEl.value = phoneEl.value.replace(/[^0-9]/g, "").slice(0, 11);
});

/* =========================================================
 * 시안 최종 확정 가능 여부 검증
========================================================= */
function validateCanConfirm(showMessage = false) {
  if (!validateDesignUserInfo(showMessage)) return false;

  if (!Array.isArray(cartItems) || !cartItems.length) {
    if (showMessage) showToast?.("시안 리스트에 시안을 추가해주세요.", "warn");
    return false;
  }

  if (!cartItems.some((it) => hasDesign(it))) {
    if (showMessage) {
      showToast?.("최소 1개 이상 이미지 또는 배경색이 포함된 시안이 필요합니다.", "warn");
    }
    return false;
  }

  return true;
}

/* =========================================================
 * 주문번호 잠금 키
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

/* =========================================================
 * 전체 UI 잠금 처리
========================================================= */
function setAllLocked(locked) {
  uiLocked = !!locked;

  const lockEls = [
    nameEl,
    phoneEl,
    orderEl,
    emailEl,
    profileEl,
    capTypeEl,
    laserEl,
    qtyEl,
    fileEl,
    fileBtn,
    fileDelBtn,
    bgPickBtn,
    bgEyeBtn,
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
    // 접수 완료 주문은 팝업/잠금으로만 안내
  }
}

/* =========================================================
 * 주문번호 확정 잠금 적용
========================================================= */
async function applyConfirmedLockIfNeeded(showPopup = false) {
  const orderNo = safeTrim(orderEl?.value || "");
  const locked = isOrderConfirmed(orderNo);

  if (!locked) {
    setAllLocked(false);
    didConfirmedPopup = false;
    updateActionLocks();
    return false;
  }

  setAllLocked(true);

  if (showPopup && !didConfirmedPopup) {
    didConfirmedPopup = true;

    if (typeof openNoticeModal === "function") {
      await openNoticeModal("이미 시안이 접수된 주문번호입니다.", "접수 완료 주문");
    } else {
      alert("이미 시안이 접수된 주문번호입니다.");
    }
  }

  return true;
}

/* =========================================================
 * 버튼 잠금 / 활성 상태 갱신
========================================================= */
function updateActionLocks() {
  const hasUserInfo = validateUserInfo(false);
  const hasCanvasDesign = !!userImg || !!draftBgSet;
  const hasAnyDesign = Array.isArray(cartItems) && cartItems.some((it) => hasDesign(it));

  if (uiLocked) {
    if (fileBtn) fileBtn.disabled = true;
    if (fileEl) fileEl.disabled = true;
    if (fileDelBtn) fileDelBtn.disabled = true;
    if (bgPickBtn) bgPickBtn.disabled = true;
    if (bgEyeBtn) bgEyeBtn.disabled = true;
    if (btnAddItemEl) btnAddItemEl.disabled = true;
    if (btnConfirmEl) btnConfirmEl.disabled = true;
    return;
  }

  if (!hasUserInfo) {
    if (fileBtn) fileBtn.disabled = true;
    if (fileEl) fileEl.disabled = true;
    if (fileDelBtn) fileDelBtn.disabled = true;
    if (bgPickBtn) bgPickBtn.disabled = true;
    if (bgEyeBtn) bgEyeBtn.disabled = true;
    if (btnAddItemEl) btnAddItemEl.disabled = true;
    if (btnConfirmEl) btnConfirmEl.disabled = true;

    clearFormNotice?.();
    clearCanvasNotice?.();
    return;
  }

  clearFormNotice?.();
  clearCanvasNotice?.();

  if (fileBtn) fileBtn.disabled = false;
  if (fileEl) fileEl.disabled = false;
  if (fileDelBtn) fileDelBtn.disabled = false;
  if (bgPickBtn) bgPickBtn.disabled = false;
  if (bgEyeBtn) bgEyeBtn.disabled = false;

  if (typeof updateBgLockUI === "function") {
    updateBgLockUI(profileEl?.value, laserEl?.value);
  }

  if (fileDelBtn && !userImg) {
    fileDelBtn.disabled = true;
  }

  if (btnAddItemEl) {
    btnAddItemEl.disabled = !hasCanvasDesign;
  }

  if (btnConfirmEl) {
    btnConfirmEl.disabled = !hasAnyDesign;
  }
}
