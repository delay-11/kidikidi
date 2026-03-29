/* =========================================================
 * 견적 페이지 API
========================================================= */
function getQuotePageApi() {
  return window.quotePageApi || {};
}

/* =========================================================
 * 회사 정보 (고객용 메일 하단)
========================================================= */
function buildCompanyInfoHtml() {
  return `
    <div style="margin-top:16px;padding:16px;border:1px solid #e6e9f2;border-radius:12px;background:#fcfcfd;
      font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,'Noto Sans KR',sans-serif;
      font-size:13px;line-height:1.7;color:#1b2330;">
      <div style="font-weight:800;margin-bottom:8px;">회사 정보</div>
      <div><b>업체명</b> : 키캡디자인</div>
      <div><b>이메일</b> : ${COMPANY_EMAIL}</div>
      <div><b>담당자</b> : 010-7124-7487</div>
      <div><b>운영시간</b> : 평일 10:00 ~ 18:00</div>
    </div>
  `;
}

/* =========================================================
 * 파일 Base64 변환
========================================================= */
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const result = String(reader.result || "");
      const base64 = result.includes(",") ? result.split(",")[1] : result;
      resolve(base64);
    };

    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/* =========================================================
 * 첨부용 안전 파일명
========================================================= */
function safeAttachmentPart(value) {
  return String(value || "")
    .trim()
    .replace(/[\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/* =========================================================
 * 오늘 날짜 문자열
========================================================= */
function getTodayStamp() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}${mm}${dd}`;
}

/* =========================================================
 * 파일 확장자 추출
========================================================= */
function getFileExtension(filename, fallback = "") {
  const name = String(filename || "");
  const dotIndex = name.lastIndexOf(".");
  if (dotIndex < 0) return fallback;
  return name.slice(dotIndex).toLowerCase();
}

/* =========================================================
 * 첨부파일명 규칙
 * - 사업자등록증 : quote_업체명_YYYYMMDD_biz.pdf
 * - 이미지      : quote_업체명_YYYYMMDD_design_01.png
========================================================= */
function buildQuoteAttachmentFilename(kind, originalName, index = 0) {
  const summary = getQuoteEmailSummary();
  const companyPart = safeAttachmentPart(summary.companyName || "quote");
  const datePart = getTodayStamp();

  if (kind === "biz") {
    const ext = getFileExtension(originalName, ".pdf") || ".pdf";
    return `quote_${companyPart}_${datePart}_biz${ext}`;
  }

  const ext = getFileExtension(originalName, ".png") || ".png";
  const seq = String(index + 1).padStart(2, "0");
  return `quote_${companyPart}_${datePart}_design_${seq}${ext}`;
}

/* =========================================================
 * 회사 메일 첨부파일 파라미터 생성
 * - 사업자등록증 PDF
 * - 이미지 최대 10개
========================================================= */
async function buildQuoteCompanyAttachmentParams() {
  const params = {};
  const api = getQuotePageApi();

  const bizFile = api.getSelectedBizFile?.() || null;
  const designFiles = api.getSelectedDesignFiles?.() || [];

  if (bizFile) {
    params.biz_filename = buildQuoteAttachmentFilename("biz", bizFile.name);
    params.biz_file = await fileToBase64(bizFile);
  }

  if (Array.isArray(designFiles) && designFiles.length) {
    const maxFiles = Math.min(designFiles.length, 10);

    for (let i = 0; i < maxFiles; i += 1) {
      const file = designFiles[i];
      if (!file) continue;

      const seq = i + 1;
      params[`design_${seq}_filename`] = buildQuoteAttachmentFilename(
        "design",
        file.name,
        i,
      );
      params[`design_${seq}_file`] = await fileToBase64(file);
    }

    params.design_file_count = String(maxFiles);
  } else {
    params.design_file_count = "0";
  }

  return params;
}

/* =========================================================
 * 회사 발송용 파라미터
========================================================= */
async function buildQuoteCompanyEmailParams() {
  const s = getQuoteEmailSummary();
  const attachmentParams = await buildQuoteCompanyAttachmentParams();

  return {
    to_email: COMPANY_EMAIL,

    company_name: s.companyName,
    customer_name: s.customerName,
    customer_phone: s.customerPhone,
    customer_email: s.customerEmail,

    quote_final_price: formatQuotePrice(s.finalPrice),
    quote_summary_table: buildQuoteSummaryTable("company"),

    ...attachmentParams,
  };
}

/* =========================================================
 * 고객 발송용 파라미터
========================================================= */
function buildQuoteCustomerEmailParams() {
  const s = getQuoteEmailSummary();

  return {
    to_email: s.customerEmail,

    customer_name: s.customerName,
    quote_final_price: formatQuotePrice(s.finalPrice),

    quote_summary_table: buildQuoteSummaryTable("customer"),
    company_info_html: buildCompanyInfoHtml(),
  };
}

/* =========================================================
 * 회사 메일 발송
========================================================= */
async function sendQuoteCompanyEmail() {
  ensureEmailJsInit();

  const params = await buildQuoteCompanyEmailParams();

  return await emailjs.send(
    EMAILJS_SERVICE_ID,
    EMAILJS_QUOTE_COMPANY_TEMPLATE_ID,
    params,
  );
}

/* =========================================================
 * 고객 메일 발송
========================================================= */
async function sendQuoteCustomerEmail() {
  ensureEmailJsInit();

  const params = buildQuoteCustomerEmailParams();

  return await emailjs.send(
    EMAILJS_SERVICE_ID,
    EMAILJS_QUOTE_CUSTOMER_TEMPLATE_ID,
    params,
  );
}

/* =========================================================
 * 견적 메일 전체 발송
========================================================= */
async function sendQuoteEmails() {
  await sendQuoteCompanyEmail();
  await wait(300);
  await sendQuoteCustomerEmail();
}
