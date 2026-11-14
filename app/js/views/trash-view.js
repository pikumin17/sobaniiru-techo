// A10 ごみ箱：戻す・完全に消す
import { rerender } from "../router.js";
import { listTrash, restoreTrash, deleteTrashForever } from "../db/trash.js";
import { fmtJP } from "../domain/dates.js";
import { escapeHtml } from "../ui/pet-header.js";
import { confirmDialog } from "../ui/dialog.js";
import { toast } from "../ui/toast.js";
import { app } from "../main.js";

export async function render(root) {
  const list = (await listTrash()).sort((a, b) => b.deletedAt.localeCompare(a.deletedAt));
  root.innerHTML = `
    <h1>ごみ箱</h1>
    <p class="small">消した記録・予定・子は30日間ここに残り、元に戻せます。30日を過ぎると自動で完全に消えます。</p>
    ${list.length === 0 ? `<p>ごみ箱は空です。</p>` : list.map((e) => `
      <div class="list-row">
        <span><strong>${escapeHtml(e.label)}</strong><br>
        <span class="small">${fmtJP(e.deletedAt.slice(0, 10))}に削除｜${fmtJP(e.expiresAt.slice(0, 10))}まで戻せます</span></span>
        <span>
          <button class="btn btn-sm btn-accent" data-restore="${e.id}">戻す</button>
          <button class="btn btn-sm" data-forever="${e.id}">完全に消す</button>
        </span>
      </div>`).join("")}
    <p><a href="#/settings">← 設定に戻る</a></p>`;
  root.querySelectorAll("[data-restore]").forEach((b) => b.addEventListener("click", async () => {
    const res = await restoreTrash(b.dataset.restore);
    if (res.blocked === "notfound") { toast("見つかりませんでした"); return; }
    if (res.blocked?.startsWith("petInTrash:")) {
      toast(`先に「${res.blocked.split(":")[1]}」をごみ箱から元に戻してください`);
      return;
    }
    if (res.blocked === "petMissing") { toast("この子のデータが見つからないため戻せません"); return; }
    await app.reloadPets();
    toast(`戻しました${res.skipped ? `（すでにあった ${res.skipped} 件は飛ばしました）` : ""}`);
    rerender();
  }));
  root.querySelectorAll("[data-forever]").forEach((b) => b.addEventListener("click", async () => {
    const ok = await confirmDialog({ title: "完全に消しますか？", body: "この操作は取り消せません。", okLabel: "完全に消す", danger: true });
    if (ok) { await deleteTrashForever(b.dataset.forever); await app.reloadPets(); rerender(); }
  }));
}
