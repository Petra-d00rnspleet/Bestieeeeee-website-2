
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";

import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";

import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";

// VERVANG DIT MET JOUW FIREBASE CONFIGURATIE
const firebaseConfig = {
  apiKey: "JOUW_API_KEY",
  authDomain: "JOUW_PROJECT.firebaseapp.com",
  projectId: "JOUW_PROJECT",
  storageBucket: "JOUW_PROJECT.firebasestorage.app",
  messagingSenderId: "JOUW_SENDER_ID",
  appId: "JOUW_APP_ID"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const $ = id => document.getElementById(id);

let mode = "register";
let playerData = null;
let busy = false;

function message(text) {
  $("auth-message").textContent = text;
}

function updateScreen(user) {
  $("auth-screen").hidden = !!user;
  $("game-screen").hidden = !user;
}

$("show-login").onclick = () => {
  mode = "login";
  $("auth-submit").textContent = "Inloggen";
  message("");
};

$("show-register").onclick = () => {
  mode = "register";
  $("auth-submit").textContent = "Account maken";
  message("");
};

$("auth-form").addEventListener("submit", async event => {
  event.preventDefault();

  if (busy) return;
  busy = true;

  const button = $("auth-submit");
  button.disabled = true;

  const email = $("email").value.trim();
  const password = $("password").value;

  try {
    if (mode === "register") {
      await createUserWithEmailAndPassword(
        auth, email, password
      );
    } else {
      await signInWithEmailAndPassword(
        auth, email, password
      );
    }
  } catch (error) {
    const errors = {
      "auth/email-already-in-use":
        "Dit e-mailadres heeft al een account.",
      "auth/invalid-email":
        "Dit e-mailadres is niet geldig.",
      "auth/weak-password":
        "Kies een sterker wachtwoord.",
      "auth/invalid-credential":
        "E-mailadres of wachtwoord klopt niet.",
      "auth/network-request-failed":
        "Controleer je internetverbinding."
    };

    message(errors[error.code] || "Er ging iets mis. Probeer opnieuw.");
  } finally {
    busy = false;
    button.disabled = false;
  }
});

// Ieder Firebase-account krijgt een eigen spelersdocument.
async function loadPlayer(user) {
  const ref = doc(db, "players", user.uid);
  const snapshot = await getDoc(ref);

  if (!snapshot.exists()) {
    const newPlayer = {
      coins: 100,
      pet: "🐰",
      inventory: [],
      createdAt: new Date().toISOString()
    };

    await setDoc(ref, newPlayer);
    playerData = newPlayer;
  } else {
    playerData = snapshot.data();
  }

  renderPlayer();
}

function renderPlayer() {
  $("coins").textContent = playerData.coins;
  $("pet").textContent = playerData.pet;
  $("player-name").textContent = "Mijn bestie 💗";

  $("inventory").textContent =
    "Mijn spullen: " +
    (playerData.inventory.length
      ? playerData.inventory.join(" ")
      : "Nog geen meubels gekocht!");
}

async function savePlayer() {
  if (!auth.currentUser || !playerData) return;

  await updateDoc(
    doc(db, "players", auth.currentUser.uid),
    {
      coins: playerData.coins,
      pet: playerData.pet,
      inventory: playerData.inventory
    }
  );

  renderPlayer();
}

onAuthStateChanged(auth, async user => {
  updateScreen(user);

  if (user) {
    try {
      await loadPlayer(user);
    } catch (error) {
      console.error(error);
      alert("Je gegevens konden niet worden geladen.");
    }
  } else {
    playerData = null;
  }
});

$("logout").onclick = async () => {
  await signOut(auth);
};

$("walk").onclick = () => {
  $("pet").style.transform = "translateX(65px)";
  $("speech").textContent = "Wat een gezellig kamertje! 🐾";

  setTimeout(() => {
    $("pet").style.transform = "translateX(0)";
  }, 1000);
};

$("sleep").onclick = () => {
  $("speech").textContent = "Slaap lekker! Zzz... 💤";
};

$("talk").onclick = () => {
  $("speech").textContent = "Ik vind het zo leuk met jou! 💗";
};

document.querySelectorAll("[data-pet]").forEach(button => {
  button.onclick = async () => {
    playerData.pet = button.dataset.pet;
    $("speech").textContent = "Hoi! Dit ben ik! 💕";
    await savePlayer();
  };
});

document.querySelectorAll("[data-item]").forEach(button => {
  button.onclick = async () => {
    const price = Number(button.dataset.price);
    const item = button.dataset.item;

    if (playerData.coins < price) {
      $("speech").textContent =
        "Oeps! We moeten eerst meer coins verdienen! 💰";
      return;
    }

    playerData.coins -= price;
    playerData.inventory.push(item);

    await savePlayer();
    $("speech").textContent = "Jaaa! Een nieuw meubel! 🎀";
  };
});

// Boter-kaas-en-eieren
$("tic-tac-toe").onclick = () => {
  const area = $("game-area");
  area.innerHTML = "";

  let board = Array(9).fill("");
  let finished = false;

  const grid = document.createElement("div");
  grid.className = "board";

  const status = document.createElement("p");
  status.textContent = "Jij bent X! Bestie is O!";

  function winner(b, mark) {
    const lines = [
      [0,1,2], [3,4,5], [6,7,8],
      [0,3,6], [1,4,7], [2,5,8],
      [0,4,8], [2,4,6]
    ];

    return lines.some(line =>
      line.every(i => b[i] === mark)
    );
  }

  function endGame(text) {
    finished = true;
    status.textContent = text;
    if (text.includes("gewonnen")) {
      playerData.coins += 5;
      savePlayer();
    }
  }

  function computerMove() {
    const empty = board
      .map((v, i) => v === "" ? i : -1)
      .filter(i => i !== -1);

    if (!empty.length) return;

    const move = empty[Math.floor(Math.random() * empty.length)];
    board[move] = "O";

    if (winner(board, "O")) {
      endGame("Bestie heeft gewonnen! 🐰");
    } else if (!board.includes("")) {
      endGame("Gelijkspel! 💗");
    }

    draw();
  }

  function draw() {
    grid.innerHTML = "";

    board.forEach((value, index) => {
      const cell = document.createElement("button");
      cell.textContent = value;
      cell.disabled = !!value || finished;

      cell.onclick = () => {
        if (finished) return;

        board[index] = "X";

        if (winner(board, "X")) {
          endGame("Jij hebt gewonnen! +5 coins 🎉");
        } else if (!board.includes("")) {
          endGame("Gelijkspel! 💗");
        } else {
          computerMove();
        }

        draw();
      };

      grid.appendChild(cell);
    });
  }

  area.append(grid, status);
  draw();
};

// Vier op een rij: volgt in de volgende uitbreidingsronde.
$("connect-four").onclick = () => {
  $("game-area").textContent =
    "Vier op een rij komt eraan! 💗";
};
