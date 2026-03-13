/* =========================================================
 * 주문자 입력 이벤트
========================================================= */
[nameEl, phoneEl, orderEl, emailEl].forEach((el) => {
  if (!el) return;

  el.addEventListener("input", () => {
    if (uiLocked) return;
    clearFieldErrors();
    setMsg("");
    updateActionLocks();
    updateFormReadyBox();
  });

  el.addEventListener("blur", () => {
    if (uiLocked) return;
    validateUserInfo(true);
    if (el === orderEl) applyConfirmedLockIfNeeded(true);
    updateActionLocks();
    updateFormReadyBox();
  });
});

/* =========================================================
 * 상단 주문번호 바 표시
========================================================= */
function updateOrderBar() {
  const el = document.getElementById("orderBarNo");
  if (!el) return;

  el.textContent = safeTrim(orderEl?.value || "") || "-";
}

/* =========================================================
 * 상단 현재 선택 규격 표시
========================================================= */
function updateDraftInfo() {
  const p = document.getElementById("draftProfile");
  const c = document.getElementById("draftCap");
  const l = document.getElementById("draftLaser");

  const profile = safeTrim(profileEl?.value || "") || "-";
  const cap = safeTrim(capTypeEl?.value || "") || "-";

  let laser = "레이저 없음";

  if (profile === "OEM") {
    const v = safeTrim(laserEl?.value || "");

    if (v === "black") laser = "레이저 블랙";
    else if (v === "white") laser = "레이저 화이트";
  }

  if (p) p.textContent = profile;
  if (c) c.textContent = cap;
  if (l) l.textContent = laser;
}

/* =========================================================
 * 왼쪽 주문자 정보 입력 상태 표시
========================================================= */
function updateFormReadyBox() {
  const titleEl = document.getElementById("formReadyTitle");
  const descEl = document.getElementById("formReadyDesc");

  if (!titleEl || !descEl) return;

  const ready = validateUserInfo(false);

  if (!ready) {
    titleEl.textContent = "주문자 정보 입력이 필요합니다.";
    descEl.textContent =
      "주문자명, 연락처, 주문번호, 이메일을 모두 입력해주세요.";

    return;
  }

  titleEl.textContent = "주문자 정보 입력이 완료되었습니다.";
  descEl.textContent =
    "이미지 업로드 또는 배경 설정 후 [시안 추가]를 눌러주세요.";
}

/* =========================================================
 * 상단 바 이벤트 연결
========================================================= */

orderEl?.addEventListener("input", updateOrderBar);

profileEl?.addEventListener("change", () => {
  setCapTypeOptions();
  applyCanvasSizeFromForm();
  updateDraftInfo();
});

capTypeEl?.addEventListener("change", () => {
  applyCanvasSizeFromForm();
  updateDraftInfo();
});

laserEl?.addEventListener("change", () => {
  applyCanvasSizeFromForm();
  updateDraftInfo();
});

/* =========================================================
 * 시안 확정 모달
========================================================= */
function openConfirmModal(message) {
  const modal = document.getElementById("confirmModal");
  const body = document.getElementById("confirmModalBody");
  const okBtn = document.getElementById("confirmModalOk");
  const cancelBtn = document.getElementById("confirmModalCancel");
  const dim = modal?.querySelector(".confirmModalDim");

  if (!modal || !body || !okBtn || !cancelBtn || !dim) {
    return Promise.resolve(confirm(message));
  }

  return new Promise((resolve) => {
    const close = (result) => {
      modal.classList.remove("show");
      modal.setAttribute("aria-hidden", "true");
      document.body.classList.remove("modalOpen");

      okBtn.removeEventListener("click", onOk);
      cancelBtn.removeEventListener("click", onCancel);
      dim.removeEventListener("click", onCancel);
      document.removeEventListener("keydown", onKeyDown);

      resolve(result);
    };

    const onOk = () => close(true);
    const onCancel = () => close(false);
    const onKeyDown = (e) => {
      if (e.key === "Escape") close(false);
    };

    body.textContent = message;

    modal.classList.add("show");
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("modalOpen");

    okBtn.addEventListener("click", onOk);
    cancelBtn.addEventListener("click", onCancel);
    dim.addEventListener("click", onCancel);
    document.addEventListener("keydown", onKeyDown);

    setTimeout(() => okBtn.focus(), 0);
  });
}

