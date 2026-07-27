/* moved from js/design/design-dom.js */
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
const optionGuideBoxEl = $("optionGuideBox");
const optionGuideTitleEl = $("optionGuideTitle");
const optionGuideDescEl = $("optionGuideDesc");

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
const deleteHandleEl = $("deleteHandle");
const bboxActionGroupEl = bboxEl?.querySelector(".bboxActionGroup");

/* =========================================================
 * 이미지 업로드 / 배경 설정
========================================================= */
const fileEl = $("file");
const fileBtn = $("fileBtn");
const fileDelBtn = $("fileDelBtn");
const imageCenterBtn = $("imageCenterBtn");
const fileNameEl = $("fileName");
const imageCountBadgeEl = $("imageCountBadge");

const bgPickBtn = $("bgPickBtn");
const bgEyeBtn = $("bgEyeBtn");
const bgColorSwatchEl = $("bgColorSwatch");
const bgColorValueEl = $("bgColorValue");
const bgPickMountEl = $("bgPickMount");
const solidNativeColorEl = $("solidNativeColor");
const solidHexInputEl = $("solidHexInput");
const solidInlinePickrMountEl = $("solidInlinePickrMount");
const solidColorBoardEl = $("solidColorBoard");
const solidColorBoardMarkerEl = $("solidColorBoardMarker");

/* =========================================================
 * 제작 도구 / 그라데이션 배경
========================================================= */
const toolTabEls = Array.from(document.querySelectorAll("[data-tool-target]"));
const toolPanelEls = Array.from(document.querySelectorAll(".toolPanel"));
const bgModeSolidBtn = $("bgModeSolidBtn");
const bgModeGradientBtn = $("bgModeGradientBtn");
const gradientPanelEl = $("gradientPanel");
const gradientColor1El = $("gradientColor1");
const gradientColor2El = $("gradientColor2");
const gradientColor1SwatchEl = $("gradientColor1Swatch");
const gradientColor2SwatchEl = $("gradientColor2Swatch");
const gradientColor1ValueEl = $("gradientColor1Value");
const gradientColor2ValueEl = $("gradientColor2Value");
const gradientDirBtnEls = Array.from(document.querySelectorAll("[data-gradient-dir]"));
const gradientPositionRangeEl = $("gradientPositionRange");
const gradientPositionValueEl = $("gradientPositionValue");
const gradientSoftnessRangeEl = $("gradientSoftnessRange");
const gradientSoftnessValueEl = $("gradientSoftnessValue");
const gradientResetBtnEl = $("gradientResetBtn");

/* =========================================================
 * 텍스트 도구
========================================================= */
const textInputEl = $("textInput");
const textApplyBtnEl = $("textApplyBtn");
const textClearBtnEl = $("textClearBtn");
const textCountBadgeEl = $("textCountBadge");
const textColorBtnEl = $("textColorBtn");
const textColorSwatchEl = $("textColorSwatch");
const textColorValueEl = $("textColorValue");
const textFontBtnEls = Array.from(document.querySelectorAll("[data-text-font]"));
const textAlignBtnEls = Array.from(document.querySelectorAll("[data-text-align]"));
const textSizeBtnEls = Array.from(document.querySelectorAll("[data-text-size]"));

/* =========================================================
 * 캔버스 안내
========================================================= */
const canvasNoticeEl = $("canvasNotice");
const canvasHelpTipEl = $("canvasHelpTip");
const editorOnboardingEl = $("editorOnboarding");
const editorOnboardingCloseEl = $("editorOnboardingClose");
const editorOnboardingNeverEl = $("editorOnboardingNever");

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
const msgEl = null;
const okEl = null;

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


/* =========================================================
 * 단계형 제작 플로우
========================================================= */
const btnGoEditorEl = $("btnGoEditor");
const btnBackInfoEl = $("btnBackInfo");
const btnGoConfirmEl = $("btnGoConfirm");
const btnBackEditorEl = $("btnBackEditor");
const stepChipEls = Array.from(document.querySelectorAll("[data-step-chip]"));

/* =========================================================
 * 제작 화면 옵션 빠른 변경
========================================================= */
const optionQuickBtnEl = $("optionQuickBtn");
const optionQuickModalEl = $("optionQuickModal");
const optionQuickCloseEl = $("optionQuickClose");
const optionQuickCancelEl = $("optionQuickCancel");
const optionQuickApplyEl = $("optionQuickApply");
const quickProfileEl = $("quickProfile");
const quickCapTypeEl = $("quickCapType");
const quickLaserEl = $("quickLaser");
