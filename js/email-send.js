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
    ? `첨부 용량 제한으로 인해 확인 메일이 총 <b>${batchTotal}통</b>으로 나뉘어 발송됩니다. 이 메일은 <b>${batchIndex}번째</b>이며, 순차적으로 도착하는 나머지 메일도 함께 확인해주세요.`
    : `첨부 용량 제한으로 인해 이 주문의 시안 메일이 총 <b>${batchTotal}통</b>으로 나뉘어 발송되었습니다. 이 메일은 <b>${batchIndex}번째</b>이며, 전체 시안을 확인하시려면 나머지 메일도 모두 확인해주세요.`;

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
// 수정 이유: 토스트에 원인 카테고리 안내만 뜨고 실제로 어떤 시안/어떤
// 이유로 실패했는지는 콘솔을 열어야만 알 수 있었음. 사용자(비개발자)가
// 무엇이 문제인지 스스로 판단하거나 문의할 때 그대로 전달할 수 있도록,
// 원본 오류 내용을 안내 문구 뒤에 괄호로 덧붙인다.
function formatErrDetail(err) {
  const detail = String(err?.message || err?.text || "").trim();
  if (!detail || detail === "[object Object]") return "";
  return detail.length > 160 ? `${detail.slice(0, 160)}…` : detail;
}

/* =========================================================
 * EmailJS 계정/과금 문제(관리자만 해결 가능) 여부 판단
 * - 수정 이유: 발신 계정 쪽 발송 한도/잔액이 꽉 찬 경우, 에러 메시지에
 *   "limit" 같은 단어가 섞여 있어 기존 "첨부 용량 초과" 분류에 잘못
 *   걸려서 "이미지 용량을 줄여보세요"라는 엉뚱한 안내가 떴음. 고객이
 *   스스로 해결할 수 없는 이런 계정 단위 문제는 별도로 구분해서, 토스트
 *   대신 "시스템 오류 - 관리자 문의" 팝업으로 명확히 안내한다.
 * - EmailJS가 실제로 어떤 문구/상태코드로 반환하는지 정확히 검증된 건
 *   아니라, 흔히 쓰이는 과금/한도 관련 키워드를 폭넓게 잡아둔 것.
 *   실제 발생 시 콘솔의 [시안 접수 상세 오류] 로그로 키워드를 다듬을 수 있음.
========================================================= */
function isEmailSystemIssue(err) {
  const message = String(err?.message || "").toLowerCase();
  const text = String(err?.text || "").toLowerCase();
  const status = String(err?.status || "").toLowerCase();
  const joined = `${message} ${text} ${status}`.trim();

  return (
    status === "402" ||
    joined.includes("insufficient") ||
    joined.includes("balance") ||
    joined.includes("quota") ||
    joined.includes("plan limit") ||
    joined.includes("monthly limit") ||
    joined.includes("account") ||
    joined.includes("suspended") ||
    joined.includes("blocked") ||
    joined.includes("exceeded the") ||
    joined.includes("reached the limit") ||
    joined.includes("한도") ||
    joined.includes("잔액")
  );
}

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

  const detail = formatErrDetail(err);
  const withDetail = (guide) => (detail ? `${guide} (오류 상세: ${detail})` : guide);

  // 수정 이유:
  // 계정/과금 문제는 다른 분류(특히 "limit" 키워드가 겹치는 첨부 용량
  // 초과 분류)보다 먼저 확인해야 오분류를 막을 수 있음
  if (isEmailSystemIssue(err)) {
    return withDetail("사이트 시스템 오류로 시안 접수가 되지 않았습니다. 관리자에게 문의해주세요.");
  }

  // 수정 이유:
  // ZIP/압축 단계에서 실패한 경우 사용자에게 용량/개수 조절 안내
  // (우리 코드가 직접 던지는 메시지는 한글이므로 한글 키워드도 함께 확인)
  if (
    joined.includes("jszip") ||
    joined.includes("zip") ||
    joined.includes("compression") ||
    joined.includes("압축")
  ) {
    return withDetail("압축파일 생성 중 오류가 발생했습니다. 시안 개수나 이미지 용량을 줄인 뒤 다시 시도해주세요.");
  }

  // 수정 이유:
  // 캔버스 렌더링 또는 첨부 생성 중 실패한 경우 분리
  if (
    joined.includes("canvas") ||
    joined.includes("dataurl") ||
    joined.includes("base64") ||
    joined.includes("filereader") ||
    joined.includes("image") ||
    joined.includes("캔버스") ||
    joined.includes("이미지") ||
    joined.includes("blob") ||
    joined.includes("could not be read")
  ) {
    return withDetail("시안 파일 생성 중 오류가 발생했습니다. 이미지 파일 상태나 용량을 확인한 뒤 다시 시도해주세요.");
  }

  // 수정 이유:
  // 네트워크성 실패를 따로 구분
  if (
    joined.includes("network") ||
    joined.includes("failed to fetch") ||
    joined.includes("fetch") ||
    joined.includes("timeout") ||
    joined.includes("load failed") ||
    joined.includes("네트워크")
  ) {
    return withDetail("네트워크 연결 문제로 시안 접수에 실패했습니다. 잠시 후 다시 시도해주세요.");
  }

  // 수정 이유:
  // 첨부 용량/전송 크기 초과 가능성 분리
  if (
    joined.includes("too large") ||
    joined.includes("payload") ||
    joined.includes("size") ||
    joined.includes("limit") ||
    joined.includes("413") ||
    joined.includes("용량")
  ) {
    return withDetail("첨부 용량이 너무 커서 접수에 실패했습니다. 이미지 용량이나 시안 개수를 줄인 뒤 다시 시도해주세요.");
  }

  // 수정 이유:
  // EmailJS 설정 문제 가능성 분리
  if (
    joined.includes("public key") ||
    joined.includes("service id") ||
    joined.includes("template id") ||
    joined.includes("the user id is required")
  ) {
    return withDetail("메일 설정 오류로 시안 접수에 실패했습니다. 관리자 확인이 필요합니다.");
  }

  // 수정 이유:
  // 그 외 알 수 없는 오류는 기존보다 조금 더 실질적인 기본 문구 사용
  return withDetail("시안 접수 중 오류가 발생했습니다. 이미지 용량이나 개수를 줄인 뒤 다시 시도해주세요.");
}

