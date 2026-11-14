// A11 読み込み：ファイルを選ぶ→中身を確認→上書き/追加を選ぶ→実行
import { go } from "../router.js";
import { validateExport } from "../db/validate.js";
import { importData } from "../db/backup.js";
import { app } from "../main.js";
import { escapeHtml } from "../ui/pet-header.js";
import { toast } from "../ui/toast.js";
import { M } from "../messages.ja.js";

export async function render(root) {
  root.innerHTML = `
    <h1>バックアップを読み込む</h1>
    <p>前に書き出したファイル（JSON）を選んでください。読み込む前に、必ず確認画面が出ます。いまのデータは、選ぶまで変わりません。</p>
    <div class="error-box" id="err"></div>
    <div class="field"><label for="file">ファイルを選ぶ</label>
      <input type="file" id="file" accept=".json,application/json" style="min-height:56px;font-size:1rem"></div>
    <div id="confirm-area"></div>
    <p><a href="#/settings">← 設定に戻る</a></p>`;
  const errEl = root.querySelector("#err");
  root.querySelector("#file").addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    errEl.classList.remove("show");
    let parsed;
    try { parsed = JSON.parse(await file.text()); }
    catch {
      errEl.textContent = M.errors.loadFailed; errEl.classList.add("show"); return;
    }
    const checked = validateExport(parsed);
    if (!checked.ok) {
      errEl.textContent = checked.tooNew ? M.errors.tooNew : `${M.errors.loadFailed}（${checked.errors[0] || ""}）`;
      errEl.classList.add("show"); return;
    }
    const d = checked.data;
    const area = root.querySelector("#confirm-area");
    area.innerHTML = `
      <div class="card">
        <h2>このファイルで合っていますか？</h2>
        <p>書き出した日：${checked.exportedAt ? checked.exportedAt.slice(0, 10) : "不明"}<br>
        子：${(d.pets || []).length} 件（${(d.pets || []).map((p) => escapeHtml(p.name)).join("、")}）<br>
        記録：${(d.records || []).length} 件／予定：${(d.schedules || []).length} 件</p>
        <h3>読み込み方を選んでください</h3>
        <button class="btn btn-danger btn-block" id="imp-replace">今のデータをすべて消して、このファイルの内容にする</button>
        <button class="btn btn-primary btn-block" id="imp-merge">今のデータに、足りない分だけ追加する</button>
        <button class="btn btn-ghost btn-block" id="imp-cancel">やめる</button>
      </div>`;
    const run = async (mode) => {
      const res = await importData(parsed, mode);
      if (!res.ok) {
        errEl.textContent = res.errors?.[0] || M.errors.loadFailed;
        errEl.classList.add("show"); return;
      }
      await app.reloadPets();
      toast("読み込みました");
      go("/");
    };
    area.querySelector("#imp-replace").addEventListener("click", async () => {
      const { confirmDialog } = await import("../ui/dialog.js");
      const ok = await confirmDialog({ title: "今のデータをすべて消して入れ替えますか？", body: "この操作は取り消せません。心配なときは先に「設定」から今のデータを書き出してください。", okLabel: "入れ替える", danger: true });
      if (ok) run("replace");
    });
    area.querySelector("#imp-merge").addEventListener("click", () => run("merge"));
    area.querySelector("#imp-cancel").addEventListener("click", () => { area.innerHTML = ""; });
  });
}
