import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";

import {
getFirestore,
collection,
addDoc,
getDocs,
getDoc,
setDoc,
updateDoc,
deleteDoc,
doc,
serverTimestamp,
onSnapshot
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

// =====================================================
// FIREBASE
// =====================================================

const firebaseConfig = {
apiKey: "AIzaSyDCjPMCRUSjPezL2WBfgLI5a-xGknsfrpo",
authDomain: "don-bosco-efootball-league.firebaseapp.com",
projectId: "don-bosco-efootball-league",
storageBucket: "don-bosco-efootball-league.firebasestorage.app",
messagingSenderId: "935312157026",
appId: "1:935312157026:web:5f7e6cfbd615331538e43b"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// =====================================================
// STATE
// =====================================================

let players = [];
let matches = [];
let tournamentStarted = false;
let adminLoggedIn = false;
let currentSeasonNumber = 1;

let tournamentSettings = {
format: "groups",
groupCount: 2
};

// Manual/automatic group draw state. This is kept separate from the
// existing tournament settings so the original format logic remains intact.
let groupDrawState = {
  generated: false,
  potAssignments: {},
  groups: []
};

// =====================================================
// START
// =====================================================

document.addEventListener("DOMContentLoaded", () => {
setupRegisterButtons();
setupRegistration();
setupAdminLogin();
setupTournamentSettings();
setupPotAndBlindDraw();
setupTournamentControls();
setupAwardsAndVoting();
setupHallOfFameAdmin();
setupSeasonControls();
setupPlayerDashboardControls();
setupDeleteAllFixtures();

loadLeague();
});

// =====================================================
// REGISTER BUTTONS
// =====================================================

function setupRegisterButtons() {

["registerBtn", "heroRegisterBtn"].forEach((id) => {

const button = document.getElementById(id);

if (!button) return;

button.addEventListener("click", () => {

  const section = document.getElementById("register");

  if (!section) return;

  section.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });

});

});

}

// =====================================================
// REGISTRATION
// =====================================================

function setupRegistration() {

const form = document.getElementById("registerForm");

if (!form) return;

form.addEventListener("submit", async (event) => {

event.preventDefault();

const teamNumber =
  document.getElementById("teamNumber")?.value.trim();

const name =
  document.getElementById("name")?.value.trim();

const age =
  Number(document.getElementById("age")?.value || 0);

const phone =
  document.getElementById("phone")?.value.trim();

const username =
  document.getElementById("username")?.value.trim();

const message =
  document.getElementById("message");

const submit =
  document.getElementById("submitBtn");


if (!teamNumber || !name || !age || !phone || !username) {

  showMessage(
    message,
    "⚠️ Tafadhali jaza taarifa zote.",
    "error"
  );

  return;
}


if (age < 13 || age > 60) {

  showMessage(
    message,
    "⚠️ Age must be between 13 and 60.",
    "error"
  );

  return;
}


if (tournamentStarted) {

  showMessage(
    message,
    "🔒 Registration imefungwa.",
    "error"
  );

  return;
}


submit.disabled = true;
submit.innerHTML = "<span>REGISTERING...</span>";


try {

  await loadPlayers();


  if (players.length >= 32) {

    showMessage(
      message,
      "🚫 Tournament imefikia maximum ya players 32.",
      "error"
    );

    resetSubmit(submit);
    return;
  }


  const sameTeam = players.some(
    (player) =>
      String(player.teamNumber || "") === teamNumber
  );


  if (sameTeam) {

    showMessage(
      message,
      "❌ Team number hiyo tayari imetumika.",
      "error"
    );

    resetSubmit(submit);
    return;
  }


  const sameUsername = players.some(
    (player) =>
      String(player.username || "").toLowerCase() ===
      username.toLowerCase()
  );


  if (sameUsername) {

    showMessage(
      message,
      "❌ eFootball username hiyo tayari imesajiliwa.",
      "error"
    );

    resetSubmit(submit);
    return;
  }


  const playerNumber = players.length + 1;


  await addDoc(
    collection(db, "registrations"),
    {
      teamNumber: Number(teamNumber),
      name: name,
      phone: phone,
      username: username,
      playerNumber: playerNumber,
      createdAt: serverTimestamp()
    }
  );


  showMessage(
    message,
    "🎉 Registration successful! Player " +
      playerNumber +
      " amesajiliwa.",
    "success"
  );


  form.reset();
  resetSubmit(submit);

  await loadLeague();

} catch (error) {

  console.error("Registration error:", error);

  showMessage(
    message,
    "❌ Registration failed. Check Firebase.",
    "error"
  );

  resetSubmit(submit);
}

});

}

// =====================================================
// ADMIN LOGIN
// =====================================================

function setupAdminLogin() {

const button =
document.getElementById("adminLoginBtn");

const password =
document.getElementById("adminPassword");

if (!button || !password) {

console.error("Admin login elements missing.");
return;

}

button.addEventListener("click", loginAdmin);

password.addEventListener("keydown", (event) => {

if (event.key === "Enter") {
  loginAdmin();
}

});

function loginAdmin() {

const entered = password.value.trim();


if (entered === "Gosper2026") {

  adminLoggedIn = true;

  const panel =
    document.getElementById("adminPanel");

  if (panel) {
    panel.style.display = "block";
  }


  password.value = "";

  button.textContent = "✅ ADMIN LOGGED IN";


  showMessage(
    document.getElementById("adminMessage"),
    "✅ Admin access granted.",
    "success"
  );


  loadAdminMatches();
  renderAwardNominationManager(getAwardStats());

} else {

  showMessage(
    document.getElementById("adminMessage"),
    "❌ Wrong admin password.",
    "error"
  );

}

}

}

// =====================================================
// DELETE ALL CURRENT-SEASON FIXTURES
// =====================================================

function setupDeleteAllFixtures() {

const button = document.getElementById("deleteAllFixturesBtn");
const message = document.getElementById("deleteAllFixturesMessage");

if (!button) return;

button.addEventListener("click", async () => {

if (!adminLoggedIn) {
  showMessage(message, "🔒 Admin login required.", "error");
  return;
}

if (!matches.length) {
  showMessage(message, "ℹ️ There are no fixtures to delete.", "error");
  return;
}

const firstConfirm = window.confirm(
  "DELETE ALL FIXTURES?\\n\\nThis will remove every fixture in the current season. Season History will not be deleted."
);

if (!firstConfirm) return;

const secondConfirm = window.confirm(
  "FINAL CONFIRMATION\\n\\nDelete ALL " + matches.length + " current fixtures?"
);

if (!secondConfirm) return;

button.disabled = true;
button.textContent = "DELETING...";

try {

const deletions = matches.map((match) =>
  deleteDoc(doc(db, "matches", match.id))
);

await Promise.all(deletions);

matches = [];

renderFixtures();
renderStandings();
renderPlayerDashboard();
await renderPowerRanking();
await renderAwardsAndVoting();
loadAdminMatches();

showMessage(
  message,
  "✅ All current-season fixtures have been deleted.",
  "success"
);

} catch (error) {

console.error("Delete all fixtures error:", error);

showMessage(
  message,
  "❌ Could not delete all fixtures. Check Firebase permissions.",
  "error"
);

} finally {

button.disabled = false;
button.textContent = "🗑️ DELETE ALL FIXTURES";

}

});

}

// =====================================================
// LOAD EVERYTHING
// =====================================================

async function loadLeague() {

try { await loadPlayers(); }
catch (error) { console.error("Players loading error:", error); players = []; }

try { await loadMatches(); }
catch (error) { console.error("Matches loading error:", error); matches = []; }

try { await loadTournamentSettings(); }
catch (error) { console.error("Settings loading error:", error); }

try { await loadGroupDrawState(); }
catch (error) { console.error("Group draw loading error:", error); }

renderPotManager();
updateBlindDrawUI();

try { await loadTournamentStatus(); }
catch (error) { console.error("Tournament status loading error:", error); }

updateSettingsPreview();
updateTournamentUI();
renderFormat();
renderGroups();
renderFixtures();
renderStandings();
renderPlayerDashboard();

try { await renderPowerRanking(); } catch (error) { console.error("Power ranking error:", error); }
try { await renderAwardsAndVoting(); } catch (error) { console.error("Awards loading error:", error); }
try { await renderHallOfFameHistory(); } catch (error) { console.error("Hall of Fame loading error:", error); }
try { await renderSeasonHistory(); } catch (error) { console.error("Season history loading error:", error); }

if (adminLoggedIn) {
  loadAdminMatches();
}

}

// =====================================================
// LOAD PLAYERS
// =====================================================

async function loadPlayers() {

const snapshot =
await getDocs(collection(db, "registrations"));

players = snapshot.docs.map((item) => ({
id: item.id,
...item.data()
}));

players.sort((a, b) => {

return (
  Number(a.playerNumber || 999) -
  Number(b.playerNumber || 999)
);

});

}

// =====================================================
// LOAD MATCHES
// =====================================================

async function loadMatches() {

try {

const snapshot =
await getDocs(collection(db, "matches"));

matches = snapshot.docs.map((item) => ({
id: item.id,
...item.data()
}));

matches.sort((a, b) => {

return (
  Number(a.matchNumber || 999999) -
  Number(b.matchNumber || 999999)
);

});

} catch (error) {

// A missing/empty matches collection must never prevent
// registration, admin login, or the rest of the league UI from loading.
console.warn("Matches could not be loaded; continuing with an empty fixture list.", error);
matches = [];

}

}

// =====================================================
// LOAD SETTINGS
// =====================================================

async function loadTournamentSettings() {

try {

const snapshot =
  await getDocs(collection(db, "settings"));


if (snapshot.empty) {

  tournamentSettings = {
    format: "groups",
    groupCount: 2
  };
  currentSeasonNumber = 1;

  return;
}


const data =
  snapshot.docs[0].data();


tournamentSettings = {

  format:
    data.format === "league"
      ? "league"
      : "groups",

  groupCount:
    Math.max(
      1,
      Math.min(
        16,
        Number(data.groupCount || 2)
      )
    )

};

currentSeasonNumber = Math.max(1, Number(data.seasonNumber || 1));

} catch (error) {

console.error(
  "Settings error:",
  error
);

}

}

// =====================================================
// ADMIN SETTINGS
// =====================================================

function setupTournamentSettings() {

const format =
document.getElementById("tournamentFormat");

const groupCount =
document.getElementById("groupCount");

const save =
document.getElementById("saveTournamentSettings");

format?.addEventListener(
"change",
updateSettingsPreview
);

groupCount?.addEventListener(
"change",
updateSettingsPreview
);

save?.addEventListener(
"click",
saveSettings
);

updateSettingsPreview();

}

// =====================================================
// SETTINGS PREVIEW
// =====================================================

function updateSettingsPreview() {

const format =
document.getElementById("tournamentFormat")?.value ||
tournamentSettings.format ||
"groups";

const groupCount =
Number(
document.getElementById("groupCount")?.value ||
tournamentSettings.groupCount ||
2
);

const box =
document.getElementById("groupCountBox");

if (box) {

box.style.display =
  format === "groups"
    ? "block"
    : "none";

}

const display =
document.getElementById("playersPerGroup");

if (!display) return;

if (format === "league") {

display.textContent = "ALL";

return;

}

const sizes =
calculateGroupSizes(
Math.max(players.length, 1),
groupCount
);

if (!players.length) {

display.textContent =
  "WAITING";

return;

}

display.textContent =
Math.min(...sizes) +
"–" +
Math.max(...sizes);

}

