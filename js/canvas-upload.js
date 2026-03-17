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

  if (minSide < 600 || maxSide < 600) {
    return true;
  }

  return false;
}

function fitImageToCanvas(img) {
  imgScale = Math.max(canvas.width / img.width, canvas.height / img.height);
  imgRot = 0;
  imgCX = canvas.width / 2;
  imgCY = canvas.height / 2;
}

fileBtn?.addEventListener(
  "click",
  async (e) => {
    e.preventDefault();
    e.stopPropagation();

    clearCanvasNotice();

    if (await applyConfirmedLockIfNeeded(true)) return;

    fileEl?.click();
  },
  true,
);

fileEl?.addEventListener("change", async () => {
  clearCanvasNotice();

  if (await applyConfirmedLockIfNeeded(true)) {
    fileEl.value = "";
    return;
  }

  if (!validateUserInfo(true)) {
    fileEl.value = "";
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
