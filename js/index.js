/* =========================
 * EmailJS 설정
 * ========================= */
const COMPANY_EMAIL = "bbolcat@naver.com";
const EMAILJS_PUBLIC_KEY = "YOUR_PUBLIC_KEY";
const EMAILJS_SERVICE_ID = "YOUR_SERVICE_ID";
const EMAILJS_TEMPLATE_ID = "YOUR_TEMPLATE_ID"; // 회사로(주문정보+시안+사업자)
const EMAILJS_QUOTE_TEMPLATE_ID = "YOUR_QUOTE_TEMPLATE_ID"; // 주문자에게(견적서)

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

const profileEl = $("profile");
const capTypeEl = $("capType");
const laserEl = $("laser");
const qtyEl = $("qty");

// (있을 수도, 없을 수도)
const rushFormEl = $("rush"); // [NOTE] 있으면 읽고, 없으면 quoteProd에서 읽도록 처리

const unitPriceText = $("unitPriceText");

const cartListEl = $("cartList");
const cartCountEl = $("cartCount");
const cartTotalEl = $("cartTotal");

const selTextEl = $("selText");
const canvasTextEl = $("canvasText");
const bgTextEl = $("bgText");

const fileEl = $("file");
const fileBtn = $("fileBtn");
const fileNameEl = $("fileName");

// [ADD] 이미지 삭제 버튼(HTML에 id="fileDelBtn" 있어야 작동)
const fileDelBtn = $("fileDelBtn");

const canvas = $("designCanvas");
const ctx = canvas.getContext("2d");

const bboxEl = $("bbox");
const rotHandleEl = $("rotHandle");

/* =========================
 * [ADD] 견적서 요청 / 사업자등록증 업로드 DOM
 * ========================= */
const btnQuoteEl = $("btnQuote");
const bizFileEl = $("bizFile");
const bizFileBtn = $("bizFileBtn");
const bizFileNameEl = $("bizFileName");

/* =========================
 * [ADD] 제작 일정(rush) 값: DOM에서 매번 안전하게 읽기
 * - id가 뭐든 대응
 * ========================= */
function getRushValue() {
  const el =
    document.getElementById("rush") ||
    document.getElementById("quoteProd") ||
    document.querySelector('select[name="rush"]') ||
    document.querySelector('select[data-role="rush"]');

  return el ? el.value : "none";
}

// [ADD] rush 변경 이벤트 바인딩 (존재하는 경우에만)
function bindRushChangeEvent() {
  const el =
    document.getElementById("rush") ||
    document.getElementById("quoteProd") ||
    document.querySelector('select[name="rush"]') ||
    document.querySelector('select[data-role="rush"]');

  if (!el) return;

  el.addEventListener("change", () => {
    updatePriceUI();
    renderCart();
  });
}

/* =========================
 * [ADD] "시안 있음" 판정
 * ========================= */
function hasDesign(it) {
  return !!it?.design?.imgDataUrl || !!it?.design?.bgSet;
}

/* =========================
 * Pickr 배경색
 * ========================= */
let userBgColor = "#ffffff";
let bgPickr = null;

const bgPickBtn = $("bgPickBtn");
const bgPickMount = $("bgPickMount");
const bgColorSwatch = $("bgColorSwatch");
const bgColorValue = $("bgColorValue");

function setBgUI(hex) {
  const v = (hex || "#ffffff").toLowerCase();
  if (bgColorSwatch) bgColorSwatch.style.background = v;
  if (bgColorValue) bgColorValue.textContent = v;
}

/* =========================
 * [CHANGE] 배경색은 "아이템별 저장"
 * ========================= */
function getItemBgColor(it) {
  const profile = it?.profile || profileEl.value;
  const laser = it?.laser || (profile === "OEM" ? laserEl.value : "none");

  if (profile === "OEM" && laser === "black") return "#000000";
  if (profile === "OEM" && laser === "white") return "#ffffff";

  return it?.bgColor || userBgColor || "#ffffff";
}

