/* moved from js/design/app-design.js */
/* =========================================================
 * 폼 준비 상태 텍스트 갱신
========================================================= */
let lastFormReadyState = null;

function updateFormReadyState() {
  if (
    !formReadyBoxEl ||
    !formReadyTitleEl ||
    !formReadyDescEl ||
    !nameEl ||
    !phoneEl ||
    !orderEl ||
    !emailEl
  ) {
    return;
  }

  const hasName = !!safeTrim(nameEl.value);
  const hasPhone = PHONE_RE.test(safeTrim(phoneEl.value));
  const hasOrder = !!safeTrim(orderEl.value);
  const hasEmail = EMAIL_RE.test(safeTrim(emailEl.value));

  const ready = hasName && hasPhone && hasOrder && hasEmail;

  formReadyBoxEl.classList.toggle("is-ready", ready);

  if (ready) {
    formReadyTitleEl.textContent = "주문한 프로파일/규격을 선택하세요";
    formReadyDescEl.textContent = "";

    if (lastFormReadyState === false) {
      showToast?.("주문한 프로파일/규격을 선택하세요", "ok", 2200);
    }
  } else {
    formReadyTitleEl.textContent = "주문자 정보 입력이 필요합니다.";
    formReadyDescEl.textContent =
      "주문자명, 연락처, 주문번호, 이메일을 모두 입력해주세요.";
  }

  lastFormReadyState = ready;
}

/* =========================================================
 * 공통 입력 이벤트 바인딩
========================================================= */
function bindCustomerFieldEvents() {
  [nameEl, phoneEl, orderEl, emailEl].forEach((el) => {
    if (!el) return;

    el.addEventListener("input", () => {
      if (el === orderEl && orderEl.readOnly) return;
      if (uiLocked && el !== orderEl) return;

      if (typeof updateActionLocks === "function") updateActionLocks();
      if (typeof updateConfirmButtonState === "function") updateConfirmButtonState();

      if (el === orderEl) {
        if (typeof syncOrderConfirmState === "function") syncOrderConfirmState();
      }

      if (typeof updateFormReadyState === "function") updateFormReadyState();
      if (typeof updateStepButtons === "function") updateStepButtons();
    });

    el.addEventListener("blur", async () => {
      if (el === orderEl && orderEl.readOnly) return;
      if (uiLocked && el !== orderEl) return;

      if (el === orderEl) {
        if (typeof syncOrderConfirmState === "function") syncOrderConfirmState();
      }

      (typeof validateUserInfo === "function" ? validateUserInfo(true) : true);
      if (typeof updateFormReadyState === "function") updateFormReadyState();
      if (typeof updateDraftInfo === "function") updateDraftInfo();
      if (typeof updateActionLocks === "function") updateActionLocks();
      if (typeof updateStepButtons === "function") updateStepButtons();

      if (el === orderEl) {
        await (typeof applyConfirmedLockIfNeeded === "function" ? applyConfirmedLockIfNeeded(true) : false);
      }
    });
  });
}

[profileEl, capTypeEl, laserEl, qtyEl].forEach((el) => {
  if (!el) return;

  const eventName = el.tagName === "SELECT" ? "change" : "input";

  el.addEventListener(eventName, () => {
    if (uiLocked) return;

    clearFormNotice?.();
    setMsg?.("");
    setOk?.("");

    if (typeof updateDraftInfo === "function") updateDraftInfo();
    if (typeof updateActionLocks === "function") updateActionLocks();
    if (typeof updateStepButtons === "function") updateStepButtons();
  });
});

