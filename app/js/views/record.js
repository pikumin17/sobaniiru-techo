// A2 記録入力（1画面で素早く付ける／複数ペット一括／過去日の修正）
import { app } from "../main.js";
import { go, rerender } from "../router.js";
import { Records, Schedules, Doses, CustomItems, markDataSince } from "../db/repo.js";
import { deleteRecord } from "../db/trash.js";
import { todaysMedTasks } from "../domain/reminders.js";
import { today, nowTime } from "../domain/dates.js";
import { parseWeight } from "../domain/format.js";
import { petHeaderHTML, bindPetTabs, escapeHtml } from "../ui/pet-header.js";
import { confirmDialog } from "../ui/dialog.js";
import { toast } from "../ui/toast.js";
import { showError, clearError } from "../ui/errors.js";
import { M } from "../messages.ja.js";
import { uuid } from "../db/repo.js";

function choiceGroup(name, options, current) {
  return `<div class="choices" data-group="${name}">
    ${options.map((o) => `<button type="button" class="choice ${current === o.value ? "selected" : ""}" data-value="${o.value}">${o.label}</button>`).join("")}
  </div>`;
}
function bindChoices(root) {
  root.querySelectorAll("[data-group]").forEach((g) => {
    g.addEventListener("click", (e) => {
      const b = e.target.closest(".choice"); if (!b) return;
      const was = b.classList.contains("selected");
      g.querySelectorAll(".choice").forEach((c) => c.classList.remove("selected"));
      if (!was) b.classList.add("selected");
      if (g.dataset.group === "poop") togglePoopState(root);
    });
  });
}
function groupValue(root, name) {
  return root.querySelector(`[data-group="${name}"] .choice.selected`)?.dataset.value || null;
}
function togglePoopState(root) {
  const wrap = root.querySelector("#poop-state-wrap");
  if (wrap) wrap.style.display = groupValue(root, "poop") === "yes" ? "" : "none";
}

