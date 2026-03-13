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
 * 시안 확정하기
========================================================= */
btnConfirmEl?.addEventListener("click", async () => {

  const confirmMessage = quoteEnabled
    ? "시안을 최종 확정하시겠습니까?\n\n확정 후에는 시안 수정이 어렵습니다.\n주문 정보와 첨부 이미지를 다시 확인해주세요.\n\n확인을 누르면 시안 접수 메일이 발송되며\n입력하신 이메일로 견적서가 함께 발송됩니다."
    : "시안을 최종 확정하시겠습니까?\n\n확정 후에는 시안 수정이 어렵습니다.\n주문 정보와 첨부 이미지를 다시 확인해주세요.\n\n확인을 누르면 시안 접수 메일이 발송됩니다.";

  const okConfirm = confirm(confirmMessage);
  if (!okConfirm) return;

  clearMsgOk();

  if (applyConfirmedLockIfNeeded(true)) return;
  if (!validateCanConfirm(true)) return;

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
        `견적서 요청이 완료되었습니다.\n주문번호: ${safeTrim(orderEl.value)}\n입력하신 이메일로 견적서를 발송했습니다.`,
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
      `시안이 접수되었습니다.\n주문번호: ${safeTrim(orderEl.value)}\n검토 후 입력하신 이메일로 안내드리겠습니다.`,
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