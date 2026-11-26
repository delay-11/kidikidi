/* moved from js/common/modal.js */
/* =========================================================
 * 시안 확정 모달 기본 상태 복원
========================================================= */
function resetConfirmModal() {
  const titleEl = document.getElementById("confirmModalTitle");
  if (titleEl) titleEl.textContent = "시안 최종 확정";

  if (confirmModalBodyEl) {
    confirmModalBodyEl.innerHTML = "";
  }

  if (confirmModalCancelEl) {
    confirmModalCancelEl.style.display = "";
    confirmModalCancelEl.disabled = false;
    confirmModalCancelEl.textContent = "취소";
  }

  if (confirmModalOkEl) {
    confirmModalOkEl.disabled = false;
    confirmModalOkEl.textContent = "확정하기";
  }

  confirmModalEl?.classList.remove("single", "loading", "isFail");
}

/* =========================================================
 * 시안 확정 모달 열기
========================================================= */
function openConfirmModal() {
  if (!confirmModalEl || !confirmModalBodyEl) return;

  resetConfirmModal();

  confirmModalBodyEl.innerHTML = `
시안을 최종 확정하시겠습니까?

시안 확정 후에는 수정이 어려울 수 있습니다.
업로드한 이미지, 선택한 규격, 수량을 다시 한 번 확인해주세요.

확정을 누르면 시안이 접수됩니다.
접수된 시안은 담당자가 검토 후 이메일로 안내드릴 예정입니다.

※ 해당 시안은 추후 상세페이지 내 예시 이미지로 활용될 수 있습니다.
※ 여러 시안을 제작한 경우 [시안 추가] 버튼으로 등록된 시안만 접수됩니다.
※ 확인에는 일정 시간이 소요될 수 있습니다.
  `;

  confirmModalEl.classList.add("show");
  confirmModalEl.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
}

/* =========================================================
 * 시안 접수 처리 중 로딩 상태로 전환
 * - 수정 이유: [확정하기] 클릭 후 실제 접수(첨부 렌더링 + 메일 발송)가
 *   끝날 때까지 걸리는 시간 동안, 기존에는 잠깐 뜨는 토스트 하나뿐이라
 *   화면이 멈춘 것처럼 보였음. 이미 열려있는 확정 모달을 그대로
 *   로딩 화면으로 전환해서 처리 중임을 명확히 보여준다.
========================================================= */
function showConfirmModalLoading() {
  if (!confirmModalEl || !confirmModalBodyEl) return;

  const titleEl = document.getElementById("confirmModalTitle");
  if (titleEl) titleEl.textContent = "시안 접수 중";

  // 진행 링: 실제 진행률(시안 준비 → 메일 발송)을 updateConfirmProgress()로 갱신한다.
  const r = 40;
  const circumference = 2 * Math.PI * r;
  confirmModalBodyEl.innerHTML = `
    <div class="confirmModalLoading confirmProgress">
      <div class="confirmProgressRing" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">
        <svg viewBox="0 0 96 96" aria-hidden="true">
          <circle class="confirmProgressTrack" cx="48" cy="48" r="${r}" />
          <circle class="confirmProgressBar" cx="48" cy="48" r="${r}"
            stroke-dasharray="${circumference}" stroke-dashoffset="${circumference}" />
        </svg>
        <span class="confirmProgressPct"><b>0</b><small>%</small></span>
        <span class="confirmProgressDone" aria-hidden="true">
          <svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
        </span>
      </div>
      <p class="confirmProgressStage"><span class="confirmProgressText">시안을 접수하고 있습니다</span><span class="confirmProgressCount"></span></p>
      <div class="confirmProgressSteps">
        <b class="isOn" data-step="send">메일 보내기</b><i></i><b data-step="done">완료</b>
      </div>
      <p class="confirmProgressWarn">접수가 끝날 때까지 창을 닫거나 새로고침하지 마세요.</p>
    </div>
  `;

  confirmModalEl.classList.add("show", "loading");
  confirmModalEl.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
}

