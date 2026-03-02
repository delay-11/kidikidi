/* =========================
 * EmailJS 설정
 * ========================= */
const COMPANY_EMAIL = "bbolcat@naver.com";
const EMAILJS_PUBLIC_KEY = "YOUR_PUBLIC_KEY";
const EMAILJS_SERVICE_ID = "YOUR_SERVICE_ID";

// 회사로: 주문정보 + 시안 + (견적이면 사업자/일정/납기 포함)
const EMAILJS_TEMPLATE_ID = "YOUR_TEMPLATE_ID";

// 고객에게: 견적서(견적 요청 켠 경우에만)
const EMAILJS_QUOTE_TEMPLATE_ID = "YOUR_QUOTE_TEMPLATE_ID";

/* =========================
 * ✅ [ADD] 시안 확정 주문번호 잠금 + URL 주문번호 자동입력
 * ========================= */
const CONFIRM_KEY_PREFIX = "design_confirmed_";
let uiLocked = false;
let didConfirmedPopup = false;

function getOrderFromUrl() {
  try {
    const sp = new URLSearchParams(location.search);
    return (sp.get("order") || "").trim();
  } catch {
    return "";
  }
}
function confirmKey(orderNo) {
  return CONFIRM_KEY_PREFIX + String(orderNo || "").trim();
}
function isOrderConfirmed(orderNo) {
  const o = String(orderNo || "").trim();
  if (!o) return false;
  return localStorage.getItem(confirmKey(o)) === "true";
}
function markOrderConfirmed(orderNo) {
  const o = String(orderNo || "").trim();
  if (!o) return;
  localStorage.setItem(confirmKey(o), "true");
}

/** ✅ [ADD] 확정 주문이면 전체 잠금 (주문번호 포함) */
function setAllLocked(locked) {
  uiLocked = !!locked;

  const lockEls = [
    nameEl,
    phoneEl,
    orderEl,
    emailEl,

    quoteToggleEl,
    quoteProdEl,
    quoteDueEl,
    bizFileEl,
    bizFileBtn,

    profileEl,
    capTypeEl,
    laserEl,
    qtyEl,

    fileEl,
    fileBtn,
    fileDelBtn,

    bgPickBtn,

    btnAddItemEl,
    btnConfirmEl,
  ];

  lockEls.forEach((el) => {
    if (!el) return;
    el.disabled = uiLocked;
  });

  // 장바구니/캔버스 영역 클릭 막기
  if (cartListEl) {
    cartListEl.style.pointerEvents = uiLocked ? "none" : "auto";
    cartListEl.style.opacity = uiLocked ? "0.55" : "1";
  }
  if (canvasWrapEl) {
    canvasWrapEl.style.pointerEvents = uiLocked ? "none" : "auto";
    canvasWrapEl.style.opacity = uiLocked ? "0.55" : "1";
  }
  if (bboxEl) {
    bboxEl.style.pointerEvents = uiLocked ? "none" : "auto";
  }

  // 안내 문구
  if (uiLocked) {
    if (okEl) okEl.textContent = "이미 시안이 접수된 주문번호입니다.";
    if (msgEl) msgEl.textContent = "";
  }
}

/** ✅ [ADD] 주문번호 기준으로 잠금 적용 + 필요시 팝업 */
function applyConfirmedLockIfNeeded(showPopup = false) {
  const orderNo = orderEl?.value?.trim() || "";
  const locked = isOrderConfirmed(orderNo);

  if (!locked) {
    setAllLocked(false);
    return false;
  }

  setAllLocked(true);

  if (showPopup && !didConfirmedPopup) {
    didConfirmedPopup = true;
    alert("이미 시안 확정된 주문번호입니다");
  }

  return true;
}

/* =========================
 * 가격표
 * ========================= */
const PRICE = {
  OEM: {
    "R1-1u": 1280,
    "R1-1.25u": 1580,
    "R1-2.25u": 1780,
    "R1-2.75u": 1980,
    "R1-6.25u": 2280,
    "R2-1u": 1280,
    "R2-1u(돌기)": 1280,
    "R2-1.75u": 1580,
    "R2-2.25u": 1780,
    "R3-1u": 1280,
    "R3-1.5u": 1580,
    "R4-1u": 1280,
    "R4-2u": 1780,
  },
  XDA: { STD: 1680 },
  MAO: { STD: 1780 },
};
const LASER_ADDON = { none: 0, black: 800, white: 1800 };

/* =========================
 * 캔버스 사이즈
 * ========================= */
const CANVAS_SIZE_MAP = {
  "R1-1u": { w: 330, h: 330 },
  "R2-1u": { w: 330, h: 330 },
  "R2-1u(돌기)": { w: 330, h: 330 },
  "R3-1u": { w: 330, h: 330 },
  "R4-1u": { w: 330, h: 330 },
  STD: { w: 330, h: 330 },

  "R1-1.25u": { w: 410, h: 330 },
  "R3-1.5u": { w: 495, h: 330 },
  "R2-1.75u": { w: 580, h: 330 },
  "R4-2u": { w: 660, h: 330 },
  "R1-2.25u": { w: 740, h: 330 },
  "R2-2.25u": { w: 740, h: 330 },
  "R1-2.75u": { w: 900, h: 330 },
  "R1-6.25u": { w: 2060, h: 330 },
};

function getCanvasSize(profile, capType) {
  if (profile === "OEM") return CANVAS_SIZE_MAP[capType] || { w: 330, h: 330 };
  return CANVAS_SIZE_MAP["STD"] || { w: 330, h: 330 };
}

/* =========================
 * 옵션 목록
 * ========================= */
const CAP_OPTIONS = {
  OEM: [
    { value: "R1-1u", label: "R1-1u" },
    { value: "R1-1.25u", label: "R1-1.25u (Ctrl/Alt 등)" },
    { value: "R1-2.25u", label: "R1-2.25u (좌측 쉬프트)" },
    { value: "R1-2.75u", label: "R1-2.75u (우측 쉬프트)" },
    { value: "R1-6.25u", label: "R1-6.25u (스페이스바)" },
    { value: "R2-1u", label: "R2-1u" },
    { value: "R2-1u(돌기)", label: "R2-1u (돌기)" },
    { value: "R2-1.75u", label: "R2-1.75u (Caps Lock)" },
    { value: "R2-2.25u", label: "R2-2.25u (Enter)" },
    { value: "R3-1u", label: "R3-1u" },
    { value: "R3-1.5u", label: "R3-1.5u (Tab/₩)" },
    { value: "R4-1u", label: "R4-1u" },
    { value: "R4-2u", label: "R4-2u (Backspace)" },
  ],
  XDA: [{ value: "STD", label: "XDA" }],
  MAO: [{ value: "STD", label: "MAO" }],
};