/* =========================================================
 * 첨부 용량 배치 기준
 * - EmailJS 첨부 한도(2MB)보다 여유 있게 안전 마진을 둠
 *   (템플릿 자체 HTML 용량 등도 고려)
 * - js/email-attachments.js의 buildAttachmentFileList()에서도 시안 1개의
 *   PNG+원본파일 합계가 이 기준을 넘지 않도록 원본파일을 제외하는 데
 *   재사용함 (한 시안이 이 기준을 넘으면 단독 배치로 빠지는데, 그 배치는
 *   용량 자체가 문제라 재시도해도 항상 실패하기 때문)
========================================================= */
const EMAIL_ATTACHMENT_BATCH_MAX_BYTES = 1_600_000;

/* =========================================================
 * 배치 1통 발송, 실패 시 대기 후 1회만 재시도 (총 2회 시도)
 * - 수정 이유: 순간적인 네트워크 오류로 배치 하나가 실패하면 그대로
 *   메일이 통째로 누락됐음. 같은 주문 안에서 8개 시안이 4통으로
 *   나뉘었는데 1통만 실패해도 그 안의 시안 정보가 전부 빠지므로,
 *   재시도 없이 바로 실패 처리하기엔 손실이 큼 - 1회 재시도로 완화.
 * - 되돌린 이유: 한때 재시도를 2회(최대 3~4회 시도)까지 늘렸었는데,
 *   "배치가 계속 누락되는" 진짜 원인은 발송량 제한이 아니라 시안 1개의
 *   첨부 용량 초과였음(별도로 근본 수정함, EMAIL_ATTACHMENT_BATCH_MAX_BYTES
 *   기준으로 원본파일을 미리 제외). 재시도는 요청이 서버까지는 갔는데
 *   응답만 못 받아 실패로 착각하는 경우에도 똑같이 재발송되므로, 시도
 *   횟수를 늘릴수록 "실제로는 이미 보내졌는데 중복으로 또 보내지는"
 *   위험만 커짐 - 진짜 원인이 따로 고쳐졌으니 재시도는 다시 최소화한다.
========================================================= */
async function sendBatchWithRetry(batch, sendFn, allItems, idx, total) {
  try {
    return await sendFn(batch, allItems, idx, total);
  } catch (err) {
    console.warn(`[메일 배치 ${idx}/${total} 1차 발송 실패, 재시도]`, err);
    await wait(1500);
    return await sendFn(batch, allItems, idx, total);
  }
}

/* =========================================================
 * 같은 수신자(회사 또는 고객) 앞으로 가는 배치 메일들을 순서대로 발송
 * - 수정 이유: batchItemsByWeight()로 나뉜 배치를 map()으로 한꺼번에
 *   병렬 발송하면, 배치 순서와 상관없이 emailjs 요청이 동시에 나가서
 *   메일 서버 처리 순서가 뒤섞여 (1/3)(2/3)(3/3)이 순서대로 도착한다는
 *   보장이 없었음. 같은 수신자 앞으로 가는 배치끼리는 하나가 끝난 뒤
 *   다음을 보내도록 순차 처리하고, 배치 사이에 짧은 텀을 둔다.
========================================================= */
async function sendBatchesInOrder(batches, sendFn, allItems) {
  const results = batches.map(() => null);

  for (let i = 0; i < batches.length; i += 1) {
    try {
      const value = await sendBatchWithRetry(batches[i], sendFn, allItems, i + 1, batches.length);
      results[i] = { status: "fulfilled", value };
    } catch (reason) {
      results[i] = { status: "rejected", reason };
    }

    if (i < batches.length - 1) await wait(600);
  }

  return results;
}