// =====================================================
// SAVE SETTINGS
// =====================================================

async function saveSettings() {

if (!adminLoggedIn) {

alert("🔐 Admin login kwanza.");
return;

}

const format =
document.getElementById("tournamentFormat")?.value ||
"groups";

const groupCount =
Number(
document.getElementById("groupCount")?.value || 2
);

if (format === "groups" && groupCount < 1) {

alert("⚠️ Chagua number ya groups.");
return;

}

try {

const snapshot =
  await getDocs(collection(db, "settings"));


const data = {

  format: format,
  groupCount: groupCount,
  seasonNumber: currentSeasonNumber,
  updatedAt: serverTimestamp()

};


if (snapshot.empty) {

  await addDoc(
    collection(db, "settings"),
    data
  );

} else {

  await updateDoc(
    doc(
      db,
      "settings",
      snapshot.docs[0].id
    ),
    data
  );

}


tournamentSettings = {
  format: format,
  groupCount: groupCount
};


showMessage(
  document.getElementById("settingsMessage"),
  "✅ Tournament settings saved.",
  "success"
);


await loadLeague();

} catch (error) {

console.error(
  "Save settings error:",
  error
);


showMessage(
  document.getElementById("settingsMessage"),
  "❌ Failed to save settings.",
  "error"
);

}

}

// =====================================================
// GROUP SIZE
// =====================================================

function calculateGroupSizes(totalPlayers, groupCount) {

if (totalPlayers <= 0) {
return [];
}

const count =
Math.max(
1,
Math.min(
Number(groupCount),
totalPlayers
)
);

const base =
Math.floor(totalPlayers / count);

const remainder =
totalPlayers % count;

const sizes = [];

for (let i = 0; i < count; i++) {

sizes.push(
  base + (i < remainder ? 1 : 0)
);

}

return sizes;

}

// =====================================================
// GROUP LETTER
// =====================================================

function groupLetter(index) {

let result = "";
let number = index + 1;

while (number > 0) {

number--;

result =
  String.fromCharCode(
    65 + (number % 26)
  ) +
  result;

number =
  Math.floor(number / 26);

}

return result;

}

// =====================================================
// POT / GROUP DRAW MANAGEMENT
// =====================================================

async function loadGroupDrawState() {
  groupDrawState = { generated: false, potAssignments: {}, groups: [] };
  if (tournamentSettings.format !== "groups") return;

  try {
    const snap = await getDoc(doc(db, "groupDraws", `season_${currentSeasonNumber}`));
    if (snap.exists()) {
      const data = snap.data() || {};
      groupDrawState = {
        generated: Boolean(data.generated),
        potAssignments: data.potAssignments || {},
        groups: Array.isArray(data.groups) ? data.groups : []
      };
    }
  } catch (error) {
    console.error("Group draw state error:", error);
  }
}

function playersByPot(pot) {
  return players.filter(p => String(groupDrawState.potAssignments?.[p.id] || "") === String(pot));
}

function buildEmptyDrawGroups() {
  const count = Math.max(1, Number(tournamentSettings.groupCount || 2));
  return Array.from({ length: count }, (_, i) => ({
    shortName: groupLetter(i),
    playerIds: []
  }));
}

async function persistGroupDrawState(messageEl) {
  try {
    await setDoc(doc(db, "groupDraws", `season_${currentSeasonNumber}`), {
      seasonNumber: currentSeasonNumber,
      generated: Boolean(groupDrawState.generated),
      potAssignments: groupDrawState.potAssignments || {},
      groups: groupDrawState.groups || [],
      updatedAt: serverTimestamp()
    }, { merge: true });
    if (messageEl) showMessage(messageEl, "✅ Group draw saved.", "success");
    return true;
  } catch (error) {
    console.error("Save group draw error:", error);
    if (messageEl) showMessage(messageEl, "❌ Failed to save group draw.", "error");
    return false;
  }
}

function renderPotManager() {
  const root = document.getElementById("potManager");
  if (!root) return;

  if (!players.length) {
    root.innerHTML = `<div class="loading">Register teams first.</div>`;
    return;
  }

  const groups = [1, 2, 3].map(pot => {
    const list = players.filter(p => String(groupDrawState.potAssignments?.[p.id] || "0") === String(pot));
    return `<div class="pot-column">
      <div class="pot-column-head"><strong>POT ${pot}</strong><span>${list.length} TEAMS</span></div>
      <div class="pot-team-list">${list.length ? list.map(p => `<div class="pot-team"><span>${escapeHTML(p.username || p.name || "TEAM")}</span><button type="button" class="pot-move-btn" data-player-id="${escapeHTML(p.id)}" data-pot="0">MOVE OUT</button></div>`).join("") : `<div class="pot-empty">No teams yet</div>`}</div>
    </div>`;
  }).join("");

  const unassigned = players.filter(p => !["1","2","3"].includes(String(groupDrawState.potAssignments?.[p.id] || "")));
  const unassignedHtml = `<div class="pot-column pot-unassigned">
    <div class="pot-column-head"><strong>UNASSIGNED</strong><span>${unassigned.length} TEAMS</span></div>
    <div class="pot-team-list">${unassigned.length ? unassigned.map(p => `<div class="pot-team"><span>${escapeHTML(p.username || p.name || "TEAM")}</span><div class="pot-actions"><button type="button" class="pot-move-btn" data-player-id="${escapeHTML(p.id)}" data-pot="1">POT 1</button><button type="button" class="pot-move-btn" data-player-id="${escapeHTML(p.id)}" data-pot="2">POT 2</button><button type="button" class="pot-move-btn" data-player-id="${escapeHTML(p.id)}" data-pot="3">POT 3</button></div></div>`).join("") : `<div class="pot-empty">All teams assigned</div>`}</div>
  </div>`;

  root.innerHTML = groups + unassignedHtml;
  root.querySelectorAll(".pot-move-btn").forEach(btn => btn.addEventListener("click", async () => {
    if (!adminLoggedIn) return alert("🔐 Admin login kwanza.");
    groupDrawState.potAssignments[btn.dataset.playerId] = btn.dataset.pot === "0" ? "" : String(btn.dataset.pot);
    await persistGroupDrawState();
    renderPotManager();
    updateBlindDrawUI();
  }));
}

function renderDrawGroupsPreview() {
  const root = document.getElementById("drawGroupsPreview");
  if (!root) return;
  const groups = groupDrawState.groups || [];
  if (!groupDrawState.generated || !groups.length) {
    root.innerHTML = `<div class="draw-preview-empty">Groups will appear here after the draw is generated.</div>`;
    return;
  }
  root.innerHTML = groups.map(g => {
    const names = (g.playerIds || []).map(id => players.find(p => p.id === id)).filter(Boolean);
    return `<div class="draw-group-card"><div class="draw-group-title">GROUP ${escapeHTML(g.shortName)}</div>${names.length ? names.map((p,i)=>`<div class="draw-team-row"><span>${String(i+1).padStart(2,"0")}</span><strong>${escapeHTML(p.username || p.name || "TEAM")}</strong></div>`).join("") : `<div class="draw-team-row">Waiting for draw</div>`}</div>`;
  }).join("");
}

function nextOpenGroupIndex() {
  const groups = groupDrawState.groups || [];
  const targetSize = Math.max(1, Math.ceil(players.length / Math.max(1, Number(tournamentSettings.groupCount || 2))));
  return groups.findIndex(g => (g.playerIds || []).length < targetSize);
}

function updateBlindDrawUI() {
  const status = document.getElementById("blindDrawStatus");
  const buttons = document.querySelectorAll("[data-draw-pot]");
  const complete = groupDrawState.generated && (groupDrawState.groups || []).length > 0;
  buttons.forEach(btn => {
    const pot = String(btn.dataset.drawPot);
    const available = playersByPot(pot).some(p => !(groupDrawState.groups || []).some(g => (g.playerIds || []).includes(p.id)));
    btn.disabled = !adminLoggedIn || complete || !available;
    btn.textContent = available && !complete ? `🎲 REVEAL POT ${pot}` : `POT ${pot} ${complete ? "DONE" : "EMPTY"}`;
  });
  if (status) {
    if (complete) status.textContent = "✅ Groups generated. Confirm/publish them below.";
    else if (!players.length) status.textContent = "Waiting for teams.";
    else status.textContent = "Teams are hidden until you tap a Pot. The next revealed team goes to the next open Group automatically.";
  }
  renderDrawGroupsPreview();
}

async function revealNextTeamFromPot(pot) {
  if (!adminLoggedIn) return alert("🔐 Admin login kwanza.");
  if (groupDrawState.generated) return;
  const available = playersByPot(pot).filter(p => !(groupDrawState.groups || []).some(g => (g.playerIds || []).includes(p.id)));
  if (!available.length) return alert(`POT ${pot} imekwisha.`);

  if (!groupDrawState.groups?.length) groupDrawState.groups = buildEmptyDrawGroups();
  const groupIndex = nextOpenGroupIndex();
  if (groupIndex < 0) return alert("All groups are full.");

  // Do not reveal the identity before the click. Only after the draw action do we show it.
  const chosen = available[Math.floor(Math.random() * available.length)];
  groupDrawState.groups[groupIndex].playerIds.push(chosen.id);
  await persistGroupDrawState();

  const reveal = document.getElementById("blindReveal");
  if (reveal) {
    reveal.classList.remove("revealing");
    void reveal.offsetWidth;
    reveal.classList.add("revealing");
    reveal.innerHTML = `<span>🎲 REVEALED</span><strong>${escapeHTML(chosen.username || chosen.name || "TEAM")}</strong><small>→ GROUP ${escapeHTML(groupDrawState.groups[groupIndex].shortName)}</small>`;
  }

  renderDrawGroupsPreview();
  updateBlindDrawUI();

  const total = groupDrawState.groups.reduce((sum,g)=>sum+(g.playerIds||[]).length,0);
  if (total >= players.length) {
    groupDrawState.generated = true;
    await persistGroupDrawState();
    updateBlindDrawUI();
    if (reveal) reveal.innerHTML += `<em>🎉 DRAW COMPLETE — CONFIRM & PUBLISH GROUPS</em>`;
  }
}

function autoGenerateGroupsFromPots() {
  const potPlayers = [1,2,3].map(p => playersByPot(p));
  if (potPlayers.some(list => !list.length)) {
    alert("⚠️ Assign teams to Pot 1, Pot 2 and Pot 3 first.");
    return;
  }
  const count = Math.max(1, Number(tournamentSettings.groupCount || 2));
  const groups = buildEmptyDrawGroups();
  const shuffled = potPlayers.map(list => [...list].sort(() => Math.random() - 0.5));
  const assigned = new Set();

  // First pass: one team from each pot into each group where possible.
  shuffled.forEach(list => {
    list.forEach((player, i) => {
      const group = groups[i % count];
      if (!group.playerIds.includes(player.id)) {
        group.playerIds.push(player.id);
        assigned.add(player.id);
      }
    });
  });

  // Any remaining teams fill the next available group.
  players.filter(p => !assigned.has(p.id)).sort(() => Math.random() - 0.5).forEach(player => {
    const idx = groups.findIndex(g => g.playerIds.length < Math.ceil(players.length / count));
    if (idx >= 0) groups[idx].playerIds.push(player.id);
  });

  groupDrawState.groups = groups;
  groupDrawState.generated = true;
}

