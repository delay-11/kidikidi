/* =========================================================
 * 선택 요소 안전 참조
========================================================= */
const quoteToggleSafeEl =
  typeof quoteToggleEl !== "undefined" ? quoteToggleEl : null;
const quoteProdSafeEl = typeof quoteProdEl !== "undefined" ? quoteProdEl : null;
const quoteDueSafeEl = typeof quoteDueEl !== "undefined" ? quoteDueEl : null;
const bizFileSafeEl = typeof bizFileEl !== "undefined" ? bizFileEl : null;
const bizFileBtnSafeEl = typeof bizFileBtn !== "undefined" ? bizFileBtn : null;

const keyringQtySafeEl =
  typeof keyringQtyEl !== "undefined" ? keyringQtyEl : null;
const keyringLedSafeEl =
  typeof keyringLedEl !== "undefined" ? keyringLedEl : null;
const keyringColorSafeEl =
  typeof keyringColorEl !== "undefined" ? keyringColorEl : null;
const keyringSlotsSafeEl =
  typeof keyringSlotsEl !== "undefined" ? keyringSlotsEl : null;
const packTypeSafeEl = typeof packTypeEl !== "undefined" ? packTypeEl : null;
const packSheetSafeEl = typeof packSheetEl !== "undefined" ? packSheetEl : null;
const packStickerSafeEl =
  typeof packStickerEl !== "undefined" ? packStickerEl : null;
const quoteNotesSafeEl =
  typeof quoteNotesEl !== "undefined" ? quoteNotesEl : null;

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
    if (showMessage) {
      setFieldError("name", "주문자명을 입력해주세요.");
    }
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

  if (!/^[0-9]{16}$/.test(orderNo)) {
    ok = false;
    if (showMessage) {
      setFieldError(
        "order",
        "주문번호 형식이 올바르지 않습니다. (숫자 16자리)",
      );
    }
  }

  if (!EMAIL_RE.test(email)) {
    ok = false;
    if (showMessage) {
      setFieldError("email", "이메일 형식이 올바르지 않습니다.");
    }
  }

  if (showMessage) {
    setFormNotice(ok ? "" : "필수 정보를 입력해주세요.", ok ? "" : "error");
  }

  return ok;
}