function initPickr() {
  if (!bgPickMount || !window.Pickr) return;

  bgPickr = Pickr.create({
    el: bgPickMount,
    theme: "nano",
    default: userBgColor,
    showAlways: false,
    closeOnScroll: true,
    components: {
      preview: true,
      opacity: false,
      hue: true,
      interaction: { input: false, save: false },
    },
  });

  if (bgPickBtn) {
    bgPickBtn.addEventListener("click", () => bgPickr && bgPickr.show());
  }

  bgPickr.on("change", (color) => {
    if (!color) return;

    userBgColor = color.toHEXA().toString();
    setBgUI(userBgColor);

    // [FIX] 배경만 바꿔도 시안으로 인정
    const it = cartItems.find((x) => x.id === selectedItemId);
    if (it) {
      it.bgColor = userBgColor;
      it.design = it.design || {};
      it.design.bgSet = true; // [ADD]
    }

    redraw();
    const it2 = cartItems.find((x) => x.id === selectedItemId);
    bgTextEl.textContent = it2 ? getItemBgColor(it2) : userBgColor;

    renderCart();
  });

  setBgUI(userBgColor);
}
initPickr();

function updateBgLockUI(profile, laser) {
  const wrap = bgPickBtn?.closest(".colorPick");
  const locked = profile === "OEM" && (laser === "black" || laser === "white");
  if (wrap) wrap.classList.toggle("isLocked", locked);

  if (locked) {
    const forced = laser === "black" ? "#000000" : "#ffffff";
    setBgUI(forced);

    // [ADD] 레이저 강제 배경도 시안 인정
    const it = cartItems.find((x) => x.id === selectedItemId);
    if (it) {
      it.design = it.design || {};
      it.design.bgSet = true;
    }
  } else {
    const it = cartItems.find((x) => x.id === selectedItemId);
    setBgUI(it?.bgColor || userBgColor);
  }
}

/* =========================
 * 가격 계산
 * ========================= */
function getUnitPrice(profile, capType, laser) {
  const base = PRICE?.[profile]?.[capType] ?? 0;
  const add = profile === "OEM" ? (LASER_ADDON?.[laser] ?? 0) : 0;
  return { base, add, unit: base + add };
}

/* =========================
 * [ADD] 수량 할인 + 제작일정(할증)
 * ========================= */
function getVolumeDiscountRate(qty) {
  if (qty >= 5000) return 0.2;
  if (qty >= 1000) return 0.15;
  if (qty >= 500) return 0.1;
  return 0;
}

function getRushRate(rushValue) {
  if (!rushValue) return 0;

  if (rushValue === "10d") return 0.2;
  if (rushValue === "5d") return 0.3;
  if (rushValue === "none" || rushValue === "normal") return 0;

  if (rushValue === "빠른제작" || rushValue === "fast") return 0.2;
  if (rushValue === "긴급제작" || rushValue === "super") return 0.3;

  const s = String(rushValue);
  if (s.includes("20")) return 0.2;
  if (s.includes("30")) return 0.3;
  if (s.includes("빠른")) return 0.2;
  if (s.includes("특급")) return 0.3;

  return 0;
}

function rushLabel(r) {
  if (!r || r === "none" || r === "normal") return "일반";
  const rate = getRushRate(r);
  if (rate === 0.2) return "빠른제작(+20%)";
  if (rate === 0.3) return "특급제작(+30%)";
  return "일반";
}

function calcLineTotal(item) {
  const { unit } = getUnitPrice(item.profile, item.capType, item.laser);
  const qty = Math.max(1, Number(item.qty || 1));
  const baseLine = unit * qty;

  const discRate = getVolumeDiscountRate(qty);
  const afterDiscount = Math.round(baseLine * (1 - discRate));

  // ✅ item.rush 기준으로 할증(아이템별)
  const rushRate = getRushRate(item.rush);
  const finalLine = Math.round(afterDiscount * (1 + rushRate));

  return { unit, qty, baseLine, discRate, rushRate, finalLine };
}

