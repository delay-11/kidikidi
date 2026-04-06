/* =========================================================
 * 주문 확정 저장 키
========================================================= */
const CONFIRM_KEY_PREFIX = "design_confirmed_";

/* =========================================================
 * EmailJS 설정
========================================================= */
const COMPANY_EMAIL = "bbolcat@naver.com";
const EMAILJS_PUBLIC_KEY = "rzyGqBY1HaHCNyQCK";
const EMAILJS_SERVICE_ID = "service_kp5nyyt";

// 회사용 (시안 접수)
const EMAILJS_DESIGN_COMPANY_TEMPLATE_ID = "template_ndnu8z3";
// 고객용 (시안 접수 확인)
const EMAILJS_DESIGN_CUSTOMER_TEMPLATE_ID = "template_1mv0p2j";

// 회사용 (견적 요청 접수)
const EMAILJS_QUOTE_COMPANY_TEMPLATE_ID = "template_eb3xcbg";
// 고객용 (견적 요청 확인)
const EMAILJS_QUOTE_CUSTOMER_TEMPLATE_ID = "template_b94uml3";

/* =========================================================
 * 프로파일별 규격 옵션
========================================================= */
const CAP_OPTIONS = {
  OEM: [
    { value: "R4-1U", label: "R4-1U (베스트)" },
    { value: "R4-2U", label: "R4-2U (Backspace)" },

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

    { value: "NUM_0", label: "넘버패드 0" },
    { value: "NUM_PLUS", label: "넘버패드 +" },
    { value: "NUM_ENTER", label: "넘버패드 Enter" },
  ],
  XDA: [{ value: "XDA", label: "XDA" }],
  MAO: [{ value: "MAO", label: "MAO" }],
};

/* =========================================================
 * 품절 규격
========================================================= */
const SOLD_OUT_OPTIONS = {
  OEM: [],
  XDA: [],
  MAO: [],
};

/* =========================================================
 * 캔버스 크기
========================================================= */
const CANVAS_SIZE_MAP = {
  "R4-1U": { w: 330, h: 330 },
  "R4-2U": { w: 580, h: 367 },

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

  "NUM_0": { w: 629, h: 324 },
  "NUM_PLUS": { w: 364, h: 629 },
  "NUM_ENTER": { w: 364, h: 629 },

  XDA: { w: 330, h: 330 },
  MAO: { w: 330, h: 330 },
  STD: { w: 330, h: 330 },
};

/* =========================================================
 * 가이드 크기
 * safe  = 인쇄 안전선
 * outer = 바깥 가이드선
========================================================= */
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

  "NUM_0": { safe: { w: 345, h: 142 }, outer: { w: 396, h: 173 } },
  "NUM_PLUS": { safe: { w: 132, h: 366 }, outer: { w: 175, h: 397 } },
  "NUM_ENTER": { safe: { w: 132, h: 365 }, outer: { w: 176, h: 395 } },

  XDA: { safe: { w: 150, h: 150 }, outer: { w: 180, h: 180 } },
  MAO: { safe: { w: 150, h: 150 }, outer: { w: 180, h: 180 } },
  STD: { safe: { w: 150, h: 150 }, outer: { w: 180, h: 180 } },
};
