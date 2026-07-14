/* moved from js/design/design-validation.js */
/* =========================================================
 * 필드 에러 요소
========================================================= */
const fieldErr = {
  name: null,
  phone: null,
  order: null,
  email: null,
};

/* =========================================================
 * URL 주문번호 고정값
========================================================= */
let fixedOrderNo = "";

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

fixedOrderNo = getOrderFromUrl();

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
  const orderNo = safeTrim(fixedOrderNo || orderEl?.value);
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
      setFieldError(
        "phone",
        "핸드폰 번호 형식이 올바르지 않습니다. (예: 01012345678)",
      );
    }
  }

  if (!orderNo) {
    ok = false;
    if (showMessage) {
      setFieldError("order", "주문번호를 입력해주세요.");
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
 * 주문번호 입력
========================================================= */
orderEl?.addEventListener("input", () => {
  if (orderEl.readOnly) return;
  orderEl.value = orderEl.value.replace(/[^0-9]/g, "");
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
      showToast?.(
        "최소 1개 이상 이미지 또는 배경색이 포함된 시안이 필요합니다.",
        "warn",
      );
    }
    return false;
  }

  return true;
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
    imageCenterBtn,
    bgPickBtn,
    bgEyeBtn,
    typeof solidNativeColorEl !== "undefined" ? solidNativeColorEl : null,
    typeof solidHexInputEl !== "undefined" ? solidHexInputEl : null,
    bgModeSolidBtn,
    bgModeGradientBtn,
    gradientColor1El,
    gradientColor2El,
    gradientPositionRangeEl,
    gradientSoftnessRangeEl,
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
  const orderNo = safeTrim(fixedOrderNo || orderEl?.value || "");
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
      await openNoticeModal(
        `시안 접수가 완료되었습니다.

이메일을 확인하시면 확정 안내 메일과
접수된 시안을 확인하실 수 있습니다.`,
        "접수 완료 주문",
      );
    } else {
      alert(
        "시안 접수가 완료되었습니다. 이메일을 확인하시면 확정 안내 메일과 접수된 시안을 확인하실 수 있습니다.",
      );
    }
  }

  return true;
}

