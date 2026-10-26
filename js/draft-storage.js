/* 작업 내용 자동 저장 / 새로고침 후 복원 */

/* =========================================================
 * 새로고침하거나 창을 닫았다 다시 열어도 작업하던 내용이 남도록
 * 주문자 정보, 옵션, 시안 리스트, 지금 캔버스 상태를 이 기기 브라우저에 저장한다.
 * - 업로드 이미지(dataURL)와 레이저 원본파일(File)까지 들어가야 해서
 *   용량 제한이 작은 localStorage 대신 IndexedDB를 쓴다.
 * - 시안 접수가 끝나면 지우고, 7일 지난 내용은 불러오지 않는다.
 * - 주소에 다른 주문번호가 붙어 들어오면 다른 주문이므로 불러오지 않는다.
========================================================= */
const DRAFT_DB_NAME = "kidikidi_draft";
const DRAFT_STORE = "draft";
const DRAFT_KEY = "current";
const DRAFT_VERSION = 1;
const DRAFT_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const DRAFT_SAVE_DELAY_MS = 800;

let draftSaveTimer = null;
let isRestoringDraft = false;
// 페이지를 연 직후 복원을 시도하기 전에는 저장하지 않는다.
// (빈 화면 상태로 먼저 저장돼서 이전 작업 내용을 지워버리는 것을 막음)
let draftRestoreDone = false;
let draftDbPromise = null;

