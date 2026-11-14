// A4 予定一覧 / A5 予定の登録・編集（投薬・通院）
import { app } from "../main.js";
import { go, rerender } from "../router.js";
import { Schedules } from "../db/repo.js";
import { deleteSchedule } from "../db/trash.js";
import { scheduleActiveOn } from "../domain/reminders.js";
import { today, fmtJP } from "../domain/dates.js";
import { petHeaderHTML, bindPetTabs, escapeHtml } from "../ui/pet-header.js";
import { confirmDialog } from "../ui/dialog.js";
import { toast } from "../ui/toast.js";
import { showError, clearError } from "../ui/errors.js";
import { M, WEEKDAY_LABELS } from "../messages.ja.js";
import { uuid } from "../db/repo.js";

function repeatText(s) {
  if (s.kind === "visit") return `${fmtJP(s.visitDate)}${s.visitTime ? ` ${s.visitTime}` : ""}`;
  const r = s.repeat || { type: "daily" };
  if (r.type === "daily") return `毎日（${s.startDate}〜${s.endDate || ""}）`;
  if (r.type === "once") return `${fmtJP(s.startDate)} のみ`;
  if (r.type === "weekly") return `毎週 ${(r.weekdays || []).map((d) => WEEKDAY_LABELS[d]).join("・")}曜日`;
  return "";
}

export async function renderList(root) {
  const pet = app.currentPet;
  if (!pet) { go("/onboarding"); return; }
  const list = (await Schedules.byPet(pet.id))
    .sort((a, b) => (a.kind === b.kind ? 0 : a.kind === "med" ? -1 : 1) || (a.visitDate || a.startDate || "").localeCompare(b.visitDate || b.startDate || ""));
  root.innerHTML = `
    ${petHeaderHTML(app.pets, pet.id)}
    <h1>予定</h1>
    <p class="notice-line">⚠️ ${M.noNotifyNotice}</p>
    ${list.length === 0 ? `<p>まだ予定がありません。</p>` : list.map((s) => `
      <div class="list-row">
        <span>${s.kind === "med" ? "💊" : "🏥"} <strong>${escapeHtml(s.title)}</strong><br>
        <span class="small">${escapeHtml(repeatText(s))}${s.kind === "med" && s.slots?.length ? `｜${s.slots.map((x) => `${escapeHtml(x.label)}${x.time ? " " + x.time : ""}`).join("、")}` : ""}${s.kind === "visit" && s.placeMemo ? `｜${escapeHtml(s.placeMemo)}` : ""}</span></span>
        <button class="btn btn-sm" data-edit="${s.id}">編集</button>
      </div>`).join("")}
    <button class="btn btn-primary btn-block" id="add-med">💊 お薬の予定を追加</button>
    <button class="btn btn-block" id="add-visit">🏥 通院の予定を追加</button>
    <p class="notice-line">${M.vetNotice}</p>`;
  bindPetTabs(root, async (id) => { await app.switchPet(id); rerender(); });
  root.querySelectorAll("[data-edit]").forEach((b) => b.addEventListener("click", () => go(`/schedule-edit?id=${b.dataset.edit}`)));
  root.querySelector("#add-med").addEventListener("click", () => go("/schedule-edit?kind=med"));
  root.querySelector("#add-visit").addEventListener("click", () => go("/schedule-edit?kind=visit"));
}

