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
 * 사용자 정보 검증
========================================================= */
function validateUserInfo(showMessage = false) {
  const name = safeTrim(nameEl.value);
  const phone = safeTrim(phoneEl.value);
  const orderNo = safeTrim(orderEl.value);
  const email = safeTrim(emailEl.value);

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
        "핸드폰 번호 형식이 올바르지 않습니다. (예: 010-1234-5678)",
      );
    }
  }

  if (quoteEnabled) {
    // 견적 요청일 때는 주문번호 선택
    if (orderNo && !/^[0-9]{16}$/.test(orderNo)) {
      ok = false;
      if (showMessage) {
        setFieldError(
          "order",
          "주문번호 형식이 올바르지 않습니다. (숫자 16자리)",
        );
      }
    }
  } else {
    // 일반 주문은 필수
    if (!/^[0-9]{16}$/.test(orderNo)) {
      ok = false;
      if (showMessage) {
        setFieldError(
          "order",
          "주문번호 형식이 올바르지 않습니다. (숫자 16자리)",
        );
      }
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
 * 주문번호 입력 제한
========================================================= */
orderEl?.addEventListener("input", () => {
  orderEl.value = orderEl.value.replace(/[^0-9]/g, "").slice(0, 16);
});

/* =========================================================
 * 견적 요청 검증
========================================================= */
function validateQuoteRequest(showMessage = false) {
  if (!quoteEnabled) return true;

  if (!quoteProd || quoteProd === "") {
    if (showMessage) {
      setFormNotice("제작 일정을 선택해주세요.", "error");
    }
    return false;
  }

  if (!quoteDue) {
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

  const kQty = Math.max(0, toInt(keyringQtyEl?.value ?? keyringQty, 0));
  if (kQty > 0) {
    const led = safeTrim(keyringLedEl?.value ?? keyringLed) || "none";
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
 * 최종 확정 가능 여부 검증
========================================================= */
function validateCanConfirm(showMessage = false) {
  if (!validateUserInfo(showMessage)) return false;

  if (cartItems.length === 0) {
    if (showMessage) setMsg("장바구니에 아이템을 추가해주세요.");
    return false;
  }

  if (!cartItems.some((it) => hasDesign(it))) {
    if (showMessage) {
      setMsg("최소 1개 이상 배경색 또는 이미지를 설정해주세요.");
    }
    return false;
  }

  if (!validateQuoteRequest(showMessage)) return false;

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
    /* 주문자 정보 */
    nameEl,
    phoneEl,
    orderEl,
    emailEl,

    /* 견적 기본 */
    quoteToggleEl,
    quoteProdEl,
    quoteDueEl,
    bizFileEl,
    bizFileBtn,

    /* 견적 추가 옵션 */
    keyringQtyEl,
    keyringLedEl,
    keyringColorEl,
    keyringSlotsEl,
    packTypeEl,
    packSheetEl,
    packStickerEl,
    quoteNotesEl,

    /* 시안 옵션 */
    profileEl,
    capTypeEl,
    laserEl,
    qtyEl,

    /* 캔버스 편집 */
    fileEl,
    fileBtn,
    fileDelBtn,
    bgPickBtn,

    /* 액션 버튼 */
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

async function applyConfirmedLockIfNeeded(showPopup = false) {
  const orderNo = safeTrim(orderEl?.value || "");
  const locked = isOrderConfirmed(orderNo);

  if (!locked) {
    setAllLocked(false);
    didConfirmedPopup = false;
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
  if (uiLocked) {
    if (btnAddItemEl) btnAddItemEl.disabled = true;
    if (btnConfirmEl) btnConfirmEl.disabled = true;

    if (fileBtn) fileBtn.disabled = true;
    if (fileEl) fileEl.disabled = true;
    if (bgPickBtn) bgPickBtn.disabled = true;
    if (fileDelBtn) fileDelBtn.disabled = true;

    return;
  }

  const hasUserInfo = validateUserInfo(false);
  const hasCanvasDesign = !!userImg || !!draftBgSet;
  const hasAnyDesign = cartItems.some((it) => hasDesign(it));

  /* 주문자 정보 입력 전 : 전체 막기 */
  if (!hasUserInfo) {
    if (btnAddItemEl) btnAddItemEl.disabled = true;
    if (btnConfirmEl) btnConfirmEl.disabled = true;

    if (fileBtn) fileBtn.disabled = true;
    if (fileEl) fileEl.disabled = true;
    if (bgPickBtn) bgPickBtn.disabled = true;
    if (fileDelBtn) fileDelBtn.disabled = true;

    return;
  }

  /* 주문자 정보 입력 후 : 이미지 업로드 / 배경 설정 가능 */
  if (fileBtn) fileBtn.disabled = false;
  if (fileEl) fileEl.disabled = false;
  if (bgPickBtn) bgPickBtn.disabled = false;

  /* 이미지 또는 배경 설정 후 : 새 시안 추가 가능 */
  if (btnAddItemEl) {
    btnAddItemEl.disabled = !hasCanvasDesign;
  }

  /* 현재 캔버스에 이미지 있을 때만 삭제 가능 */
  if (fileDelBtn) {
    fileDelBtn.disabled = !userImg;
  }

  /* 장바구니에 디자인이 하나라도 있어야 시안 확정 가능 */
  if (btnConfirmEl) {
    btnConfirmEl.disabled = !(hasAnyDesign && validateCanConfirm(false));
  }
}
