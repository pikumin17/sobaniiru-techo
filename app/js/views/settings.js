// A8 設定：バックアップ・文字の大きさ・緊急連絡先メモ・各画面への導線
import { app } from "../main.js";
import { go, rerender } from "../router.js";
import { Device, Settings } from "../db/repo.js";
import { downloadExport, countAll } from "../db/backup.js";
import { idbGetAll } from "../db/idb.js";
import { EXPORT_STORES } from "../db/schema.js";
import { APP_ID, APP_VERSION, FORMAT_VERSION } from "../config.js";
import { fmtJP } from "../domain/dates.js";
import { escapeHtml } from "../ui/pet-header.js";
import { toast } from "../ui/toast.js";
import { M } from "../messages.ja.js";

export async function render(root) {
  const lastExportAt = await Device.get("lastExportAt", null);
  const fontScale = await Device.get("fontScale", "normal");
  const emergency = await Settings.get("emergencyMemo", "");
  const counts = await countAll();
  let migBackups = [];
  try { migBackups = (await idbGetAll("backups")).sort((a, b) => String(a.createdAt || "").localeCompare(String(b.createdAt || ""))); } catch {}
  const latestBackup = migBackups[migBackups.length - 1] || null;
  let persisted = false;
  try { persisted = navigator.storage?.persisted ? await navigator.storage.persisted() : false; } catch {}
  root.innerHTML = `
    <h1>設定</h1>
    <div class="card">
      <h2>💾 バックアップ（大切）</h2>
      <p>記録はこの端末の中だけにあります。機種変更や故障に備えて、ときどき書き出してください。</p>
      <p>最後に書き出した日：<strong>${lastExportAt ? fmtJP(lastExportAt.slice(0, 10)) : "まだ書き出していません"}</strong><br>
      <span class="small">データの保護：${persisted ? "有効（ブラウザに消されにくい設定になっています）" : "未確認（ブラウザの設定で消えることがあります。こまめな書き出しをおすすめします）"}</span></p>
      <p class="small">いま保存されている件数：子 ${counts.pets} 件／記録 ${counts.records} 件／予定 ${counts.schedules} 件</p>
      <button class="btn btn-primary btn-block" id="export">バックアップを書き出す</button>
      <p class="notice-line">${M.exportIncludesNotice}</p>
      <button class="btn btn-block" id="to-import">バックアップを読み込む（機種変更のとき）</button>
      ${latestBackup ? `<p class="small">アプリの更新前に自動で控えたバックアップがあります（${fmtJP(String(latestBackup.createdAt).slice(0, 10))}）。</p>
      <button class="btn btn-block" id="mig-backup-dl">更新前のバックアップを書き出す</button>` : ""}
    </div>
    <div class="card">
      <h2>📱 ホーム画面への追加・機種変更の手順</h2>
      <p><strong>ホーム画面への追加</strong>：iPhoneは共有ボタン（□に↑のマーク）→「ホーム画面に追加」、Androidは「︙」メニュー→「ホーム画面に追加」。iPhoneのSafariは7日間使わなかったサイトのデータを消すことがありますが、ホーム画面に追加すると対象から外れます。</p>
      <p><strong>機種変更の手順</strong>：①今の端末で「バックアップを書き出す」→ ②ファイルを新しい端末へ送る（メールやクラウドなど）→ ③新しい端末でこの手帳を開き、設定の「バックアップを読み込む」からファイルを選ぶ。</p>
    </div>
    <div class="card">
      <h2>使い方・お問い合わせ</h2>
      <p>・記録は「記録する」から付けます。入力の途中は自動で保存されるので、途中で閉じても戻って続けられます。<br>
      ・お薬と通院は「予定」に登録すると、ホームに今日の分が出ます。<br>
      ・「ふりかえり」で日ごとの記録と、体重・食事のグラフが見られます。<br>
      ・家族や病院へ渡すときは「申し送りを作る」から印刷できます。</p>
      <p>お問い合わせ：<a href="https://github.com/pikumin17/sobaniiru-techo/issues" target="_blank" rel="noopener">そばにいる手帳の問い合わせページ</a></p>
      <button class="btn btn-block" id="to-privacy">プライバシーポリシー</button>
      <button class="btn btn-block" id="to-terms">利用規約</button>
    </div>
    <div class="card">
      <h2>緊急連絡先メモ</h2>
      <p class="small">申し送り（PDF）に入れるメモです。この端末の中だけに保存され、どこにも送られません。</p>
      <textarea id="emg" style="width:100%;min-height:96px;padding:12px;border:2px solid var(--line);border-radius:10px;font-size:1.05rem;font-family:inherit" placeholder="例：家族の電話番号、夜間病院の番号 など">${escapeHtml(emergency)}</textarea>
      <button class="btn btn-block" id="emg-save">メモを保存する</button>
    </div>
    <div class="card">
      <h2>文字の大きさ</h2>
      <div class="choices" id="font">
        <button type="button" class="choice ${fontScale === "normal" ? "selected" : ""}" data-v="normal">標準</button>
        <button type="button" class="choice ${fontScale === "large" ? "selected" : ""}" data-v="large">大</button>
        <button type="button" class="choice ${fontScale === "xlarge" ? "selected" : ""}" data-v="xlarge">特大</button>
      </div>
    </div>
    <div class="card">
      <h2>その他の管理</h2>
      <button class="btn btn-block" id="to-pets">🐾 子の一覧・登録</button>
      <button class="btn btn-block" id="to-custom">➕ 記録の項目を追加・編集</button>
      <button class="btn btn-block" id="to-handover">📄 申し送りを作る</button>
      <button class="btn btn-block" id="to-trash">🗑 ごみ箱（消した記録を戻す）</button>
    </div>
    <p class="notice-line">${M.vetNotice}<br>この手帳は記録専用です。診断や治療の相談はできません。</p>
    <p class="small">そばにいる手帳 バージョン ${APP_VERSION}</p>
  `;
  root.querySelector("#export").addEventListener("click", async () => {
    await downloadExport();
    toast("書き出しました");
    rerender();
  });
  root.querySelector("#to-import").addEventListener("click", () => go("/import"));
  root.querySelector("#emg-save").addEventListener("click", async () => {
    await Settings.set("emergencyMemo", root.querySelector("#emg").value);
    toast("保存しました");
  });
  root.querySelector("#font").addEventListener("click", async (e) => {
    const b = e.target.closest("[data-v]"); if (!b) return;
    await Device.set("fontScale", b.dataset.v);
    document.documentElement.dataset.font = b.dataset.v;
    rerender();
  });
  root.querySelector("#to-pets").addEventListener("click", () => go("/pets"));
  root.querySelector("#to-custom").addEventListener("click", () => go("/custom"));
  root.querySelector("#to-handover").addEventListener("click", () => go("/handover"));
  root.querySelector("#to-trash").addEventListener("click", () => go("/trash"));
  root.querySelector("#to-privacy").addEventListener("click", () => go("/privacy"));
  root.querySelector("#to-terms").addEventListener("click", () => go("/terms"));
  root.querySelector("#mig-backup-dl")?.addEventListener("click", async () => {
    const data = {};
    for (const s of EXPORT_STORES) data[s] = latestBackup.data?.[s] || [];
    const obj = { app: APP_ID, formatVersion: FORMAT_VERSION, exportedAt: latestBackup.createdAt, data };
    const blob = new Blob([JSON.stringify(obj, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${APP_ID}-backup-before-update.json`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    toast("書き出しました");
  });
}
