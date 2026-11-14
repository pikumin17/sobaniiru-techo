// 確認ダイアログ（ネイティブconfirmを使わず、大きく読みやすい自前実装）
export function confirmDialog({ title, body, okLabel = "はい", cancelLabel = "やめる", danger = false }) {
  return new Promise((resolve) => {
    const wrap = document.createElement("div");
    wrap.className = "dialog-backdrop";
    wrap.innerHTML = `
      <div class="dialog" role="alertdialog" aria-modal="true" aria-label="${title}">
        <h2>${title}</h2>
        <p>${body}</p>
        <div class="dialog-actions">
          <button type="button" class="btn btn-ghost" data-act="cancel">${cancelLabel}</button>
          <button type="button" class="btn ${danger ? "btn-danger" : "btn-primary"}" data-act="ok">${okLabel}</button>
        </div>
      </div>`;
    document.body.appendChild(wrap);
    const close = (v) => { wrap.remove(); resolve(v); };
    wrap.querySelector('[data-act="cancel"]').addEventListener("click", () => close(false));
    wrap.querySelector('[data-act="ok"]').addEventListener("click", () => close(true));
    wrap.addEventListener("click", (e) => { if (e.target === wrap) close(false); });
  });
}
