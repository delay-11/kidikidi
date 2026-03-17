/* =========================================================
 * DOM 헬퍼
========================================================= */
const $ = (id) => document.getElementById(id);

/* =========================================================
 * 공통 메시지
========================================================= */
const msgEl = $("msg");
const okEl = $("ok");

/* =========================================================
 * 주문자 정보 안내 메시지
========================================================= */
const formNoticeEl = $("formNotice");

/* =========================================================
 * 주문자 정보
========================================================= */
const nameEl = $("name");
const phoneEl = $("phone");
const orderEl = $("orderNo");
const emailEl = $("email");
const orderLabelEl = $("orderLabel");

/* =========================================================
 * 견적 요청 기본
========================================================= */
const quoteToggleEl = $("quoteToggle");
const quoteBoxEl = $("quoteBox");
const quoteProdEl = $("quoteProd");
const quoteDueEl = $("quoteDue");

/* =========================================================
 * 사업자 등록증 첨부
========================================================= */
const bizFileEl = $("bizFile");
const bizFileBtn = $("bizFileBtn");
const bizFileNameEl = $("bizFileName");

/* =========================================================
 * 견적 추가 항목
========================================================= */
const keyringQtyEl = $("keyringQty");
const keyringLedEl = $("keyringLed");
const keyringColorEl = $("keyringColor");
const keyringSlotsEl = $("keyringSlots");

const packTypeEl = $("packType");
const packSheetEl = $("packSheet");
const packStickerEl = $("packSticker");
const quoteNotesEl = $("quoteNotes");

/* =========================================================
 * 시안 옵션
========================================================= */
const profileEl = $("profile");
const capTypeEl = $("capType");
const laserEl = $("laser");
const qtyEl = $("qty");
const unitPriceText = $("unitPriceText");

/* =========================================================
 * 장바구니 / 요약 정보
========================================================= */
const cartListEl = $("cartList");
const cartCountEl = $("cartCount");
const cartTotalEl = $("cartTotal");

const selTextEl = $("selText");
const canvasTextEl = $("canvasText");
const bgTextEl = $("bgText");

/* =========================================================
 * 이미지 업로드
========================================================= */
const fileEl = $("file");
const fileBtn = $("fileBtn");
const fileDelBtn = $("fileDelBtn");
const fileNameEl = $("fileName");

/* =========================================================
 * 배경색 선택
========================================================= */
const bgEyeBtn = $("bgEyeBtn");
const bgPickBtn = $("bgPickBtn");
const bgPickMount = $("bgPickMount");
const bgColorSwatch = $("bgColorSwatch");
const bgColorValue = $("bgColorValue");

/* =========================================================
 * 액션 버튼
========================================================= */
const btnAddItemEl = $("btnAddItem");
const btnConfirmEl = $("btnConfirm");

/* =========================================================
 * 캔버스
========================================================= */
const canvasWrapEl = $("canvasWrap");
const canvas = $("designCanvas");
const ctx = canvas.getContext("2d");
const canvasNoticeEl = $("canvasNotice");

/* =========================================================
 * 캔버스 보조 UI
========================================================= */
const bboxEl = $("bbox");
const rotHandleEl = $("rotHandle");

/* =========================================================
 * 현재 작업중인 시안 정보 표시
========================================================= */
const draftProfile = $("draftProfile");
const draftCap = $("draftCap");
const draftLaser = $("draftLaser");
