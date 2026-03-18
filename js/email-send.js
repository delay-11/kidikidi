/* =========================================================
 * 회사 메일
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
 * 고객 견적 메일
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
 * 전체 메일 전송
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