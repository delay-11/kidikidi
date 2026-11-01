/* =========================================================
 * 키캡 목업 미리보기
 *
 * 가이드선(바깥/안쪽 회색선)만으로는 실제 키캡에서 어디가 옆면이고
 * 어디가 윗면인지 감이 잘 안 와서, 시안 위에 키캡 입체 음영을 얹어
 * 실제 키캡처럼 보이게 한다.
 *
 * - 바깥 가이드 밖(키캡에 안 찍히는 여백): 흐리게 덮고 키캡 그림자 표시
 * - 바깥~안쪽 가이드 사이(옆면): 위는 밝게, 아래는 어둡게 경사면 음영
 * - 안쪽 가이드 안(윗면): OEM은 원통형, XDA/MAO는 둥근 접시형 음영
 * - 빨간 인쇄 안전선은 그대로 맨 위에 표시
 *
 * 음영은 별도 오버레이 캔버스에만 그린다. 실제 시안 캔버스(designCanvas)와
 * 저장/메일 첨부 이미지에는 전혀 들어가지 않고, 모바일 스포이드도
 * designCanvas에서 색을 읽으므로 음영 때문에 색이 틀어지지 않는다.
========================================================= */

const KEYCAP_MOCKUP_STORAGE_KEY = "kidikidi_keycap_mockup_v1";

// MAO는 사각형이 아니라서 가이드 SVG(image/guides/mao-*.svg)와 같은 path를 그대로 사용
const MAO_MOCKUP_PATHS = {
  outer: {
    d: "M161.1,252.8c-13.7,0-26.8-.6-38.9-1.6h-.6s-5.8-.8-5.8-.8c-18.9-2.6-33.7-16.9-36.8-35.8l-1.7-10.9v-.6c-1.2-15-1.7-30.3-1.6-45.6.2-26.6,4.2-47.7,12.5-66.2,3.9-8.5,12.5-14,21.9-14,0,0,2.5,0,2.5,0h2.9c0,0,1.6.8,1.6.8l16,2.9h1.2c10.6,1.6,20.9,2.3,30.6,2.3s20.1-.7,30.6-2.2h.9c0-.1.5-.1.5-.1l19.4-3.5h.5c0,0,.1,0,.2,0,.7-.1,1.7-.3,2.9-.3,9,0,17.4,5.1,21.3,13l.2.5.3.6c8.2,18,12.2,38.5,12.6,64.6h0c0,16.9-.4,32.2-1.5,46.9v.6s-1.8,11.1-1.8,11.1c-3.1,18.8-17.8,33.2-36.6,35.9l-6.3.8h-.4c-10.4.8-21.7,1.4-33.5,1.6v.2h-13.1Z",
    box: { x: 75.7, y: 77.2, w: 178.6, h: 175.8 },
  },
  inner: {
    d: "M161.2,239.8c-13.4,0-26.1-.6-37.9-1.6h-.3s-5.4-.8-5.4-.8c-13.2-1.8-23.5-11.8-25.7-25l-1.6-10.3h0c-1.1-14.7-1.6-29.7-1.5-44.6.2-24.7,3.8-44.1,11.4-61,1.8-3.9,5.7-6.4,10-6.4,0,0,2.2,0,2.2,0l.6.3,19,3.4h.5c11.1,1.5,22,2.3,32.4,2.3s21.3-.8,32.4-2.3h.7l19.4-3.5h.6c.3,0,.6-.1.9-.2.4,0,.8-.1.9-.1,4.1,0,7.9,2.3,9.7,5.8l.2.4v.2c7.5,16.3,11.2,35.2,11.5,59.5,0,16.4-.4,31.3-1.5,45.7h0c0,.1-1.6,10.6-1.6,10.6-2.2,13.2-12.5,23.3-25.6,25.1l-5.7.7h0c-11.9.9-24.9,1.5-38.7,1.6h-6.9Z",
    box: { x: 88.8, y: 90.0, w: 152.4, h: 149.8 },
  },
};