function updateConfirmProgress({ percent = 0, text = "", count = "" } = {}) {
  const box = confirmModalBodyEl?.querySelector(".confirmProgress");
  if (!box) return;

  // 이전 값보다 줄어들지 않게 (병렬 발송 콜백 순서가 섞여도 링이 뒤로 가지 않음)
  const pct = Math.max(Number(box.dataset.percent || 0), Math.min(100, Math.max(0, Math.round(percent))));
  box.dataset.percent = String(pct);

  const bar = box.querySelector(".confirmProgressBar");
  const circumference = Number(bar?.getAttribute("stroke-dasharray")) || 0;
  if (bar) bar.setAttribute("stroke-dashoffset", String(circumference * (1 - pct / 100)));

  box.querySelector(".confirmProgressRing")?.setAttribute("aria-valuenow", String(pct));
  const pctEl = box.querySelector(".confirmProgressPct b");
  if (pctEl) pctEl.textContent = String(pct);
  if (text) box.querySelector(".confirmProgressText").textContent = text;
  box.querySelector(".confirmProgressCount").textContent = count;
}

// 접수 성공 시 100% + 완료 표시. 잠깐 보여준 뒤 기존 "접수 완료" 안내 팝업으로 넘어간다.
function completeConfirmProgress() {
  const box = confirmModalBodyEl?.querySelector(".confirmProgress");
  if (!box) return;

  updateConfirmProgress({ percent: 100, text: "접수 완료", count: "" });
  box.classList.add("isDone");
  const titleEl = document.getElementById("confirmModalTitle");
  if (titleEl) titleEl.textContent = "접수 완료";
  box.querySelector('[data-step="send"]')?.classList.replace("isOn", "isDone");
  box.querySelector('[data-step="done"]')?.classList.add("isDone");
}

/* =========================================================
 * 시스템 오류 안내 모달 열기 (관리자 문의 안내)
 * - 수정 이유: EmailJS 계정/한도 문제처럼 고객이 스스로 해결할 수 없는
 *   시스템 오류는, 기존처럼 "이미지 용량을 줄여보세요" 류의 토스트가
 *   뜨면 고객이 계속 무의미하게 재시도하며 헷갈릴 수 있음. 이런
 *   경우에는 토스트 대신 팝업으로 명확히 "시스템 오류 - 관리자 문의"
 *   임을 알려준다.
========================================================= */
function openSystemErrorModal(message) {
  if (!confirmModalEl || !confirmModalBodyEl) return;

  resetConfirmModal();

  const titleEl = document.getElementById("confirmModalTitle");
  if (titleEl) titleEl.textContent = "시스템 오류";

  confirmModalBodyEl.textContent =
    message || "시스템 오류로 시안 접수가 되지 않았습니다. 관리자에게 문의해주세요.";

  confirmModalEl.classList.add("show", "single");
  confirmModalEl.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");

  if (confirmModalCancelEl) {
    confirmModalCancelEl.style.display = "none";
  }

  if (confirmModalOkEl) {
    confirmModalOkEl.textContent = "확인";
  }
}

