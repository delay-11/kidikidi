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
let imgCX = 0;
let imgCY = 0;
let imgScaleX = 1;
let imgScaleY = 1;
let imgRot = 0;

/* =========================================================
 * 현재 편집 중인 배경 상태
========================================================= */
let draftBgColor = "#ffffff";
let draftBgSet = false;

/* =========================================================
 * 캔버스 드래그/리사이즈 상태
========================================================= */
let draggingMove = false;
let moveStart = { x: 0, y: 0 };
let centerStart = { x: 0, y: 0 };

let handleDrag = null;
let rotateDrag = null;
