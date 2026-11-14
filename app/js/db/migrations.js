// バージョン管理と移行（ビルド仕様書 §3.5）
// MIGRATIONS: to（その版まで上げる）, upgrade(db,tx)（ストア作成）, transform（JSON読み込み時の純粋変換）
import { STORES } from "./schema.js";

// v1時点のストア（移行前バックアップの控え対象）
const V1_STORES = ["pets", "records", "schedules", "doses", "customItems", "settings", "trash", "device"];

export const MIGRATIONS = [
  {
    to: 1,
    upgrade(db) {
      for (const [name, def] of Object.entries(STORES)) {
        if (!db.objectStoreNames.contains(name)) {
          const store = db.createObjectStore(name, { keyPath: def.keyPath });
          for (const ix of def.indexes) store.createIndex(ix.name, ix.keyPath);
        }
      }
    },
    transform: {},
  },
  {
    to: 2,
    // backupsストアを足すだけの軽い移行。その際、形式が変わる「前」に
    // 既存データを backups へ丸ごと控える（チェックリスト II-7：移行前の自動バックアップ）
    upgrade(db, tx, oldVersion) {
      if (!db.objectStoreNames.contains("backups")) {
        db.createObjectStore("backups", { keyPath: "key" });
      }
      if (oldVersion >= 1) {
        const targets = V1_STORES.filter((n) => db.objectStoreNames.contains(n));
        if (!targets.length) return;
        const snapshot = {};
        let remaining = targets.length;
        for (const name of targets) {
          const req = tx.objectStore(name).getAll();
          req.onsuccess = () => {
            snapshot[name] = req.result || [];
            remaining -= 1;
            if (remaining === 0) {
              const now = new Date().toISOString();
              tx.objectStore("backups").put({
                key: `pre-v2-${now}`,
                kind: "preMigration",
                fromVersion: oldVersion,
                toVersion: 2,
                createdAt: now,
                data: snapshot,
              });
            }
          };
          req.onerror = () => { remaining -= 1; };
        }
      }
    },
    transform: {},
  },
];

export function runUpgrade(db, tx, oldVersion, newVersion) {
  for (const m of MIGRATIONS) {
    if (m.to > oldVersion && m.to <= newVersion) m.upgrade(db, tx, oldVersion);
  }
}
// 読み込んだデータ（旧 formatVersion）を現行形式へ変換する。失敗したら例外＝読み込み全体を中止
export function transformImported(data, fromVersion) {
  let out = data;
  for (const m of MIGRATIONS) {
    if (m.to > fromVersion) {
      const next = {};
      for (const [store, rows] of Object.entries(out)) {
        const fn = m.transform[store];
        next[store] = fn ? rows.map(fn) : rows;
      }
      out = next;
    }
  }
  return out;
}
