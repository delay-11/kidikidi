/* moved from js/common/toast.js */
/* =========================================================
 * 토스트
========================================================= */
let activeToastTimer = null;

function showToast(message = "", type = "info", duration = 2200, options = {}) {
  if (!message) return;

  const stack = document.getElementById("toastStack");
  if (!stack) return;

  const normalizedType = ["ok", "warn", "error", "info"].includes(type)
    ? type
    : "info";

  const currentToasts = Array.from(stack.querySelectorAll(".toast"));
  currentToasts.forEach((node) => {
    node.classList.remove("show");
    node.classList.add("hide");
    setTimeout(() => node.remove(), 220);
  });

  if (activeToastTimer) {
    clearTimeout(activeToastTimer);
    activeToastTimer = null;
  }

  const toast = document.createElement("div");
  toast.className = `toast ${normalizedType}`;

  const icon = document.createElement("div");
  icon.className = "toastIcon";
  icon.textContent =
    normalizedType === "error"
      ? "!"
      : normalizedType === "warn"
      ? "!"
      : normalizedType === "ok"
      ? "✓"
      : "i";

  const text = document.createElement("div");
  text.className = "toastText";
  text.textContent = message;

  toast.appendChild(icon);
  toast.appendChild(text);

  // 선택: 토스트 안 버튼 (예: 시안 삭제 후 [되돌리기])
  if (options.actionLabel && typeof options.onAction === "function") {
    const actionBtn = document.createElement("button");
    actionBtn.type = "button";
    actionBtn.className = "toastAction";
    actionBtn.textContent = options.actionLabel;
    actionBtn.addEventListener("click", () => {
      if (activeToastTimer) clearTimeout(activeToastTimer);
      options.onAction();
      remove();
    });
    toast.appendChild(actionBtn);
  }

  stack.appendChild(toast);

  requestAnimationFrame(() => {
    toast.classList.add("show");
  });

  const remove = () => {
    toast.classList.remove("show");
    toast.classList.add("hide");
    setTimeout(() => toast.remove(), 220);
    activeToastTimer = null;
  };

  activeToastTimer = setTimeout(remove, Math.max(1200, duration));
}