export async function render(root, params) {
  const batch = params.get("batch") === "1";
  const editId = params.get("id");
  const pet = app.currentPet;
  if (!pet) { go("/onboarding"); return; }
  let existing = null;
  if (editId) existing = await Records.get(editId);
  const date0 = existing?.date || params.get("date") || today();
  const allItems = (await CustomItems.all()).filter((i) => !i.hidden);

  const itemsFor = (p) => allItems.filter((i) => !i.petIds || i.petIds.includes(p.id));
  const customFields = (p, values = {}) => itemsFor(p).map((item) => {
    const v = values[item.id];
    if (item.type === "check") return `<div class="checkrow"><input type="checkbox" id="ci-${p.id}-${item.id}" data-ci="${item.id}" data-pet="${p.id}" ${v ? "checked" : ""}><label for="ci-${p.id}-${item.id}">${escapeHtml(item.label)}</label></div>`;
    if (item.type === "choice") return `<div class="field"><span class="label">${escapeHtml(item.label)}</span><div class="choices" data-ci-group="${item.id}" data-pet="${p.id}">${item.choices.map((c) => `<button type="button" class="choice ${v === c ? "selected" : ""}" data-value="${escapeHtml(c)}">${escapeHtml(c)}</button>`).join("")}</div></div>`;
    if (item.type === "number") return `<div class="field"><label>${escapeHtml(item.label)}</label><input type="text" inputmode="decimal" data-ci="${item.id}" data-pet="${p.id}" value="${v ?? ""}" placeholder="${escapeHtml(item.unit || "")}"></div>`;
    return `<div class="field"><label>${escapeHtml(item.label)}</label><input type="text" data-ci="${item.id}" data-pet="${p.id}" value="${escapeHtml(v ?? "")}"></div>`;
  }).join("");

  const medSection = async (p, dateStr) => {
    const [schedules, doses] = await Promise.all([Schedules.byPet(p.id), Doses.byPetDate(p.id, dateStr)]);
    const tasks = todaysMedTasks(schedules, doses, dateStr);
    if (!tasks.length) return "";
    return `<div class="field"><span class="label">お薬（${escapeHtml(p.name)}）</span>
      ${tasks.map((x) => `<div class="checkrow">
        <input type="checkbox" id="dose-${p.id}-${x.slot.key}" data-dose-pet="${p.id}" data-sid="${x.schedule.id}" data-slot="${x.slot.key}" ${x.done ? "checked" : ""}>
        <label for="dose-${p.id}-${x.slot.key}">${escapeHtml(x.schedule.title)}${x.slot.label ? `（${escapeHtml(x.slot.label)}）` : ""}${x.slot.time ? ` ${x.slot.time}` : ""}</label></div>`).join("")}
    </div>`;
  };

  const targetPets = batch ? app.pets : [pet];
  root.innerHTML = `
    ${batch ? `<h1>みんな分をまとめて記録</h1><p class="small">同じ内容を ${app.pets.length} 頭分まとめて付けます。体重など違うところは、あとから1頭ずつ直せます。</p>`
      : petHeaderHTML(app.pets, pet.id)}
    <div class="error-box" id="err"></div>
    <form id="rec-form">
      <div class="field"><label for="f-date">日付</label>
        <input type="date" id="f-date" value="${existing?.date || date0}" required></div>
      <div class="field"><label for="f-time">時刻</label>
        <input type="time" id="f-time" value="${existing?.time || nowTime()}"></div>
      <div class="field"><span class="label">食事の量</span>${choiceGroup("meal", M.mealOptions, existing?.meal)}</div>
      <div class="field"><span class="label">水</span>${choiceGroup("water", M.waterOptions, existing?.water)}</div>
      <div class="field"><span class="label">おしっこ</span>${choiceGroup("pee", [{ value: "yes", label: "あり" }, { value: "no", label: "なし" }], existing?.pee)}</div>
      <div class="field"><span class="label">うんち</span>${choiceGroup("poop", [{ value: "yes", label: "あり" }, { value: "no", label: "なし" }], existing?.poop)}</div>
      <div class="field" id="poop-state-wrap" style="display:${existing?.poop === "yes" ? "" : "none"}"><span class="label">うんちの状態</span>${choiceGroup("poopState", M.poopStates, existing?.poopState)}</div>
      <div class="field"><label for="f-weight">体重（kg）</label>
        <input type="text" inputmode="decimal" id="f-weight" value="${existing?.weightKg ?? ""}" placeholder="例：4.2"></div>
      <div class="field"><label for="f-note">睡眠や様子のメモ</label>
        <textarea id="f-note" placeholder="よく寝ていた、散歩で少し歩けた など">${escapeHtml(existing?.note || "")}</textarea></div>
      ${batch ? targetPets.map((p) => customFields(p)).join("") : customFields(pet, existing?.custom || {})}
      <div id="med-wrap"></div>
      <button type="submit" class="btn btn-primary btn-block">${batch ? `${app.pets.length}頭分を保存する` : existing ? "変更を保存する" : "保存する"}</button>
      ${existing ? `<button type="button" class="btn btn-danger btn-block" id="del">この記録を消す</button>` : ""}
    </form>
    <p class="notice-line">${M.vetNotice}</p>
  `;
  bindPetTabs(root, async (id) => { await app.switchPet(id); rerender(); });
  bindChoices(root);
  root.querySelectorAll("[data-ci-group]").forEach((g) => g.addEventListener("click", (e) => {
    const b = e.target.closest(".choice"); if (!b) return;
    const was = b.classList.contains("selected");
    g.querySelectorAll(".choice").forEach((c) => c.classList.remove("selected"));
    if (!was) b.classList.add("selected");
  }));
  const renderMed = async () => {
    const d = root.querySelector("#f-date").value || today();
    const parts = [];
    for (const p of targetPets) parts.push(await medSection(p, d));
    root.querySelector("#med-wrap").innerHTML = parts.join("");
  };
  await renderMed();
  root.querySelector("#f-date").addEventListener("change", renderMed);

  root.querySelector("#del")?.addEventListener("click", async () => {
    const ok = await confirmDialog({ title: "この記録を消しますか？", body: "消しても、しばらくの間は設定の「ごみ箱」から元に戻せます。", okLabel: "消す", danger: true });
    if (!ok) return;
    await deleteRecord(existing, pet.name);
    toast("記録を消しました（ごみ箱から戻せます）");
    go("/review");
  });

  root.querySelector("#rec-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const errEl = root.querySelector("#err");
    clearError(errEl);
    const date = root.querySelector("#f-date").value;
    const time = root.querySelector("#f-time").value || nowTime();
    const weightRaw = root.querySelector("#f-weight").value;
    const weightKg = parseWeight(weightRaw);
    if (Number.isNaN(weightKg)) { showError(errEl, M.errors.badWeight); return; }
    const base = {
      date, time,
      meal: groupValue(root, "meal"), water: groupValue(root, "water"),
      pee: groupValue(root, "pee"), poop: groupValue(root, "poop"),
      poopState: groupValue(root, "poop") === "yes" ? groupValue(root, "poopState") : null,
      weightKg, note: root.querySelector("#f-note").value,
    };
    const doseBoxes = [...root.querySelectorAll("[data-dose-pet]")];
    const anyDose = doseBoxes.some((b) => b.checked);
    const anyField = base.meal || base.water || base.pee || base.poop || base.weightKg != null || base.note.trim();
    // カスタム項目の収集（ペットごと）
    const customByPet = {};
    for (const p of targetPets) {
      const obj = {};
      for (const item of itemsFor(p)) {
        if (item.type === "check") {
          const el = root.querySelector(`[data-ci="${item.id}"][data-pet="${p.id}"]`);
          if (el?.checked) obj[item.id] = true;
        } else if (item.type === "choice") {
          const v = root.querySelector(`[data-ci-group="${item.id}"][data-pet="${p.id}"] .choice.selected`)?.dataset.value;
          if (v) obj[item.id] = v;
        } else {
          const el = root.querySelector(`[data-ci="${item.id}"][data-pet="${p.id}"]`);
          const v = el?.value.trim();
          if (v) obj[item.id] = item.type === "number" ? (Number(v) || v) : v;
        }
      }
      customByPet[p.id] = obj;
    }
    const anyCustom = Object.values(customByPet).some((o) => Object.keys(o).length);
    if (!anyField && !anyDose && !anyCustom && !existing) { showError(errEl, M.errors.emptyRecord); return; }

    const batchId = batch ? uuid() : null;
    const createdIds = [];
    try {
      for (const p of targetPets) {
        const hasContent = anyField || Object.keys(customByPet[p.id]).length;
        if (existing && !batch) {
          await Records.save({ ...existing, ...base, custom: { ...(existing.custom || {}), ...customByPet[p.id] } });
        } else if (hasContent) {
          const rec = await Records.save({ id: null, petId: p.id, ...base, custom: customByPet[p.id], batchId });
          createdIds.push(rec.id);
        }
        // 投薬は記録と同じタイミングで保存（R11）
        for (const b of doseBoxes.filter((x) => x.dataset.dosePet === p.id)) {
          const id = Doses.id(b.dataset.sid, date, b.dataset.slot);
          if (b.checked) {
            const s = await Schedules.get(b.dataset.sid);
            const slot = s?.slots.find((x) => x.key === b.dataset.slot);
            await Doses.save({ id, scheduleId: b.dataset.sid, petId: p.id, date, slotKey: b.dataset.slot,
              doneAt: new Date().toISOString(), titleSnapshot: s?.title || "", slotLabelSnapshot: slot?.label || "" });
          } else {
            await Doses.remove(id);
          }
        }
      }
      await markDataSince();
    } catch (err) {
      const { describeDbError } = await import("../ui/errors.js");
      showError(errEl, describeDbError(err));
      return;
    }
    if (batch) {
      toast(`${app.pets.length}頭分を記録しました`, { actionLabel: "取り消す", ms: 6000, onAction: async () => {
        for (const id of createdIds) await Records.remove(id);
        rerender();
      }});
    } else {
      toast("保存しました");
    }
    go("/");
  });
}
