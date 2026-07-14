/* moved from js/common/tooltip.js */
/* =========================================================
 * 도움말(?) 툴팁 + 프로파일/규격 상시 안내
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

function getProfileGuideData(profile) {
  switch (profile) {
    case "OEM":
      return {
        title: "OEM 프로파일 안내",
        desc: `· 기성 키보드에서 가장 많이 쓰는 계단형 구조입니다.<br>
· 줄마다 높이와 각도가 달라서 <b>R1~R4 위치에 맞는 규격 선택</b>이 중요합니다.<br>
· 기존 키보드 교체용, 실사용 커스텀에 가장 무난합니다.`,
      };
    case "XDA":
      return {
        title: "XDA 프로파일 안내",
        desc: `· 모든 열이 같은 높이인 낮은 플랫 구조입니다.<br>
· 위치 구분이 거의 없어 <b>로고 / 단체 굿즈 / 포인트 키캡</b>에 잘 맞습니다.<br>
· 넓고 평평한 면이라 인쇄 디자인 잡기 편합니다.`,
      };
    case "MAO":
      return {
        title: "MAO 프로파일 안내",
        desc: `· 전체적으로 낮고 둥근 플랫 구조입니다.<br>
· 위치 구분 없이 사용 가능하고, 곡면 느낌이 있어 감성 디자인에 잘 맞습니다.<br>
· MAO는 전용 가이드 형태가 따로 적용됩니다.`,
      };
    default:
      return {
        title: "프로파일 안내",
        desc: "프로파일을 선택하면 구조와 특징을 바로 보여드립니다.",
      };
  }
}

function getCapTypeGuideData(profile, capType) {
  const selected = safeTrim(capType || "") || "-";

  if (profile === "OEM") {
    return {
      title: `현재 선택 규격: ${selected}`,
      desc: `· <b>R1~R4</b> = 키보드 줄 위치, <b>U</b> = 키 가로 길이 단위입니다.<br>
· 1U = 일반 문자 키 / 1.25U = Ctrl · Alt / 1.5U = Tab<br>
· 1.75U = Caps Lock / 2.25U = Enter · 좌측 Shift / 2.75U = 우측 Shift / 6.25U = 스페이스바`,
    };
  }

  return {
    title: `현재 선택 규격: ${selected}`,
    desc: `· <b>${profile}</b>는 현재 단일 규격만 제공되어 별도 규격 선택이 필요 없습니다.`,
  };
}

function getProfileHelp(profile) {
  const data = getProfileGuideData(profile);
  return `<b>${data.title}</b><div class="hr"></div>${data.desc}`;
}

function getCapTypeHelp(profile, capType) {
  const data = getCapTypeGuideData(profile, capType);
  return `<b>${data.title}</b><div class="hr"></div>${data.desc}`;
}

function updateOptionGuideBox() {
  if (!optionGuideTitleEl || !optionGuideDescEl) return;

  const profile = safeTrim(profileEl?.value || "") || "OEM";
  const capType = safeTrim(capTypeEl?.value || "") || "-";
  const profileData = getProfileGuideData(profile);
  const capData = getCapTypeGuideData(profile, capType);

  optionGuideTitleEl.textContent = `${profileData.title} · ${capData.title}`;
  optionGuideDescEl.innerHTML = `${profileData.desc}<div class="guideSplit"></div>${capData.desc}`;
}

function fillTooltipByType(type, tooltipEl) {
  if (!tooltipEl) return;

  if (type === "profile") {
    tooltipEl.innerHTML = getProfileHelp(profileEl.value);
    return;
  }

  if (type === "capType") {
    tooltipEl.innerHTML = getCapTypeHelp(profileEl.value, capTypeEl.value);
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

function markTooltipAsRead(type, isUploadTooltip) {
  const isQuestionTooltip = type === "profile" || type === "capType";

  if (isQuestionTooltip) {
    // 미사용 확인 (2026-07-09) - didReadProfileTooltip 읽는 곳 없음, 필요시 복원
    // didReadProfileTooltip = true;

    if (typeof clearFormNotice === "function") {
      clearFormNotice();
    }

    if (typeof updateFormReadyState === "function") {
      updateFormReadyState();
    }
  }

  if (isUploadTooltip) {
    // 미사용 확인 (2026-07-09) - didReadUploadTooltip 읽는 곳 없음, 필요시 복원
    // didReadUploadTooltip = true;

    if (typeof clearCanvasNotice === "function") {
      clearCanvasNotice();
    }

    if (typeof updateFormReadyState === "function") {
      updateFormReadyState();
    }
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

    const isUploadTooltip =
      icon.classList.contains("uploadHelpIcon") ||
      icon.closest(".uploadHelpWrap");

    document.querySelectorAll(".helpTooltip").forEach((t) => {
      if (t !== tooltip) t.classList.remove("show");
    });

    document.querySelectorAll(".helpWrap").forEach((w) => {
      if (w !== wrap) {
        w.classList.remove("alignRight", "alignCenter", "alignTop");
      }
    });

    fillTooltipByType(type, tooltip);

    if (!tooltip) return;

    if (!willOpen) {
      tooltip.classList.remove("show");
      wrap?.classList.remove("alignRight", "alignCenter", "alignTop");
      return;
    }

    tooltip.classList.add("show");
    markTooltipAsRead(type, isUploadTooltip);

    requestAnimationFrame(() => {
      positionTooltip(icon, tooltip);
    });
  });
});

document.addEventListener("click", closeAllTooltips);
window.addEventListener("scroll", closeAllTooltips, { passive: true });
window.addEventListener("resize", closeAllTooltips);

function refreshOpenTooltips() {
  updateOptionGuideBox();

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