function setupPotAndBlindDraw() {
  const root = document.getElementById("potManager");
  if (!root) return;
  renderPotManager();
  updateBlindDrawUI();

  [1,2,3].forEach(pot => {
    document.querySelector(`[data-draw-pot="${pot}"]`)?.addEventListener("click", () => revealNextTeamFromPot(String(pot)));
  });

  document.getElementById("autoGenerateGroupsBtn")?.addEventListener("click", async () => {
    if (!adminLoggedIn) return alert("🔐 Admin login kwanza.");
    if (groupDrawState.generated) return alert("Groups tayari zimegenerateiwa.");
    autoGenerateGroupsFromPots();
    await persistGroupDrawState();
    renderDrawGroupsPreview();
    updateBlindDrawUI();
  });

  document.getElementById("confirmGroupsBtn")?.addEventListener("click", async () => {
    if (!adminLoggedIn) return alert("🔐 Admin login kwanza.");
    if (!groupDrawState.generated) return alert("⚠️ Complete the draw/generation first.");
    if (!confirm("Confirm and publish these groups? After publishing, the draw cannot be changed from this screen.")) return;
    await persistGroupDrawState();
    renderGroups();
    showMessage(document.getElementById("groupDrawMessage"), "✅ Groups confirmed and published.", "success");
  });
}

// =====================================================
// GET GROUPS
// =====================================================

function getGroups() {
  const count = Math.max(1, Number(tournamentSettings.groupCount || 2));

  if (tournamentSettings.format === "league") {
    return [{ name: "LEAGUE", shortName: "LEAGUE", players: [...players] }];
  }

  // Before an Admin draw/generation, do not silently create groups from registration order.
  if (!groupDrawState.generated || !Array.isArray(groupDrawState.groups) || !groupDrawState.groups.length) {
    return Array.from({ length: count }, (_, i) => ({
      name: "GROUP " + groupLetter(i),
      shortName: groupLetter(i),
      players: []
    }));
  }

  return groupDrawState.groups.map((group, i) => ({
    name: "GROUP " + (group.shortName || groupLetter(i)),
    shortName: group.shortName || groupLetter(i),
    players: (group.playerIds || []).map(id => players.find(p => p.id === id)).filter(Boolean)
  }));
}

// =====================================================
// FORMAT DISPLAY
// =====================================================

function renderFormat() {

const description =
document.getElementById("formatDescription");

const display =
document.getElementById("formatDisplay");

if (description) {

if (tournamentSettings.format === "league") {

  description.textContent =
    "TABLE LEAGUE • " +
    players.length +
    " registered players.";

} else {

  description.textContent =
    tournamentSettings.groupCount +
    " GROUPS • " +
    players.length +
    " PLAYERS";

}

}

if (!display) return;

display.innerHTML = "";

const card =
document.createElement("div");

card.className = "group-card";

if (tournamentSettings.format === "league") {

card.innerHTML =
  "<div class='group-title'>" +
  "<span>FORMAT</span>" +
  "<strong>TABLE LEAGUE</strong>" +
  "</div>" +
  "<div class='group-player'>" +
  "<strong>" +
  players.length +
  " PLAYERS REGISTERED" +
  "</strong>" +
  "</div>";

} else {

card.innerHTML =
  "<div class='group-title'>" +
  "<span>FORMAT</span>" +
  "<strong>" +
  tournamentSettings.groupCount +
  " GROUPS" +
  "</strong>" +
  "</div>" +
  "<div class='group-player'>" +
  "<strong>" +
  "Groups " +
  groupLetter(0) +
  " – " +
  groupLetter(
    tournamentSettings.groupCount - 1
  ) +
  "</strong>" +
  "</div>";

}

display.appendChild(card);

}

// =====================================================
// RENDER GROUPS
// =====================================================

function renderGroups() {

const grid =
document.getElementById("groupsGrid");

const description =
document.getElementById("groupsDescription");

if (!grid) return;

grid.innerHTML = "";

// TABLE LEAGUE
if (tournamentSettings.format === "league") {

if (description) {

  description.textContent =
    "TABLE LEAGUE • " +
    players.length +
    " players";

}


const card =
  document.createElement("div");


card.className = "group-card";


card.innerHTML =
  "<div class='group-title'>" +
  "<span>FORMAT</span>" +
  "<strong>TABLE LEAGUE</strong>" +
  "</div>" +
  "<div class='group-player'>" +
  "<strong>" +
  (players.length
    ? players.length + " PLAYERS"
    : "WAITING FOR PLAYERS") +
  "</strong>" +
  "</div>";


grid.appendChild(card);

return;

}

// GROUPS
const groups =
getGroups();

if (description) {

description.textContent =
  groups.length +
  (groupDrawState.generated ? " groups • Draw published" : " groups • Waiting for Admin draw");

}

groups.forEach((group) => {

const card =
  document.createElement("div");


card.className = "group-card";


card.innerHTML =
  "<div class='group-title'>" +
  "<span>GROUP</span>" +
  "<strong>" +
  escapeHTML(group.shortName) +
  "</strong>" +
  "</div>";


if (group.players.length === 0) {

  card.innerHTML +=
    "<div class='group-player'>" +
    "<strong>WAITING FOR PLAYERS</strong>" +
    "</div>";

} else {

  group.players.forEach((player, index) => {

    card.innerHTML +=
      "<div class='group-player'>" +

      "<span>" +
      String(index + 1).padStart(2, "0") +
      "</span>" +

      "<strong>" +
      escapeHTML(
        player.username ||
        player.name ||
        "PLAYER"
      ) +
      "</strong>" +

      "</div>";

  });

}


grid.appendChild(card);

});

}

// =====================================================
// FIXTURES DISPLAY
// =====================================================

function renderFixtures() {

const container =
document.getElementById("fixturesContainer");

if (!container) return;

container.innerHTML = "";

if (!matches.length) {

container.innerHTML =
  "<div class='loading'>" +
  "⏳ Fixtures are not generated yet." +
  "</div>";

return;

}

matches.forEach((match) => {

const card =
  document.createElement("div");


card.className = "fixture";


card.innerHTML =
  "<div class='fixture-players'>" +

  "<strong>" +
  escapeHTML(match.homePlayer || "TBD") +
  "</strong>" +

  "<span>VS</span>" +

  "<strong>" +
  escapeHTML(match.awayPlayer || "TBD") +
  "</strong>" +

  "</div>" +

  "<div class='match-schedule'>" +

  "📍 " +
  escapeHTML(match.group || "LEAGUE") +

  " &nbsp;&nbsp; 📅 " +
  escapeHTML(match.date || "TBD") +

  " &nbsp;&nbsp; ⏰ " +
  escapeHTML(match.time || "--:--") +

  "</div>" +

  "<div class='match-status'>" +

  (
    match.played
      ? "🏆 " +
        match.homeGoals +
        " - " +
        match.awayGoals
      : "UPCOMING"
  ) +

  "</div>";


container.appendChild(card);

});

}

// =====================================================
// STANDINGS
// =====================================================

function renderStandings() {

const container =
document.getElementById("standingsContainer");

if (!container) return;

container.innerHTML = "";

if (tournamentSettings.format === "league") {

container.appendChild(
  createStandingsTable(
    players
  )
);

return;

}

const groups =
getGroups();

groups.forEach((group) => {

const title =
  document.createElement("h3");


title.textContent =
  "GROUP " + group.shortName;


container.appendChild(title);


container.appendChild(
  createStandingsTable(
    group.players
  )
);

});

}

// =====================================================
// STANDINGS TABLE
// =====================================================

function createStandingsTable(groupPlayers) {

const wrapper =
document.createElement("div");

wrapper.className =
"table-wrapper";

if (!groupPlayers.length) {

wrapper.innerHTML =
  "<div class='loading'>" +
  "WAITING FOR PLAYERS" +
  "</div>";

return wrapper;

}

const stats = {};

groupPlayers.forEach((player) => {

const name =
  player.username ||
  player.name ||
  "PLAYER";


stats[name] = {

  name: name,
  P: 0,
  W: 0,
  D: 0,
  L: 0,
  GF: 0,
  GA: 0,
  GD: 0,
  PTS: 0

};

});

matches.forEach((match) => {

if (!match.played) return;


const home =
  stats[match.homePlayer];


const away =
  stats[match.awayPlayer];


if (!home || !away) return;


const hg =
  Number(match.homeGoals || 0);


const ag =
  Number(match.awayGoals || 0);


home.P++;
away.P++;


home.GF += hg;
home.GA += ag;


away.GF += ag;
away.GA += hg;


if (hg > ag) {

  home.W++;
  home.PTS += 3;
  away.L++;

} else if (hg < ag) {

  away.W++;
  away.PTS += 3;
  home.L++;

} else {

  home.D++;
  away.D++;

  home.PTS++;
  away.PTS++;

}

});

Object.values(stats).forEach((player) => {

player.GD =
  player.GF -
  player.GA;

});

const sorted =
Object.values(stats).sort((a, b) => {

  if (b.PTS !== a.PTS)
    return b.PTS - a.PTS;

  if (b.GD !== a.GD)
    return b.GD - a.GD;

  return b.GF - a.GF;

});

const table =
document.createElement("table");

table.className =
"standings-table";

table.innerHTML =
"<thead>" +

"<tr>" +
"<th>#</th>" +
"<th>PLAYER</th>" +
"<th>P</th>" +
"<th>W</th>" +
"<th>D</th>" +
"<th>L</th>" +
"<th>GF</th>" +
"<th>GA</th>" +
"<th>GD</th>" +
"<th>PTS</th>" +
"</tr>" +

"</thead>" +

"<tbody></tbody>";

const tbody =
table.querySelector("tbody");

sorted.forEach((player, index) => {

const row =
  document.createElement("tr");


row.innerHTML =

  "<td>" +
  (index + 1) +
  "</td>" +

  "<td>" +
  escapeHTML(player.name) +
  "</td>" +

  "<td>" +
  player.P +
  "</td>" +

  "<td>" +
  player.W +
  "</td>" +

  "<td>" +
  player.D +
  "</td>" +

  "<td>" +
  player.L +
  "</td>" +

  "<td>" +
  player.GF +
  "</td>" +

  "<td>" +
  player.GA +
  "</td>" +

  "<td>" +
  (player.GD >= 0
    ? "+" + player.GD
    : player.GD) +
  "</td>" +

  "<td><strong>" +
  player.PTS +
  "</strong></td>";


tbody.appendChild(row);

});

wrapper.appendChild(table);

return wrapper;

}

// =====================================================
// TOURNAMENT CONTROLS
// =====================================================

function setupTournamentControls() {

document
.getElementById("generateFixturesBtn")
?.addEventListener(
"click",
generateFixtures
);

document
.getElementById("startTournamentBtn")
?.addEventListener(
"click",
startTournament
);

}

