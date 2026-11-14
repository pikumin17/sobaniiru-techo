// A3 グラフ：体重は折れ線、食事量は数値化せず「全・半・少・×」のマス＋表
import { app } from "../main.js";
import { go, rerender } from "../router.js";
import { Records } from "../db/repo.js";
import { addDays, today, fmtJP } from "../domain/dates.js";
import { mealMark, mealLabel } from "../domain/format.js";
import { petHeaderHTML, bindPetTabs, escapeHtml } from "../ui/pet-header.js";
import { M } from "../messages.ja.js";

const DAYS = 28;
export async function render(root) {
  const pet = app.currentPet;
  if (!pet) { go("/onboarding"); return; }
  const end = today(), from = addDays(end, -(DAYS - 1));
  const records = await Records.byPetRange(pet.id, from, end);
  const dates = [];
  for (let d = from; d <= end; d = addDays(d, 1)) dates.push(d);
  const byDate = new Map(dates.map((d) => [d, []]));
  for (const r of records) byDate.get(r.date)?.push(r);
  // 体重（その日の最後の記録）
  const weights = dates.map((d) => {
    const rs = (byDate.get(d) || []).filter((r) => r.weightKg != null);
    return rs.length ? rs[rs.length - 1].weightKg : null;
  });
  const wVals = weights.filter((v) => v != null);
  let svg = `<p class="small">体重の記録がまだありません。記録のときに体重を入れると、ここに線で表示されます。</p>`;
  if (wVals.length >= 2) {
    const min = Math.min(...wVals), max = Math.max(...wVals);
    const span = (max - min) || 1;
    const W = 600, H = 180, PL = 44, PB = 22, PT = 12;
    const x = (i) => PL + (i * (W - PL - 8)) / (DAYS - 1);
    const y = (v) => PT + (1 - (v - min) / span) * (H - PT - PB);
    const pts = weights.map((v, i) => (v == null ? null : [x(i), y(v)])).filter(Boolean);
    svg = `<svg viewBox="0 0 ${W} ${H}" style="width:100%;height:auto;background:#fff;border:1px solid var(--line);border-radius:12px" role="img" aria-label="体重の折れ線グラフ">
      <text x="4" y="${y(max) + 4}" font-size="12">${max}</text>
      <text x="4" y="${y(min) + 4}" font-size="12">${min}</text>
      <polyline points="${pts.map((p) => p.join(",")).join(" ")}" fill="none" stroke="#b3541e" stroke-width="2.5"/>
      ${pts.map((p) => `<circle cx="${p[0]}" cy="${p[1]}" r="3.5" fill="#b3541e"/>`).join("")}
      <text x="${PL}" y="${H - 4}" font-size="11">${fmtJP(from)}</text>
      <text x="${W - 70}" y="${H - 4}" font-size="11">${fmtJP(end)}</text>
    </svg>`;
  } else if (wVals.length === 1) {
    svg = `<p>体重の記録は1回分あります（${wVals[0]}kg）。2回以上たまると線で表示されます。</p>`;
  }
  // 食事量マス（1日1マス：その日最後の記録）
  const mealCells = dates.map((d) => {
    const rs = (byDate.get(d) || []).filter((r) => r.meal);
    const v = rs.length ? rs[rs.length - 1].meal : null;
    return `<div class="meal-cell" title="${fmtJP(d)} ${v ? mealLabel(v) : "記録なし"}">${v ? mealMark(v) : "―"}<br><span class="small">${d.slice(5).replace("-", "/")}</span></div>`;
  }).join("");
  // 表（同じ内容を表でも）
  const tableRows = dates.slice().reverse().map((d) => {
    const rs = byDate.get(d) || [];
    const w = rs.filter((r) => r.weightKg != null);
    const m = rs.filter((r) => r.meal);
    return `<tr><td>${fmtJP(d)}</td><td>${w.length ? w[w.length - 1].weightKg : "―"}</td><td>${m.length ? mealLabel(m[m.length - 1].meal) : "―"}</td></tr>`;
  }).join("");
  root.innerHTML = `
    ${petHeaderHTML(app.pets, pet.id)}
    <h1>体重と食事（過去${DAYS}日）</h1>
    <h2>体重（kg）</h2>${svg}
    <h2>食事の量</h2>
    <p class="small">全＝全部、半＝半分、少＝少し、×＝食べない。1日分はその日最後の記録です。</p>
    <div class="meal-grid" style="grid-template-columns:repeat(7,1fr)">${mealCells}</div>
    <h2>表で見る</h2>
    <div class="table-scroll"><table class="data"><tr><th>日付</th><th>体重(kg)</th><th>食事</th></tr>${tableRows}</table></div>
    <p><a href="#/review">← 日ごとの一覧に戻る</a></p>
    <p class="notice-line">${escapeHtml(M.vetNotice)}</p>
  `;
  bindPetTabs(root, async (id) => { await app.switchPet(id); rerender(); });
}
