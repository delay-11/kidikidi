/* =========================================================
 * 가격 / 옵션 / 장바구니
========================================================= */
function getVolumeDiscountRate(qty) {
  if (qty >= 5000) return 0.2;
  if (qty >= 1000) return 0.15;
  if (qty >= 500) return 0.1;
  return 0;
}

function getRushRate(v) {
  if (!v || v === "none") return 0;
  if (v === "10d") return 0.2;
  if (v === "5d") return 0.3;
  return 0;
}

function getUnitPrice(profile, capType, laser) {
  const base = PRICE?.[profile]?.[capType] ?? 0;
  const add = profile === "OEM" ? (LASER_ADDON?.[laser] ?? 0) : 0;
  return { base, add, unit: base + add };
}

function getItemBgColor(it) {
  const profile = it?.profile || profileEl.value;
  const laser = it?.laser || (profile === "OEM" ? laserEl.value : "none");

  if (profile === "OEM" && laser === "black") return "#000000";
  if (profile === "OEM" && laser === "white") return "#ffffff";
  return it?.bgColor || "#ffffff";
}

function hasDesign(it) {
  return !!it?.design?.imgDataUrl || !!it?.design?.bgSet;
}

function calcLineTotal(item) {
  const { unit } = getUnitPrice(item.profile, item.capType, item.laser);
  const qty = Math.max(1, Number(item.qty || 1));
  const baseLine = unit * qty;

  const discRate = getVolumeDiscountRate(qty);
  const afterDiscount = Math.round(baseLine * (1 - discRate));

  return { unit, qty, baseLine, discRate, afterDiscount };
}

function cartSubtotal() {
  return cartItems.reduce(
    (sum, it) => sum + calcLineTotal(it).afterDiscount,
    0,
  );
}

function cartTotal() {
  const sub = cartSubtotal();
  const rate = quoteEnabled ? getRushRate(quoteProd) : 0;
  return Math.round(sub * (1 + rate));
}

/* =========================================================
 * 프로파일별 규격 옵션 구성
========================================================= */
function setCapTypeOptions() {
  const p = profileEl.value;

  capTypeEl.innerHTML = "";

  (CAP_OPTIONS[p] || []).forEach((o) => {
    const opt = document.createElement("option");
    opt.value = o.value;
    opt.textContent = o.label;
    capTypeEl.appendChild(opt);
  });

  const isOEM = p === "OEM";
  laserEl.disabled = !isOEM;

  if (!isOEM) {
    laserEl.value = "none";
  }

  updateBgLockUI(profileEl.value, laserEl.value);
  updatePriceUI();
  refreshOpenTooltips();
}

/* =========================================================
 * 가격 UI
========================================================= */
function updatePriceUI() {
  if (!unitPriceText) return;

  const p = profileEl.value;
  const cap = capTypeEl.value;
  const laser = p === "OEM" ? laserEl.value : "none";
  const q = Math.max(1, toInt(qtyEl.value, 1));

  const { base, unit } = getUnitPrice(p, cap, laser);

  if (!base) {
    unitPriceText.textContent = "가격 미설정";
    return;
  }

  const baseLine = unit * q;
  const discRate = getVolumeDiscountRate(q);
  const afterDiscount = Math.round(baseLine * (1 - discRate));

  const rate = quoteEnabled ? getRushRate(quoteProd) : 0;
  const total = cartTotal();

  const discText = discRate
    ? `할인 ${Math.round(discRate * 100)}%`
    : "할인 없음";

  const rushText = rate
    ? `총액 할증 +${Math.round(rate * 100)}%`
    : "총액 할증 없음";

  unitPriceText.textContent =
    `${afterDiscount.toLocaleString()}원` +
    ` (단가 ${unit.toLocaleString()}원 · ${q}개 · ${discText})` +
    ` | 총액 ${total.toLocaleString()}원 (${rushText})` +
    (quoteEnabled ? ` / 희망 납기 ${quoteDue || "-"}` : "");
}

function labelLaser(it) {
  if (it.profile !== "OEM") return "레이저 없음";
  if (it.laser === "black") return "레이저 블랙";
  if (it.laser === "white") return "레이저 화이트";
  return "레이저 없음";
}