/* =========================
 * [FIX] 왼쪽 폼 가격 업데이트 (할증 DOM 반영)
 * ========================= */
function updatePriceUI() {
  const p = profileEl.value;
  const cap = capTypeEl.value;
  const laser = p === "OEM" ? laserEl.value : "none";
  const q = Math.max(1, parseInt(qtyEl.value || "1", 10));

  // [CHANGE] rush는 DOM에서 매번 읽음 (id 문제 해결)
  const rush = getRushValue();

  const { base, unit } = getUnitPrice(p, cap, laser);
  if (!base) {
    unitPriceText.textContent = "가격 미설정";
    return;
  }

  const discRate = getVolumeDiscountRate(q);
  const baseLine = unit * q;
  const afterDiscount = Math.round(baseLine * (1 - discRate));
  const rushRate = getRushRate(rush);
  const finalLine = Math.round(afterDiscount * (1 + rushRate));

  const discText = discRate
    ? `할인 ${Math.round(discRate * 100)}%`
    : "할인 없음";
  const rushText = rushRate
    ? `할증 ${Math.round(rushRate * 100)}%`
    : "할증 없음";

  unitPriceText.textContent =
    `${finalLine.toLocaleString()}원` +
    ` (단가 ${unit.toLocaleString()}원 · ${q}개 · ${discText} · ${rushText})`;
}

function cartTotal() {
  // [CHANGE] 전역 rush 기준으로 총액 계산 (DOM에서 읽음)
  const rush = getRushValue();
  return cartItems.reduce((sum, it) => {
    const calc = calcLineTotal(it);
    return sum + calc.finalLine;
  }, 0);
}

/* =========================
 * 상태(장바구니/캔버스)
 * ========================= */
let cartItems = [];
let selectedItemId = null;

// 캔버스 편집 상태
let userImg = null;
let imgCX = 0,
  imgCY = 0;
let imgScale = 1;
let imgRot = 0;

// 이동/리사이즈/회전 드래그 상태
let draggingMove = false;
let moveStart = { x: 0, y: 0 };
let centerStart = { x: 0, y: 0 };

let handleDrag = null;
let rotateDrag = null;

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
  bgTextEl.textContent = it ? getItemBgColor(it) : userBgColor || "#ffffff";
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
 * 장바구니 클릭 시 왼쪽 폼 동기화
 * ========================= */
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

  setBgUI(it.bgColor || userBgColor);
  updateBgLockUI(it.profile, it.laser);

  updatePriceUI();
  applyCanvasSizeFromForm();
}

/* =========================
 * 이벤트: 폼 변경
 * ========================= */
profileEl.addEventListener("change", () => {
  setCapTypeOptions();
  updatePriceUI();
  applyCanvasSizeFromForm();
  redraw();
});

capTypeEl.addEventListener("change", () => {
  updatePriceUI();
  applyCanvasSizeFromForm();
});

qtyEl.addEventListener("input", () => {
  updatePriceUI();

  // [FIX] 선택 아이템이 있으면 수량을 아이템에도 반영
  const it = cartItems.find((x) => x.id === selectedItemId);
  if (it) {
    it.qty = Math.max(1, parseInt(qtyEl.value || "1", 10));
    renderCart();
  }
});

laserEl.addEventListener("change", () => {
  updatePriceUI();
  updateBgLockUI(profileEl.value, laserEl.value);

  const it = cartItems.find((x) => x.id === selectedItemId);
  if (it) {
    it.laser = it.profile === "OEM" ? laserEl.value : "none";
    bgTextEl.textContent = getItemBgColor(it);

    it.design = it.design || {};
    it.design.bgSet = true; // [ADD]
  } else {
    bgTextEl.textContent = userBgColor || "#ffffff";
  }

  redraw();
  renderCart();
});

