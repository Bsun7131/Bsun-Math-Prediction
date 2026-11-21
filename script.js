
/*
Copyright (c) 2026 Bisan Subba.
All rights reserved.

Project: Bsun Math Prediction
Version: 1.0
Author: Bisan Subba
*/

"use strict";

/* =====================================
   HTML ELEMENTS
===================================== */

const board = document.getElementById("gameBoard");
const predictionEl = document.getElementById("prediction");
const predictionNote = document.getElementById("predictionNote");
const statusEl = document.getElementById("status");
const revealBtn = document.getElementById("revealBtn");
const resultCard = document.getElementById("resultCard");
const finalTotalEl = document.getElementById("finalTotal");
const matchMessage = document.getElementById("matchMessage");
const newGameBtn = document.getElementById("newGameBtn");
const musicBtn = document.getElementById("musicBtn");

/* =====================================
   GAME VARIABLES
===================================== */

let rows = Array(5).fill(null);
let currentRow = 0;
let prediction = null;
let animating = false;
let gameVersion = 0;

const sleep = ms =>
  new Promise(resolve => setTimeout(resolve, ms));

function formatNumber(number) {
  return number.toLocaleString("en-GB");
}

/* =====================================
   GAME BOARD
===================================== */

function getInputs(row) {
  return Array.from(
    board.children[row].querySelectorAll(".digit")
  );
}

function setRowState(row, message) {
  board.children[row]
    .querySelector(".row-state")
    .textContent = message;
}

function createBoard() {
  board.innerHTML = "";

  for (let r = 0; r < 5; r++) {

    const card = document.createElement("div");
    card.className = "card";

    const computer = r === 2 || r === 4;

    if (computer) {
      card.classList.add("computer");
    }

    const heading = document.createElement("div");
    heading.className = "row-heading";

    const label = document.createElement("span");

    label.textContent =
      `ROW ${r + 1} — ${computer ? "BSUN" : "PLAYER"}`;

    const state = document.createElement("span");
    state.className = "row-state";
    state.textContent = "Waiting";

    heading.append(label, state);

    const digits = document.createElement("div");
    digits.className = "digits";

    for (let c = 0; c < 5; c++) {

      const input = document.createElement("input");

      input.className = "digit";
      input.type = "text";
      input.inputMode = "numeric";
      input.maxLength = 1;
      input.autocomplete = "off";
      input.disabled = true;

      input.setAttribute(
        "aria-label",
        `Row ${r + 1}, digit ${c + 1}`
      );

      /* Digit entry */

      input.addEventListener("input", () => {

        if (input.disabled || animating) return;

        input.value =
          input.value.replace(/\D/g, "").slice(-1);

        if (input.value && c < 4) {
          getInputs(r)[c + 1].focus();
        }

        updateConfirmButton();
      });

      /* Backspace navigation */

      input.addEventListener("keydown", event => {

        if (
          event.key === "Backspace" &&
          !input.value &&
          c > 0
        ) {
          getInputs(r)[c - 1].focus();
        }
      });

      /* Paste support */

      input.addEventListener("paste", event => {

        if (input.disabled || animating) return;

        event.preventDefault();

        const pasted = event.clipboardData
          .getData("text")
          .replace(/\D/g, "");

        if (!pasted) return;

        const inputs = getInputs(r);

        for (
          let i = 0;
          i < pasted.length && c + i < 5;
          i++
        ) {
          inputs[c + i].value = pasted[i];
        }

        inputs[
          Math.min(c + pasted.length, 4)
        ].focus();

        updateConfirmButton();
      });

      digits.appendChild(input);
    }

    card.append(heading, digits);
    board.appendChild(card);
  }
}

/* =====================================
   PLAYER INPUT
===================================== */

function updateConfirmButton() {

  const inputs = getInputs(currentRow);

  confirmBtn.disabled =
    animating ||
    inputs.some(
      input => !/^\d$/.test(input.value)
    );
}

