/* =========================================================
 * 메일 발송 유틸
========================================================= */
async function buildZipFromDesigns(designs, orderNo) {
  if (!window.JSZip) {
    throw new Error("JSZip 라이브러리가 로드되지 않았습니다.");
  }

  const zip = new JSZip();
  const folder = zip.folder(`${orderNo}_designs`);

  designs.forEach((file) => {
    if (!file?.filename || !file?.dataUrl) return;
    const base64 = dataUrlToBase64(file.dataUrl);
    folder.file(file.filename, base64, { base64: true });
  });

  const zipBlob = await zip.generateAsync({ type: "blob" });

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(zipBlob);
  });
}

async function renderItemFinalPng(item) {
  const size = getCanvasSize(item.profile, item.capType);

  const off = document.createElement("canvas");
  off.width = size.w;
  off.height = size.h;
  const c = off.getContext("2d");

  const bg = getItemBgColor(item);
  c.fillStyle = bg;
  c.fillRect(0, 0, off.width, off.height);

  if (item.design?.imgDataUrl) {
    const img = new Image();
    await new Promise((res, rej) => {
      img.onload = res;
      img.onerror = rej;
      img.src = item.design.imgDataUrl;
    });

    const scale = item.design.scale ?? 1;
    const rot = item.design.rot ?? 0;
    const cx = item.design.cx ?? off.width / 2;
    const cy = item.design.cy ?? off.height / 2;

    const w = img.width * scale;
    const h = img.height * scale;

    c.save();
    c.translate(cx, cy);
    c.rotate(rot);
    c.drawImage(img, -w / 2, -h / 2, w, h);
    c.restore();
  }

  return off.toDataURL("image/png");
}

function emailConfigReady(templateId) {
  return !(
    EMAILJS_PUBLIC_KEY.startsWith("YOUR_") ||
    EMAILJS_SERVICE_ID.startsWith("YOUR_") ||
    templateId.startsWith("YOUR_")
  );
}

