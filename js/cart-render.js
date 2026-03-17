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
      ${
        it.design && it.design.imgDataUrl
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
