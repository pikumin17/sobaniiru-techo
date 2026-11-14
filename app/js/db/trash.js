// ごみ箱（削除→一定期間復元可能）ビルド仕様書 §3.3 / §3.4
import { withTx, storeGet, storeGetAll, storePut, storeDelete, storeGetAllByIndex, idbGetAll } from "./idb.js";
import { TRASH_DAYS } from "../config.js";
import { addDays, today, fmtJP } from "../domain/dates.js";
import { uuid } from "./repo.js";

function trashEntry(kind, label, payload) {
  const deletedAt = new Date().toISOString();
  return {
    id: uuid(), kind, label, payload, deletedAt,
    expiresAt: addDays(today(), TRASH_DAYS) + "T23:59:59.999Z",
  };
}

export async function deleteRecord(record, petName) {
  const entry = trashEntry("record", `${fmtJP(record.date)} ${petName}の記録`, { records: [record] });
  await withTx(["records", "trash"], "readwrite", async (t) => {
    await storePut(t, "trash", entry);
    await storeDelete(t, "records", record.id);
  });
  return entry;
}
export async function deleteSchedule(schedule, petName) {
  const entry = trashEntry("schedule", `${petName}の予定「${schedule.title}」`, { schedules: [schedule] });
  await withTx(["schedules", "trash"], "readwrite", async (t) => {
    await storePut(t, "trash", entry);
    await storeDelete(t, "schedules", schedule.id);
  });
  return entry;
}
export async function deletePet(pet) {
  let entry;
  await withTx(["pets", "records", "schedules", "doses", "trash"], "readwrite", async (t) => {
    const records = await storeGetAllByIndex(t, "records", "petId_date", IDBKeyRange.bound([pet.id], [pet.id + "￿"]));
    const schedules = await storeGetAllByIndex(t, "schedules", "petId", pet.id);
    const doses = await storeGetAllByIndex(t, "doses", "petId_date", IDBKeyRange.bound([pet.id], [pet.id + "￿"]));
    entry = trashEntry("pet", `${pet.name}（子）の登録と記録すべて`, {
      pets: [pet], records, schedules, doses,
    });
    await storePut(t, "trash", entry);
    for (const r of records) await storeDelete(t, "records", r.id);
    for (const s of schedules) await storeDelete(t, "schedules", s.id);
    for (const d of doses) await storeDelete(t, "doses", d.id);
    await storeDelete(t, "pets", pet.id);
  });
  return entry;
}

export const listTrash = () => idbGetAll("trash");

// 復元（§3.4）。戻り値: {restored, skipped, blocked: 理由文字列|null}
export async function restoreTrash(trashId) {
  const result = { restored: 0, skipped: 0, blocked: null };
  await withTx(["pets", "records", "schedules", "doses", "trash"], "readwrite", async (t) => {
    const entry = await storeGet(t, "trash", trashId);
    if (!entry) { result.blocked = "notfound"; return; }
    const p = entry.payload || {};
    // ペットの存在チェック（記録・予定・投薬は、対象の子が居なければ戻さない）
    const needPetIds = new Set();
    for (const rows of [p.records || [], p.schedules || [], p.doses || []]) {
      for (const r of rows) needPetIds.add(r.petId);
    }
    const petsInPayload = new Set((p.pets || []).map((x) => x.id));
    for (const pid of needPetIds) {
      if (petsInPayload.has(pid)) continue;
      const exists = await storeGet(t, "pets", pid);
      if (!exists) {
        const inTrash = (await storeGetAll(t, "trash")).find((e) => e.kind === "pet" && (e.payload.pets || []).some((x) => x.id === pid));
        result.blocked = inTrash ? `petInTrash:${inTrash.payload.pets[0].name}` : "petMissing";
        throw new Error("__blocked__");
      }
    }
    for (const [store, rows] of Object.entries(p)) {
      for (const row of rows) {
        const exists = await storeGet(t, store, row.id);
        if (exists) { result.skipped += 1; continue; }
        await storePut(t, store, row);
        result.restored += 1;
      }
    }
    await storeDelete(t, "trash", trashId);
  }).catch((e) => { if (e.message !== "__blocked__") throw e; });
  return result;
}

export async function purgeExpired() {
  const now = new Date().toISOString();
  const all = await idbGetAll("trash");
  const expired = all.filter((e) => e.expiresAt < now);
  if (!expired.length) return 0;
  await withTx(["trash"], "readwrite", async (t) => {
    for (const e of expired) await storeDelete(t, "trash", e.id);
  });
  return expired.length;
}
export async function deleteTrashForever(trashId) {
  await withTx(["trash"], "readwrite", async (t) => { await storeDelete(t, "trash", trashId); });
}
