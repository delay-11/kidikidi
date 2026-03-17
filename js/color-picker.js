/* =========================================================
 * Pickr 인스턴스
========================================================= */
let bgPickr = null;

/* =========================================================
 * 배경색 UI 반영
========================================================= */
function setBgUI(hex) {
  const v = (hex || "#ffffff").toLowerCase();

  if (bgColorSwatch) {
    bgColorSwatch.style.background = v;
  }

  if (bgColorValue) {
    bgColorValue.textContent = v;
  }

  if (bgPickr) {
    try {
      bgPickr.setColor(v, true);
    } catch (e) {
      console.warn("Pickr 색상 반영 실패:", e);
    }
  }
}

/* =========================================================
 * 배경색 적용
========================================================= */
function applyBgColor(hex) {
  if (uiLocked) return;
  if (!validateUserInfo(false)) return;

  const v = (hex || "#ffffff").toLowerCase();
  setBgUI(v);

  const it = cartItems.find((x) => x.id === selectedItemId);

  if (it) {
    it.bgColor = v;
    it.design = it.design || {};
    it.design.bgSet = true;

    if (bgTextEl) {
      bgTextEl.textContent = getItemBgColor(it);
    }
  } else {
    draftBgColor = v;
    draftBgSet = true;

    if (bgTextEl) {
      bgTextEl.textContent = v;
    }
  }

  redraw();
  updateActionLocks();
}

/* =========================================================
 * 배경색 잠금 UI
 * OEM + 레이저 블랙/화이트 선택 시 배경색 강제
========================================================= */
function updateBgLockUI(profile, laser) {
  const wrap = bgPickBtn?.closest(".colorPick");
  const locked = profile === "OEM" && (laser === "black" || laser === "white");

  if (wrap) {
    wrap.classList.toggle("isLocked", locked);
  }

  if (bgEyeBtn) {
    bgEyeBtn.disabled = locked || uiLocked;
  }

  if (locked) {
    const forced = laser === "black" ? "#000000" : "#ffffff";
    setBgUI(forced);

    const it = cartItems.find((x) => x.id === selectedItemId);

    if (it) {
      it.bgColor = forced;
      it.design = it.design || {};
      it.design.bgSet = true;

      if (bgTextEl) {
        bgTextEl.textContent = forced;
      }
    } else {
      draftBgColor = forced;
      draftBgSet = true;

      if (bgTextEl) {
        bgTextEl.textContent = forced;
      }
    }

    redraw();
    updateActionLocks();
    return;
  }

  const it = cartItems.find((x) => x.id === selectedItemId);
  const color = it?.bgColor || draftBgColor || "#ffffff";
  setBgUI(color);
}

/* =========================================================
 * 스포이드 열기
========================================================= */
async function openEyeDropper() {
  if (uiLocked) return;

  if (!validateUserInfo(true)) {
    updateActionLocks();
    return;
  }

  if (!window.EyeDropper) {
    setCanvasNotice(
      "현재 브라우저에서는 스포이드 기능이 지원되지 않습니다.",
      "error",
    );
    return;
  }

  try {
    const eyeDropper = new EyeDropper();
    const result = await eyeDropper.open();

    if (!result?.sRGBHex) return;

    clearCanvasNotice();
    applyBgColor(result.sRGBHex);
    setCanvasNotice("스포이드로 배경색을 적용했습니다.", "ok");
  } catch (e) {
    if (e?.name !== "AbortError") {
      console.error("스포이드 사용 실패:", e);
      setCanvasNotice("스포이드 사용 중 문제가 발생했습니다.", "error");
    }
  }
}

/* =========================================================
 * Pickr 초기화
========================================================= */
function initPickr() {
  if (!bgPickMount || !window.Pickr) return;

  bgPickr = Pickr.create({
    el: bgPickMount,
    theme: "nano",
    default: "#ffffff",
    showAlways: false,
    closeOnScroll: true,
    defaultRepresentation: "HEX",
    components: {
      preview: true,
      opacity: false,
      hue: true,
      interaction: {
        input: true,
        save: false,
      },
    },
  });

  bgPickBtn?.addEventListener("click", () => {
    if (uiLocked) return;
    bgPickr?.show();
  });

  bgEyeBtn?.addEventListener("click", async () => {
    await openEyeDropper();
  });

  bgPickr.on("change", (color) => {
    if (uiLocked || !color) return;
    if (!validateUserInfo(false)) return;

    const hex = color.toHEXA().toString().toLowerCase();
    applyBgColor(hex);
  });

  setBgUI("#ffffff");
}