function enableRow(row) {

  currentRow = row;

  getInputs(row).forEach(input => {
    input.disabled = false;
  });

  setRowState(row, "Your turn");

  statusEl.textContent =
    `Your turn — enter Row ${row + 1}.`;

  confirmBtn.classList.remove("hidden");

  updateConfirmButton();
}

function readRow(row) {

  return getInputs(row)
    .map(input => input.value)
    .join("");
}

function lockRow(row) {

  getInputs(row).forEach(input => {
    input.disabled = true;
  });

  setRowState(row, "Confirmed");
}

/* =====================================
   BSUN PREDICTION ENGINE
===================================== */

function complementaryNumber(value) {

  return String(99999 - Number(value))
    .padStart(5, "0");
}

/* =====================================
   BSUN AUTOMATIC ROW ANIMATION
===================================== */

async function animateComputerRow(
  row,
  value,
  version
) {

  animating = true;

  confirmBtn.classList.add("hidden");

  setRowState(row, "Entering...");

  statusEl.textContent =
    "Bsun is entering its numbers...";

  const inputs = getInputs(row);

  for (let i = 0; i < 5; i++) {

    if (version !== gameVersion) return;

    inputs[i].value = value[i];

    inputs[i].classList.add("appear");

    await sleep(300);
  }

  if (version !== gameVersion) return;

  rows[row] = value;

  setRowState(row, "Completed");

  animating = false;
}

/* =====================================
   CONFIRM PLAYER ROW
===================================== */

async function confirmRow() {

  if (animating || confirmBtn.disabled) return;

  const row = currentRow;

  const value = readRow(row);

  if (!/^\d{5}$/.test(value)) return;

  rows[row] = value;

  lockRow(row);

  confirmBtn.classList.add("hidden");

  /* First row: lock prediction */

  if (row === 0) {

    prediction = Number(value) + 199998;

    predictionEl.textContent =
      formatNumber(prediction);

    predictionNote.textContent =
      "Prediction locked for this round";

    statusEl.textContent =
      "Bsun has predicted the final total!";

    enableRow(1);

    return;
  }

  /* Second and fourth player rows */

  if (row === 1 || row === 3) {

    const computerRow = row + 1;

    const computerValue =
      complementaryNumber(value);

    const version = gameVersion;

    await animateComputerRow(
      computerRow,
      computerValue,
      version
    );

    if (version !== gameVersion) return;

    if (row === 1) {

      enableRow(3);

    } else {

      statusEl.textContent =
        "All five rows complete. Ready to reveal!";

      revealBtn.classList.remove("hidden");
    }
  }
}

/* =====================================
   REVEAL FINAL TOTAL
===================================== */

function revealTotal() {

  if (
    animating ||
    rows.some(row => row === null)
  ) {
    return;
  }

  const total = rows.reduce(
    (sum, value) => sum + Number(value),
    0
  );

  finalTotalEl.textContent =
    formatNumber(total);

  resultCard.classList.remove("hidden");

  revealBtn.classList.add("hidden");

  if (total === prediction) {

    matchMessage.textContent =
      "✓ Perfect Match!";

    matchMessage.className = "success";

    statusEl.textContent =
      "Bsun predicted the exact total!";

  } else {

    matchMessage.textContent =
      "The totals did not match.";

    matchMessage.className = "";
  }

  resultCard.scrollIntoView({
    behavior: "smooth",
    block: "nearest"
  });
}

/* =====================================
   NEW GAME
===================================== */

function newGame() {

  gameVersion++;

  rows = Array(5).fill(null);

  currentRow = 0;

  prediction = null;

  animating = false;

  predictionEl.textContent = "🙏";

  predictionNote.textContent =
    "Waiting for your first number";

  resultCard.classList.add("hidden");

  revealBtn.classList.add("hidden");

  finalTotalEl.textContent = "";

  matchMessage.textContent = "";

  matchMessage.className = "";

  createBoard();

  enableRow(0);
}