// =====================================================
// GENERATE FIXTURES
// =====================================================

function buildRoundRobinRounds(participants) {
  const list = [...participants];
  const rounds = [];
  if (list.length < 2) return rounds;

  // Circle-method round robin. With an odd number, a BYE is added.
  if (list.length % 2 === 1) list.push(null);

  const n = list.length;
  const roundsCount = n - 1;
  let rotation = [...list];

  for (let round = 0; round < roundsCount; round++) {
    const pairings = [];

    for (let i = 0; i < n / 2; i++) {
      const a = rotation[i];
      const b = rotation[n - 1 - i];
      if (a && b) pairings.push([a, b]);
    }

    rounds.push(pairings);

    // Keep the first participant fixed and rotate the rest.
    rotation = [
      rotation[0],
      rotation[n - 1],
      ...rotation.slice(1, n - 1)
    ];
  }

  return rounds;
}

function interleaveFixtureRounds(roundGroups) {
  const output = [];
  const maxRounds = Math.max(0, ...roundGroups.map(g => g.length));

  // One round at a time, then one group at a time. This prevents the
  // same player/team from being dumped into several consecutive slots.
  for (let r = 0; r < maxRounds; r++) {
    for (const groupRounds of roundGroups) {
      if (groupRounds[r]) output.push(...groupRounds[r]);
    }
  }

  return output;
}

async function generateFixtures() {

  if (!adminLoggedIn) {
    alert("🔐 Admin login kwanza.");
    return;
  }

  if (players.length < 2) {
    alert("⚠️ Angalau players 2 wanahitajika.");
    return;
  }

  const date = document.getElementById("fixtureStartDate")?.value;
  const time = document.getElementById("fixtureStartTime")?.value;
  const interval = Number(document.getElementById("fixtureInterval")?.value || 120);

  if (!date || !time) {
    alert("⚠️ Weka tournament start date na time.");
    return;
  }

  if (matches.length > 0) {
    const proceed = confirm("Fixtures tayari zipo. Ongeza fixtures mpya?");
    if (!proceed) return;
  }

  try {
    let matchNumber = matches.length + 1;
    let current = new Date(date + "T" + time + ":00");
    let roundsToSchedule = [];

    if (tournamentSettings.format === "league") {
      // League: classic round-robin. Every player plays once per round.
      roundsToSchedule = buildRoundRobinRounds(players).map(round =>
        round.map(([home, away]) => ({
          group: "LEAGUE",
          home,
          away
        }))
      );
    } else {
      const groups = getGroups().filter(group => group.players.length >= 2);

      if (!groupDrawState.generated) {
        alert("⚠️ Kwanza generate/confirm groups kupitia Pot Draw.");
        return;
      }

      // Build a round-robin schedule inside each group, then interleave
      // the same round across groups. This is the key fix for 3+ consecutive
      // appearances by one player.
      const groupRounds = groups.map(group =>
        buildRoundRobinRounds(group.players).map(round =>
          round.map(([home, away]) => ({
            group: group.shortName,
            home,
            away
          }))
        )
      );

      roundsToSchedule = interleaveFixtureRounds(groupRounds);
      // Convert the flat interleaved list into one-match scheduling below.
    }

    const fixtures = Array.isArray(roundsToSchedule[0])
      ? roundsToSchedule.flat()
      : roundsToSchedule;

    // Safety check: no participant can appear in two fixtures in the same round.
    // For the generated schedule, this should always pass.
    if (tournamentSettings.format === "league") {
      for (const round of roundsToSchedule) {
        const used = new Set();
        for (const fixture of round) {
          if (used.has(fixture.home.id) || used.has(fixture.away.id)) {
            throw new Error("Invalid round schedule: participant repeated in the same round.");
          }
          used.add(fixture.home.id);
          used.add(fixture.away.id);
        }
      }
    }

    for (const fixture of fixtures) {
      await createMatch(
        matchNumber,
        fixture.group,
        fixture.home,
        fixture.away,
        current
      );

      matchNumber++;
      current = new Date(current.getTime() + interval * 60000);
    }

    alert("✅ Fixtures generated with balanced rounds — hakuna player atacheza games 3 mfululizo.");
    await loadLeague();

  } catch (error) {
    console.error("Fixture generation error:", error);
    alert("❌ Failed to generate balanced fixtures.");
  }

}

// =====================================================
// CREATE MATCH
// =====================================================

async function createMatch(
matchNumber,
group,
home,
away,
date
) {

await addDoc(
collection(db, "matches"),
{

  matchNumber: matchNumber,

  group: group,

  homePlayer:
    home.username ||
    home.name,

  awayPlayer:
    away.username ||
    away.name,

  date:
    formatDate(date),

  time:
    formatTime(date),

  homeGoals: null,

  awayGoals: null,

  played: false,

  createdAt:
    serverTimestamp()

}

);

}

// =====================================================
// ADMIN MATCHES
// =====================================================

function loadAdminMatches() {

const container =
document.getElementById("adminMatches");

if (!container) return;

container.innerHTML = "";

if (players.length < 2) {

container.innerHTML =
  "<div class='loading'>" +
  "⏳ Waiting for at least 2 players..." +
  "</div>";

return;

}

if (!matches.length) {

container.innerHTML =
  "<div class='loading'>" +
  "⚽ Generate fixtures first." +
  "</div>";

return;

}

matches.forEach((match, index) => {

const card =
  document.createElement("div");


card.className =
  "admin-match";


card.innerHTML =

  "<h3>" +

  "#" +
  (match.matchNumber || index + 1) +

  " " +

  escapeHTML(match.homePlayer || "TBD") +

  " <span>VS</span> " +

  escapeHTML(match.awayPlayer || "TBD") +

  "</h3>" +

  "<p>📍 " +
  escapeHTML(match.group || "LEAGUE") +
  "</p>" +

  "<label>Match date</label>" +

  "<input type='date' " +
  "id='admin-date-" +
  match.id +
  "' value='" +
  escapeHTML(match.date || "") +
  "'>" +

  "<label>Match time</label>" +

  "<input type='time' " +
  "id='admin-time-" +
  match.id +
  "' value='" +
  escapeHTML(match.time || "") +
  "'>" +

  "<div class='score-box'>" +

  "<div>" +

  "<label>" +
  escapeHTML(match.homePlayer || "HOME") +
  "</label>" +

  "<input type='number' min='0' " +
  "id='admin-home-" +
  match.id +
  "' value='" +
  (
    match.played
      ? match.homeGoals
      : ""
  ) +
  "'>" +

  "</div>" +

  "<strong>VS</strong>" +

  "<div>" +

  "<label>" +
  escapeHTML(match.awayPlayer || "AWAY") +
  "</label>" +

  "<input type='number' min='0' " +
  "id='admin-away-" +
  match.id +
  "' value='" +
  (
    match.played
      ? match.awayGoals
      : ""
  ) +
  "'>" +

  "</div>" +

  "</div>" +

  "<button " +
  "type='button' " +
  "class='primary-btn' " +
  "data-save-match='" +
  match.id +
  "'>" +
  "💾 SAVE RESULT" +
  "</button>";


const saveButton =
  card.querySelector(
    "[data-save-match='" +
    match.id +
    "']"
  );


saveButton?.addEventListener(
  "click",
  () => saveAdminMatch(match.id)
);


container.appendChild(card);

});

}

// =====================================================
// SAVE MATCH
// =====================================================

async function saveAdminMatch(matchId) {

if (!adminLoggedIn) {

alert("🔐 Admin login kwanza.");
return;

}

const date =
document.getElementById(
"admin-date-" + matchId
)?.value;

const time =
document.getElementById(
"admin-time-" + matchId
)?.value;

const homeValue =
document.getElementById(
"admin-home-" + matchId
)?.value;

const awayValue =
document.getElementById(
"admin-away-" + matchId
)?.value;

if (!date || !time) {

alert(
  "⚠️ Weka tarehe na muda."
);

return;

}

if (
homeValue === "" ||
awayValue === ""
) {

alert(
  "⚠️ Weka goals zote mbili."
);

return;

}

try {

await updateDoc(
  doc(db, "matches", matchId),
  {

    date: date,
    time: time,

    homeGoals:
      Number(homeValue),

    awayGoals:
      Number(awayValue),

    played: true,

    updatedAt:
      serverTimestamp()

  }
);


alert(
  "✅ Result saved successfully!"
);


await loadLeague();

} catch (error) {

console.error(
  "Save match error:",
  error
);


alert(
  "❌ Failed to save result."
);

}

}

// =====================================================
// START TOURNAMENT
// =====================================================

async function startTournament() {

if (!adminLoggedIn) {

alert("🔐 Admin login kwanza.");
return;

}

if (players.length < 2) {

alert(
  "⚠️ Register at least 2 players first."
);

return;

}

if (matches.length === 0) {

alert(
  "⚠️ Generate fixtures kwanza."
);

return;

}

if (tournamentStarted) {

alert(
  "🏆 Tournament tayari imeanza."
);

return;

}

const confirmed =
confirm(
"🏆 Una uhakika kuanza tournament?"
);

if (!confirmed) return;

try {

await addDoc(
  collection(db, "tournament"),
  {

    status: "started",
    seasonNumber: currentSeasonNumber,

    playerCount:
      players.length,

    format:
      tournamentSettings.format,

    groupCount:
      tournamentSettings.groupCount,

    startedAt:
      serverTimestamp()

  }
);


tournamentStarted = true;


alert(
  "🏆 TOURNAMENT STARTED!"
);


updateTournamentUI();

} catch (error) {

console.error(
  "Start tournament error:",
  error
);


alert(
  "❌ Failed to start tournament."
);

}

}

// =====================================================
// LOAD TOURNAMENT STATUS
// =====================================================

async function loadTournamentStatus() {

try {

const snapshot =
  await getDocs(
    collection(db, "tournament")
  );


tournamentStarted =
  snapshot.docs.some(
    (item) =>
      item.data().status === "started"
  );

} catch (error) {

console.error(
  "Tournament status error:",
  error
);

}

}

// =====================================================
// UPDATE TOURNAMENT UI
// =====================================================

function updateTournamentUI() {

const status =
document.getElementById("tournamentStatus");

const counter =
document.getElementById("playerCounter");

const progress =
document.getElementById("playerProgress");

const start =
document.getElementById("startTournamentBtn");

const generate =
document.getElementById("generateFixturesBtn");

if (counter) {

counter.textContent =
  "Players: " +
  players.length;

}

if (progress) {

const percent =
  Math.min(
    players.length / 32 * 100,
    100
  );


progress.style.width =
  percent + "%";

}

if (tournamentStarted) {

if (status) {
  status.textContent =
    "🟢 TOURNAMENT STARTED";
}


if (start) {
  start.disabled = true;
}


return;

}

if (players.length < 2) {

if (status) {

  status.textContent =
    "🟡 WAITING — REGISTER AT LEAST 2 PLAYERS";

}


if (start) {
  start.disabled = true;
}


if (generate) {
  generate.disabled = true;
}

} else {

if (status) {

  status.textContent =
    matches.length > 0
      ? "🔵 READY — FIXTURES GENERATED"
      : "🟢 READY — " +
        players.length +
        " PLAYERS";

}


if (start) {

  start.disabled =
    matches.length === 0;

}


if (generate) {
  generate.disabled = false;
}

}

}


