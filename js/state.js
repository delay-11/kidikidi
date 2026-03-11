/* =========================================================
 * 상태(장바구니/캔버스/견적)
========================================================= */
let cartItems = [];
let selectedItemId = null;

// 견적 상태(주문 단위)
let quoteEnabled = false;
let quoteProd = "none";
let quoteDue = "";
let bizFileDataUrl = null;

// 견적 추가 상태
let keyringQty = 0;
let keyringLed = "none";
let keyringColor = "black";
let keyringSlots = "1";

let packType = "none";
let packSheet = false;
let packSticker = false;
let quoteNotes = "";

// 캔버스 편집 상태
let userImg = null;
let imgCX = 0;
let imgCY = 0;
let imgScale = 1;
let imgRot = 0;

// 드래그 상태
let draggingMove = false;
let moveStart = { x: 0, y: 0 };
let centerStart = { x: 0, y: 0 };
let handleDrag = null;
let rotateDrag = null;

// 잠금 상태
let uiLocked = false;
let didConfirmedPopup = false;

// Pickr 상태
let bgPickr = null;

// 필드 에러 상태
const fieldErr = { name: null, phone: null, order: null, email: null };
