// そばにいる手帳 設定定数
// 日数などの数値は設計書の提案値を採用したもの。ここで一元管理する。
export const APP_NAME = "そばにいる手帳";
export const APP_ID = "sobaniiru-techo"; // DB名・書き出しJSONのapp値・ファイル名に使う内部ID（公開後変更禁止）
export const DB_NAME = APP_ID;
export const TEST_DB_NAME = "sobaniiru-techo-test";
export const DB_VERSION = 2;
export const FORMAT_VERSION = 1;
export const APP_VERSION = "1.2.0";

export const TRASH_DAYS = 30; // ごみ箱の保存期間（日）〔提案値〕
export const EXPORT_NUDGE_DAYS = 7; // 書き出しを促すまでの期間（日）〔提案値〕
export const VISIT_LOOKAHEAD_DAYS = 7; // 通院予定をホームに出す先読み（日）〔提案値〕
export const ANALYTICS_ENABLED = false; // アクセス解析は最小版では入れない（発注者確認事項Q1）
export const SHARE_IMAGE_W = 1200; // 診断シェア画像〔提案値〕
export const SHARE_IMAGE_H = 630;
export const BALANCE_THRESHOLD = 1; // 診断「バランス名人」の差のしきい値（点）〔提案値〕
