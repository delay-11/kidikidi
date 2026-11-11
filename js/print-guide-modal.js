/* =========================================================
 * 인쇄 가이드 모달
 * - "시안 배치 유의사항" (HTML) 한 페이지 - 맨 위에 인쇄 유의사항(CMYK 색상, 1mm 오차),
 *   그 아래 3가지 배치 규칙을
 *   회사 로고 시안 + 키캡 미리보기(목업) 그림으로 바로 보여줌.
 *   그림만으로 충분히 이해돼서 긴 설명 문장과 기존 안내 이미지
 *   (print_guide.png / placement_guide.png) 페이지는 뺐음.
 *   guideSteps에 { src, alt }를 추가하면 이미지 페이지를 다시 붙일 수 있음
 *   (그때는 index.html에 #printGuideImage <img>도 다시 넣어야 함).
 * - [다시 보지 않기]는 마지막 페이지에서만 노출
 * - X 닫기 버튼 / 배경 클릭 닫기 없음: [확인] 또는 [다시 보지 않기]로만 닫음
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

  if (!modal || !actionsEl || !confirmBtn || !hideBtn || !prevBtn || !nextBtn) {
    console.warn("인쇄 가이드 모달 요소를 찾지 못했습니다.");
    return;
  }

  // 수정 이유:
  // 기존 1페이지 안내에서 이미 [다시 보지 않기]를 눌렀던 고객도
  // 새로 추가된 2페이지 배치 안내는 한 번 더 볼 수 있게 v2 키로 분리합니다.
  const PRINT_GUIDE_STORAGE_KEY = "hide_print_guide_v2";

  const guideSteps = [{ html: introEl }];

  let currentStep = 0;

  /* -------------------------------------------------------
   * 배치 예시 그림
   * - 지금 고른 프로파일/규격(예: 스페이스바, MAO, 넘버패드 +) 모양 그대로 그림.
   *   아직 고르지 않았으면 OEM R4-1U 기준.
   * - 회사 로고(image/favicon.png)를 연한 하늘색 배경에 올린 시안을 실제 캔버스
   *   크기로 그린 뒤, 키캡 주변만 잘라서
   *   왼쪽은 캔버스 화면(가이드선), 오른쪽은 키캡 미리보기 음영으로 보여준다.
  ------------------------------------------------------- */
  const EXAMPLE_BG = "#cfe6ff";
  const exampleLogo = new Image();
  exampleLogo.src = "./image/favicon.png";
  exampleLogo.addEventListener("load", () => {
    if (!modal.classList.contains("hidden")) renderPlacementExamples();
  });

  const getExampleTarget = () => {
    const profile = profileEl?.value || "OEM";
    let capType = capTypeEl?.value || "";
    if (!capType) capType = profile === "OEM" ? "R4-1U" : profile;
    return { profile, capType };
  };

  // kind: good(빨간선 안, 배경 없음) / fullbg(배경을 캔버스 끝까지) / bad(옆면까지 넘침)
  const drawExampleDesign = (c, W, H, shape, kind) => {
    const o = shape.outerBox;
    const i = shape.innerBox;
    const cx = W / 2;
    const cy = H / 2;

    // 1번은 그림 위치만 보이게 배경 없이(흰색), 2·3번은 배경을 캔버스 끝까지 꽉 채움
    c.fillStyle = kind === "good" ? "#ffffff" : EXAMPLE_BG;
    c.fillRect(0, 0, W, H);

    if (!exampleLogo.complete || !exampleLogo.naturalWidth) return;
    // 로고 png는 둘레에 여백이 있어 그림 자체는 지정 크기의 약 80%
    const logo = kind === "bad" ? Math.min(o.w, o.h) * 1.32 : Math.min(i.w, i.h) * 0.92;
    c.drawImage(exampleLogo, cx - logo / 2, cy - logo / 2, logo, logo);
  };

  const strokeSafeLine = (c, shape, profile) => {
    const safe = getKeycapSafePath(shape, profile);
    if (!safe) return;
    c.save();
    c.strokeStyle = "#d92d20";
    c.lineWidth = 2;
    c.setLineDash([7, 6]);
    c.stroke(safe);
    c.restore();
  };

  const renderPlacementExamples = () => {
    if (typeof getKeycapMockupShape !== "function" || typeof getCanvasSize !== "function") return;

    const { profile, capType } = getExampleTarget();
    const size = getCanvasSize(profile, capType);
    const shape = getKeycapMockupShape(profile, capType, size.w, size.h);
    if (!shape) return;

    const crop = getKeycapMockupCrop(shape, size.w, size.h, 0.17);
    const aspect = crop.w / crop.h;
    const dpr = Math.min(3, window.devicePixelRatio || 1);
    const longSidePx = Math.round(420 * dpr);

    // 아주 넓은 키(스페이스바 등)는 좌우 대신 위아래로 배치
    modal.dataset.exampleShape =
      aspect >= 2.8 ? "wide" : aspect >= 1.4 ? "long" : aspect <= 0.7 ? "tall" : "square";

    modal.querySelectorAll("canvas[data-placement-example]").forEach((el) => {
      const c = el.getContext("2d");
      if (!c) return;

      const scale = longSidePx / Math.max(crop.w, crop.h);
      el.width = Math.max(1, Math.round(crop.w * scale));
      el.height = Math.max(1, Math.round(crop.h * scale));
      el.style.aspectRatio = `${crop.w} / ${crop.h}`;

      c.setTransform(scale, 0, 0, scale, -crop.x * scale, -crop.y * scale);
      drawExampleDesign(c, size.w, size.h, shape, el.dataset.placementExample);

      if (el.dataset.view === "mockup") {
        // 키캡 밖(캔버스 부분)도 배경색 그대로
        paintKeycapMockup(c, size.w, size.h, shape, scale, { outsideAlpha: 0 });
        if (shape.isMao) strokeSafeLine(c, shape, profile);
      } else {
        c.save();
        c.strokeStyle = "rgba(16,24,40,0.35)";
        c.lineWidth = 1;
        c.stroke(shape.outer);
        c.stroke(shape.inner);
        c.restore();
        strokeSafeLine(c, shape, profile);
      }
    });
  };

  const renderStep = () => {
    const lastStepIndex = guideSteps.length - 1;
    const stepData = guideSteps[currentStep] || guideSteps[0];
    const isLastStep = currentStep === lastStepIndex;

    if (stepData.html) {
      if (imageEl) imageEl.hidden = true;
      stepData.html.hidden = false;
      stepData.html.scrollTop = 0;
      renderPlacementExamples();
    } else {
      if (introEl) introEl.hidden = true;
      if (imageEl) {
        imageEl.hidden = false;
        imageEl.src = stepData.src;
        imageEl.alt = stepData.alt;
      }
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

  // 이미지 업로드 버튼에서 열었을 때, 닫히면 이어서 파일 선택창을 띄우기 위한 콜백
  let pendingOnClose = null;

  const closeModal = () => {
    modal.classList.add("hidden");
    modal.setAttribute("aria-hidden", "true");

    // [확인]/[다시 보지 않기] 클릭 이벤트 안에서 바로 호출해야
    // 브라우저가 파일 선택창(input.click())을 막지 않음
    const callback = pendingOnClose;
    pendingOnClose = null;
    if (typeof callback === "function") callback();
  };

  const hideAndCloseModal = () => {
    try {
      localStorage.setItem(PRINT_GUIDE_STORAGE_KEY, "true");
    } catch (e) {
      console.warn("인쇄 가이드 다시 보지 않기 저장 실패:", e);
    }
    closeModal();
  };

  const SESSION_SEEN_KEY = "kidikidi_print_guide_seen_session";

  const isHiddenForever = () => {
    try {
      return localStorage.getItem(PRINT_GUIDE_STORAGE_KEY) === "true";
    } catch (e) {
      return false;
    }
  };

  const wasSeenThisVisit = () => {
    try {
      return sessionStorage.getItem(SESSION_SEEN_KEY) === "1";
    } catch (e) {
      return false;
    }
  };

  /**
   * 이미지 업로드 전에 배치 안내를 한 번 보여준다.
   * - [다시 보지 않기]를 눌렀거나 이번 방문에서 이미 봤으면 false (바로 업로드 진행)
   * - 띄웠으면 true, 닫힐 때 onClose 실행 (파일 선택창 열기)
   */
  window.showPrintGuideBeforeUpload = (onClose) => {
    if (isHiddenForever() || wasSeenThisVisit()) return false;
    window.openPrintGuideModal({ force: true, onClose });
    return true;
  };

  // options.force: 다시 보지 않기 상태여도 표시 (인쇄 가이드 보기 버튼)
  // options.onClose: 닫힐 때 실행할 함수
  window.openPrintGuideModal = (options = {}) => {
    const force = options.force === true;

    if (!force && isHiddenForever()) return;

    pendingOnClose = typeof options.onClose === "function" ? options.onClose : null;
    try {
      sessionStorage.setItem(SESSION_SEEN_KEY, "1");
    } catch (e) {
      // 저장 실패 시 다음 업로드 때 한 번 더 보일 뿐
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
