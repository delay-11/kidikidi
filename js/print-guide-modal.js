/* =========================================================
 * 인쇄 가이드 2단계 모달
 * - 1페이지: 기본 인쇄 안전선 안내
 * - 2페이지: 실제 배치 예시 안내
 * - [다시 보지 않기]는 2페이지에서만 노출
========================================================= */
(() => {
  const modal = document.getElementById("printGuideModal");
  const imageEl = document.getElementById("printGuideImage");
  const actionsEl = document.getElementById("printGuideActions");
  const closeBtn = document.getElementById("closePrintGuideBtn");
  const confirmBtn = document.getElementById("confirmPrintGuideBtn");
  const hideBtn = document.getElementById("hidePrintGuideBtn");
  const prevBtn = document.getElementById("prevPrintGuideBtn");
  const nextBtn = document.getElementById("nextPrintGuideBtn");
  const openBtn = document.getElementById("openPrintGuideBtn");

  if (!modal || !imageEl || !actionsEl || !closeBtn || !confirmBtn || !hideBtn || !prevBtn || !nextBtn) {
    console.warn("인쇄 가이드 모달 요소를 찾지 못했습니다.");
    return;
  }

  // 수정 이유:
  // 기존 1페이지 안내에서 이미 [다시 보지 않기]를 눌렀던 고객도
  // 새로 추가된 2페이지 배치 안내는 한 번 더 볼 수 있게 v2 키로 분리합니다.
  const PRINT_GUIDE_STORAGE_KEY = "hide_print_guide_v2";

  const guideSteps = [
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

  const renderStep = () => {
    const lastStepIndex = guideSteps.length - 1;
    const stepData = guideSteps[currentStep] || guideSteps[0];
    const isLastStep = currentStep === lastStepIndex;

    imageEl.src = stepData.src;
    imageEl.alt = stepData.alt;
    actionsEl.dataset.step = String(currentStep);

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

  closeBtn.addEventListener("click", closeModal);
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

  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeModal();
  });
})();
