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
  updateActionLocks();
}

/* =========================================================
 * 새 시안 추가
========================================================= */
function addCurrentItemToCart() {
  if (!validateUserInfo(true)) return false;

  const hasCanvasDesign = userImg || draftBgSet;
  if (!hasCanvasDesign) {
    showToast("이미지 업로드 또는 배경 설정 후 시안을 추가해주세요.", "warn");
    return false;
  }

  const p = profileEl.value;
  const cap = capTypeEl.value;
  const laser = p === "OEM" ? laserEl.value : "none";
  const qty = Math.max(1, toInt(qtyEl?.value, 1));
  const id = "it_" + Math.random().toString(36).slice(2, 10);

const item = {
  id,
  profile: p,
  capType: cap,
  laser,
  qty,
  bgColor: draftBgColor || "#ffffff",
  originalFile: userImgFile || null, // 레이저 원본파일
  design: {
    imgDataUrl: null,
    cx: imgCX,
    cy: imgCY,
    scaleX: imgScaleX,
    scaleY: imgScaleY,
    rot: imgRot,
    bgSet: !!draftBgSet,
  },
};

  saveCanvasToItem(item);
  cartItems.unshift(item);

  clearEditor();
  renderCart();
  updateDraftInfo();
  updateActionLocks();

  showToast("시안이 추가되었습니다.", "ok");
  return true;
}


/* =========================================================
 * HTML 이스케이프
========================================================= */
function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

/* =========================================================
 * 장바구니 썸네일 HTML
========================================================= */
function makeCartThumb(item) {
  const bg = escapeHtml(getItemBgColor(item));
  const imgUrl = item?.design?.imgDataUrl || "";

  if (imgUrl) {
    return `
      <div class="cartThumb" style="background:${bg};">
        <img src="${imgUrl}" alt="시안 썸네일" />
      </div>
    `;
  }

  return `
    <div class="cartThumb" style="background:${bg};">
      <div class="thumbEmpty"></div>
    </div>
  `;
}

/* =========================================================
 * 장바구니 1개 카드 HTML
========================================================= */
function buildCartItemHtml(item) {
  const activeClass = selectedItemId === item.id ? " selected" : "";
  const title = `${safeTrim(item.profile) || "-"} / ${safeTrim(item.capType) || "-"}`;
  const laserText = labelLaser(item);
  const qtyNum = Math.max(1, toInt(item.qty ?? 1, 1));
  const qtyText = `${qtyNum}개`;
  const bg = getItemBgColor(item);
  const designText = hasDesign(item) ? "디자인 있음" : "디자인 없음";

  return `
    <div class="cartItem${activeClass}" data-id="${escapeHtml(item.id)}">
      <div class="cartTop">
        ${makeCartThumb(item)}

        <div class="cartBody" style="min-width:0;flex:1;">
          <div class="cartTitle"><b>${escapeHtml(title)}</b></div>

          <div class="cartMeta">
            <span>${escapeHtml(laserText)}</span>
            <span>${escapeHtml(bg)}</span>
            <span>${escapeHtml(designText)}</span>
          </div>

          <div class="cartQtyRow">
            <button
              type="button"
              class="cartBtn qty minus"
              data-action="minus"
              data-id="${escapeHtml(item.id)}"
              aria-label="수량 감소"
            >-</button>

            <span class="cartQtyValue">${escapeHtml(qtyText)}</span>

            <button
              type="button"
              class="cartBtn qty plus"
              data-action="plus"
              data-id="${escapeHtml(item.id)}"
              aria-label="수량 증가"
            >+</button>

            <button
              type="button"
              class="cartBtn delete"
              data-action="delete"
              data-id="${escapeHtml(item.id)}"
              aria-label="삭제"
            >x</button>
          </div>
        </div>
      </div>
    </div>
  `;
}

/* =========================================================
 * 빈 장바구니 UI
========================================================= */
function renderEmptyCart() {
  if (!cartListEl) return;

  cartListEl.innerHTML = `
    <div class="cartItem cartEmpty">
      <div class="cartTitle"><b>추가된 시안이 없습니다.</b></div>
      <div class="cartMeta">좌측에서 이미지 업로드 또는 배경 설정 후 시안을 추가해주세요.</div>
    </div>
  `;

  if (cartCountEl) cartCountEl.textContent = "0";

  updateActionLocks?.();
}

/* =========================================================
 * 장바구니 렌더링
========================================================= */
function renderCart() {
  if (!cartListEl) return;

  if (!Array.isArray(cartItems) || !cartItems.length) {
    renderEmptyCart();
    return;
  }

  cartListEl.innerHTML = cartItems.map(buildCartItemHtml).join("");

  if (cartCountEl) {
    cartCountEl.textContent = String(cartItems.length);
  }

  updateActionLocks?.();
}

/* =========================================================
 * 장바구니 아이템 찾기
========================================================= */
function findCartItemById(id) {
  if (!Array.isArray(cartItems)) return null;
  return cartItems.find((item) => String(item.id) === String(id)) || null;
}

/* =========================================================
 * 장바구니 이벤트 위임
========================================================= */
cartListEl?.addEventListener("click", async (e) => {
  const actionBtn = e.target.closest("[data-action]");
  const card = e.target.closest(".cartItem[data-id]");
  const id = actionBtn?.dataset.id || card?.dataset.id;

  if (!id) return;

  if (actionBtn) {
    e.preventDefault();
    e.stopPropagation();

    const action = actionBtn.dataset.action;
    const item = findCartItemById(id);

    if (!item && action !== "delete") return;

    if (action === "delete") {
      removeItem(id);
      updateActionLocks?.();
      return;
    }

    if (action === "minus") {
      item.qty = Math.max(1, toInt(item.qty ?? 1, 1) - 1);
      renderCart();
      showToast(`수량을 ${item.qty}개로 변경했습니다.`, "info", 1600);
      return;
    }

    if (action === "plus") {
      item.qty = Math.max(1, toInt(item.qty ?? 1, 1) + 1);
      renderCart();
      showToast(`수량을 ${item.qty}개로 변경했습니다.`, "info", 1600);
      return;
    }
  }

  await selectItem(id);
});
