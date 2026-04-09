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

  let confirmed = false;

  uiLocked = true;
  if (btnConfirmEl) btnConfirmEl.disabled = true;
  if (confirmModalOkEl) confirmModalOkEl.disabled = true;

  showToast?.("시안을 접수 중입니다.", "info", 1800);

  try {
    const result = await sendOrderEmails();

    if (!result?.ok) {
      showToast?.(
        result?.message || "시안 접수에 실패했습니다. 다시 시도해주세요.", // 수정 이유: sendOrderEmails()에서 넘긴 상세 실패 문구를 우선 표시
        "error",
        3200, // 수정 이유: 문구가 길어질 수 있어서 기존보다 표시 시간을 조금 늘림
      );
      return false;
    }

    const orderNo = safeTrim(orderEl?.value || "");
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
      showToast?.(
        result.customerWarning,
        "warn",
        2600, // 수정 이유: 회사 메일은 성공했지만 고객 메일만 실패한 경우 별도 안내
      );
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
      updateActionLocks?.();
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
    orderEl.value = orderFromUrl.replace(/[^0-9]/g, "").slice(0, 16);
  }

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