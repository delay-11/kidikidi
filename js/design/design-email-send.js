/* =========================================================
 * 시안 첨부 파라미터 생성
========================================================= */
async function buildDesignAttachmentParams() {
  const orderNo = safeTrim(orderEl?.value) || "order";
  return await buildAttachments(orderNo);
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
    return sum + Number(item.qty || 1);
  }, 0);
}

/* =========================================================
 * 회사 발송용 메일 파라미터
========================================================= */
async function buildDesignCompanyEmailParams() {
  const orderNo = safeTrim(orderEl?.value) || "-";

  return {
    to_email: COMPANY_EMAIL,
    customer_name: safeTrim(nameEl?.value) || "고객",
    customer_order_no: orderNo,
    customer_email: safeTrim(emailEl?.value) || "-",
    reply_to: safeTrim(emailEl?.value) || COMPANY_EMAIL,

    design_type_count: String(getDesignTypeCount(cartItems)),
    total_qty: String(getTotalQty(cartItems)),
    items_summary_html: buildItemsSummaryHtml(cartItems),
    attachment_summary_html: "<div>첨부 테스트 제외</div>",
  };
}

/* =========================================================
 * 고객 발송용 메일 파라미터
========================================================= */
async function buildDesignCustomerEmailParams() {
  const orderNo = safeTrim(orderEl?.value) || "-";

  return {
    to_email: safeTrim(emailEl?.value) || "",
    customer_name: safeTrim(nameEl?.value) || "고객",
    customer_order_no: orderNo,
    reply_to: COMPANY_EMAIL,

    design_type_count: String(getDesignTypeCount(cartItems)),
    total_qty: String(getTotalQty(cartItems)),
    items_summary_html: buildItemsSummaryHtml(cartItems),
    attachment_summary_html: "<div>첨부 테스트 제외</div>",
  };
}

/* =========================================================
 * 회사로 시안 접수 메일 발송
========================================================= */
async function sendDesignToCompany() {
  ensureEmailJsInit();
  const params = await buildDesignCompanyEmailParams();
  console.log("[회사 메일 params]", params);

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

  ensureEmailJsInit();
  const params = await buildDesignCustomerEmailParams();
  console.log("[고객 메일 params]", params);

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
  let companyOk = false;
  let customerOk = false;

  try {
    await sendDesignToCompany();
    companyOk = true;
  } catch (err) {
    console.error("[회사 메일 발송 실패]", err);
  }

  try {
    await sendDesignToCustomer();
    customerOk = true;
  } catch (err) {
    console.error("[고객 메일 발송 실패]", err);
  }

  if (!companyOk && !customerOk) {
    console.error("[시안 접수 메일 발송 실패] 회사/고객 메일 모두 실패");
    return false;
  }

  return true;
}