/* =========================
 * DOM
 * ========================= */
const $ = (id) => document.getElementById(id);

const msgEl = $("msg");
const okEl = $("ok");

const nameEl = $("name");
const phoneEl = $("phone");
const orderEl = $("orderNo");
const emailEl = $("email");

const quoteToggleEl = $("quoteToggle");
const quoteBoxEl = $("quoteBox");
const quoteProdEl = $("quoteProd");
const quoteDueEl = $("quoteDue");

const bizFileEl = $("bizFile");
const bizFileBtn = $("bizFileBtn");
const bizFileNameEl = $("bizFileName");

const profileEl = $("profile");
const capTypeEl = $("capType");
const laserEl = $("laser");
const qtyEl = $("qty");

const unitPriceText = $("unitPriceText");

const cartListEl = $("cartList");
const cartCountEl = $("cartCount");
const cartTotalEl = $("cartTotal");

const selTextEl = $("selText");
const canvasTextEl = $("canvasText");
const bgTextEl = $("bgText");

const fileEl = $("file");
const fileBtn = $("fileBtn");
const fileDelBtn = $("fileDelBtn");
const fileNameEl = $("fileName");

const bgPickBtn = $("bgPickBtn");
const bgPickMount = $("bgPickMount");
const bgColorSwatch = $("bgColorSwatch");
const bgColorValue = $("bgColorValue");

const btnAddItemEl = $("btnAddItem");
const btnConfirmEl = $("btnConfirm");

const canvasWrapEl = $("canvasWrap");
const canvas = $("designCanvas");
const ctx = canvas.getContext("2d");

const bboxEl = $("bbox");
const rotHandleEl = $("rotHandle");

/* =========================
 * [ADD] 필드별 에러 메시지 + 빨간 테두리 (CSS 주입)
 * ========================= */
(function injectErrCss() {
  const css = `
    .fieldErr{margin-top:6px;font-size:12px;color:#d92d20;display:none}
    .fieldErr.show{display:block}
    .inputInvalid{border-color:#d92d20 !important; box-shadow:0 0 0 3px rgba(217,45,32,.18) !important;}
    .inlineCheck{display:flex;align-items:center;gap:8px;font-size:13px;color:var(--txt);}
  `;
  const style = document.createElement("style");
  style.textContent = css;
  document.head.appendChild(style);
})();

const fieldErr = { name: null, phone: null, order: null, email: null };

function ensureFieldErrorBox(inputEl, key) {
  if (!inputEl) return null;
  const wrap = inputEl.parentElement;
  if (!wrap) return null;

  let box = wrap.querySelector(`.fieldErr[data-err="${key}"]`);
  if (box) return box;

  box = document.createElement("div");
  box.className = "fieldErr";
  box.dataset.err = key;
  wrap.appendChild(box);
  return box;
}

fieldErr.name = ensureFieldErrorBox(nameEl, "name");
fieldErr.phone = ensureFieldErrorBox(phoneEl, "phone");
fieldErr.order = ensureFieldErrorBox(orderEl, "order");
fieldErr.email = ensureFieldErrorBox(emailEl, "email");

function setInputInvalid(inputEl, isInvalid) {
  if (!inputEl) return;
  inputEl.classList.toggle("inputInvalid", !!isInvalid);
}

function setFieldError(key, message) {
  const box = fieldErr[key];
  if (!box) return;

  const mapInput = {
    name: nameEl,
    phone: phoneEl,
    order: orderEl,
    email: emailEl,
  };

  if (!message) {
    box.textContent = "";
    box.classList.remove("show");
    setInputInvalid(mapInput[key], false);
    return;
  }

  box.textContent = message;
  box.classList.add("show");
  setInputInvalid(mapInput[key], true);
}

function clearFieldErrors() {
  setFieldError("name", "");
  setFieldError("phone", "");
  setFieldError("order", "");
  setFieldError("email", "");
}

/* =========================
 * [ADD] 수량 할인 + 제작일정(총액 할증)
 * ========================= */
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

/* =========================
 * 상태(장바구니/캔버스/견적)
 * ========================= */
let cartItems = [];
let selectedItemId = null;

// 견적 상태(주문 단위)
let quoteEnabled = false;
let quoteProd = "none";
let quoteDue = "";
let bizFileDataUrl = null;

// 캔버스 편집 상태
let userImg = null;
let imgCX = 0,
  imgCY = 0;
let imgScale = 1;
let imgRot = 0;

// 드래그 상태
let draggingMove = false;
let moveStart = { x: 0, y: 0 };
let centerStart = { x: 0, y: 0 };
let handleDrag = null;
let rotateDrag = null;

/* =========================
 * 단가/배경 규칙
 * ========================= */
function getUnitPrice(profile, capType, laser) {
  const base = PRICE?.[profile]?.[capType] ?? 0;
  const add = profile === "OEM" ? (LASER_ADDON?.[laser] ?? 0) : 0;
  return { base, add, unit: base + add };
}

// 아이템별 배경(레이저 강제는 예외)
function getItemBgColor(it) {
  const profile = it?.profile || profileEl.value;
  const laser = it?.laser || (profile === "OEM" ? laserEl.value : "none");

  if (profile === "OEM" && laser === "black") return "#000000";
  if (profile === "OEM" && laser === "white") return "#ffffff";
  return it?.bgColor || "#ffffff";
}

// 시안 판정: 이미지 있거나 배경 설정(bgSet) true면 OK
function hasDesign(it) {
  return !!it?.design?.imgDataUrl || !!it?.design?.bgSet;
}

/* =========================
 * 아이템 라인 계산: 할인까지만 (✅ 할증은 총액에서만)
 * ========================= */
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

/* =========================
 * Pickr 배경색 (Save 버튼 없이 즉시 반영)
 * ========================= */
let bgPickr = null;

function setBgUI(hex) {
  const v = (hex || "#ffffff").toLowerCase();
  if (bgColorSwatch) bgColorSwatch.style.background = v;
  if (bgColorValue) bgColorValue.textContent = v;
}

