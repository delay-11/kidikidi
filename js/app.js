/* moved from js/design/app-design.js */
/* =========================================================
 * 폼 준비 상태 텍스트 갱신
========================================================= */
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
  const hasPhone = !!safeTrim(phoneEl.value);
  const hasOrder = !!safeTrim(orderEl.value);
  const hasEmail = !!safeTrim(emailEl.value);

  const ready = hasName && hasPhone && hasOrder && hasEmail;

  formReadyBoxEl.classList.toggle("is-ready", ready);

  if (ready) {
    formReadyTitleEl.textContent = "주문자 정보 입력이 완료되었습니다.";

    formReadyDescEl.textContent =
      "프로파일 / 규격 확인 후 이미지를 업로드하거나 배경을 설정해 주세요.";
  } else {
    formReadyTitleEl.textContent = "주문자 정보 입력이 필요합니다.";
    formReadyDescEl.textContent =
      "주문자명, 연락처, 주문번호, 이메일을 모두 입력해주세요.";
  }
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

  showToast?.("시안을 접수 중입니다.", "info", 1800);

  try {
    const result = await sendOrderEmails();

    if (!result?.ok) {
      showToast?.(
        result?.message || "시안 접수에 실패했습니다. 다시 시도해주세요.",
        "error",
        3200,
      );
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

    if (result?.customerWarning) {
      showToast?.(result.customerWarning, "warn", 2600);
    }

    confirmed = true;
    return true;
  } catch (err) {
    console.error(err);
    showToast?.("시안 접수 중 오류가 발생했습니다.", "error", 2600);
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


const EDITOR_ONBOARDING_KEY = "kidikidi_editor_onboarding_hidden";
let didShowEditorOnboardingThisSession = false;

function shouldShowEditorOnboarding() {
  try {
    return localStorage.getItem(EDITOR_ONBOARDING_KEY) !== "1";
  } catch (e) {
    return true;
  }
}

function openEditorOnboarding() {
  if (!editorOnboardingEl || didShowEditorOnboardingThisSession) return;
  if (!shouldShowEditorOnboarding()) return;
  didShowEditorOnboardingThisSession = true;
  editorOnboardingEl.classList.add("is-open");
  editorOnboardingEl.setAttribute("aria-hidden", "false");
}

function closeEditorOnboarding() {
  if (!editorOnboardingEl) return;

  if (editorOnboardingNeverEl?.checked) {
    try {
      localStorage.setItem(EDITOR_ONBOARDING_KEY, "1");
    } catch (e) {
      console.warn("온보딩 표시 설정 저장 실패:", e);
    }
  }

  editorOnboardingEl.classList.remove("is-open");
  editorOnboardingEl.setAttribute("aria-hidden", "true");
}

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
    // 주문정보 입력 완료 후 시안 제작 화면에 진입했을 때만 인쇄 가이드 팝업을 표시합니다.
    window.setTimeout(() => {
      // 주문정보 입력 후 시안 제작 화면에 들어오면 인쇄 가이드는 반드시 노출합니다.
      // 기존 테스트 중 저장된 localStorage 값 때문에 자동 팝업이 막히는 상황을 방지합니다.
      window.openPrintGuideModal?.({ force: true });
      openEditorOnboarding?.();
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

  editorOnboardingCloseEl?.addEventListener("click", closeEditorOnboarding);
  editorOnboardingEl?.addEventListener("click", (e) => {
    if (e.target === editorOnboardingEl || e.target?.classList?.contains("editorOnboardingDim")) {
      closeEditorOnboarding();
    }
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

function hasCurrentCanvasWork() {
  return !!(userImg || draftBgSet || (typeof textEnabled !== "undefined" && textEnabled && safeTrim(textValue)) || selectedItemId);
}

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
  showToast?.("프로파일 / 규격을 변경했습니다.", "ok", 1800);
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
