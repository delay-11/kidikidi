/* =========================================================
 * 견적 공용 상수
========================================================= */
const QUOTE_PRICE = {
  keycap: {
    OEM: {
      "R1-1U": 1280,
      "R1-1.25U": 1580,
      "R1-2.25U": 1780,
      "R1-2.75U": 1980,
      "R1-6.25U": 2280,
      "R2-1U": 1280,
      "R2-1.75U": 1580,
      "R2-2.25U": 1780,
      "R3-1U": 1280,
      "R3-1.5U": 1580,
      "R4-1U": 1280,
      "R4-2U": 1780,
    },
    XDA: { XDA: 1680 },
    MAO: { MAO: 1780 },
  },
  laser: {
    black: 1120,
    white: 2120,
  },
  keyring: {
    "투명": {
      "키링 1구": 1380,
      "키링 2구": 2500,
      "키링 3구": 3000,
      "키링 4구": 3800,
      "키링 5구": 5980,
    },
    "반투명블랙": {
      "키링 1구": 1380,
      "키링 2구": 2500,
      "키링 3구": 3000,
      "키링 4구": 3800,
    },
    "화이트": {
      "4구 T형": 4980,
      "4구 정사각": 4980,
      "4구 일자형": 4980,
      "5구 십자형": 4980,
      "9구": 7800,
    },
    "블랙": {
      "4구 T형": 4980,
      "9구": 7800,
    },
    "솔리드": {
      "1구": 1200,
      "2구": 2000,
      "3구": 2800,
      "4구": 3600,
    },
  },
};

const QUOTE_CAP_OPTIONS = {
  OEM: [
    "R4-1U",
    "R4-2U",
    "R1-1U",
    "R1-1.25U",
    "R1-2.25U",
    "R1-2.75U",
    "R1-6.25U",
    "R2-1U",
    "R2-1.75U",
    "R2-2.25U",
    "R3-1U",
    "R3-1.5U",
  ],
  XDA: ["XDA"],
  MAO: ["MAO"],
};

function formatPrice(value = 0) {
  const amount = Number(value || 0);
  return `${numberWithCommas(amount)}원`;
}

function getDiscountRate(qty = 0) {
  const count = Number(qty || 0);
  if (count >= 5000) return 0.2;
  if (count >= 1000) return 0.15;
  if (count >= 500) return 0.1;
  return 0;
}

function getRushRate(rushType = "normal") {
  if (rushType === "fast") return 0.2;
  if (rushType === "urgent") return 0.3;
  return 0;
}

function getRushLabel(rushType = "normal") {
  if (rushType === "fast") return "빠른제작";
  if (rushType === "urgent") return "긴급제작";
  return "일반 제작";
}

function getLaserLabel(laserType = "none") {
  if (laserType === "black") return "블랙 레이저";
  if (laserType === "white") return "화이트 레이저";
  return "없음";
}

function getKeycapUnitPrice(profile = "", size = "", laserType = "none") {
  const base = QUOTE_PRICE.keycap?.[profile]?.[size] || 0;
  if (!base) return 0;
  if (profile !== "OEM") return base;
  return base + (QUOTE_PRICE.laser?.[laserType] || 0);
}

function getKeyringUnitPrice(color = "", type = "") {
  return QUOTE_PRICE.keyring?.[color]?.[type] || 0;
}

function buildSelectOptions(selectEl, values = [], placeholder = "선택") {
  if (!selectEl) return;
  selectEl.innerHTML = "";

  const placeholderOption = document.createElement("option");
  placeholderOption.value = "";
  placeholderOption.textContent = placeholder;
  selectEl.appendChild(placeholderOption);

  values.forEach((value) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    selectEl.appendChild(option);
  });
}

function collectCheckedPackaging() {
  const pairs = [
    ["packOpp", "개별 OPP 포장"],
    ["packBundle", "시안별 묶음 포장"],
    ["packSet", "세트 포장"],
    ["packCase", "케이스 제작"],
    ["needJig", "대지 포함"],
    ["needSticker", "스티커 제작"],
  ];

  return pairs
    .filter(([id]) => document.getElementById(id)?.checked)
    .map(([, label]) => label);
}
