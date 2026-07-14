/* moved from js/design/design-email-summary.js */
/* =========================================================
 * 규격 표시명
========================================================= */
function getCapTypeText(capType) {
  if (!capType) return "-";
  if (capType === "R2-1U_HOMING") return "R2-1U 돌기";
  return capType;
}

/* =========================================================
 * 규격 파일명용 텍스트
========================================================= */
function getCapTypeFileText(capType) {
  if (!capType) return "-";
  if (capType === "R2-1U_HOMING") return "R2-1U-돌기";
  return capType;
}

/* =========================================================
 * 같은 프로파일/규격 그룹 안에서 이 시안의 순번 (1부터)
 * - PNG 파일명과 레이저 오리지널 파일명이 같은 시안이면 항상 같은
 *   번호를 쓰도록, 번호를 매기는 기준을 이 함수 하나로 통일
 * - 프로파일/규격별로 번호를 따로 세는 게 맞음 (예: OEM 1~17번,
 *   XDA는 18번이 아니라 다시 1번부터 시작해서 1~6번)
========================================================= */
function getItemGroupSeq(item, items = cartItems) {
  const profile = safeFilePart(item?.profile || "-");
  const capType = safeFilePart(
    getCapTypeFileText(item?.capType || safeTrim(capTypeEl?.value) || "-"),
  );

  let seq = 1;

  if (Array.isArray(items) && items.length) {
    let sameGroupCount = 0;

    for (const it of items) {
      const sameProfile = safeFilePart(it?.profile || "-") === profile;
      const sameCapType =
        safeFilePart(
          getCapTypeFileText(it?.capType || "-"),
        ) === capType;

      if (!sameProfile || !sameCapType) continue;

      sameGroupCount += 1;

      if (it === item) {
        seq = sameGroupCount;
        break;
      }
    }
  }

  return seq;
}

/* =========================================================
 * 시안 1개 표시명 (PNG 파일명)
========================================================= */
function getItemDisplayName(item, items = cartItems) {
  const orderNo = safeTrim(orderEl?.value) || "order";
  const profile = safeFilePart(item?.profile || "-");
  const capType = safeFilePart(
    getCapTypeFileText(item?.capType || safeTrim(capTypeEl?.value) || "-"),
  );
  const seq = getItemGroupSeq(item, items);

  return `${safeFilePart(orderNo)}_${profile}_${capType}_${String(seq).padStart(
    2,
    "0",
  )}.png`;
}

/* =========================================================
 * 레이저 옵션 텍스트
========================================================= */
function getLaserText(profile, laser) {
  if (profile !== "OEM") return "레이저 없음";
  if (laser === "black") return "레이저 블랙";
  if (laser === "white") return "레이저 화이트";
  return "레이저 없음";
}

/* =========================================================
 * 시안 1개 요약 텍스트
 * - globalIndex/allItems: 용량 초과로 메일이 여러 통에 나뉘어도
 *   "시안 번호"와 "파일명"이 이 메일 안에서만 1번부터 다시 매겨지지
 *   않고, 전체 주문 기준 번호를 그대로 유지하도록 함
   (실제 첨부되는 파일명도 전체 주문 기준으로 매겨지므로 일치시킴)
========================================================= */
function buildItemSummaryText(item, globalIndex, allItems = cartItems) {
  if (!item) return "";

  const qty = Math.max(1, toInt(item?.qty ?? 1, 1));

  const lines = [
    `[시안 ${globalIndex + 1}]`,
    `파일명: ${getItemDisplayName(item, allItems)}`,
    `규격: ${getCapTypeText(item?.capType)}`,
    `수량: ${numberWithCommas(qty)}개`,
    `레이저: ${getLaserText(item?.profile, item?.laser)}`,
  ];

  return lines.join("\n");
}

/* =========================================================
 * 전체 시안 요약 텍스트
 * - items: 이 메일에 실제로 포함되는 시안(배치)
 * - allItems: 주문 전체 시안 목록 (번호/파일명을 전체 기준으로 맞추기 위함)
========================================================= */
function buildItemsSummaryText(items = cartItems, allItems = items) {
  if (!Array.isArray(items) || !items.length) {
    return "추가된 시안이 없습니다.";
  }

  const blocks = items.map((item) =>
    buildItemSummaryText(item, allItems.indexOf(item), allItems),
  );

  const countLine =
    items.length === allItems.length
      ? `총 시안 수: ${allItems.length}개`
      : `이 메일에 포함된 시안: ${items.length}개 (전체 주문 시안: ${allItems.length}개 중)`;

  return [...blocks, "", countLine].join("\n\n");
}

/* =========================================================
 * 시안 1개 요약 HTML
 * - globalIndex/allItems: buildItemSummaryText와 동일한 이유로
 *   전체 주문 기준 번호/파일명을 유지
========================================================= */
function buildItemSummaryHtml(item, globalIndex, allItems = cartItems) {
  if (!item) return "";

  const esc = (v) => escapeHtml(String(v ?? "-"));
  const qty = Math.max(1, toInt(item?.qty ?? 1, 1));

  return `
    <div style="border:1px solid #e5e7eb;border-radius:12px;padding:14px;margin-bottom:12px;">
      <div style="font-weight:700;font-size:15px;margin-bottom:8px;">시안 ${globalIndex + 1}</div>

      <table cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;font-size:14px;line-height:1.6;">
        <tr>
          <td style="padding:4px 0;width:120px;font-weight:700;">파일명</td>
          <td style="padding:4px 0;">${esc(getItemDisplayName(item, allItems))}</td>
        </tr>
        <tr>
          <td style="padding:4px 0;font-weight:700;">규격</td>
          <td style="padding:4px 0;">${esc(getCapTypeText(item?.capType))}</td>
        </tr>
        <tr>
          <td style="padding:4px 0;font-weight:700;">수량</td>
          <td style="padding:4px 0;">${esc(numberWithCommas(qty))}개</td>
        </tr>
        <tr>
          <td style="padding:4px 0;font-weight:700;">레이저</td>
          <td style="padding:4px 0;">${esc(getLaserText(item?.profile, item?.laser))}</td>
        </tr>
      </table>
    </div>
  `;
}

/* =========================================================
 * 전체 시안 요약 HTML
 * - items: 이 메일에 실제로 포함되는 시안(배치)
 * - allItems: 주문 전체 시안 목록 (번호/파일명을 전체 기준으로 맞추기 위함)
========================================================= */
function buildItemsSummaryHtml(items = cartItems, allItems = items) {
  const esc = (v) => escapeHtml(String(v ?? "-"));

  if (!Array.isArray(items) || !items.length) {
    return `
      <div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.7;color:#111;">
        <p>추가된 시안이 없습니다.</p>
      </div>
    `;
  }

  const body = items
    .map((item) => buildItemSummaryHtml(item, allItems.indexOf(item), allItems))
    .join("");

  const countLine =
    items.length === allItems.length
      ? `<b>총 시안 수</b> : ${esc(allItems.length)}개`
      : `<b>이 메일에 포함된 시안</b> : ${esc(items.length)}개 (전체 주문 시안 ${esc(allItems.length)}개 중)`;

  return `
    <div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.7;color:#111;">
      <h2 style="margin:0 0 12px;">시안 접수 정보</h2>
      ${body}

      <div style="margin-top:16px;padding:14px;border:1px solid #e5e7eb;border-radius:12px;background:#fafafa;">
        <div>${countLine}</div>
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