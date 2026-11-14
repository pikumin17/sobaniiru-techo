// A7 申し送り（期間を選んで印刷ビュー→PDF）
import { app } from "../main.js";
import { go, rerender } from "../router.js";
import { Records, Schedules, Doses, Settings, CustomItems } from "../db/repo.js";
import { addDays, today, fmtJP, fmtJPFull } from "../domain/dates.js";
import { recordSummary, customValueText } from "../domain/format.js";
import { petHeaderHTML, bindPetTabs, escapeHtml } from "../ui/pet-header.js";
import { M } from "../messages.ja.js";

export async function render(root, params) {
  const pet = app.currentPet;
  if (!pet) { go("/onboarding"); return; }
  const days = Number(params.get("days") || 7);
  const custom = params.get("from") && params.get("to")
    ? { from: params.get("from"), to: params.get("to") } : null;
  const to = custom ? custom.to : today();
  const from = custom ? custom.from : addDays(to, -(days - 1));
  const [records, schedules, items, emergency] = await Promise.all([
    Records.byPetRange(pet.id, from, to), Schedules.byPet(pet.id), CustomItems.all(), Settings.get("emergencyMemo", ""),
  ]);
  const includeEmergency = params.get("emg") !== "0";
  const dates = [];
  for (let d = from; d <= to; d = addDays(d, 1)) dates.push(d);
  const medSchedules = schedules.filter((s) => s.kind === "med");
  // 期間中の投薬実績サマリ
  const doseLines = [];
  for (const d of dates) {
    const ds = await Doses.byPetDate(pet.id, d);
    for (const s of medSchedules) doseLines.push({ date: d, s, done: ds.filter((x) => x.scheduleId === s.id).length, total: (s.slots || []).length });
  }
  const recRows = dates.map((d) => {
    const rs = records.filter((r) => r.date === d);
    if (!rs.length) return `<tr><td>${fmtJP(d)}</td><td colspan="2">記録なし</td></tr>`;
    return rs.map((r) => {
      const customText = items.filter((i) => r.custom?.[i.id] !== undefined)
        .map((i) => `${escapeHtml(i.label)}:${escapeHtml(customValueText(i, r.custom[i.id]))}`).join("　");
      return `<tr><td>${fmtJP(d)} ${r.time}</td><td>${escapeHtml(recordSummary(r))}</td><td>${escapeHtml(r.note || "")}${customText ? `<br>${customText}` : ""}</td></tr>`;
    }).join("");
  }).join("");

  root.innerHTML = `
    ${petHeaderHTML(app.pets, pet.id)}
    <div class="no-print">
      <h1>申し送り</h1>
      <p>期間を選んで「印刷／PDFにする」を押すと、家族・シッター・動物病院に渡せる形で印刷できます（PDFとして保存もできます）。</p>
      <div class="choices" id="period">
        ${[7, 14, 30].map((n) => `<button type="button" class="choice ${!custom && days === n ? "selected" : ""}" data-days="${n}">過去${n}日</button>`).join("")}
      </div>
      <form id="custom-period" style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap;align-items:center">
        <input type="date" name="from" value="${from}" style="min-height:56px;padding:10px;border:2px solid var(--line);border-radius:10px;font-size:1rem;font-family:inherit">
        〜
        <input type="date" name="to" value="${to}" style="min-height:56px;padding:10px;border:2px solid var(--line);border-radius:10px;font-size:1rem;font-family:inherit">
        <button class="btn btn-sm" type="submit">この期間にする</button>
      </form>
      <div class="checkrow"><input type="checkbox" id="emg" ${includeEmergency ? "checked" : ""}>
        <label for="emg">緊急連絡先メモを入れる</label></div>
      <button class="btn btn-primary btn-block" id="print">🖨 印刷／PDFにする</button>
      <p class="small">うまく印刷できないときは、ブラウザでこのページを開いてから印刷してください。記録データ（JSON）を渡す方法は「設定」にあります。</p>
    </div>
    <div class="print-sheet">
      <h1>申し送り：${escapeHtml(pet.name)}（${pet.species === "dog" ? "犬" : "猫"}）</h1>
      <p>期間：${fmtJPFull(from)} 〜 ${fmtJPFull(to)}</p>
      ${pet.conditionsMemo ? `<h2>持病メモ</h2><p>${escapeHtml(pet.conditionsMemo)}</p>` : ""}
      ${pet.clinicMemo ? `<h2>かかりつけ病院</h2><p>${escapeHtml(pet.clinicMemo)}</p>` : ""}
      ${includeEmergency && emergency ? `<h2>緊急連絡先メモ</h2><p>${escapeHtml(emergency)}</p>` : ""}
      <h2>記録</h2>
      <table class="data"><tr><th>日時</th><th>内容</th><th>メモ</th></tr>${recRows}</table>
      <h2>投薬の予定と実績</h2>
      ${medSchedules.length === 0 ? `<p>投薬の予定はありません。</p>` :
        `<table class="data"><tr><th>お薬</th><th>予定</th><th>期間中の実績</th></tr>
        ${medSchedules.map((s) => {
          const lines = doseLines.filter((x) => x.s.id === s.id);
          const doneSum = lines.reduce((a, x) => a + x.done, 0);
          const totalSum = lines.reduce((a, x) => a + x.total, 0);
          return `<tr><td>${escapeHtml(s.title)}</td><td>${(s.slots || []).map((x) => `${escapeHtml(x.label)}${x.time ? " " + x.time : ""}`).join("、")}${s.memo ? `<br>${escapeHtml(s.memo)}` : ""}</td><td>${doneSum}/${totalSum} 回</td></tr>`;
        }).join("")}</table>`}
      <p style="margin-top:16px">${M.vetNotice}</p>
    </div>
    <div class="card no-print"><h2>画面で確認（印刷内容と同じ）</h2>
      <p class="small">上の「印刷／PDFにする」で表示される内容は、この下に隠れています。印刷プレビューでご確認ください。</p></div>
  `;
  bindPetTabs(root, async (id) => { await app.switchPet(id); rerender(); });
  root.querySelector("#period").addEventListener("click", (e) => {
    const b = e.target.closest("[data-days]"); if (b) go(`/handover?days=${b.dataset.days}&emg=${includeEmergency ? 1 : 0}`);
  });
  root.querySelector("#custom-period").addEventListener("submit", (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    go(`/handover?from=${f.get("from")}&to=${f.get("to")}&emg=${includeEmergency ? 1 : 0}`);
  });
  root.querySelector("#emg").addEventListener("change", (e) => {
    const base = custom ? `from=${from}&to=${to}` : `days=${days}`;
    go(`/handover?${base}&emg=${e.target.checked ? 1 : 0}`);
  });
  root.querySelector("#print").addEventListener("click", () => window.print());
}
