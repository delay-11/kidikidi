/* =========================================================
 * HTML 이스케이프
========================================================= */
function escapeQuoteHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

/* =========================================================
 * 금액 포맷
========================================================= */
function formatQuotePrice(value) {
  return `${Number(value || 0).toLocaleString("ko-KR")}원`;
}

/* =========================================================
 * API
========================================================= */
function getQuotePageApi() {
  return window.quotePageApi || {};
}

/* =========================================================
 * 요약 데이터
========================================================= */
function getQuoteEmailSummary() {
  const api = getQuotePageApi();
  const requester = api.getRequesterInfo?.() || {};
  const summary = api.getQuoteSummaryData?.() || {};

  return {
    companyName: requester.companyName || "",
    customerName: requester.customerName || "",
    customerPhone: requester.customerPhone || "",
    customerEmail: requester.customerEmail || "",
    dueDate: requester.dueDate || "",
    rushTypeLabel: requester.rushTypeLabel || "",

    keycapPrice: Number(summary.keycapTotal || 0),
    keyringPrice: Number(summary.keyringTotal || 0),
    discountPrice: Number(summary.discountTotal || 0),
    surchargePrice: Number(summary.rushAmount || 0),
    finalPrice: Number(summary.total || 0),
  };
}

/* =========================================================
 * 요청자 정보 행
========================================================= */
function buildRequesterRows(summary) {
  const rows = [];

  if (summary.companyName) rows.push(row("업체명", summary.companyName));
  if (summary.customerName) rows.push(row("담당자", summary.customerName));
  if (summary.customerPhone) rows.push(row("연락처", summary.customerPhone));
  if (summary.customerEmail) rows.push(row("이메일", summary.customerEmail));
  if (summary.dueDate) rows.push(row("희망 납기일", summary.dueDate));
  if (summary.rushTypeLabel) rows.push(row("제작 속도", summary.rushTypeLabel));

  return rows.join("");
}

/* =========================================================
 * 선택 항목 행
========================================================= */
function buildItemRows(items) {
  const api = getQuotePageApi();
  const rows = [];

  items.forEach((item, i) => {
    const label = api.getQuoteItemLabel?.(item) || `항목 ${i + 1}`;
    rows.push(row(`선택 항목 ${i + 1}`, label));
  });

  return rows.join("");
}

/* =========================================================
 * 금액 행
========================================================= */
function buildPriceRows(summary) {
  const rows = [];

  if (summary.keycapPrice > 0) {
    rows.push(priceRow("키캡 금액", summary.keycapPrice));
  }

  if (summary.keyringPrice > 0) {
    rows.push(priceRow("키링 금액", summary.keyringPrice));
  }

  if (summary.discountPrice > 0) {
    rows.push(priceRow("할인 금액", summary.discountPrice, "discount"));
  }

  if (summary.surchargePrice > 0) {
    rows.push(priceRow("할증 금액", summary.surchargePrice, "surcharge"));
  }

  return rows.join("");
}

/* =========================================================
 * 기본 행
========================================================= */
function row(label, value) {
  return `
    <tr>
      <td style="width:140px;padding:10px 12px;border-bottom:1px solid #e6e9f2;background:#fcfcfd;">
        ${escapeQuoteHtml(label)}
      </td>
      <td style="padding:10px 12px;border-bottom:1px solid #e6e9f2;">
        ${escapeQuoteHtml(value)}
      </td>
    </tr>
  `;
}

/* =========================================================
 * 금액 행 스타일
========================================================= */
function priceRow(label, value, type = "") {
  let color = "#1b2330";
  let prefix = "";

  if (type === "discount") {
    color = "#039855";
    prefix = "-";
  }

  if (type === "surcharge") {
    color = "#d92d20";
    prefix = "+";
  }

  return `
    <tr>
      <td style="padding:10px 12px;border-bottom:1px solid #e6e9f2;background:#fcfcfd;">
        ${label}
      </td>
      <td style="padding:10px 12px;border-bottom:1px solid #e6e9f2;text-align:right;color:${color};font-weight:700;">
        ${prefix}${formatQuotePrice(value)}
      </td>
    </tr>
  `;
}

/* =========================================================
 * 최종 테이블
========================================================= */
function buildQuoteSummaryTable(mode = "company") {
  const api = getQuotePageApi();
  const items = api.getQuoteItems?.() || [];
  const summary = getQuoteEmailSummary();

  const rows = [];

  // 회사메일만 요청자 정보 포함
  if (mode === "company") {
    rows.push(buildRequesterRows(summary));
  }

  // 선택 항목
  if (items.length) {
    rows.push(buildItemRows(items));
  }

  // 금액
  rows.push(buildPriceRows(summary));

  return `
    <table style="width:100%;border-collapse:collapse;border:1px solid #e6e9f2;font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,'Noto Sans KR',sans-serif;">
      
      <!-- 제목 -->
      <tr>
        <th colspan="2" style="padding:12px;background:#f8fafc;text-align:left;border-bottom:2px solid #fdcc63;">
          견적서
        </th>
      </tr>

      ${rows.join("")}

      <!-- 총 금액 -->
      <tr>
        <td style="padding:14px;background:#fffaeb;font-weight:800;border-top:1px solid #e6e9f2;">
          총 금액<br>
          <span style="font-size:11px;color:#667085;">VAT 별도</span>
        </td>
        <td style="padding:14px;background:#fffaeb;text-align:right;font-size:22px;font-weight:900;">
          ${formatQuotePrice(summary.finalPrice)}
        </td>
      </tr>

    </table>
  `;
}
