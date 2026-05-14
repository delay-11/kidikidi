/* moved from js/design/panel-right.js */
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

  // 실제 캔버스 크기와 배경 UI는 loadItemToCanvas()에서 저장된 시안 상태 기준으로 복원합니다.
  refreshOpenTooltips();
}

/* =========================================================
 * 아이템 선택
========================================================= */
function cloneItemForEditorLoad(item) {
  // 시안 확인/수정 시에는 저장된 시안 자체를 건드리지 않고,
  // 저장 상태를 편집 캔버스에 복원만 해야 합니다.
  // 그래서 로드용 얕은 복사본을 만들어 이전 시안이 초기화/덮어쓰기 되지 않게 합니다.
  return {
    ...item,
    originalFile: item.originalFile || null,
    design: item.design ? JSON.parse(JSON.stringify(item.design)) : null,
  };
}

async function selectItem(id) {
  if (uiLocked) return;

  if (selectedItemId && selectedItemId !== id) {
    const prev = cartItems.find((x) => x.id === selectedItemId);
    if (prev && typeof saveCanvasToItem === "function") {
      saveCanvasToItem(prev);
    }
  }

  const it = cartItems.find((x) => x.id === id);
  if (!it) return;

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

  const loadSnapshot = cloneItemForEditorLoad(it);

  selectedItemId = id;
  syncLeftFormFromItem(it);

  const size = getCanvasSize(it.profile, it.capType);
  resizeCanvasKeepView(size.w, size.h);

  await loadItemToCanvas(loadSnapshot);

  if (selTextEl) {
    selTextEl.textContent = `${it.profile} / ${getCapTypeDisplayName(it.capType)}`;
  }
  if (bgTextEl) bgTextEl.textContent = getItemBgLabel?.(it) || getItemBgColor(it);

  updateBgLockUI(it.profile, it.laser);
  redraw?.();

  // 확인/확정 화면에서 시안 카드나 "시안 수정"을 누르면
  // 저장된 시안 상태를 편집 캔버스에 복원한 뒤 제작 화면으로 돌아갑니다.
  if (document.body?.dataset?.step === "confirm") {
    setDesignStep?.("editor");
  }

  renderCart();
  updateActionLocks();
}

/* =========================================================
 * 새 시안 추가
========================================================= */
function addCurrentItemToCart() {
  if (!validateUserInfo(true)) return false;

  const hasCanvasDesign = userImg || draftBgSet || (typeof textEnabled !== "undefined" && textEnabled && safeTrim(textValue));
  if (!hasCanvasDesign) {
    showToast("이미지 업로드, 배경 설정 또는 텍스트 추가 후 시안을 추가해주세요.", "warn");
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
      bgType: draftBgType,
      bgColor2: draftBgColor2 || "#fdcc63",
      bgDirection: draftBgDirection || "to-right",
      text: getCurrentTextState?.() || { enabled: false, value: "" },
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
 * 수량 정리
========================================================= */
function normalizeQty(value) {
  const qty = parseInt(value, 10);
  if (Number.isNaN(qty) || qty < 1) return 1;
  return qty;
}

/* =========================================================
 * 장바구니 썸네일 HTML
========================================================= */
function makeCartThumb(item) {
  const bg = escapeHtml(getItemBgCss?.(item) || getItemBgColor(item));
  const previewUrl = item?.design?.previewDataUrl || "";
  const rawImgUrl = item?.design?.imgDataUrl || "";

  if (previewUrl) {
    return `
      <div class="cartThumb cartThumbRendered">
        <img src="${previewUrl}" alt="시안 썸네일" />
      </div>
    `;
  }

  if (rawImgUrl) {
    return `
      <div class="cartThumb" style="background:${bg};">
        <img src="${rawImgUrl}" alt="시안 썸네일" />
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
  const title = `${safeTrim(item.profile) || "-"} / ${getCapTypeDisplayName(item.capType)}`;
  const laserText = labelLaser(item);
  const qtyNum = normalizeQty(item.qty ?? 1);
  const bg = getItemBgLabel?.(item) || getItemBgColor(item);
  const textMeta = item?.design?.text?.enabled ? "텍스트 있음" : "";
  const designText = hasDesign(item) ? ["디자인 있음", textMeta].filter(Boolean).join(" · ") : "디자인 없음";

  return `
    <div class="cartItem cartDesignCard${activeClass}" data-id="${escapeHtml(item.id)}">
      <div class="cartTop">
        ${makeCartThumb(item)}

        <div class="cartBody">
          <div class="cartTitle"><b>${escapeHtml(title)}</b></div>
          <div class="cartMeta cartMetaStack">
            <span>${escapeHtml(laserText)}</span>
            <span class="cartBgMeta">${escapeHtml(bg)}</span>
            <span>${escapeHtml(designText)}</span>
          </div>
        </div>
      </div>

      <div class="cartCardActions">
        <button
          type="button"
          class="cartEditBtn"
          data-action="edit"
          data-id="${escapeHtml(item.id)}"
        >시안 수정</button>

        <div class="cartQtyRow">
          <button
            type="button"
            class="cartBtn qty minus"
            data-action="minus"
            data-id="${escapeHtml(item.id)}"
            aria-label="수량 감소"
          >-</button>

          <input
            type="number"
            class="cartQtyInput"
            data-id="${escapeHtml(item.id)}"
            value="${qtyNum}"
            min="1"
            step="1"
            inputmode="numeric"
            aria-label="수량 입력"
          />

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
  const qtyInput = e.target.closest(".cartQtyInput");
  const card = e.target.closest(".cartItem[data-id]");
  const id = actionBtn?.dataset.id || qtyInput?.dataset.id || card?.dataset.id;

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

    if (action === "edit") {
      await selectItem(id);
      showToast("선택한 시안을 불러왔습니다.", "info", 1400);
      return;
    }

    if (action === "minus") {
      item.qty = Math.max(1, normalizeQty(item.qty ?? 1) - 1);

      if (selectedItemId === id && qtyEl) {
        qtyEl.value = String(item.qty);
      }

      renderCart();
      showToast(`수량을 ${item.qty}개로 변경했습니다.`, "info", 1600);
      return;
    }

    if (action === "plus") {
      item.qty = Math.max(1, normalizeQty(item.qty ?? 1) + 1);

      if (selectedItemId === id && qtyEl) {
        qtyEl.value = String(item.qty);
      }

      renderCart();
      showToast(`수량을 ${item.qty}개로 변경했습니다.`, "info", 1600);
      return;
    }
  }

  if (qtyInput) {
    e.stopPropagation();
    return;
  }

  await selectItem(id);
});

/* =========================================================
 * 장바구니 수량 직접 입력
========================================================= */
cartListEl?.addEventListener("input", (e) => {
  const input = e.target.closest(".cartQtyInput");
  if (!input) return;

  const id = input.dataset.id;
  const item = findCartItemById(id);
  if (!item) return;

  item.qty = normalizeQty(input.value);

  if (selectedItemId === id && qtyEl) {
    qtyEl.value = String(item.qty);
  }
});

/* =========================================================
 * 장바구니 수량 입력값 보정
========================================================= */
cartListEl?.addEventListener("change", (e) => {
  const input = e.target.closest(".cartQtyInput");
  if (!input) return;

  const id = input.dataset.id;
  const item = findCartItemById(id);
  if (!item) return;

  item.qty = normalizeQty(input.value);
  input.value = String(item.qty);

  if (selectedItemId === id && qtyEl) {
    qtyEl.value = String(item.qty);
  }

  renderCart();
  showToast(`수량을 ${item.qty}개로 변경했습니다.`, "info", 1600);
});