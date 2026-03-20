let cartItems = [];
let selectedItemId = null;

let userImg = null;
let imgCX = 0;
let imgCY = 0;
let imgScale = 1;
let imgRot = 0;

let draftBgColor = "#ffffff";
let draftBgSet = false;

let draggingMove = false;
let moveStart = { x: 0, y: 0 };
let centerStart = { x: 0, y: 0 };
let handleDrag = null;
let rotateDrag = null;
