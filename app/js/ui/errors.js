// エラー表示（日本語で何が起きたか伝える）
import { M } from "../messages.ja.js";

export function showError(el, msg) {
  if (!el) return;
  el.textContent = msg;
  el.classList.add("show");
  el.setAttribute("role", "alert");
}
export function clearError(el) { if (el) { el.textContent = ""; el.classList.remove("show"); } }
export function describeDbError(e) {
  const name = e && e.name ? e.name : "";
  if (name === "QuotaExceededError") return M.errors.quota;
  if (name === "InvalidStateError" || name === "VersionError") return M.errors.migrationFailed;
  if (e && e.message === "blocked") return M.errors.blocked;
  return M.errors.saveFailed;
}
// 画面上部の固定バナー
export function banner(id, text, kind = "warn") {
  let el = document.getElementById(id);
  if (!text) { if (el) el.remove(); return; }
  if (!el) {
    el = document.createElement("div");
    el.id = id;
    document.querySelector("main").prepend(el);
  }
  el.className = `banner banner-${kind}`;
  el.textContent = text;
}