export async function renderEdit(root, params) {
  const pet = app.currentPet;
  if (!pet) { go("/onboarding"); return; }
  const id = params.get("id");
  const s = id ? await Schedules.get(id) : null;
  const kind = s?.kind || params.get("kind") || "med";
  const slots = s?.slots?.length ? s.slots : [{ key: uuid(), label: "朝", time: "" }];
  root.innerHTML = `
    ${petHeaderHTML(app.pets, pet.id)}
    <h1>${s ? "予定の編集" : kind === "med" ? "お薬の予定を追加" : "通院の予定を追加"}</h1>
    <div class="error-box" id="err"></div>
    <form id="s-form">
      <input type="hidden" id="s-kind" value="${kind}">
      ${kind === "med" ? `<p class="notice-line">💊 出どころは「獣医師の指示」です。${M.medSourceNotice}。</p>` : ""}
      <div class="field"><label for="s-title">${kind === "med" ? "お薬の名前（獣医師の指示どおりに）" : "通院の名前"}（必須）</label>
        <input type="text" id="s-title" value="${escapeHtml(s?.title || "")}" placeholder="${kind === "med" ? "例：腎臓のお薬" : "例：定期検診"}" autocomplete="off"></div>
      <div class="field"><label for="s-memo">メモ</label>
        <textarea id="s-memo" placeholder="例：ごはんに混ぜる、など">${escapeHtml(s?.memo || "")}</textarea></div>
      ${kind === "med" ? `
      <div class="field"><span class="label">飲む回（枠）</span><div id="slots">
        ${slots.map((sl) => `<div class="slot-row" style="display:flex;gap:8px;margin:8px 0">
          <input type="text" class="slot-label" value="${escapeHtml(sl.label)}" placeholder="朝・夜 など" style="flex:1;min-height:56px;padding:12px;border:2px solid var(--line);border-radius:10px;font-size:1.05rem;font-family:inherit">
          <input type="time" class="slot-time" value="${sl.time || ""}" style="min-height:56px;padding:12px;border:2px solid var(--line);border-radius:10px;font-size:1.05rem;font-family:inherit">
          <input type="hidden" class="slot-key" value="${sl.key}">
          <button type="button" class="btn btn-sm slot-del">消す</button></div>`).join("")}
      </div>
      <button type="button" class="btn btn-sm" id="slot-add">＋ 回を増やす</button></div>
      <div class="field"><span class="label">くり返し</span>
        <div class="choices" id="s-repeat">
          <button type="button" class="choice ${(!s || s.repeat?.type === "daily") ? "selected" : ""}" data-value="daily">毎日</button>
          <button type="button" class="choice ${s?.repeat?.type === "weekly" ? "selected" : ""}" data-value="weekly">曜日を指定</button>
          <button type="button" class="choice ${s?.repeat?.type === "once" ? "selected" : ""}" data-value="once">1回だけ</button>
        </div></div>
      <div class="field" id="weekdays-wrap" style="display:${s?.repeat?.type === "weekly" ? "" : "none"}"><span class="label">曜日</span>
        <div class="choices" id="s-weekdays">
          ${WEEKDAY_LABELS.map((w, i) => `<button type="button" class="choice ${(s?.repeat?.weekdays || []).includes(i) ? "selected" : ""}" data-value="${i}">${w}</button>`).join("")}
        </div></div>
      <div class="field"><label for="s-start">開始日</label>
        <input type="date" id="s-start" value="${s?.startDate || today()}"></div>
      <div class="field"><label for="s-end">終了日（なければ空で大丈夫です）</label>
        <input type="date" id="s-end" value="${s?.endDate || ""}"></div>
      ` : `
      <div class="field"><label for="s-vdate">通院の日（必須）</label>
        <input type="date" id="s-vdate" value="${s?.visitDate || today()}"></div>
      <div class="field"><label for="s-vtime">時刻（任意）</label>
        <input type="time" id="s-vtime" value="${s?.visitTime || ""}"></div>
      <div class="field"><label for="s-place">場所メモ</label>
        <input type="text" id="s-place" value="${escapeHtml(s?.placeMemo || "")}" placeholder="例：○○動物病院">`}
      <button type="submit" class="btn btn-primary btn-block">保存する</button>
    </form>
    ${s ? `<hr class="hr"><button class="btn btn-danger btn-block" id="del">この予定を消す</button>
      <p class="small">消しても投薬の記録（付けた分）は残ります。しばらくの間はごみ箱から戻せます。</p>` : ""}
    <p class="notice-line">⚠️ ${M.noNotifyNotice}</p>`;
  bindPetTabs(root, async (pid) => { await app.switchPet(pid); rerender(); });
  const rep = root.querySelector("#s-repeat");
  rep?.addEventListener("click", (e) => {
    const b = e.target.closest(".choice"); if (!b) return;
    rep.querySelectorAll(".choice").forEach((c) => c.classList.remove("selected"));
    b.classList.add("selected");
    root.querySelector("#weekdays-wrap").style.display = b.dataset.value === "weekly" ? "" : "none";
  });
  root.querySelector("#s-weekdays")?.addEventListener("click", (e) => {
    const b = e.target.closest(".choice"); if (!b) return;
    b.classList.toggle("selected");
  });
  root.querySelector("#slot-add")?.addEventListener("click", () => {
    const row = document.createElement("div");
    row.className = "slot-row"; row.style.cssText = "display:flex;gap:8px;margin:8px 0";
    row.innerHTML = `<input type="text" class="slot-label" placeholder="朝・夜 など" style="flex:1;min-height:56px;padding:12px;border:2px solid var(--line);border-radius:10px;font-size:1.05rem;font-family:inherit">
      <input type="time" class="slot-time" style="min-height:56px;padding:12px;border:2px solid var(--line);border-radius:10px;font-size:1.05rem;font-family:inherit">
      <input type="hidden" class="slot-key" value="${uuid()}">
      <button type="button" class="btn btn-sm slot-del">消す</button>`;
    root.querySelector("#slots").appendChild(row);
    bindSlotDel(row);
  });
  const bindSlotDel = (scope) => scope.querySelectorAll(".slot-del").forEach((b) =>
    b.addEventListener("click", () => { if (root.querySelectorAll(".slot-row").length > 1) b.closest(".slot-row").remove(); }));
  bindSlotDel(root);

  root.querySelector("#del")?.addEventListener("click", async () => {
    const ok = await confirmDialog({ title: "この予定を消しますか？", body: "投薬の記録（付けた分）は残ります。予定はしばらくの間ごみ箱から戻せます。", okLabel: "消す", danger: true });
    if (!ok) return;
    await deleteSchedule(s, pet.name);
    toast("ごみ箱へ移しました");
    go("/schedules");
  });

  root.querySelector("#s-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const errEl = root.querySelector("#err"); clearError(errEl);
    const title = root.querySelector("#s-title").value.trim();
    if (!title) { showError(errEl, M.errors.titleRequired); return; }
    const data = { ...(s || {}), petId: pet.id, title, memo: root.querySelector("#s-memo").value, kind };
    if (kind === "med") {
      data.slots = [...root.querySelectorAll(".slot-row")].map((row) => ({
        key: row.querySelector(".slot-key").value,
        label: row.querySelector(".slot-label").value.trim(),
        time: row.querySelector(".slot-time").value || "",
      })).filter((x) => x.label || x.time);
      if (!data.slots.length) data.slots = [{ key: uuid(), label: "", time: "" }];
      const type = rep.querySelector(".choice.selected")?.dataset.value || "daily";
      data.repeat = { type, weekdays: type === "weekly"
        ? [...root.querySelectorAll("#s-weekdays .choice.selected")].map((c) => Number(c.dataset.value)) : [] };
      data.startDate = root.querySelector("#s-start").value || today();
      data.endDate = root.querySelector("#s-end").value || null;
      data.visitDate = null; data.visitTime = null; data.placeMemo = "";
    } else {
      data.visitDate = root.querySelector("#s-vdate").value;
      if (!data.visitDate) { showError(errEl, "通院の日を選んでください"); return; }
      data.visitTime = root.querySelector("#s-vtime").value || null;
      data.placeMemo = root.querySelector("#s-place").value;
      data.slots = []; data.repeat = null; data.startDate = null; data.endDate = null;
    }
    await Schedules.save(data);
    toast("保存しました");
    go("/schedules");
  });
}
export { scheduleActiveOn };
