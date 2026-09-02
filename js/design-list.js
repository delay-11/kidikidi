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
    originalFiles: Array.isArray(item.originalFiles) ? item.originalFiles.slice() : [],
    design: item.design ? JSON.parse(JSON.stringify(item.design)) : null,
  };
}

async function selectItem(id) {
  if (uiLocked) return;

  // 다른 시안으로 넘어가기 전 현재 편집 상태를 저장합니다.
  // 단, 시안 불러오기 중에는 userImg가 잠깐 null이므로 저장하면 기존 이미지가 날아갑니다.
  if (selectedItemId && selectedItemId !== id && !(typeof isLoadingItemToCanvas !== "undefined" && isLoadingItemToCanvas)) {
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

  const hasCanvasDesign = (typeof hasImageObject === "function" ? hasImageObject() : !!userImg) || draftBgSet || (typeof hasTextObject === "function" && hasTextObject());
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
    originalFiles: typeof collectOriginalFiles === "function" ? collectOriginalFiles() : [], // 레이저 원본파일
    design: {
      imgDataUrl: null,
      images: typeof serializeImageObjects === "function" ? serializeImageObjects() : [],
      cx: imgCX,
      cy: imgCY,
      scaleX: imgScaleX,
      scaleY: imgScaleY,
      rot: imgRot,
      bgSet: !!draftBgSet,
      bgType: draftBgType,
      bgColor2: draftBgColor2 || "#fdcc63",
      bgDirection: draftBgDirection || "to-right",
      bgPosition: typeof normalizeGradientPosition === "function" ? normalizeGradientPosition(draftGradientPosition) : 0.5,
      bgSoftness: typeof normalizeGradientSoftness === "function" ? normalizeGradientSoftness(draftGradientSoftness) : 1,
      text: getCurrentTextState?.() || { enabled: false, value: "" },
    },
  };

  saveCanvasToItem(item);

  // 시안 리스트에서 기존 시안을 선택한 상태라면 새로 추가하지 않고 해당 시안을 수정 저장합니다.
  // 기존 코드처럼 무조건 unshift 하면 "시안 수정" 후 같은 시안이 하나 더 생깁니다.
  const editIdx = selectedItemId ? cartItems.findIndex((x) => x.id === selectedItemId) : -1;
  if (editIdx >= 0) {
    item.id = selectedItemId;
    cartItems[editIdx] = item;
    showToast("시안이 수정되었습니다.", "ok");
  } else {
    // 수정 이유: unshift로 맨 앞에 추가하면 나중에 추가한 시안이 먼저 추가한
    // 시안보다 배열 앞쪽에 오게 되어, 파일명 순번(_01, _02...)과 접수 메일의
    // "시안 N" 번호가 실제로 만든 순서와 반대로 매겨짐(가장 나중에 올린
    // 시안이 1번이 됨). 항상 맨 뒤에 추가해서 시안 번호가 실제 업로드/제작
    // 순서와 일치하도록 한다.
    cartItems.push(item);
    showToast("시안이 추가되었습니다.", "ok");
  }

  clearEditor();
  renderCart();
  updateDraftInfo();
  updateActionLocks();

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
  const rawImgUrl = item?.design?.imgDataUrl || item?.design?.images?.[0]?.imgDataUrl || "";

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
  const textCount = Array.isArray(item?.design?.texts)
    ? item.design.texts.filter((t) => !!safeTrim(t?.value || "")).length
    : item?.design?.text?.enabled
      ? 1
      : 0;
  const textMeta = textCount ? (textCount > 1 ? `텍스트 ${textCount}개` : "텍스트 있음") : "";
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