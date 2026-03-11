/* =========================================================
 * Pickr 배경색
========================================================= */
let bgPickr = null;

function setBgUI(hex) {
  const v = (hex || "#ffffff").toLowerCase();
  if (bgColorSwatch) bgColorSwatch.style.background = v;
  if (bgColorValue) bgColorValue.textContent = v;
}

function updateBgLockUI(profile, laser) {
  const wrap = bgPickBtn?.closest(".colorPick");
  const locked = profile === "OEM" && (laser === "black" || laser === "white");
  if (wrap) wrap.classList.toggle("isLocked", locked);

  if (locked) {
    const forced = laser === "black" ? "#000000" : "#ffffff";
    setBgUI(forced);

    const it = cartItems.find((x) => x.id === selectedItemId);
    if (it) {
      it.bgColor = forced;
      it.design = it.design || {};
      it.design.bgSet = true;
      bgTextEl.textContent = forced;
    }
    return;
  }

  const it = cartItems.find((x) => x.id === selectedItemId);
  setBgUI(it?.bgColor || "#ffffff");
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

  bgPickr.on("change", (color) => {
    if (uiLocked || !color) return;
    if (!validateUserInfo(false)) return;

    const hex = color.toHEXA().toString().toLowerCase();
    setBgUI(hex);

    const it = cartItems.find((x) => x.id === selectedItemId);

    if (it) {
      it.bgColor = hex;
      it.design = it.design || {};
      it.design.bgSet = true;
      if (bgTextEl) bgTextEl.textContent = getItemBgColor(it);
    } else {
      draftBgColor = hex;
      draftBgSet = true;
      if (bgTextEl) bgTextEl.textContent = hex;
    }

    redraw();
    updateActionLocks();
  });

  setBgUI("#ffffff");
}