// =====================================================
// SEASON HISTORY + SEASON RESET
// =====================================================

function setupSeasonControls() {
  document.getElementById("startNewSeasonBtn")?.addEventListener("click", startNewSeason);
}

async function getNextSeasonNumber() {
  try {
    const snapshot = await getDocs(collection(db, "seasonArchives"));
    let max = 0;
    snapshot.docs.forEach((item) => {
      const n = Number(item.data()?.seasonNumber || String(item.id).replace(/\D/g, "") || 0);
      if (n > max) max = n;
    });
    return Math.max(currentSeasonNumber + 1, max + 1, 2);
  } catch (error) {
    console.error("Season number error:", error);
    return currentSeasonNumber + 1;
  }
}

async function archiveCollectionToSeason(seasonId, collectionName) {
  const snapshot = await getDocs(collection(db, collectionName));
  for (const item of snapshot.docs) {
    await setDoc(doc(db, "seasonArchives", seasonId, collectionName, item.id), item.data());
  }
  return snapshot.size;
}

async function archiveFullSeason(seasonNumber) {
  const seasonId = `season-${seasonNumber}`;
  const seasonRef = doc(db, "seasonArchives", seasonId);
  const existing = await getDoc(seasonRef);
  if (existing.exists()) return false;

  const collectionsToArchive = [
    "registrations",
    "matches",
    "tournament",
    "settings",
    "awardVotes",
    "awardNominations"
  ];

  const counts = {};
  for (const collectionName of collectionsToArchive) {
    counts[collectionName] = await archiveCollectionToSeason(seasonId, collectionName);
  }

  await setDoc(seasonRef, {
    seasonNumber,
    season: `Season ${seasonNumber}`,
    archivedAt: serverTimestamp(),
    counts,
    playerCount: players.length,
    matchCount: matches.length,
    awardVoting: { ...awardVotingState, endedAt: awardVotingState.endedAt || null }
  }, { merge: true });

  return true;
}

async function clearCurrentSeasonData() {
  const collectionsToClear = ["registrations", "matches", "tournament", "settings", "awardVotes", "awardNominations"];
  for (const collectionName of collectionsToClear) {
    const snapshot = await getDocs(collection(db, collectionName));
    for (const item of snapshot.docs) {
      await deleteDoc(doc(db, collectionName, item.id));
    }
  }
  localStorage.removeItem("donBoscoAwardVoter");
  await setDoc(doc(db, "awardVoting", "current"), { ended: false, endedAt: null, winners: {}, seasonNumber: currentSeasonNumber }, { merge: true });
  awardVotingState = { ended: false, endedAt: null, winners: {} };
  awardNominations = {};
  awardVoteCounts = {};
  currentAwardData = null;
  tournamentStarted = false;
}

async function startNewSeason() {
  if (!adminLoggedIn) { alert("🔐 Admin login kwanza."); return; }
  if (players.length === 0 && matches.length === 0) {
    alert("⚠️ Current season haina data ya ku-archive.");
    return;
  }

  await loadAwardVotingState();
  const hasPublishedFanAwards = VOTED_AWARD_KEYS.some((category) => (awardNominations[category] || []).length === 3);
  if (hasPublishedFanAwards && !awardVotingState.ended) {
    alert("🔒 End the fan voting and declare the winners before starting the next season.");
    return;
  }
  const nextSeason = await getNextSeasonNumber();
  const confirmed = confirm(
    `🏆 End Season ${currentSeasonNumber} and start Season ${nextSeason}?\\n\\n` +
    `Kila player, fixture, result, standings, votes, awards na tournament settings za Season ${currentSeasonNumber} zitawekwa kwenye Season History.`
  );
  if (!confirmed) return;

  const message = document.getElementById("seasonMessage");
  try {
    await archiveFullSeason(currentSeasonNumber);
    await updatePowerRankingsFromCurrentSeason();
    await clearCurrentSeasonData();

    currentSeasonNumber = nextSeason;
    await setDoc(doc(db, "settings", "current"), {
      format: "groups",
      groupCount: 2,
      seasonNumber: currentSeasonNumber,
      updatedAt: serverTimestamp()
    });

    await loadLeague();
    showMessage(message, `✅ Season ${currentSeasonNumber} started. Season ${currentSeasonNumber - 1} imehifadhiwa kwenye history.`, "success");
  } catch (error) {
    console.error("Start new season error:", error);
    showMessage(message, "❌ Season mpya haikuanza. Data ya sasa haijafutwa mpaka archive ikamilike.", "error");
  }
}

async function renderSeasonHistory() {
  const container = document.getElementById("seasonHistoryList");
  if (!container) return;
  try {
    const snapshot = await getDocs(collection(db, "seasonArchives"));
    if (snapshot.empty) {
      container.innerHTML = `<div class="loading">No previous seasons yet.</div>`;
      return;
    }
    const seasons = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }))
      .sort((a,b) => Number(b.seasonNumber || 0) - Number(a.seasonNumber || 0));

    container.innerHTML = seasons.map((entry) => {
      const counts = entry.counts || {};
      return `<button type="button" class="season-history-card" data-season-id="${escapeHTML(entry.id)}">
        <span class="season-history-icon">🏆</span>
        <span><strong>SEASON ${escapeHTML(entry.seasonNumber || "?")}</strong>
        <small>${escapeHTML(counts.registrations || 0)} players • ${escapeHTML(counts.matches || 0)} fixtures • Full archive</small></span>
        <span>VIEW →</span>
      </button>`;
    }).join("");

    container.querySelectorAll("[data-season-id]").forEach((button) => {
      button.addEventListener("click", () => viewArchivedSeason(button.dataset.seasonId));
    });
  } catch (error) {
    console.error("Season history error:", error);
    container.innerHTML = `<div class="loading">Season history is unavailable until Firebase permissions allow it.</div>`;
  }
}

async function viewArchivedSeason(seasonId) {
  try {
    const meta = await getDoc(doc(db, "seasonArchives", seasonId));
    if (!meta.exists()) return;
    const season = meta.data();
    const history = document.getElementById("seasonArchiveDetails");
    if (!history) return;

    const [playersSnap, matchesSnap, tournamentSnap, settingsSnap] = await Promise.all([
      getDocs(collection(db, "seasonArchives", seasonId, "registrations")),
      getDocs(collection(db, "seasonArchives", seasonId, "matches")),
      getDocs(collection(db, "seasonArchives", seasonId, "tournament")),
      getDocs(collection(db, "seasonArchives", seasonId, "settings"))
    ]);

    const archivedPlayers = playersSnap.docs.map(d => d.data());
    const archivedMatches = matchesSnap.docs.map(d => d.data());
    const played = archivedMatches.filter(m => m.played);
    const goals = played.reduce((sum,m) => sum + Number(m.homeGoals || 0) + Number(m.awayGoals || 0), 0);
    const final = played.filter(m => String(m.group || "").toLowerCase() === "final").slice(-1)[0];

    history.innerHTML = `<div class="season-detail-card">
      <div><span>SEASON</span><strong>${escapeHTML(season.seasonNumber || "?")}</strong></div>
      <div><span>PLAYERS</span><strong>${archivedPlayers.length}</strong></div>
      <div><span>FIXTURES</span><strong>${archivedMatches.length}</strong></div>
      <div><span>PLAYED</span><strong>${played.length}</strong></div>
      <div><span>GOALS</span><strong>${goals}</strong></div>
      <div><span>FINAL</span><strong>${escapeHTML(final ? `${final.homePlayer || "TBD"} ${final.homeGoals ?? "-"} - ${final.awayGoals ?? "-"} ${final.awayPlayer || "TBD"}` : "Not recorded")}</strong></div>
      <small>All original Season ${escapeHTML(season.seasonNumber || "?")} registrations, fixtures, results, tournament records, settings, nominations and votes are preserved in this archive.</small>
    </div>`;
  } catch (error) {
    console.error("Archived season view error:", error);
  }
}

// =====================================================
// HALL OF FAME + AUTOMATIC AWARDS + FAN VOTING
// =====================================================

let currentAwardData = null;
let awardVoteCounts = {};
let awardNominations = {};
let awardVotesUnsubscribe = null;
let awardVotingState = { ended: false, endedAt: null, winners: {} };

const AWARD_CATEGORIES = {
  playerOfTournament: { title: "Player of the Tournament", icon: "⭐", accent: "award-star", type: "voted", description: "Fan-voted award. Admin publishes three finalists." },
  upcomingPlayer: { title: "Upcoming Player", icon: "🚀", accent: "award-rising", type: "voted", description: "Fan-voted emerging talent. Admin publishes three finalists." },
  fanPriority: { title: "Fan's Priority Player", icon: "❤️", accent: "award-priority", type: "voted", description: "Purely decided by the fans. Admin publishes three finalists." },
  goldenBoot: { title: "Golden Boot / Top Scorer", icon: "⚽", accent: "award-gold", type: "automatic", description: "Automatically awarded to the player with the most goals." },
  bestDefender: { title: "Best Defender", icon: "🛡️", accent: "award-defender", type: "automatic", description: "Automatically calculated from clean sheets and goals conceded." },
  mostWins: { title: "Most Wins", icon: "🏅", accent: "award-wins", type: "automatic", description: "Automatically awarded to the player with the most wins." }
};

const VOTED_AWARD_KEYS = Object.keys(AWARD_CATEGORIES).filter((category) => AWARD_CATEGORIES[category].type === "voted");
const AUTOMATIC_AWARD_KEYS = Object.keys(AWARD_CATEGORIES).filter((category) => AWARD_CATEGORIES[category].type === "automatic");

function setupAwardsAndVoting() {
  const voting = document.getElementById("awardVotingCategories");
  if (voting) {
    voting.addEventListener("click", async (event) => {
      const button = event.target.closest("[data-vote-category]");
      if (!button) return;
      await castAwardVote(button.dataset.voteCategory, button.dataset.votePlayer);
    });
  }

  // Live public results: every new vote is reflected without refreshing the page.
  if (awardVotesUnsubscribe) awardVotesUnsubscribe();
  try {
    awardVotesUnsubscribe = onSnapshot(collection(db, "awardVotes"), (snapshot) => {
      awardVoteCounts = {};
      snapshot.docs.forEach((item) => {
        const data = item.data();
        if (!data.category || !data.playerId) return;
        if (!awardVoteCounts[data.category]) awardVoteCounts[data.category] = {};
        awardVoteCounts[data.category][data.playerId] = (awardVoteCounts[data.category][data.playerId] || 0) + 1;
      });
      // Only re-render once the page has award data loaded.
      if (currentAwardData) renderAwardsAndVoting();
    }, (error) => console.warn("Live award vote updates unavailable:", error));
  } catch (error) {
    console.warn("Could not start live award vote listener:", error);
  }
}

function setupHallOfFameAdmin() {
  const archiveButton = document.getElementById("archiveTournamentBtn");
  if (archiveButton) archiveButton.addEventListener("click", archiveTournamentToHallOfFame);
  const saveButton = document.getElementById("saveAwardNominationsBtn");
  if (saveButton) saveButton.addEventListener("click", saveAwardNominations);
  const endVotesButton = document.getElementById("endAwardVotesBtn");
  if (endVotesButton) endVotesButton.addEventListener("click", endAwardVotes);
}