let keycapMockupEnabled = loadKeycapMockupPref();
let keycapMockupCanvas = null;
let keycapMockupCtx = null;
let keycapMockupHiddenForPick = false;

function loadKeycapMockupPref() {
  try {
    return localStorage.getItem(KEYCAP_MOCKUP_STORAGE_KEY) !== "off";
  } catch (e) {
    return true;
  }
}

function saveKeycapMockupPref(on) {
  try {
    localStorage.setItem(KEYCAP_MOCKUP_STORAGE_KEY, on ? "on" : "off");
  } catch (e) {
    // 저장 실패해도 화면 동작에는 영향 없음
  }
}

function isKeycapMockupOn() {
  return !!keycapMockupEnabled;
}

function ensureKeycapMockupCanvas() {
  if (keycapMockupCanvas) return keycapMockupCanvas;
  if (!canvasWrapEl || !canvas) return null;

  const el = document.createElement("canvas");
  el.id = "keycapMockupCanvas";
  el.className = "keycapMockupCanvas";
  el.setAttribute("aria-hidden", "true");

  // designCanvas 바로 뒤(가이드 SVG/선택 박스보다 아래)에 둔다.
  canvas.insertAdjacentElement("afterend", el);

  keycapMockupCanvas = el;
  keycapMockupCtx = el.getContext("2d");
  return el;
}

// 오버레이 캔버스를 실제 designCanvas의 화면 위치/크기에 정확히 맞춘다.
// (모바일에서 안내 문구 때문에 canvasWrap이 캔버스보다 커지는 경우 대비 - MAO 가이드와 같은 방식)
function syncKeycapMockupBox() {
  const el = ensureKeycapMockupCanvas();
  if (!el) return null;

  const canvasRect = canvas.getBoundingClientRect();
  const wrapRect = canvasWrapEl.getBoundingClientRect();
  if (!canvasRect.width || !canvasRect.height) return null;

  el.style.left = `${canvasRect.left - wrapRect.left}px`;
  el.style.top = `${canvasRect.top - wrapRect.top}px`;
  el.style.width = `${canvasRect.width}px`;
  el.style.height = `${canvasRect.height}px`;

  const dpr = window.devicePixelRatio || 1;
  const pw = Math.max(1, Math.round(canvasRect.width * dpr));
  const ph = Math.max(1, Math.round(canvasRect.height * dpr));
  if (el.width !== pw) el.width = pw;
  if (el.height !== ph) el.height = ph;

  return {
    scaleX: (canvasRect.width / canvasLogicalW) * dpr,
    scaleY: (canvasRect.height / canvasLogicalH) * dpr,
  };
}

function rectTrapezoid(c, pts) {
  c.beginPath();
  c.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i += 1) c.lineTo(pts[i][0], pts[i][1]);
  c.closePath();
}

// 프로파일/규격의 키캡 모양(바깥=키캡 바닥 테두리, 안쪽=윗면)을 Path2D로 만든다.
// 인자를 안 주면 현재 에디터에서 고른 프로파일/규격/캔버스 크기를 쓴다.
// (인쇄 가이드 팝업의 예시 그림도 같은 함수로 그린다)
function getKeycapMockupShape(
  profile = profileEl?.value || "OEM",
  capType = capTypeEl?.value,
  W = canvasLogicalW,
  H = canvasLogicalH
) {
  if (profile === "MAO") {
    return {
      isMao: true,
      dish: "sphere",
      outer: new Path2D(MAO_MOCKUP_PATHS.outer.d),
      inner: new Path2D(MAO_MOCKUP_PATHS.inner.d),
      outerBox: MAO_MOCKUP_PATHS.outer.box,
      innerBox: MAO_MOCKUP_PATHS.inner.box,
      safe: null, // MAO 안전선은 기존 SVG 가이드가 그린다
    };
  }

  const key = profile === "OEM" ? capType : profile;
  const guide = GUIDE_SIZE_MAP[key] || GUIDE_SIZE_MAP.STD;
  if (!guide) return null;

  const box = (size) => ({ x: (W - size.w) / 2, y: (H - size.h) / 2, w: size.w, h: size.h });
  const toPath = (b, r) => {
    const p = new Path2D();
    const rr = Math.min(r, b.w / 2, b.h / 2);
    p.moveTo(b.x + rr, b.y);
    p.arcTo(b.x + b.w, b.y, b.x + b.w, b.y + b.h, rr);
    p.arcTo(b.x + b.w, b.y + b.h, b.x, b.y + b.h, rr);
    p.arcTo(b.x, b.y + b.h, b.x, b.y, rr);
    p.arcTo(b.x, b.y, b.x + b.w, b.y, rr);
    p.closePath();
    return p;
  };

  const outerBox = box(guide.outer);
  const innerBox = box(guide.inner);
  const safeBox = box(guide.safe);

  return {
    dish: profile === "XDA" ? "sphere" : "cylinder",
    outer: toPath(outerBox, 18),
    inner: toPath(innerBox, 16),
    safe: toPath(safeBox, 14),
    outerBox,
    innerBox,
  };
}

