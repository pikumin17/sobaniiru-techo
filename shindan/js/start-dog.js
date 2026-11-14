import { DOG } from "./data-dog.js";
import { startQuiz } from "./quiz.js";
document.getElementById("start").addEventListener("click", () => startQuiz(DOG));
