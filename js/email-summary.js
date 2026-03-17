/* =========================================================
 * 주문 요약 생성
========================================================= */
function buildItemsSummary() {
  const arr = [];

  for (const it of cartItems) {
    const calc = calcLineTotal(it);
    const bg = getItemBgColor(it);

    arr.push({
      profile: it.profile,
      capType: it.capType,
      laser: it.profile === "OEM" ? it.laser || "none" : "none",
      bg,
      qty: calc.qty,
      unit: calc.unit,
      line: calc.afterDiscount,
      design: hasDesign(it) ? "있음" : "없음",
    });
  }

  return arr;
}

function buildItemsSummaryHtml(itemsSummary) {
  return itemsSummary
    .map((it, idx) => {
      const laserText = getLaserText(it.profile, it.laser);

      return `
        <div style="padding:10px 12px;border:1px solid #eaecf0;border-radius:10px;background:#fff;margin-bottom:8px;">
          <div style="font-weight:700;color:#1b2330;margin-bottom:4px;">시안 ${idx + 1}</div>
          <div>${it.profile} / ${it.capType} / ${laserText} / 배경 ${it.bg}</div>
          <div><b>수량</b> : ${Number(it.qty || 0).toLocaleString()}개</div>
          <div><b>단가</b> : ${Number(it.unit || 0).toLocaleString()}원</div>
          <div><b>합계(할인후)</b> : ${Number(it.line || 0).toLocaleString()}원</div>
          <div><b>시안</b> : ${it.design}</div>
        </div>
      `;
    })
    .join("");
}

function buildQuoteItemsSummaryHtml(itemsSummary) {
  return itemsSummary
    .map((it, idx) => {
      const laserText = getLaserText(it.profile, it.laser);

      return `
        <div style="padding:10px 12px;border:1px solid #eaecf0;border-radius:10px;background:#fff;margin-bottom:8px;">
          <div style="font-weight:700;color:#1b2330;margin-bottom:4px;">시안 ${idx + 1}</div>
          <div>${it.profile} / ${it.capType} / ${laserText} / 배경 ${it.bg}</div>
          <div><b>수량</b> : ${Number(it.qty || 0).toLocaleString()}개</div>
          <div><b>단가</b> : ${Number(it.unit || 0).toLocaleString()}원</div>
          <div><b>합계</b> : ${Number(it.line || 0).toLocaleString()}원</div>
        </div>
      `;
    })
    .join("");
}

function buildQuoteSectionHtml() {
  if (!quoteEnabled) return "";

  const prodValue = safeTrim(quoteProdEl?.value ?? quoteProd);
  const dueText = emptyText(quoteDueEl?.value ?? quoteDue);

  const prodText =
    prodValue === "10d"
      ? "빠른제작 (+20%) / 영업일 10일내 출고"
      : prodValue === "5d"
        ? "긴급제작 (+30%) / 영업일 5일내 출고"
        : "일반 제작";

  const keyringQtyText = String(
    Math.max(0, toInt(keyringQtyEl?.value ?? keyringQty, 0)),
  );

  const ledValue = safeTrim(keyringLedEl?.value ?? keyringLed);
  const ledText =
    ledValue === "yes" ? "있음" : ledValue === "no" ? "없음" : "선택 안 함";

  const keyringColorValue = safeTrim(keyringColorEl?.value ?? keyringColor);
  const keyringColorText =
    keyringColorValue === "black"
      ? "블랙"
      : keyringColorValue === "white"
        ? "화이트"
        : "선택 안 함";

  const keyringSlotsValue = safeTrim(keyringSlotsEl?.value ?? keyringSlots);
  const keyringSlotsText = keyringSlotsValue ? `${keyringSlotsValue}구` : "-";

  const packTypeValue = safeTrim(packTypeEl?.value ?? packType);
  const packTypeText =
    packTypeValue === "opp"
      ? "개별 OPP 포장"
      : packTypeValue === "byDesign"
        ? "각 시안별 묶음 포장"
        : packTypeValue === "set"
          ? "세트 포장"
          : packTypeValue === "case"
            ? "케이스 제작"
            : "선택 안 함";

  const packSheetText = ynText(!!(packSheetEl?.checked ?? packSheet));
  const packStickerText = ynText(!!(packStickerEl?.checked ?? packSticker));
  const notesText = emptyText(quoteNotesEl?.value ?? quoteNotes);

  return `
    <div style="margin-top:14px;padding:12px 14px;border:1px solid #fdcc63;border-radius:12px;background:#fff;">
      <div style="font-weight:700;margin-bottom:8px;">견적 요청 정보</div>

      <div style="margin-bottom:10px;">
        <div><b>제작 일정</b> : ${prodText}</div>
        <div><b>희망 납기일</b> : ${dueText}</div>
      </div>

      <div style="font-weight:700;margin:12px 0 8px;">추가 요청 사항</div>
      <div><b>키캡 키링 수량</b> : ${keyringQtyText}</div>
      <div><b>LED 유무</b> : ${ledText}</div>
      <div><b>키링 색상</b> : ${keyringColorText}</div>
      <div><b>키링 종류</b> : ${keyringSlotsText}</div>
      <div><b>포장 요구사항</b> : ${packTypeText}</div>
      <div><b>대지 포함</b> : ${packSheetText}</div>
      <div><b>스티커 제작</b> : ${packStickerText}</div>
      <div><b>기타 유의사항</b> : ${notesText}</div>
    </div>
  `;
}
