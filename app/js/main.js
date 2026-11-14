// 起動：DB接続・persist()・ごみ箱整理・ルーティング開始
import { openDB } from "./db/idb.js";
import { Device, Pets } from "./db/repo.js";
import { purgeExpired } from "./db/trash.js";
import { route, startRouter, go, parseHash } from "./router.js";
import { M } from "./messages.ja.js";
import { describeDbError } from "./ui/errors.js";
import * as onboarding from "./views/onboarding.js";
import * as home from "./views/home.js";
import * as record from "./views/record.js";
import * as review from "./views/review.js";
import * as chart from "./views/chart.js";
import * as schedules from "./views/schedules.js";
import * as pets from "./views/pets.js";
import * as handover from "./views/handover.js";
import * as settings from "./views/settings.js";
import * as importView from "./views/import.js";
import * as customItems from "./views/custom-items.js";
import * as trashView from "./views/trash-view.js";

export const app = {
  pets: [],
  currentPetId: null,
  get currentPet() { return this.pets.find((p) => p.id === this.currentPetId) || this.pets[0] || null; },
  async reloadPets() {
    this.pets = await Pets.all();
    const saved = await Device.get("currentPetId", null);
    if (!this.pets.some((p) => p.id === this.currentPetId)) this.currentPetId = this.pets[0]?.id || null;
    else if (saved && this.pets.some((p) => p.id === saved)) this.currentPetId = saved;
    if (this.currentPetId) await Device.set("currentPetId", this.currentPetId);
  },
  async switchPet(id) { this.currentPetId = id; await Device.set("currentPetId", id); },
};

async function initStorage() {
  // データ消失対策：永続化を要求する（必須）
  let persisted = false;
  try {
    if (navigator.storage?.persist) {
      persisted = await navigator.storage.persist();
      if (!persisted && navigator.storage.persisted) persisted = await navigator.storage.persisted();
    }
  } catch { /* 非対応環境では促しバナーで対応 */ }
  if (!persisted) {
    const el = document.getElementById("persist-note");
    if (el) { el.textContent = M.errors.notPersisted; el.classList.add("show"); }
  }
}

async function boot() {
  const fontScale = await Device.get("fontScale", "normal").catch(() => "normal");
  document.documentElement.dataset.font = fontScale || "normal";
  try {
    await openDB();
    await purgeExpired().catch(() => {});
    await app.reloadPets();
  } catch (e) {
    document.getElementById("view").innerHTML =
      `<div class="error-box show">${describeDbError(e)}</div>`;
    return;
  }
  await initStorage();

  route("/", async (root, p) => {
    if (!app.pets.length) return onboarding.render(root, p);
    return home.render(root, p);
  });
  route("/onboarding", (r, p) => onboarding.render(r, p));
  route("/record", (r, p) => record.render(r, p));
  route("/review", (r, p) => review.render(r, p));
  route("/chart", (r, p) => chart.render(r, p));
  route("/schedules", (r, p) => schedules.renderList(r, p));
  route("/schedule-edit", (r, p) => schedules.renderEdit(r, p));
  route("/pets", (r, p) => pets.renderList(r, p));
  route("/pet-edit", (r, p) => pets.renderEdit(r, p));
  route("/handover", (r, p) => handover.render(r, p));
  route("/settings", (r, p) => settings.render(r, p));
  route("/import", (r, p) => importView.render(r, p));
  route("/custom", (r, p) => customItems.render(r, p));
  route("/trash", (r, p) => trashView.render(r, p));

  const { path } = parseHash();
  if (!app.pets.length && path !== "/onboarding" && path !== "/import") go("/onboarding");
  startRouter();

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./sw.js", { updateViaCache: "none" }).catch(() => {});
  }
}
document.addEventListener("DOMContentLoaded", boot);
