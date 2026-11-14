// 「今どの子を記録中か」を常に大きく出すヘッダー＋子の切り替え
import { ageText } from "../domain/dates.js";

export function petHeaderHTML(pets, currentId) {
  const cur = pets.find((p) => p.id === currentId) || pets[0];
  if (!cur) return "";
  const tabs = pets.map((p) => `
    <button type="button" class="pet-tab ${p.id === cur.id ? "active" : ""}" data-pet="${p.id}">
      <span class="pet-dot dot-${p.color}"></span>${escapeHtml(p.name)}
    </button>`).join("");
  const age = ageText(cur);
  return `
  <div class="current-pet color-${cur.color}">
    <div class="current-pet-name">${cur.species === "dog" ? "🐶" : "🐱"} ${escapeHtml(cur.name)}</div>
    <div class="current-pet-sub">${cur.species === "dog" ? "犬" : "猫"}${age ? `・${age}` : ""} の記録</div>
  </div>
  ${pets.length > 1 ? `<div class="pet-tabs" role="tablist">${tabs}</div>` : ""}`;
}
export function bindPetTabs(root, onSwitch) {
  root.querySelectorAll("[data-pet]").forEach((b) =>
    b.addEventListener("click", () => onSwitch(b.dataset.pet)));
}
export function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
