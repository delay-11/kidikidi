/* =========================================================
 * 인쇄 가이드 3단계 모달
 * - 1페이지: "만들기 전 확인해 주세요" (HTML) - 좋은 배치/주의 배치를
 *   키캡 미리보기(목업)로 직접 그려서 비교. 이미지 글씨가 모바일에서
 *   너무 작아 읽기 어려웠던 부분을 글자로 다시 정리.
 * - 2페이지: 기본 인쇄 안전선 안내 (이미지)
 * - 3페이지: 실제 배치 예시 안내 (이미지)
 * - [다시 보지 않기]는 2페이지에서만 노출
 * - X 닫기 버튼 / 배경 클릭 닫기 없음: 두 페이지를 모두 확인해야만
 *   (마지막 페이지의 [확인] 또는 [다시 보지 않기]로만) 닫을 수 있음
========================================================= */
(() => {
  const modal = document.getElementById("printGuideModal");
  const imageEl = document.getElementById("printGuideImage");
  const introEl = document.getElementById("printGuideIntro");
  const actionsEl = document.getElementById("printGuideActions");
  const confirmBtn = document.getElementById("confirmPrintGuideBtn");
  const hideBtn = document.getElementById("hidePrintGuideBtn");
  const prevBtn = document.getElementById("prevPrintGuideBtn");
  const nextBtn = document.getElementById("nextPrintGuideBtn");
  const openBtn = document.getElementById("openPrintGuideBtn");

  if (!modal || !imageEl || !actionsEl || !confirmBtn || !hideBtn || !prevBtn || !nextBtn) {
    console.warn("인쇄 가이드 모달 요소를 찾지 못했습니다.");
    return;
  }

  // 수정 이유:
  // 기존 1페이지 안내에서 이미 [다시 보지 않기]를 눌렀던 고객도
  // 새로 추가된 2페이지 배치 안내는 한 번 더 볼 수 있게 v2 키로 분리합니다.
  const PRINT_GUIDE_STORAGE_KEY = "hide_print_guide_v2";

  const guideSteps = [
    { html: introEl },
    {
      src: "./image/guides/print_guide.png",
      alt: "인쇄 안전선과 키캡 영역 안내",
    },
    {
      src: "./image/guides/placement_guide.png",
      alt: "시안 배치 예시와 실제 제작 예상 결과 안내",
    },
  ];

  let currentStep = 0;

  /* -------------------------------------------------------
   * 1페이지 배치 예시 그림
   * 체크무늬 배경 + 스마일 그림을 OEM R4-1U 캔버스(330×330)에 그린 뒤
   * 왼쪽은 캔버스 화면(가이드선), 오른쪽은 키캡 미리보기 음영을 얹어 보여준다.
   * 키캡 주변만 보이도록 가운데 VIEW×VIEW 영역만 잘라서 표시.
  ------------------------------------------------------- */
  const EXAMPLE_W = 330;
  const EXAMPLE_VIEW = 236;
  const EXAMPLE_PROFILE = "OEM";
  const EXAMPLE_CAP = "R4-1U";

  const drawExampleDesign = (c, faceR) => {
    const cell = 22;
    c.fillStyle = "#fff4d6";
    c.fillRect(0, 0, EXAMPLE_W, EXAMPLE_W);
    c.fillStyle = "#fdcc63";
    for (let y = 0; y < EXAMPLE_W; y += cell) {
      for (let x = 0; x < EXAMPLE_W; x += cell) {
        if (((x + y) / cell) % 2 === 0) c.fillRect(x, y, cell, cell);
      }
    }

    const cx = EXAMPLE_W / 2;
    const cy = EXAMPLE_W / 2;
    const line = Math.max(2, faceR * 0.07);
    c.save();
    c.fillStyle = "#ffd43b";
    c.strokeStyle = "#2b2100";
    c.lineWidth = line;
    c.beginPath();
    c.arc(cx, cy, faceR, 0, Math.PI * 2);
    c.fill();
    c.stroke();

    c.fillStyle = "#2b2100";
    [-1, 1].forEach((side) => {
      c.beginPath();
      c.ellipse(cx + side * faceR * 0.33, cy - faceR * 0.22, faceR * 0.09, faceR * 0.17, 0, 0, Math.PI * 2);
      c.fill();
    });

    c.lineCap = "round";
    c.beginPath();
    c.arc(cx, cy + faceR * 0.02, faceR * 0.55, Math.PI * 0.15, Math.PI * 0.85);
    c.stroke();
    c.restore();
  };

  const drawExampleGuideLines = (c) => {
    const guide = typeof GUIDE_SIZE_MAP !== "undefined" ? GUIDE_SIZE_MAP[EXAMPLE_CAP] : null;
    if (!guide) return;
    const lines = [
      [guide.outer, 18, "rgba(16,24,40,0.35)", 1, []],
      [guide.inner, 16, "rgba(16,24,40,0.35)", 1, []],
      [guide.safe, 14, "#d92d20", 2, [7, 6]],
    ];
    lines.forEach(([size, r, color, width, dash]) => {
      c.save();
      c.strokeStyle = color;
      c.lineWidth = width;
      c.setLineDash(dash);
      roundRectPath(c, (EXAMPLE_W - size.w) / 2, (EXAMPLE_W - size.h) / 2, size.w, size.h, r);
      c.stroke();
      c.restore();
    });
  };

  const renderPlacementExamples = () => {
    const canvases = modal.querySelectorAll("canvas[data-placement-example]");
    const dpr = Math.min(3, window.devicePixelRatio || 1);
    const canMockup = typeof paintKeycapMockup === "function" && typeof getKeycapMockupShape === "function";

    canvases.forEach((el) => {
      const c = el.getContext("2d");
      if (!c) return;

      const px = Math.round(EXAMPLE_VIEW * 1.5 * dpr);
      el.width = px;
      el.height = px;

      const scale = px / EXAMPLE_VIEW;
      const offset = (EXAMPLE_W - EXAMPLE_VIEW) / 2;
      c.setTransform(scale, 0, 0, scale, -offset * scale, -offset * scale);

      const isGood = el.dataset.placementExample === "good";
      drawExampleDesign(c, isGood ? 42 : 82);

      if (el.dataset.view === "mockup" && canMockup) {
        const shape = getKeycapMockupShape(EXAMPLE_PROFILE, EXAMPLE_CAP, EXAMPLE_W, EXAMPLE_W);
        if (shape) paintKeycapMockup(c, EXAMPLE_W, EXAMPLE_W, shape, scale);
      } else {
        drawExampleGuideLines(c);
      }
    });
  };

  const renderStep = () => {
    const lastStepIndex = guideSteps.length - 1;
    const stepData = guideSteps[currentStep] || guideSteps[0];
    const isLastStep = currentStep === lastStepIndex;

    if (stepData.html) {
      imageEl.hidden = true;
      stepData.html.hidden = false;
      stepData.html.scrollTop = 0;
      renderPlacementExamples();
    } else {
      if (introEl) introEl.hidden = true;
      imageEl.hidden = false;
      imageEl.src = stepData.src;
      imageEl.alt = stepData.alt;
    }
    actionsEl.dataset.step = String(currentStep);
    modal.dataset.step = String(currentStep);
    modal.dataset.page = stepData.html ? "html" : "image";

    // 첫 페이지에서는 [다시 보지 않기]를 숨겨서
    // 두 번째 안내까지 확인한 뒤에만 다시 보지 않기를 선택할 수 있게 합니다.
    hideBtn.hidden = !isLastStep;
    prevBtn.hidden = currentStep === 0;
    nextBtn.hidden = isLastStep;
    confirmBtn.hidden = !isLastStep;
  };

  const closeModal = () => {
    modal.classList.add("hidden");
    modal.setAttribute("aria-hidden", "true");
  };

  const hideAndCloseModal = () => {
    try {
      localStorage.setItem(PRINT_GUIDE_STORAGE_KEY, "true");
    } catch (e) {
      console.warn("인쇄 가이드 다시 보지 않기 저장 실패:", e);
    }
    closeModal();
  };

  window.openPrintGuideModal = (options = {}) => {
    const force = options.force === true;

    try {
      if (!force && localStorage.getItem(PRINT_GUIDE_STORAGE_KEY) === "true") return;
    } catch (e) {
      console.warn("인쇄 가이드 표시 설정 확인 실패:", e);
    }

    currentStep = 0;
    renderStep();
    modal.classList.remove("hidden");
    modal.setAttribute("aria-hidden", "false");
  };

  confirmBtn.addEventListener("click", closeModal);
  hideBtn.addEventListener("click", hideAndCloseModal);

  prevBtn.addEventListener("click", () => {
    currentStep = Math.max(0, currentStep - 1);
    renderStep();
  });

  nextBtn.addEventListener("click", () => {
    currentStep = Math.min(guideSteps.length - 1, currentStep + 1);
    renderStep();
  });

  openBtn?.addEventListener("click", () => {
    window.openPrintGuideModal?.({ force: true });
  });
})();
