// 画面の文言すべて（アプリ名もここに集約：表示名の置き場の1つ）
export const M = {
  appName: "そばにいる手帳",
  vetNotice: "体調の判断は必ず獣医師へ", // 禁止事項対応：各画面に表示
  vetDisclaimer: "この手帳は獣医師の診察の代わりにはなりません", // V5：最初の画面と記録画面の下に常時表示
  medSourceNotice: "お薬の名前・量・回数は、獣医師の指示どおりに入れてください。この手帳が量や回数を決めたり、勧めたりすることはありません", // V8：出どころの明示
  noNotifyNotice: "時刻になっても通知は出ません。スマホのアラームと併用してください", // リマインドの必須明記
  exportIncludesNotice: "書き出したファイルには、持病メモや緊急連絡先メモなど、メモの内容もすべて含まれます。大切に保管してください",
  mealOptions: [
    { value: "all", label: "全部" }, { value: "half", label: "半分" },
    { value: "little", label: "少し" }, { value: "none", label: "食べない" },
  ],
  waterOptions: [
    { value: "much", label: "多い" }, { value: "normal", label: "ふつう" },
    { value: "little", label: "少ない" }, { value: "none", label: "飲まない" },
  ],
  poopStates: [
    { value: "normal", label: "ふつう" }, { value: "hard", label: "かたい" },
    { value: "soft", label: "やわらかい" }, { value: "watery", label: "水っぽい" },
  ],
  petColors: ["aka", "ao", "midori", "yamabuki", "murasaki", "chairo"],
  errors: {
    saveFailed: "保存できませんでした。もう一度お試しください。何度も起きる場合は、設定からバックアップを書き出してください",
    quota: "保存できる空きが足りないようです。設定からバックアップを書き出し、不要なアプリや写真を整理してください",
    notPersisted: "このブラウザでは、データの保護（消えにくくする設定）ができませんでした。機種変更やブラウザの整理で消えることがあるので、設定からこまめにバックアップを書き出してください",
    loadFailed: "読み込めませんでした。ファイルが壊れているか、このアプリのファイルではないようです。元のデータはそのまま残っています",
    tooNew: "このファイルは新しい版のアプリで書き出されたものです。アプリを最新にしてから読み込んでください",
    migrationFailed: "データの形式を新しい版に移すことができませんでした。元のデータはそのまま残っています。バックアップを書き出してからお知らせください",
    blocked: "ほかのタブでこのアプリが開かれているため、更新できませんでした。ほかのタブを閉じてから開き直してください",
    emptyRecord: "何も入力されていません。どれか1つでも入力してから保存してください",
    nameRequired: "名前を入力してください",
    titleRequired: "予定の名前を入力してください",
    badWeight: "体重は数字で入力してください（例：4.2）",
  },
};
export const WEEKDAY_LABELS = ["日", "月", "火", "水", "木", "金", "土"];