function initPickr() {
  if (!bgPickMount || !window.Pickr) return;

  bgPickr = Pickr.create({
    el: bgPickMount,
    theme: "nano",
    default: "#ffffff",
    showAlways: false,
    closeOnScroll: true,
    defaultRepresentation: "HEX",
    components: {
      preview: true,
      opacity: false,
      hue: true,
      interaction: {
        input: true,
        save: false,
      },
    },
  });

  bgPickBtn?.addEventListener("click", () => {
    if (uiLocked) return; // ✅ [ADD] 잠금이면 색상 변경 막기
    bgPickr && bgPickr.show();
  });

  bgPickr.on("change", (color) => {
    if (uiLocked) return; // ✅ [ADD]
    if (!color) return;

    const hex = color.toHEXA().toString().toLowerCase();
    setBgUI(hex);

    const it = cartItems.find((x) => x.id === selectedItemId);
    if (it) {
      it.bgColor = hex;
      it.design = it.design || {};
      it.design.bgSet = true;
      bgTextEl.textContent = getItemBgColor(it);
    }

    redraw();
    renderCart();
    updatePriceUI();
    updateActionLocks();
  });

  setBgUI("#ffffff");
}
initPickr();

function updateBgLockUI(profile, laser) {
  const wrap = bgPickBtn?.closest(".colorPick");
  const locked = profile === "OEM" && (laser === "black" || laser === "white");
  if (wrap) wrap.classList.toggle("isLocked", locked);

  if (locked) {
    const forced = laser === "black" ? "#000000" : "#ffffff";
    setBgUI(forced);
    const it = cartItems.find((x) => x.id === selectedItemId);
    if (it) {
      it.design = it.design || {};
      it.design.bgSet = true;
      bgTextEl.textContent = forced;
    }
  } else {
    const it = cartItems.find((x) => x.id === selectedItemId);
    setBgUI(it?.bgColor || "#ffffff");
  }
}

/* =========================
 * 캔버스 사이즈 변경
 * ========================= */
function resizeCanvas(w, h) {
  canvas.width = w;
  canvas.height = h;
  canvasTextEl.textContent = `${w}×${h}`;
}

function resizeCanvasKeepView(w, h) {
  const oldW = canvas.width;
  const oldH = canvas.height;

  const rx = oldW ? imgCX / oldW : 0.5;
  const ry = oldH ? imgCY / oldH : 0.5;

  resizeCanvas(w, h);

  imgCX = canvas.width * rx;
  imgCY = canvas.height * ry;
  redraw();
}

function applyCanvasSizeFromForm() {
  const p = profileEl.value;
  const cap = capTypeEl.value;

  const size = getCanvasSize(p, cap);
  resizeCanvasKeepView(size.w, size.h);

  const laser = p === "OEM" ? laserEl.value : "none";
  updateBgLockUI(p, laser);

  const it = cartItems.find((x) => x.id === selectedItemId);
  bgTextEl.textContent = it ? getItemBgColor(it) : "#ffffff";
}

/* =========================
 * 옵션 구성
 * ========================= */
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
  if (!isOEM) laserEl.value = "none";

  updateBgLockUI(profileEl.value, laserEl.value);
  updatePriceUI();
}

/* =========================
 * 검증(주문자/견적/확정)
 * ========================= */
function validateUserInfo(showMessage = false) {
  const name = nameEl.value.trim();
  const phone = phoneEl.value.trim();
  const orderNo = orderEl.value.trim();
  const email = emailEl.value.trim();

  const phoneRegex = /^01[0-9]-?[0-9]{3,4}-?[0-9]{4}$/;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (showMessage) clearFieldErrors();

  let ok = true;

  if (!name) {
    ok = false;
    if (showMessage) setFieldError("name", "주문자명을 입력해주세요.");
  }
  if (!phoneRegex.test(phone)) {
    ok = false;
    if (showMessage)
      setFieldError(
        "phone",
        "핸드폰 번호 형식이 올바르지 않습니다. (예: 010-1234-5678)",
      );
  }
  if (!orderNo) {
    ok = false;
    if (showMessage) setFieldError("order", "주문번호를 입력해주세요.");
  }
  if (!emailRegex.test(email)) {
    ok = false;
    if (showMessage) setFieldError("email", "이메일 형식이 올바르지 않습니다.");
  }

  if (showMessage) msgEl.textContent = ok ? "" : "필수 정보를 입력해주세요.";
  return ok;
}

function validateQuoteRequest(showMessage = false) {
  if (!quoteEnabled) return true;

  if (!quoteProd || quoteProd === "") {
    if (showMessage) msgEl.textContent = "제작 일정을 선택해주세요.";
    return false;
  }
  if (!quoteDue) {
    if (showMessage) msgEl.textContent = "납기일을 선택해주세요.";
    return false;
  }
  if (!bizFileDataUrl) {
    if (showMessage)
      msgEl.textContent = "사업자등록증 파일 업로드가 필요합니다.";
    return false;
  }
  return true;
}

function validateCanConfirm(showMessage = false) {
  if (!validateUserInfo(showMessage)) return false;

  if (cartItems.length === 0) {
    if (showMessage) msgEl.textContent = "장바구니에 아이템을 추가해주세요.";
    return false;
  }

  if (!cartItems.some((it) => hasDesign(it))) {
    if (showMessage)
      msgEl.textContent = "최소 1개 이상 배경색 또는 이미지를 설정해주세요.";
    return false;
  }

  if (!validateQuoteRequest(showMessage)) return false;
  return true;
}

/* =========================
 * 버튼 잠금/활성
 * ========================= */
function updateActionLocks() {
  if (uiLocked) {
    // ✅ [ADD] 잠금 상태면 강제로 비활성(중복 방지)
    if (btnAddItemEl) btnAddItemEl.disabled = true;
    if (btnConfirmEl) btnConfirmEl.disabled = true;
    if (fileDelBtn) fileDelBtn.disabled = true;
    return;
  }

  btnAddItemEl.disabled = !validateUserInfo(false);
  btnConfirmEl.disabled = !validateCanConfirm(false);

  const it = cartItems.find((x) => x.id === selectedItemId);
  if (fileDelBtn)
    fileDelBtn.disabled = !(it && it.design && it.design.imgDataUrl);
}

/* =========================
 * 주문자 입력 이벤트 (blur에서 에러 표시)
 * ========================= */