/* =========================================================
 * 장바구니 렌더링
========================================================= */
function renderCart() {
  if (!cartListEl) return;

  cartListEl.innerHTML = "";
  if (cartCountEl) cartCountEl.textContent = String(cartItems.length);

  const rate = quoteEnabled ? getRushRate(quoteProd) : 0;
  const total = cartTotal();
  const rushText = rate ? ` (총액 +${Math.round(rate * 100)}%)` : "";

  if (cartTotalEl) {
    cartTotalEl.textContent = total.toLocaleString() + "원" + rushText;
  }

  if (cartItems.length === 0) {
    const div = document.createElement("div");
    div.className = "cartEmpty";
    div.innerHTML = `
      <div class="formReadyTitle">제작된 시안이 없습니다</div>
      <div class="formReadyDesc">이미지 또는 배경을 설정한 뒤 [시안 추가] 버튼을 눌러주세요.</div>
    `;
    cartListEl.appendChild(div);

    if (selTextEl) selTextEl.textContent = "없음";
    if (bgTextEl) bgTextEl.textContent = draftBgSet ? draftBgColor : "-";

    updateActionLocks();
    return;
  }

  for (const it of cartItems) {
    const box = document.createElement("div");
    box.className = "cartItem" + (it.id === selectedItemId ? " selected" : "");

    box.addEventListener("click", () => {
      if (uiLocked) return;
      selectItem(it.id);
    });

    const calc = calcLineTotal(it);
    const bg = getItemBgColor(it);
    const discText = calc.discRate
      ? `할인 ${Math.round(calc.discRate * 100)}%`
      : "할인 없음";

    box.innerHTML = `
  <div class="cartTop">

    <div class="cartThumb">
      ${it.design && it.design.imgDataUrl
        ? `<img src="${it.design.imgDataUrl}" />`
        : `<div class="thumbEmpty" style="background:${bg}"></div>`
      }
    </div>

    <div>
      <div class="cartTitle"><b>${it.profile}</b> / ${it.capType} / ${labelLaser(it)} / 배경 ${bg}</div>

      <div class="cartMeta">
        <span>수량: <b>${it.qty}</b></span>
        <span>단가: <b>${calc.unit.toLocaleString()}원</b></span>
        <span>조건: <b>${discText}</b></span>
        <span>합계(할인후): <b>${calc.afterDiscount.toLocaleString()}원</b></span>
        <span>시안: <b>${hasDesign(it) ? "있음" : "없음"}</b></span>
      </div>
    </div>

    <div class="cartActions">
      <button class="miniBtn" type="button" data-act="minus">-</button>
      <button class="miniBtn" type="button" data-act="plus">+</button>
      <button class="miniBtn" type="button" data-act="del">x</button>
    </div>

  </div>
`;

    const minusBtn = box.querySelector('[data-act="minus"]');
    const plusBtn = box.querySelector('[data-act="plus"]');
    const delBtn = box.querySelector('[data-act="del"]');

    minusBtn?.addEventListener("click", (e) => {
      e.stopPropagation();
      if (uiLocked) return;

      it.qty = Math.max(1, Number(it.qty || 1) - 1);
      if (it.id === selectedItemId && qtyEl) qtyEl.value = String(it.qty);

      renderCart();
      updatePriceUI();
      updateActionLocks();
    });

    plusBtn?.addEventListener("click", (e) => {
      e.stopPropagation();
      if (uiLocked) return;

      it.qty = Math.max(1, Number(it.qty || 1) + 1);
      if (it.id === selectedItemId && qtyEl) qtyEl.value = String(it.qty);

      renderCart();
      updatePriceUI();
      updateActionLocks();
    });

    delBtn?.addEventListener("click", (e) => {
      e.stopPropagation();
      if (uiLocked) return;
      removeItem(it.id);
    });

    cartListEl.appendChild(box);
  }

  const sel = cartItems.find((x) => x.id === selectedItemId);
  if (sel) {
    if (selTextEl) selTextEl.textContent = `${sel.profile} / ${sel.capType}`;
    if (bgTextEl) bgTextEl.textContent = getItemBgColor(sel);
  } else {
    if (selTextEl) selTextEl.textContent = "없음";
    if (bgTextEl) bgTextEl.textContent = draftBgSet ? draftBgColor : "-";
  }

  updateActionLocks();
}

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

  qtyEl.value = String(it.qty);
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
btnAddItemEl?.addEventListener("click", () => {
  clearMsgOk();

  if (applyConfirmedLockIfNeeded(true)) return;
  if (!validateUserInfo(true)) return;

  const hasCanvasDesign = userImg || draftBgSet;
  if (!hasCanvasDesign) {
    setMsg("이미지 업로드 또는 배경 설정 후 새로운 시안을 추가할 수 있습니다.");
    return;
  }

  const p = profileEl.value;
  const cap = capTypeEl.value;
  const laser = p === "OEM" ? laserEl.value : "none";
  const qty = Math.max(1, toInt(qtyEl.value, 1));

  const { base } = getUnitPrice(p, cap, laser);
  if (base === 0) {
    setMsg("선택하신 규격은 현재 주문이 불가능합니다.");
    return;
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
  updateActionLocks();

  setOk(
    "새로운 시안이 추가되었습니다. 계속해서 새로운 시안을 제작할 수 있습니다.",
  );
});

/* =========================================================
 * 이벤트: 옵션 변경
========================================================= */
profileEl?.addEventListener("change", () => {
  if (uiLocked) return;

  setCapTypeOptions();
  applyCanvasSizeFromForm();

  selectedItemId = null;
  updateDraftInfo();
  redraw();
  updateActionLocks();
  refreshOpenTooltips();
});

capTypeEl?.addEventListener("change", () => {
  if (uiLocked) return;

  selectedItemId = null;
  applyCanvasSizeFromForm();
  updateDraftInfo();
  redraw();
  updateActionLocks();
  refreshOpenTooltips();
});

qtyEl?.addEventListener("input", () => {
  if (uiLocked) return;

  updatePriceUI();

  const it = cartItems.find((x) => x.id === selectedItemId);
  if (it) {
    it.qty = Math.max(1, toInt(qtyEl.value, 1));
    renderCart();
  }

  updateActionLocks();
});

laserEl?.addEventListener("change", () => {
  if (uiLocked) return;

  selectedItemId = null;
  updateBgLockUI(profileEl.value, laserEl.value);
  updateDraftInfo();
  redraw();
  updateActionLocks();
});
