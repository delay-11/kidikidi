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
  });

  el.addEventListener("blur", () => {
    if (uiLocked) return;
    validateUserInfo(true);
    if (el === orderEl) applyConfirmedLockIfNeeded(true);
    updateActionLocks();
  });
});

/* =========================================================
 * 시안 확정하기
========================================================= */
btnConfirmEl?.addEventListener("click", async () => {
  clearMsgOk();

  if (applyConfirmedLockIfNeeded(true)) return;
  if (!validateCanConfirm(true)) return;

  try {
    if (quoteEnabled) syncQuoteExtrasFromUI();

    const sel = cartItems.find((x) => x.id === selectedItemId);
    if (sel) saveCanvasToItem(sel);

    const okCompany = await sendEmailToCompany();
    if (!okCompany) return;

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

      const okCustomer = await sendQuoteEmailToCustomer(itemsSummary);
      if (!okCustomer) return;

      setOk(
        "견적서 요청이 완료되었습니다. 입력하신 이메일로 견적서를 발송했습니다.",
      );
      setMsg("");

      markOrderConfirmed(safeTrim(orderEl.value));
      applyConfirmedLockIfNeeded(false);
      return;
    }

    setOk("시안이 접수되었습니다. 검토 후 입력하신 이메일로 안내드리겠습니다.");
    setMsg("");

    markOrderConfirmed(safeTrim(orderEl.value));
    applyConfirmedLockIfNeeded(false);
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
initPickr();
setCapTypeOptions();
resizeCanvas(330, 330);
clearEditor();
applyCanvasSizeFromForm();
renderCart();
updatePriceUI();
setQuoteUI(false);
redraw();
updateActionLocks();

const urlOrder = getOrderFromUrl();
if (urlOrder && orderEl) orderEl.value = urlOrder;

applyConfirmedLockIfNeeded(true);
updateActionLocks();