function drawKeycapMockup() {
  syncKeycapMockupToggleUI();
  syncMaoGuideLinesForMockup();

  const visible = isKeycapMockupOn() && !keycapMockupHiddenForPick;
  if (!keycapMockupCanvas && !visible) return;

  const el = ensureKeycapMockupCanvas();
  if (!el) return;

  el.style.display = visible ? "block" : "none";
  if (!visible) return;

  const scale = syncKeycapMockupBox();
  const c = keycapMockupCtx;
  if (!scale || !c) return;

  c.setTransform(1, 0, 0, 1, 0, 0);
  c.clearRect(0, 0, el.width, el.height);
  c.setTransform(scale.scaleX, 0, 0, scale.scaleY, 0, 0);

  const shape = getKeycapMockupShape();
  if (!shape) return;

  paintKeycapMockup(c, canvasLogicalW, canvasLogicalH, shape, Math.min(scale.scaleX, scale.scaleY));
}

// 이미 시안이 그려진 화면 위에 키캡 음영을 얹는다. c는 논리 좌표(0~W, 0~H)로 스케일된 상태여야 한다.
// blurScale: 그림자 blur는 transform 영향을 안 받으므로 실제 픽셀 배율을 따로 받는다.
function paintKeycapMockup(c, W, H, shape, blurScale = 1) {
  const o = shape.outerBox;
  const i = shape.innerBox;

  /* 1) 키캡 밖 여백: 흐리게 덮어서 "여긴 키캡에 안 찍힘"을 표현 */
  const outside = new Path2D();
  outside.rect(0, 0, W, H);
  outside.addPath(shape.outer);

  c.save();
  c.fillStyle = "rgba(244, 245, 247, 0.84)";
  c.fill(outside, "evenodd");
  c.restore();

  /* 2) 키캡 그림자 (키캡 바깥쪽에만 보이도록 바깥 영역으로 clip) */
  c.save();
  c.clip(outside, "evenodd");
  c.shadowColor = "rgba(16, 24, 40, 0.22)";
  c.shadowBlur = 16 * blurScale;
  c.shadowOffsetY = 7 * blurScale;
  c.fillStyle = "#ffffff";
  c.fill(shape.outer);
  c.restore();

  /* 3) 옆면: 바깥~안쪽 사이를 위/아래/좌/우 4개의 경사면으로 나눠 음영 */
  const ring = new Path2D();
  ring.addPath(shape.outer);
  ring.addPath(shape.inner);

  const walls = [
    {
      // 윗쪽 옆면: 빛을 받아 밝게
      pts: [[o.x, o.y], [o.x + o.w, o.y], [i.x + i.w, i.y], [i.x, i.y]],
      from: [0, o.y], to: [0, i.y],
      stops: [[0, "rgba(255,255,255,0.30)"], [1, "rgba(255,255,255,0.08)"]],
    },
    {
      // 아랫쪽 옆면(앞면): 가장 어둡게
      pts: [[o.x, o.y + o.h], [o.x + o.w, o.y + o.h], [i.x + i.w, i.y + i.h], [i.x, i.y + i.h]],
      from: [0, o.y + o.h], to: [0, i.y + i.h],
      stops: [[0, "rgba(16,24,40,0.30)"], [1, "rgba(16,24,40,0.12)"]],
    },
    {
      // 왼쪽 옆면
      pts: [[o.x, o.y], [i.x, i.y], [i.x, i.y + i.h], [o.x, o.y + o.h]],
      from: [o.x, 0], to: [i.x, 0],
      stops: [[0, "rgba(16,24,40,0.16)"], [1, "rgba(16,24,40,0.05)"]],
    },
    {
      // 오른쪽 옆면
      pts: [[o.x + o.w, o.y], [i.x + i.w, i.y], [i.x + i.w, i.y + i.h], [o.x + o.w, o.y + o.h]],
      from: [o.x + o.w, 0], to: [i.x + i.w, 0],
      stops: [[0, "rgba(16,24,40,0.20)"], [1, "rgba(16,24,40,0.07)"]],
    },
  ];

  c.save();
  c.clip(ring, "evenodd");
  if (shape.isMao) {
    // MAO는 옆면이 둥글게 이어져 있어서, 면을 나누면 꺾인 선이 생긴다 → 위아래/좌우 부드러운 음영만 겹친다.
    const v = c.createLinearGradient(0, o.y, 0, o.y + o.h);
    v.addColorStop(0, "rgba(255,255,255,0.26)");
    v.addColorStop(0.45, "rgba(16,24,40,0.06)");
    v.addColorStop(1, "rgba(16,24,40,0.30)");
    c.fillStyle = v;
    c.fillRect(o.x, o.y, o.w, o.h);

    const h = c.createLinearGradient(o.x, 0, o.x + o.w, 0);
    h.addColorStop(0, "rgba(16,24,40,0.10)");
    h.addColorStop(0.5, "rgba(16,24,40,0)");
    h.addColorStop(1, "rgba(16,24,40,0.14)");
    c.fillStyle = h;
    c.fillRect(o.x, o.y, o.w, o.h);
  } else {
    walls.forEach((wall) => {
      const g = c.createLinearGradient(wall.from[0], wall.from[1], wall.to[0], wall.to[1]);
      wall.stops.forEach(([at, color]) => g.addColorStop(at, color));
      c.fillStyle = g;
      rectTrapezoid(c, wall.pts);
      c.fill();
    });
  }
  c.restore();

  /* 4) 윗면: 오목하게 파인 접시 음영 */
  c.save();
  c.clip(shape.inner);
  if (shape.dish === "sphere") {
    const cx = i.x + i.w / 2;
    const cy = i.y + i.h / 2;
    const r = Math.max(i.w, i.h) * 0.62;
    const g = c.createRadialGradient(cx + i.w * 0.08, cy + i.h * 0.08, r * 0.08, cx, cy, r);
    g.addColorStop(0, "rgba(255,255,255,0.18)");
    g.addColorStop(0.55, "rgba(255,255,255,0)");
    g.addColorStop(1, "rgba(16,24,40,0.14)");
    c.fillStyle = g;
    c.fillRect(i.x, i.y, i.w, i.h);
  } else {
    // OEM 원통형 접시: 좌우로 오목 → 왼쪽은 그늘, 오른쪽은 빛
    const g = c.createLinearGradient(i.x, 0, i.x + i.w, 0);
    g.addColorStop(0, "rgba(16,24,40,0.10)");
    g.addColorStop(0.3, "rgba(16,24,40,0.02)");
    g.addColorStop(0.68, "rgba(255,255,255,0.16)");
    g.addColorStop(1, "rgba(16,24,40,0.06)");
    c.fillStyle = g;
    c.fillRect(i.x, i.y, i.w, i.h);
  }
  // 윗면 위쪽 가장자리에 살짝 드리우는 그늘
  const top = c.createLinearGradient(0, i.y, 0, i.y + Math.min(24, i.h * 0.2));
  top.addColorStop(0, "rgba(16,24,40,0.08)");
  top.addColorStop(1, "rgba(16,24,40,0)");
  c.fillStyle = top;
  c.fillRect(i.x, i.y, i.w, i.h);
  c.restore();

  /* 5) 모서리 선: 윗면 테두리 하이라이트 + 키캡 바닥 테두리 */
  c.save();
  c.lineJoin = "round";
  c.strokeStyle = "rgba(255,255,255,0.38)";
  c.lineWidth = 1.4;
  c.stroke(shape.inner);
  c.strokeStyle = "rgba(16,24,40,0.10)";
  c.lineWidth = 0.8;
  c.stroke(shape.inner);
  c.strokeStyle = "rgba(16,24,40,0.16)";
  c.lineWidth = 1;
  c.stroke(shape.outer);
  c.restore();

  /* 6) 인쇄 안전선은 음영 위에 그대로 */
  if (shape.safe) {
    c.save();
    c.strokeStyle = "#d92d20";
    c.lineWidth = 2;
    c.setLineDash([8, 8]);
    c.stroke(shape.safe);
    c.restore();
  }
}