/* =========================================================
 * 시안 확정하기
========================================================= */
/* =========================================================
 * 시안 확정하기
========================================================= */
btnConfirmEl?.addEventListener("click", async () => {
  const confirmMessage = quoteEnabled
    ? "시안을 최종 확정하시겠습니까?\n\n시안 확정 후에는 수정이 어려울 수 있습니다.\n업로드한 이미지와 제작 내용을 다시 한번 확인해주세요.\n\n확인을 누르면 시안이 접수됩니다.\n접수된 시안은 담당자가 검토 후 이메일로 안내드릴 예정입니다.\n\n※ 여러 시안을 제작한 경우 [시안 추가] 버튼으로 등록된 시안만 접수됩니다.\n※ 견적 요청 시 견적서가 이메일로 발송됩니다."
    : "시안을 최종 확정하시겠습니까?\n\n시안 확정 후에는 수정이 어려울 수 있습니다.\n업로드한 이미지와 제작 내용을 다시 한번 확인해주세요.\n\n확인을 누르면 시안이 접수됩니다.\n접수된 시안은 담당자가 검토 후 이메일로 안내드릴 예정입니다.\n\n※ 여러 시안을 제작한 경우 [시안 추가] 버튼으로 등록된 시안만 접수됩니다.\n※ 확인에는 일정 시간이 소요될 수 있습니다.";

  const okConfirm = await openConfirmModal(confirmMessage);
  if (!okConfirm) return;

  clearMsgOk();

  if (applyConfirmedLockIfNeeded(true)) return;
  if (!validateCanConfirm(true)) return;

  /* ===== 추가: 버튼 중복 클릭 방지 ===== */
  btnConfirmEl.disabled = true;

  /* ===== 추가: 전송 중 안내 메시지 ===== */
  setMsg("시안을 접수 중입니다. 잠시만 기다려주세요...");

  try {
    if (quoteEnabled) syncQuoteExtrasFromUI();

    const companyResult = await sendEmailToCompany();
    if (!companyResult.ok) return;

    if (quoteEnabled) {
      const itemsSummary = cartItems.map((it) => {
        const bg = getItemBgColor(it);
        const calc = calcLineTotal(it);

        return {
          profile: it.profile,
          capType: it.capType,
          laser: it.profile === "OEM" ? it.laser : "none",
          bg,
          qty: calc.qty,
          unit: calc.unit,
          baseLine: calc.baseLine,
          discountRate: calc.discRate,
          lineAfterDiscount: calc.afterDiscount,
        };
      });

      const customerResult = await sendQuoteEmailToCustomer(itemsSummary);
      if (!customerResult.ok) return;

      setOk(
        `시안이 정상적으로 접수되었습니다.\n주문번호: ${safeTrim(orderEl.value)}\n\n담당자가 시안을 확인한 후 입력하신 이메일로 안내드릴 예정입니다.\n견적 요청 건은 검토 후 함께 안내드립니다.`,
      );

      setMsg("");

      markOrderConfirmed(safeTrim(orderEl.value));
      clearDraftStorage();
      applyConfirmedLockIfNeeded(false);

      updateOrderBar();
      updateDraftInfo();
      updateFormReadyBox();

      return;
    }

    setOk(
      `시안이 정상적으로 접수되었습니다.\n주문번호: ${safeTrim(orderEl.value)}\n\n담당자가 시안을 확인한 후 입력하신 이메일로 안내드릴 예정입니다.`,
    );

    setMsg("");

    markOrderConfirmed(safeTrim(orderEl.value));
    clearDraftStorage();
    applyConfirmedLockIfNeeded(false);

    updateOrderBar();
    updateDraftInfo();
    updateFormReadyBox();

    return;
  } catch (e) {
    console.error("전송 실패:", e);

    setMsg(
      "메일 전송에 실패했습니다. 잠시 후 다시 시도해주세요.\n문제가 계속될 경우 고객센터로 문의해주세요.",
    );

    setOk("");
  } finally {
    /* ===== 추가: 버튼 다시 활성화 ===== */
    btnConfirmEl.disabled = false;

    updateActionLocks();
  }
});

/* =========================================================
 * 초기화
========================================================= */
(async function initApp() {
  initPickr();

  setCapTypeOptions();
  resizeCanvas(330, 330);
  clearEditor();
  setQuoteUI(false);

  const restored = await loadDraftFromStorage();

  const urlOrder = getOrderFromUrl();

  if (urlOrder && orderEl) {
    orderEl.value = urlOrder;
  }

  applyCanvasSizeFromForm();
  renderCart();
  updatePriceUI();
  redraw();

  applyConfirmedLockIfNeeded(true);
  updateActionLocks();
  updateOrderBar();
  updateDraftInfo();
  updateFormReadyBox();

  if (!restored) {
    clearMsgOk();
  }

  registerDraftAutoSave();
})();