function getAwardStats() {
  const stats = {};

  players.forEach((player) => {
    stats[player.id] = {
      player,
      id: player.id,
      name: player.username || player.name || "PLAYER",
      age: Number(player.age || 0),
      P: 0, W: 0, D: 0, L: 0, GF: 0, GA: 0,
      cleanSheets: 0, rating: 0
    };
  });

  const findPlayer = (name) => {
    const normalized = String(name || "").trim().toLowerCase();
    return Object.values(stats).find((item) => String(item.name).trim().toLowerCase() === normalized);
  };

  matches.filter((match) => match.played).forEach((match) => {
    const home = findPlayer(match.homePlayer);
    const away = findPlayer(match.awayPlayer);
    if (!home || !away) return;

    const hg = Math.max(0, Number(match.homeGoals || 0));
    const ag = Math.max(0, Number(match.awayGoals || 0));

    home.P++; away.P++;
    home.GF += hg; home.GA += ag;
    away.GF += ag; away.GA += hg;

    if (ag === 0) home.cleanSheets++;
    if (hg === 0) away.cleanSheets++;

    if (hg > ag) { home.W++; away.L++; }
    else if (hg < ag) { away.W++; home.L++; }
    else { home.D++; away.D++; }
  });

  Object.values(stats).forEach((item) => {
    const points = item.W * 3 + item.D;
    const gd = item.GF - item.GA;
    item.PTS = points;
    item.GD = gd;
    item.rating = item.P ? Math.max(0, Math.min(10,
      5 + (points / item.P) * 0.65 + (item.GF / item.P) * 0.35 +
      (gd / item.P) * 0.25 + (item.cleanSheets / item.P) * 0.75
    )) : 0;
  });

  return Object.values(stats);
}

function sortByPerformance(list) {
  return [...list].sort((a, b) => b.rating - a.rating || b.PTS - a.PTS || b.GF - a.GF || a.GA - b.GA);
}

function getAutomaticCandidates(stats) {
  const active = stats.filter((item) => item.P > 0);
  return {
    playerOfTournament: sortByPerformance(active),
    upcomingPlayer: [...active].sort((a, b) => {
      const aEligible = a.age > 0 && a.age <= 21 ? 1 : 0;
      const bEligible = b.age > 0 && b.age <= 21 ? 1 : 0;
      return bEligible - aEligible || b.rating - a.rating || b.PTS - a.PTS || b.GF - a.GF;
    }),
    fanPriority: sortByPerformance(active),
    goldenBoot: [...active].sort((a, b) => b.GF - a.GF || b.rating - a.rating),
    bestDefender: [...active].sort((a, b) => b.cleanSheets - a.cleanSheets || a.GA - b.GA || b.rating - a.rating),
    mostWins: [...active].sort((a, b) => b.W - a.W || b.PTS - a.PTS || b.rating - a.rating)
  };
}

function getDefaultNominations(stats) {
  const auto = getAutomaticCandidates(stats);
  const result = {};
  VOTED_AWARD_KEYS.forEach((category) => {
    result[category] = (auto[category] || []).slice(0, 3).map((item) => item.id);
  });
  return result;
}

async function loadAwardNominations(stats) {
  try {
    const snap = await getDoc(doc(db, "awardNominations", "current"));
    const saved = snap.exists() ? (snap.data().nominations || {}) : {};
    const defaults = getDefaultNominations(stats);
    awardNominations = {};
    VOTED_AWARD_KEYS.forEach((category) => {
      const valid = Array.isArray(saved[category]) ? saved[category].filter((id) => stats.some((item) => item.id === id)) : [];
      awardNominations[category] = valid.length === 3 ? valid : defaults[category];
    });
  } catch (error) {
    console.warn("Award nominations unavailable; using automatic top-three suggestions.", error);
    awardNominations = getDefaultNominations(stats);
  }
}

function metricForAward(category, item) {
  if (!item) return "";
  if (category === "goldenBoot") return `${item.GF} goal${item.GF === 1 ? "" : "s"}`;
  if (category === "bestDefender") return `${item.cleanSheets} clean sheet${item.cleanSheets === 1 ? "" : "s"} • ${item.GA} conceded`;
  if (category === "mostWins") return `${item.W} win${item.W === 1 ? "" : "s"} • ${item.PTS} pts`;
  if (category === "upcomingPlayer") return item.age ? `Age ${item.age} • ${item.rating.toFixed(1)} rating` : `${item.rating.toFixed(1)} rating`;
  return `${item.rating.toFixed(1)} / 10 rating • ${item.GF} goals`;
}

function awardCard(title, icon, winner, metric, description, accentClass = "") {
  if (!winner) return `<article class="award-card ${accentClass}"><div class="award-icon">${icon}</div><div class="award-label">${escapeHTML(title)}</div><div class="award-player-name">AWAITING RESULTS</div><p>${escapeHTML(description)}</p></article>`;
  const player = winner.player || {};
  const display = winner.name;
  const initials = display.split(/\s+/).slice(0, 2).map((part) => part[0] || "").join("").toUpperCase();
  return `<article class="award-card decorated-player-card ${accentClass}">
    <div class="award-ribbon">${icon}</div><div class="player-medallion"><span>${escapeHTML(initials || "P")}</span></div>
    <div class="award-label">${escapeHTML(title)}</div><div class="award-player-name">${escapeHTML(display)}</div>
    <div class="award-team">TEAM ${escapeHTML(player.teamNumber ?? "-")}</div><div class="award-metric">${escapeHTML(metric)}</div>
    <p>${escapeHTML(description)}</p></article>`;
}

async function loadAwardVoteCounts() {
  // Counts are normally maintained by the live onSnapshot listener.
  // This fallback is useful during initial load before the listener fires.
  if (Object.keys(awardVoteCounts).length) return;
  awardVoteCounts = {};
  try {
    const snapshot = await getDocs(collection(db, "awardVotes"));
    snapshot.docs.forEach((item) => {
      const data = item.data();
      if (!data.category || !data.playerId) return;
      if (!awardVoteCounts[data.category]) awardVoteCounts[data.category] = {};
      awardVoteCounts[data.category][data.playerId] = (awardVoteCounts[data.category][data.playerId] || 0) + 1;
    });
  } catch (error) {
    console.warn("Award vote counts unavailable:", error);
  }
}

function getWinnerById(stats, playerId) {
  const item = stats.find((candidate) => candidate.id === playerId);
  return item ? { id: item.id, name: item.name, player: item.player } : null;
}

function getVotedWinner(category, stats) {
  const ids = awardNominations[category] || [];
  const counts = awardVoteCounts[category] || {};
  const candidates = ids.map((id) => stats.find((item) => item.id === id)).filter(Boolean);
  if (!candidates.length) return null;
  const total = candidates.reduce((sum, item) => sum + (counts[item.id] || 0), 0);
  if (!total) return null;
  return [...candidates].sort((a, b) => (counts[b.id] || 0) - (counts[a.id] || 0) || b.rating - a.rating)[0];
}

function getAutomaticWinner(category, stats) {
  const candidates = getAutomaticCandidates(stats)[category] || [];
  return candidates[0] || null;
}

async function loadAwardVotingState() {
  try {
    const snap = await getDoc(doc(db, "awardVoting", "current"));
    awardVotingState = snap.exists() ? { ended: false, endedAt: null, winners: {}, ...snap.data() } : { ended: false, endedAt: null, winners: {} };
  } catch (error) {
    console.warn("Award voting state unavailable:", error);
    awardVotingState = { ended: false, endedAt: null, winners: {} };
  }
}

async function renderAwardsAndVoting() {
  await loadAwardVotingState();
  const stats = getAwardStats();
  await loadAwardNominations(stats);
  await loadAwardVoteCounts();

  const winners = {};
  AUTOMATIC_AWARD_KEYS.forEach((category) => { winners[category] = getAutomaticWinner(category, stats); });
  VOTED_AWARD_KEYS.forEach((category) => {
    winners[category] = awardVotingState.ended && awardVotingState.winners?.[category]
      ? (stats.find((item) => item.id === awardVotingState.winners[category]) ? getWinnerById(stats, awardVotingState.winners[category]) : null)
      : null;
  });
  currentAwardData = { stats, ...winners };

  const grid = document.getElementById("awardsGrid");
  if (grid) {
    grid.innerHTML = Object.entries(AWARD_CATEGORIES).map(([category, config]) => {
      const winner = winners[category];
      const counts = awardVoteCounts[category] || {};
      const votes = winner ? counts[winner.id] || 0 : 0;
      const metric = config.type === "automatic"
        ? metricForAward(category, winner)
        : (winner ? `${votes} fan vote${votes === 1 ? "" : "s"}` : `${(awardNominations[category] || []).length}/3 finalists`);
      return awardCard(config.title, config.icon, winner, metric, config.description, config.accent);
    }).join("");
  }

  renderAwardVoting(stats);
  renderAwardNominationManager(stats);
  renderCurrentChampion();
  populateChampionOverride();
}

function renderAwardVoting(stats) {
  const container = document.getElementById("awardVotingCategories");
  if (!container) return;
  const voted = JSON.parse(localStorage.getItem("donBoscoAwardVoter") || "{}");
  const categories = VOTED_AWARD_KEYS.map((category) => [category, AWARD_CATEGORIES[category]]);
  if (!categories.some(([category]) => (awardNominations[category] || []).length === 3)) {
    container.innerHTML = `<div class="loading">Admin has not published three finalists for the fan-voted awards yet.</div>`;
    return;
  }
  container.innerHTML = categories.map(([category, config]) => {
    const ids = awardNominations[category] || [];
    const counts = awardVoteCounts[category] || {};
    const candidates = ids.map((id) => stats.find((item) => item.id === id)).filter(Boolean);
    const hasVoted = Boolean(voted[category]);
    const votingEnded = Boolean(awardVotingState.ended);
    const showResults = hasVoted || votingEnded;
    const totalVotes = candidates.reduce((sum, item) => sum + (counts[item.id] || 0), 0);
    return `<section class="award-vote-category ${config.accent}">
      <div class="award-vote-category-heading"><span>${config.icon} ${escapeHTML(config.title)}</span><small>${votingEnded ? "VOTING CLOSED • FINAL RESULTS" : (hasVoted ? "LIVE RESULTS • Your vote is recorded" : "Choose ONE of the three finalists")}</small></div>
      <div class="vote-candidates">${candidates.map((item) => {
        const initials = item.name.split(/\s+/).slice(0, 2).map((part) => part[0] || "").join("").toUpperCase();
        const votes = counts[item.id] || 0;
        const percentage = totalVotes > 0 ? (votes / totalVotes) * 100 : 0;
        return `<div class="vote-candidate ${hasVoted && voted[category] === item.id ? "vote-leader" : ""}">
          <div class="vote-player-art"><span>${escapeHTML(initials || "P")}</span></div>
          <div class="vote-player-info"><strong>${escapeHTML(item.name)}</strong><small>Team ${escapeHTML(item.player.teamNumber ?? "-")} • ${escapeHTML(metricForAward(category, item))}</small>
            ${showResults ? `<div class="vote-result"><div class="vote-result-meta"><span>${votes} vote${votes === 1 ? "" : "s"}</span><strong>${percentage.toFixed(1)}%</strong></div><div class="vote-progress"><span style="width:${Math.min(100, percentage)}%"></span></div></div>` : `<span class="vote-hidden-result">Vote to reveal live percentages</span>`}
          </div>
          <button class="primary-btn vote-btn" data-vote-category="${escapeHTML(category)}" data-vote-player="${escapeHTML(item.id)}" ${(hasVoted || votingEnded) ? "disabled" : ""}>${votingEnded ? (awardVotingState.winners?.[category] === item.id ? "WINNER 🏆" : "VOTING CLOSED") : (hasVoted ? (voted[category] === item.id ? "VOTED ✓" : "VOTE CAST") : "VOTE")}</button>
        </div>`;
      }).join("")}</div>
      ${votingEnded ? `<div class="live-vote-note">🏆 Final results • Voting has ended and the winner is locked.</div>` : (hasVoted ? `<div class="live-vote-note">🔴 Live results • Percentages update as fans vote.</div>` : `<div class="vote-reveal-note">🔒 Percentages are hidden until you cast your vote.</div>`)}
    </section>`;
  }).join("");

  const message = document.getElementById("voteMessage");
  if (message && Object.keys(voted).length) showMessage(message, "✅ Your votes are saved on this device. Vote percentages are now visible and update live.", "success");
}

