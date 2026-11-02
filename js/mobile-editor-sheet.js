/* =========================================================
 * 모바일 시안 제작 화면: [꾸미기] 버튼 + 아래에서 올라오는 도구 시트
 *
 * - 모바일(≤768px)에서는 캔버스를 크게 보도록 이미지/배경/텍스트 도구를
 *   평소에 숨기고, 아래 고정 바의 [꾸미기]를 누르면
 *   ① 꾸미기 메뉴(이미지 / 텍스트 / 배경)가 올라오고
 *   ② 하나를 고르면 그 도구가 시트로 올라온다 (캔버스는 위에 그대로 보임).
 * - PC는 기존 탭 + 도구 패널 그대로 (텍스트 도구의 한 줄 배치만 공통).
 * - 텍스트 도구에서는 폰트 버튼 9개 대신 "폰트  지금 폰트 ›" 한 줄을 보여주고,
 *   누르면 폰트 고르기 화면으로 바뀐다.
 * - 기존 도구 패널(.editorToolBox)과 버튼을 그대로 옮겨 쓰는 방식이라
 *   기능/검증/잠금 로직은 기존과 완전히 같다.
========================================================= */
(() => {
  const MOBILE_QUERY = window.matchMedia("(max-width: 768px)");
  const toolBox = document.querySelector(".editorToolBox");
  const actionBar = document.querySelector(".editorActionBar");
  if (!toolBox || !actionBar) return;

  const TOOLS = {
    image: { panel: "toolImage", title: "이미지" },
    text: { panel: "toolText", title: "텍스트" },
    bg: { panel: "toolBg", title: "배경" },
  };


  // 지금 시트 상태: null(닫힘) | "menu" | "image" | "text" | "bg" | "font"
  let state = null;

  /* ---------- 1) 아래 고정 바에 [꾸미기] 버튼 ---------- */
  const decorateBtn = document.createElement("button");
  decorateBtn.type = "button";
  decorateBtn.id = "mDecorateBtn";
  decorateBtn.className = "mDecorateBtn";
  decorateBtn.innerHTML =
    '<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l1.9 4.6L18.5 9.5 13.9 11.4 12 16l-1.9-4.6L5.5 9.5l4.6-1.9z"/><path d="M19 15l.8 1.9 1.9.8-1.9.8L19 20.4l-.8-1.9-1.9-.8 1.9-.8z"/></svg><span>꾸미기</span>';
  actionBar.insertBefore(decorateBtn, actionBar.firstChild);

  /* ---------- 2) 꾸미기 메뉴 시트 ---------- */
  const menu = document.createElement("div");
  menu.className = "mDecorateMenu";
  menu.id = "mDecorateMenu";
  menu.setAttribute("role", "dialog");
  menu.setAttribute("aria-label", "꾸미기");
  menu.innerHTML = `
    <div class="mSheetHead">
      <span class="mSheetHead__side"></span>
      <strong class="mSheetHead__title">꾸미기</strong>
      <button type="button" class="mSheetHead__btn" data-m-action="close" aria-label="닫기">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 9l6 6 6-6"/></svg>
      </button>
    </div>
    <div class="mDecorateMenu__grid">
      <button type="button" class="mDecorateTile" data-m-tool="image">
        <span class="mDecorateTile__icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="9" cy="10" r="1.8"/><path d="M21 16l-5-5-9 9"/></svg>
        </span>
        <b>이미지</b>
      </button>
      <button type="button" class="mDecorateTile" data-m-tool="text">
        <span class="mDecorateTile__icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 6V4h14v2"/><path d="M12 4v16"/><path d="M9 20h6"/></svg>
        </span>
        <b>텍스트</b>
      </button>
      <button type="button" class="mDecorateTile" data-m-tool="bg">
        <span class="mDecorateTile__icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3.5c3.5 4 6 7.2 6 10a6 6 0 0 1-12 0c0-2.8 2.5-6 6-10z"/></svg>
        </span>
        <b>배경</b>
      </button>
    </div>`;
  document.body.appendChild(menu);

  /* ---------- 3) 도구 시트 머리줄 (기존 도구 패널 맨 위에 추가) ---------- */
  const toolHead = document.createElement("div");
  toolHead.className = "mSheetHead mToolHead";
  toolHead.innerHTML = `
    <button type="button" class="mSheetHead__btn" data-m-action="back" aria-label="뒤로">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M15 6l-6 6 6 6"/></svg>
    </button>
    <strong class="mSheetHead__title" id="mToolTitle">꾸미기</strong>
    <button type="button" class="mSheetHead__btn" data-m-action="close" aria-label="닫기">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 9l6 6 6-6"/></svg>
    </button>`;
  toolBox.insertBefore(toolHead, toolBox.firstChild);
  const toolTitle = toolHead.querySelector("#mToolTitle");

  /* ---------- 4) 텍스트 도구: "폰트 ›" 한 줄 ---------- */
  const fontSection = document.querySelector("#toolText .textToolFontSection");
  const fontRow = document.createElement("button");
  fontRow.type = "button";
  fontRow.className = "mFontRow";
  fontRow.innerHTML =
    '<span class="mFontRow__label">폰트</span><span class="mFontRow__name" id="mFontRowName">프리텐다드</span>' +
    '<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M9 6l6 6-6 6"/></svg>';
  if (fontSection) fontSection.parentNode.insertBefore(fontRow, fontSection);
  const fontRowName = fontRow.querySelector("#mFontRowName");

  /* ---------- 4-1) 텍스트 도구 배치 (PC·모바일 공통)
   * 1줄: [폰트 프리텐다드 ›] [텍스트 추가] [삭제]
   * 2줄: 색상 | 굵게 · 기울임 | 정렬  (기존 꾸미기 줄에서 추가/삭제만 빼냄) */
  const textAddBtn = document.getElementById("textApplyBtn");
  const textDelBtn = document.getElementById("textClearBtn");
  const textStyleBar = document.querySelector("#toolText .textStyleBar");
  const textTopRow = document.createElement("div");
  textTopRow.className = "mTextTopRow";
  if (fontSection) fontSection.parentNode.insertBefore(textTopRow, fontSection);

  if (textAddBtn && textDelBtn) textTopRow.append(fontRow, textAddBtn, textDelBtn);

  // "현재 0/3개" 줄 대신 추가 버튼 위 배지로 개수 표시, 사용법은 버튼 설명으로
  const textCountEl = document.getElementById("textCountBadge");
  const syncTextCount = () => {
    const m = /(\d+)\s*\/\s*(\d+)/.exec(textCountEl?.textContent || "");
    if (textAddBtn && m) textAddBtn.dataset.count = `${m[1]}/${m[2]}`;
  };
  if (textCountEl) {
    syncTextCount();
    new MutationObserver(syncTextCount).observe(textCountEl, { childList: true, characterData: true, subtree: true });
  }
  if (textAddBtn) textAddBtn.title = "텍스트 추가 (추가한 뒤 캔버스의 글자를 누르면 바로 고칠 수 있어요)";


  const syncFontRow = () => {
    const active = document.querySelector("[data-text-font].is-active");
    const type = active?.dataset.textFont || (typeof textFontType !== "undefined" ? textFontType : "basic");
    fontRowName.textContent = getTextFontLabel(type);
    // 이름을 그 폰트 모양으로 (폰트 버튼에 지정된 글꼴을 그대로 사용)
    const family = active?.style.getPropertyValue("font-family");
    if (family) fontRowName.style.setProperty("font-family", family, "important");
    const weight = active?.style.getPropertyValue("font-weight");
    if (weight) fontRowName.style.setProperty("font-weight", weight, "important");
    fontRow.disabled = !!active?.disabled;
  };

  /* ---------- 상태 전환 ---------- */
  const isMobile = () => MOBILE_QUERY.matches;
  const isEditorStep = () => document.body.dataset.step === "editor";

  const scrollCanvasIntoView = () => {
    const frame = document.getElementById("canvasWrap");
    if (!frame) return;
    const top = frame.getBoundingClientRect().top + window.scrollY - 70;
    window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
  };

  const setState = (next) => {
    state = next;
    const body = document.body;
    body.classList.toggle("mSheetMenuOpen", next === "menu");
    body.classList.toggle("mSheetToolOpen", !!next && next !== "menu");
    body.dataset.mSheet = next || "";
    decorateBtn.setAttribute("aria-expanded", next ? "true" : "false");

    if (next === "image" || next === "text" || next === "bg") {
      toolTitle.textContent = TOOLS[next].title;
      // 기존 탭 버튼을 눌러서 패널 전환 (탭 전환 시 하던 처리도 그대로 실행됨)
      document.querySelector(`.toolTab[data-tool-target="${TOOLS[next].panel}"]`)?.click();
      toolBox.scrollTop = 0;
      if (next === "text") syncFontRow();
    } else if (next === "font") {
      toolTitle.textContent = "폰트 고르기";
      toolBox.scrollTop = 0;
    }
  };

  const open = (next) => {
    if (!isMobile() || !isEditorStep()) return;
    const wasClosed = !state;
    setState(next);
    if (wasClosed) scrollCanvasIntoView();
  };

  const close = () => setState(null);

  const back = () => {
    if (state === "font") setState("text");
    else setState("menu");
  };

  decorateBtn.addEventListener("click", () => (state ? close() : open("menu")));
  menu.addEventListener("click", (e) => {
    const tool = e.target.closest("[data-m-tool]")?.dataset.mTool;
    if (tool) return open(tool);
    if (e.target.closest('[data-m-action="close"]')) close();
  });
  toolHead.addEventListener("click", (e) => {
    const action = e.target.closest("[data-m-action]")?.dataset.mAction;
    if (action === "close") close();
    if (action === "back") back();
  });
  // 폰트 줄: 모바일은 "폰트 고르기" 화면으로, PC는 아래에 폰트 목록을 펼치고 접음
  fontRow.addEventListener("click", () => {
    if (isMobile()) return open("font");
    const opened = document.body.classList.toggle("pcFontOpen");
    fontRow.setAttribute("aria-expanded", opened ? "true" : "false");
  });

  // 폰트를 고르면 이름표 갱신 (고른 뒤에도 폰트 화면에 머물러서 여러 개 비교 가능)
  document.querySelectorAll("[data-text-font]").forEach((btn) => {
    btn.addEventListener("click", () => setTimeout(syncFontRow, 0));
  });

  // 다른 단계로 넘어가거나 PC 크기로 바뀌면 시트 닫기
  new MutationObserver(() => {
    if (!isEditorStep()) close();
  }).observe(document.body, { attributes: true, attributeFilter: ["data-step"] });
  MOBILE_QUERY.addEventListener?.("change", () => {
    if (!isMobile()) close();
  });

  // 모바일 스포이드: 캔버스를 눌러야 하므로 도구 시트를 잠깐 내렸다가, 끝나면 다시 올림
  const canvasWrap = document.getElementById("canvasWrap");
  if (canvasWrap) {
    new MutationObserver(() => {
      document.body.classList.toggle("mSheetPicking", canvasWrap.classList.contains("isEyedropperMode"));
    }).observe(canvasWrap, { attributes: true, attributeFilter: ["class"] });
  }

  // 모바일 상단 조작줄(이전/제목/다음)을 로고 헤더 바로 아래에 붙이기 위한 높이 값
  const siteHeader = document.querySelector(".siteHeader");
  const syncHeaderHeight = () => {
    const h = siteHeader ? siteHeader.getBoundingClientRect().height : 0;
    document.documentElement.style.setProperty("--siteHeaderH", `${Math.round(h)}px`);
  };
  syncHeaderHeight();
  window.addEventListener("resize", syncHeaderHeight);

  // 이전/다음 줄이 스크롤로 위에 붙었을 때만 배경 표시 (평소엔 페이지 배경과 같게 투명)
  const syncStuckHeaders = () => {
    const top = siteHeader ? siteHeader.getBoundingClientRect().height : 0;
    document.querySelectorAll(".stepPageHeader").forEach((el) => {
      if (!el.offsetParent) return;
      el.classList.toggle("isStuck", window.scrollY > 4 && el.getBoundingClientRect().top <= top + 1);
    });
  };
  window.addEventListener("scroll", syncStuckHeaders, { passive: true });
  new MutationObserver(syncStuckHeaders).observe(document.body, { attributes: true, attributeFilter: ["data-step"] });
  if (siteHeader && typeof ResizeObserver !== "undefined") new ResizeObserver(syncHeaderHeight).observe(siteHeader);

  window.openMobileDecorateSheet = open;
  window.closeMobileDecorateSheet = close;
})();
