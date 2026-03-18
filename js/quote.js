/* =========================================================
 * 견적 요청 입력값 동기화
========================================================= */
function syncQuoteExtrasFromUI() {
  quoteProd = safeTrim(quoteProdEl?.value) || "none";
  quoteDue = safeTrim(quoteDueEl?.value) || "";

  keyringQty = Math.max(0, toInt(keyringQtyEl?.value, 0));
  keyringLed = safeTrim(keyringLedEl?.value) || "none";
  keyringColor = safeTrim(keyringColorEl?.value) || "black";
  keyringSlots = safeTrim(keyringSlotsEl?.value) || "1";

  packType = safeTrim(packTypeEl?.value) || "none";
  packSheet = !!packSheetEl?.checked;
  packSticker = !!packStickerEl?.checked;
  quoteNotes = safeTrim(quoteNotesEl?.value) || "";
}

/* =========================================================
 * 견적 요청 데이터 반환
========================================================= */
function getQuoteRequestData() {
  syncQuoteExtrasFromUI();

  return {
    customerName: safeTrim(nameEl?.value),
    phone: safeTrim(phoneEl?.value),
    orderNo: safeTrim(orderEl?.value),
    email: safeTrim(emailEl?.value),

    profile: safeTrim(profileEl?.value),
    capType: safeTrim(capTypeEl?.value),
    laser: safeTrim(laserEl?.value),
    qty: Math.max(1, toInt(qtyEl?.value, 1)),

    quoteProd,
    quoteDue,
    keyringQty,
    keyringLed,
    keyringColor,
    keyringSlots,
    packType,
    packSheet,
    packSticker,
    quoteNotes,
    hasBizFile: !!bizFileDataUrl,
  };
}

/* =========================================================
 * 견적 요청 표시용 텍스트
========================================================= */
function getQuoteProdLabel(value) {
  switch (value) {
    case "10d":
      return "빠른제작(+20%) / 영업일 10일내 출고";
    case "5d":
      return "긴급제작(+30%) / 영업일 5일내 출고";
    case "none":
    default:
      return "일반 제작";
  }
}

function getLaserLabel(value) {
  switch (value) {
    case "black":
      return "블랙 (+800)";
    case "white":
      return "화이트 (+1,800)";
    case "none":
    default:
      return "없음";
  }
}

function getPackTypeLabel(value) {
  switch (value) {
    case "opp":
      return "개별 OPP 포장";
    case "byDesign":
      return "각 시안별 묶음 포장";
    case "set":
      return "세트 포장";
    case "case":
      return "케이스 제작";
    case "none":
    default:
      return "선택 안 함";
  }
}

function getLedLabel(value) {
  switch (value) {
    case "yes":
      return "있음";
    case "no":
      return "없음";
    case "none":
    default:
      return "선택 안 함";
  }
}

function getColorLabel(value) {
  switch (value) {
    case "white":
      return "투명";
    case "black":
    default:
      return "블랙";
  }
}

/* =========================================================
 * 견적 요청 요약 텍스트
========================================================= */
function buildQuoteSummaryText() {
  const data = getQuoteRequestData();

  return [
    `주문자명: ${data.customerName || "-"}`,
    `연락처: ${data.phone || "-"}`,
    `주문번호: ${data.orderNo || "-"}`,
    `이메일: ${data.email || "-"}`,
    "",
    `프로파일: ${data.profile || "-"}`,
    `규격: ${data.capType || "-"}`,
    `레이저: ${getLaserLabel(data.laser)}`,
    `수량: ${numberWithCommas(data.qty)}개`,
    "",
    `제작 일정: ${getQuoteProdLabel(data.quoteProd)}`,
    `희망 납기일: ${data.quoteDue || "-"}`,
    `사업자등록증 첨부: ${data.hasBizFile ? "있음" : "없음"}`,
    "",
    `키캡 키링 수량: ${numberWithCommas(data.keyringQty)}개`,
    `LED 유무: ${getLedLabel(data.keyringLed)}`,
    `키링 색상: ${getColorLabel(data.keyringColor)}`,
    `키링 종류: ${data.keyringSlots || "-"}구`,
    "",
    `포장 요구사항: ${getPackTypeLabel(data.packType)}`,
    `대지 포함: ${data.packSheet ? "예" : "아니오"}`,
    `스티커 제작: ${data.packSticker ? "예" : "아니오"}`,
    "",
    `기타 유의사항: ${data.quoteNotes || "-"}`,
  ].join("\n");
}

