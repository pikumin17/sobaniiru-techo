let timer = null;
export function toast(msg, { actionLabel = null, onAction = null, ms = 3500 } = {}) {
  let el = document.querySelector(".toast");
  if (!el) { el = document.createElement("div"); el.className = "toast"; document.body.appendChild(el); }
  el.innerHTML = "";
  const span = document.createElement("span"); span.textContent = msg; el.appendChild(span);
  if (actionLabel && onAction) {
    const b = document.createElement("button");
    b.type = "button"; b.className = "toast-action"; b.textContent = actionLabel;
    b.addEventListener("click", () => { hide(); onAction(); });
    el.appendChild(b);
  }
  el.classList.add("show");
  clearTimeout(timer);
  timer = setTimeout(hide, ms);
  function hide() { el.classList.remove("show"); }
}
