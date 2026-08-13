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

  confirmModalEl?.classList.remove("single", "loading");
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

  confirmModalBodyEl.innerHTML = `
    <div class="confirmModalLoading">
      <span aria-hidden="true" class="confirmModalSpinner"></span>
      <p>잠시만 기다려주세요.<br />시안을 접수하고 있습니다.</p>
    </div>
  `;

  confirmModalEl.classList.add("show", "loading");
  confirmModalEl.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
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
