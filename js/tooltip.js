/* =========================================================
 * 도움말(?) 툴팁
========================================================= */
const helpIcons = Array.from(document.querySelectorAll(".helpIcon"));

function closeAllTooltips() {
  document.querySelectorAll(".helpTooltip").forEach((tooltip) => {
    tooltip.classList.remove("show");
  });

  document.querySelectorAll(".helpWrap").forEach((wrap) => {
    wrap.classList.remove("alignRight", "alignCenter", "alignTop");
  });
}

function getProfileHelp(profile) {
  switch (profile) {
    case "OEM":
      return `
    <b>OEM 프로파일</b><br>
    높이 약 12mm의 플랫 구조입니다.<br>
    열마다 높이와 각도가 다릅니다. (R1~R4 구분)<br>
    <div class="hr"></div>
    ✔ 기존 기성 키보드와 동일한 구조<br>
    ✔ 교체 시 이질감 적음<br>
    ✔ 반드시 위치에 맞는 규격 선택 필요<br>
    <div class="hr"></div>
    <span class="muted">기존 키보드 교체용 추천</span>
  `;
    case "XDA":
      return `
    <b>XDA 프로파일</b><br>
    높이 약 9mm의 낮은 플랫 구조입니다.<br>
    모든 열이 동일한 높이를 가집니다.<br>
    <div class="hr"></div>
    ✔ 위치 구분 없이 제작 가능<br>
    ✔ 기업/행사 단체 주문에 적합<br>
    ✔ 넓은 표면으로 로고 인쇄 유리<br>
    ✔ 일관된 키감<br>
    <div class="hr"></div>
    <span class="muted">단체 굿즈 · 로고 키캡 제작 추천</span>
  `;
    case "MAO":
      return `
    <b>MAO 프로파일</b><br>
    높이 약 9.8mm의 플랫 구조입니다.<br>
    모든 열이 동일한 높이와 각도를 가집니다.<br>
    <div class="hr"></div>
    ✔ 위치에 관계없이 사용 가능<br>
    ✔ 부드러운 곡면으로 감성 디자인에 적합<br>
    ✔ 비교적 낮은 높이로 부담 적음<br>
    <div class="hr"></div>
    <span class="muted">포인트 키캡 제작에 적합</span>
  `;
    default:
      return "프로파일을 선택해주세요.";
  }
}

function getCapTypeHelp(profile, capType) {
  const selected = safeTrim(capType || "") || "-";

  const selectedLine = `
    <div style="margin-bottom:8px;">
      <span class="tag">현재 선택</span>
      <b style="margin-left:6px;">${selected}</b>
    </div>
  `;

  if (profile === "OEM") {
    return `
      ${selectedLine}
      <b>OEM 규격 안내</b><br/>
      · <b>R1~R4</b> = 키보드 줄 위치(높이 차이)<br/>
      · <b>U</b> = 키 가로 길이 단위 (1U 기본)<br/>
      <div class="hr"></div>
      <b class="muted">자주 선택하는 규격</b><br/>
      · 1U : 일반 문자 키<br/>
      · 1.25U : Ctrl / Alt / Win<br/>
      · 1.5U : Tab 등<br/>
      · 1.75U : Caps Lock<br/>
      · 2.25U : Enter / 좌측 Shift<br/>
      · 2.75U : 우측 Shift<br/>
      · 6.25U : 스페이스바<br/>
    `;
  }

  return `
    현재는 <b>${profile}</b> 1종만 제공됩니다.<br/>
    별도 규격 선택이 필요하지 않습니다.
  `;
}

function fillTooltipByType(type, tooltipEl) {
  if (!tooltipEl) return;

  if (type === "profile") {
    tooltipEl.innerHTML = getProfileHelp(profileEl.value);
    return;
  }

  if (type === "capType") {
    tooltipEl.innerHTML = getCapTypeHelp(profileEl.value, capTypeEl.value);
    return;
  }
}

function positionTooltip(icon, tooltip) {
  const wrap = icon.closest(".helpWrap");
  if (!wrap || !tooltip) return;

  wrap.classList.remove("alignRight", "alignCenter", "alignTop");

  const vw = window.innerWidth;
  const vh = window.innerHeight;

  if (vw <= 768) {
    wrap.classList.add("alignCenter");
  }

  let rect = tooltip.getBoundingClientRect();

  if (rect.right > vw - 12) {
    wrap.classList.remove("alignCenter");
    wrap.classList.add("alignRight");
    rect = tooltip.getBoundingClientRect();
  }

  if (rect.left < 12) {
    wrap.classList.remove("alignRight");
    wrap.classList.add("alignCenter");
    rect = tooltip.getBoundingClientRect();
  }

  if (rect.bottom > vh - 12) {
    wrap.classList.add("alignTop");
    rect = tooltip.getBoundingClientRect();
  }

  if (rect.top < 12) {
    wrap.classList.remove("alignTop");
  }
}

helpIcons.forEach((icon) => {
  icon.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();

    const type = icon.dataset.help;
    const tooltip = icon.nextElementSibling;
    const wrap = icon.closest(".helpWrap");
    const willOpen = !tooltip?.classList.contains("show");

    document.querySelectorAll(".helpTooltip").forEach((t) => {
      if (t !== tooltip) t.classList.remove("show");
    });

    document.querySelectorAll(".helpWrap").forEach((w) => {
      if (w !== wrap)
        w.classList.remove("alignRight", "alignCenter", "alignTop");
    });

    fillTooltipByType(type, tooltip);

    if (!tooltip) return;

    if (!willOpen) {
      tooltip.classList.remove("show");
      wrap?.classList.remove("alignRight", "alignCenter", "alignTop");
      return;
    }

    tooltip.classList.add("show");

    requestAnimationFrame(() => {
      positionTooltip(icon, tooltip);
    });
  });
});

document.addEventListener("click", closeAllTooltips);
window.addEventListener("scroll", closeAllTooltips, { passive: true });
window.addEventListener("resize", closeAllTooltips);

function refreshOpenTooltips() {
  document.querySelectorAll(".helpIcon").forEach((icon) => {
    const type = icon.dataset.help;
    const tooltip = icon.nextElementSibling;

    if (tooltip?.classList.contains("show")) {
      fillTooltipByType(type, tooltip);

      requestAnimationFrame(() => {
        positionTooltip(icon, tooltip);
      });
    }
  });
}