function openDraftDb() {
  if (draftDbPromise) return draftDbPromise;

  draftDbPromise = new Promise((resolve, reject) => {
    if (!window.indexedDB) {
      reject(new Error("IndexedDB를 사용할 수 없습니다."));
      return;
    }
    const req = indexedDB.open(DRAFT_DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(DRAFT_STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  }).catch((err) => {
    // 시크릿 모드 등에서 막혀 있으면 다음에 다시 시도할 수 있게 비워 둔다.
    draftDbPromise = null;
    throw err;
  });

  return draftDbPromise;
}

async function runDraftStore(mode, fn) {
  const db = await openDraftDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DRAFT_STORE, mode);
    const req = fn(tx.objectStore(DRAFT_STORE));
    tx.oncomplete = () => resolve(req?.result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

/* =========================================================
 * 저장
========================================================= */
// 지금 캔버스에 올라가 있는 (아직 시안 리스트에 추가하지 않았을 수도 있는) 상태
function buildCanvasDraftSnapshot() {
  const snapshot = {
    profile: profileEl?.value || "",
    capType: capTypeEl?.value || "",
    design: {},
    originalFiles: [],
  };
  saveCanvasToItem(snapshot);
  delete snapshot.design.previewDataUrl;
  return snapshot;
}

function buildDraftData() {
  return {
    version: DRAFT_VERSION,
    savedAt: Date.now(),
    step: document.body?.dataset?.step || "info",
    customer: {
      name: nameEl?.value || "",
      phone: phoneEl?.value || "",
      orderNo: orderEl?.value || "",
      email: emailEl?.value || "",
    },
    form: {
      profile: profileEl?.value || "",
      capType: capTypeEl?.value || "",
      laser: laserEl?.value || "none",
      qty: qtyEl?.value || "1",
    },
    cartItems: (Array.isArray(cartItems) ? cartItems : []).map((it) => ({
      ...it,
      originalFiles: Array.isArray(it.originalFiles) ? it.originalFiles.slice() : [],
      design: it.design ? JSON.parse(JSON.stringify(it.design)) : null,
    })),
    selectedItemId: selectedItemId || null,
    canvas: buildCanvasDraftSnapshot(),
  };
}

function hasDraftContent(data) {
  const c = data.customer;
  const canvasHasDesign =
    !!data.canvas?.design?.images?.length || !!data.canvas?.design?.bgSet || !!data.canvas?.design?.texts?.length;
  return !!(c.name || c.phone || c.orderNo || c.email || data.form.profile || data.cartItems.length || canvasHasDesign);
}

async function saveDraftNow() {
  window.clearTimeout(draftSaveTimer);
  draftSaveTimer = null;

  // 접수 완료로 잠긴 화면이거나, 복원/시안 불러오기 도중(캔버스가 잠깐 비어 있음)에는 저장하지 않는다.
  if (!draftRestoreDone || isRestoringDraft || uiLocked) return;
  if (typeof isLoadingItemToCanvas !== "undefined" && isLoadingItemToCanvas) {
    scheduleDraftSave();
    return;
  }

  try {
    const data = buildDraftData();
    if (!hasDraftContent(data)) {
      await clearSavedDraft();
      return;
    }
    await runDraftStore("readwrite", (store) => store.put(data, DRAFT_KEY));
  } catch (err) {
    console.warn("작업 내용 자동 저장 실패:", err);
  }
}

function scheduleDraftSave() {
  if (isRestoringDraft) return;
  window.clearTimeout(draftSaveTimer);
  draftSaveTimer = window.setTimeout(saveDraftNow, DRAFT_SAVE_DELAY_MS);
}

async function clearSavedDraft() {
  window.clearTimeout(draftSaveTimer);
  draftSaveTimer = null;
  try {
    await runDraftStore("readwrite", (store) => store.delete(DRAFT_KEY));
  } catch (err) {
    console.warn("저장된 작업 내용 삭제 실패:", err);
  }
}

/* =========================================================
 * 복원
========================================================= */
async function restoreSavedDraft() {
  try {
    return await restoreSavedDraftInner();
  } finally {
    draftRestoreDone = true;
  }
}

async function restoreSavedDraftInner() {
  let data = null;
  try {
    data = await runDraftStore("readonly", (store) => store.get(DRAFT_KEY));
  } catch (err) {
    console.warn("저장된 작업 내용 불러오기 실패:", err);
    return false;
  }
  if (!data || data.version !== DRAFT_VERSION) return false;

  const savedOrderNo = safeTrim(data.customer?.orderNo || "");
  const urlOrderNo = safeTrim(fixedOrderNo || "");

  if (Date.now() - (data.savedAt || 0) > DRAFT_MAX_AGE_MS || (savedOrderNo && isOrderConfirmed(savedOrderNo))) {
    await clearSavedDraft();
    return false;
  }
  if (urlOrderNo && savedOrderNo && urlOrderNo !== savedOrderNo) return false;

  isRestoringDraft = true;
  try {
    if (nameEl) nameEl.value = data.customer?.name || "";
    if (phoneEl) phoneEl.value = data.customer?.phone || "";
    if (emailEl) emailEl.value = data.customer?.email || "";
    if (orderEl && !orderEl.readOnly) orderEl.value = savedOrderNo;

    if (data.form?.profile && profileEl) {
      profileEl.value = data.form.profile;
      setCapTypeOptions();
      if (data.form.capType) capTypeEl.value = data.form.capType;
      if (data.form.profile === "OEM" && laserEl) laserEl.value = data.form.laser || "none";
    }
    if (qtyEl) qtyEl.value = data.form?.qty || "1";

    cartItems = Array.isArray(data.cartItems) ? data.cartItems : [];
    selectedItemId = cartItems.some((it) => it.id === data.selectedItemId) ? data.selectedItemId : null;

    applyCanvasSizeFromForm();
    if (data.canvas) await loadItemToCanvas(data.canvas);

    updateFormReadyState?.();
    renderCart();
    updateSelectedInfoText();
    updateDraftInfo();
    updateActionLocks();

    if (data.step === "confirm" && validateCanConfirm(false)) {
      setDesignStep("confirm");
    } else if ((data.step === "editor" || data.step === "confirm") && validateUserInfo(false)) {
      setDesignStep("editor");
    }
    updateStepButtons?.();
  } catch (err) {
    console.warn("저장된 작업 내용 복원 실패:", err);
    return false;
  } finally {
    isRestoringDraft = false;
  }

  if (hasDraftContent(data)) showToast?.("이전에 작업하던 내용을 불러왔어요.", "ok");
  return true;
}

/* =========================================================
 * 저장 시점
 * - 캔버스 변경은 redraw(), 시안 리스트 변경은 renderCart(), 단계 이동은
 *   setDesignStep()에서 scheduleDraftSave()를 부른다.
 * - 입력칸/선택 변경은 여기서 문서 전체 input/change로 잡는다.
 * - 탭을 닫거나 다른 앱으로 넘어갈 때는 기다리지 않고 바로 저장한다.
========================================================= */
document.addEventListener("input", scheduleDraftSave, true);
document.addEventListener("change", scheduleDraftSave, true);
window.addEventListener("pagehide", () => {
  if (draftSaveTimer) saveDraftNow();
});
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden" && draftSaveTimer) saveDraftNow();
});
