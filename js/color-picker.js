/* =========================================================
 * Pickr 배경색 + 스포이드
========================================================= */
let bgPickr = null;

function setBgUI(hex) {
  const v = (hex || "#ffffff").toLowerCase();
  if (bgColorSwatch) bgColorSwatch.style.background = v;
  if (bgColorValue) bgColorValue.textContent = v;

  if (bgPickr) {
    try {
      bgPickr.setColor(v, true);
    } catch (e) {
      console.warn("Pickr 색상 반영 실패:", e);
    }
  }
}

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
    if (bgTextEl) bgTextEl.textContent = getItemBgColor(it);
  } else {
    draftBgColor = v;
    draftBgSet = true;
    if (bgTextEl) bgTextEl.textContent = v;
  }

  redraw();
  updateActionLocks();
}

function updateBgLockUI(profile, laser) {
  const wrap = bgPickBtn?.closest(".colorPick");
  const locked = profile === "OEM" && (laser === "black" || laser === "white");
  if (wrap) wrap.classList.toggle("isLocked", locked);

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
      if (bgTextEl) bgTextEl.textContent = forced;
    } else {
      draftBgColor = forced;
      draftBgSet = true;
      if (bgTextEl) bgTextEl.textContent = forced;
    }

    redraw();
    updateActionLocks();
    return;
  }

  const it = cartItems.find((x) => x.id === selectedItemId);
  const color = it?.bgColor || draftBgColor || "#ffffff";
  setBgUI(color);
}

async function openEyeDropper() {
  if (uiLocked) return;
  if (!validateUserInfo(true)) {
    updateActionLocks();
    return;
  }

  if (!window.EyeDropper) {
    setMsg("현재 브라우저에서는 스포이드 기능이 지원되지 않습니다.");
    return;
  }

  try {
    const eyeDropper = new EyeDropper();
    const result = await eyeDropper.open();

    if (!result?.sRGBHex) return;

    clearMsgOk();
    setMsg("");
    applyBgColor(result.sRGBHex);
    setOk("스포이드로 배경색을 적용했습니다.");
  } catch (e) {
    if (e?.name !== "AbortError") {
      console.error("스포이드 사용 실패:", e);
      setMsg("스포이드 사용 중 문제가 발생했습니다.");
    }
  }
}

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
      interaction: { input: true, save: false },
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