// 読み込みファイルの検査（アプリとテストで共用）
// 戻り値: { ok, errors: string[], data } data は検査を通った {store: rows} 形式
import { APP_ID, FORMAT_VERSION } from "../config.js";
import { EXPORT_STORES } from "./schema.js";

const isObj = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
const isStr = (v) => typeof v === "string";
const isNumOrNull = (v) => v === null || (typeof v === "number" && Number.isFinite(v));

function checkRow(store, row, errors) {
  if (!isObj(row)) { errors.push(`${store}: 形式が違うデータがあります`); return; }
  const need = (cond, msg) => { if (!cond) errors.push(msg); };
  switch (store) {
    case "pets":
      need(isStr(row.id) && row.id, "ペット: IDがありません");
      need(isStr(row.name), "ペット: 名前がありません");
      need(row.species === "dog" || row.species === "cat", "ペット: 犬/猫の区別が正しくありません");
      break;
    case "records":
      need(isStr(row.id) && isStr(row.petId) && isStr(row.date), "記録: 必須の項目が足りません");
      need(isNumOrNull(row.weightKg ?? null), "記録: 体重の形式が正しくありません");
      break;
    case "schedules":
      need(isStr(row.id) && isStr(row.petId) && isStr(row.title), "予定: 必須の項目が足りません");
      break;
    case "doses":
      need(isStr(row.id) && isStr(row.scheduleId), "投薬の記録: 必須の項目が足りません");
      break;
    case "customItems":
      need(isStr(row.id) && isStr(row.label), "記録の項目: 必須の項目が足りません");
      break;
    case "settings": case "device":
      need(isStr(row.key), "設定: キーがありません");
      break;
    case "trash":
      need(isStr(row.id) && isObj(row.payload), "ごみ箱: 必須の項目が足りません");
      break;
  }
}

export function validateExport(parsed) {
  const errors = [];
  if (!isObj(parsed)) return { ok: false, errors: ["ファイルの形式が違います（JSONではありません）"], data: null };
  if (parsed.app !== APP_ID) errors.push("このアプリの書き出しファイルではないようです");
  if (typeof parsed.formatVersion !== "number") errors.push("ファイルの版が分かりません");
  else if (parsed.formatVersion > FORMAT_VERSION) {
    return { ok: false, errors: ["このファイルは新しい版のアプリで書き出されたものです。アプリを最新にしてから読み込んでください"], data: null, tooNew: true };
  }
  if (!isObj(parsed.data)) errors.push("データ本体がありません");
  if (errors.length) return { ok: false, errors, data: null };
  const data = {};
  for (const store of EXPORT_STORES) {
    const rows = parsed.data[store] ?? [];
    if (!Array.isArray(rows)) { errors.push(`${store}: 一覧の形式が違います`); continue; }
    for (const row of rows) checkRow(store, row, errors);
    data[store] = rows;
  }
  if (errors.length) return { ok: false, errors: [...new Set(errors)].slice(0, 5), data: null };
  return { ok: true, errors: [], data, formatVersion: parsed.formatVersion, exportedAt: parsed.exportedAt || null };
}