/* =========================================================
 * 버튼 잠금 / 활성 상태 갱신
========================================================= */
function updateActionLocks() {
  const hasUserInfo = validateUserInfo(false);
  const hasCanvasDesign = !!(typeof hasImageObject === "function" ? hasImageObject() : userImg) || !!draftBgSet || !!(typeof hasTextObject === "function" && hasTextObject());
  const hasAnyDesign =
    Array.isArray(cartItems) && cartItems.some((it) => hasDesign(it));

  if (uiLocked) {
    if (fileBtn) fileBtn.disabled = true;
    if (fileEl) fileEl.disabled = true;
    if (fileDelBtn) fileDelBtn.disabled = true;
    if (imageCenterBtn) imageCenterBtn.disabled = true;
    if (bgPickBtn) bgPickBtn.disabled = true;
    if (bgEyeBtn) bgEyeBtn.disabled = true;
    if (typeof solidNativeColorEl !== "undefined" && solidNativeColorEl) solidNativeColorEl.disabled = true;
    if (typeof solidHexInputEl !== "undefined" && solidHexInputEl) solidHexInputEl.disabled = true;
    if (bgModeSolidBtn) {
      bgModeSolidBtn.disabled = true;
      setSoftDisabled?.(bgModeSolidBtn, true);
    }
    if (bgModeGradientBtn) {
      bgModeGradientBtn.disabled = true;
      setSoftDisabled?.(bgModeGradientBtn, true);
    }
    if (gradientColor1El) gradientColor1El.disabled = true;
    if (gradientColor2El) gradientColor2El.disabled = true;
    if (gradientPositionRangeEl) gradientPositionRangeEl.disabled = true;
    if (gradientSoftnessRangeEl) gradientSoftnessRangeEl.disabled = true;
    gradientDirBtnEls?.forEach((btn) => (btn.disabled = true));
    if (textApplyBtnEl) textApplyBtnEl.disabled = true;
    if (textClearBtnEl) textClearBtnEl.disabled = true;
    if (textColorBtnEl) textColorBtnEl.disabled = true;
    textFontBtnEls?.forEach((btn) => (btn.disabled = true));
    textAlignBtnEls?.forEach((btn) => (btn.disabled = true));
    textSizeBtnEls?.forEach((btn) => (btn.disabled = true));
    if (btnAddItemEl) btnAddItemEl.disabled = true;
    if (btnConfirmEl) btnConfirmEl.disabled = true;
    return;
  }

  if (!hasUserInfo) {
    if (fileBtn) fileBtn.disabled = true;
    if (fileEl) fileEl.disabled = true;
    if (fileDelBtn) fileDelBtn.disabled = true;
    if (imageCenterBtn) imageCenterBtn.disabled = true;
    if (bgPickBtn) bgPickBtn.disabled = true;
    if (bgEyeBtn) bgEyeBtn.disabled = true;
    if (typeof solidNativeColorEl !== "undefined" && solidNativeColorEl) solidNativeColorEl.disabled = true;
    if (typeof solidHexInputEl !== "undefined" && solidHexInputEl) solidHexInputEl.disabled = true;
    if (bgModeSolidBtn) {
      bgModeSolidBtn.disabled = false;
      setSoftDisabled?.(bgModeSolidBtn, true);
    }
    if (bgModeGradientBtn) {
      bgModeGradientBtn.disabled = false;
      setSoftDisabled?.(bgModeGradientBtn, true);
    }
    if (gradientColor1El) gradientColor1El.disabled = true;
    if (gradientColor2El) gradientColor2El.disabled = true;
    if (gradientPositionRangeEl) gradientPositionRangeEl.disabled = true;
    if (gradientSoftnessRangeEl) gradientSoftnessRangeEl.disabled = true;
    gradientDirBtnEls?.forEach((btn) => (btn.disabled = true));
    if (textApplyBtnEl) textApplyBtnEl.disabled = true;
    if (textClearBtnEl) textClearBtnEl.disabled = true;
    if (textColorBtnEl) textColorBtnEl.disabled = true;
    textFontBtnEls?.forEach((btn) => (btn.disabled = true));
    textAlignBtnEls?.forEach((btn) => (btn.disabled = true));
    textSizeBtnEls?.forEach((btn) => (btn.disabled = true));
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
  if (imageCenterBtn) imageCenterBtn.disabled = false;
  if (bgPickBtn) bgPickBtn.disabled = false;
  if (bgEyeBtn) bgEyeBtn.disabled = false;
  if (typeof solidNativeColorEl !== "undefined" && solidNativeColorEl) solidNativeColorEl.disabled = false;
  if (typeof solidHexInputEl !== "undefined" && solidHexInputEl) solidHexInputEl.disabled = false;
  if (bgModeSolidBtn) {
    bgModeSolidBtn.disabled = false;
    setSoftDisabled?.(bgModeSolidBtn, false);
  }
  if (bgModeGradientBtn) {
    bgModeGradientBtn.disabled = false;
    setSoftDisabled?.(bgModeGradientBtn, false);
  }
  if (gradientColor1El) gradientColor1El.disabled = false;
  if (gradientColor2El) gradientColor2El.disabled = false;
  if (gradientPositionRangeEl) gradientPositionRangeEl.disabled = false;
  if (gradientSoftnessRangeEl) gradientSoftnessRangeEl.disabled = false;
  gradientDirBtnEls?.forEach((btn) => (btn.disabled = false));
  if (textApplyBtnEl) textApplyBtnEl.disabled = false;
  if (textColorBtnEl) textColorBtnEl.disabled = false;
  textFontBtnEls?.forEach((btn) => (btn.disabled = false));
  textAlignBtnEls?.forEach((btn) => (btn.disabled = false));
  textSizeBtnEls?.forEach((btn) => (btn.disabled = false));
  syncTextUI?.();

  if (typeof updateBgLockUI === "function") {
    updateBgLockUI(profileEl?.value, laserEl?.value);
  }

  if (!(typeof hasImageObject === "function" ? hasImageObject() : userImg)) {
    if (fileDelBtn) fileDelBtn.disabled = true;
    if (imageCenterBtn) imageCenterBtn.disabled = true;
  }

  if (btnAddItemEl) {
    btnAddItemEl.disabled = !hasCanvasDesign;
    btnAddItemEl.textContent = selectedItemId ? "시안 수정 완료" : "시안 추가";
  }

  if (btnConfirmEl) {
    btnConfirmEl.disabled = !hasAnyDesign;
  }

  updateStepButtons?.();
}