async function sendEmailToCompany(extraParams = {}) {
  if (!emailConfigReady(EMAILJS_TEMPLATE_ID)) {
    setMsg("메일 전송 설정이 완료되지 않았습니다.");
    return false;
  }

  if (quoteEnabled) syncQuoteExtrasFromUI();

  emailjs.init({ publicKey: EMAILJS_PUBLIC_KEY });

  const itemsSummary = [];
  const designs = [];

  for (const it of cartItems) {
    const calc = calcLineTotal(it);
    const bg = getItemBgColor(it);

    itemsSummary.push({
      profile: it.profile,
      capType: it.capType,
      laser: it.profile === "OEM" ? it.laser : "none",
      bg,
      qty: calc.qty,
      unit: calc.unit,
      baseLine: calc.baseLine,
      discountRate: calc.discRate,
      lineAfterDiscount: calc.afterDiscount,
      design: hasDesign(it) ? "있음" : "없음",
    });

    if (it.design?.imgDataUrl) {
      const png = await renderItemFinalPng(it);

      designs.push({
        filename: `${safeTrim(orderEl.value)}_${it.profile}_${it.capType}_${it.laser || "none"}.png`,
        dataUrl: png,
      });
    }
  }

  const orderNo = safeTrim(orderEl.value);
  const useZip = designs.length >= 10;

  let attachmentParams = {};

  if (useZip) {
    const zipDataUrl = await buildZipFromDesigns(designs, orderNo);

    attachmentParams = {
      attachment_mode: "zip",
      zip_filename: `${orderNo}_designs.zip`,
      zip_file: zipDataUrl,
    };
  } else {
    attachmentParams = {
      attachment_mode: "files",

      design_1_filename: designs[0]?.filename || "",
      design_1_file: designs[0]?.dataUrl || "",

      design_2_filename: designs[1]?.filename || "",
      design_2_file: designs[1]?.dataUrl || "",

      design_3_filename: designs[2]?.filename || "",
      design_3_file: designs[2]?.dataUrl || "",

      design_4_filename: designs[3]?.filename || "",
      design_4_file: designs[3]?.dataUrl || "",

      design_5_filename: designs[4]?.filename || "",
      design_5_file: designs[4]?.dataUrl || "",

      design_6_filename: designs[5]?.filename || "",
      design_6_file: designs[5]?.dataUrl || "",

      design_7_filename: designs[6]?.filename || "",
      design_7_file: designs[6]?.dataUrl || "",

      design_8_filename: designs[7]?.filename || "",
      design_8_file: designs[7]?.dataUrl || "",

      design_9_filename: designs[8]?.filename || "",
      design_9_file: designs[8]?.dataUrl || "",
    };
  }

  const params = {
    to_email: COMPANY_EMAIL,
    customer_name: safeTrim(nameEl.value),
    customer_phone: safeTrim(phoneEl.value),
    order_no: orderNo,
    customer_email: safeTrim(emailEl.value),

    quote_enabled: quoteEnabled ? "Y" : "N",
    quote_prod: quoteEnabled ? quoteProd : "",
    quote_due: quoteEnabled ? quoteDue : "",
    biz_file_dataurl: quoteEnabled ? bizFileDataUrl || "" : "",

    quote_keyring_qty: quoteEnabled ? keyringQty || "" : "",
    quote_keyring_led: quoteEnabled ? keyringLed || "" : "",
    quote_keyring_color: quoteEnabled ? keyringColor || "" : "",
    quote_keyring_holes: quoteEnabled ? keyringSlots || "" : "",

    quote_packaging: quoteEnabled ? packType || "" : "",
    quote_has_sheet: quoteEnabled ? (packSheet ? "있음" : "없음") : "",
    quote_has_sticker: quoteEnabled ? (packSticker ? "있음" : "없음") : "",
    quote_notes: quoteEnabled ? quoteNotes || "" : "",

    quote_section_html: quoteEnabled
      ? `
    <div style="padding:12px 14px; border:1px solid #e6e9f2; border-radius:12px; background:#fff; margin-bottom:14px;">
      <div style="margin-bottom:8px;"><b>견적 요청 사항</b></div>
      <div><b>제작 일정</b> : ${quoteProd || "-"}</div>
      <div><b>희망 납기일</b> : ${quoteDue || "-"}</div>
      <div><b>키캡 키링 수량</b> : ${keyringQty || "-"}</div>
      <div><b>LED 유무</b> : ${keyringLed || "-"}</div>
      <div><b>키링 색상</b> : ${keyringColor || "-"}</div>
      <div><b>키링 종류</b> : ${keyringSlots || "-"}</div>
      <div><b>포장 요구사항</b> : ${packType || "-"}</div>
      <div><b>대지 포함</b> : ${packSheet ? "있음" : "없음"}</div>
      <div><b>스티커 제작</b> : ${packSticker ? "있음" : "없음"}</div>
      <div><b>기타 유의사항</b> : ${quoteNotes || "-"}</div>
    </div>
  `
      : "",

    items_json: JSON.stringify(itemsSummary, null, 2),

    ...attachmentParams,
    ...extraParams,
  };

  try {
    return await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, params);
  } catch (error) {
    console.error("회사 메일 전송 실패:", error);
    setMsg("회사 메일 전송에 실패했습니다. 잠시 후 다시 시도해주세요.");
    return false;
  }
}

async function sendQuoteEmailToCustomer(itemsSummary) {
  if (!emailConfigReady(EMAILJS_QUOTE_TEMPLATE_ID)) {
    setMsg("메일 전송 설정이 완료되지 않았습니다.");
    return false;
  }

  if (quoteEnabled) syncQuoteExtrasFromUI();

  emailjs.init({ publicKey: EMAILJS_PUBLIC_KEY });

  const params = {
    to_email: safeTrim(emailEl.value),

    customer_name: safeTrim(nameEl.value),
    customer_phone: safeTrim(phoneEl.value),
    order_no: safeTrim(orderEl.value),

    subtotal_price: String(cartSubtotal()),
    total_price: String(cartTotal()),

    quote_prod: quoteProd,
    quote_due: quoteDue,

    quote_keyring_qty: keyringQty || "",
    quote_keyring_led: keyringLed || "",
    quote_keyring_color: keyringColor || "",
    quote_keyring_holes: keyringSlots || "",

    quote_packaging: packType || "",
    quote_has_sheet: packSheet ? "있음" : "없음",
    quote_has_sticker: packSticker ? "있음" : "없음",

    quote_notes: quoteNotes || "",

    items_json: JSON.stringify(itemsSummary, null, 2),
  };

  try {
    return await emailjs.send(
      EMAILJS_SERVICE_ID,
      EMAILJS_QUOTE_TEMPLATE_ID,
      params,
    );
  } catch (error) {
    console.error("고객 견적서 메일 전송 실패:", error);
    setMsg("견적서 메일 전송에 실패했습니다. 잠시 후 다시 시도해주세요.");
    return false;
  }
}
