import { CAT } from "./data-cat.js";
import { startQuiz } from "./quiz.js";
document.getElementById("start").addEventListener("click", () => startQuiz(CAT));
