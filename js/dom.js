/* =========================================================
 * DOM 유틸
========================================================= */
function $(id) {
  return document.getElementById(id);
}

/* =========================================================
 * 주문자 정보
========================================================= */
const nameEl = $("name");
const phoneEl = $("phone");
const orderEl = $("orderNo");
const emailEl = $("email");
const orderLabelEl = $("orderLabel");

/* =========================================================
 * 제품 옵션
========================================================= */
const profileEl = $("profile");
const capTypeEl = $("capType");
const laserEl = $("laser");
const qtyEl = $("qty");

/* =========================================================
 * 주문자 정보 안내
========================================================= */
const formNoticeEl = $("formNotice");
const formReadyBoxEl = $("formReadyBox");
const formReadyTitleEl = $("formReadyTitle");
const formReadyDescEl = $("formReadyDesc");

/* =========================================================
 * 캔버스 / 편집 영역
========================================================= */
const canvas = $("designCanvas");
const ctx = canvas?.getContext("2d");
const canvasWrapEl = $("canvasWrap");
const canvasTextEl = $("canvasText");
const selTextEl = $("selText");
const bgTextEl = $("bgText");

const bboxEl = $("bbox");
const rotHandleEl = $("rotHandle");

/* =========================================================
 * 이미지 업로드 / 배경 설정
========================================================= */
const fileEl = $("file");
const fileBtn = $("fileBtn");
const fileDelBtn = $("fileDelBtn");
const fileNameEl = $("fileName");

const bgPickBtn = $("bgPickBtn");
const bgEyeBtn = $("bgEyeBtn");
const bgColorSwatchEl = $("bgColorSwatch");
const bgColorValueEl = $("bgColorValue");
const bgPickMountEl = $("bgPickMount");

/* =========================================================
 * 캔버스 안내
========================================================= */
const canvasNoticeEl = $("canvasNotice");

/* =========================================================
 * 장바구니 / 시안 확정
========================================================= */
const btnAddItemEl = $("btnAddItem");
const btnConfirmEl = $("btnConfirm");

const cartListEl = $("cartList");
const cartCountEl = $("cartCount");

/* =========================================================
 * 공통 메시지
========================================================= */
const msgEl = $("msg");
const okEl = $("ok");

/* =========================================================
 * 확정 모달
========================================================= */
const confirmModalEl = $("confirmModal");
const confirmModalBodyEl = $("confirmModalBody");
const confirmModalCancelEl = $("confirmModalCancel");
const confirmModalOkEl = $("confirmModalOk");


/* =========================================================
 * 호환 변수 별칭
========================================================= */
const bgColorSwatch = bgColorSwatchEl;
const bgColorValue = bgColorValueEl;
const bgPickMount = bgPickMountEl;
const orderBarNoEl = $("orderBarNo");
const draftProfileEl = $("draftProfile");
const draftCapEl = $("draftCap");
const draftLaserEl = $("draftLaser");

const unitPriceText = null;
