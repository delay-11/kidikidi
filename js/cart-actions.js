/* =========================================================
 * 아이템 삭제
========================================================= */
function removeItem(id) {
  const idx = cartItems.findIndex((x) => x.id === id);
  if (idx >= 0) {
    cartItems.splice(idx, 1);
  }

  if (selectedItemId === id) {
    selectedItemId = null;
    clearEditor();
  }

  renderCart();
  updatePriceUI();
  updateActionLocks();
}

/* =========================================================
 * 선택 아이템 -> 좌측 폼 동기화
========================================================= */
function syncLeftFormFromItem(it) {
  if (!it) return;

  profileEl.value = it.profile;
  setCapTypeOptions();
  capTypeEl.value = it.capType;

  if (it.profile === "OEM") {
    laserEl.disabled = false;
    laserEl.value = it.laser || "none";
  } else {
    laserEl.disabled = true;
    laserEl.value = "none";
  }

  if (qtyEl) qtyEl.value = String(it.qty);
  updateBgLockUI(it.profile, it.laser);

  setBgUI(it.bgColor || "#ffffff");
  updatePriceUI();
  applyCanvasSizeFromForm();
  refreshOpenTooltips();
}

/* =========================================================
 * 아이템 선택
========================================================= */
async function selectItem(id) {
  if (uiLocked) return;

  const it = cartItems.find((x) => x.id === id);
  if (!it) return;

  selectedItemId = id;

  syncLeftFormFromItem(it);

  const size = getCanvasSize(it.profile, it.capType);
  resizeCanvasKeepView(size.w, size.h);

  if (!it.design) {
    it.design = {
      imgDataUrl: null,
      cx: canvas.width / 2,
      cy: canvas.height / 2,
      scale: 1,
      rot: 0,
      bgSet: false,
    };
  }

  await loadItemToCanvas(it);

  if (selTextEl) selTextEl.textContent = `${it.profile} / ${it.capType}`;
  if (bgTextEl) bgTextEl.textContent = getItemBgColor(it);

  updateBgLockUI(it.profile, it.laser);
  renderCart();
  updatePriceUI();
  updateActionLocks();
}

/* =========================================================
 * 새 시안 추가
========================================================= */
function addCurrentItemToCart() {
  clearMsgOk();

  if (!validateUserInfo(true)) return false;

  const hasCanvasDesign = userImg || draftBgSet;
  if (!hasCanvasDesign) {
    setMsg("이미지 업로드 또는 배경 설정 후 새로운 시안을 추가할 수 있습니다.");
    return false;
  }

  const p = profileEl.value;
  const cap = capTypeEl.value;
  const laser = p === "OEM" ? laserEl.value : "none";
  const qty = Math.max(1, toInt(qtyEl?.value, 1));

  const { base } = getUnitPrice(p, cap, laser);
  if (base === 0) {
    setMsg("선택하신 규격은 현재 주문이 불가능합니다.");
    return false;
  }

  const id = "it_" + Math.random().toString(36).slice(2, 10);

  const item = {
    id,
    profile: p,
    capType: cap,
    laser,
    qty,
    bgColor: draftBgColor || "#ffffff",
    design: {
      imgDataUrl: null,
      cx: imgCX,
      cy: imgCY,
      scale: imgScale,
      rot: imgRot,
      bgSet: !!draftBgSet,
    },
  };

  saveCanvasToItem(item);
  cartItems.unshift(item);

  clearEditor();
  renderCart();
  updatePriceUI();
  updateDraftInfo();
  updateActionLocks();

  setOk(
    "새로운 시안이 추가되었습니다. 계속해서 새로운 시안을 제작할 수 있습니다.",
  );
  return true;
}
