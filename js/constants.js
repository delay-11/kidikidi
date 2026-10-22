/* moved from js/common/constants.js */
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

/* =========================================================
 * 프로파일별 규격 옵션
========================================================= */
const CAP_OPTIONS = {
  OEM: [
    { value: "R4-1U", label: "R4-1U" },
    { value: "R4-2U", label: "R4-2U (Backspace)" },

    { value: "R1-1U", label: "R1-1U" },
    { value: "R1-1.25U", label: "R1-1.25U (Ctrl/Alt 등)" },
    { value: "R1-2.25U", label: "R1-2.25U (좌측 쉬프트)" },
    { value: "R1-2.75U", label: "R1-2.75U (우측 쉬프트)" },
    { value: "R1-6.25U", label: "R1-6.25U (스페이스바)" },

    { value: "R2-1U", label: "R2-1U" },
    { value: "R2-1U_HOMING", label: "R2-1U 돌기" },
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

  // 용지 인쇄 시안 페이지(paper.html) 전용 - 키캡 페이지(index.html)의
  // 프로파일 선택에는 PAPER가 없으므로 키캡 쪽에는 노출되지 않음
  PAPER: [
    { value: "A3", label: "A3 (297×420mm)" },
    { value: "A4", label: "A4 (210×297mm)" },
    { value: "A5", label: "A5 (148×210mm)" },
  ],
};

/* =========================================================
 * 품절 규격
========================================================= */
const SOLD_OUT_OPTIONS = {
  OEM: [],
  XDA: [],
  MAO: [],
  PAPER: [],
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
  "R2-1U_HOMING": { w: 330, h: 330 },
  "R2-1.75U": { w: 520, h: 332 },
  "R2-2.25U": { w: 640, h: 330 },

  "R1-1U": { w: 330, h: 330 },
  "R1-1.25U": { w: 396, h: 330 },
  "R1-2.25U": { w: 620, h: 360 },
  "R1-2.75U": { w: 752, h: 365 },
  "R1-6.25U": { w: 1559, h: 368 },

  "NUM_0": { w: 629, h: 364 },
  "NUM_PLUS": { w: 364, h: 629 },
  "NUM_ENTER": { w: 364, h: 629 },

  XDA: { w: 330, h: 330 },
  MAO: { w: 330, h: 330 },
  STD: { w: 330, h: 330 },

  // 용지(세로 방향) - 편집 화면이 너무 커지지 않도록 A3도 A4와 같은
  // 크기로 편집하고, 첨부 내보내기 배율(exportScale)로 실제 비율을 맞춤
  // (모두 약 152dpi: A5 888×1260 / A4 1260×1782 / A3 1782×2520)
  // label: 캔버스 표시용 실제 크기
  A5: { w: 296, h: 420, exportScale: 3, label: "148×210mm" },
  A4: { w: 420, h: 594, exportScale: 3, label: "210×297mm" },
  A3: { w: 420, h: 594, exportScale: 3 * Math.SQRT2, label: "297×420mm" },
};

/* =========================================================
 * 가이드 크기
 * outer = 바깥 가이드선
 * inner = 안쪽 가이드선
 * safe  = 인쇄 안전선
========================================================= */
const GUIDE_SIZE_MAP = {
  "R4-1U": { outer: { w: 177, h: 175 }, inner: { w: 130, h: 140 }, safe: { w: 115, h: 125 } },
  "R4-2U": { outer: { w: 400, h: 175 }, inner: { w: 348, h: 140 }, safe: { w: 333, h: 125 } },

  "R3-1U": { outer: { w: 177, h: 175 }, inner: { w: 133, h: 145 }, safe: { w: 118, h: 130 } },
  "R3-1.5U": { outer: { w: 288, h: 174 }, inner: { w: 242, h: 144 }, safe: { w: 227, h: 129 } },

  "R2-1U": { outer: { w: 178, h: 175 }, inner: { w: 130, h: 147 }, safe: { w: 115, h: 132 } },
  "R2-1U_HOMING": { outer: { w: 178, h: 175 }, inner: { w: 130, h: 147 }, safe: { w: 115, h: 132 } },
  "R2-1.75U": { outer: { w: 343, h: 173 }, inner: { w: 297, h: 147 }, safe: { w: 282, h: 132 } },
  "R2-2.25U": { outer: { w: 453, h: 175 }, inner: { w: 409, h: 145 }, safe: { w: 394, h: 130 } },

  "R1-1U": { outer: { w: 176, h: 172 }, inner: { w: 130, h: 145 }, safe: { w: 115, h: 130 } },
  "R1-1.25U": { outer: { w: 232, h: 173 }, inner: { w: 187, h: 143 }, safe: { w: 172, h: 128 } },
  "R1-2.25U": { outer: { w: 455, h: 175 }, inner: { w: 407, h: 144 }, safe: { w: 392, h: 129 } },
  "R1-2.75U": { outer: { w: 564, h: 174 }, inner: { w: 514, h: 144 }, safe: { w: 499, h: 129 } },
  "R1-6.25U": { outer: { w: 1336, h: 177 }, inner: { w: 1282, h: 140 }, safe: { w: 1267, h: 125 } },

  "NUM_0": { outer: { w: 396, h: 173 }, inner: { w: 345, h: 142 }, safe: { w: 330, h: 127 } },
  "NUM_PLUS": { outer: { w: 175, h: 397 }, inner: { w: 132, h: 366 }, safe: { w: 117, h: 351 } },
  "NUM_ENTER": { outer: { w: 176, h: 395 }, inner: { w: 132, h: 365 }, safe: { w: 117, h: 350 } },

  XDA: { outer: { w: 180, h: 180 }, inner: { w: 150, h: 150 }, safe: { w: 135, h: 135 } },
  MAO: { outer: { w: 180, h: 180 }, inner: { w: 150, h: 150 }, safe: { w: 149.5, h: 149.5 } },
  STD: { outer: { w: 180, h: 180 }, inner: { w: 150, h: 150 }, safe: { w: 149.5, h: 149.5 } },

  // 용지: outer = 재단선(용지 전체), inner = 재단 오차 3mm, safe = 안전 여백 5mm
  // radius: 용지는 모서리가 각지므로 둥근 모서리 없이 그림
  A5: { outer: { w: 296, h: 420 }, inner: { w: 284, h: 408 }, safe: { w: 276, h: 400 }, radius: 0 },
  A4: { outer: { w: 420, h: 594 }, inner: { w: 408, h: 582 }, safe: { w: 400, h: 574 }, radius: 0 },
  A3: { outer: { w: 420, h: 594 }, inner: { w: 412, h: 586 }, safe: { w: 406, h: 580 }, radius: 0 },
};