[nameEl, phoneEl, orderEl, emailEl].forEach((el) => {
  if (!el) return;

  el.addEventListener("input", () => {
    if (uiLocked) return; // ✅ [ADD]
    clearFieldErrors();
    msgEl.textContent = "";
    updateActionLocks();
  });

  el.addEventListener("blur", () => {
    if (uiLocked) return; // ✅ [ADD]
    validateUserInfo(true);
    // ✅ [ADD] 혹시 수동 입력 케이스라도 “확정 주문번호”면 즉시 잠금 + 팝업
    if (el === orderEl) applyConfirmedLockIfNeeded(true);
    updateActionLocks();
  });
});

/* =========================
 * 견적 토글 UI
 * ========================= */
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
  }

  updatePriceUI();
  renderCart();
  updateActionLocks();
}

quoteToggleEl?.addEventListener("change", () => {
  if (uiLocked) return; // ✅ [ADD]
  setQuoteUI(quoteToggleEl.checked);
});

quoteProdEl?.addEventListener("change", () => {
  if (uiLocked) return; // ✅ [ADD]
  quoteProd = quoteProdEl.value;
  updatePriceUI();
  renderCart();
  updateActionLocks();
});

quoteDueEl?.addEventListener("change", () => {
  if (uiLocked) return; // ✅ [ADD]
  quoteDue = quoteDueEl.value || "";
  updateActionLocks();
});

bizFileBtn?.addEventListener("click", () => {
  if (uiLocked) return; // ✅ [ADD]
  bizFileEl?.click();
});

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

bizFileEl?.addEventListener("change", async () => {
  if (uiLocked) return; // ✅ [ADD]
  const f = bizFileEl.files && bizFileEl.files[0];
  if (!f) return;

  if (bizFileNameEl) bizFileNameEl.textContent = f.name;

  try {
    bizFileDataUrl = await fileToDataUrl(f);

    if (bizFileDataUrl.length > 1_000_000) {
      bizFileDataUrl = null;
      if (bizFileNameEl) bizFileNameEl.textContent = "선택된 파일 없음";
      msgEl.textContent =
        "사업자등록증 파일 용량이 너무 큽니다. 줄여서 다시 업로드해주세요.";
    } else {
      okEl.textContent = "사업자등록증 파일이 업로드되었습니다.";
    }
  } catch (e) {
    bizFileDataUrl = null;
    msgEl.textContent = "사업자등록증 파일을 읽는 중 오류가 발생했습니다.";
  } finally {
    bizFileEl.value = "";
    updateActionLocks();
  }
});

/* =========================
 * 이벤트: 옵션 변경
 * ========================= */
profileEl.addEventListener("change", () => {
  if (uiLocked) return; // ✅ [ADD]
  setCapTypeOptions();
  applyCanvasSizeFromForm();
  redraw();
  updatePriceUI();
  updateActionLocks();
});

capTypeEl.addEventListener("change", () => {
  if (uiLocked) return; // ✅ [ADD]
  applyCanvasSizeFromForm();
  updatePriceUI();
  updateActionLocks();
});

qtyEl.addEventListener("input", () => {
  if (uiLocked) return; // ✅ [ADD]
  updatePriceUI();

  const it = cartItems.find((x) => x.id === selectedItemId);
  if (it) {
    it.qty = Math.max(1, parseInt(qtyEl.value || "1", 10));
    renderCart();
  }
  updateActionLocks();
});

laserEl.addEventListener("change", () => {
  if (uiLocked) return; // ✅ [ADD]
  updateBgLockUI(profileEl.value, laserEl.value);

  const it = cartItems.find((x) => x.id === selectedItemId);
  if (it) {
    it.laser = it.profile === "OEM" ? laserEl.value : "none";
    it.design = it.design || {};
    it.design.bgSet = true;
    bgTextEl.textContent = getItemBgColor(it);
  }

  redraw();
  renderCart();
  updatePriceUI();
  updateActionLocks();
});

/* =========================
 * 가격 UI (왼쪽: 선택 입력 기준 + 총액 정보)
 * ========================= */
function updatePriceUI() {
  const p = profileEl.value;
  const cap = capTypeEl.value;
  const laser = p === "OEM" ? laserEl.value : "none";
  const q = Math.max(1, parseInt(qtyEl.value || "1", 10));

  const { base, unit } = getUnitPrice(p, cap, laser);
  if (!base) {
    unitPriceText.textContent = "가격 미설정";
    return;
  }

  const baseLine = unit * q;
  const discRate = getVolumeDiscountRate(q);
  const afterDiscount = Math.round(baseLine * (1 - discRate));

  const sub = cartSubtotal();
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
    (quoteEnabled ? ` / 납기 ${quoteDue || "-"}` : "");
}

/* =========================
 * 장바구니
 * ========================= */
function labelLaser(it) {
  if (it.profile !== "OEM") return "레이저 없음";
  if (it.laser === "black") return "레이저 블랙";
  if (it.laser === "white") return "레이저 화이트";
  return "레이저 없음";
}