/* =========================
 * 장바구니 렌더
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
  cartTotalEl.textContent = cartTotal().toLocaleString() + "원";

  if (cartItems.length === 0) {
    const div = document.createElement("div");
    div.className = "hint";
    div.textContent =
      "제작된 시안이 없습니다. 왼쪽에서 옵션 선택 후 [시안 추가]를 눌러주세요.";
    cartListEl.appendChild(div);
    selTextEl.textContent = "없음";
    bgTextEl.textContent = "-";
    return;
  }

  // [CHANGE] rush는 DOM에서 매번 읽음
  const rush = getRushValue();

  for (const it of cartItems) {
    const box = document.createElement("div");
    box.className = "cartItem" + (it.id === selectedItemId ? " selected" : "");
    box.addEventListener("click", () => selectItem(it.id));

    const calc = calcLineTotal(it);
    const unit = calc.unit;
    const line = calc.finalLine;

    const bg = getItemBgColor(it);

    const discText = calc.discRate
      ? `할인 ${Math.round(calc.discRate * 100)}%`
      : "할인 없음";
    const rushText = calc.rushRate
      ? `할증 ${Math.round(calc.rushRate * 100)}%`
      : "일반";

    box.innerHTML = `
      <div class="cartTop">
        <div>
          <div class="cartTitle">
            <b>${it.profile}</b> / ${it.capType} / ${labelLaser(it)} / 배경 ${bg}
          </div>
          <div class="cartMeta">
            <span>수량: <b>${it.qty}</b></span>
            <span>단가: <b>${unit.toLocaleString()}원</b></span>
            <span>조건: <b>${discText} / ${rushText}</b></span>
            <span>합계: <b>${line.toLocaleString()}원</b></span>
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
      it.qty = Math.max(1, it.qty - 1);
      if (it.id === selectedItemId) {
        qtyEl.value = it.qty;
        updatePriceUI();
      }
      renderCart();
    });

    box.querySelector('[data-act="plus"]').addEventListener("click", (e) => {
      e.stopPropagation();
      it.qty += 1;
      if (it.id === selectedItemId) {
        qtyEl.value = it.qty;
        updatePriceUI();
      }
      renderCart();
    });

    box.querySelector('[data-act="del"]').addEventListener("click", (e) => {
      e.stopPropagation();
      removeItem(it.id);
    });

    cartListEl.appendChild(box);
  }

  const sel = cartItems.find((x) => x.id === selectedItemId);
  selTextEl.textContent = sel ? `${sel.profile} / ${sel.capType}` : "없음";
  bgTextEl.textContent = sel ? getItemBgColor(sel) : "-";
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
}

/* =========================
 * 아이템 추가/선택
 * ========================= */