// 목업 모드에서는 MAO의 회색 바깥/안쪽 선은 음영이 대신하므로 숨기고 빨간 안전선만 남긴다.
function syncMaoGuideLinesForMockup() {
  const hideLines = isKeycapMockupOn() && !keycapMockupHiddenForPick;
  ["maoGuideOutline", "maoGuideInner"].forEach((id) => {
    const img = document.getElementById(id);
    if (img) img.style.display = hideLines ? "none" : "";
  });
}

function setKeycapMockupEnabled(on) {
  keycapMockupEnabled = !!on;
  saveKeycapMockupPref(keycapMockupEnabled);
  if (typeof redraw === "function") redraw();
  else drawKeycapMockup();
}

// PC 스포이드는 화면에 보이는 색을 그대로 집기 때문에, 스포이드를 켜는 동안에는 음영을 잠깐 걷는다.
function setKeycapMockupHiddenForPick(hidden) {
  if (keycapMockupHiddenForPick === !!hidden) return;
  keycapMockupHiddenForPick = !!hidden;
  if (typeof redraw === "function") redraw();
  else drawKeycapMockup();
}

// 토글 버튼은 캔버스 위 정보줄(인쇄 가이드 보기 옆)에 있다. 캔버스를 가리지 않도록 캔버스 안에 두지 않음.
function ensureKeycapMockupToggle() {
  const btn = document.getElementById("keycapMockupToggle");
  if (!btn || btn.dataset.bound === "1") return btn;

  btn.dataset.bound = "1";
  btn.addEventListener("click", () => setKeycapMockupEnabled(!isKeycapMockupOn()));
  return btn;
}

function syncKeycapMockupToggleUI() {
  const btn = ensureKeycapMockupToggle();
  if (!btn) return;
  const on = isKeycapMockupOn();
  btn.setAttribute("aria-pressed", on ? "true" : "false");
  btn.setAttribute(
    "aria-label",
    on ? "키캡 미리보기 켜짐 - 눌러서 가이드선만 보기" : "가이드선 보기 - 눌러서 키캡 미리보기"
  );
  btn.querySelectorAll(".keycapMockupToggle__opt").forEach((opt) => {
    opt.classList.toggle("is-active", (opt.dataset.mode === "mockup") === on);
  });
}

if (typeof ResizeObserver !== "undefined" && canvas) {
  const keycapMockupResizeObserver = new ResizeObserver(() => {
    if (isKeycapMockupOn()) drawKeycapMockup();
  });
  keycapMockupResizeObserver.observe(canvas);
  if (canvasWrapEl) keycapMockupResizeObserver.observe(canvasWrapEl);
}
