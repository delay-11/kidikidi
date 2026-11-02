/* =========================================================
 * 주문정보: 프로파일/규격 고르기 도우미 (팝업 대신 폼 안에 바로 표시)
 *
 * - OEM: 키보드 그림에서 "꽂을 자리"를 누르면 그 자리에 맞는 규격이
 *   규격 선택칸에 바로 들어간다. 같은 규격 키(예: R3-1U)는 함께 강조.
 *   반대로 선택칸에서 고르면 그림에도 표시된다.
 *   같은 1U라도 줄(R1~R4)마다 높이가 달라서, 열을 잘못 고르는 실수를 줄이기 위함.
 * - XDA / MAO: 열 구분이 없으므로 도우미를 표시하지 않음.
 * - 그림은 마우스/손가락용 빠른 선택이고, 키보드·스크린리더 사용자는
 *   기존 규격 선택칸으로 똑같이 고를 수 있으므로 SVG는 aria-hidden 처리.
 * - 키 → 규격 매핑은 constants.js의 CAP_OPTIONS.OEM 기준.
 *   돌기 키: 본체 F, J + 넘버패드 5 → R2-1U_HOMING
========================================================= */
(() => {
  const root = document.getElementById("profileHelper");
  if (!root || !profileEl || !capTypeEl) return;

  const SVG_NS = "http://www.w3.org/2000/svg";
  const KEY_H = 22;
  const GAP_Y = 3;
  const LABEL_W = 24;
  const VIEW_W = 360;
  const NUMPAD_GAP_U = 0.45;
  const TOTAL_U = 15 + NUMPAD_GAP_U + 4;
  const U = (VIEW_W - LABEL_W - 2) / TOTAL_U;
  const ROW_LABELS = ["R4", "R3", "R2", "R1", "R1"];

  // [너비(U), 규격, 표시 글자]
  const ones = (cap, labels) => labels.map((label) => [1, cap, label]);
  const MAIN_ROWS = [
    [...ones("R4-1U", ["`", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-", "="]), [2, "R4-2U", "←"]],
    [[1.5, "R3-1.5U", "Tab"], ...ones("R3-1U", ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P", "[", "]"]), [1.5, "R3-1.5U", "₩"]],
    [
      [1.75, "R2-1.75U", "Caps"],
      ...["A", "S", "D", "F", "G", "H", "J", "K", "L", ";", "'"].map((k) => [1, k === "F" || k === "J" ? "R2-1U_HOMING" : "R2-1U", k]),
      [2.25, "R2-2.25U", "Enter"],
    ],
    [[2.25, "R1-2.25U", "Shift"], ...ones("R1-1U", ["Z", "X", "C", "V", "B", "N", "M", ",", ".", "/"]), [2.75, "R1-2.75U", "Shift"]],
    [
      ...ones("R1-1.25U", ["Ctrl", "Win", "Alt"]).map(([, c, l]) => [1.25, c, l]),
      [6.25, "R1-6.25U", "Space"],
      ...ones("R1-1.25U", ["Alt", "Fn", "Menu", "Ctrl"]).map(([, c, l]) => [1.25, c, l]),
    ],
  ];

  // 넘버패드: [열(U), 줄, 너비(U), 높이(줄 수), 규격, 글자]
  const NUMPAD = [
    [0, 0, 1, 1, "R4-1U", "Num"], [1, 0, 1, 1, "R4-1U", "/"], [2, 0, 1, 1, "R4-1U", "*"], [3, 0, 1, 1, "R4-1U", "-"],
    [0, 1, 1, 1, "R3-1U", "7"], [1, 1, 1, 1, "R3-1U", "8"], [2, 1, 1, 1, "R3-1U", "9"], [3, 1, 1, 2, "NUM_PLUS", "+"],
    [0, 2, 1, 1, "R2-1U", "4"], [1, 2, 1, 1, "R2-1U_HOMING", "5"], [2, 2, 1, 1, "R2-1U", "6"],
    [0, 3, 1, 1, "R1-1U", "1"], [1, 3, 1, 1, "R1-1U", "2"], [2, 3, 1, 1, "R1-1U", "3"], [3, 3, 1, 2, "NUM_ENTER", "Ent"],
    [0, 4, 2, 1, "NUM_0", "0"], [2, 4, 1, 1, "R1-1U", "."],
  ];

  const svgEl = (name, attrs = {}, text) => {
    const node = document.createElementNS(SVG_NS, name);
    Object.entries(attrs).forEach(([k, v]) => node.setAttribute(k, String(v)));
    if (text != null) node.textContent = text;
    return node;
  };

  const getCapLabel = (cap) => (CAP_OPTIONS.OEM || []).find((o) => o.value === cap)?.label || cap;
  const isSoldOut = (cap) => (SOLD_OUT_OPTIONS.OEM || []).includes(cap);

  let keyboardSvg = null;
  let statusEl = null;

  const chooseCap = (cap) => {
    if (!cap || isSoldOut(cap) || capTypeEl.disabled) return;
    if (capTypeEl.value === cap) return;
    capTypeEl.value = cap;
    // 기존 규격 변경 처리(캔버스 크기, 작업 저장 등)를 그대로 타도록 change 이벤트로 알림
    capTypeEl.dispatchEvent(new Event("change", { bubbles: true }));
  };

  const addKey = (svg, x, y, w, h, cap, label) => {
    const g = svgEl("g", { class: "phKey", "data-cap": cap });
    if (isSoldOut(cap)) g.classList.add("is-soldout");
    g.appendChild(svgEl("rect", { x: x + 0.6, y, width: w - 1.2, height: h, rx: 3.5 }));
    if (label) {
      const fontSize = label.length > 3 ? 6.2 : label.length > 1 ? 6.8 : 8;
      g.appendChild(
        svgEl("text", { x: x + w / 2, y: y + h / 2 + fontSize * 0.36, "text-anchor": "middle", "font-size": fontSize }, label)
      );
    }
    const title = svgEl("title", {}, isSoldOut(cap) ? `${getCapLabel(cap)} (품절)` : getCapLabel(cap));
    g.appendChild(title);
    g.addEventListener("click", () => chooseCap(cap));
    svg.appendChild(g);
  };

  // 맨 윗줄: Esc, F1~F12 (숫자줄과 같은 R4-1U). [시작 위치(U), 글자] - 실제 키보드처럼 Esc/F4/F8 뒤에 틈
  const FN_ROW = [
    [0, "Esc"],
    [2, "F1"], [3, "F2"], [4, "F3"], [5, "F4"],
    [6.5, "F5"], [7.5, "F6"], [8.5, "F7"], [9.5, "F8"],
    [11, "F9"], [12, "F10"], [13, "F11"], [14, "F12"],
  ];
  const FN_ROW_GAP = 8; // 기능키 줄과 숫자줄 사이 간격

  const buildKeyboard = () => {
    const top = 1 + KEY_H + FN_ROW_GAP; // 숫자줄이 시작하는 높이
    const rowsH = MAIN_ROWS.length * KEY_H + (MAIN_ROWS.length - 1) * GAP_Y;
    const svg = svgEl("svg", {
      class: "phKeyboard",
      viewBox: `0 0 ${VIEW_W} ${top + rowsH + 1}`,
      "aria-hidden": "true",
      focusable: "false",
    });

    svg.appendChild(
      svgEl("text", { class: "phRowLabel", x: LABEL_W / 2 - 2, y: 1 + KEY_H / 2 + 3, "text-anchor": "middle", "font-size": 8 }, "R4")
    );
    FN_ROW.forEach(([at, label]) => addKey(svg, LABEL_W + at * U, 1, U, KEY_H, "R4-1U", label));

    MAIN_ROWS.forEach((row, r) => {
      const y = top + r * (KEY_H + GAP_Y);
      svg.appendChild(
        svgEl("text", { class: "phRowLabel", x: LABEL_W / 2 - 2, y: y + KEY_H / 2 + 3, "text-anchor": "middle", "font-size": 8 }, ROW_LABELS[r])
      );
      let x = LABEL_W;
      row.forEach(([w, cap, label]) => {
        addKey(svg, x, y, w * U, KEY_H, cap, label);
        x += w * U;
      });
    });

    const padX = LABEL_W + (15 + NUMPAD_GAP_U) * U;
    NUMPAD.forEach(([col, row, w, h, cap, label]) => {
      const y = top + row * (KEY_H + GAP_Y);
      const height = h * KEY_H + (h - 1) * GAP_Y;
      addKey(svg, padX + col * U, y, w * U, height, cap, label);
    });

    return svg;
  };

  const renderOem = () => {
    root.innerHTML = "";

    const head = document.createElement("div");
    head.className = "phHead";
    head.innerHTML = "<strong>꽂을 자리를 눌러 보세요</strong><span>그 자리에 맞는 규격이 자동으로 선택돼요</span>";
    root.appendChild(head);

    keyboardSvg = buildKeyboard();
    root.appendChild(keyboardSvg);

    statusEl = document.createElement("p");
    statusEl.className = "phStatus";
    root.appendChild(statusEl);

    const notes = document.createElement("ul");
    notes.className = "phNotes";
    notes.innerHTML =
      "<li>같은 1U라도 줄(R1~R4)마다 높이와 기울기가 달라요. 다른 줄을 고르면 끼웠을 때 높낮이가 어긋나요.</li>";
    root.appendChild(notes);
  };

  const syncSelection = () => {
    if (!keyboardSvg) return;
    const cap = capTypeEl.value;
    keyboardSvg.querySelectorAll(".phKey").forEach((g) => {
      g.classList.toggle("is-selected", !!cap && g.dataset.cap === cap);
    });
    if (statusEl) {
      statusEl.innerHTML = cap
        ? `<b>${getCapLabel(cap)}</b> 규격을 골랐어요`
        : "아직 규격을 고르지 않았어요";
      statusEl.classList.toggle("is-done", !!cap);
    }
  };

  let renderedProfile = null;

  const syncProfileHelper = () => {
    const profile = profileEl.value;
    if (!profile) {
      root.hidden = true;
      root.innerHTML = "";
      renderedProfile = null;
      keyboardSvg = null;
      statusEl = null;
      return;
    }

    // XDA / MAO는 줄 구분이 없어서 도우미를 아예 보여주지 않음
    if (profile !== "OEM") {
      root.hidden = true;
      root.innerHTML = "";
      renderedProfile = null;
      keyboardSvg = null;
      statusEl = null;
      return;
    }

    root.hidden = false;
    if (renderedProfile !== profile) {
      renderOem();
      renderedProfile = profile;
    }
    root.classList.toggle("is-disabled", !!capTypeEl.disabled);
    syncSelection();
  };

  window.syncProfileHelper = syncProfileHelper;

  profileEl.addEventListener("change", syncProfileHelper);
  capTypeEl.addEventListener("change", syncProfileHelper);
  // 작업 불러오기 등 코드로 값을 넣는 경우를 위해 시작 직후에도 한 번 맞춤
  window.addEventListener("load", syncProfileHelper);
  syncProfileHelper();
})();