$("btnAddItem").addEventListener("click", () => {
  msgEl.textContent = "";
  okEl.textContent = "";

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
    bgColor: userBgColor, // [CHANGE] 아이템별 배경 저장
    rush: getRushValue(), // ✅ 아이템별 제작일정 저장
    design: { imgDataUrl: null, cx: 0, cy: 0, scale: 1, rot: 0, bgSet: false }, // [ADD]
  };

  cartItems.unshift(item);
  selectItem(id);
  renderCart();
  updatePriceUI();

  // [CHANGE] 멘트 확정본 적용
  okEl.textContent =
    "이미지 업로드 또는 배경색 설정 후 시안을 확정할 수 있습니다.";
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

async function selectItem(id) {
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
}

function clearEditor() {
  userImg = null;
  imgCX = canvas.width / 2;
  imgCY = canvas.height / 2;
  imgScale = 1;
  imgRot = 0;
  redraw();
}

/* =========================
 * 이미지 업로드 (시안 아이템 선택 후 가능)
 * ========================= */
if (fileBtn && fileEl) {
  fileBtn.addEventListener("click", () => {
    msgEl.textContent = "";
    okEl.textContent = "";

    const it = cartItems.find((x) => x.id === selectedItemId);
    if (!it) {
      msgEl.textContent = "시안 제작 전 모든 정보를 입력해주세요.";
      return;
    }

    fileEl.click();
  });
}

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

fileEl.addEventListener("change", async () => {
  msgEl.textContent = "";
  okEl.textContent = "";

  const it = cartItems.find((x) => x.id === selectedItemId);
  if (!it) {
    msgEl.textContent = "시안 제작 전 모든 정보를 입력해주세요.";
    fileEl.value = "";
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
    it.design.bgSet = it.design.bgSet || false; // 유지

    redraw();
    saveCanvasToItem(it);
    renderCart();
    okEl.textContent = "이미지가 업로드되었습니다.";
  } catch (e) {
    msgEl.textContent =
      "이미지 파일을 불러오는 중 문제가 발생했습니다. 다른 파일로 다시 시도해주세요.";
  } finally {
    fileEl.value = "";
  }
});

/* =========================
 * [ADD] 이미지 삭제 기능 (클릭 안 되는 문제 해결)
 * ========================= */
if (fileDelBtn) {
  fileDelBtn.addEventListener("click", () => {
    msgEl.textContent = "";
    okEl.textContent = "";

    const it = cartItems.find((x) => x.id === selectedItemId);
    if (!it) {
      msgEl.textContent = "시안 제작 전 모든 정보를 입력해주세요.";
      return;
    }

    // 캔버스 이미지 제거
    userImg = null;
    imgScale = 1;
    imgRot = 0;
    imgCX = canvas.width / 2;
    imgCY = canvas.height / 2;

    // 아이템 이미지 제거(배경은 유지)
    it.design = it.design || {};
    it.design.imgDataUrl = null;

    // 파일명 UI 초기화
    if (fileNameEl) fileNameEl.textContent = "선택된 파일 없음";

    redraw();
    renderCart();
    okEl.textContent = "이미지가 삭제되었습니다.";
  });
}

/* =========================
 * [ADD] 사업자등록증 업로드 (견적서 요청 시 필수)
 * ========================= */
let bizFileDataUrl = null;

if (bizFileBtn && bizFileEl) {
  bizFileBtn.addEventListener("click", () => bizFileEl.click());
}

if (bizFileEl) {
  bizFileEl.addEventListener("change", async () => {
    msgEl.textContent = "";
    okEl.textContent = "";

    const f = bizFileEl.files && bizFileEl.files[0];
    if (!f) return;

    if (bizFileNameEl) bizFileNameEl.textContent = f.name;

    const reader = new FileReader();
    bizFileDataUrl = await new Promise((res, rej) => {
      reader.onload = () => res(reader.result);
      reader.onerror = rej;
      reader.readAsDataURL(f);
    });

    if (String(bizFileDataUrl).length > 900_000) {
      bizFileDataUrl = null;
      bizFileEl.value = "";
      if (bizFileNameEl) bizFileNameEl.textContent = "선택된 파일 없음";
      msgEl.textContent =
        "사업자등록증 파일 용량이 너무 큽니다. 파일 크기를 줄여 다시 업로드해주세요.";
      return;
    }

    okEl.textContent = "사업자등록증 파일이 업로드되었습니다.";
  });
}

/* =========================
 * 가이드 + 중심선
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
  const bg = it ? getItemBgColor(it) : userBgColor || "#ffffff";

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
  const wr = $("canvasWrap").getBoundingClientRect();

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
 * 이동/리사이즈/회전 (이미지 어디든 클릭 이동)
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

const canvasWrapEl = document.getElementById("canvasWrap");

// 이미지 위 클릭이면 이동(최우선)
canvasWrapEl.addEventListener(
  "mousedown",
  (e) => {
    if (e.target.closest(".h")) return;
    if (e.target.id === "rotHandle") return;
    if (!userImg) return;

    const p = screenToCanvasPoint(e);
    if (!isPointOnImage(p.x, p.y)) return;

    e.preventDefault();
    e.stopPropagation();
    startMoveDrag(e);
  },
  { capture: true },
);

canvas.addEventListener("mousedown", (e) => startMoveDrag(e));

bboxEl.addEventListener("mousedown", (e) => {
  if (e.target.closest(".h")) return;
  if (e.target.id === "rotHandle") return;
  e.preventDefault();
  e.stopPropagation();
  startMoveDrag(e);
});

window.addEventListener("mousemove", (e) => {
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
  if (draggingMove || handleDrag || rotateDrag) {
    draggingMove = false;
    handleDrag = null;
    rotateDrag = null;

    const it = cartItems.find((x) => x.id === selectedItemId);
    if (it) saveCanvasToItem(it);

    redraw();
    renderCart();
  }
});

bboxEl.querySelectorAll(".h").forEach((h) => {
  h.addEventListener("mousedown", (e) => {
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

rotHandleEl.addEventListener("mousedown", (e) => {
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
 * 메일 발송 검증
 * ========================= */
function validateBeforeSend() {
  const errs = [];
  if (!nameEl.value.trim()) errs.push("주문자명을 입력해주세요.");
  if (!phoneEl.value.trim()) errs.push("핸드폰번호를 입력해주세요.");
  if (!orderEl.value.trim()) errs.push("주문번호를 입력해주세요.");
  if (!emailEl.value.trim()) errs.push("이메일을 입력해주세요.");
  if (cartItems.length === 0) errs.push("장바구니에 아이템을 추가해주세요.");

  // [FIX] 배경만으로도 시안 인정
  const hasAnyDesign = cartItems.some((it) => hasDesign(it));
  if (!hasAnyDesign)
    errs.push("최소 1개 이상의 아이템에 배경색 또는 이미지를 설정해주세요.");

  if (errs.length) {
    msgEl.innerHTML = errs.map((e) => `• ${e}`).join("<br>");
    okEl.textContent = "";
    return false;
  }
  msgEl.textContent = "";
  return true;
}

function validateBeforeQuote() {
  const errs = [];

  if (!nameEl.value.trim()) errs.push("주문자명을 입력해주세요.");
  if (!phoneEl.value.trim()) errs.push("핸드폰번호를 입력해주세요.");
  if (!orderEl.value.trim()) errs.push("주문번호를 입력해주세요.");
  if (!emailEl.value.trim()) errs.push("이메일을 입력해주세요.");
  if (cartItems.length === 0) errs.push("장바구니에 아이템을 추가해주세요.");

  const hasAnyDesign = cartItems.some((it) => hasDesign(it));
  if (!hasAnyDesign)
    errs.push("최소 1개 이상의 아이템에 배경색 또는 이미지를 설정해주세요.");

  if (!bizFileDataUrl)
    errs.push("견적서 요청 시 사업자등록증 업로드가 필수입니다.");

  if (errs.length) {
    msgEl.innerHTML = errs.map((e) => `• ${e}`).join("<br>");
    okEl.textContent = "";
    return false;
  }

  msgEl.textContent = "";
  return true;
}

/* =========================
 * 최종 PNG 렌더
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

/* =========================
 * 메일 전송 (회사)
 * ========================= */
async function sendEmail(extraParams = {}) {
  if (
    EMAILJS_PUBLIC_KEY.startsWith("YOUR_") ||
    EMAILJS_SERVICE_ID.startsWith("YOUR_") ||
    EMAILJS_TEMPLATE_ID.startsWith("YOUR_")
  ) {
    msgEl.textContent = "메일 전송 설정이 완료되지 않았습니다.";
    return false;
  }

  emailjs.init({ publicKey: EMAILJS_PUBLIC_KEY });

  const itemsSummary = [];
  const designs = [];
  let totalLen = 0;

  const rush = getRushValue();

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
      rushRate: calc.rushRate,
      line: calc.finalLine,
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
      "이미지 용량이 커서 전송이 불가능합니다. 파일 크기를 줄인 후 다시 시도해주세요.";
    return false;
  }

  const params = {
    to_email: COMPANY_EMAIL,
    customer_name: nameEl.value.trim(),
    customer_phone: phoneEl.value.trim(),
    order_no: orderEl.value.trim(),
    customer_email: emailEl.value.trim(),
    total_price: String(cartTotal()),
    items_json: JSON.stringify(itemsSummary, null, 2),
    designs_json: JSON.stringify(designs, null, 2),

    biz_file_dataurl: bizFileDataUrl || "",
    rush_value: rush,
    rush_label: rushLabel(rush),

    ...extraParams,
  };

  return emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, params);
}

