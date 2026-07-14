/* moved from js/design/design-state.js */
/* =========================================================
 * 공통 UI 상태
========================================================= */
let uiLocked = false;

/* =========================================================
 * 캔버스 논리 크기 (canvas.width/height는 devicePixelRatio가
 * 곱해진 실제 렌더링 해상도이므로, 이미지/텍스트 위치 계산이나
 * 저장되는 좌표(design.cx/cy)는 항상 이 논리 크기를 기준으로 함
========================================================= */
let canvasLogicalW = 0;
let canvasLogicalH = 0;

// 툴팁 확인 상태
// 미사용 확인 (2026-07-09) - 대입만 되고 읽는 곳 없음, 필요시 복원
// let didReadProfileTooltip = false;
// let didReadUploadTooltip = false;
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

// 여러 텍스트 객체 관리 (userImages/activeImageIndex와 동일한 패턴)
let textObjects = [];
let activeTextIndex = -1;
const MAX_TEXT_COUNT = 3;

/* =========================================================
 * 캔버스 드래그/리사이즈 상태
========================================================= */
let draggingMove = false;
let moveStart = { x: 0, y: 0 };
let centerStart = { x: 0, y: 0 };

let handleDrag = null;
let rotateDrag = null;

/* =========================================================
 * Pickr 인스턴스
========================================================= */
let bgPickr = null;
let solidInlinePickr = null;
let activePickrTarget = "solid";
let activePickrAnchor = null;

let activeResizePointerId = null;

// 모바일 두 손가락 핀치 확대/축소 상태
const touchPointerMap = new Map();
let pinchDrag = null;

// 시안 리스트에서 저장된 시안을 불러오는 동안
// 캔버스 상태가 잠깐 비어 있는 값을 원본 시안에 덮어쓰지 않도록 막습니다.
let isLoadingItemToCanvas = false;
let canvasLoadToken = 0;

/* =========================================================
 * 모바일 스포이드
========================================================= */
let mobileEyedropperMode = false;