/* =====================================
   ORIGINAL RELAXING BACKGROUND MUSIC

   Generated with Web Audio API.
   No external audio files or API keys.
===================================== */

const AudioContextClass =
  window.AudioContext ||
  window.webkitAudioContext;

let audioContext = null;
let masterGain = null;
let musicEnabled = false;
let musicTimer = null;
let musicStep = 0;

/* Gentle original melody */

const melody = [
  261.63, 329.63, 392.00, 329.63,
  293.66, 349.23, 440.00, 349.23,
  261.63, 329.63, 392.00, 523.25,
  440.00, 392.00, 329.63, 293.66
];

function playSoftNote(frequency) {

  if (!audioContext || !musicEnabled) return;

  const now = audioContext.currentTime;

  const oscillator =
    audioContext.createOscillator();

  const gain =
    audioContext.createGain();

  oscillator.type = "sine";

  oscillator.frequency.setValueAtTime(
    frequency,
    now
  );

  gain.gain.setValueAtTime(
    0.0001,
    now
  );

  gain.gain.exponentialRampToValueAtTime(
    0.045,
    now + 0.12
  );

  gain.gain.exponentialRampToValueAtTime(
    0.0001,
    now + 1.6
  );

  oscillator.connect(gain);

  gain.connect(masterGain);

  oscillator.start(now);

  oscillator.stop(now + 1.65);
}

function playNextNote() {

  if (!musicEnabled) return;

  playSoftNote(
    melody[musicStep % melody.length]
  );

  musicStep++;
}

async function toggleMusic() {

  if (!AudioContextClass) {

    musicBtn.textContent =
      "Audio unavailable";

    musicBtn.disabled = true;

    return;
  }

  /* Turn music off */

  if (musicEnabled) {

    musicEnabled = false;

    clearInterval(musicTimer);

    musicTimer = null;

    masterGain.gain.setTargetAtTime(
      0,
      audioContext.currentTime,
      0.08
    );

    musicBtn.textContent = "♫ Music Off";

    musicBtn.setAttribute(
      "aria-pressed",
      "false"
    );

    return;
  }

  /* Turn music on */

  try {

    if (!audioContext) {

      audioContext = new AudioContextClass();

      masterGain =
        audioContext.createGain();

      masterGain.gain.value = 0.35;

      masterGain.connect(
        audioContext.destination
      );
    }

    await audioContext.resume();

    musicEnabled = true;

    masterGain.gain.setTargetAtTime(
      0.35,
      audioContext.currentTime,
      0.08
    );

    musicStep = 0;

    playNextNote();

    musicTimer = setInterval(
      playNextNote,
      850
    );

    musicBtn.textContent = "♫ Music On";

    musicBtn.setAttribute(
      "aria-pressed",
      "true"
    );

  } catch (error) {

    musicEnabled = false;

    musicBtn.textContent =
      "Audio unavailable";
  }
}

/* Stop music when page is hidden */

document.addEventListener(
  "visibilitychange",
  () => {

    if (
      document.hidden &&
      musicEnabled
    ) {

      musicEnabled = false;

      clearInterval(musicTimer);

      musicTimer = null;

      masterGain.gain.setTargetAtTime(
        0,
        audioContext.currentTime,
        0.08
      );

      musicBtn.textContent =
        "♫ Music Off";

      musicBtn.setAttribute(
        "aria-pressed",
        "false"
      );
    }
  }
);

/* =====================================
   BUTTON EVENTS
===================================== */

confirmBtn.addEventListener(
  "click",
  confirmRow
);

revealBtn.addEventListener(
  "click",
  revealTotal
);

newGameBtn.addEventListener(
  "click",
  newGame
);

musicBtn.addEventListener(
  "click",
  toggleMusic
);

/* =====================================
   INITIALISE GAME
===================================== */

newGame();
    