/* =========================================================
 * 시안 액션 이벤트 바인딩
========================================================= */
function bindDesignActionEvents() {
  btnAddItemEl?.addEventListener("click", () => {
    if (uiLocked) return;

    clearFormNotice?.();
    setMsg?.("");
    setOk?.("");

    if (!(typeof validateUserInfo === "function" ? validateUserInfo(true) : true)) return;

    if (typeof addCurrentItemToCart === "function") {
      addCurrentItemToCart();
    }
  });

  btnConfirmEl?.addEventListener("click", () => {
    if (uiLocked) return;

    clearFormNotice?.();
    setMsg?.("");
    setOk?.("");

    if (!validateCanConfirm?.(true)) return;
    saveSelectedDraftItem?.();

    if (typeof openConfirmModal === "function") {
      openConfirmModal();
    } else if (typeof confirmOrder === "function") {
      confirmOrder();
    }
  });

  confirmModalCancelEl?.addEventListener("click", () => {
    if (typeof closeConfirmModal === "function") {
      closeConfirmModal();
    }
  });

  confirmModalEl?.addEventListener("click", (e) => {
    if (
      e.target === confirmModalEl ||
      e.target.classList.contains("confirmModalDim")
    ) {
      if (typeof closeConfirmModal === "function") {
        closeConfirmModal();
      }
    }
  });

  confirmModalOkEl?.addEventListener("click", async () => {
    if (confirmModalEl?.classList.contains("single")) {
      if (typeof closeConfirmModal === "function") {
        closeConfirmModal();
      }
      return;
    }

    if (uiLocked) return;

    clearFormNotice?.();
    setMsg?.("");
    setOk?.("");

    if (!validateCanConfirm?.(true)) return;

    if (typeof confirmOrder === "function") {
      await confirmOrder();
    }
  });
}

/* =========================================================
 * 시안 확정 처리
========================================================= */
async function confirmOrder() {
  if (uiLocked) return false;
  if (!validateCanConfirm?.(true)) return false;

  let confirmed = false;

  uiLocked = true;
  if (btnConfirmEl) btnConfirmEl.disabled = true;
  if (confirmModalOkEl) confirmModalOkEl.disabled = true;

  // 수정 이유: 첨부 렌더링 + 메일 발송이 끝날 때까지 걸리는 시간 동안
  // 화면이 멈춘 것처럼 보이지 않도록, 이미 열려있는 확정 모달을 로딩
  // 화면으로 전환한다 (기존의 짧게 뜨고 사라지는 토스트 대신).
  if (typeof showConfirmModalLoading === "function") showConfirmModalLoading();

  try {
    const result = await sendOrderEmails();

    if (!result?.ok) {
      const failMessage = result?.message || "시안 접수에 실패했습니다. 다시 시도해주세요.";

      // 수정 이유: 고객이 스스로 해결할 수 없는 시스템(EmailJS 계정/한도)
      // 문제는 토스트가 아니라 팝업으로 명확히 "관리자 문의"를 안내한다.
      // 그 외 사유(용량/네트워크 등)는 기존처럼 토스트로 안내하고, 모달은
      // 재시도할 수 있도록 확인 질문 상태로 되돌린다.
      if (result?.systemIssue && typeof openSystemErrorModal === "function") {
        openSystemErrorModal(failMessage);
      } else {
        if (typeof openConfirmModal === "function") openConfirmModal();
        showToast?.(
          failMessage,
          "error",
          // 수정 이유: 원인 카테고리 + 기술적 상세까지 붙어 문구가 길어졌으므로
          // 다 읽을 수 있도록 길이에 비례해 표시 시간을 늘림
          Math.min(3200 + failMessage.length * 25, 7000),
        );
      }
      return false;
    }

    const orderNo = safeTrim(
      (typeof fixedOrderNo !== "undefined" && fixedOrderNo) ||
        orderEl?.value ||
        "",
    );

    if (typeof markOrderConfirmed === "function") {
      markOrderConfirmed(orderNo);
    }

    if (typeof closeConfirmModal === "function") {
      closeConfirmModal();
    }

    if (typeof applyConfirmedLockIfNeeded === "function") {
      await applyConfirmedLockIfNeeded(true);
    }

    // 수정 이유: showToast()는 새 토스트를 띄우면서 이전 토스트를 바로
    // 지우기 때문에, 두 경고를 각각 showToast로 연달아 부르면 먼저 뜬
    // 것을 읽을 새도 없이 사라졌음 - 하나로 합쳐서 한 번에 보여준다.
    const warnings = [result?.originalFileWarning, result?.customerWarning].filter(Boolean);
    if (warnings.length) {
      const warningMessage = warnings.join(" / ");
      showToast?.(warningMessage, "warn", Math.min(2600 + warningMessage.length * 25, 7000));
    }

    confirmed = true;
    return true;
  } catch (err) {
    console.error(err);
    const detail = err?.message ? ` (오류 상세: ${err.message})` : "";
    if (typeof openConfirmModal === "function") openConfirmModal();
    showToast?.(`시안 접수 중 오류가 발생했습니다.${detail}`, "error", 3200);
    return false;
  } finally {
    if (!confirmed) {
      uiLocked = false;
      if (btnConfirmEl) btnConfirmEl.disabled = false;
      if (confirmModalOkEl) confirmModalOkEl.disabled = false;
      if (typeof updateActionLocks === "function") updateActionLocks();
    }
  }
}

