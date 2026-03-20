/* =========================================================
 * 공통 UI 상태
========================================================= */
let uiLocked = false;

// 툴팁 확인 상태
let didReadProfileTooltip = false;
let didReadUploadTooltip = false;
let didConfirmedPopup = false;

/* =========================================================
 * 장바구니 / 시안 상태
========================================================= */
let cartItems = [];
let selectedItemId = null;

/* =========================================================
 * 현재 편집 중인 이미지 상태
========================================================= */
let userImg = null;
let imgCX = 0;
let imgCY = 0;
let imgScale = 1;
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

/* =========================================================
 * 디자인 페이지용 견적 기본 상태
========================================================= */
let quoteEnabled = false;
let quoteProd = "none";
let quoteDue = "";
let bizFileDataUrl = null;

let keyringQty = 0;
let keyringLed = "none";
let keyringColor = "black";
let keyringSlots = "1";

let packType = "none";
let packSheet = false;
let packSticker = false;
let quoteNotes = "";
