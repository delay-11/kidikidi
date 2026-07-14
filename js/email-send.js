/* moved from js/design/design-email-send.js */
/* =========================================================
 * 시안 첨부 파라미터 생성
 * - 수정 이유: 회사/고객 메일을 만들 때마다 PNG 렌더링 + 원본파일
 *   인코딩을 매번 새로 하면 접수 대기 시간이 거의 2배가 됨.
 *   sendOrderEmails()에서 한 번만 만든 fileList를 재사용한다.
========================================================= */
async function buildDesignAttachmentParams(batch) {
  const orderNo = safeTrim(orderEl?.value) || "order";
  return await packAttachmentParams(orderNo, batch.items, batch.files, {
    includeOriginals: true, // batch.files는 batchItemsByWeight()에서 이미 걸러진 상태
  });
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
 * 용량 초과로 여러 통에 나눠 보낼 때 붙는 라벨
 * - 배치가 1개뿐이면(기존과 동일한 대부분의 주문) 빈 문자열
 * - 2개 이상이면 "(1/3)" 형태
========================================================= */
function getBatchLabel(batchIndex, batchTotal) {
  return batchTotal > 1 ? `(${batchIndex}/${batchTotal})` : "";
}

/* =========================================================
 * 여러 통으로 나뉘어 발송될 때만 보이는 안내 배너
 * - 배치가 1개뿐이면 빈 문자열 (기존 템플릿 그대로, 아무것도 안 보임)
 * - audience: "company" | "customer" - 문구를 다르게 함
 *   (고객은 "메일이 여러 통 온 이유"를, 회사는 "모든 메일을 확인해야
 *   전체 시안을 받는다"는 것을 알아야 하므로)
========================================================= */
function getBatchNoticeHtml(batchIndex, batchTotal, audience) {
  if (batchTotal <= 1) return "";

  const message =
    audience === "customer"
      ? `접수하신 시안이 많아 확인 메일이 총 <b>${batchTotal}통</b>으로 나뉘어 발송됩니다. 이 메일은 <b>${batchIndex}번째</b>이며, 순차적으로 도착하는 다른 메일도 함께 확인해주세요.`
      : `이 주문은 시안이 많아 총 <b>${batchTotal}통</b>으로 나뉘어 발송되었습니다. 이 메일은 <b>${batchIndex}번째</b>이며, 전체 시안을 받으시려면 나머지 메일도 모두 확인해주세요.`;

  return `
    <div style="margin:0 0 14px;padding:12px 14px;border:1px solid #fdcc63;border-radius:12px;background:#fffaeb;color:#1b2330;font-size:13px;line-height:1.6;">
      📦 ${message}
    </div>
  `;
}

/* =========================================================
 * 회사 발송용 메일 파라미터
 * - 회사는 실제 제작에 쓰이므로 레이저 원본파일까지 전부 포함
 * - allItems: 주문 전체 시안(용량 안내용), batch: 이 메일에 실제로
 *   첨부되는 시안 부분집합
========================================================= */
async function buildDesignCompanyEmailParams(batch, allItems, batchIndex, batchTotal) {
  const orderNo = safeTrim(orderEl?.value) || "-";
  const attachment = await buildDesignAttachmentParams(batch);
  const batchLabel = getBatchLabel(batchIndex, batchTotal);

  return {
    to_email: COMPANY_EMAIL,
    customer_name: safeTrim(nameEl?.value) || "고객",
    customer_order_no: orderNo,
    customer_email: safeTrim(emailEl?.value) || "-",
    reply_to: safeTrim(emailEl?.value) || COMPANY_EMAIL,

    batch_label: batchLabel,
    batch_index: String(batchIndex),
    batch_total: String(batchTotal),
    batch_notice_html: getBatchNoticeHtml(batchIndex, batchTotal, "company"),

    design_type_count: String(getDesignTypeCount(allItems)),
    total_qty: String(getTotalQty(allItems)),
    items_summary_text: buildItemsSummaryText(batch.items, allItems),
    items_summary_html: buildItemsSummaryHtml(batch.items, allItems),
    attachment_summary_html:
      attachment?.attachment_summary_html || "<div>-</div>",

    ...attachment,
  };
}

/* =========================================================
 * 고객 발송용 메일 파라미터
 * - 수정 이유: 고객에게는 확인용 PNG만 있으면 되고 레이저 원본파일은
 *   필요 없음 - 원본파일(최대 15MB)까지 같이 보내면 첨부 용량 제한에
 *   걸려 접수 실패 위험이 커지므로 고객 메일에서는 제외
========================================================= */
async function buildDesignCustomerEmailParams(batch, allItems, batchIndex, batchTotal) {
  const orderNo = safeTrim(orderEl?.value) || "-";
  const attachment = await buildDesignAttachmentParams(batch);
  const batchLabel = getBatchLabel(batchIndex, batchTotal);

  return {
    to_email: safeTrim(emailEl?.value) || "",
    customer_name: safeTrim(nameEl?.value) || "고객",
    customer_order_no: orderNo,
    reply_to: COMPANY_EMAIL,

    batch_label: batchLabel,
    batch_index: String(batchIndex),
    batch_total: String(batchTotal),
    batch_notice_html: getBatchNoticeHtml(batchIndex, batchTotal, "customer"),

    design_type_count: String(getDesignTypeCount(allItems)),
    total_qty: String(getTotalQty(allItems)),
    items_summary_text: buildItemsSummaryText(batch.items, allItems),
    items_summary_html: buildItemsSummaryHtml(batch.items, allItems),
    attachment_summary_html:
      attachment?.attachment_summary_html || "<div>-</div>",

    ...attachment,
  };
}

/* =========================================================
 * 회사로 시안 접수 메일 발송 (배치 1통)
========================================================= */
async function sendDesignToCompany(batch, allItems, batchIndex, batchTotal) {
  ensureEmailJsInit();
  const params = await buildDesignCompanyEmailParams(batch, allItems, batchIndex, batchTotal);

  await emailjs.send(
    EMAILJS_SERVICE_ID,
    EMAILJS_DESIGN_COMPANY_TEMPLATE_ID,
    params,
    EMAILJS_PUBLIC_KEY,
  );

  return true;
}

/* =========================================================
 * 고객에게 접수 확인 메일 발송 (배치 1통)
========================================================= */
async function sendDesignToCustomer(batch, allItems, batchIndex, batchTotal) {
  if (!EMAILJS_DESIGN_CUSTOMER_TEMPLATE_ID) return true;

  const customerEmail = safeTrim(emailEl?.value);
  if (!customerEmail) return true;

  ensureEmailJsInit();
  const params = await buildDesignCustomerEmailParams(batch, allItems, batchIndex, batchTotal);

  await emailjs.send(
    EMAILJS_SERVICE_ID,
    EMAILJS_DESIGN_CUSTOMER_TEMPLATE_ID,
    params,
    EMAILJS_PUBLIC_KEY,
  );

  return true;
}

/* =========================================================
 * 시안 접수 실패 문구 정리
 * 수정 이유:
 * - 기존에는 실패 원인이 달라도 밖에서는 구분할 수 없었음
 * - 전송 구조는 건드리지 않고 사용자용 안내 문구만 세분화
========================================================= */
function getDesignSubmitFailMessage(err) {
  const message = String(err?.message || "").toLowerCase();
  const text = String(err?.text || "").toLowerCase();
  const status = String(err?.status || "").toLowerCase();
  const joined = `${message} ${text} ${status}`.trim();

  // 수정 이유:
  // 실제 콘솔에서는 원본 오류를 확인할 수 있게 그대로 남겨둠
  console.error("[시안 접수 상세 오류]", {
    message: err?.message || "",
    text: err?.text || "",
    status: err?.status || "",
    fullError: err,
  });

  // 수정 이유:
  // ZIP/압축 단계에서 실패한 경우 사용자에게 용량/개수 조절 안내
  if (
    joined.includes("jszip") ||
    joined.includes("zip") ||
    joined.includes("compression")
  ) {
    return "압축파일 생성 중 오류가 발생했습니다. 시안 개수나 이미지 용량을 줄인 뒤 다시 시도해주세요.";
  }

  // 수정 이유:
  // 캔버스 렌더링 또는 첨부 생성 중 실패한 경우 분리
  if (
    joined.includes("canvas") ||
    joined.includes("dataurl") ||
    joined.includes("base64") ||
    joined.includes("filereader") ||
    joined.includes("image")
  ) {
    return "시안 파일 생성 중 오류가 발생했습니다. 이미지 파일 상태나 용량을 확인한 뒤 다시 시도해주세요.";
  }

  // 수정 이유:
  // 네트워크성 실패를 따로 구분
  if (
    joined.includes("network") ||
    joined.includes("failed to fetch") ||
    joined.includes("fetch") ||
    joined.includes("timeout") ||
    joined.includes("load failed")
  ) {
    return "네트워크 연결 문제로 시안 접수에 실패했습니다. 잠시 후 다시 시도해주세요.";
  }

  // 수정 이유:
  // 첨부 용량/전송 크기 초과 가능성 분리
  if (
    joined.includes("too large") ||
    joined.includes("payload") ||
    joined.includes("size") ||
    joined.includes("limit") ||
    joined.includes("413")
  ) {
    return "첨부 용량이 너무 커서 접수에 실패했습니다. 이미지 용량이나 시안 개수를 줄인 뒤 다시 시도해주세요.";
  }

  // 수정 이유:
  // EmailJS 설정 문제 가능성 분리
  if (
    joined.includes("public key") ||
    joined.includes("service id") ||
    joined.includes("template id") ||
    joined.includes("the user id is required")
  ) {
    return "메일 설정 오류로 시안 접수에 실패했습니다. 관리자 확인이 필요합니다.";
  }

  // 수정 이유:
  // 그 외 알 수 없는 오류는 기존보다 조금 더 실질적인 기본 문구 사용
  return "시안 접수 중 오류가 발생했습니다. 이미지 용량이나 개수를 줄인 뒤 다시 시도해주세요.";
}

/* =========================================================
 * 첨부 용량 배치 기준
 * - EmailJS 첨부 한도(2MB)보다 여유 있게 안전 마진을 둠
 *   (템플릿 자체 HTML 용량 등도 고려)
========================================================= */
const EMAIL_ATTACHMENT_BATCH_MAX_BYTES = 1_600_000;

/* =========================================================
 * 시안 접수 메일 발송 통합
 * - 수정 이유:
 *   1) 첨부파일(PNG 렌더링 + 원본파일 인코딩)을 회사/고객 메일에
 *      각각 새로 만들지 않고 한 번만 만들어서 재사용 (대기 시간 단축)
 *   2) 회사/고객 메일 발송을 순차적으로 기다리지 않고 동시에 진행
 *      (하나가 끝나야 다음이 시작되던 것 -> 병렬 처리로 대기 시간 단축)
 *   3) 시안이 많아 첨부 용량 합계가 EmailJS 한도(2MB)를 넘으면
 *      (1/2), (2/2)처럼 여러 통으로 나눠서 발송 (원본파일 포함 여부에
 *      따라 회사/고객 메일의 배치 개수가 서로 다를 수 있음)
========================================================= */
async function sendOrderEmails() {
  const orderNo = safeTrim(orderEl?.value) || "order";
  const fileList = await buildAttachmentFileList(orderNo);
  const allItems = fileList.items;

  const companyBatches = batchItemsByWeight(
    allItems,
    fileList.itemFiles,
    EMAIL_ATTACHMENT_BATCH_MAX_BYTES,
    { includeOriginals: true },
  );

  const needsCustomerEmail =
    !!EMAILJS_DESIGN_CUSTOMER_TEMPLATE_ID && !!safeTrim(emailEl?.value);

  const customerBatches = needsCustomerEmail
    ? batchItemsByWeight(
        allItems,
        fileList.itemFiles,
        EMAIL_ATTACHMENT_BATCH_MAX_BYTES,
        { includeOriginals: false },
      )
    : [];

  const companySends = companyBatches.map((batch, idx) =>
    sendDesignToCompany(batch, allItems, idx + 1, companyBatches.length),
  );
  const customerSends = customerBatches.map((batch, idx) =>
    sendDesignToCustomer(batch, allItems, idx + 1, customerBatches.length),
  );

  const [companyResults, customerResults] = await Promise.all([
    Promise.allSettled(companySends),
    Promise.allSettled(customerSends),
  ]);

  const companyOk =
    companyResults.length > 0 && companyResults.every((r) => r.status === "fulfilled");
  const companyError =
    companyResults.find((r) => r.status === "rejected")?.reason || null;

  const customerOk =
    !needsCustomerEmail || customerResults.every((r) => r.status === "fulfilled");
  const customerError =
    customerResults.find((r) => r.status === "rejected")?.reason || null;

  if (companyError) console.error("[회사 메일 발송 실패]", companyError);
  if (customerError) console.error("[고객 메일 발송 실패]", customerError);

  if (!companyOk) {
    console.error("[시안 접수 실패] 회사 메일 발송 실패");
    return {
      ok: false,
      companyOk,
      customerOk,
      message: getDesignSubmitFailMessage(companyError), // 수정 이유: 사용자에게 보여줄 상세 실패 문구 반환
      companyError,
      customerError,
    };
  }

  return {
    ok: true,
    companyOk,
    customerOk,
    customerWarning:
      !customerOk && customerError
        ? "시안은 정상 접수되었지만 고객 확인 메일 발송은 실패했습니다."
        : "",
    customerError,
  };
}