/* =========================================================
 * 시안 접수 실패 안내 모달 (대체 접수: 시안 파일 다운로드)
 * - 수정 이유: 기존에는 실패 시 토스트만 잠깐 뜨고 확정 질문으로
 *   돌아갔는데, 고객 환경 문제로 계속 실패하면 고객이 할 수 있는 게
 *   없었음. 실패 원인 + 해볼 방법을 팝업으로 보여주고, 시안 파일을
 *   내려받아 메일로 직접 보낼 수 있는 대체 접수 경로를 제공한다.
 * - [다시 시도]는 기존 [확정하기]와 같은 버튼이라 그대로 재접수된다.
========================================================= */
/* =========================================================
 * 인앱 브라우저 안내 (접수 실패 팝업 안)
 * - 수정 이유: 카카오톡/네이버 앱 등 앱 안에서 열린 화면은 파일 다운로드가
 *   막혀 있는 경우가 많아 [시안 파일 다운로드]를 눌러도 반응이 없을 수
 *   있음. 이때 다른 브라우저로 여는 방법을 안내한다.
 * - 작업 중인 시안은 지금 브라우저에만 저장되어 있으므로, 다른 브라우저로
 *   옮기면 시안을 다시 만들어야 한다는 점도 함께 알려준다.
========================================================= */
const SUBMIT_FAIL_ICONS = {
  share: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 15V3.5"/><path d="M7.5 8 12 3.5 16.5 8"/><path d="M5 12.5v6A2.5 2.5 0 0 0 7.5 21h9a2.5 2.5 0 0 0 2.5-2.5v-6"/></svg>',
  download: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3.5V15"/><path d="M7.5 10.5 12 15l4.5-4.5"/><path d="M4.5 19.5h15"/></svg>',
  copy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="8.5" y="8.5" width="12" height="12" rx="2.5"/><path d="M15.5 8.5V6a2.5 2.5 0 0 0-2.5-2.5H6A2.5 2.5 0 0 0 3.5 6v7A2.5 2.5 0 0 0 6 15.5h2.5"/></svg>',
  pin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  phone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6.5" y="2.5" width="11" height="19" rx="2.5"/><path d="M11 18h2"/></svg>',
  external: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 4.5h5.5V10"/><path d="M19.5 4.5 11 13"/><path d="M18 14v4.5a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 4 18.5v-11A1.5 1.5 0 0 1 5.5 6H10"/></svg>',
};

function buildInAppBrowserNoticeHtml() {
  const appName = typeof detectInAppBrowser === "function" ? detectInAppBrowser() : "";
  if (!appName) return "";

  return `<div class="submitFailInApp">
<p class="submitFailHead">${SUBMIT_FAIL_ICONS.phone}외부 앱을 통해 접속 중이신가요?</p>
<p>카카오톡, 네이버 등 앱 내 브라우저에서는 파일 다운로드가 제한될 수 있어요. 다운로드가 되지 않는 경우, 아래 버튼을 통해 다른 브라우저로 접속해 주세요.</p>
<p class="submitFailSub">※ 작업한 시안은 현재 화면에만 저장되어 있어, 다른 브라우저에서는 시안을 다시 만들어야 할 수 있어요.</p>
<button type="button" class="submitFailBtn isSecondary btn" id="submitFailExternal">다른 브라우저로 열기${SUBMIT_FAIL_ICONS.external}</button>
</div>`;
}

// [다른 브라우저로 열기] - 카카오톡/라인/안드로이드는 바로 외부 브라우저로 열고,
// 그 외(아이폰의 네이버 앱 등 바로 열 방법이 없는 경우)는 주소를 복사해 안내한다.
async function openInExternalBrowser() {
  const url = typeof getOpenExternalBrowserUrl === "function" ? getOpenExternalBrowserUrl() : "";
  if (url) {
    location.href = url;
    return;
  }
  const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent || "");
  const where = isIOS ? "Safari" : "크롬 등 다른 브라우저";
  try {
    await navigator.clipboard.writeText(location.href);
    showToast?.(`사이트 주소를 복사했어요. ${where}를 열어 주소창에 붙여넣어 주세요.`, "info", 5000);
  } catch {
    showToast?.(`화면 오른쪽 위(또는 아래) 메뉴에서 "${isIOS ? "Safari로 열기" : "다른 브라우저로 열기"}"를 눌러주세요.`, "info", 5000);
  }
}

