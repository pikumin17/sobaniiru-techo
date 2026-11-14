// 性格タイプ診断のスコア計算（純粋関数・テストと共用）
// answers: 質問順の配列（2=よくある, 1=ときどき, 0=あまりない）
// questions: [{axis}] axes: 軸の並び（同点時の優先順） balanceThreshold: バランス判定の差
export function scoreQuiz(answers, questions, axes, balanceThreshold = 1) {
  const sums = {};
  for (const a of axes) sums[a] = 0;
  questions.forEach((q, i) => { sums[q.axis] += answers[i] || 0; });
  const values = axes.map((a) => sums[a]);
  const max = Math.max(...values), min = Math.min(...values);
  if (max - min <= balanceThreshold) return { typeAxis: "balance", sums };
  // 最高点の軸、同点時は「前半（1〜5問目）の点が高い方」、それも同じなら軸の並び順
  const top = axes.filter((a) => sums[a] === max);
  if (top.length === 1) return { typeAxis: top[0], sums };
  const firstHalf = {};
  for (const a of top) {
    firstHalf[a] = questions.reduce((acc, q, i) => acc + (q.axis === a && i < 5 ? (answers[i] || 0) : 0), 0);
  }
  top.sort((a, b) => (firstHalf[b] - firstHalf[a]) || (axes.indexOf(a) - axes.indexOf(b)));
  return { typeAxis: top[0], sums };
}
