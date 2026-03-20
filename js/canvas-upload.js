/* =========================================================
 * 이미지 업로드 / 삭제
========================================================= */
function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;

    reader.readAsDataURL(file);
  });
}

function createImageFromSrc(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/* =========================================================
 * 업로드 이미지 최적화
 * - 원본 그대로 캔버스에 올리면 렉이 심해서
 *   긴 쪽 기준으로 축소 후 jpeg로 압축해서 사용
========================================================= */
async function loadImageFromFile(file) {
  const originalDataUrl = await readFileAsDataURL(file);
  const originalImg = await createImageFromSrc(originalDataUrl);

  const MAX_SIZE = 1600;
  let targetWidth = originalImg.width;
  let targetHeight = originalImg.height;

  if (targetWidth > MAX_SIZE || targetHeight > MAX_SIZE) {
    const ratio = Math.min(MAX_SIZE / targetWidth, MAX_SIZE / targetHeight);
    targetWidth = Math.round(targetWidth * ratio);
    targetHeight = Math.round(targetHeight * ratio);
  }

  const tempCanvas = document.createElement("canvas");
  tempCanvas.width = targetWidth;
  tempCanvas.height = targetHeight;

  const tempCtx = tempCanvas.getContext("2d", { alpha: true });
  tempCtx.clearRect(0, 0, targetWidth, targetHeight);
  tempCtx.drawImage(originalImg, 0, 0, targetWidth, targetHeight);

  /* 
   * PNG 투명 배경이 꼭 필요한 경우까지 전부 JPEG로 바꾸면
   * 투명이 날아갈 수 있음.
   * 그래서 PNG/WEBP는 원본 포맷을 최대한 유지하고,
   * 그 외는 JPEG로 압축.
   */
  const mimeType =
    file.type === "image/png"
      ? "image/png"
      : file.type === "image/webp"
        ? "image/webp"
        : "image/jpeg";

  const quality = mimeType === "image/jpeg" || mimeType === "image/webp" ? 0.85 : undefined;
  const optimizedDataUrl =
    quality !== undefined
      ? tempCanvas.toDataURL(mimeType, quality)
      : tempCanvas.toDataURL(mimeType);

  return await createImageFromSrc(optimizedDataUrl);
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

  /* 너무 큰 파일은 먼저 경고 */
  if (f.size > 15 * 1024 * 1024) {
    setCanvasNotice(
      "이미지 용량이 너무 큽니다. 15MB 이하 파일로 다시 시도해주세요.",
      "error",
    );
    fileEl.value = "";
    updateActionLocks();
    return;
  }

  try {
    setCanvasNotice("이미지를 불러오는 중입니다...", "ok");

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