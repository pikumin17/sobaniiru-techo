// A9 カスタム項目の追加・編集（種類は作成後に変えられない：R26）
import { app } from "../main.js";
import { rerender } from "../router.js";
import { CustomItems } from "../db/repo.js";
import { escapeHtml } from "../ui/pet-header.js";
import { confirmDialog } from "../ui/dialog.js";
import { showError, clearError } from "../ui/errors.js";

const TYPE_LABELS = { check: "チェック（した／しない）", choice: "選択肢から選ぶ", number: "数字", text: "自由な文字" };

export async function render(root) {
  const items = await CustomItems.all();
  root.innerHTML = `
    <h1>記録の項目</h1>
    <p class="small">記録画面に出る項目を、自分で追加できます（例：床ずれのケア、歩行の様子）。種類は作ったあとでは変えられません。</p>
    ${items.map((i) => `<div class="list-row">
      <span><strong>${escapeHtml(i.label)}</strong> <span class="small">${TYPE_LABELS[i.type]}${i.hidden ? "（非表示）" : ""}${i.petIds ? `／対象：${i.petIds.map((id) => escapeHtml(app.pets.find((p) => p.id === id)?.name || "?")).join("、")}` : "／全員"}</span></span>
      <span>
        <button class="btn btn-sm" data-toggle="${i.id}">${i.hidden ? "表示する" : "隠す"}</button>
        <button class="btn btn-sm" data-del="${i.id}">消す</button>
      </span></div>`).join("") || `<p>まだ追加の項目はありません。</p>`}
    <div class="error-box" id="err"></div>
    <div class="card"><h2>項目を追加する</h2>
    <form id="ci-form">
      <div class="field"><label for="ci-label">項目の名前（必須）</label>
        <input type="text" id="ci-label" placeholder="例：床ずれのケア"></div>
      <div class="field"><label for="ci-type">種類</label>
        <select id="ci-type">
          <option value="check">${TYPE_LABELS.check}</option>
          <option value="choice">${TYPE_LABELS.choice}</option>
          <option value="number">${TYPE_LABELS.number}</option>
          <option value="text">${TYPE_LABELS.text}</option>
        </select></div>
      <div class="field" id="ci-choices-wrap" style="display:none"><label for="ci-choices">選択肢（1行に1つ）</label>
        <textarea id="ci-choices" placeholder="よい&#10;ふつう&#10;わるい"></textarea></div>
      <div class="field" id="ci-unit-wrap" style="display:none"><label for="ci-unit">単位（任意）</label>
        <input type="text" id="ci-unit" placeholder="例：分、回"></div>
      <div class="field"><span class="label">対象の子</span>
        <div class="checkrow"><input type="checkbox" id="ci-allpets" checked><label for="ci-allpets">全員</label></div>
        ${app.pets.map((p) => `<div class="checkrow"><input type="checkbox" class="ci-pet" id="ci-pet-${p.id}" value="${p.id}" disabled><label for="ci-pet-${p.id}">${escapeHtml(p.name)}</label></div>`).join("")}
      </div>
      <button type="submit" class="btn btn-primary btn-block">追加する</button>
    </form></div>
    <p><a href="#/settings">← 設定に戻る</a></p>`;
  const typeSel = root.querySelector("#ci-type");
  const syncType = () => {
    root.querySelector("#ci-choices-wrap").style.display = typeSel.value === "choice" ? "" : "none";
    root.querySelector("#ci-unit-wrap").style.display = typeSel.value === "number" ? "" : "none";
  };
  typeSel.addEventListener("change", syncType); syncType();
  root.querySelector("#ci-allpets").addEventListener("change", (e) => {
    root.querySelectorAll(".ci-pet").forEach((c) => { c.disabled = e.target.checked; });
  });
  root.querySelectorAll("[data-toggle]").forEach((b) => b.addEventListener("click", async () => {
    const item = items.find((i) => i.id === b.dataset.toggle);
    await CustomItems.save({ ...item, hidden: !item.hidden });
    rerender();
  }));
  root.querySelectorAll("[data-del]").forEach((b) => b.addEventListener("click", async () => {
    const item = items.find((i) => i.id === b.dataset.del);
    const ok = await confirmDialog({ title: `項目「${item.label}」を消しますか？`, body: "過去の記録に入っている値は残りますが、この項目は記録画面に出なくなります。", okLabel: "消す", danger: true });
    if (ok) { await CustomItems.remove(item.id); rerender(); }
  }));
  root.querySelector("#ci-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const errEl = root.querySelector("#err"); clearError(errEl);
    const label = root.querySelector("#ci-label").value.trim();
    if (!label) { showError(errEl, "項目の名前を入力してください"); return; }
    const type = typeSel.value;
    let choices = [];
    if (type === "choice") {
      choices = root.querySelector("#ci-choices").value.split("\n").map((s) => s.trim()).filter(Boolean);
      if (!choices.length) { showError(errEl, "選択肢を1つ以上入れてください"); return; }
    }
    const all = root.querySelector("#ci-allpets").checked;
    const petIds = all ? null : [...root.querySelectorAll(".ci-pet:checked")].map((c) => c.value);
    if (!all && !petIds.length) { showError(errEl, "対象の子を選んでください"); return; }
    await CustomItems.save({ id: null, label, type, choices, unit: type === "number" ? root.querySelector("#ci-unit").value.trim() : "",
      petIds, order: items.length, hidden: false });
    rerender();
  });
}
