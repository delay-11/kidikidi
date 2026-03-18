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
 * 회사 발송용 메일 파라미터
========================================================= */
async function buildDesignCompanyEmailParams() {
  const orderNo = safeTrim(orderEl?.value) || "";
  const total = typeof cartTotal === "function" ? cartTotal() : 0;
  const attachment = await buildDesignAttachmentParams();

  return {
    to_email: COMPANY_EMAIL,

    customer_name: safeTrim(nameEl?.value),
    customer_phone: safeTrim(phoneEl?.value),
    customer_order_no: orderNo,
    customer_email: safeTrim(emailEl?.value),

    summary_text: buildItemsSummaryText(cartItems),
    summary_html: `
      ${buildCustomerSummaryHtml()}
      <div style="height:16px;"></div>
      ${buildItemsSummaryHtml(cartItems)}
      <div style="height:16px;"></div>
      <div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.7;color:#111;">
        <b>총액</b> : ${numberWithCommas(total)}원
      </div>
    `,

    total_price: String(total),
    total_price_text: `${numberWithCommas(total)}원`,
    cart_count: String(cartItems.length),

    attachment_filename: attachment.attachment_filename,
    attachment_extension: attachment.attachment_extension,
    attachment_base64: attachment.attachment_base64,
  };
}

/* =========================================================
 * 고객 발송용 메일 파라미터
========================================================= */
function buildDesignCustomerEmailParams() {
  const orderNo = safeTrim(orderEl?.value) || "-";
  const total = typeof cartTotal === "function" ? cartTotal() : 0;

  return {
    to_email: safeTrim(emailEl?.value),
    customer_name: safeTrim(nameEl?.value),
    customer_order_no: orderNo,
    summary_text: buildItemsSummaryText(cartItems),
    summary_html: `
      <div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.7;color:#111;">
        <p style="margin:0 0 12px;">시안이 정상적으로 접수되었습니다.</p>
        <p style="margin:0 0 12px;">주문번호: <b>${escapeHtml(orderNo)}</b></p>
      </div>

      ${buildItemsSummaryHtml(cartItems)}

      <div style="height:16px;"></div>

      <div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.7;color:#111;">
        <b>총액</b> : ${numberWithCommas(total)}원
      </div>
    `,
    total_price: String(total),
    total_price_text: `${numberWithCommas(total)}원`,
    cart_count: String(cartItems.length),
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

  const params = buildDesignCustomerEmailParams();

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
