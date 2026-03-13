/* =========================================================
메일 발송 유틸 (안정 버전)
========================================================= */

let __emailJsInitialized = false;

/* =========================================================
EmailJS 초기화
========================================================= */

function ensureEmailJsInit() {
  if (__emailJsInitialized) return;
  emailjs.init({ publicKey: EMAILJS_PUBLIC_KEY });
  __emailJsInitialized = true;
}

/* =========================================================
유틸
========================================================= */

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function safeFilePart(v) {
  return String(v || "")
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, "-");
}

/* =========================================================
주문 요약 생성
========================================================= */

function buildItemsSummary() {
  const arr = [];

  for (const it of cartItems) {
    const calc = calcLineTotal(it);
    const bg = getItemBgColor(it);

    arr.push({
      profile: it.profile,
      capType: it.capType,
      laser: it.profile === "OEM" ? it.laser || "none" : "none",
      bg,
      qty: calc.qty,
      unit: calc.unit,
      line: calc.afterDiscount,
      design: hasDesign(it) ? "있음" : "없음",
    });
  }

  return arr;
}

/* =========================================================
PNG 렌더
========================================================= */

async function renderItemFinalPng(item) {
  const size = getCanvasSize(item.profile, item.capType);

  const off = document.createElement("canvas");
  off.width = size.w;
  off.height = size.h;

  const ctx = off.getContext("2d");

  ctx.fillStyle = getItemBgColor(item);
  ctx.fillRect(0, 0, off.width, off.height);

  if (item.design?.imgDataUrl) {
    const img = new Image();

    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.src = item.design.imgDataUrl;
    });

    const scale = item.design.scale ?? 1;
    const rot = item.design.rot ?? 0;
    const cx = item.design.cx ?? off.width / 2;
    const cy = item.design.cy ?? off.height / 2;

    const w = img.width * scale;
    const h = img.height * scale;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rot);
    ctx.drawImage(img, -w / 2, -h / 2, w, h);
    ctx.restore();
  }

  return off.toDataURL("image/png");
}

/* =========================================================
ZIP 생성
========================================================= */

async function buildZip(designs, orderNo) {
  const zip = new JSZip();
  const folder = zip.folder(`${orderNo}_designs`);

  designs.forEach((d) => {
    const base64 = d.dataUrl.split(",")[1];
    folder.file(d.filename, base64, { base64: true });
  });

  const blob = await zip.generateAsync({ type: "blob" });

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(blob);
  });
}

/* =========================================================
첨부파일 생성
========================================================= */

async function buildAttachments(orderNo) {
  const designs = [];

  for (const it of cartItems) {
    if (!it.design?.imgDataUrl) continue;

    const png = await renderItemFinalPng(it);

    const name = [
      safeFilePart(orderNo),
      safeFilePart(it.profile),
      safeFilePart(it.capType),
    ].join("_");

    designs.push({
      filename: `${name}.png`,
      dataUrl: png,
    });
  }

  if (designs.length >= 10) {
    const zipData = await buildZip(designs, orderNo);

    return {
      attachment_mode: "zip",
      zip_filename: `${orderNo}_designs.zip`,
      zip_file: zipData,
    };
  }

  const obj = { attachment_mode: "files" };

  designs.forEach((d, i) => {
    const idx = i + 1;
    obj[`design_${idx}_filename`] = d.filename;
    obj[`design_${idx}_file`] = d.dataUrl;
  });

  return obj;
}

/* =========================================================
회사 메일
========================================================= */

async function sendEmailToCompany() {
  ensureEmailJsInit();

  const customerName = safeTrim(nameEl?.value);
  const customerPhone = safeTrim(phoneEl?.value);
  const customerEmail = safeTrim(emailEl?.value);
  const orderNo = safeTrim(orderEl?.value);

  const itemsSummary = buildItemsSummary();
  const attachments = await buildAttachments(orderNo);

  const params = {
    to_email: COMPANY_EMAIL,
    from_name: customerName,
    reply_to: customerEmail,

    customer_name: customerName,
    customer_phone: customerPhone,
    customer_email: customerEmail,
    order_no: orderNo,

    items_json: JSON.stringify(itemsSummary, null, 2),
    biz_file_dataurl: bizFileDataUrl || "",

    ...attachments,
  };

  try {
    const result = await emailjs.send(
      EMAILJS_SERVICE_ID,
      EMAILJS_TEMPLATE_ID,
      params,
    );

    return { ok: true, itemsSummary, result };
  } catch (err) {
    console.error("회사 메일 전송 실패:", err);
    return { ok: false, itemsSummary: [], result: null };
  }
}

/* =========================================================
고객 견적 메일
========================================================= */

async function sendQuoteEmailToCustomer(itemsSummary) {
  ensureEmailJsInit();

  const customerEmail = safeTrim(emailEl?.value);
  const customerName = safeTrim(nameEl?.value);
  const orderNo = safeTrim(orderEl?.value);

  const params = {
    to_email: customerEmail,
    from_name: "KidiKidi",

    customer_name: customerName,
    order_no: orderNo,

    subtotal_price: String(cartSubtotal()),
    total_price: String(cartTotal()),

    items_json: JSON.stringify(itemsSummary, null, 2),
  };

  try {
    const result = await emailjs.send(
      EMAILJS_SERVICE_ID,
      EMAILJS_QUOTE_TEMPLATE_ID,
      params,
    );

    return { ok: true, result };
  } catch (err) {
    console.error("고객 견적 메일 전송 실패:", err);
    return { ok: false, result: null };
  }
}

/* =========================================================
전체 메일 전송
========================================================= */

async function sendOrderEmails() {
  if (!cartItems?.length) {
    setMsg("시안이 없습니다.");
    return false;
  }

  setMsg("메일 전송중...");

  try {
    const company = await sendEmailToCompany();
    if (!company.ok) {
      setMsg("회사 메일 전송 실패");
      return false;
    }

    await wait(1200);

    const customer = await sendQuoteEmailToCustomer(company.itemsSummary);
    if (!customer.ok) {
      setMsg("고객 견적 메일 전송 실패");
      return false;
    }

    setMsg("메일 전송 완료");
    return true;
  } catch (err) {
    console.error(err);
    setMsg("메일 전송 실패");
    return false;
  }
}
