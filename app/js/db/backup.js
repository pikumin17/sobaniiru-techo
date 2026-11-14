// JSON書き出し・読み込み（機種変更・バックアップ用）
import { withTx, storeGetAll, storePut, storeDelete, idbGetAll } from "./idb.js";
import { EXPORT_STORES } from "./schema.js";
import { APP_ID, FORMAT_VERSION } from "../config.js";
import { validateExport } from "./validate.js";
import { transformImported } from "./migrations.js";
import { localDate } from "../domain/dates.js";
import { Device } from "./repo.js";

export async function buildExport() {
  const data = {};
  for (const store of EXPORT_STORES) data[store] = await idbGetAll(store);
  return { app: APP_ID, formatVersion: FORMAT_VERSION, exportedAt: new Date().toISOString(), data };
}
export function exportFileName() { return `${APP_ID}-${localDate()}.json`; }

export async function downloadExport() {
  const obj = await buildExport();
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = exportFileName();
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
  await Device.set("lastExportAt", new Date().toISOString());
  return obj;
}

// 読み込み。mode: "replace"（今のデータをすべて置き換え）| "merge"（IDが重ならないものを追加）
export async function importData(parsed, mode) {
  const checked = validateExport(parsed);
  if (!checked.ok) return { ok: false, errors: checked.errors, tooNew: !!checked.tooNew };
  let data;
  try { data = transformImported(checked.data, checked.formatVersion); }
  catch (e) { return { ok: false, errors: ["古い形式のデータを変換できませんでした。元のデータはそのまま残っています"] }; }

  const counts = {};
  await withTx([...EXPORT_STORES], "readwrite", async (t) => {
    if (mode === "replace") {
      for (const store of EXPORT_STORES) {
        const rows = await storeGetAll(t, store);
        for (const r of rows) await storeDelete(t, store, r.id ?? r.key);
      }
    }
    for (const store of EXPORT_STORES) {
      counts[store] = 0;
      for (const row of data[store] || []) {
        if (mode === "merge") {
          const key = row.id ?? row.key;
          const { storeGet } = await import("./idb.js");
          const exists = await storeGet(t, store, key);
          if (exists) continue;
        }
        await storePut(t, store, row);
        counts[store] += 1;
      }
    }
  });
  await Device.set("dataSince", (await Device.get("dataSince")) || new Date().toISOString());
  return { ok: true, counts };
}

export async function countAll() {
  const counts = {};
  for (const store of EXPORT_STORES) counts[store] = (await idbGetAll(store)).length;
  return counts;
}
