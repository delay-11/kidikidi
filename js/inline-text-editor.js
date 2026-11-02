/* =========================================================
 * 캔버스 위에서 바로 텍스트 입력/수정
 * - 예전에는 아래 입력칸에 글자를 쓰고 캔버스를 오가야 했는데,
 *   [텍스트 추가]를 누르거나 캔버스의 글자를 톡 누르면 그 글자 위에
 *   편집창이 떠서 바로 고칠 수 있게 함.
 * - 입력한 내용은 숨겨 둔 기존 입력칸(#textInput)에 넣고 input 이벤트를 보내서
 *   기존 텍스트 처리(저장/미리보기/레이어)를 그대로 탄다.
 * - 편집을 마쳤는데 글자가 비어 있으면 그 텍스트는 지움.
========================================================= */
(() => {
  if (!canvasWrapEl || !textInputEl) return;

  let editor = null;

  const position = () => {
    if (!editor) return;
    const wrapRect = canvasWrapEl.getBoundingClientRect();
    const canvasRect = canvas.getBoundingClientRect();
    const box = bboxEl?.style.display !== "none" ? bboxEl.getBoundingClientRect() : null;

    const width = Math.min(canvasRect.width - 16, Math.max(160, (box?.width || 0) + 24));
    const cx = box ? box.left + box.width / 2 : canvasRect.left + canvasRect.width / 2;
    const cy = box ? box.top + box.height / 2 : canvasRect.top + canvasRect.height / 2;

    editor.style.width = `${width}px`;
    const left = Math.max(canvasRect.left + 8, Math.min(cx - width / 2, canvasRect.right - 8 - width));
    editor.style.left = `${left - wrapRect.left}px`;
    editor.style.top = `${cy - wrapRect.top - editor.offsetHeight / 2}px`;
  };

  const autoSize = () => {
    editor.style.height = "auto";
    editor.style.height = `${Math.min(140, editor.scrollHeight)}px`;
  };

  const close = () => {
    if (!editor) return;
    const el = editor;
    editor = null;
    el.remove();
    canvasWrapEl.classList.remove("isTextEditing");

    // 비운 채로 끝내면 그 텍스트는 삭제
    if (!safeTrim(textInputEl.value) && typeof deleteActiveTextObject === "function") {
      if (deleteActiveTextObject()) {
        redraw();
        syncActiveItemDesign?.();
        updateActionLocks?.();
      }
    }
  };

  const open = (opts = {}) => {
    if (uiLocked || typeof getActiveObjectType !== "function") return;
    if (getActiveObjectType() !== "text" || isActiveObjectLocked?.()) return;
    if (editor) {
      editor.focus();
      return;
    }

    editor = document.createElement("textarea");
    editor.className = "inlineTextEditor";
    editor.rows = 1;
    editor.maxLength = 80;
    editor.setAttribute("aria-label", "텍스트 입력");
    editor.placeholder = "글자를 입력하세요";
    editor.value = textValue || "";
    canvasWrapEl.appendChild(editor);
    canvasWrapEl.classList.add("isTextEditing");

    editor.addEventListener("input", () => {
      textInputEl.value = editor.value;
      textInputEl.dispatchEvent(new Event("input", { bubbles: true }));
      autoSize();
      requestAnimationFrame(position);
    });
    editor.addEventListener("keydown", (e) => {
      if (e.key === "Escape") editor.blur();
    });
    editor.addEventListener("blur", close);

    autoSize();
    position();
    editor.focus({ preventScroll: true });
    if (opts.selectAll) editor.select();
    else editor.setSelectionRange(editor.value.length, editor.value.length);
  };

  window.openInlineTextEditor = open;
  window.closeInlineTextEditor = () => editor?.blur();
  window.addEventListener("resize", () => requestAnimationFrame(position));
})();