/* =========================================================
 * 견적 요청 사용자 정보 검증
========================================================= */
function validateQuoteUserInfo(showMessage = false) {
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
    if (showMessage) {
      setFieldError("name", "주문자명을 입력해주세요.");
    }
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

  if (orderNo && !/^[0-9]{16}$/.test(orderNo)) {
    ok = false;
    if (showMessage) {
      setFieldError(
        "order",
        "주문번호 형식이 올바르지 않습니다. (숫자 16자리)",
      );
    }
  }

  if (!EMAIL_RE.test(email)) {
    ok = false;
    if (showMessage) {
      setFieldError("email", "이메일 형식이 올바르지 않습니다.");
    }
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
 * 견적 요청 검증
========================================================= */
function validateQuoteRequest(showMessage = false) {
  if (!validateQuoteUserInfo(showMessage)) return false;

  const prodValue = safeTrim(quoteProdSafeEl?.value ?? quoteProd) || "none";
  const dueValue = safeTrim(quoteDueSafeEl?.value ?? quoteDue);

  if (!prodValue || prodValue === "none") {
    if (showMessage) {
      setFormNotice("제작 일정을 선택해주세요.", "error");
    }
    return false;
  }

  if (!dueValue) {
    if (showMessage) {
      setFormNotice("희망 납기일을 선택해주세요.", "error");
    }
    return false;
  }

  if (!bizFileDataUrl) {
    if (showMessage) {
      setFormNotice("사업자등록증 파일 업로드가 필요합니다.", "error");
    }
    return false;
  }

  const kQty = Math.max(0, toInt(keyringQtySafeEl?.value ?? keyringQty, 0));
  if (kQty > 0) {
    const led = safeTrim(keyringLedSafeEl?.value ?? keyringLed) || "none";

    if (led === "none") {
      if (showMessage) {
        setFormNotice(
          "키캡 키링 수량이 있으면 LED 유무를 선택해주세요.",
          "error",
        );
      }
      return false;
    }
  }

  return true;
}

/* =========================================================
 * 시안 최종 확정 가능 여부 검증
========================================================= */
function validateCanConfirm(showMessage = false) {
  if (!validateDesignUserInfo(showMessage)) return false;

  if (!Array.isArray(cartItems) || !cartItems.length) {
    if (showMessage) setMsg("장바구니에 시안을 추가해주세요.");
    return false;
  }

  if (!cartItems.some((it) => hasDesign(it))) {
    if (showMessage) {
      setMsg("최소 1개 이상 이미지 또는 배경색이 포함된 시안이 필요합니다.");
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

    quoteToggleSafeEl,
    quoteProdSafeEl,
    quoteDueSafeEl,
    bizFileSafeEl,
    bizFileBtnSafeEl,

    keyringQtySafeEl,
    keyringLedSafeEl,
    keyringColorSafeEl,
    keyringSlotsSafeEl,
    packTypeSafeEl,
    packSheetSafeEl,
    packStickerSafeEl,
    quoteNotesSafeEl,

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
    setOk("이미 시안이 접수된 주문번호입니다.");
    setMsg("");
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
      await openNoticeModal(
        "이미 시안이 접수된 주문번호입니다.",
        "접수 완료 주문",
      );
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
  const hasAnyDesign =
    Array.isArray(cartItems) && cartItems.some((it) => hasDesign(it));

  /* 접수 완료 잠금 */
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

  /* 1. 주문자 정보 전: 전부 잠금 */
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

  /* 2. ? 전: 전부 잠금 */
  if (!didReadProfileTooltip) {
    if (fileBtn) fileBtn.disabled = true;
    if (fileEl) fileEl.disabled = true;
    if (fileDelBtn) fileDelBtn.disabled = true;
    if (bgPickBtn) bgPickBtn.disabled = true;
    if (bgEyeBtn) bgEyeBtn.disabled = true;
    if (btnAddItemEl) btnAddItemEl.disabled = true;
    if (btnConfirmEl) btnConfirmEl.disabled = true;

    setFormNotice?.("먼저 ? 안내를 확인해주세요.", "error");
    clearCanvasNotice?.();
    return;
  }

  clearFormNotice?.();

  /* 3. ! 전: 캔버스 관련 전부 잠금 */
  if (!didReadUploadTooltip) {
    if (fileBtn) fileBtn.disabled = true;
    if (fileEl) fileEl.disabled = true;
    if (fileDelBtn) fileDelBtn.disabled = true;
    if (bgPickBtn) bgPickBtn.disabled = true;
    if (bgEyeBtn) bgEyeBtn.disabled = true;
    if (btnAddItemEl) btnAddItemEl.disabled = true;
    if (btnConfirmEl) btnConfirmEl.disabled = true;

    setCanvasNotice?.("이미지 업로드 전 ! 안내를 먼저 확인해주세요.", "error");
    return;
  }

  /* 4. ! 후: 캔버스 전부 활성 */
  clearCanvasNotice?.();

  if (fileBtn) fileBtn.disabled = false;
  if (fileEl) fileEl.disabled = false;
  if (fileDelBtn) fileDelBtn.disabled = false;
  if (bgPickBtn) bgPickBtn.disabled = false;
  if (bgEyeBtn) bgEyeBtn.disabled = false;

  /* OEM 레이저 조건 때문에 배경 관련 잠금이 필요하면 여기서만 덮어쓰기 */
  if (typeof updateBgLockUI === "function") {
    updateBgLockUI(profileEl?.value, laserEl?.value);
  }

  /* 삭제 버튼은 이미지 없으면 다시 잠금 */
  if (fileDelBtn && !userImg) {
    fileDelBtn.disabled = true;
  }

  /* 5. 이미지 또는 배경 있으면 시안 추가 */
  if (btnAddItemEl) {
    btnAddItemEl.disabled = !hasCanvasDesign;
  }

  /* 6. 시안 추가된 뒤에만 시안 확정 */
  if (btnConfirmEl) {
    btnConfirmEl.disabled = !hasAnyDesign;
  }
}
