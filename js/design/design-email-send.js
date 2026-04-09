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
  const attachment = await buildDesignAttachmentParams();

  return {
    to_email: COMPANY_EMAIL,
    customer_name: safeTrim(nameEl?.value) || "고객",
    customer_order_no: orderNo,
    customer_email: safeTrim(emailEl?.value) || "-",
    reply_to: safeTrim(emailEl?.value) || COMPANY_EMAIL,

    design_type_count: String(getDesignTypeCount(cartItems)),
    total_qty: String(getTotalQty(cartItems)),
    items_summary_html: buildItemsSummaryHtml(cartItems),
    attachment_summary_html:
      attachment?.attachment_summary_html || "<div>-</div>",

    ...attachment,
  };
}

/* =========================================================
 * 고객 발송용 메일 파라미터
========================================================= */
async function buildDesignCustomerEmailParams() {
  const orderNo = safeTrim(orderEl?.value) || "-";
  const attachment = await buildDesignAttachmentParams();

  return {
    to_email: safeTrim(emailEl?.value) || "",
    customer_name: safeTrim(nameEl?.value) || "고객",
    customer_order_no: orderNo,
    reply_to: COMPANY_EMAIL,

    design_type_count: String(getDesignTypeCount(cartItems)),
    total_qty: String(getTotalQty(cartItems)),
    items_summary_html: buildItemsSummaryHtml(cartItems),
    attachment_summary_html:
      attachment?.attachment_summary_html || "<div>-</div>",

    ...attachment,
  };
}

/* =========================================================
 * 회사로 시안 접수 메일 발송
========================================================= */
async function sendDesignToCompany() {
  ensureEmailJsInit();
  const params = await buildDesignCompanyEmailParams();

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
 * 시안 접수 메일 발송 통합
========================================================= */
async function sendOrderEmails() {
  let companyOk = false;
  let customerOk = false;
  let companyError = null;
  let customerError = null;

  try {
    await sendDesignToCompany();
    companyOk = true;
  } catch (err) {
    companyError = err; // 수정 이유: 회사 메일 실패 원인을 밖으로 전달하기 위해 저장
    console.error("[회사 메일 발송 실패]", err);
  }

  try {
    await sendDesignToCustomer();
    customerOk = true;
  } catch (err) {
    customerError = err; // 수정 이유: 고객 메일 실패 여부도 추적 가능하게 저장
    console.error("[고객 메일 발송 실패]", err);
  }

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