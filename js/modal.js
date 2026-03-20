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

  confirmModalEl?.classList.remove("single");
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

※ 여러 시안을 제작한 경우 [시안 추가] 버튼으로 등록된 시안만 접수됩니다.
※ 확인에는 일정 시간이 소요될 수 있습니다.
  `;

  confirmModalEl.classList.add("show");
  confirmModalEl.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
}

/* =========================================================
 * 접수 완료 주문 안내 모달 열기
========================================================= */
function openNoticeModal(
  message = "이미 시안이 접수된 주문번호입니다.",
  title = "접수 완료 주문",
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
