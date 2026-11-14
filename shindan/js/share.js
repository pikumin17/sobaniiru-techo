// シェア（Web Share / X / LINE / 文章コピー / 画像生成）
// ペットの名前は扱わない（最小版では名前なし：設計書 §7.7）
export function resultUrl(data, type) {
  const base = new URL("./result/", location.href);
  return new URL(`${data.species}-${type.slug}.html`, base).href;
}
export function shareText(data, type) {
  const who = data.species === "dog" ? "うちの犬" : "うちの猫";
  return `${who}は「${type.name}」でした${data.emoji}\n${data.title}（無料・登録不要）\n${data.hashtag}\n${resultUrl(data, type)}`;
}
export function bindShare(root, data, type) {
  const text = shareText(data, type);
  const url = resultUrl(data, type);
  root.querySelector("[data-share-native]")?.addEventListener("click", async () => {
    try { await navigator.share({ text, url }); } catch { /* キャンセル時は何もしない */ }
  });
  const x = root.querySelector("[data-share-x]");
  if (x) x.href = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
  const line = root.querySelector("[data-share-line]");
  if (line) line.href = `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
  root.querySelector("[data-share-copy]")?.addEventListener("click", async (e) => {
    try { await navigator.clipboard.writeText(text); e.target.textContent = "コピーしました"; }
    catch { prompt("この文章をコピーしてください", text); }
  });
  root.querySelector("[data-share-image]")?.addEventListener("click", () => downloadImage(data, type));
}
// 1200×630 のシェア画像をCanvasで生成して保存
export function drawShareImage(data, type) {
  const c = document.createElement("canvas");
  c.width = 1200; c.height = 630;
  const g = c.getContext("2d");
  g.fillStyle = "#fdf8f0"; g.fillRect(0, 0, 1200, 630);
  g.fillStyle = type.color; g.fillRect(0, 0, 1200, 18); g.fillRect(0, 612, 1200, 18);
  g.textAlign = "center";
  g.font = "120px sans-serif"; g.fillText(data.emoji, 600, 190);
  g.fillStyle = "#33302a"; g.font = "bold 54px sans-serif";
  wrapText(g, type.name, 600, 300, 1040, 68);
  g.font = "30px sans-serif"; g.fillStyle = "#6f6a5e";
  g.fillText(data.title + "（無料・登録不要）", 600, 520);
  g.font = "26px sans-serif";
  g.fillText("そばにいる手帳", 600, 566);
  return c;
}
function wrapText(g, text, x, y, maxW, lh) {
  const lines = [];
  let line = "";
  for (const ch of text) {
    if (g.measureText(line + ch).width > maxW && line) { lines.push(line); line = ch; }
    else line += ch;
  }
  if (line) lines.push(line);
  lines.forEach((l, i) => g.fillText(l, x, y + i * lh));
  return lines.length;
}
export function downloadImage(data, type) {
  const c = drawShareImage(data, type);
  c.toBlob((blob) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${data.species}-${type.slug}.png`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  });
}
