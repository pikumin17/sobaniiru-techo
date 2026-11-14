// 画面内リマインドの計算（サーバーなし・開いたときだけ表示）
import { today, addDays, weekdayOf } from "./dates.js";
import { VISIT_LOOKAHEAD_DAYS } from "../config.js";

export function scheduleActiveOn(s, dateStr) {
  if (s.kind === "visit") return s.visitDate === dateStr;
  if (!s.startDate || dateStr < s.startDate) return false;
  if (s.endDate && dateStr > s.endDate) return false;
  const rep = s.repeat || { type: "daily", weekdays: [] };
  if (rep.type === "daily") return true;
  if (rep.type === "once") return s.startDate === dateStr;
  if (rep.type === "weekly") return (rep.weekdays || []).includes(weekdayOf(dateStr));
  return false;
}
// 今日の投薬タスク一覧: [{schedule, slot, done}]
export function todaysMedTasks(schedules, doses, dateStr = today()) {
  const doneIds = new Set(doses.map((d) => d.id));
  const tasks = [];
  for (const s of schedules) {
    if (s.kind !== "med" || !scheduleActiveOn(s, dateStr)) continue;
    for (const slot of s.slots || []) {
      tasks.push({ schedule: s, slot, done: doneIds.has(`${s.id}_${dateStr}_${slot.key}`) });
    }
  }
  return tasks.sort((a, b) => (a.slot.time || "99").localeCompare(b.slot.time || "99"));
}
// 近日の通院（今日〜VISIT_LOOKAHEAD_DAYS日先）
export function upcomingVisits(schedules, from = today()) {
  const until = addDays(from, VISIT_LOOKAHEAD_DAYS);
  return schedules
    .filter((s) => s.kind === "visit" && s.visitDate >= from && s.visitDate <= until)
    .sort((a, b) => (a.visitDate + (a.visitTime || "")).localeCompare(b.visitDate + (b.visitTime || "")));
}