/* =========================================================
 * 견적 요청 요약 HTML
========================================================= */
function buildQuoteSummaryHtml() {
  const data = getQuoteRequestData();

  const esc = (v) => escapeHtml(String(v ?? "-"));

  return `
    <div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.7;color:#111;">
      <h2 style="margin:0 0 12px;">견적 요청 정보</h2>

      <table cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="padding:8px 0;font-weight:700;width:140px;">주문자명</td>
          <td style="padding:8px 0;">${esc(data.customerName)}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;font-weight:700;">연락처</td>
          <td style="padding:8px 0;">${esc(data.phone)}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;font-weight:700;">주문번호</td>
          <td style="padding:8px 0;">${esc(data.orderNo || "-")}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;font-weight:700;">이메일</td>
          <td style="padding:8px 0;">${esc(data.email)}</td>
        </tr>
      </table>

      <hr style="border:none;border-top:1px solid #ddd;margin:16px 0;" />

      <table cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="padding:8px 0;font-weight:700;width:140px;">프로파일</td>
          <td style="padding:8px 0;">${esc(data.profile)}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;font-weight:700;">규격</td>
          <td style="padding:8px 0;">${esc(data.capType)}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;font-weight:700;">레이저</td>
          <td style="padding:8px 0;">${esc(getLaserLabel(data.laser))}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;font-weight:700;">수량</td>
          <td style="padding:8px 0;">${esc(numberWithCommas(data.qty))}개</td>
        </tr>
      </table>

      <hr style="border:none;border-top:1px solid #ddd;margin:16px 0;" />

      <table cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="padding:8px 0;font-weight:700;width:140px;">제작 일정</td>
          <td style="padding:8px 0;">${esc(getQuoteProdLabel(data.quoteProd))}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;font-weight:700;">희망 납기일</td>
          <td style="padding:8px 0;">${esc(data.quoteDue)}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;font-weight:700;">사업자등록증 첨부</td>
          <td style="padding:8px 0;">${data.hasBizFile ? "있음" : "없음"}</td>
        </tr>
      </table>

      <hr style="border:none;border-top:1px solid #ddd;margin:16px 0;" />

      <table cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="padding:8px 0;font-weight:700;width:140px;">키캡 키링 수량</td>
          <td style="padding:8px 0;">${esc(numberWithCommas(data.keyringQty))}개</td>
        </tr>
        <tr>
          <td style="padding:8px 0;font-weight:700;">LED 유무</td>
          <td style="padding:8px 0;">${esc(getLedLabel(data.keyringLed))}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;font-weight:700;">키링 색상</td>
          <td style="padding:8px 0;">${esc(getColorLabel(data.keyringColor))}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;font-weight:700;">키링 종류</td>
          <td style="padding:8px 0;">${esc(data.keyringSlots)}구</td>
        </tr>
      </table>

      <hr style="border:none;border-top:1px solid #ddd;margin:16px 0;" />

      <table cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="padding:8px 0;font-weight:700;width:140px;">포장 요구사항</td>
          <td style="padding:8px 0;">${esc(getPackTypeLabel(data.packType))}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;font-weight:700;">대지 포함</td>
          <td style="padding:8px 0;">${data.packSheet ? "예" : "아니오"}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;font-weight:700;">스티커 제작</td>
          <td style="padding:8px 0;">${data.packSticker ? "예" : "아니오"}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;font-weight:700;vertical-align:top;">기타 유의사항</td>
          <td style="padding:8px 0;">${esc(data.quoteNotes || "-").replace(/\n/g, "<br>")}</td>
        </tr>
      </table>
    </div>
  `;
}