/* =========================
 * 메일 전송 (주문자: 견적서)
 * ========================= */
async function sendQuoteEmailToCustomer(itemsSummary, quoteExtra) {
  if (
    EMAILJS_PUBLIC_KEY.startsWith("YOUR_") ||
    EMAILJS_SERVICE_ID.startsWith("YOUR_") ||
    EMAILJS_QUOTE_TEMPLATE_ID.startsWith("YOUR_")
  ) {
    // [CHANGE] 멘트 확정본 적용
    msgEl.textContent =
      "현재 견적서 발송이 일시적으로 불가능합니다. 잠시 후 다시 시도해주세요.";
    return false;
  }

  emailjs.init({ publicKey: EMAILJS_PUBLIC_KEY });

  const rush = getRushValue();

  const params = {
    to_email: emailEl.value.trim(),
    customer_name: nameEl.value.trim(),
    customer_phone: phoneEl.value.trim(),
    order_no: orderEl.value.trim(),
    total_price: String(cartTotal()),
    items_json: JSON.stringify(itemsSummary, null, 2),

    prod_schedule: quoteExtra?.prod || "",
    due_date: quoteExtra?.due || "",

    rush_value: rush,
    rush_label: rushLabel(rush),
  };

  return emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_QUOTE_TEMPLATE_ID, params);
}

