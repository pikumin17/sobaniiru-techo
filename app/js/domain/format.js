// 列挙値→表示文字（ふりかえり・申し送り印刷で共用）
import { M } from "../messages.ja.js";

export const mealMark = (v) => ({ all: "全", half: "半", little: "少", none: "×" })[v] || "―";
export const mealLabel = (v) => M.mealOptions.find((o) => o.value === v)?.label || "記録なし";
export const waterLabel = (v) => M.waterOptions.find((o) => o.value === v)?.label || "記録なし";
export const yesNoLabel = (v) => (v === "yes" ? "あり" : v === "no" ? "なし" : "記録なし");
export const poopStateLabel = (v) => M.poopStates.find((o) => o.value === v)?.label || "";

export function recordSummary(r) {
  const parts = [];
  if (r.meal) parts.push(`食事:${mealLabel(r.meal)}`);
  if (r.water) parts.push(`水:${waterLabel(r.water)}`);
  if (r.pee) parts.push(`おしっこ:${yesNoLabel(r.pee)}`);
  if (r.poop) parts.push(`うんち:${yesNoLabel(r.poop)}${r.poop === "yes" && r.poopState ? `（${poopStateLabel(r.poopState)}）` : ""}`);
  if (r.weightKg != null) parts.push(`体重:${r.weightKg}kg`);
  return parts.join("　");
}
export function customValueText(item, v) {
  if (v === undefined || v === null) return "";
  if (item.type === "check") return v ? "した" : "";
  if (item.type === "number") return `${v}${item.unit || ""}`;
  return String(v);
}
// 全角数字・カンマを半角に直す
export function normalizeNumberInput(s) {
  return String(s).replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    .replace(/，/g, ",").replace(/．/g, ".").trim();
}
export function parseWeight(s) {
  const t = normalizeNumberInput(s).replace(/,/g, "");
  if (t === "") return null;
  const n = Number(t);
  return Number.isFinite(n) && n > 0 && n < 200 ? n : NaN;
}
