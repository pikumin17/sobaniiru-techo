// IndexedDB の薄いラッパー（依存なし）
import { DB_NAME, DB_VERSION } from "../config.js";
import { runUpgrade } from "./migrations.js";

let dbPromise = null;
let activeName = DB_NAME;

export function setDBName(name) { activeName = name; dbPromise = null; }
export function getDBName() { return activeName; }

export function openDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(activeName, DB_VERSION);
    req.onupgradeneeded = (ev) => {
      try { runUpgrade(req.result, req.transaction, ev.oldVersion, DB_VERSION); }
      catch (e) { reject(e); }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    req.onblocked = () => reject(new Error("blocked"));
  });
  return dbPromise;
}

function tx(stores, mode) {
  return openDB().then((db) => db.transaction(stores, mode));
}
function reqDone(r) {
  return new Promise((resolve, reject) => {
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}
export async function idbGet(store, key) {
  const t = await tx([store], "readonly");
  return reqDone(t.objectStore(store).get(key));
}
export async function idbGetAll(store) {
  const t = await tx([store], "readonly");
  return reqDone(t.objectStore(store).getAll());
}
export async function idbGetAllByIndex(store, index, query) {
  const t = await tx([store], "readonly");
  return reqDone(t.objectStore(store).index(index).getAll(query));
}
export async function idbPut(store, value) {
  const t = await tx([store], "readwrite");
  await reqDone(t.objectStore(store).put(value));
  return txComplete(t);
}
export async function idbDelete(store, key) {
  const t = await tx([store], "readwrite");
  await reqDone(t.objectStore(store).delete(key));
  return txComplete(t);
}
export function txComplete(t) {
  return new Promise((resolve, reject) => {
    t.oncomplete = () => resolve();
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error || new Error("abort"));
  });
}
// 複数ストアにまたがる処理用：生のトランザクションを渡す
export async function withTx(stores, mode, fn) {
  const t = await tx(stores, mode);
  const result = await fn(t);
  await txComplete(t);
  return result;
}
export function storeGet(t, store, key) { return reqDone(t.objectStore(store).get(key)); }
export function storeGetAll(t, store) { return reqDone(t.objectStore(store).getAll()); }
export function storePut(t, store, value) { return reqDone(t.objectStore(store).put(value)); }
export function storeDelete(t, store, key) { return reqDone(t.objectStore(store).delete(key)); }
export function storeGetAllByIndex(t, store, index, query) {
  return reqDone(t.objectStore(store).index(index).getAll(query));
}
// DBごと削除（テスト用DBのみで使う想定。通常画面からは呼ばない）
export function deleteDatabase(name) {
  return new Promise((resolve, reject) => {
    const r = indexedDB.deleteDatabase(name);
    r.onsuccess = () => resolve();
    r.onerror = () => reject(r.error);
    r.onblocked = () => resolve();
  });
}
