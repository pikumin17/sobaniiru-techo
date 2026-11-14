// A0 はじめに
import { go } from "../router.js";
import { M } from "../messages.ja.js";

export async function render(root) {
  root.innerHTML = `
    <h1>${M.appName}へようこそ</h1>
    <p class="lead">シニアの犬・猫の毎日のお世話を、家族みんなで記録するための手帳です。</p>
    <div class="card">
      <h2>できること</h2>
      <p>🍚 食事・水・排泄・お薬・体重の記録<br>
      🗓 投薬と通院の予定（開いたときに表示）<br>
      📄 家族・シッター・動物病院への申し送り（PDF）</p>
    </div>
    <div class="card">
      <h2>大切なお知らせ</h2>
      <p>・記録は<strong>この端末の中だけ</strong>に保存されます。サーバーには送りません。<br>
      ・<strong>${M.noNotifyNotice}</strong><br>
      ・${M.vetNotice}。この手帳は記録のためのもので、診断はしません。<br>
      ・機種変更のときは、設定の「バックアップを書き出す」でデータを移せます。ときどき書き出しておくと安心です。</p>
    </div>
    <button class="btn btn-primary btn-block" id="to-pet">子を登録する</button>
    <button class="btn btn-block" id="to-import">バックアップから読み込む（機種変更のとき）</button>
  `;
  root.querySelector("#to-pet").addEventListener("click", () => go("/pet-edit"));
  root.querySelector("#to-import").addEventListener("click", () => go("/import"));
}