/* =========================
 * 견적서 추가 UI (레이저/수량 밑)
 * ========================= */
let quoteExtraWrap = null;
let quoteProdSel = null;
let quoteDueInput = null;

function ensureQuoteExtraUI() {
  if (quoteExtraWrap) return;

  const qtyRow = qtyEl?.closest(".row");
  const parent = qtyRow?.parentElement || document.body;

  quoteExtraWrap = document.createElement("div");
  quoteExtraWrap.style.display = "none";
  quoteExtraWrap.className = "quoteExtraWrap";

  // rushFormEl 있으면 옵션 복사, 없으면 fallback
  const optionsHtml = (() => {
    if (rushFormEl && rushFormEl.options && rushFormEl.options.length) {
      return Array.from(rushFormEl.options)
        .map((o) => `<option value="${o.value}">${o.textContent}</option>`)
        .join("");
    }
    return `
      <option value="none">일반 제작</option>
      <option value="10d">빠른제작(+20%)</option>
      <option value="5d">특급제작(+30%)</option>
    `;
  })();

  quoteExtraWrap.innerHTML = `
    <div class="divider"></div>
    <div class="row">
      <div>
        <label>제작 일정 선택 *</label>
        <select id="quoteProd" data-role="rush">
          ${optionsHtml}
        </select>
      </div>
      <div>
        <label>납기일 선택 *</label>
        <input id="quoteDue" type="date" />
      </div>
    </div>
  `;

  parent.insertBefore(quoteExtraWrap, qtyRow ? qtyRow.nextSibling : null);

  quoteProdSel = $("quoteProd");
  quoteDueInput = $("quoteDue");

  // [FIX] 제작일정 변경 → 즉시 가격/장바구니 반영 (rush는 DOM에서 읽기 때문에 이것만으로 충분)
  if (quoteProdSel) {
    quoteProdSel.addEventListener("change", () => {
      updatePriceUI();
      renderCart();
    });
  }

  // [ADD] 생성됐으니 rush 이벤트도 다시 바인딩
  bindRushChangeEvent();
}