async function castAwardVote(category, playerId) {
  const message = document.getElementById("voteMessage");
  if (!AWARD_CATEGORIES[category] || AWARD_CATEGORIES[category].type !== "voted" || !(awardNominations[category] || []).includes(playerId)) return;
  await loadAwardVotingState();
  if (awardVotingState.ended) { showMessage(message, "🔒 Voting has ended. Winners have already been declared.", "error"); return; }
  const voted = JSON.parse(localStorage.getItem("donBoscoAwardVoter") || "{}");
  if (voted[category]) {
    showMessage(message, `⚠️ You already voted in ${AWARD_CATEGORIES[category].title}.`, "error");
    return;
  }
  const player = players.find((item) => item.id === playerId);
  if (!player) return;
  const voterId = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  try {
    await setDoc(doc(db, "awardVotes", `${voterId}_${category}`), {
      voterId, category, playerId, playerName: player.username || player.name || "PLAYER", createdAt: serverTimestamp()
    });
    voted[category] = playerId;
    localStorage.setItem("donBoscoAwardVoter", JSON.stringify(voted));
    showMessage(message, `✅ Your vote for ${player.username || player.name} in ${AWARD_CATEGORIES[category].title} has been recorded.`, "success");
    await renderAwardsAndVoting();
  } catch (error) {
    console.error("Award vote error:", error);
    showMessage(message, "❌ Vote could not be recorded. Check Firebase permissions.", "error");
  }
}

function renderAwardNominationManager(stats) {
  const container = document.getElementById("awardNominationManager");
  if (!container) return;
  if (!adminLoggedIn) {
    container.innerHTML = `<div class="loading">Log in as Admin to choose any three players for the fan-voted awards.</div>`;
    return;
  }

  // Admin is intentionally free to nominate ANY active player.
  // Automatic award rankings are not used to restrict or pre-select nominees.
  const allPlayers = [...players]
    .filter((player) => player?.id)
    .sort((a, b) => getPlayerName(a).localeCompare(getPlayerName(b)));
  const options = allPlayers
    .map((item) => `<option value="${escapeHTML(item.id)}">${escapeHTML(getPlayerName(item))}</option>`)
    .join("");

  container.innerHTML = VOTED_AWARD_KEYS.map((category) => {
    const config = AWARD_CATEGORIES[category];
    return `<div class="nomination-category">
      <div>
        <strong>${config.icon} ${escapeHTML(config.title)}</strong>
        <small>Admin can freely choose any 3 active players for this award.</small>
      </div>
      <div class="nomination-selects">${[0,1,2].map((index) => `
        <select data-nomination-category="${escapeHTML(category)}" aria-label="${escapeHTML(config.title)} nominee ${index + 1}">
          <option value="">Choose player ${index + 1}</option>
          ${options}
        </select>`).join("")}
      </div>
    </div>`;
  }).join("");

  VOTED_AWARD_KEYS.forEach((category) => {
    const selects = [...container.querySelectorAll(`[data-nomination-category="${category}"]`)];
    (awardNominations[category] || []).slice(0, 3).forEach((id, index) => {
      if (selects[index]) selects[index].value = id;
    });
  });
}

async function saveAwardNominations() {
  if (!adminLoggedIn) { alert("🔐 Admin login kwanza."); return; }
  const message = document.getElementById("nominationMessage");
  const stats = getAwardStats();
  const nominations = {};
  for (const category of VOTED_AWARD_KEYS) {
    const selects = [...document.querySelectorAll(`[data-nomination-category="${category}"]`)];
    const ids = selects.map((select) => select.value).filter(Boolean);
    if (ids.length !== 3 || new Set(ids).size !== 3) {
      showMessage(message, `⚠️ Choose exactly three different players for ${AWARD_CATEGORIES[category].title}.`, "error");
      return;
    }
    if (ids.some((id) => !stats.some((item) => item.id === id))) {
      showMessage(message, "⚠️ One of the selected players is no longer an active player.", "error");
      return;
    }
    nominations[category] = ids;
  }
  try {
    await setDoc(doc(db, "awardNominations", "current"), { nominations, updatedAt: serverTimestamp() });
    awardNominations = nominations;
    showMessage(message, "✅ Your 3 selected players are now published for each fan-voted award. Voting is now live.", "success");
    await renderAwardsAndVoting();
  } catch (error) {
    console.error("Award nominations save error:", error);
    showMessage(message, "❌ Could not save finalists. Check Firebase permissions.", "error");
  }
}

async function endAwardVotes() {
  if (!adminLoggedIn) { alert("🔐 Admin login kwanza."); return; }
  const message = document.getElementById("voteEndMessage");
  await loadAwardVotingState();
  if (awardVotingState.ended) {
    showMessage(message, "🔒 Voting is already closed and the winners are locked.", "error");
    return;
  }
  const stats = getAwardStats();
  await loadAwardNominations(stats);
  const missing = VOTED_AWARD_KEYS.filter((category) => (awardNominations[category] || []).length !== 3);
  if (missing.length) {
    showMessage(message, `⚠️ Choose exactly 3 players for: ${missing.map((c) => AWARD_CATEGORIES[c].title).join(", ")}.`, "error");
    return;
  }
  const confirmed = confirm("END ALL FAN VOTING NOW?\n\nThis will permanently lock the current Season's three fan-voted awards, calculate the winners, and prevent any more votes. Continue?");
  if (!confirmed) return;
  const winners = {};
  for (const category of VOTED_AWARD_KEYS) {
    const ids = awardNominations[category];
    const counts = awardVoteCounts[category] || {};
    const winnerId = ids.slice().sort((a, b) => {
      const diff = (counts[b] || 0) - (counts[a] || 0);
      if (diff) return diff;
      return String(a).localeCompare(String(b));
    })[0];
    winners[category] = winnerId;
  }
  try {
    await setDoc(doc(db, "awardVoting", "current"), { ended: true, endedAt: serverTimestamp(), winners, seasonNumber: currentSeasonNumber }, { merge: true });
    awardVotingState = { ended: true, endedAt: new Date(), winners };
    showMessage(message, "🏆 Voting ended. All three fan-voted winners are now locked and displayed in the awards area.", "success");
    await renderAwardsAndVoting();
  } catch (error) {
    console.error("End award voting error:", error);
    showMessage(message, "❌ Could not close voting. Check Firebase permissions.", "error");
  }
}

function getChampionFromFinal() {
  const finals = matches.filter((match) => match.played && String(match.group || "").trim().toLowerCase() === "final");
  if (!finals.length) return null;
  const final = finals[finals.length - 1];
  const hg = Number(final.homeGoals || 0), ag = Number(final.awayGoals || 0);
  if (hg === ag) return null;
  const winnerName = hg > ag ? final.homePlayer : final.awayPlayer;
  return players.find((player) => String(player.username || player.name || "").toLowerCase() === String(winnerName || "").toLowerCase()) || null;
}

function renderCurrentChampion() {
  const container = document.getElementById("currentChampion");
  if (!container) return;
  const champion = getChampionFromFinal();
  if (!champion) {
    container.innerHTML = `<div class="champion-crown">👑</div><div><span>TOURNAMENT CHAMPION</span><strong>TO BE DECIDED</strong><small>Play and record the FINAL result to crown the champion.</small></div>`;
    return;
  }
  container.innerHTML = `<div class="champion-crown">🏆</div><div><span>TOURNAMENT CHAMPION</span><strong>${escapeHTML(champion.username || champion.name)}</strong><small>Team ${escapeHTML(champion.teamNumber ?? "-")} • Crowned automatically from the FINAL result.</small></div>`;
}

function populateChampionOverride() {
  const select = document.getElementById("championOverride");
  if (!select) return;
  const current = select.value;
  select.innerHTML = `<option value="">Auto-detect from FINAL</option>` + players.map((player) => `<option value="${escapeHTML(player.id)}">${escapeHTML(player.username || player.name)} — Team ${escapeHTML(player.teamNumber ?? "-")}</option>`).join("");
  select.value = current;
}

async function archiveTournamentToHallOfFame() {
  if (!adminLoggedIn) { alert("🔐 Admin login kwanza."); return; }
  const message = document.getElementById("archiveMessage");
  const overrideId = document.getElementById("championOverride")?.value;
  const champion = (overrideId && players.find((p) => p.id === overrideId)) || getChampionFromFinal();
  if (!champion) { showMessage(message, "⚠️ Record a FINAL winner or choose a champion override first.", "error"); return; }
  if (!currentAwardData) await renderAwardsAndVoting();
  const awards = currentAwardData || {};
  const season = `Season ${currentSeasonNumber}`;
  try {
    const archiveAwards = {};
    Object.keys(AWARD_CATEGORIES).forEach((category) => {
      const winner = awards[category];
      if (!winner) return;
      archiveAwards[category] = { playerId: winner.id, name: winner.name, votes: awardVoteCounts[category]?.[winner.id] || 0, metric: metricForAward(category, winner), type: AWARD_CATEGORIES[category].type };
    });
    await archiveFullSeason(currentSeasonNumber);
    await addDoc(collection(db, "hallOfFame"), {
      season, seasonNumber: currentSeasonNumber, champion: { playerId: champion.id, name: champion.username || champion.name, teamNumber: champion.teamNumber || null },
      awards: archiveAwards, archivedAt: serverTimestamp()
    });
    showMessage(message, `🏛️ ${season} tournament archived in the Hall of Fame.`, "success");
    await renderHallOfFameHistory();
  } catch (error) {
    console.error("Hall of Fame archive error:", error);
    showMessage(message, "❌ Could not archive tournament. Check Firebase permissions.", "error");
  }
}

