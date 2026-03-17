/* =========================================================
 * 견적 추가 항목 상태 동기화
========================================================= */
function syncQuoteExtrasFromUI() {
  keyringQty = Math.max(0, toInt(keyringQtyEl?.value ?? keyringQty, 0));
  keyringLed = safeTrim(keyringLedEl?.value ?? keyringLed) || "none";
  keyringColor = safeTrim(keyringColorEl?.value ?? keyringColor) || "black";
  keyringSlots = safeTrim(keyringSlotsEl?.value ?? keyringSlots) || "1";

  packType = safeTrim(packTypeEl?.value ?? packType) || "none";
  packSheet = !!(packSheetEl?.checked ?? packSheet);
  packSticker = !!(packStickerEl?.checked ?? packSticker);
  quoteNotes = safeTrim(quoteNotesEl?.value ?? quoteNotes);
}

/* =========================================================
 * 견적 추가 항목 초기화
========================================================= */
function resetQuoteExtras() {
  keyringQty = 0;
  keyringLed = "none";
  keyringColor = "black";
  keyringSlots = "1";

  packType = "none";
  packSheet = false;
  packSticker = false;
  quoteNotes = "";

  if (keyringQtyEl) keyringQtyEl.value = "0";
  if (keyringLedEl) keyringLedEl.value = "none";
  if (keyringColorEl) keyringColorEl.value = "black";
  if (keyringSlotsEl) keyringSlotsEl.value = "1";

  if (packTypeEl) packTypeEl.value = "none";
  if (packSheetEl) packSheetEl.checked = false;
  if (packStickerEl) packStickerEl.checked = false;
  if (quoteNotesEl) quoteNotesEl.value = "";
}

/* =========================================================
 * 견적 요청 UI 설정
========================================================= */
function setQuoteUI(open) {
  quoteEnabled = !!open;

  if (quoteBoxEl) {
    quoteBoxEl.style.display = quoteEnabled ? "block" : "none";
  }

  if (!quoteEnabled) {
    quoteProd = "none";
    quoteDue = "";
    bizFileDataUrl = null;

    if (quoteProdEl) quoteProdEl.value = "none";
    if (quoteDueEl) quoteDueEl.value = "";
    if (bizFileNameEl) bizFileNameEl.textContent = "선택된 파일 없음";

    resetQuoteExtras();
  } else {
    syncQuoteExtrasFromUI();
  }

  rerenderAll();
}

/* =========================================================
 * 견적 요청 토글 / 기본 항목 이벤트
========================================================= */
quoteToggleEl?.addEventListener("change", () => {
  if (uiLocked) return;
  setQuoteUI(quoteToggleEl.checked);
});

quoteProdEl?.addEventListener("change", () => {
  if (uiLocked) return;

  quoteProd = quoteProdEl.value;
  rerenderAll();
});

quoteDueEl?.addEventListener("change", () => {
  if (uiLocked) return;

  quoteDue = quoteDueEl.value || "";
  updateActionLocks();
});

/* =========================================================
 * 견적 추가 항목 이벤트
========================================================= */
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

  const syncExtras = () => {
    if (uiLocked || !quoteEnabled) return;
    syncQuoteExtrasFromUI();
    updateActionLocks();
  };

  el.addEventListener("input", syncExtras);
  el.addEventListener("change", syncExtras);
});

/* =========================================================
 * 사업자등록증 업로드 버튼
========================================================= */
bizFileBtn?.addEventListener("click", () => {
  if (uiLocked) return;
  bizFileEl?.click();
});

/* =========================================================
 * 사업자등록증 파일 업로드
========================================================= */
bizFileEl?.addEventListener("change", async () => {
  if (uiLocked) return;

  clearFormNotice();

  const f = bizFileEl.files && bizFileEl.files[0];
  if (!f) return;

  if (bizFileNameEl) {
    bizFileNameEl.textContent = f.name;
  }

  try {
    bizFileDataUrl = await fileToDataUrl(f);

    if (bizFileDataUrl.length > 1_000_000) {
      bizFileDataUrl = null;

      if (bizFileNameEl) {
        bizFileNameEl.textContent = "선택된 파일 없음";
      }

      setFormNotice(
        "사업자등록증 파일 용량이 너무 큽니다. 줄여서 다시 업로드해주세요.",
        "error",
      );
    } else {
      setFormNotice("사업자등록증 파일이 업로드되었습니다.", "ok");
    }
  } catch {
    bizFileDataUrl = null;
    setFormNotice("사업자등록증 파일을 읽는 중 오류가 발생했습니다.", "error");
  } finally {
    bizFileEl.value = "";
    updateActionLocks();
  }
});