function openSubmitFailModal(message, fileList = null) {
  if (!confirmModalEl || !confirmModalBodyEl) return;

  resetConfirmModal();

  const titleEl = document.getElementById("confirmModalTitle");
  if (titleEl) titleEl.textContent = "시안 접수가 완료되지 않았어요.";

  const canDownload = Array.isArray(fileList?.files) && fileList.files.length > 0;
  const esc = (v) =>
    String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

  const html = `<div class="submitFail">
<div class="submitFailHero">
<p class="submitFailTitle">시안 접수가 완료되지 않았어요.</p>
<p class="submitFailMsg">${esc(message || "시안 접수에 실패했어요.").replace(/\n/g, "<br>")}</p>
</div>
${
    canDownload
      ? `<div class="submitFailCard">
<p class="submitFailHead">계속해서 접수가 안 되나요?</p>
<p class="submitFailDesc">아래 버튼을 통해 시안 파일을 보내주시거나, 다운로드 후 <button type="button" class="submitFailEmail" id="submitFailEmail" title="메일 주소 복사">${esc(COMPANY_EMAIL)}${SUBMIT_FAIL_ICONS.copy}</button>으로 보내주세요.</p>
<p class="submitFailMust">${SUBMIT_FAIL_ICONS.pin}메일 제목에 주문자명과 주문번호를 반드시 기재해 주세요.</p>
<p class="submitFailSub">시안을 처음부터 다시 만들 필요는 없어요.</p>
<div class="submitFailBtns">
<button type="button" class="submitFailBtn isPrimary btn" id="submitFailShare" hidden>${SUBMIT_FAIL_ICONS.share}메일·카카오톡으로 시안 보내기</button>
<button type="button" class="submitFailBtn isSecondary btn" id="submitFailDownload">${SUBMIT_FAIL_ICONS.download}<span>시안 파일 다운로드 (ZIP)</span></button>
</div>
</div>
${buildInAppBrowserNoticeHtml()}`
      : ""
  }
</div>`;
  // 모달 본문은 white-space: pre-line이라 태그 사이 줄바꿈이 빈 줄로 보이므로 제거
  confirmModalBodyEl.innerHTML = html.replace(/>\s*\n\s*</g, "><").replace(/\n/g, "");

  document.getElementById("submitFailExternal")?.addEventListener("click", openInExternalBrowser);
  document.getElementById("submitFailEmail")?.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(COMPANY_EMAIL);
      showToast?.("메일 주소를 복사했어요.", "info", 1800);
    } catch {
      /* 복사가 막힌 환경이면 주소가 화면에 보이므로 그냥 둔다 */
    }
  });

  confirmModalEl.classList.add("show", "isFail");
  confirmModalEl.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");

  if (confirmModalCancelEl) confirmModalCancelEl.textContent = "닫기";
  if (confirmModalOkEl) confirmModalOkEl.textContent = "다시 시도";

  // ZIP은 팝업이 열리자마자 미리 만들어 둔다 (모바일 공유는 버튼을 누른
  // 직후에 바로 호출해야 해서, 누른 뒤에 만들면 공유가 거부될 수 있음)
  let zipReady = null;
  const zipPromise = canDownload
    ? buildDesignFallbackZip(fileList)
        .then((zip) => {
          zipReady = zip;
          const shareBtn = document.getElementById("submitFailShare");
          if (shareBtn && canShareDesignZip(zip)) shareBtn.hidden = false;
          return zip;
        })
        .catch((err) => {
          console.warn("[시안 ZIP 미리 만들기 실패]", err);
          return null;
        })
    : Promise.resolve(null);

  const shareBtn = document.getElementById("submitFailShare");
  shareBtn?.addEventListener("click", () => {
    if (!zipReady) return;
    shareDesignZip(zipReady).catch((err) => {
      if (err?.name === "AbortError") return; // 사용자가 공유 창을 닫음
      console.warn("[시안 공유 실패 → 다운로드로 대체]", err);
      showToast?.("공유가 되지 않아 파일 다운로드로 진행합니다.", "warn", 2600);
      downloadDesignFallbackFiles(fileList, zipReady).catch(() => {});
    });
  });

  const btn = document.getElementById("submitFailDownload");
  btn?.addEventListener("click", async () => {
    if (btn.disabled) return;
    btn.disabled = true;
    const labelEl = btn.querySelector("span") || btn;
    const label = labelEl.textContent;
    labelEl.textContent = "파일 만드는 중…";
    try {
      await downloadDesignFallbackFiles(fileList, await zipPromise);
      labelEl.textContent = "다운로드 완료 · 다시 받기";
    } catch (err) {
      console.error("[시안 파일 다운로드 실패]", err);
      labelEl.textContent = label;
      showToast?.(`시안 파일 다운로드에 실패했습니다. (${err?.message || err})`, "error", 4000);
    } finally {
      btn.disabled = false;
    }
  });
}

