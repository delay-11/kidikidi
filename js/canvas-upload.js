/* =========================================================
 * 이미지 업로드 / 삭제
========================================================= */
function loadImageFromFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = reader.result;
    };

    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function warnLowResolutionImage(img) {
  if (!img) return false;

  const minSide = Math.min(img.width, img.height);
  const maxSide = Math.max(img.width, img.height);

  return minSide < 600 || maxSide < 600;
}

function fitImageToCanvas(img) {
  imgScale = Math.max(canvas.width / img.width, canvas.height / img.height);
  imgRot = 0;
  imgCX = canvas.width / 2;
  imgCY = canvas.height / 2;
}

fileBtn?.addEventListener(
  "click",
  (e) => {
    e.preventDefault();
    e.stopPropagation();

    clearCanvasNotice();

    if (!fileEl) {
      console.error("[upload] fileEl이 없습니다.");
      setCanvasNotice("파일 업로드 요소를 찾을 수 없습니다.", "error");
      return;
    }

    /* 이미 접수 완료된 주문번호면 업로드 막기 */
    if (isOrderConfirmed(safeTrim(orderEl?.value || ""))) {
      applyConfirmedLockIfNeeded(true);
      return;
    }

    /* 주문자 정보 미입력 시 업로드 막기 */
    if (!validateUserInfo(true)) {
      updateActionLocks();
      return;
    }

    /* ! 안내 미확인 시 업로드 막기 */
    if (!didReadUploadTooltip) {
      setCanvasNotice("! 안내를 먼저 확인해주세요.", "error");
      return;
    }

    if (fileEl.disabled) {
      if (!didReadProfileTooltip) {
        setCanvasNotice("? 안내를 먼저 확인해주세요.", "error");
        return;
      }

      setCanvasNotice(
        "현재 업로드할 수 없는 상태입니다. 안내를 먼저 확인해주세요.",
        "error",
      );
      return;
    }

    /* 여기까지는 반드시 동기적으로 와야 파일창이 뜸 */
    fileEl.click();
  },
  true,
);

fileEl?.addEventListener("change", async () => {
  clearCanvasNotice();

  console.log("[upload] file change");
  console.log("[upload] selected files:", fileEl.files);

  if (await applyConfirmedLockIfNeeded(true)) {
    fileEl.value = "";
    return;
  }

  if (!validateUserInfo(true)) {
    fileEl.value = "";
    updateActionLocks();
    return;
  }

  if (!didReadUploadTooltip) {
    fileEl.value = "";
    setCanvasNotice("! 안내를 먼저 확인해주세요.", "error");
    updateActionLocks();
    return;
  }

  const f = fileEl.files && fileEl.files[0];

  if (fileNameEl) {
    fileNameEl.textContent = f ? f.name : "선택된 파일 없음";
  }

  if (!f) return;

  try {
    userImg = await loadImageFromFile(f);
    fitImageToCanvas(userImg);

    redraw();
    updateSelectedInfoText();
    updateDraftInfo();
    updateActionLocks();

    const warned = warnLowResolutionImage(userImg);

    if (!warned) {
      setCanvasNotice("이미지가 업로드되었습니다.", "ok");
    } else {
      setCanvasNotice(
        "이미지가 업로드되었습니다. 해상도를 함께 확인해주세요.",
        "ok",
      );
    }
  } catch (e) {
    console.error("이미지 업로드 실패:", e);
    setCanvasNotice(
      "이미지 파일을 불러오는 중 문제가 발생했습니다. 다른 파일로 다시 시도해주세요.",
      "error",
    );
  } finally {
    fileEl.value = "";
    updateActionLocks();
  }
});

fileDelBtn?.addEventListener(
  "click",
  async (e) => {
    e.preventDefault();
    e.stopPropagation();

    clearCanvasNotice();

    if (await applyConfirmedLockIfNeeded(true)) return;

    userImg = null;
    imgScale = 1;
    imgRot = 0;
    imgCX = canvas.width / 2;
    imgCY = canvas.height / 2;

    if (fileNameEl) fileNameEl.textContent = "선택된 파일 없음";

    redraw();
    updateSelectedInfoText();
    updateDraftInfo();
    updateActionLocks();
    setCanvasNotice("이미지가 삭제되었습니다.", "ok");
  },
  true,
);
