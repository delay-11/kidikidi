/* =========================================================
 * 장바구니 / 선택 상태
========================================================= */
let cartItems = [];
let selectedItemId = null;

/* =========================================================
 * 견적 요청 상태
========================================================= */
let quoteEnabled = false;
let quoteProd = "none";
let quoteDue = "";
let bizFileDataUrl = null;

/* =========================================================
 * 견적 추가 옵션 상태
========================================================= */
let keyringQty = 0;
let keyringLed = "none";
let keyringColor = "black";
let keyringSlots = "1";

let packType = "none";
let packSheet = false;
let packSticker = false;
let quoteNotes = "";

/* =========================================================
 * 캔버스 이미지 편집 상태
========================================================= */
let userImg = null;
let imgCX = 0;
let imgCY = 0;
let imgScale = 1;
let imgRot = 0;

/* =========================================================
 * 드래프트 상태
 * 장바구니에 추가하기 전, 현재 작업 중인 임시 상태
========================================================= */
let draftBgColor = "#ffffff";
let draftBgSet = false;

/* =========================================================
 * 캔버스 드래그 / 회전 상태
========================================================= */
let draggingMove = false;
let moveStart = { x: 0, y: 0 };
let centerStart = { x: 0, y: 0 };
let handleDrag = null;
let rotateDrag = null;

/* =========================================================
 * 주문 확정 / UI 잠금 상태
========================================================= */
if (!window.CONFIRM_KEY_PREFIX) {
  window.CONFIRM_KEY_PREFIX = "design_confirmed_";
}

let uiLocked = false;
let didConfirmedPopup = false;
