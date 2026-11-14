# そばにいる手帳（介護記録アプリ）＋ 犬・猫の性格タイプ診断

シニアの犬・猫の毎日の介護記録Webアプリ（最小版）と、集客用の無料性格診断ページです。
サーバーは使わず、記録はすべて利用者の端末内（IndexedDB）に保存されます。

## 構成

```
index.html          入口（アプリと診断への案内）
app/                介護記録アプリ本体（PWA、ハッシュルーティングの1ページ構成）
shindan/            性格タイプ診断（入口・犬・猫・タイプ別結果ページ12枚・OGP画像）
tests/              自動テスト用ページ（往復・移行・診断分布・エラー一覧）
_headers            Cloudflare Pages用（GitHub Pagesでは無視されます）
```

## 動かし方（手元）

ESモジュールを使うため `file://` では動きません。簡易サーバーで開いてください。

```
cd site
python3 -m http.server 8611
# ブラウザで http://localhost:8611/app/ を開く
```

## 公開手順（GitHub Pages）

1. この `site/` フォルダの中身を、公開用リポジトリのルートに置きます。
2. リポジトリの Settings → Pages で公開を有効にします。
3. 公開URLが決まったら、`shindan/site-url.txt` にそのURLを書き、
   タイプ別ページ12枚と診断のシェアURLに含まれる `__SITE_URL__` を置換します。

   ```
   sed -i "s|__SITE_URL__|https://（公開URL）|g" shindan/result/*.html
   ```

   ※ `scripts/gen-result-pages.mjs` で結果ページを作り直すと `__SITE_URL__` に戻るので、再生成したら置換もやり直してください。
4. 置換し忘れがないか確認します： `grep -rn "__SITE_URL__" site/` が0件であること。
5. Service Worker のキャッシュ名（`app/sw.js` の `CACHE`）は、アプリの版を上げるときに一緒に上げてください。

## テスト手順

ブラウザで次のページを開き、ボタンを押して実行します（いずれもテスト専用DB `sobaniiru-techo-test` のみ使用し、本番データには触りません）。

- `tests/roundtrip.html`：JSON書き出し→全削除→読み込みで全データが戻るか（往復テスト）
- `tests/migrations.html`：データ形式の移行の仕組み（適用・失敗時の中止・元データ保全）
- `tests/quiz-distribution.html`：性格診断の総当たり（3の10乗通り）でタイプ分布を確認
- `tests/error-gallery.html`：エラー表示の一覧（スクリーンショット用）

## データについて

- IndexedDB（DB名 `sobaniiru-techo`、**公開後は変更禁止**：変えると既存データが見えなくなります）
- 起動時に `navigator.storage.persist()` を呼び、端末に残りやすくします。
- バックアップはJSONの書き出し/読み込み（設定画面）。緊急連絡先メモ等のメモ類もファイルに含まれます。
- 通知（プッシュ）は最小版では出しません。投薬・通院は「開いたときに表示」する画面内リマインドのみで、その旨を画面に明記しています。

## 表示名（アプリ名）の置き場一覧

「そばにいる手帳」という表示名は次の場所にあります。名前を変えるときは全部を直し、`grep -rn "そばにいる手帳" site/` で確認してください。

- `index.html`、`app/index.html`（title・ロゴ）、`app/manifest.webmanifest`（name/short_name）
- `app/js/messages.ja.js`（M.appName）、`app/js/config.js`（APP_NAME）
- `shindan/` 配下の各HTML、`shindan/js/share.js`、結果ページ生成元 `scripts/gen-result-pages.mjs`
- OGP画像（`scripts/gen-images.py` で再生成）

内部ID `sobaniiru-techo`（DB名・書き出しJSONの `app` 値・ファイル名）は表示名とは別で、変更しません。

## 生成スクリプト

- `node scripts/gen-result-pages.mjs`：タイプ別ページ12枚を `shindan/js/data-*.js` から生成
- `python3 scripts/gen-images.py`：OGP画像12枚とアプリアイコン（192/512）を生成（要 Pillow と Noto Sans CJK）
