/* =========================================================
메일 발송 유틸 (최종본)
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

function emptyText(v) {
  const t = safeTrim(String(v ?? ""));
  return t || "-";
}

function ynText(v) {
  return v ? "포함" : "미포함";
}

function getLaserText(profile, laser) {
  if (profile !== "OEM") return "레이저 없음";
  if (laser === "black") return "레이저 블랙";
  if (laser === "white") return "레이저 화이트";
  return "레이저 없음";
}

function getBizFileName() {
  const nameFromUi = safeTrim(bizFileNameEl?.textContent || "");
  if (
    nameFromUi &&
    nameFromUi !== "선택된 파일 없음" &&
    nameFromUi !== "파일 없음"
  ) {
    return nameFromUi;
  }

  const fileNameFromInput = safeTrim(bizFileEl?.files?.[0]?.name || "");
  if (fileNameFromInput) return fileNameFromInput;

  return "business_license.pdf";
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

function buildItemsSummaryHtml(itemsSummary) {
  return itemsSummary
    .map((it, idx) => {
      const laserText = getLaserText(it.profile, it.laser);

      return `
        <div style="padding:10px 12px;border:1px solid #eaecf0;border-radius:10px;background:#fff;margin-bottom:8px;">
          <div style="font-weight:700;color:#1b2330;margin-bottom:4px;">시안 ${idx + 1}</div>
          <div>${it.profile} / ${it.capType} / ${laserText} / 배경 ${it.bg}</div>
          <div><b>수량</b> : ${Number(it.qty || 0).toLocaleString()}개</div>
          <div><b>단가</b> : ${Number(it.unit || 0).toLocaleString()}원</div>
          <div><b>합계(할인후)</b> : ${Number(it.line || 0).toLocaleString()}원</div>
          <div><b>시안</b> : ${it.design}</div>
        </div>
      `;
    })
    .join("");
}

function buildQuoteItemsSummaryHtml(itemsSummary) {
  return itemsSummary
    .map((it, idx) => {
      const laserText = getLaserText(it.profile, it.laser);

      return `
        <div style="padding:10px 12px;border:1px solid #eaecf0;border-radius:10px;background:#fff;margin-bottom:8px;">
          <div style="font-weight:700;color:#1b2330;margin-bottom:4px;">시안 ${idx + 1}</div>
          <div>${it.profile} / ${it.capType} / ${laserText} / 배경 ${it.bg}</div>
          <div><b>수량</b> : ${Number(it.qty || 0).toLocaleString()}개</div>
          <div><b>단가</b> : ${Number(it.unit || 0).toLocaleString()}원</div>
          <div><b>합계</b> : ${Number(it.line || 0).toLocaleString()}원</div>
        </div>
      `;
    })
    .join("");
}

function buildQuoteSectionHtml() {
  if (!quoteEnabled) return "";

  const prodValue = safeTrim(quoteProdEl?.value ?? quoteProd);
  const dueText = emptyText(quoteDueEl?.value ?? quoteDue);

  const prodText =
    prodValue === "10d"
      ? "빠른제작 (+20%) / 영업일 10일내 출고"
      : prodValue === "5d"
        ? "긴급제작 (+30%) / 영업일 5일내 출고"
        : "일반 제작";

  const keyringQtyText = String(
    Math.max(0, toInt(keyringQtyEl?.value ?? keyringQty, 0)),
  );

  const ledValue = safeTrim(keyringLedEl?.value ?? keyringLed);
  const ledText =
    ledValue === "yes" ? "있음" : ledValue === "no" ? "없음" : "선택 안 함";

  const keyringColorValue = safeTrim(keyringColorEl?.value ?? keyringColor);
  const keyringColorText =
    keyringColorValue === "black"
      ? "블랙"
      : keyringColorValue === "white"
        ? "화이트"
        : "선택 안 함";

  const keyringSlotsValue = safeTrim(keyringSlotsEl?.value ?? keyringSlots);
  const keyringSlotsText = keyringSlotsValue ? `${keyringSlotsValue}구` : "-";

  const packTypeValue = safeTrim(packTypeEl?.value ?? packType);
  const packTypeText =
    packTypeValue === "opp"
      ? "개별 OPP 포장"
      : packTypeValue === "byDesign"
        ? "각 시안별 묶음 포장"
        : packTypeValue === "set"
          ? "세트 포장"
          : packTypeValue === "case"
            ? "케이스 제작"
            : "선택 안 함";

  const packSheetText = ynText(!!(packSheetEl?.checked ?? packSheet));
  const packStickerText = ynText(!!(packStickerEl?.checked ?? packSticker));
  const notesText = emptyText(quoteNotesEl?.value ?? quoteNotes);

  return `
    <div style="margin-top:14px;padding:12px 14px;border:1px solid #fdcc63;border-radius:12px;background:#fff;">
      <div style="font-weight:700;margin-bottom:8px;">견적 요청 정보</div>

      <div style="margin-bottom:10px;">
        <div><b>제작 일정</b> : ${prodText}</div>
        <div><b>희망 납기일</b> : ${dueText}</div>
      </div>

      <div style="font-weight:700;margin:12px 0 8px;">추가 요청 사항</div>
      <div><b>키캡 키링 수량</b> : ${keyringQtyText}</div>
      <div><b>LED 유무</b> : ${ledText}</div>
      <div><b>키링 색상</b> : ${keyringColorText}</div>
      <div><b>키링 종류</b> : ${keyringSlotsText}</div>
      <div><b>포장 요구사항</b> : ${packTypeText}</div>
      <div><b>대지 포함</b> : ${packSheetText}</div>
      <div><b>스티커 제작</b> : ${packStickerText}</div>
      <div><b>기타 유의사항</b> : ${notesText}</div>
    </div>
  `;
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

  const designTypeCount = itemsSummary.length;
  const totalQty = itemsSummary.reduce(
    (sum, it) => sum + Math.max(1, Number(it.qty || 1)),
    0,
  );
  const itemsSummaryHtml = buildItemsSummaryHtml(itemsSummary);
  const quoteSectionHtml = buildQuoteSectionHtml();

  const params = {
    to_email: COMPANY_EMAIL,
    from_name: customerName,
    reply_to: customerEmail,

    customer_name: customerName,
    customer_phone: customerPhone,
    customer_email: customerEmail,
    order_no: orderNo,

    design_type_count: designTypeCount,
    total_qty: totalQty,
    items_summary_html: itemsSummaryHtml,
    quote_section_html: quoteSectionHtml,

    items_json: JSON.stringify(itemsSummary, null, 2),

    biz_file_dataurl: bizFileDataUrl || "",
    biz_file_filename: getBizFileName(),

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

  const designTypeCount = itemsSummary.length;
  const totalQty = itemsSummary.reduce(
    (sum, it) => sum + Math.max(1, Number(it.qty || 1)),
    0,
  );
  const itemsSummaryHtml = buildQuoteItemsSummaryHtml(itemsSummary);

  const params = {
    to_email: customerEmail,
    from_name: "KidiKidi",

    customer_name: customerName,
    order_no: orderNo,

    design_type_count: designTypeCount,
    total_qty: totalQty,
    items_summary_html: itemsSummaryHtml,

    subtotal_price: cartSubtotal().toLocaleString(),
    total_price: cartTotal().toLocaleString(),

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