/* =========================================================
 * 시안 접수 완료 주문 안내 모달 열기
========================================================= */
function openNoticeModal(
  message = `
시안 접수가 완료되었습니다.

이메일을 확인하시면 확정 안내 메일과
함께 접수된 시안을 확인하실 수 있습니다.
`,
  title = "시안 접수 완료",
) {
  if (!confirmModalEl || !confirmModalBodyEl) return;

  resetConfirmModal();

  const titleEl = document.getElementById("confirmModalTitle");
  if (titleEl) titleEl.textContent = title;

  confirmModalBodyEl.innerHTML = message;

  confirmModalEl.classList.add("show", "single");
  confirmModalEl.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");

  if (confirmModalCancelEl) {
    confirmModalCancelEl.style.display = "none";
  }

  if (confirmModalOkEl) {
    confirmModalOkEl.textContent = "확인";
  }
}

/* =========================================================
 * 모달 닫기
========================================================= */
function closeConfirmModal() {
  if (!confirmModalEl) return;

  confirmModalEl.classList.remove("show");
  confirmModalEl.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");

  resetConfirmModal();
}

/* =========================================================
 * 팝업 키보드 사용성 (프로파일/규격, 시안 확정, 인쇄 가이드 공통)
 * - 열리면 팝업 안 첫 버튼/입력칸으로 포커스 이동, 닫히면 연 버튼으로 돌아감
 * - Esc로 닫기 (시안 접수 중에는 닫히지 않음: 취소 버튼이 숨겨져 있을 때)
 * - aria-hidden 값이 바뀌는 것을 지켜봐서, 각 팝업의 열기/닫기 코드는 그대로 둠
========================================================= */
(function setupDialogKeyboard() {
  const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

  const dialogs = [
    { id: "optionQuickModal", close: () => document.getElementById("optionQuickClose")?.click() },
    {
      id: "confirmModal",
      close: () => {
        const cancel = document.getElementById("confirmModalCancel");
        if (cancel && cancel.style.display !== "none" && !cancel.disabled) cancel.click();
      },
    },
    { id: "printGuideModal", close: () => document.getElementById("confirmPrintGuideBtn")?.click() },
  ];

  const isOpen = (el) => el && el.getAttribute("aria-hidden") === "false";
  const returnFocus = new Map();

  dialogs.forEach(({ id }) => {
    const el = document.getElementById(id);
    if (!el) return;
    new MutationObserver(() => {
      if (isOpen(el)) {
        if (!returnFocus.has(id)) returnFocus.set(id, document.activeElement);
        const target = el.querySelector('[role="dialog"]') || el;
        const first = Array.from(target.querySelectorAll(FOCUSABLE)).find((n) => n.offsetParent !== null);
        (first || target).focus?.({ preventScroll: true });
      } else if (returnFocus.has(id)) {
        const back = returnFocus.get(id);
        returnFocus.delete(id);
        if (back && document.contains(back)) back.focus?.({ preventScroll: true });
      }
    }).observe(el, { attributes: true, attributeFilter: ["aria-hidden"] });
  });

  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    const open = dialogs.find(({ id }) => isOpen(document.getElementById(id)));
    if (!open) return;
    e.preventDefault();
    open.close();
  });
})();
