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

    if (!didReadProfileTooltip) {
      formReadyDescEl.textContent = "? 안내를 먼저 확인해주세요.";
    } else {
      formReadyDescEl.textContent =
        "이미지 업로드 또는 배경 설정 후 [시안 추가]를 눌러주세요.";
    }
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

    el.addEventListener("input", async () => {
      if (uiLocked && el !== orderEl) return;

      clearFieldErrors?.();
      clearFormNotice?.();
      setMsg?.("");
      setOk?.("");

      updateFormReadyState();
      updateDraftInfo?.();
      updateActionLocks?.();

      if (el === orderEl) {
        await applyConfirmedLockIfNeeded?.(false);
      }
    });

    el.addEventListener("blur", async () => {
      if (uiLocked && el !== orderEl) return;

      validateUserInfo?.(true);
      updateFormReadyState();
      updateDraftInfo?.();
      updateActionLocks?.();

      if (el === orderEl) {
        await applyConfirmedLockIfNeeded?.(true);
      }
    });
  });

  [profileEl, capTypeEl, laserEl, qtyEl].forEach((el) => {
    if (!el) return;

    const eventName = el.tagName === "SELECT" ? "change" : "input";

    el.addEventListener(eventName, () => {
      if (uiLocked) return;

      clearFormNotice?.();
      setMsg?.("");
      setOk?.("");

      updateDraftInfo?.();
      updateActionLocks?.();
    });
  });
}

/* =========================================================
 * 시안 액션 이벤트 바인딩
========================================================= */
function bindDesignActionEvents() {
  btnAddItemEl?.addEventListener("click", () => {
    if (uiLocked) return;

    clearFormNotice?.();
    setMsg?.("");
    setOk?.("");

    if (!validateUserInfo?.(true)) return;

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

  uiLocked = true;
  if (btnConfirmEl) btnConfirmEl.disabled = true;
  if (confirmModalOkEl) confirmModalOkEl.disabled = true;

  setMsg?.("시안을 접수 중입니다. 잠시만 기다려주세요.");

  try {
    const ok = await sendOrderEmails();
    if (!ok) return false;

    setMsg?.("");
    setOk?.("시안이 정상적으로 접수되었습니다.");

    if (typeof markDraftConfirmed === "function") {
      markDraftConfirmed();
    }

    if (typeof closeConfirmModal === "function") {
      closeConfirmModal();
    }

    return true;
  } catch (err) {
    console.error(err);
    setMsg?.("시안 접수 중 오류가 발생했습니다.");
    return false;
  } finally {
    uiLocked = false;
    if (btnConfirmEl) btnConfirmEl.disabled = false;
    if (confirmModalOkEl) confirmModalOkEl.disabled = false;
    updateActionLocks?.();
  }
}

/* =========================================================
 * 초기 렌더링
========================================================= */
async function initDesignPage() {
  if (typeof initPickr === "function") initPickr();
  if (typeof initProfileOptions === "function") initProfileOptions();

  bindCustomerFieldEvents();
  bindDesignActionEvents();

  if (typeof renderCart === "function") renderCart();
  if (typeof redraw === "function") redraw();

  updateFormReadyState();
  updateDraftInfo?.();
  updateActionLocks?.();

  await applyConfirmedLockIfNeeded?.(true);
}

/* =========================================================
 * 시작
========================================================= */
document.addEventListener("DOMContentLoaded", () => {
  initDesignPage();
});