function showQuoteExtraUI() {
  ensureQuoteExtraUI();
  quoteExtraWrap.style.display = "block";

  // 현재 rush 값으로 맞춰줌
  if (quoteProdSel) quoteProdSel.value = getRushValue();
  quoteExtraWrap.scrollIntoView({ behavior: "smooth", block: "center" });
}

function validateQuoteExtra() {
  ensureQuoteExtraUI();

  const prod = quoteProdSel ? quoteProdSel.value : "";
  const due = quoteDueInput ? quoteDueInput.value : "";

  const errs = [];
  if (!prod) errs.push("제작 일정을 선택해주세요.");
  if (!due) errs.push("납기일을 선택해주세요.");

  if (errs.length) {
    msgEl.innerHTML = errs.map((e) => `• ${e}`).join("<br>");
    okEl.textContent = "";
    return null;
  }

  msgEl.textContent = "";
  return { prod, due };
}

/* =========================
 * 버튼: 시안 확정하기
 * ========================= */
$("btnConfirm").addEventListener("click", async () => {
  msgEl.textContent = "";
  okEl.textContent = "";

  if (!validateBeforeSend()) return;

  try {
    const sel = cartItems.find((x) => x.id === selectedItemId);
    if (sel) saveCanvasToItem(sel);

    const ok = await sendEmail();
    if (!ok) return;

    okEl.textContent =
      "시안이 접수되었습니다. 검토 후 입력하신 이메일로 안내드리겠습니다.";
    msgEl.textContent = "";
  } catch (e) {
    console.error("메일 전송 실패:", e);
    msgEl.textContent =
      "메일 전송에 실패했습니다. 잠시 후 다시 시도해주세요.\n문제가 계속될 경우 고객센터로 문의해주세요.";
    okEl.textContent = "";
  }
});

/* =========================
 * 버튼: 견적서 요청
 * ========================= */
if (btnQuoteEl) {
  btnQuoteEl.addEventListener("click", async () => {
    msgEl.textContent = "";
    okEl.textContent = "";

    showQuoteExtraUI();

    if (!validateBeforeQuote()) return;

    const quoteExtra = validateQuoteExtra();
    if (!quoteExtra) return;

    try {
      const sel = cartItems.find((x) => x.id === selectedItemId);
      if (sel) saveCanvasToItem(sel);

      const rush = getRushValue();

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
          rushRate: calc.rushRate,
          line: calc.finalLine,
          design: hasDesign(it) ? "있음" : "없음",
        };
      });

      const ok1 = await sendEmail({
        quote_prod: quoteExtra.prod,
        quote_due: quoteExtra.due,
      });
      if (!ok1) return;

      const ok2 = await sendQuoteEmailToCustomer(itemsSummary, quoteExtra);
      if (!ok2) return;

      okEl.textContent =
        "견적서 요청이 완료되었습니다. 입력하신 이메일로 견적서를 발송했습니다.";
      msgEl.textContent = "";
    } catch (e) {
      console.error("견적서 요청 실패:", e);
      msgEl.textContent =
        "견적서 요청 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.";
      okEl.textContent = "";
    }
  });
}

/* =========================
 * 초기화
 * ========================= */
setCapTypeOptions();
updatePriceUI();
renderCart();
resizeCanvas(330, 330);
clearEditor();
applyCanvasSizeFromForm();
redraw();

// [ADD] 제작일정 변경 시 자동 반영(있을 경우)
bindRushChangeEvent();