/* =========================================================
 * 시안 접수 메일 발송 통합
 * - 수정 이유:
 *   1) 첨부파일(PNG 렌더링 + 원본파일 인코딩)을 회사/고객 메일에
 *      각각 새로 만들지 않고 한 번만 만들어서 재사용 (대기 시간 단축)
 *   2) 같은 수신자 앞으로 가는 배치 메일끼리는 sendBatchesInOrder()로
 *      순서대로 발송해 도착 순서와 누락 문제를 방지
 *   3) 시안이 많아 첨부 용량 합계가 EmailJS 한도(2MB)를 넘으면
 *      (1/2), (2/2)처럼 여러 통으로 나눠서 발송 (원본파일 포함 여부에
 *      따라 회사/고객 메일의 배치 개수가 서로 다를 수 있음)
 * - 추가 수정 이유: 회사 발송과 고객 발송을 Promise.all()로 항상 동시에
 *   진행했더니, 배치가 여러 통으로 나뉘는 주문에서 두 수신자 앞 요청이
 *   겹쳐서 순간적으로 몰릴 때 발신 계정 쪽 발송량 제한에 걸려 요청은
 *   성공(resolve)했는데 실제로는 일부 메일이 조용히 누락되는 경우가
 *   있었음(재시도로도 못 잡음). 배치가 1통뿐인 대부분의 주문은 기존처럼
 *   병렬로 유지해 접수 속도를 지키고, 여러 통으로 나뉘는 주문만 회사 →
 *   고객 순으로 완전히 순차 처리해 동시 발송량 자체를 줄인다.
========================================================= */
async function sendOrderEmails() {
  const orderNo = safeTrim(orderEl?.value) || "order";

  // 수정 이유: 이 아래(첨부 렌더링/배치 생성) 단계에서 예외가 나면
  // emailjs.send()를 한 번도 시도하지 못한 채 confirmOrder()의 범용
  // catch로 떨어져 "시안 접수 중 오류가 발생했습니다"라는 뭉뚱그려진
  // 메시지만 뜨고 실패 원인을 알 수 없었음. getDesignSubmitFailMessage()로
  // 원인별 안내 문구를 재사용할 수 있도록 여기서도 잡아서 반환한다.
  let fileList;
  let companyBatches;
  let customerBatches;
  let needsCustomerEmail;

  try {
    fileList = await buildAttachmentFileList(orderNo);

    companyBatches = batchItemsByWeight(
      fileList.items,
      fileList.itemFiles,
      EMAIL_ATTACHMENT_BATCH_MAX_BYTES,
      { includeOriginals: true },
    );

    needsCustomerEmail =
      !!EMAILJS_DESIGN_CUSTOMER_TEMPLATE_ID && !!safeTrim(emailEl?.value);

    customerBatches = needsCustomerEmail
      ? batchItemsByWeight(
          fileList.items,
          fileList.itemFiles,
          EMAIL_ATTACHMENT_BATCH_MAX_BYTES,
          { includeOriginals: false },
        )
      : [];
  } catch (err) {
    return {
      ok: false,
      companyOk: false,
      customerOk: false,
      message: getDesignSubmitFailMessage(err),
      systemIssue: isEmailSystemIssue(err),
      companyError: err,
      customerError: null,
    };
  }

  const allItems = fileList.items;

  // 배치가 여러 통으로 나뉘는 주문만 회사 → 고객 순차 처리로 동시 발송량을
  // 낮추고, 배치가 1통뿐인 일반적인 주문은 기존처럼 병렬로 빠르게 처리한다.
  const isSplitOrder = companyBatches.length > 1 || customerBatches.length > 1;

  let companyResults;
  let customerResults;

  if (isSplitOrder) {
    companyResults = await sendBatchesInOrder(companyBatches, sendDesignToCompany, allItems);
    if (customerBatches.length) await wait(1200);
    customerResults = await sendBatchesInOrder(customerBatches, sendDesignToCustomer, allItems);
  } else {
    [companyResults, customerResults] = await Promise.all([
      sendBatchesInOrder(companyBatches, sendDesignToCompany, allItems),
      sendBatchesInOrder(customerBatches, sendDesignToCustomer, allItems),
    ]);
  }

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
      systemIssue: isEmailSystemIssue(companyError),
      companyError,
      customerError,
    };
  }

  // 수정 이유: 원본파일 첨부에 실패한 시안이 있으면 접수는 정상 처리돼도
  // 회사에 원본파일이 안 갔다는 걸 알려줘야 놓치지 않음
  const skippedOriginals = fileList.skippedOriginals || [];
  const originalFileWarning = skippedOriginals.length
    ? `일부 시안의 레이저 원본파일 첨부에 실패했습니다 (PNG 시안은 정상 접수됨): ${skippedOriginals
        .map((s) => `${s.filename}(${s.reason})`)
        .join(", ")}`
    : "";

  return {
    ok: true,
    companyOk,
    customerOk,
    originalFileWarning,
    customerWarning:
      !customerOk && customerError
        ? "시안은 정상 접수되었지만 고객 확인 메일 발송은 실패했습니다."
        : "",
    customerError,
  };
}