/* =========================================================
 * 초기 렌더링
========================================================= */
async function initDesignPage() {
  if (typeof initPickr === "function") initPickr();
  if (typeof initProfileOptions === "function") initProfileOptions();

  const orderFromUrl =
    typeof getOrderFromUrl === "function" ? getOrderFromUrl() : "";

  if (orderEl && orderFromUrl) {
    orderEl.value = orderFromUrl.replace(/[^0-9]/g, "");
    orderEl.readOnly = true;
    orderEl.classList.add("isLockedOrder");
  }

  bindCustomerFieldEvents();
  bindDesignActionEvents();
  bindStepEvents?.();
  bindQuickOptionEvents?.();

  if (typeof renderCart === "function") renderCart();
  if (typeof redraw === "function") redraw();

  updateFormReadyState();
  if (typeof updateDraftInfo === "function") updateDraftInfo();
  if (typeof updateActionLocks === "function") updateActionLocks();
  setDesignStep?.("info");

  await (typeof applyConfirmedLockIfNeeded === "function" ? applyConfirmedLockIfNeeded(true) : false);
}

/* =========================================================
 * 시작
========================================================= */
document.addEventListener("DOMContentLoaded", () => {
  initDesignPage();
});


function saveSelectedDraftItem() {
  if (!selectedItemId || typeof saveCanvasToItem !== "function") return;

  // 수정 이유:
  // 시안 확정 직전에 선택된 시안의 옵션값까지 한 번 더 저장해서
  // 레이저 선택값과 실제 메일 첨부 조건이 어긋나지 않게 합니다.
  syncCanvasMetaFromForm?.();

  const it = cartItems.find((x) => x.id === selectedItemId);
  if (!it) return;
  saveCanvasToItem(it);
  renderCart?.();
}

/* =========================================================
 * 단계형 제작 플로우
========================================================= */
let currentStep = "info";

function setDesignStep(step) {
  const nextStep = ["info", "editor", "confirm"].includes(step) ? step : "info";
  currentStep = nextStep;

  document.body.dataset.step = nextStep;

  stepChipEls?.forEach((chip) => {
    chip.classList.toggle("is-active", chip.dataset.stepChip === nextStep);
  });

  window.scrollTo({ top: 0, behavior: "smooth" });

  if (nextStep === "editor") {
    // 수정 이유: 텍스트 위주 "인쇄 가이드" 팝업은 사람들이 잘 안 읽고 넘길
    // 가능성이 높아서, 실제 화면 위에 빨간 테두리로 각 UI 요소를 직접
    // 가리키는 온보딩 오버레이로 대체합니다. 인쇄 가이드 모달 자체와
    // #openPrintGuideBtn 수동 클릭 동작은 그대로 유지됩니다.
    window.setTimeout(() => {
      window.openEditorOnboardingTour?.();
    }, 180);
  }

  if (typeof updateStepButtons === "function") updateStepButtons();
}

