/* =========================================================
 * 가격 계산
========================================================= */
function getVolumeDiscountRate(qty) {
  if (qty >= 5000) return 0.2;
  if (qty >= 1000) return 0.15;
  if (qty >= 500) return 0.1;
  return 0;
}

function getRushRate(v) {
  if (!v || v === "none") return 0;
  if (v === "10d") return 0.2;
  if (v === "5d") return 0.3;
  return 0;
}

function getUnitPrice(profile, capType, laser) {
  const base = PRICE?.[profile]?.[capType] ?? 0;
  const add = profile === "OEM" ? (LASER_ADDON?.[laser] ?? 0) : 0;
  return { base, add, unit: base + add };
}

function calcLineTotal(item) {
  const { unit } = getUnitPrice(item.profile, item.capType, item.laser);
  const qty = Math.max(1, Number(item.qty || 1));
  const baseLine = unit * qty;

  const discRate = getVolumeDiscountRate(qty);
  const afterDiscount = Math.round(baseLine * (1 - discRate));

  return { unit, qty, baseLine, discRate, afterDiscount };
}

function cartSubtotal() {
  return cartItems.reduce(
    (sum, it) => sum + calcLineTotal(it).afterDiscount,
    0,
  );
}

function cartTotal() {
  const sub = cartSubtotal();
  const rate = quoteEnabled ? getRushRate(quoteProd) : 0;
  return Math.round(sub * (1 + rate));
}
