/* =========================================================
 * 견적 페이지 초기화
========================================================= */
function initQuotePage() {
  syncQuoteExtrasFromUI();
  bindQuoteFieldEvents();
  bindQuoteActionEvents();
}

/* =========================================================
 * 공통 입력 이벤트 바인딩
========================================================= */
function bindQuoteFieldEvents() {
  [nameEl, phoneEl, orderEl, emailEl].forEach((el) => {
    if (!el) return;

    el.addEventListener("input", () => {
      if (uiLocked) return;

      clearFieldErrors?.();
      clearFormNotice?.();
      setMsg?.("");
      setOk?.("");
    });

    el.addEventListener("blur", () => {
      if (uiLocked) return;
      validateQuoteUserInfo(true);
    });
  });

  [profileEl, capTypeEl, laserEl, qtyEl].forEach((el) => {
    if (!el) return;

    el.addEventListener("change", () => {
      if (uiLocked) return;

      clearFormNotice?.();
      setMsg?.("");
      setOk?.("");
    });
  });

  if (quoteProdEl) {
    quoteProdEl.addEventListener("change", () => {
      if (uiLocked) return;
      quoteProd = safeTrim(quoteProdEl.value) || "none";
      clearFormNotice?.();
      setMsg?.("");
      setOk?.("");
    });
  }

  if (quoteDueEl) {
    quoteDueEl.addEventListener("change", () => {
      if (uiLocked) return;
      quoteDue = safeTrim(quoteDueEl.value);
      clearFormNotice?.();
      setMsg?.("");
      setOk?.("");
    });
  }

  if (bizFileBtn && bizFileEl) {
    bizFileBtn.addEventListener("click", () => {
      if (uiLocked) return;
      bizFileEl.click();
    });

    bizFileEl.addEventListener("change", async (e) => {
      if (uiLocked) return;

      const file = e.target.files?.[0];
      if (!file) {
        bizFileDataUrl = null;
        if (bizFileNameEl) bizFileNameEl.textContent = "선택된 파일 없음";
        return;
      }

      if (bizFileNameEl) bizFileNameEl.textContent = file.name;

      try {
        bizFileDataUrl = await fileToDataURL(file);
      } catch (err) {
        console.error(err);
        bizFileDataUrl = null;
        if (bizFileNameEl) bizFileNameEl.textContent = "선택된 파일 없음";
        setFormNotice?.("사업자등록증 파일을 읽지 못했습니다.", "error");
      }
    });
  }

  [
    keyringQtyEl,
    keyringLedEl,
    keyringColorEl,
    keyringSlotsEl,
    packTypeEl,
    packSheetEl,
    packStickerEl,
    quoteNotesEl,
  ].forEach((el) => {
    if (!el) return;

    const eventName =
      el.type === "checkbox" || el.tagName === "SELECT" ? "change" : "input";

    el.addEventListener(eventName, () => {
      if (uiLocked) return;
      syncQuoteExtrasFromUI();
      clearFormNotice?.();
      setMsg?.("");
      setOk?.("");
    });
  });
}

/* =========================================================
 * 액션 이벤트 바인딩
========================================================= */
function bindQuoteActionEvents() {
  const btn = document.getElementById("btnQuoteRequest");
  if (!btn) return;

  btn.addEventListener("click", async () => {
    if (uiLocked) return;

    clearFieldErrors?.();
    clearFormNotice?.();
    setMsg?.("");
    setOk?.("");

    syncQuoteExtrasFromUI();

    if (!validateQuoteRequest(true)) return;

    uiLocked = true;
    btn.disabled = true;
    setMsg?.("견적 요청을 접수 중입니다. 잠시만 기다려주세요.");

    try {
      const ok = await sendQuoteRequestEmails();
      if (!ok) return;

      setMsg?.("");
      setOk?.("견적 요청이 정상적으로 접수되었습니다.");
    } catch (err) {
      console.error(err);
      setMsg?.("견적 요청 전송 중 오류가 발생했습니다.");
    } finally {
      uiLocked = false;
      btn.disabled = false;
    }
  });
}

/* =========================================================
 * 시작
========================================================= */
document.addEventListener("DOMContentLoaded", () => {
  initQuotePage();
});
