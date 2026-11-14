// バージョン管理と移行（ビルド仕様書 §3.5）
// MIGRATIONS: to（その版まで上げる）, upgrade(db,tx)（ストア作成）, transform（JSON読み込み時の純粋変換）
import { STORES } from "./schema.js";

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
];

export function runUpgrade(db, tx, oldVersion, newVersion) {
  for (const m of MIGRATIONS) {
    if (m.to > oldVersion && m.to <= newVersion) m.upgrade(db, tx);
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
