/* =========================================================
 * 에디터 화면 온보딩 오버레이
 * - 기존에는 텍스트 위주 "인쇄 가이드" 팝업이 제작 화면 진입 직후
 *   자동으로 떴는데, 사람들이 잘 안 읽고 넘길 가능성이 높다고 판단해
 *   실제 화면 위에 빨간 테두리로 UI 요소를 직접 가리키는 방식으로 대체.
 * - 데스크탑: 프로파일/규격, 인쇄가이드 버튼, 캔버스 3곳을 동시에 표시.
 * - 모바일(≤768px): 화면이 좁아 3개를 동시에 띄우면 말풍선끼리 겹치므로
 *   1/3 → 2/3 → 3/3 순서로 하나씩만 보여준다.
 * - 인쇄 가이드 모달(js/print-guide-modal.js) 자체와 그 버튼의 수동 클릭
 *   동작은 그대로 유지 - 여기서는 진입 시 자동 트리거만 대체한다.
========================================================= */
(() => {
  const TOUR_STORAGE_KEY = "kidikidi_editor_tour_hidden_v1";
  const TOUR_MOBILE_QUERY = "(max-width: 768px)";
  const TARGET_PAD = 8;

  const EDITOR_TOUR_STEPS = [
    { selector: "#optionQuickBtn", label: "프로파일과 규격을 변경할 수 있어요" },
    { selector: "#openPrintGuideBtn", label: "인쇄 전 배치 가이드를 볼 수 있어요" },
    { selector: "#canvasWrap", label: "캔버스 전체에 색을 채워야 측면이 다 덮여요" },
  ];

  let svgEl = null;
  let panelEl = null;
  let entries = []; // { ring, label, step }
  let resizeObserver = null;
  let currentIndex = 0;
  let isMobile = false;
  let repositionRaf = null;

  function shouldShowTour() {
    try {
      return localStorage.getItem(TOUR_STORAGE_KEY) !== "1";
    } catch (e) {
      return true;
    }
  }

  function persistHidden() {
    try {
      localStorage.setItem(TOUR_STORAGE_KEY, "1");
    } catch (e) {
      console.warn("온보딩 다시 보지 않기 저장 실패:", e);
    }
  }

  function targetRect(step) {
    const el = document.querySelector(step.selector);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return {
      left: r.left - TARGET_PAD,
      top: r.top - TARGET_PAD,
      width: r.width + TARGET_PAD * 2,
      height: r.height + TARGET_PAD * 2,
    };
  }

  function placeLabel(labelEl, rect) {
    labelEl.style.left = "0px";
    labelEl.style.top = "0px";
    const lw = labelEl.getBoundingClientRect().width;
    const lh = labelEl.getBoundingClientRect().height;
    const preferBelow = rect.top < window.innerHeight * 0.4;

    labelEl.classList.remove("arrow-top", "arrow-bottom");
    labelEl.classList.add(preferBelow ? "arrow-top" : "arrow-bottom");

    let lx = rect.left + rect.width / 2 - lw / 2;
    lx = Math.max(10, Math.min(lx, window.innerWidth - lw - 10));
    let ly = preferBelow ? rect.top + rect.height + 14 : rect.top - lh - 14;
    ly = Math.max(10, Math.min(ly, window.innerHeight - lh - 90));

    labelEl.style.left = `${lx}px`;
    labelEl.style.top = `${ly}px`;
  }

  function renderStepHighlight(step) {
    const rect = targetRect(step);
    if (!rect) return null;

    const ring = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    ring.setAttribute("x", rect.left);
    ring.setAttribute("y", rect.top);
    ring.setAttribute("width", rect.width);
    ring.setAttribute("height", rect.height);
    ring.setAttribute("rx", 12);
    ring.setAttribute("class", "editorTourRing");
    svgEl.appendChild(ring);

    const label = document.createElement("div");
    label.className = "editorTourLabel";
    label.textContent = step.label;
    document.body.appendChild(label);
    placeLabel(label, rect);

    return { ring, label, step };
  }

  function clearEntries() {
    entries.forEach(({ ring, label }) => {
      ring.remove();
      label.remove();
    });
    entries = [];
  }

  function repositionAll() {
    entries.forEach(({ ring, label, step }) => {
      const rect = targetRect(step);
      if (!rect) return;
      ring.setAttribute("x", rect.left);
      ring.setAttribute("y", rect.top);
      ring.setAttribute("width", rect.width);
      ring.setAttribute("height", rect.height);
      placeLabel(label, rect);
    });
  }

  function scheduleReposition() {
    if (repositionRaf) cancelAnimationFrame(repositionRaf);
    repositionRaf = requestAnimationFrame(repositionAll);
  }

  function buildDesktopPanel() {
    panelEl = document.createElement("div");
    panelEl.className = "editorTourPanel";
    panelEl.innerHTML = `
      <span class="editorTourPanelText">제작 전 이것만 확인해 주세요</span>
      <label class="editorTourNeverAgain"><input type="checkbox" class="editorTourNeverInput" />다시 보지 않기</label>
      <button type="button" class="editorTourBtn editorTourBtnPrimary editorTourDoneBtn">확인했어요</button>
    `;
    document.body.appendChild(panelEl);

    panelEl.querySelector(".editorTourDoneBtn").addEventListener("click", () => {
      if (panelEl.querySelector(".editorTourNeverInput")?.checked) persistHidden();
      closeEditorOnboardingTour();
    });
  }

  function renderMobileStep(index) {
    clearEntries();

    const step = EDITOR_TOUR_STEPS[index];
    const entry = renderStepHighlight(step);
    if (entry) entries.push(entry);

    const isLast = index === EDITOR_TOUR_STEPS.length - 1;
    panelEl.innerHTML = `
      <span class="editorTourProgress">${index + 1} / ${EDITOR_TOUR_STEPS.length}</span>
      ${index > 0 ? '<button type="button" class="editorTourBtn editorTourBtnGhost editorTourPrevBtn">이전</button>' : ""}
      <button type="button" class="editorTourBtn editorTourBtnPrimary editorTourNextBtn">${isLast ? "확인했어요" : "다음"}</button>
    `;

    panelEl.querySelector(".editorTourPrevBtn")?.addEventListener("click", () => {
      currentIndex = Math.max(0, currentIndex - 1);
      renderMobileStep(currentIndex);
    });

    panelEl.querySelector(".editorTourNextBtn").addEventListener("click", () => {
      if (currentIndex >= EDITOR_TOUR_STEPS.length - 1) {
        persistHidden();
        closeEditorOnboardingTour();
        return;
      }
      currentIndex += 1;
      renderMobileStep(currentIndex);
    });
  }

  function buildMobilePanel() {
    panelEl = document.createElement("div");
    panelEl.className = "editorTourPanel";
    document.body.appendChild(panelEl);
    currentIndex = 0;
    renderMobileStep(0);
  }

  function teardownTour() {
    if (resizeObserver) {
      resizeObserver.disconnect();
      resizeObserver = null;
    }
    window.removeEventListener("resize", scheduleReposition);
    if (repositionRaf) {
      cancelAnimationFrame(repositionRaf);
      repositionRaf = null;
    }
    clearEntries();
    svgEl?.remove();
    panelEl?.remove();
    svgEl = null;
    panelEl = null;
  }

  function closeEditorOnboardingTour() {
    teardownTour();
  }

  function openEditorOnboardingTour() {
    if (!shouldShowTour()) return;
    teardownTour();

    isMobile = window.matchMedia(TOUR_MOBILE_QUERY).matches;

    svgEl = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svgEl.setAttribute("class", "editorTourSvg");
    document.body.appendChild(svgEl);

    if (isMobile) {
      buildMobilePanel();
    } else {
      EDITOR_TOUR_STEPS.forEach((step) => {
        const entry = renderStepHighlight(step);
        if (entry) entries.push(entry);
      });
      buildDesktopPanel();
    }

    // 수정 이유: 브레이크포인트마다 레이아웃이 실제로 재배치되므로
    // (330px 등 캔버스 크기도 마찬가지) 열려있는 동안은 리사이즈/회전 시,
    // 그리고 대상 요소 자체의 크기 변화 시 좌표를 다시 계산해야 함
    // (모바일에서 실제 캔버스와 어긋났던 이전 가이드선 버그와 동일한 함정).
    window.addEventListener("resize", scheduleReposition);
    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(scheduleReposition);
      const editorWrapEl = document.querySelector(".editorWrap");
      if (editorWrapEl) resizeObserver.observe(editorWrapEl);
      EDITOR_TOUR_STEPS.forEach((step) => {
        const el = document.querySelector(step.selector);
        if (el) resizeObserver.observe(el);
      });
    }
  }

  window.openEditorOnboardingTour = openEditorOnboardingTour;
})();
