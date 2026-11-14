// ハッシュルーティング
const routes = new Map();
export function route(path, fn) { routes.set(path, fn); }
export function go(path) {
  if (location.hash === `#${path}`) dispatch();
  else location.hash = `#${path}`;
}
export function parseHash() {
  const raw = location.hash.replace(/^#/, "") || "/";
  const [path, qs] = raw.split("?");
  return { path, params: new URLSearchParams(qs || "") };
}
let dirtyGuard = null;
export function setDirtyGuard(fn) { dirtyGuard = fn; } // 未保存がある場合に true を返す関数
async function dispatch() {
  if (dirtyGuard && !(await dirtyGuard())) return;
  const { path, params } = parseHash();
  const fn = routes.get(path) || routes.get("/");
  const root = document.getElementById("view");
  root.innerHTML = "";
  window.scrollTo(0, 0);
  await fn(root, params);
}
export function startRouter() {
  window.addEventListener("hashchange", dispatch);
  dispatch();
}
export function rerender() { return dispatch(); }