async function renderHallOfFameHistory() {
  const container = document.getElementById("hallOfFameHistory");
  if (!container) return;
  try {
    const snapshot = await getDocs(collection(db, "hallOfFame"));
    if (snapshot.empty) { container.innerHTML = `<div class="loading">No archived champions yet. Finish your first tournament to create a legend.</div>`; return; }
    const history = snapshot.docs.map((item) => ({ id: item.id, ...item.data() })).sort((a, b) => Number(b.seasonNumber || 0) - Number(a.seasonNumber || 0));
    container.innerHTML = history.map((entry) => {
      const a = entry.awards || {};
      return `<article class="hof-history-item"><div class="hof-year">${escapeHTML(entry.season || "TOURNAMENT")}</div>
        <div class="hof-champion">🏆 <strong>${escapeHTML(entry.champion?.name || "Unknown Champion")}</strong></div>
        <div class="hof-awards">${Object.entries(AWARD_CATEGORIES).map(([category, config]) => a[category] ? `<span>${config.icon} ${escapeHTML(config.title)}: ${escapeHTML(a[category].name)}</span>` : "").join("")}</div>
      </article>`;
    }).join("");
  } catch (error) {
    console.error("Hall of Fame history error:", error);
    container.innerHTML = `<div class="loading">Hall of Fame history is unavailable until Firebase permissions allow it.</div>`;
  }
}

// =====================================================
// PLAYER DASHBOARD
// =====================================================

function getPlayerName(player) {
  return player?.username || player?.name || "PLAYER";
}

function calculatePlayerStats() {
  const stats = {};
  players.forEach((player) => {
    stats[player.id] = {
      id: player.id,
      name: getPlayerName(player),
      teamNumber: player.teamNumber || "-",
      age: player.age || "-",
      P: 0, W: 0, D: 0, L: 0,
      GF: 0, GA: 0, GD: 0,
      cleanSheets: 0,
      points: 0,
      form: []
    };
  });

  matches.filter(m => m.played).forEach((m) => {
    const home = players.find(p => getPlayerName(p) === m.homePlayer);
    const away = players.find(p => getPlayerName(p) === m.awayPlayer);
    if (!home || !away) return;
    const h = stats[home.id], a = stats[away.id];
    const hg = Number(m.homeGoals || 0), ag = Number(m.awayGoals || 0);
    h.P++; a.P++; h.GF += hg; h.GA += ag; a.GF += ag; a.GA += hg;
    if (ag === 0) h.cleanSheets++;
    if (hg === 0) a.cleanSheets++;
    if (hg > ag) { h.W++; h.points += 3; a.L++; h.form.push("W"); a.form.push("L"); }
    else if (hg < ag) { a.W++; a.points += 3; h.L++; h.form.push("L"); a.form.push("W"); }
    else { h.D++; a.D++; h.points++; a.points++; h.form.push("D"); a.form.push("D"); }
  });
  Object.values(stats).forEach(s => s.GD = s.GF - s.GA);
  return stats;
}

function setupPlayerDashboardControls() {
  const input = document.getElementById("playerSearch");
  input?.addEventListener("input", () => renderPlayerDashboard(input.value));
}

function renderPlayerDashboard(search = "") {
  const container = document.getElementById("playerDashboardGrid");
  if (!container) return;
  const stats = Object.values(calculatePlayerStats());
  const q = String(search).trim().toLowerCase();
  const filtered = stats.filter(s => !q || s.name.toLowerCase().includes(q));
  if (!filtered.length) { container.innerHTML = `<div class="loading">No players found.</div>`; return; }
  container.innerHTML = filtered.map((s, i) => `
    <article class="player-dashboard-card">
      <div class="player-card-top"><span class="player-number">#${escapeHTML(s.teamNumber)}</span><span class="player-rank-mini">${i + 1}</span></div>
      <h3>${escapeHTML(s.name)}</h3>
      <div class="player-mini-stats">
        <span><b>${s.P}</b><small>Matches</small></span>
        <span><b>${s.W}</b><small>Wins</small></span>
        <span><b>${s.GF}</b><small>Goals</small></span>
        <span><b>${s.cleanSheets}</b><small>Clean Sheets</small></span>
      </div>
      <div class="player-form">${s.form.slice(-5).map(x => `<i class="form-${x}">${x}</i>`).join("") || "<small>No results yet</small>"}</div>
      <div class="player-extra">GD ${s.GD >= 0 ? "+" : ""}${s.GD} • ${s.points} league points</div>
    </article>`).join("");
}

// =====================================================
// POWER RANKING
// =====================================================

function getSeasonStandingsForPowerRanking() {
  const stats = {};
  players.forEach(p => {
    stats[p.id] = { id: p.id, name: getPlayerName(p), pts: 0, gd: 0, gf: 0 };
  });
  matches.filter(m => m.played).forEach(m => {
    const hp = players.find(p => getPlayerName(p) === m.homePlayer);
    const ap = players.find(p => getPlayerName(p) === m.awayPlayer);
    if (!hp || !ap) return;
    const h = stats[hp.id], a = stats[ap.id];
    const hg = Number(m.homeGoals || 0), ag = Number(m.awayGoals || 0);
    h.gf += hg; a.gf += ag; h.gd += hg-ag; a.gd += ag-hg;
    if (hg > ag) h.pts += 3; else if (hg < ag) a.pts += 3; else { h.pts++; a.pts++; }
  });
  return Object.values(stats).sort((a,b) => b.pts-a.pts || b.gd-a.gd || b.gf-a.gf);
}

function seasonPlacementPoints(rank, total, format) {
  if (format === "groups") {
    const mapped = [5, 4, 2, 1];
    return mapped[rank - 1] || 0;
  }
  // League: an 8-to-1 placement ladder, scaled to any league size.
  if (total <= 1) return 8;
  return Math.max(1, 8 - Math.floor(((rank - 1) * 7) / total));
}

async function updatePowerRankingsFromCurrentSeason() {
  if (currentSeasonNumber < 1 || players.length === 0) return;
  const seasonKey = `season${currentSeasonNumber}`;
  const standings = getSeasonStandingsForPowerRanking();
  const groupData = tournamentSettings.format === "groups" ? getGroups() : null;
  const placementMap = {};

  if (tournamentSettings.format === "groups" && groupData?.length) {
    groupData.forEach(group => {
      const names = new Set(group.players.map(p => getPlayerName(p)));
      const rows = standings.filter(s => names.has(s.name));
      rows.forEach((row, index) => { placementMap[row.id] = seasonPlacementPoints(index + 1, rows.length, "groups"); });
    });
  } else {
    standings.forEach((row, index) => { placementMap[row.id] = seasonPlacementPoints(index + 1, standings.length, "league"); });
  }

  const snapshot = await getDocs(collection(db, "powerRankings"));
  const existing = {};
  snapshot.docs.forEach(d => existing[d.id] = d.data());

  for (const p of players) {
    const old = existing[p.id] || { totalPoints: 0, seasons: {} };
    if (old.seasons?.[seasonKey]) continue;
    const earned = placementMap[p.id] || 0;
    const seasons = { ...(old.seasons || {}) };
    seasons[seasonKey] = earned;
    await setDoc(doc(db, "powerRankings", p.id), {
      playerId: p.id,
      name: getPlayerName(p),
      totalPoints: Number(old.totalPoints || 0) + earned,
      seasons,
      updatedAt: serverTimestamp()
    }, { merge: true });
  }
}

async function renderPowerRanking() {
  const container = document.getElementById("powerRankingContainer");
  if (!container) return;
  if (currentSeasonNumber <= 1) {
    container.innerHTML = `<div class="power-empty"><strong>POWER RANKING STARTS AFTER SEASON 1</strong><span>Season 1 is the foundation season. When it ends, every player's first ranking points will be recorded and carried forward.</span></div>`;
    return;
  }
  try {
    const snap = await getDocs(collection(db, "powerRankings"));
    const stored = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    const byId = new Map(stored.map(row => [row.id, row]));

    // IMPORTANT: show EVERY player. Historical players remain in the ranking,
    // while a player who is new to the current season is added at 0 points.
    players.forEach((player) => {
      if (!byId.has(player.id)) {
        byId.set(player.id, {
          id: player.id,
          playerId: player.id,
          name: getPlayerName(player),
          totalPoints: 0,
          seasons: {}
        });
      }
    });

    const rows = [...byId.values()].map(row => ({
      ...row,
      name: row.name || row.playerName || "PLAYER",
      totalPoints: Number(row.totalPoints || 0),
      seasons: row.seasons || {}
    })).sort((a, b) => {
      const pointsDiff = b.totalPoints - a.totalPoints;
      if (pointsDiff) return pointsDiff;
      return String(a.name).localeCompare(String(b.name));
    });

    if (!rows.length) {
      container.innerHTML = `<div class="power-empty">No players have been registered yet.</div>`;
      return;
    }

    container.innerHTML = `<div class="power-ranking-note">📈 Cumulative ranking: every player is included. Players with 0 points stay in the table at the bottom, while points earned in completed seasons carry forward.</div>` + rows.map((r, i) => {
      const seasonEntries = Object.entries(r.seasons).sort((a,b) => Number(a[0].replace('season','')) - Number(b[0].replace('season','')));
      return `<article class="power-rank-row ${i === 0 ? 'power-rank-first' : ''}">
        <div class="power-rank-position">${i === 0 ? '👑' : '#' + (i + 1)}</div>
        <div class="power-rank-player"><strong>${escapeHTML(r.name)}</strong><small>${seasonEntries.length ? `${seasonEntries.length} completed season(s)` : 'New / 0 points'}</small></div>
        <div class="power-rank-seasons">${seasonEntries.length ? seasonEntries.map(([k,v]) => `<span>S${escapeHTML(k.replace('season',''))}: ${Number(v || 0)}</span>`).join('') : '<span>S1: 0</span>'}</div>
        <div class="power-rank-points"><b>${r.totalPoints}</b><small>POINTS</small></div>
      </article>`;
    }).join("");
  } catch (error) {
    console.error("Power ranking error:", error);
    container.innerHTML = `<div class="power-empty">Power Ranking is unavailable until Firebase permissions allow it.</div>`;
  }
}

// =====================================================
// DATE
// =====================================================

function formatDate(date) {

return [

date.getFullYear(),

String(
  date.getMonth() + 1
).padStart(2, "0"),

String(
  date.getDate()
).padStart(2, "0")

].join("-");

}

// =====================================================
// TIME
// =====================================================

function formatTime(date) {

return (

String(
  date.getHours()
).padStart(2, "0")

+

":" +

String(
  date.getMinutes()
).padStart(2, "0")

);

}

// =====================================================
// HTML ESCAPE
// =====================================================

function escapeHTML(value) {

return String(value ?? "")

.replaceAll("&", "&amp;")
.replaceAll("<", "&lt;")
.replaceAll(">", "&gt;")
.replaceAll('"', "&quot;")
.replaceAll("'", "&#039;");

}

// =====================================================
// MESSAGE
// =====================================================

function showMessage(element, text, type) {

if (!element) return;

element.textContent = text;

element.className =
"message " +
type;

}

// =====================================================
// RESET REGISTER BUTTON
// =====================================================

function resetSubmit(button) {

if (!button) return;

button.disabled = false;

button.innerHTML =
"<span>REGISTER PLAYER</span>" +
"<span>→</span>";

}