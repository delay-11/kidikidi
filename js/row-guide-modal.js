/* =========================================================
 * OEM 키보드 열(R1~R4) 안내 팝업
 * - OEM 키캡은 같은 1U라도 열마다 높이/기울기가 달라서, 다른 열을
 *   고르면 키보드에 끼웠을 때 높낮이가 어긋남. 규격을 고르는 순간에
 *   한 번 보여주도록 주문정보 단계에서 처음 OEM을 고를 때 자동으로 띄우고,
 *   "OEM 키보드 열(R1~R4) 확인하기" 링크로 언제든 다시 볼 수 있게 함.
 * - 키보드 그림/옆모습은 SVG로 직접 그려서 모바일에서도 선명하게 보임.
 * - 열 구분은 이 사이트 규격 옵션 기준:
 *   R4 = 숫자줄(Backspace) / R3 = Q줄(Tab) / R2 = A줄(Caps, Enter) /
 *   R1 = Z줄(Shift) + 맨 아랫줄(Ctrl, 스페이스바)
========================================================= */
(() => {
  const modal = document.getElementById("rowGuideModal");
  const confirmBtn = document.getElementById("confirmRowGuideBtn");
  const openBtn = document.getElementById("openRowGuideBtn");
  const keyboardSvg = document.getElementById("rowGuideKeyboard");
  const profilesSvg = document.getElementById("rowGuideProfiles");

  if (!modal || !confirmBtn) return;

  const SEEN_STORAGE_KEY = "kidikidi_row_guide_seen_v1";
  const SVG_NS = "http://www.w3.org/2000/svg";

  const ROW_COLORS = {
    R4: { stroke: "#f79009", fill: "#fedf89" },
    R3: { stroke: "#12b76a", fill: "#a6f4c5" },
    R2: { stroke: "#2e90fa", fill: "#b2ddff" },
    R1: { stroke: "#ee46bc", fill: "#fcceee" },
  };

  // 각 줄 = [열, [키 너비(U) 목록], 강조할 키 이름(index → 글자)]
  const KEYBOARD_ROWS = [
    ["R4", [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2], { 13: "←" }],
    ["R3", [1.5, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1.5], { 0: "Tab", 1: "Q" }],
    ["R2", [1.75, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2.25], { 0: "Caps", 1: "A", 12: "Enter" }],
    ["R1", [2.25, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2.75], { 0: "Shift", 1: "Z", 11: "Shift" }],
    ["R1", [1.25, 1.25, 1.25, 6.25, 1.25, 1.25, 1.25, 1.25], { 3: "Space" }],
  ];

  const el = (name, attrs = {}, text) => {
    const node = document.createElementNS(SVG_NS, name);
    Object.entries(attrs).forEach(([k, v]) => node.setAttribute(k, String(v)));
    if (text != null) node.textContent = text;
    return node;
  };

  const drawRowBadge = (svg, x, y, row, r = 9) => {
    const color = ROW_COLORS[row].stroke;
    svg.appendChild(el("circle", { cx: x, cy: y, r, fill: color }));
    svg.appendChild(
      el("text", {
        x, y: y + 3.2, "text-anchor": "middle", "font-size": 8.5, "font-weight": 800, fill: "#fff",
      }, row)
    );
  };

  const drawKeyboard = () => {
    if (!keyboardSvg || keyboardSvg.childElementCount) return;

    const left = 34;
    const unit = (330 - left - 4) / 15;
    const keyH = 21;
    const gapY = 4;
    const top = 6;

    KEYBOARD_ROWS.forEach(([row, widths, labels], rowIndex) => {
      const y = top + rowIndex * (keyH + gapY);
      const color = ROW_COLORS[row];
      drawRowBadge(keyboardSvg, 14, y + keyH / 2, row);

      let x = left;
      widths.forEach((w, i) => {
        const kw = w * unit - 2;
        keyboardSvg.appendChild(
          el("rect", { x, y, width: kw, height: keyH, rx: 3, fill: color.fill, stroke: color.stroke, "stroke-width": 0.8 })
        );
        if (labels[i]) {
          keyboardSvg.appendChild(
            el("text", {
              x: x + kw / 2, y: y + keyH / 2 + 3, "text-anchor": "middle",
              "font-size": 7.5, "font-weight": 700, fill: "#344054",
            }, labels[i])
          );
        }
        x += w * unit;
      });
    });
  };

  // 옆에서 본 키캡: [앞(손 쪽) 높이, 뒤 높이]. 위로 갈수록(R4) 손 쪽으로 기울고, R1은 반대로 기움.
  const PROFILES = [
    ["R4", 40, 52],
    ["R3", 36, 43],
    ["R2", 34, 37],
    ["R1", 39, 35],
  ];

  const drawProfiles = () => {
    if (!profilesSvg || profilesSvg.childElementCount) return;

    const baseY = 62;
    const capW = 58;
    const topInset = 9;
    const gap = (330 - 20 - capW * 4) / 3;

    PROFILES.forEach(([row, front, back], i) => {
      const x = 10 + i * (capW + gap);
      const fx = x + topInset;
      const bx = x + capW - topInset;
      const fy = baseY - front;
      const by = baseY - back;
      const midX = (fx + bx) / 2;
      const midY = (fy + by) / 2 + 2.5; // 윗면 접시처럼 살짝 오목하게

      profilesSvg.appendChild(
        el("path", {
          d: `M${x},${baseY} L${fx},${fy} Q${midX},${midY} ${bx},${by} L${x + capW},${baseY} Z`,
          fill: "#344054",
          stroke: "#1d2939",
          "stroke-width": 1,
          "stroke-linejoin": "round",
        })
      );
      profilesSvg.appendChild(
        el("path", {
          d: `M${fx},${fy} Q${midX},${midY} ${bx},${by}`,
          fill: "none",
          stroke: "#98a2b3",
          "stroke-width": 1.4,
          "stroke-linecap": "round",
        })
      );
      drawRowBadge(profilesSvg, x + capW / 2, baseY + 16, row, 9);
    });

  };

  const openModal = () => {
    drawKeyboard();
    drawProfiles();
    modal.classList.remove("hidden");
    modal.setAttribute("aria-hidden", "false");
    try {
      localStorage.setItem(SEEN_STORAGE_KEY, "1");
    } catch (e) {
      // 저장 실패 시 다음에 OEM을 고를 때 한 번 더 보일 뿐
    }
    confirmBtn.focus({ preventScroll: true });
  };

  const closeModal = () => {
    modal.classList.add("hidden");
    modal.setAttribute("aria-hidden", "true");
  };

  const hasSeen = () => {
    try {
      return localStorage.getItem(SEEN_STORAGE_KEY) === "1";
    } catch (e) {
      return false;
    }
  };

  window.openRowGuideModal = openModal;

  confirmBtn.addEventListener("click", closeModal);
  openBtn?.addEventListener("click", openModal);

  // 주문정보 단계에서 처음 OEM을 고른 순간에만 1회 자동 표시
  // (작업 불러오기는 change 이벤트 없이 값만 넣으므로 여기에 걸리지 않음)
  const profileSelect = document.getElementById("profile");
  profileSelect?.addEventListener("change", () => {
    if (document.body.dataset.step && document.body.dataset.step !== "info") return;
    if (profileSelect.value !== "OEM" || hasSeen()) return;
    openModal();
  });
})();