function renderCart() {
  cartListEl.innerHTML = "";
  cartCountEl.textContent = String(cartItems.length);

  const rate = quoteEnabled ? getRushRate(quoteProd) : 0;
  const total = cartTotal();
  const rushText = rate ? ` (총액 +${Math.round(rate * 100)}%)` : "";
  cartTotalEl.textContent = total.toLocaleString() + "원" + rushText;

  if (cartItems.length === 0) {
    const div = document.createElement("div");
    div.className = "hint";
    div.textContent =
      "제작된 시안이 없습니다. 왼쪽에서 옵션 선택 후 [시안 추가]를 눌러주세요.";
    cartListEl.appendChild(div);
    selTextEl.textContent = "없음";
    bgTextEl.textContent = "-";
    updateActionLocks();
    return;
  }

  for (const it of cartItems) {
    const box = document.createElement("div");
    box.className = "cartItem" + (it.id === selectedItemId ? " selected" : "");
    box.addEventListener("click", () => {
      if (uiLocked) return; // ✅ [ADD]
      selectItem(it.id);
    });

    const calc = calcLineTotal(it);
    const bg = getItemBgColor(it);
    const discText = calc.discRate
      ? `할인 ${Math.round(calc.discRate * 100)}%`
      : "할인 없음";

    box.innerHTML = `
      <div class="cartTop">
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

    box.querySelector('[data-act="minus"]').addEventListener("click", (e) => {
      e.stopPropagation();
      if (uiLocked) return; // ✅ [ADD]
      it.qty = Math.max(1, it.qty - 1);
      if (it.id === selectedItemId) qtyEl.value = it.qty;
      renderCart();
      updatePriceUI();
      updateActionLocks();
    });

    box.querySelector('[data-act="plus"]').addEventListener("click", (e) => {
      e.stopPropagation();
      if (uiLocked) return; // ✅ [ADD]
      it.qty += 1;
      if (it.id === selectedItemId) qtyEl.value = it.qty;
      renderCart();
      updatePriceUI();
      updateActionLocks();
    });

    box.querySelector('[data-act="del"]').addEventListener("click", (e) => {
      e.stopPropagation();
      if (uiLocked) return; // ✅ [ADD]
      removeItem(it.id);
    });

    cartListEl.appendChild(box);
  }

  const sel = cartItems.find((x) => x.id === selectedItemId);
  selTextEl.textContent = sel ? `${sel.profile} / ${sel.capType}` : "없음";
  bgTextEl.textContent = sel ? getItemBgColor(sel) : "-";

  updateActionLocks();
}

function removeItem(id) {
  const idx = cartItems.findIndex((x) => x.id === id);
  if (idx >= 0) cartItems.splice(idx, 1);

  if (selectedItemId === id) {
    selectedItemId = cartItems[0]?.id ?? null;
    if (selectedItemId) selectItem(selectedItemId);
    else clearEditor();
  }

  renderCart();
  updatePriceUI();
  updateActionLocks();
}

/* =========================
 * 아이템 추가/선택
 * ========================= */
btnAddItemEl.addEventListener("click", () => {
  msgEl.textContent = "";
  okEl.textContent = "";

  // ✅ [ADD] 확정된 주문번호면 전부 막기
  if (applyConfirmedLockIfNeeded(true)) return;
  if (!validateUserInfo(true)) return;

  const p = profileEl.value;
  const cap = capTypeEl.value;
  const laser = p === "OEM" ? laserEl.value : "none";
  const qty = Math.max(1, parseInt(qtyEl.value || "1", 10));

  const { base } = getUnitPrice(p, cap, laser);
  if (base === 0) {
    msgEl.textContent = "선택하신 규격은 현재 주문이 불가능합니다.";
    return;
  }

  const id = "it_" + Math.random().toString(36).slice(2, 10);
  const item = {
    id,
    profile: p,
    capType: cap,
    laser,
    qty,
    bgColor: "#ffffff",
    design: { imgDataUrl: null, cx: 0, cy: 0, scale: 1, rot: 0, bgSet: false },
  };

  cartItems.unshift(item);
  selectItem(id);
  renderCart();
  updatePriceUI();

  okEl.textContent =
    "이미지 업로드 또는 배경색 설정 후 시안을 확정할 수 있습니다.";
  updateActionLocks();
});

function saveCanvasToItem(it) {
  it.design = it.design || {};
  it.design.imgDataUrl = userImg ? userImg.src : null;
  it.design.cx = imgCX;
  it.design.cy = imgCY;
  it.design.scale = imgScale;
  it.design.rot = imgRot;
}

async function loadItemToCanvas(it) {
  userImg = null;
  imgCX = it.design?.cx ?? canvas.width / 2;
  imgCY = it.design?.cy ?? canvas.height / 2;
  imgScale = it.design?.scale ?? 1;
  imgRot = it.design?.rot ?? 0;

  if (it.design?.imgDataUrl) {
    const img = new Image();
    await new Promise((res, rej) => {
      img.onload = res;
      img.onerror = rej;
      img.src = it.design.imgDataUrl;
    });
    userImg = img;
  }

  redraw();
}

function syncLeftFormFromItem(it) {
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

  qtyEl.value = it.qty;
  updateBgLockUI(it.profile, it.laser);

  setBgUI(it.bgColor || "#ffffff");
  updatePriceUI();
  applyCanvasSizeFromForm();
}

async function selectItem(id) {
  if (uiLocked) return; // ✅ [ADD]
  const prev = cartItems.find((x) => x.id === selectedItemId);
  if (prev) saveCanvasToItem(prev);

  const it = cartItems.find((x) => x.id === id);
  if (!it) return;

  selectedItemId = id;

  syncLeftFormFromItem(it);

  const size = getCanvasSize(it.profile, it.capType);
  resizeCanvasKeepView(size.w, size.h);

  if (!it.design || (it.design.cx === 0 && it.design.cy === 0)) {
    it.design = it.design || {};
    it.design.cx = canvas.width / 2;
    it.design.cy = canvas.height / 2;
    it.design.scale = it.design.scale ?? 1;
    it.design.rot = it.design.rot ?? 0;
    it.design.bgSet = it.design.bgSet ?? false;
  }

  await loadItemToCanvas(it);

  selTextEl.textContent = `${it.profile} / ${it.capType}`;
  bgTextEl.textContent = getItemBgColor(it);

  updateBgLockUI(it.profile, it.laser);
  renderCart();
  updatePriceUI();
  updateActionLocks();
}

function clearEditor() {
  userImg = null;
  imgCX = canvas.width / 2;
  imgCY = canvas.height / 2;
  imgScale = 1;
  imgRot = 0;
  redraw();
  updateActionLocks();
}

/* =========================
 * 이미지 업로드/삭제
 * ========================= */
fileBtn?.addEventListener("click", () => {
  msgEl.textContent = "";
  okEl.textContent = "";

  // ✅ [ADD] 확정된 주문번호면 업로드 막기
  if (applyConfirmedLockIfNeeded(true)) return;

  const it = cartItems.find((x) => x.id === selectedItemId);
  if (!it) {
    msgEl.textContent = "시안 제작 전 모든 정보를 입력해주세요.";
    return;
  }
  fileEl.click();
});

function loadImageFromFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = reader.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function fitImageToCanvas(img) {
  imgScale = Math.max(canvas.width / img.width, canvas.height / img.height);
  imgRot = 0;
  imgCX = canvas.width / 2;
  imgCY = canvas.height / 2;
}

fileEl?.addEventListener("change", async () => {
  msgEl.textContent = "";
  okEl.textContent = "";

  // ✅ [ADD]
  if (applyConfirmedLockIfNeeded(true)) {
    fileEl.value = "";
    return;
  }

  const it = cartItems.find((x) => x.id === selectedItemId);
  if (!it) {
    msgEl.textContent = "시안 제작 전 모든 정보를 입력해주세요.";
    fileEl.value = "";
    updateActionLocks();
    return;
  }

  if (fileNameEl) {
    fileNameEl.textContent =
      fileEl.files && fileEl.files[0]
        ? fileEl.files[0].name
        : "선택된 파일 없음";
  }

  const f = fileEl.files && fileEl.files[0];
  if (!f) return;

  try {
    userImg = await loadImageFromFile(f);
    fitImageToCanvas(userImg);

    it.design = it.design || {};
    redraw();
    saveCanvasToItem(it);

    it.design.bgSet = it.design.bgSet ?? false;

    renderCart();
    okEl.textContent = "이미지가 업로드되었습니다.";
  } catch (e) {
    msgEl.textContent =
      "이미지 파일을 불러오는 중 문제가 발생했습니다. 다른 파일로 다시 시도해주세요.";
  } finally {
    fileEl.value = "";
    updateActionLocks();
  }
});

fileDelBtn?.addEventListener(
  "click",
  (e) => {
    e.preventDefault();
    e.stopPropagation();

    msgEl.textContent = "";
    okEl.textContent = "";

    // ✅ [ADD]
    if (applyConfirmedLockIfNeeded(true)) return;

    const it = cartItems.find((x) => x.id === selectedItemId);
    if (!it) {
      msgEl.textContent = "시안 제작 전 모든 정보를 입력해주세요.";
      updateActionLocks();
      return;
    }

    userImg = null;
    imgScale = 1;
    imgRot = 0;
    imgCX = canvas.width / 2;
    imgCY = canvas.height / 2;

    it.design = it.design || {};
    it.design.imgDataUrl = null;

    if (fileNameEl) fileNameEl.textContent = "선택된 파일 없음";

    redraw();
    renderCart();
    okEl.textContent = "이미지가 삭제되었습니다.";
    updateActionLocks();
  },
  true,
);

/* =========================
 * 캔버스 드로잉 (배경/이미지/중심선/가이드/BBox)
 * ========================= */
function roundRectPath(c, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  c.beginPath();
  c.moveTo(x + rr, y);
  c.arcTo(x + w, y, x + w, y + h, rr);
  c.arcTo(x + w, y + h, x, y + h, rr);
  c.arcTo(x, y + h, x, y, rr);
  c.arcTo(x, y, x + w, y, rr);
  c.closePath();
}

function drawBackground() {
  const it = cartItems.find((x) => x.id === selectedItemId);
  const bg = it ? getItemBgColor(it) : "#ffffff";

  ctx.save();
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.restore();
}

function drawCenterGuide() {
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;

  ctx.save();
  ctx.strokeStyle = "rgba(17, 25, 40, 0.18)";
  ctx.lineWidth = 1;
  ctx.setLineDash([6, 6]);

  ctx.beginPath();
  ctx.moveTo(cx, 0);
  ctx.lineTo(cx, canvas.height);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(0, cy);
  ctx.lineTo(canvas.width, cy);
  ctx.stroke();

  ctx.setLineDash([]);
  ctx.fillStyle = "rgba(17, 25, 40, 0.25)";
  ctx.beginPath();
  ctx.arc(cx, cy, 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawGuide() {
  const m = Math.min(canvas.width, canvas.height);
  const outer = Math.round(m * 0.06);
  const safe = Math.round(m * 0.12);

  ctx.save();

  ctx.strokeStyle = "rgba(217,45,32,0.95)";
  ctx.lineWidth = 2;
  ctx.setLineDash([]);
  roundRectPath(
    ctx,
    outer,
    outer,
    canvas.width - outer * 2,
    canvas.height - outer * 2,
    18,
  );
  ctx.stroke();

  ctx.strokeStyle = "rgba(253,176,34,0.95)";
  ctx.lineWidth = 2;
  ctx.setLineDash([8, 6]);
  roundRectPath(
    ctx,
    safe,
    safe,
    canvas.width - safe * 2,
    canvas.height - safe * 2,
    14,
  );
  ctx.stroke();

  ctx.restore();
}

function drawImageTransformed() {
  if (!userImg) return;

  const w = userImg.width * imgScale;
  const h = userImg.height * imgScale;

  ctx.save();
  ctx.translate(imgCX, imgCY);
  ctx.rotate(imgRot);
  ctx.drawImage(userImg, -w / 2, -h / 2, w, h);
  ctx.restore();
}

function getImageAABB() {
  if (!userImg) return null;

  const w = userImg.width * imgScale;
  const h = userImg.height * imgScale;
  const hw = w / 2,
    hh = h / 2;

  const cos = Math.cos(imgRot);
  const sin = Math.sin(imgRot);

  const corners = [
    { x: -hw, y: -hh },
    { x: hw, y: -hh },
    { x: hw, y: hh },
    { x: -hw, y: hh },
  ].map((p) => ({
    x: imgCX + (p.x * cos - p.y * sin),
    y: imgCY + (p.x * sin + p.y * cos),
  }));

  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  for (const p of corners) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }
  return { minX, minY, maxX, maxY, w: maxX - minX, h: maxY - minY };
}

function cornerPoint(aabb, corner) {
  if (corner === "nw") return { x: aabb.minX, y: aabb.minY };
  if (corner === "ne") return { x: aabb.maxX, y: aabb.minY };
  if (corner === "sw") return { x: aabb.minX, y: aabb.maxY };
  return { x: aabb.maxX, y: aabb.maxY };
}

function updateBBox() {
  const aabb = getImageAABB();
  if (!aabb) {
    bboxEl.style.display = "none";
    return;
  }

  const cr = canvas.getBoundingClientRect();
  const wr = canvasWrapEl.getBoundingClientRect();
  const sx = cr.width / canvas.width;
  const sy = cr.height / canvas.height;

  const offsetX = cr.left - wr.left;
  const offsetY = cr.top - wr.top;

  bboxEl.style.display = "block";
  bboxEl.style.left = `${offsetX + aabb.minX * sx}px`;
  bboxEl.style.top = `${offsetY + aabb.minY * sy}px`;
  bboxEl.style.width = `${aabb.w * sx}px`;
  bboxEl.style.height = `${aabb.h * sy}px`;
}

function redraw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawBackground();
  drawImageTransformed();
  drawCenterGuide();
  drawGuide();
  updateBBox();
}

/* =========================
 * 이동/리사이즈/회전 (이미지 어디든 클릭 → 이동)
 * ========================= */
function screenToCanvasPoint(e) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((e.clientX - rect.left) / rect.width) * canvas.width,
    y: ((e.clientY - rect.top) / rect.height) * canvas.height,
  };
}

function isPointOnImage(px, py) {
  if (!userImg) return false;

  const dx = px - imgCX;
  const dy = py - imgCY;

  const cos = Math.cos(-imgRot);
  const sin = Math.sin(-imgRot);

  const lx = dx * cos - dy * sin;
  const ly = dx * sin + dy * cos;

  const halfW = (userImg.width * imgScale) / 2;
  const halfH = (userImg.height * imgScale) / 2;

  return lx >= -halfW && lx <= halfW && ly >= -halfH && ly <= halfH;
}

function startMoveDrag(e) {
  if (!userImg) return;
  if (handleDrag || rotateDrag) return;

  draggingMove = true;
  const rect = canvas.getBoundingClientRect();
  moveStart.x = e.clientX - rect.left;
  moveStart.y = e.clientY - rect.top;

  centerStart.x = imgCX;
  centerStart.y = imgCY;
}

canvasWrapEl?.addEventListener(
  "mousedown",
  (e) => {
    if (uiLocked) return; // ✅ [ADD]
    if (!userImg) return;
    if (e.target.closest(".h")) return;
    if (e.target.id === "rotHandle") return;

    const p = screenToCanvasPoint(e);
    if (!isPointOnImage(p.x, p.y)) return;

    e.preventDefault();
    e.stopPropagation();
    startMoveDrag(e);
  },
  { capture: true },
);

bboxEl?.addEventListener("mousedown", (e) => {
  if (uiLocked) return; // ✅ [ADD]
  if (!userImg) return;
  if (e.target.closest(".h")) return;
  if (e.target.id === "rotHandle") return;
  e.preventDefault();
  e.stopPropagation();
  startMoveDrag(e);
});

window.addEventListener("mousemove", (e) => {
  if (uiLocked) return; // ✅ [ADD]
  const rect = canvas.getBoundingClientRect();
  const mx = e.clientX - rect.left;
  const my = e.clientY - rect.top;

  if (draggingMove) {
    imgCX = centerStart.x + (mx - moveStart.x);
    imgCY = centerStart.y + (my - moveStart.y);
    redraw();
    return;
  }

  if (handleDrag) {
    const alt = e.altKey;

    const ax = handleDrag.anchorX;
    const ay = handleDrag.anchorY;

    const distNow = Math.hypot(mx - ax, my - ay);
    const distStart = handleDrag.startDist;
    if (distStart < 1) return;

    let nextScale = handleDrag.startScale * (distNow / distStart);
    nextScale = Math.min(10, Math.max(0.1, nextScale));

    if (alt) {
      imgScale = nextScale;
      redraw();
      return;
    }

    const before = getImageAABB();
    imgScale = nextScale;
    const after = getImageAABB();

    if (before && after) {
      const targetCorner = handleDrag.anchorCorner;
      const afterCorner = cornerPoint(after, targetCorner);
      imgCX += ax - afterCorner.x;
      imgCY += ay - afterCorner.y;
    }

    redraw();
    return;
  }

  if (rotateDrag) {
    const angle = Math.atan2(my - rotateDrag.cy, mx - rotateDrag.cx);
    imgRot = rotateDrag.startRot + (angle - rotateDrag.startAngle);
    redraw();
    return;
  }
});

window.addEventListener("mouseup", () => {
  if (uiLocked) return; // ✅ [ADD]
  if (draggingMove || handleDrag || rotateDrag) {
    draggingMove = false;
    handleDrag = null;
    rotateDrag = null;

    const it = cartItems.find((x) => x.id === selectedItemId);
    if (it) saveCanvasToItem(it);

    redraw();
    renderCart();
    updateActionLocks();
  }
});

bboxEl?.querySelectorAll(".h").forEach((h) => {
  h.addEventListener("mousedown", (e) => {
    if (uiLocked) return; // ✅ [ADD]
    e.preventDefault();
    e.stopPropagation();
    if (!userImg) return;

    draggingMove = false;

    const handle = h.dataset.h;
    const aabb = getImageAABB();
    if (!aabb) return;

    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    const opposite =
      handle === "nw"
        ? "se"
        : handle === "ne"
          ? "sw"
          : handle === "sw"
            ? "ne"
            : "nw";

    const anchor = cornerPoint(aabb, opposite);

    handleDrag = {
      anchorX: anchor.x,
      anchorY: anchor.y,
      anchorCorner: opposite,
      startDist: Math.hypot(mx - anchor.x, my - anchor.y),
      startScale: imgScale,
    };
  });
});

rotHandleEl?.addEventListener("mousedown", (e) => {
  if (uiLocked) return; // ✅ [ADD]
  e.preventDefault();
  e.stopPropagation();
  if (!userImg) return;

  draggingMove = false;

  const rect = canvas.getBoundingClientRect();
  const mx = e.clientX - rect.left;
  const my = e.clientY - rect.top;

  rotateDrag = {
    cx: imgCX,
    cy: imgCY,
    startRot: imgRot,
    startAngle: Math.atan2(my - imgCY, mx - imgCX),
  };
});

canvas.addEventListener("wheel", (e) => e.preventDefault(), { passive: false });

/* =========================
 * 메일 발송 유틸
 * ========================= */
async function renderItemFinalPng(item) {
  const size = getCanvasSize(item.profile, item.capType);

  const off = document.createElement("canvas");
  off.width = size.w;
  off.height = size.h;
  const c = off.getContext("2d");

  const bg = getItemBgColor(item);
  c.fillStyle = bg;
  c.fillRect(0, 0, off.width, off.height);

  if (item.design?.imgDataUrl) {
    const img = new Image();
    await new Promise((res, rej) => {
      img.onload = res;
      img.onerror = rej;
      img.src = item.design.imgDataUrl;
    });

    const scale = item.design.scale ?? 1;
    const rot = item.design.rot ?? 0;
    const cx = item.design.cx ?? off.width / 2;
    const cy = item.design.cy ?? off.height / 2;

    const w = img.width * scale;
    const h = img.height * scale;

    c.save();
    c.translate(cx, cy);
    c.rotate(rot);
    c.drawImage(img, -w / 2, -h / 2, w, h);
    c.restore();
  }

  return off.toDataURL("image/png");
}

function emailConfigReady(templateId) {
  return !(
    EMAILJS_PUBLIC_KEY.startsWith("YOUR_") ||
    EMAILJS_SERVICE_ID.startsWith("YOUR_") ||
    templateId.startsWith("YOUR_")
  );
}

async function sendEmailToCompany(extraParams = {}) {
  if (!emailConfigReady(EMAILJS_TEMPLATE_ID)) {
    msgEl.textContent = "메일 전송 설정이 완료되지 않았습니다.";
    return false;
  }

  emailjs.init({ publicKey: EMAILJS_PUBLIC_KEY });

  const itemsSummary = [];
  const designs = [];
  let totalLen = 0;

  for (const it of cartItems) {
    const calc = calcLineTotal(it);
    const bg = getItemBgColor(it);

    itemsSummary.push({
      profile: it.profile,
      capType: it.capType,
      laser: it.profile === "OEM" ? it.laser : "none",
      bg,
      qty: calc.qty,
      unit: calc.unit,
      baseLine: calc.baseLine,
      discountRate: calc.discRate,
      lineAfterDiscount: calc.afterDiscount,
      design: hasDesign(it) ? "있음" : "없음",
    });

    if (it.design?.imgDataUrl) {
      const png = await renderItemFinalPng(it);
      designs.push({
        filename: `${orderEl.value.trim()}_${it.profile}_${it.capType}_${it.laser}.png`,
        dataUrl: png,
      });
      totalLen += png.length;
    }
  }

  const MAX_LEN = 1_800_000;
  if (totalLen > MAX_LEN) {
    msgEl.textContent =
      "이미지 용량이 커서 전송이 불가능합니다. 파일 크기를 줄여 다시 시도해주세요.";
    return false;
  }

  const params = {
    to_email: COMPANY_EMAIL,
    customer_name: nameEl.value.trim(),
    customer_phone: phoneEl.value.trim(),
    order_no: orderEl.value.trim(),
    customer_email: emailEl.value.trim(),

    subtotal_price: String(cartSubtotal()),
    total_price: String(cartTotal()),
    quote_enabled: quoteEnabled ? "Y" : "N",
    quote_prod: quoteEnabled ? quoteProd : "",
    quote_due: quoteEnabled ? quoteDue : "",
    biz_file_dataurl: quoteEnabled ? bizFileDataUrl || "" : "",

    items_json: JSON.stringify(itemsSummary, null, 2),
    designs_json: JSON.stringify(designs, null, 2),

    ...extraParams,
  };

  return emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, params);
}

async function sendQuoteEmailToCustomer(itemsSummary) {
  if (!emailConfigReady(EMAILJS_QUOTE_TEMPLATE_ID)) {
    msgEl.textContent = "메일 전송 설정이 완료되지 않았습니다.";
    return false;
  }

  emailjs.init({ publicKey: EMAILJS_PUBLIC_KEY });

  const params = {
    to_email: emailEl.value.trim(),
    customer_name: nameEl.value.trim(),
    customer_phone: phoneEl.value.trim(),
    order_no: orderEl.value.trim(),

    subtotal_price: String(cartSubtotal()),
    total_price: String(cartTotal()),
    quote_prod: quoteProd,
    quote_due: quoteDue,

    items_json: JSON.stringify(itemsSummary, null, 2),
  };

  return emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_QUOTE_TEMPLATE_ID, params);
}

/* =========================
 * 시안 확정하기 (견적 ON이면 회사+고객 둘 다 발송)
 * ========================= */
btnConfirmEl?.addEventListener("click", async () => {
  msgEl.textContent = "";
  okEl.textContent = "";

  // ✅ [ADD] 확정 주문번호면 바로 막고 팝업
  if (applyConfirmedLockIfNeeded(true)) return;

  if (!validateCanConfirm(true)) return;

  try {
    const sel = cartItems.find((x) => x.id === selectedItemId);
    if (sel) saveCanvasToItem(sel);

    const okCompany = await sendEmailToCompany();
    if (!okCompany) return;

    if (quoteEnabled) {
      const itemsSummary = cartItems.map((it) => {
        const bg = getItemBgColor(it);
        const calc = calcLineTotal(it);
        return {
          profile: it.profile,
          capType: it.capType,
          laser: it.profile === "OEM" ? it.laser : "none",
          bg,
          qty: calc.qty,
          unit: calc.unit,
          baseLine: calc.baseLine,
          discountRate: calc.discRate,
          lineAfterDiscount: calc.afterDiscount,
        };
      });

      const okCustomer = await sendQuoteEmailToCustomer(itemsSummary);
      if (!okCustomer) return;

      okEl.textContent =
        "견적서 요청이 완료되었습니다. 입력하신 이메일로 견적서를 발송했습니다.";
      msgEl.textContent = "";

      // ✅ [ADD] (회사+고객 발송 성공) => 주문번호 확정 처리 + 전체 잠금
      markOrderConfirmed(orderEl.value.trim());
      applyConfirmedLockIfNeeded(false);
      return;
    }

    okEl.textContent =
      "시안이 접수되었습니다. 검토 후 입력하신 이메일로 안내드리겠습니다.";
    msgEl.textContent = "";

    // ✅ [ADD] (회사 발송 성공) => 주문번호 확정 처리 + 전체 잠금
    markOrderConfirmed(orderEl.value.trim());
    applyConfirmedLockIfNeeded(false);
  } catch (e) {
    console.error("전송 실패:", e);
    msgEl.textContent =
      "메일 전송에 실패했습니다. 잠시 후 다시 시도해주세요.\n문제가 계속될 경우 고객센터로 문의해주세요.";
    okEl.textContent = "";
  } finally {
    updateActionLocks();
  }
});

/* =========================
 * ✅ [MOD] 초기화: URL 주문번호 자동 입력 + 확정 잠금 체크
 * ========================= */
setCapTypeOptions();
resizeCanvas(330, 330);
clearEditor();
applyCanvasSizeFromForm();
renderCart();
updatePriceUI();
setQuoteUI(false);
redraw();
updateActionLocks();

// ✅ [ADD] URL 파라미터로 주문번호 자동 세팅
const urlOrder = getOrderFromUrl();
if (urlOrder && orderEl) orderEl.value = urlOrder;

// ✅ [ADD] 확정된 주문번호면 진입 즉시 팝업 + 전체잠금
applyConfirmedLockIfNeeded(true);
updateActionLocks();