function updateStepButtons() {
  const hasUserInfo = (typeof validateUserInfo === "function" ? validateUserInfo(false) : false) || false;
  const hasAnyDesign =
    Array.isArray(cartItems) && cartItems.some((it) => hasDesign?.(it));

  if (btnGoEditorEl) btnGoEditorEl.disabled = uiLocked || !hasUserInfo;
  if (btnGoConfirmEl) btnGoConfirmEl.disabled = uiLocked || !hasAnyDesign;
}

function bindStepEvents() {
  btnGoEditorEl?.addEventListener("click", () => {
    if (uiLocked) return;
    if (!(typeof validateUserInfo === "function" ? validateUserInfo(true) : true)) return;
    setDesignStep("editor");
  });

  btnBackInfoEl?.addEventListener("click", () => {
    if (uiLocked) return;
    setDesignStep("info");
  });

  btnGoConfirmEl?.addEventListener("click", () => {
    if (uiLocked) return;
    if (!validateCanConfirm?.(true)) return;
    saveSelectedDraftItem?.();
    setDesignStep("confirm");
  });

  btnBackEditorEl?.addEventListener("click", () => {
    if (uiLocked) return;
    setDesignStep("editor");
  });


  stepChipEls?.forEach((chip) => {
    chip.addEventListener("click", () => {
      if (uiLocked) return;

      const step = chip.dataset.stepChip;

      if (step === "info") {
        setDesignStep("info");
        return;
      }

      if (step === "editor") {
        if (!(typeof validateUserInfo === "function" ? validateUserInfo(true) : true)) return;
        setDesignStep("editor");
        return;
      }

      if (step === "confirm") {
        if (!validateCanConfirm?.(true)) return;
        saveSelectedDraftItem?.();
        setDesignStep("confirm");
      }
    });
  });
}

/* =========================================================
 * 제작 화면 상단 프로파일 / 규격 빠른 변경
========================================================= */
function setQuickCapTypeOptions(profile, selectedValue = "") {
  if (!quickCapTypeEl) return;

  quickCapTypeEl.innerHTML = "";

  const options = CAP_OPTIONS?.[profile] || [];
  const soldOut = SOLD_OUT_OPTIONS?.[profile] || [];

  options.forEach((optData) => {
    const opt = document.createElement("option");
    const isSoldOut = soldOut.includes(optData.value);

    opt.value = optData.value;
    opt.textContent = isSoldOut ? `${optData.label} [품절]` : optData.label;
    opt.disabled = isSoldOut;
    quickCapTypeEl.appendChild(opt);
  });

  const exact = [...quickCapTypeEl.options].find((opt) => opt.value === selectedValue && !opt.disabled);
  const firstEnabled = [...quickCapTypeEl.options].find((opt) => !opt.disabled);

  if (exact) quickCapTypeEl.value = exact.value;
  else if (firstEnabled) quickCapTypeEl.value = firstEnabled.value;
}

function syncQuickOptionModalValues() {
  if (!quickProfileEl || !quickCapTypeEl || !quickLaserEl) return;

  const currentProfile = profileEl?.value || "OEM";
  quickProfileEl.value = currentProfile;
  setQuickCapTypeOptions(currentProfile, capTypeEl?.value || "");

  const isOEM = currentProfile === "OEM";
  quickLaserEl.disabled = !isOEM;
  quickLaserEl.value = isOEM ? laserEl?.value || "none" : "none";
}

function openQuickOptionModal() {
  if (!optionQuickModalEl || uiLocked) return;
  syncQuickOptionModalValues();
  optionQuickModalEl.classList.add("is-open");
  optionQuickModalEl.setAttribute("aria-hidden", "false");
}

