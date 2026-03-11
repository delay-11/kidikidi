/* =========================================================
 * EmailJS 설정
========================================================= */
const COMPANY_EMAIL = "bbolcat@naver.com";
const EMAILJS_PUBLIC_KEY = "rzyGqBY1HaHCNyQCK";
const EMAILJS_SERVICE_ID = "service_kp5nyyt";

// 회사로: 주문정보 + 시안 첨부 + (견적이면 견적 섹션 포함)
const EMAILJS_TEMPLATE_ID = "template_ndnu8z3";

// 고객에게: 견적서(견적 요청 켠 경우에만)
const EMAILJS_QUOTE_TEMPLATE_ID = "template_eb3xcbg";

/* =========================================================
 * 가격표 / 옵션 / 캔버스 사이즈 / 가이드 사이즈
========================================================= */
const PRICE = {
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
};

const LASER_ADDON = { none: 0, black: 800, white: 1800 };

const CANVAS_SIZE_MAP = {
  "R4-1U": { w: 330, h: 330 },
  "R4-2U": { w: 500, h: 367 },

  "R3-1U": { w: 330, h: 330 },
  "R3-1.5U": { w: 500, h: 355 },

  "R2-1U": { w: 330, h: 330 },
  "R2-1.75U": { w: 520, h: 332 },
  "R2-2.25U": { w: 640, h: 330 },

  "R1-1U": { w: 330, h: 330 },
  "R1-1.25U": { w: 396, h: 330 },
  "R1-2.25U": { w: 620, h: 360 },
  "R1-2.75U": { w: 752, h: 365 },
  "R1-6.25U": { w: 1559, h: 368 },

  XDA: { w: 330, h: 330 },
  MAO: { w: 330, h: 330 },
  STD: { w: 330, h: 330 },
};

const GUIDE_SIZE_MAP = {
  "R4-1U": { safe: { w: 130, h: 140 }, outer: { w: 177, h: 175 } },
  "R4-2U": { safe: { w: 348, h: 140 }, outer: { w: 400, h: 175 } },

  "R3-1U": { safe: { w: 133, h: 145 }, outer: { w: 177, h: 175 } },
  "R3-1.5U": { safe: { w: 242, h: 144 }, outer: { w: 288, h: 174 } },

  "R2-1U": { safe: { w: 130, h: 147 }, outer: { w: 178, h: 175 } },
  "R2-1.75U": { safe: { w: 297, h: 147 }, outer: { w: 343, h: 173 } },
  "R2-2.25U": { safe: { w: 409, h: 145 }, outer: { w: 453, h: 175 } },

  "R1-1U": { safe: { w: 130, h: 145 }, outer: { w: 176, h: 172 } },
  "R1-1.25U": { safe: { w: 187, h: 143 }, outer: { w: 232, h: 173 } },
  "R1-2.25U": { safe: { w: 407, h: 144 }, outer: { w: 455, h: 175 } },
  "R1-2.75U": { safe: { w: 514, h: 144 }, outer: { w: 564, h: 174 } },
  "R1-6.25U": { safe: { w: 1282, h: 140 }, outer: { w: 1336, h: 177 } },

  XDA: { safe: { w: 150, h: 150 }, outer: { w: 180, h: 180 } },
  MAO: { safe: { w: 150, h: 150 }, outer: { w: 180, h: 180 } },
  STD: { safe: { w: 150, h: 150 }, outer: { w: 180, h: 180 } },
};

const CAP_OPTIONS = {
  OEM: [
    { value: "R1-1U", label: "R1-1U" },
    { value: "R1-1.25U", label: "R1-1.25U (Ctrl/Alt 등)" },
    { value: "R1-2.25U", label: "R1-2.25U (좌측 쉬프트)" },
    { value: "R1-2.75U", label: "R1-2.75U (우측 쉬프트)" },
    { value: "R1-6.25U", label: "R1-6.25U (스페이스바)" },

    { value: "R2-1U", label: "R2-1U" },
    { value: "R2-1.75U", label: "R2-1.75U (Caps Lock)" },
    { value: "R2-2.25U", label: "R2-2.25U (Enter)" },

    { value: "R3-1U", label: "R3-1U" },
    { value: "R3-1.5U", label: "R3-1.5U (Tab/₩)" },

    { value: "R4-1U", label: "R4-1U" },
    { value: "R4-2U", label: "R4-2U (Backspace)" },
  ],
  XDA: [{ value: "XDA", label: "XDA" }],
  MAO: [{ value: "MAO", label: "MAO" }],
};

const CONFIRM_KEY_PREFIX = "design_confirmed_";
