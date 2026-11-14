// A6 ペット登録・編集・削除
import { app } from "../main.js";
import { go, rerender } from "../router.js";
import { Pets, Records, markDataSince } from "../db/repo.js";
import { deletePet } from "../db/trash.js";
import { today } from "../domain/dates.js";
import { escapeHtml } from "../ui/pet-header.js";
import { confirmDialog } from "../ui/dialog.js";
import { toast } from "../ui/toast.js";
import { showError, clearError } from "../ui/errors.js";
import { M } from "../messages.ja.js";

export async function renderList(root) {
  root.innerHTML = `
    <h1>子の一覧</h1>
    ${app.pets.map((p) => `<div class="list-row">
      <span><span class="pet-dot dot-${p.color}"></span> ${p.species === "dog" ? "🐶" : "🐱"} <strong>${escapeHtml(p.name)}</strong></span>
      <button class="btn btn-sm" data-edit="${p.id}">編集</button></div>`).join("") || `<p>まだ登録がありません。</p>`}
    <button class="btn btn-primary btn-block" id="add">＋ 子を追加する</button>
    <p><a href="#/settings">← 設定に戻る</a></p>`;
  root.querySelector("#add").addEventListener("click", () => go("/pet-edit"));
  root.querySelectorAll("[data-edit]").forEach((b) => b.addEventListener("click", () => go(`/pet-edit?id=${b.dataset.edit}`)));
}

export async function renderEdit(root, params) {
  const id = params.get("id");
  const pet = id ? await Pets.get(id) : null;
  const years = []; const thisYear = new Date().getFullYear();
  for (let y = thisYear; y >= thisYear - 35; y--) years.push(y);
  root.innerHTML = `
    <h1>${pet ? `${escapeHtml(pet.name)}の編集` : "子の登録"}</h1>
    <div class="error-box" id="err"></div>
    <form id="pet-form">
      <div class="field"><label for="p-name">名前（必須）</label>
        <input type="text" id="p-name" value="${escapeHtml(pet?.name || "")}" autocomplete="off"></div>
      <div class="field"><span class="label">犬／猫</span>
        <div class="choices" id="p-species">
          <button type="button" class="choice ${pet?.species !== "cat" ? "selected" : ""}" data-value="dog">🐶 犬</button>
          <button type="button" class="choice ${pet?.species === "cat" ? "selected" : ""}" data-value="cat">🐱 猫</button>
        </div></div>
      <div class="field"><label>生年月日（分からないところは空で大丈夫です）</label>
        <div style="display:flex;gap:8px">
          <select id="p-by" style="flex:1"><option value="">年</option>${years.map((y) => `<option ${pet?.birthYear === y ? "selected" : ""}>${y}</option>`).join("")}</select>
          <select id="p-bm" style="flex:1"><option value="">月</option>${Array.from({ length: 12 }, (_, i) => `<option value="${i + 1}" ${pet?.birthMonth === i + 1 ? "selected" : ""}>${i + 1}月</option>`).join("")}</select>
          <select id="p-bd" style="flex:1"><option value="">日</option>${Array.from({ length: 31 }, (_, i) => `<option value="${i + 1}" ${pet?.birthDay === i + 1 ? "selected" : ""}>${i + 1}日</option>`).join("")}</select>
        </div></div>
      ${pet ? `<div class="field"><label>いまの体重</label><p class="small" id="cur-weight">読み込み中…</p>
        <button type="button" class="btn btn-sm" id="to-record">体重を記録する</button></div>`
      : `<div class="field"><label for="p-weight">体重（kg・任意）</label>
        <input type="text" inputmode="decimal" id="p-weight" placeholder="例：4.2"><p class="small">入力すると、今日の記録として保存されます。</p></div>`}
      <div class="field"><label for="p-cond">持病メモ</label>
        <textarea id="p-cond" placeholder="例：腎臓の数値が高め、関節が弱い など">${escapeHtml(pet?.conditionsMemo || "")}</textarea></div>
      <div class="field"><label for="p-clinic">かかりつけ病院メモ</label>
        <textarea id="p-clinic" placeholder="例：○○動物病院、夜間は△△病院 など">${escapeHtml(pet?.clinicMemo || "")}</textarea></div>
      <button type="submit" class="btn btn-primary btn-block">保存する</button>
    </form>
    ${pet ? `<hr class="hr"><button class="btn btn-danger btn-block" id="del-pet">この子の登録と記録をすべて消す</button>
      <p class="small">消しても、しばらくの間は設定の「ごみ箱」から元に戻せます。</p>` : ""}
    <p class="notice-line">${M.vetNotice}</p>`;
  const sp = root.querySelector("#p-species");
  sp.addEventListener("click", (e) => {
    const b = e.target.closest(".choice"); if (!b) return;
    sp.querySelectorAll(".choice").forEach((c) => c.classList.remove("selected"));
    b.classList.add("selected");
  });
  if (pet) {
    const recs = await Records.byPet(pet.id);
    const w = recs.filter((r) => r.weightKg != null);
    root.querySelector("#cur-weight").textContent = w.length ? `${w[w.length - 1].weightKg}kg（${w[w.length - 1].date}の記録）` : "まだ体重の記録がありません";
    root.querySelector("#to-record").addEventListener("click", async () => { await app.switchPet(pet.id); go("/record"); });
    root.querySelector("#del-pet").addEventListener("click", async () => {
      const ok = await confirmDialog({ title: `${pet.name}の登録と記録をすべて消しますか？`, body: "記録・予定・投薬の記録も一緒にごみ箱へ移ります。しばらくの間は元に戻せます。", okLabel: "消す", danger: true });
      if (!ok) return;
      await deletePet(pet);
      await app.reloadPets();
      toast("ごみ箱へ移しました");
      go(app.pets.length ? "/pets" : "/onboarding");
    });
  }
  root.querySelector("#pet-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const errEl = root.querySelector("#err"); clearError(errEl);
    const name = root.querySelector("#p-name").value.trim();
    if (!name) { showError(errEl, M.errors.nameRequired); return; }
    const by = root.querySelector("#p-by").value ? Number(root.querySelector("#p-by").value) : null;
    const bm = by ? (root.querySelector("#p-bm").value ? Number(root.querySelector("#p-bm").value) : null) : null;
    const bd = bm ? (root.querySelector("#p-bd").value ? Number(root.querySelector("#p-bd").value) : null) : null;
    const data = {
      ...(pet || {}), name,
      species: sp.querySelector(".choice.selected")?.dataset.value || "dog",
      birthYear: by, birthMonth: bm, birthDay: bd,
      conditionsMemo: root.querySelector("#p-cond").value,
      clinicMemo: root.querySelector("#p-clinic").value,
      color: pet?.color || M.petColors[app.pets.length % M.petColors.length],
      order: pet?.order ?? app.pets.length,
    };
    const saved = await Pets.save(data);
    await app.reloadPets();
    await app.switchPet(saved.id);
    await markDataSince();
    if (!pet) {
      const wEl = root.querySelector("#p-weight");
      const { parseWeight } = await import("../domain/format.js");
      const w = wEl ? parseWeight(wEl.value) : null;
      if (w != null && !Number.isNaN(w)) {
        await Records.save({ id: null, petId: saved.id, date: today(), time: new Date().toTimeString().slice(0, 5),
          meal: null, water: null, pee: null, poop: null, poopState: null, weightKg: w, note: "", custom: {}, batchId: null });
      }
    }
    toast("保存しました");
    go("/");
  });
  rerender; // no-op reference to keep linter calm
}
