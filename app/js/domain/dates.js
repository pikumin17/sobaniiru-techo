// 日付ユーティリティ。日付は必ずローカル日付で作る（toISOStringで日付を作らない：R21）
const pad = (n) => String(n).padStart(2, "0");

export function localDate(d = new Date()) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
export function today() { return localDate(new Date()); }
export function nowISO() { return new Date().toISOString(); }
export function nowTime() {
  const d = new Date();
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
// "YYYY-MM-DD" をローカル日付として解釈する
export function parseDate(s) {
  const [y, m, dd] = s.split("-").map(Number);
  return new Date(y, m - 1, dd);
}
export function addDays(dateStr, n) {
  const d = parseDate(dateStr);
  d.setDate(d.getDate() + n);
  return localDate(d);
}
export function diffDays(a, b) { // b - a（日数）
  return Math.round((parseDate(b) - parseDate(a)) / 86400000);
}
export function weekdayOf(dateStr) { return parseDate(dateStr).getDay(); } // 0=日曜
const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];
export function fmtJP(dateStr) { // 11/14（金）
  const d = parseDate(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()}（${WEEKDAYS[d.getDay()]}）`;
}
export function fmtJPFull(dateStr) { // 2026年11月14日（金）
  const d = parseDate(dateStr);
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日（${WEEKDAYS[d.getDay()]}）`;
}
// 年齢の目安（誕生日が分かる範囲で計算）
export function ageText(pet, on = today()) {
  if (!pet.birthYear) return "";
  const onD = parseDate(on);
  let age = onD.getFullYear() - pet.birthYear;
  if (pet.birthMonth) {
    const bm = pet.birthMonth - 1;
    if (onD.getMonth() < bm || (onD.getMonth() === bm && pet.birthDay && onD.getDate() < pet.birthDay)) age -= 1;
  }
  if (age < 0) return "";
  return `${age}歳`;
}
