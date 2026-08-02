import type { DialPuzzleConfig } from "../state/types";

export function openDialPuzzle(config: DialPuzzleConfig, onSolved: () => void): void {
  const overlay = document.getElementById("puzzle-overlay");
  if (!overlay) return;

  const selected = config.answer.map(() => config.symbols[0]);

  overlay.innerHTML = "";
  overlay.classList.remove("hidden");

  const card = document.createElement("div");
  card.className = "puzzle-card";

  const title = document.createElement("h2");
  title.textContent = config.title;
  card.appendChild(title);

  const instructions = document.createElement("p");
  instructions.textContent = config.instructions;
  card.appendChild(instructions);

  const dials = document.createElement("div");
  dials.className = "puzzle-dials";

  config.answer.forEach((_, ringIndex) => {
    const select = document.createElement("select");
    select.className = "puzzle-dial";
    select.setAttribute("aria-label", `Ring ${ringIndex + 1}`);
    config.symbols.forEach((symbol) => {
      const option = document.createElement("option");
      option.value = symbol;
      option.textContent = symbol;
      select.appendChild(option);
    });
    select.addEventListener("change", () => {
      selected[ringIndex] = select.value;
    });
    dials.appendChild(select);
  });
  card.appendChild(dials);

  const feedback = document.createElement("div");
  feedback.className = "puzzle-feedback";
  card.appendChild(feedback);

  const actions = document.createElement("div");
  actions.className = "puzzle-actions";

  const closeBtn = document.createElement("button");
  closeBtn.id = "puzzle-close";
  closeBtn.textContent = "Close";
  closeBtn.addEventListener("click", () => closeDialPuzzle());

  const confirmBtn = document.createElement("button");
  confirmBtn.id = "puzzle-confirm";
  confirmBtn.textContent = "Set Dial";
  confirmBtn.addEventListener("click", () => {
    const correct = config.answer.every((sym, i) => sym === selected[i]);
    if (correct) {
      feedback.textContent = config.successText;
      feedback.className = "puzzle-feedback success";
      confirmBtn.disabled = true;
      window.setTimeout(() => {
        closeDialPuzzle();
        onSolved();
      }, 1200);
    } else {
      feedback.textContent = "The dial resists — that's not quite right.";
      feedback.className = "puzzle-feedback error";
    }
  });

  actions.appendChild(closeBtn);
  actions.appendChild(confirmBtn);
  card.appendChild(actions);

  overlay.appendChild(card);
}

export function closeDialPuzzle(): void {
  const overlay = document.getElementById("puzzle-overlay");
  if (!overlay) return;
  overlay.classList.add("hidden");
  overlay.innerHTML = "";
}
