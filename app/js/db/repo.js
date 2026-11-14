// データアクセス層
import { idbGet, idbGetAll, idbGetAllByIndex, idbPut, idbDelete } from "./idb.js";
import { nowISO } from "../domain/dates.js";

export const uuid = () => (crypto.randomUUID ? crypto.randomUUID() :
  "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  }));

export const Pets = {
  all: async () => (await idbGetAll("pets")).sort((a, b) => a.order - b.order),
  get: (id) => idbGet("pets", id),
  async save(pet) {
    const now = nowISO();
    if (!pet.id) { pet.id = uuid(); pet.createdAt = now; }
    pet.updatedAt = now;
    await idbPut("pets", pet);
    return pet;
  },
};
export const Records = {
  get: (id) => idbGet("records", id),
  byPet: (petId) => idbGetAllByIndex("records", "petId_date", IDBKeyRange.bound([petId], [petId + "￿"])),
  byPetDate: (petId, date) => idbGetAllByIndex("records", "petId_date", IDBKeyRange.only([petId, date])),
  async byPetRange(petId, from, to) {
    const all = await idbGetAllByIndex("records", "petId_date", IDBKeyRange.bound([petId, from], [petId, to]));
    return all.sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  },
  async save(rec) {
    const now = nowISO();
    if (!rec.id) { rec.id = uuid(); rec.createdAt = now; }
    rec.updatedAt = now;
    await idbPut("records", rec);
    return rec;
  },
  remove: (id) => idbDelete("records", id),
};
export const Schedules = {
  all: () => idbGetAll("schedules"),
  byPet: (petId) => idbGetAllByIndex("schedules", "petId", petId),
  get: (id) => idbGet("schedules", id),
  async save(s) {
    const now = nowISO();
    if (!s.id) { s.id = uuid(); s.createdAt = now; }
    s.updatedAt = now;
    await idbPut("schedules", s);
    return s;
  },
};
export const Doses = {
  id: (scheduleId, date, slotKey) => `${scheduleId}_${date}_${slotKey}`,
  byPetDate: (petId, date) => idbGetAllByIndex("doses", "petId_date", IDBKeyRange.only([petId, date])),
  bySchedule: (scheduleId) => idbGetAllByIndex("doses", "scheduleId", scheduleId),
  save: (d) => idbPut("doses", d),
  remove: (id) => idbDelete("doses", id),
};
export const CustomItems = {
  all: async () => (await idbGetAll("customItems")).sort((a, b) => a.order - b.order),
  async save(item) {
    const now = nowISO();
    if (!item.id) { item.id = uuid(); item.createdAt = now; }
    item.updatedAt = now;
    await idbPut("customItems", item);
    return item;
  },
  remove: (id) => idbDelete("customItems", id),
};
// settings（書き出し対象）と device（端末ごと・書き出さない）
export const Settings = {
  get: async (key, fallback = "") => { const row = await idbGet("settings", key); return row ? row.value : fallback; },
  set: (key, value) => idbPut("settings", { key, value }),
};
export const Device = {
  get: async (key, fallback = null) => { const row = await idbGet("device", key); return row ? row.value : fallback; },
  set: (key, value) => idbPut("device", { key, value }),
};
export async function markDataSince() {
  const cur = await Device.get("dataSince", null);
  if (!cur) await Device.set("dataSince", nowISO());
}
