/* =========================================================
 * 시안 첨부 zip 파일명
========================================================= */
function getDesignZipFilename() {
  const orderNo = safeTrim(orderEl?.value) || "order";
  return `${orderNo}_designs.zip`;
}

/* =========================================================
 * 시안 첨부 zip 생성 파라미터
========================================================= */
async function buildDesignAttachmentParams() {
  const orderNo = safeTrim(orderEl?.value) || "order";
  const zipBase64 = await buildZipFromDesigns(cartItems, orderNo);

  return {
    attachment_filename: `${orderNo}_designs`,
    attachment_extension: "zip",
    attachment_base64: zipBase64,
  };
}

/* =========================================================
 * 시안 종류 수
========================================================= */
function getDesignTypeCount(items) {
  return Array.isArray(items) ? items.length : 0;
}

/* =========================================================
 * 총 주문 수량
========================================================= */
function getTotalQty(items) {
  if (!Array.isArray(items) || !items.length) return 0;

  return items.reduce((sum, item) => {
    return sum + Number(item.quantity || 1);
  }, 0);
}

/* =========================================================
 * 회사 발송용 메일 파라미터
========================================================= */
async function buildDesignCompanyEmailParams() {
  const orderNo = safeTrim(orderEl?.value) || "";
  const attachment = await buildDesignAttachmentParams();

  return {
    to_email: COMPANY_EMAIL,

    customer_name: safeTrim(nameEl?.value),
    customer_order_no: orderNo,
    customer_email: safeTrim(emailEl?.value),

    design_type_count: String(getDesignTypeCount(cartItems)),
    total_qty: String(getTotalQty(cartItems)),
    items_summary_html: buildItemsSummaryHtml(cartItems),

    attachment_filename: attachment.attachment_filename,
    attachment_extension: attachment.attachment_extension,
    attachment_base64: attachment.attachment_base64,
  };
}

/* =========================================================
 * 고객 발송용 메일 파라미터
========================================================= */
async function buildDesignCustomerEmailParams() {
  const orderNo = safeTrim(orderEl?.value) || "-";
  const attachment = await buildDesignAttachmentParams();

  return {
    to_email: safeTrim(emailEl?.value),
    customer_name: safeTrim(nameEl?.value),
    customer_order_no: orderNo,

    design_type_count: String(getDesignTypeCount(cartItems)),
    total_qty: String(getTotalQty(cartItems)),
    items_summary_html: buildItemsSummaryHtml(cartItems),

    attachment_filename: attachment.attachment_filename,
    attachment_extension: attachment.attachment_extension,
    attachment_base64: attachment.attachment_base64,
  };
}

/* =========================================================
 * 회사로 시안 접수 메일 발송
========================================================= */
async function sendDesignToCompany() {
  const params = await buildDesignCompanyEmailParams();

  await emailjs.send(
    EMAILJS_SERVICE_ID,
    EMAILJS_DESIGN_COMPANY_TEMPLATE_ID,
    params,
    EMAILJS_PUBLIC_KEY,
  );

  return true;
}

/* =========================================================
 * 고객에게 접수 확인 메일 발송
========================================================= */
async function sendDesignToCustomer() {
  if (!EMAILJS_DESIGN_CUSTOMER_TEMPLATE_ID) return true;

  const customerEmail = safeTrim(emailEl?.value);
  if (!customerEmail) return true;

  const params = await buildDesignCustomerEmailParams();

  await emailjs.send(
    EMAILJS_SERVICE_ID,
    EMAILJS_DESIGN_CUSTOMER_TEMPLATE_ID,
    params,
    EMAILJS_PUBLIC_KEY,
  );

  return true;
}

/* =========================================================
 * 시안 접수 메일 발송 통합
========================================================= */
async function sendOrderEmails() {
  try {
    await sendDesignToCompany();
    await sendDesignToCustomer();
    return true;
  } catch (err) {
    console.error("[시안 접수 메일 발송 실패]", err);
    setMsg?.("시안 접수 메일 전송에 실패했습니다. 잠시 후 다시 시도해주세요.");
    return false;
  }
}