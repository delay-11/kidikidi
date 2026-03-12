/* =========================================================
 * 자동 저장 / 복구 / 이탈 경고
========================================================= */
const DRAFT_STORAGE_KEY = "keycap_design_draft_v2";

function hasUnsavedDraft() {
  return !!(
    cartItems.length > 0 ||
    userImg ||
    draftBgSet ||
    safeTrim(nameEl?.value) ||
    safeTrim(phoneEl?.value) ||
    safeTrim(orderEl?.value) ||
    safeTrim(emailEl?.value)
  );
}

function collectDraftData() {
  
  if (quoteEnabled) syncQuoteExtrasFromUI();

  return {
    customer: {
      name: safeTrim(nameEl?.value),
      phone: safeTrim(phoneEl?.value),
      orderNo: safeTrim(orderEl?.value),
      email: safeTrim(emailEl?.value),
    },

    quote: {
      enabled: !!quoteEnabled,
      prod: safeTrim(quoteProd),
      due: safeTrim(quoteDue),
      bizFileDataUrl: bizFileDataUrl || null,

      keyringQty,
      keyringLed,
      keyringColor,
      keyringSlots,

      packType,
      packSheet,
      packSticker,
      quoteNotes,
    },

    form: {
      profile: safeTrim(profileEl?.value),
      capType: safeTrim(capTypeEl?.value),
      laser: safeTrim(laserEl?.value),
      qty: toInt(qtyEl?.value, 1),
    },

    cartItems,
    selectedItemId,

    draft: {
      bgColor: draftBgColor || "#ffffff",
      bgSet: !!draftBgSet,
      imgDataUrl: userImg ? userImg.src : null,
      cx: imgCX,
      cy: imgCY,
      scale: imgScale,
      rot: imgRot,
      fileName: fileNameEl?.textContent || "선택된 파일 없음",
    },
  };
}

function saveDraftToStorage() {
  try {
    if (uiLocked) return;
    const data = collectDraftData();
    localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn("드래프트 저장 실패:", e);
  }
}

function clearDraftStorage() {
  try {
    localStorage.removeItem(DRAFT_STORAGE_KEY);
  } catch (e) {
    console.warn("드래프트 삭제 실패:", e);
  }
}

function readDraftFromStorage() {
  try {
    const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    console.warn("드래프트 읽기 실패:", e);
    return null;
  }
}

function loadImageFromDataUrl(src) {
  return new Promise((resolve, reject) => {
    if (!src) {
      resolve(null);
      return;
    }

    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

async function loadDraftFromStorage() {
  const data = readDraftFromStorage();
  if (!data) return false;

  try {
    /* 주문자 정보 */
    if (nameEl) nameEl.value = data.customer?.name || "";
    if (phoneEl) phoneEl.value = data.customer?.phone || "";
    if (orderEl) orderEl.value = data.customer?.orderNo || "";
    if (emailEl) emailEl.value = data.customer?.email || "";

    /* 견적 */
    quoteEnabled = !!data.quote?.enabled;
    quoteProd = data.quote?.prod || "none";
    quoteDue = data.quote?.due || "";
    bizFileDataUrl = data.quote?.bizFileDataUrl || null;

    keyringQty = data.quote?.keyringQty ?? 0;
    keyringLed = data.quote?.keyringLed || "none";
    keyringColor = data.quote?.keyringColor || "black";
    keyringSlots = data.quote?.keyringSlots || "1";

    packType = data.quote?.packType || "none";
    packSheet = !!data.quote?.packSheet;
    packSticker = !!data.quote?.packSticker;
    quoteNotes = data.quote?.quoteNotes || "";

    if (quoteToggleEl) quoteToggleEl.checked = quoteEnabled;
    setQuoteUI(quoteEnabled);

    if (quoteProdEl) quoteProdEl.value = quoteProd || "none";
    if (quoteDueEl) quoteDueEl.value = quoteDue || "";

    if (bizFileNameEl) {
      bizFileNameEl.textContent = "선택된 파일 없음";
    }

    if (keyringQtyEl) keyringQtyEl.value = String(keyringQty);
    if (keyringLedEl) keyringLedEl.value = keyringLed;
    if (keyringColorEl) keyringColorEl.value = keyringColor;
    if (keyringSlotsEl) keyringSlotsEl.value = keyringSlots;

    if (packTypeEl) packTypeEl.value = packType;
    if (packSheetEl) packSheetEl.checked = packSheet;
    if (packStickerEl) packStickerEl.checked = packSticker;
    if (quoteNotesEl) quoteNotesEl.value = quoteNotes;

    /* 좌측 옵션 폼 */
    if (profileEl) profileEl.value = data.form?.profile || "OEM";
    setCapTypeOptions();

    if (capTypeEl && data.form?.capType) capTypeEl.value = data.form.capType;
    if (laserEl) laserEl.value = data.form?.laser || "none";
    if (qtyEl) qtyEl.value = String(data.form?.qty || 1);

    /* 장바구니 */
    cartItems = Array.isArray(data.cartItems) ? data.cartItems : [];
    selectedItemId = data.selectedItemId || null;

    /* 현재 드래프트 */
    draftBgColor = data.draft?.bgColor || "#ffffff";
    draftBgSet = !!data.draft?.bgSet;

    imgCX = Number.isFinite(data.draft?.cx) ? data.draft.cx : canvas.width / 2;
    imgCY = Number.isFinite(data.draft?.cy) ? data.draft.cy : canvas.height / 2;
    imgScale = Number.isFinite(data.draft?.scale) ? data.draft.scale : 1;
    imgRot = Number.isFinite(data.draft?.rot) ? data.draft.rot : 0;

    userImg = await loadImageFromDataUrl(data.draft?.imgDataUrl || null);

    if (fileNameEl) {
      fileNameEl.textContent = "선택된 파일 없음";
    }

    applyCanvasSizeFromForm();
    renderCart();
    updatePriceUI();

    if (selectedItemId && cartItems.some((x) => x.id === selectedItemId)) {
      await selectItem(selectedItemId);
    } else {
      setBgUI(draftBgColor || "#ffffff");
      if (bgTextEl) bgTextEl.textContent = draftBgSet ? draftBgColor : "-";
      redraw();
    }

    clearMsgOk();
    setOk();
    return true;
  } catch (e) {
    console.error("드래프트 복구 실패:", e);
    return false;
  }
}

function registerDraftAutoSave() {
  const saveSoon = () => {
    if (uiLocked) return;
    saveDraftToStorage();
  };

  document.addEventListener("input", saveSoon, true);
  document.addEventListener("change", saveSoon, true);
  document.addEventListener(
    "click",
    () => {
      if (uiLocked) return;
      setTimeout(saveDraftToStorage, 0);
    },
    true,
  );

  window.addEventListener("beforeunload", (e) => {
    if (!hasUnsavedDraft() || uiLocked) return;
    saveDraftToStorage();
    e.preventDefault();
    e.returnValue = "";
  });

  window.addEventListener("pagehide", saveDraftToStorage);
}
