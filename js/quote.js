/* =========================================================
 * 견적 토글 UI + 추가 항목 동기화
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

function setQuoteUI(open) {
  quoteEnabled = !!open;
  if (quoteBoxEl) quoteBoxEl.style.display = quoteEnabled ? "block" : "none";

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

bizFileBtn?.addEventListener("click", () => {
  if (uiLocked) return;
  bizFileEl?.click();
});

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

  el.addEventListener("input", () => {
    if (uiLocked || !quoteEnabled) return;
    syncQuoteExtrasFromUI();
    updateActionLocks();
  });

  el.addEventListener("change", () => {
    if (uiLocked || !quoteEnabled) return;
    syncQuoteExtrasFromUI();
    updateActionLocks();
  });
});

bizFileEl?.addEventListener("change", async () => {
  if (uiLocked) return;

  const f = bizFileEl.files && bizFileEl.files[0];
  if (!f) return;

  if (bizFileNameEl) bizFileNameEl.textContent = f.name;

  try {
    bizFileDataUrl = await fileToDataUrl(f);

    if (bizFileDataUrl.length > 1_000_000) {
      bizFileDataUrl = null;
      if (bizFileNameEl) bizFileNameEl.textContent = "선택된 파일 없음";
      setMsg(
        "사업자등록증 파일 용량이 너무 큽니다. 줄여서 다시 업로드해주세요.",
      );
    } else {
      setOk("사업자등록증 파일이 업로드되었습니다.");
    }
  } catch {
    bizFileDataUrl = null;
    setMsg("사업자등록증 파일을 읽는 중 오류가 발생했습니다.");
  } finally {
    bizFileEl.value = "";
    updateActionLocks();
  }
});
