/* =========================================================
 * DOM
========================================================= */
const $ = (id) => document.getElementById(id);

const msgEl = $("msg");
const okEl = $("ok");

const nameEl = $("name");
const phoneEl = $("phone");
const orderEl = $("orderNo");
const emailEl = $("email");

const quoteToggleEl = $("quoteToggle");
const quoteBoxEl = $("quoteBox");
const quoteProdEl = $("quoteProd");
const quoteDueEl = $("quoteDue");

const bizFileEl = $("bizFile");
const bizFileBtn = $("bizFileBtn");
const bizFileNameEl = $("bizFileName");

// 견적 추가 항목
const keyringQtyEl = $("keyringQty");
const keyringLedEl = $("keyringLed");
const keyringColorEl = $("keyringColor");
const keyringSlotsEl = $("keyringSlots");

const packTypeEl = $("packType");
const packSheetEl = $("packSheet");
const packStickerEl = $("packSticker");
const quoteNotesEl = $("quoteNotes");

const profileEl = $("profile");
const capTypeEl = $("capType");
const laserEl = $("laser");
const qtyEl = $("qty");

const unitPriceText = $("unitPriceText");

const cartListEl = $("cartList");
const cartCountEl = $("cartCount");
const cartTotalEl = $("cartTotal");

const selTextEl = $("selText");
const canvasTextEl = $("canvasText");
const bgTextEl = $("bgText");

const fileEl = $("file");
const fileBtn = $("fileBtn");
const fileDelBtn = $("fileDelBtn");
const fileNameEl = $("fileName");

const bgPickBtn = $("bgPickBtn");
const bgPickMount = $("bgPickMount");
const bgColorSwatch = $("bgColorSwatch");
const bgColorValue = $("bgColorValue");

const btnAddItemEl = $("btnAddItem");
const btnConfirmEl = $("btnConfirm");

const canvasWrapEl = $("canvasWrap");
const canvas = $("designCanvas");
const ctx = canvas.getContext("2d");

const bboxEl = $("bbox");
const rotHandleEl = $("rotHandle");

const draftProfile = $("draftProfile");
const draftCap = $("draftCap");
const draftLaser = $("draftLaser");
