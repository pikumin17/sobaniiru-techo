// アクセス解析の差し込み口（最小版では何もしない。発注者確認事項Q1の判断後に実装）
import { ANALYTICS_ENABLED } from "./config.js";
export function track(_eventName) {
  if (!ANALYTICS_ENABLED) return;
  // 解析を入れる場合はここに実装する（外部送信先はCSPにも追加が必要）
}
