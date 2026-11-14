// A1 ホーム：今日の予定・まだの投薬・今日の記録・書き出しの促し
import { app } from "../main.js";
import { go, rerender } from "../router.js";
import { Schedules, Doses, Records, Device } from "../db/repo.js";
import { todaysMedTasks, upcomingVisits } from "../domain/reminders.js";
import { today, fmtJP, diffDays, localDate } from "../domain/dates.js";
import { recordSummary } from "../domain/format.js";
import { petHeaderHTML, bindPetTabs, escapeHtml } from "../ui/pet-header.js";
import { EXPORT_NUDGE_DAYS } from "../config.js";
import { M } from "../messages.ja.js";

export async function render(root) {
  const pet = app.currentPet;
  if (!pet) { go("/onboarding"); return; }
  const t = today();
  const [schedules, doses, todaysRecords] = await Promise.all([
    Schedules.byPet(pet.id), Doses.byPetDate(pet.id, t), Records.byPetDate(pet.id, t),
  ]);
  const tasks = todaysMedTasks(schedules, doses, t);
  const visits = upcomingVisits(await Schedules.all()).filter((v) => v.petId === pet.id || true);
  const petVisits = upcomingVisits(schedules, t);

  // 書き出しの促し（7日以上 or 一度も書き出していない＆記録開始から7日）
  const lastExportAt = await Device.get("lastExportAt", null);
  const dataSince = await Device.get("dataSince", null);
  const snoozedUntil = await Device.get("exportNudgeSnoozedUntil", null);
  let showNudge = false;
  if (snoozedUntil !== t) {
    if (lastExportAt) showNudge = diffDays(localDate(new Date(lastExportAt)), t) >= EXPORT_NUDGE_DAYS;
    else if (dataSince) showNudge = diffDays(localDate(new Date(dataSince)), t) >= EXPORT_NUDGE_DAYS;
  }

  const undone = tasks.filter((x) => !x.done);
  // II-6: Safariの7日ルール対策として、ホーム画面への追加を案内する（追加済み・閉じて30日以内は出さない）
  const isStandalone = (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) || window.navigator.standalone === true;
  const guideDismissedAt = await Device.get("homeGuideDismissedAt", null);
  const showGuide = !isStandalone && (!guideDismissedAt || diffDays(localDate(new Date(guideDismissedAt)), t) >= 30);
  root.innerHTML = `
    ${petHeaderHTML(app.pets, pet.id)}
    ${showNudge ? `<div class="banner banner-warn">バックアップをしばらく書き出していません。機種変更や故障で記録が消えないよう、書き出しておきましょう。<br>
      <button class="btn btn-sm btn-primary" id="nudge-export" style="margin-top:8px">今すぐ書き出す</button>
      <button class="btn btn-sm btn-ghost" id="nudge-later">あとで</button></div>` : ""}
    ${showGuide ? `<div class="card">
      <h2>📱 ホーム画面に追加してください</h2>
      <p>iPhoneのSafariは、7日間使わなかったサイトのデータを消すことがあります。ホーム画面に追加すると、その対象から外れて記録が消えにくくなります。</p>
      <p class="small">iPhone：共有ボタン（□に↑のマーク）→「ホーム画面に追加」<br>Android：右上の「︙」メニュー→「ホーム画面に追加」</p>
      <button class="btn btn-sm btn-ghost" id="guide-close">閉じる（30日後にまた表示します）</button>
    </div>` : ""}
    <div class="card">
      <h2>今日（${fmtJP(t)}）の予定</h2>
      <p class="notice-line">⚠️ ${M.noNotifyNotice}</p>
      ${tasks.length === 0 && petVisits.filter((v) => v.visitDate === t).length === 0
        ? `<p>今日の予定はありません。</p>` : ""}
      ${tasks.length ? `<h3 style="margin:.4em 0">お薬 ${undone.length ? `（まだ ${undone.length} 件）` : "（全部済み）"}</h3>` +
        tasks.map((x, i) => `
        <div class="med-task">
          <input type="checkbox" id="task-${i}" data-sid="${x.schedule.id}" data-slot="${x.slot.key}" ${x.done ? "checked" : ""}>
          <label for="task-${i}" class="${x.done ? "done" : ""}">
            ${escapeHtml(x.schedule.title)}${x.slot.label ? `（${escapeHtml(x.slot.label)}）` : ""}${x.slot.time ? ` ${x.slot.time}` : ""}
          </label>
        </div>`).join("") : ""}
      ${petVisits.filter((v) => v.visitDate === t).map((v) => `
        <div class="med-task">🏥 通院：${escapeHtml(v.title)}${v.visitTime ? ` ${v.visitTime}` : ""}${v.placeMemo ? `（${escapeHtml(v.placeMemo)}）` : ""}</div>`).join("")}
    </div>
    <div class="card">
      <h2>今日の記録</h2>
      ${todaysRecords.length === 0 ? `<p>まだ記録がありません。</p>` :
        todaysRecords.map((r) => `<div class="list-row"><span>${r.time}　${escapeHtml(recordSummary(r))}${r.note ? `<br><span class="small">${escapeHtml(r.note)}</span>` : ""}</span>
          <button class="btn btn-sm" data-edit="${r.id}">直す</button></div>`).join("")}
      <button class="btn btn-primary btn-block" id="add-record">✏️ 記録を追加する</button>
      ${app.pets.length > 1 ? `<button class="btn btn-block" id="batch-record">みんな分をまとめて記録する</button>` : ""}
    </div>
    ${petVisits.filter((v) => v.visitDate > t).length ? `<div class="card"><h2>これからの通院</h2>
      ${petVisits.filter((v) => v.visitDate > t).map((v) => `<div class="list-row"><span>${fmtJP(v.visitDate)}${v.visitTime ? ` ${v.visitTime}` : ""}　${escapeHtml(v.title)}</span></div>`).join("")}
    </div>` : ""}
    <p class="notice-line">${M.vetNotice}</p>
  `;
  bindPetTabs(root, async (id) => { await app.switchPet(id); rerender(); });
  root.querySelector("#add-record")?.addEventListener("click", () => go("/record"));
  root.querySelector("#batch-record")?.addEventListener("click", () => go("/record?batch=1"));
  root.querySelectorAll("[data-edit]").forEach((b) =>
    b.addEventListener("click", () => go(`/record?id=${b.dataset.edit}`)));
  root.querySelectorAll("[data-sid]").forEach((box) =>
    box.addEventListener("change", async () => {
      const sid = box.dataset.sid, slotKey = box.dataset.slot;
      const id = Doses.id(sid, t, slotKey);
      if (box.checked) {
        const s = schedules.find((x) => x.id === sid);
        const slot = s?.slots.find((x) => x.key === slotKey);
        await Doses.save({ id, scheduleId: sid, petId: pet.id, date: t, slotKey,
          doneAt: new Date().toISOString(), titleSnapshot: s?.title || "", slotLabelSnapshot: slot?.label || "" });
      } else {
        await Doses.remove(id);
      }
      rerender();
    }));
  root.querySelector("#guide-close")?.addEventListener("click", async () => {
    await Device.set("homeGuideDismissedAt", new Date().toISOString()); rerender();
  });
  root.querySelector("#nudge-export")?.addEventListener("click", async () => {
    const { downloadExport } = await import("../db/backup.js");
    await downloadExport(); rerender();
  });
  root.querySelector("#nudge-later")?.addEventListener("click", async () => {
    await Device.set("exportNudgeSnoozedUntil", t); rerender();
  });
}