function closeQuickOptionModal() {
  if (!optionQuickModalEl) return;
  optionQuickModalEl.classList.remove("is-open");
  optionQuickModalEl.setAttribute("aria-hidden", "true");
}

// 미사용 확인 (2026-07-09) - 호출부 없음, 필요시 복원
// function hasCurrentCanvasWork() {
//   return !!(userImg || draftBgSet || (typeof textEnabled !== "undefined" && textEnabled && safeTrim(textValue)) || selectedItemId);
// }

function applyQuickOptionChange() {
  if (uiLocked || !quickProfileEl || !quickCapTypeEl || !quickLaserEl) return;

  const nextProfile = quickProfileEl.value || "OEM";
  const nextCapType = quickCapTypeEl.value || "";
  const nextLaser = nextProfile === "OEM" ? quickLaserEl.value || "none" : "none";

  const prevSize = getCanvasSize(profileEl?.value || "OEM", capTypeEl?.value || "");
  const nextSize = getCanvasSize(nextProfile, nextCapType);
  const sizeChanged = prevSize.w !== nextSize.w || prevSize.h !== nextSize.h;

  if (selectedItemId && typeof saveCanvasToItem === "function") {
    const currentItem = cartItems.find((item) => item.id === selectedItemId);
    if (currentItem) saveCanvasToItem(currentItem);
  }

  if (profileEl) profileEl.value = nextProfile;
  if (typeof setCapTypeOptions === "function") setCapTypeOptions();
  if (capTypeEl) capTypeEl.value = nextCapType;

  if (laserEl) {
    laserEl.disabled = nextProfile !== "OEM";
    laserEl.value = nextLaser;
  }

  const selectedItem = cartItems.find((item) => item.id === selectedItemId);
  if (selectedItem) {
    selectedItem.profile = nextProfile;
    selectedItem.capType = nextCapType;
    selectedItem.laser = nextLaser;
  }

  if (sizeChanged) {
    resizeCanvasKeepView?.(nextSize.w, nextSize.h);
    syncCanvasMetaFromForm?.();
  } else {
    applyCanvasSizeFromForm?.();
  }

  updateSelectedInfoText?.();
  if (typeof updateDraftInfo === "function") updateDraftInfo();
  if (typeof updateActionLocks === "function") updateActionLocks();

  if (selectedItem && typeof saveCanvasToItem === "function") {
    saveCanvasToItem(selectedItem);
    renderCart?.();
  }

  closeQuickOptionModal();

  if (nextProfile === "OEM" && (nextLaser === "black" || nextLaser === "white")) {
    showToast?.("레이저 옵션 선택 시 배경은 흰색으로 고정됩니다.", "warn", 2400);
  } else {
    showToast?.("프로파일 / 규격을 변경했습니다.", "ok", 1800);
  }
}

function bindQuickOptionEvents() {
  optionQuickBtnEl?.addEventListener("click", openQuickOptionModal);

  quickProfileEl?.addEventListener("change", () => {
    const profile = quickProfileEl.value || "OEM";
    setQuickCapTypeOptions(profile, quickCapTypeEl?.value || "");

    if (quickLaserEl) {
      quickLaserEl.disabled = profile !== "OEM";
      quickLaserEl.value = profile === "OEM" ? quickLaserEl.value || "none" : "none";
    }
  });

  optionQuickApplyEl?.addEventListener("click", applyQuickOptionChange);
  optionQuickCloseEl?.addEventListener("click", closeQuickOptionModal);
  optionQuickCancelEl?.addEventListener("click", closeQuickOptionModal);

  optionQuickModalEl?.addEventListener("click", (e) => {
    if (e.target === optionQuickModalEl || e.target?.classList?.contains("optionQuickDim")) {
      closeQuickOptionModal();
    }
  });
}
