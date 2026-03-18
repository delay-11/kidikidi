/* =========================================================
 * 견적 요청 메일 설정
========================================================= */
const QUOTE_COMPANY_EMAIL = COMPANY_EMAIL;

/* 
  아래 템플릿 ID는 예시 이름이다.
  실제 EmailJS 템플릿 ID로 교체해야 함.
*/
const EMAILJS_QUOTE_COMPANY_TEMPLATE_ID =
  window.EMAILJS_QUOTE_COMPANY_TEMPLATE_ID || EMAILJS_QUOTE_TEMPLATE_ID;

const EMAILJS_QUOTE_CUSTOMER_TEMPLATE_ID =
  window.EMAILJS_QUOTE_CUSTOMER_TEMPLATE_ID || "";

/* =========================================================
 * 파일명/확장자 유틸
========================================================= */
function getBizFileMeta() {
  const rawName =
    safeTrim(bizFileEl?.files?.[0]?.name) ||
    safeTrim(bizFileNameEl?.textContent) ||
    "biz_file";

  const dotIndex = rawName.lastIndexOf(".");
  const filename =
    dotIndex > -1 ? rawName.slice(0, dotIndex) : rawName || "biz_file";
  const extension =
    dotIndex > -1 ? rawName.slice(dotIndex + 1).toLowerCase() : "png";

  return { filename, extension };
}

/* =========================================================
 * 견적 요청용 메일 파라미터 생성
========================================================= */
function buildQuoteEmailParams() {
  const data = getQuoteRequestData();
  const summaryText = buildQuoteSummaryText();
  const summaryHtml = buildQuoteSummaryHtml();
  const bizMeta = getBizFileMeta();

  const params = {
    to_email: QUOTE_COMPANY_EMAIL,

    customer_name: data.customerName || "",
    customer_phone: data.phone || "",
    customer_order_no: data.orderNo || "",
    customer_email: data.email || "",

    profile: data.profile || "",
    cap_type: data.capType || "",
    laser: getLaserLabel(data.laser),
    qty: String(data.qty ?? ""),

    quote_prod: getQuoteProdLabel(data.quoteProd),
    quote_due: data.quoteDue || "",
    keyring_qty: String(data.keyringQty ?? 0),
    keyring_led: getLedLabel(data.keyringLed),
    keyring_color: getColorLabel(data.keyringColor),
    keyring_slots: `${data.keyringSlots || "-"}구`,
    pack_type: getPackTypeLabel(data.packType),
    pack_sheet: data.packSheet ? "예" : "아니오",
    pack_sticker: data.packSticker ? "예" : "아니오",
    quote_notes: data.quoteNotes || "",

    summary_text: summaryText,
    summary_html: summaryHtml,

    biz_filename: bizMeta.filename,
    biz_extension: bizMeta.extension,
    biz_file_base64: bizFileDataUrl ? dataUrlToBase64(bizFileDataUrl) : "",
  };

  return params;
}

/* =========================================================
 * 회사로 견적 요청 메일 발송
========================================================= */
async function sendQuoteRequestToCompany() {
  const params = buildQuoteEmailParams();

  await emailjs.send(
    EMAILJS_SERVICE_ID,
    EMAILJS_QUOTE_COMPANY_TEMPLATE_ID,
    params,
    EMAILJS_PUBLIC_KEY,
  );

  return true;
}

/* =========================================================
 * 고객용 접수 확인 메일 파라미터
========================================================= */
function buildQuoteCustomerEmailParams() {
  const data = getQuoteRequestData();

  return {
    to_email: data.email || "",
    customer_name: data.customerName || "",
    customer_order_no: data.orderNo || "-",
    summary_text: buildQuoteSummaryText(),
    summary_html: buildQuoteSummaryHtml(),
  };
}

/* =========================================================
 * 고객에게 접수 확인 메일 발송
 * - 고객용 템플릿 없으면 생략
========================================================= */
async function sendQuoteRequestToCustomer() {
  if (!EMAILJS_QUOTE_CUSTOMER_TEMPLATE_ID) return true;

  const data = getQuoteRequestData();
  if (!data.email) return true;

  const params = buildQuoteCustomerEmailParams();

  await emailjs.send(
    EMAILJS_SERVICE_ID,
    EMAILJS_QUOTE_CUSTOMER_TEMPLATE_ID,
    params,
    EMAILJS_PUBLIC_KEY,
  );

  return true;
}

/* =========================================================
 * 견적 요청 메일 발송 통합
========================================================= */
async function sendQuoteRequestEmails() {
  try {
    await sendQuoteRequestToCompany();
    await sendQuoteRequestToCustomer();
    return true;
  } catch (err) {
    console.error("[견적 요청 메일 발송 실패]", err);
    setMsg?.("견적 요청 메일 전송에 실패했습니다. 잠시 후 다시 시도해주세요.");
    return false;
  }
}
