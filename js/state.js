/* moved from js/design/design-state.js */
/* =========================================================
 * 공통 UI 상태
========================================================= */
let uiLocked = false;

// 툴팁 확인 상태
let didReadProfileTooltip = false;
let didReadUploadTooltip = false;
let didConfirmedPopup = false;

/* =========================================================
 * 시안 리스트 상태
========================================================= */
let cartItems = [];
let selectedItemId = null;

/* =========================================================
 * 현재 편집 중인 이미지 상태
========================================================= */
let userImg = null;
let userImgFile = null;
let userImages = [];
let activeImageIndex = -1;
let imgCX = 0;
let imgCY = 0;
let imgScaleX = 1;
let imgScaleY = 1;
let imgRot = 0;

/* =========================================================
 * 현재 편집 중인 배경 상태
========================================================= */
let draftBgColor = "#ffffff";
let draftBgColor2 = "#fdcc63";
let draftBgType = "solid";
let draftBgDirection = "to-right";
// 그라데이션 경계 위치(0~1) / 부드러움(0~1)
let draftGradientPosition = 0.5;
let draftGradientSoftness = 1;
let draftBgSet = false;

/* =========================================================
 * 현재 편집 중인 텍스트 상태
========================================================= */
let textEnabled = false;
let textValue = "";
let textFontType = "basic";
let textColor = "#111827";
let textAlign = "center";
let textSize = "medium";
let textCX = 0;
let textCY = 0;
let textScale = 1;
let textRot = 0;
let activeObjectType = null;

/* =========================================================
 * 캔버스 드래그/리사이즈 상태
========================================================= */
let draggingMove = false;
let moveStart = { x: 0, y: 0 };
let centerStart = { x: 0, y: 0 };

let handleDrag = null;
let rotateDrag = null;
