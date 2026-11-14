// スキーマ定義（ビルド仕様書 §3.1）
export const STORES = {
  pets: { keyPath: "id", indexes: [] },
  records: { keyPath: "id", indexes: [
    { name: "petId_date", keyPath: ["petId", "date"] },
    { name: "date", keyPath: "date" },
  ] },
  schedules: { keyPath: "id", indexes: [ { name: "petId", keyPath: "petId" } ] },
  doses: { keyPath: "id", indexes: [
    { name: "petId_date", keyPath: ["petId", "date"] },
    { name: "scheduleId", keyPath: "scheduleId" },
  ] },
  customItems: { keyPath: "id", indexes: [] },
  settings: { keyPath: "key", indexes: [] },
  trash: { keyPath: "id", indexes: [ { name: "expiresAt", keyPath: "expiresAt" } ] },
  device: { keyPath: "key", indexes: [] },
};
// 書き出し対象（device は含めない：R4）
export const EXPORT_STORES = ["pets", "records", "schedules", "doses", "customItems", "settings", "trash"];
