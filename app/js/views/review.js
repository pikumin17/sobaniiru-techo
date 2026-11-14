// A3 ふりかえり（日ごとの一覧）
import { app } from "../main.js";
import { go, rerender } from "../router.js";
import { Records } from "../db/repo.js";
import { addDays, today, fmtJP } from "../domain/dates.js";
import { recordSummary } from "../domain/format.js";
import { petHeaderHTML, bindPetTabs, escapeHtml } from "../ui/pet-header.js";
import { M } from "../messages.ja.js";

const RANGE_DAYS = 14;
export async function render(root, params) {
  const pet = app.currentPet;
  if (!pet) { go("/onboarding"); return; }
  const end = params.get("to") || today();
  const from = addDays(end, -(RANGE_DAYS - 1));
  const records = await Records.byPetRange(pet.id, from, end);
  const byDate = new Map();
  for (const r of records) {
    if (!byDate.has(r.date)) byDate.set(r.date, []);
    byDate.get(r.date).push(r);
  }
  const dates = [];
  for (let d = end; d >= from; d = addDays(d, -1)) dates.push(d);
  root.innerHTML = `
    ${petHeaderHTML(app.pets, pet.id)}
    <h1>ふりかえり</h1>
    <p><a href="#/chart">📈 体重と食事のグラフを見る</a></p>
    ${dates.map((d) => `
      <div class="card">
        <h2 style="margin-bottom:6px">${fmtJP(d)}${d === today() ? "（今日）" : ""}</h2>
        ${(byDate.get(d) || []).length === 0 ? `<p class="small">記録なし</p>` :
          byDate.get(d).map((r) => `<div class="list-row"><span>${r.time}　${escapeHtml(recordSummary(r))}${r.note ? `<br><span class="small">${escapeHtml(r.note)}</span>` : ""}</span>
            <button class="btn btn-sm" data-edit="${r.id}">直す</button></div>`).join("")}
        <button class="btn btn-sm btn-ghost" data-add="${d}">＋ この日の記録を追加</button>
      </div>`).join("")}
    <button class="btn btn-block" id="older">もっと前の2週間を見る</button>
    <p class="notice-line">${M.vetNotice}</p>
  `;
  bindPetTabs(root, async (id) => { await app.switchPet(id); rerender(); });
  root.querySelectorAll("[data-edit]").forEach((b) => b.addEventListener("click", () => go(`/record?id=${b.dataset.edit}`)));
  root.querySelectorAll("[data-add]").forEach((b) => b.addEventListener("click", () => go(`/record?date=${b.dataset.add}`)));
  root.querySelector("#older").addEventListener("click", () => go(`/review?to=${addDays(from, -1)}`));
}
