/* =========================================================
 * 시안 1개 표시명
========================================================= */
function getItemDisplayName(item) {
  const orderNo = safeTrim(orderEl?.value) || "order";
  const capType = safeTrim(item?.capType) || safeTrim(capTypeEl?.value) || "-";
  const qty = Math.max(1, toInt(item?.qty ?? 1, 1));

  return `${orderNo}-${capType} (${qty}개)`;
}

/* =========================================================
 * 시안 1개 요약 텍스트
========================================================= */
function buildItemSummaryText(item, index) {
  if (!item) return "";

  const lines = [
    `[시안 ${index + 1}]`,
    `파일명: ${getItemDisplayName(item)}`,
    `프로파일: ${safeTrim(item.profile) || "-"}`,
    `규격: ${safeTrim(item.capType) || "-"}`,
    `레이저: ${getLaserLabel(item.laser)}`,
    `수량: ${numberWithCommas(Math.max(1, toInt(item.qty ?? 1, 1)))}개`,
    `배경색: ${item.bgSet ? safeTrim(item.bgColor || "#ffffff") : "없음"}`,
    `이미지 포함: ${item.dataUrl ? "예" : "아니오"}`,
  ];

  return lines.join("\n");
}

/* =========================================================
 * 전체 시안 요약 텍스트
========================================================= */
function buildItemsSummaryText(items = cartItems) {
  if (!Array.isArray(items) || !items.length) {
    return "추가된 시안이 없습니다.";
  }

  const blocks = items.map((item, index) => buildItemSummaryText(item, index));

  return [...blocks, "", `총 시안 수: ${items.length}개`].join("\n\n");
}

/* =========================================================
 * 시안 1개 요약 HTML
========================================================= */
function buildItemSummaryHtml(item, index) {
  if (!item) return "";

  const esc = (v) => escapeHtml(String(v ?? "-"));

  return `
    <div style="border:1px solid #e5e7eb;border-radius:12px;padding:14px;margin-bottom:12px;">
      <div style="font-weight:700;font-size:15px;margin-bottom:8px;">시안 ${index + 1}</div>

      <table cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;font-size:14px;line-height:1.6;">
        <tr>
          <td style="padding:4px 0;width:120px;font-weight:700;">파일명</td>
          <td style="padding:4px 0;">${esc(getItemDisplayName(item))}</td>
        </tr>
        <tr>
          <td style="padding:4px 0;font-weight:700;">프로파일</td>
          <td style="padding:4px 0;">${esc(item.profile || "-")}</td>
        </tr>
        <tr>
          <td style="padding:4px 0;font-weight:700;">규격</td>
          <td style="padding:4px 0;">${esc(item.capType || "-")}</td>
        </tr>
        <tr>
          <td style="padding:4px 0;font-weight:700;">레이저</td>
          <td style="padding:4px 0;">${esc(getLaserLabel(item.laser))}</td>
        </tr>
        <tr>
          <td style="padding:4px 0;font-weight:700;">수량</td>
          <td style="padding:4px 0;">${esc(numberWithCommas(Math.max(1, toInt(item.qty ?? 1, 1))))}개</td>
        </tr>
        <tr>
          <td style="padding:4px 0;font-weight:700;">배경색</td>
          <td style="padding:4px 0;">${item.bgSet ? esc(item.bgColor || "#ffffff") : "없음"}</td>
        </tr>
        <tr>
          <td style="padding:4px 0;font-weight:700;">이미지 포함</td>
          <td style="padding:4px 0;">${item.dataUrl ? "예" : "아니오"}</td>
        </tr>
      </table>
    </div>
  `;
}

/* =========================================================
 * 전체 시안 요약 HTML
========================================================= */
function buildItemsSummaryHtml(items = cartItems) {
  const esc = (v) => escapeHtml(String(v ?? "-"));

  if (!Array.isArray(items) || !items.length) {
    return `
      <div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.7;color:#111;">
        <p>추가된 시안이 없습니다.</p>
      </div>
    `;
  }

  const body = items
    .map((item, index) => buildItemSummaryHtml(item, index))
    .join("");

  return `
    <div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.7;color:#111;">
      <h2 style="margin:0 0 12px;">시안 접수 정보</h2>
      ${body}

      <div style="margin-top:16px;padding:14px;border:1px solid #e5e7eb;border-radius:12px;background:#fafafa;">
        <div><b>총 시안 수</b> : ${esc(items.length)}개</div>
      </div>
    </div>
  `;
}

/* =========================================================
 * 고객 정보 요약 HTML
========================================================= */
function buildCustomerSummaryHtml() {
  const esc = (v) => escapeHtml(String(v ?? "-"));

  return `
    <div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.7;color:#111;">
      <h2 style="margin:0 0 12px;">주문자 정보</h2>

      <table cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="padding:6px 0;width:120px;font-weight:700;">주문자명</td>
          <td style="padding:6px 0;">${esc(safeTrim(nameEl?.value))}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;font-weight:700;">연락처</td>
          <td style="padding:6px 0;">${esc(safeTrim(phoneEl?.value))}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;font-weight:700;">주문번호</td>
          <td style="padding:6px 0;">${esc(safeTrim(orderEl?.value))}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;font-weight:700;">이메일</td>
          <td style="padding:6px 0;">${esc(safeTrim(emailEl?.value))}</td>
        </tr>
      </table>
    </div>
  `;
}
