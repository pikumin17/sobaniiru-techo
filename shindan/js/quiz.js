// 診断の進行（1問ずつ・回答は保存しない）
import { scoreQuiz } from "./score.js";
import { bindShare } from "./share.js";

const CHOICES = [ { label: "よくある", value: 2 }, { label: "ときどき", value: 1 }, { label: "あまりない", value: 0 } ];

export function startQuiz(data) {
  const main = document.getElementById("quiz");
  const answers = new Array(data.questions.length).fill(null);
  let idx = 0;
  function renderQuestion() {
    const q = data.questions[idx];
    main.innerHTML = `
      <p class="progress">${idx + 1} / ${data.questions.length} 問目</p>
      <div class="progress-bar"><div style="width:${((idx) / data.questions.length) * 100}%"></div></div>
      <h1 class="q-text">${q.text}</h1>
      <div class="q-choices">
        ${CHOICES.map((c) => `<button type="button" class="q-choice" data-v="${c.value}">${c.label}</button>`).join("")}
      </div>
      ${idx > 0 ? `<button type="button" class="btn btn-ghost" id="back">← 前の質問に戻る</button>` : ""}
      <p class="small">回答はこの画面の中だけで使います。どこにも送らず、保存もしません。</p>`;
    main.querySelectorAll(".q-choice").forEach((b) => b.addEventListener("click", () => {
      answers[idx] = Number(b.dataset.v);
      idx += 1;
      if (idx >= data.questions.length) renderResult();
      else renderQuestion();
    }));
    main.querySelector("#back")?.addEventListener("click", () => { idx -= 1; renderQuestion(); });
  }
  function renderResult() {
    const { typeAxis } = scoreQuiz(answers, data.questions, data.axes, 1);
    const type = data.types[typeAxis];
    main.innerHTML = `
      <p class="progress">診断結果（おたのしみ用）</p>
      <div class="result-emoji">${data.emoji}</div>
      <h1 class="result-name" style="color:${type.color}">${type.name}</h1>
      <p class="result-desc">${type.desc}</p>
      <div class="share-row">
        <button type="button" class="btn btn-primary" data-share-native>シェアする</button>
        <a class="btn" data-share-x target="_blank" rel="noopener">Xでシェア</a>
        <a class="btn" data-share-line target="_blank" rel="noopener">LINEで送る</a>
        <button type="button" class="btn" data-share-copy>文章をコピー</button>
        <button type="button" class="btn" data-share-image>画像を保存</button>
      </div>
      <p><button type="button" class="btn btn-ghost" id="retry">もう一度やってみる</button>
      <a class="btn btn-ghost" href="./index.html">診断の入口に戻る</a></p>
      <div class="app-guide">
        <p>シニアになったら、毎日の様子をこれで記録。<br>
        <strong>そばにいる手帳</strong> ― 無料・登録不要</p>
        <a class="btn btn-accent" href="../app/">見てみる</a>
      </div>`;
    bindShare(main, data, type);
    main.querySelector("#retry").addEventListener("click", () => {
      answers.fill(null); idx = 0; renderQuestion();
    });
    window.scrollTo(0, 0);
  }
  renderQuestion();
}
