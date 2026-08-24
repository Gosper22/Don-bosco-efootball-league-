import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";

import {
getFirestore,
collection,
addDoc,
getDocs,
updateDoc,
doc,
serverTimestamp
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
let resultFilter = "all";

let tournamentSettings = {
format: "groups",
groupCount: 2
};

// =====================================================
// START
// =====================================================

document.addEventListener("DOMContentLoaded", () => {
setupRegisterButtons();
setupRegistration();
setupAdminLogin();
setupTournamentSettings();
setupTournamentControls();

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

const phone =
  document.getElementById("phone")?.value.trim();

const username =
  document.getElementById("username")?.value.trim();

const message =
  document.getElementById("message");

const submit =
  document.getElementById("submitBtn");


if (!teamNumber || !name || !phone || !username) {

  showMessage(
    message,
    "⚠️ Tafadhali jaza taarifa zote.",
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
// LOAD EVERYTHING
// =====================================================

async function loadLeague() {

try {

await loadPlayers();
await loadMatches();
await loadTournamentSettings();
await loadTournamentStatus();

updateSettingsPreview();

updateTournamentUI();

renderFormat();
renderGroups();
renderFixtures();
renderResults();
renderStandings();
renderKnockoutBracket();
renderTournamentHistory();
setupResultFilters();
await ensureKnockoutCreated();

if (adminLoggedIn) {
  loadAdminMatches();
}

} catch (error) {

console.error("League loading error:", error);

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
// GET GROUPS
// =====================================================

function getGroups() {

const count =
Math.max(
1,
Number(tournamentSettings.groupCount || 2)
);

const groups = [];

if (tournamentSettings.format === "league") {

return [
  {
    name: "LEAGUE",
    shortName: "LEAGUE",
    players: [...players]
  }
];

}

const sizes =
calculateGroupSizes(
players.length,
count
);

let position = 0;

for (let i = 0; i < count; i++) {

const size = sizes[i] || 0;


groups.push({

  name:
    "GROUP " + groupLetter(i),

  shortName:
    groupLetter(i),

  players:
    players.slice(
      position,
      position + size
    )

});


position += size;

}

return groups;

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
  " groups • Players distributed automatically";

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
  const container = document.getElementById("fixturesContainer");
  if (!container) return;
  container.innerHTML = "";
  const upcoming = matches.filter(m => !m.played && !isKnockoutMatch(m));
  if (!upcoming.length) {
    container.innerHTML = "<div class='loading'>⏳ No upcoming fixtures yet.</div>";
    return;
  }
  upcoming.forEach(match => {
    const card = document.createElement("div");
    card.className = "fixture fixture-modern";
    card.innerHTML = `
      <div class="fixture-top"><span>${escapeHTML(match.group || "LEAGUE")}</span><span>${escapeHTML(match.date || "TBD")} • ${escapeHTML(match.time || "--:--")}</span></div>
      <div class="fixture-teams"><strong>${escapeHTML(match.homePlayer || "TBD")}</strong><span>VS</span><strong>${escapeHTML(match.awayPlayer || "TBD")}</strong></div>
      <div class="fixture-bottom"><span>UPCOMING</span><span>Match #${escapeHTML(match.matchNumber || "-")}</span></div>`;
    container.appendChild(card);
  });
}

function isKnockoutMatch(match) {
  const g = String(match.group || "").toUpperCase();
  return ["R16", "ROUND OF 16", "QF", "QUARTERFINAL", "QUARTERFINALS", "SF", "SEMIFINAL", "SEMIFINALS", "FINAL"].includes(g) || !!match.stage;
}

function setupResultFilters() {
  document.querySelectorAll("[data-result-filter]").forEach(btn => {
    if (btn.dataset.bound) return;
    btn.dataset.bound = "1";
    btn.addEventListener("click", () => {
      resultFilter = btn.dataset.resultFilter || "all";
      document.querySelectorAll("[data-result-filter]").forEach(b => b.classList.toggle("active", b === btn));
      renderResults();
    });
  });
}

function renderResults() {
  const container = document.getElementById("resultsContainer");
  if (!container) return;
  let list = [...matches].sort((a,b) => String(a.date||"").localeCompare(String(b.date||"")) || String(a.time||"").localeCompare(String(b.time||"")));
  if (resultFilter === "live") list = list.filter(m => m.status === "live");
  if (resultFilter === "upcoming") list = list.filter(m => !m.played && m.status !== "live");
  if (resultFilter === "finished") list = list.filter(m => !!m.played);
  container.innerHTML = "";
  if (!list.length) { container.innerHTML = "<div class='loading'>No games in this category.</div>"; return; }
  list.forEach(match => {
    const card = document.createElement("article");
    const live = match.status === "live";
    const status = live ? "LIVE" : match.played ? "FULL TIME" : "UPCOMING";
    card.className = "result-card";
    card.innerHTML = `
      <div class="result-card-top"><span class="result-stage">${escapeHTML(match.stage || match.group || "LEAGUE")}</span><span class="result-status ${live ? "is-live" : match.played ? "is-finished" : "is-upcoming"}">${status}</span></div>
      <div class="result-main">
        <div class="result-team home"><strong>${escapeHTML(match.homePlayer || "TBD")}</strong><small>HOME</small></div>
        <div class="result-score">${match.played ? `<b>${Number(match.homeGoals||0)}</b><span>—</span><b>${Number(match.awayGoals||0)}</b>` : `<span class="vs-badge">VS</span>`}</div>
        <div class="result-team away"><strong>${escapeHTML(match.awayPlayer || "TBD")}</strong><small>AWAY</small></div>
      </div>
      <div class="result-meta"><span>📅 ${escapeHTML(match.date || "TBD")}</span><span>⏰ ${escapeHTML(match.time || "--:--")}</span></div>`;
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

if (!match.played || isKnockoutMatch(match)) return;


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

async function generateFixtures() {

if (!adminLoggedIn) {

alert("🔐 Admin login kwanza.");
return;

}

if (players.length < 2) {

alert(
  "⚠️ Angalau players 2 wanahitajika."
);

return;

}

const date =
document.getElementById("fixtureStartDate")?.value;

const time =
document.getElementById("fixtureStartTime")?.value;

const interval =
Number(
document.getElementById("fixtureInterval")?.value ||
120
);

if (!date || !time) {

alert(
  "⚠️ Weka tournament start date na time."
);

return;

}

if (matches.length > 0) {

const proceed =
  confirm(
    "Fixtures tayari zipo. Ongeza fixtures mpya?"
  );


if (!proceed) return;

}

try {

let matchNumber =
  matches.length + 1;


let current =
  new Date(
    date + "T" + time + ":00"
  );


if (
  tournamentSettings.format ===
  "league"
) {

  for (
    let i = 0;
    i < players.length;
    i++
  ) {

    for (
      let j = i + 1;
      j < players.length;
      j++
    ) {

      await createMatch(
        matchNumber,
        "LEAGUE",
        players[i],
        players[j],
        current
      );


      matchNumber++;


      current =
        new Date(
          current.getTime() +
          interval * 60000
        );

    }

  }

} else {

  const groups =
    getGroups();


  for (const group of groups) {

    for (
      let i = 0;
      i < group.players.length;
      i++
    ) {

      for (
        let j = i + 1;
        j < group.players.length;
        j++
      ) {

        await createMatch(
          matchNumber,
          group.shortName,
          group.players[i],
          group.players[j],
          current
        );


        matchNumber++;


        current =
          new Date(
            current.getTime() +
            interval * 60000
          );

      }

    }

  }

}


alert(
  "✅ Fixtures generated successfully."
);


await loadLeague();

} catch (error) {

console.error(
  "Fixture generation error:",
  error
);


alert(
  "❌ Failed to generate fixtures."
);

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
// KNOCKOUT BRACKET + HISTORY
// =====================================================

function getGroupStats(groupPlayers) {
  const stats = {};
  groupPlayers.forEach(p => { const n=p.username||p.name||"PLAYER"; stats[n]={name:n,P:0,W:0,D:0,L:0,GF:0,GA:0,GD:0,PTS:0}; });
  matches.filter(m => m.played && !isKnockoutMatch(m)).forEach(m => {
    const h=stats[m.homePlayer], a=stats[m.awayPlayer]; if(!h||!a)return;
    const hg=Number(m.homeGoals||0), ag=Number(m.awayGoals||0); h.P++;a.P++;h.GF+=hg;h.GA+=ag;a.GF+=ag;a.GA+=hg;
    if(hg>ag){h.W++;h.PTS+=3;a.L++;} else if(ag>hg){a.W++;a.PTS+=3;h.L++;} else {h.D++;a.D++;h.PTS++;a.PTS++;}
  });
  return Object.values(stats).map(x=>({...x,GD:x.GF-x.GA})).sort((a,b)=>b.PTS-a.PTS||b.GD-a.GD||b.GF-a.GF);
}

function getQualifiedTeams() {
  if (tournamentSettings.format === "league") return getGroupStats(players).slice(0,16).map(x=>x.name);
  const groups=getGroups();
  const qualified=[];
  if (groups.length===8) groups.forEach(g=>qualified.push(...getGroupStats(g.players).slice(0,2).map(x=>x.name)));
  else groups.forEach(g=>qualified.push(...getGroupStats(g.players).slice(0,2).map(x=>x.name)));
  return qualified.slice(0,16);
}

function knockoutRounds() {
  const stage = m => String(m.stage||m.group||"").toUpperCase();
  const preliminary=matches.filter(m=>["PRELIMINARY","PLAY-IN","ROUND 1"].includes(stage(m)));
  const r16=matches.filter(m=>stage(m)==="ROUND OF 16");
  const qf=matches.filter(m=>stage(m)==="QUARTERFINAL");
  const sf=matches.filter(m=>stage(m)==="SEMIFINAL");
  const f=matches.filter(m=>stage(m)==="FINAL");
  return {preliminary,r16,qf,sf,f};
}

function nextPowerOfTwo(n){
  let p=1; while(p<n) p*=2; return p;
}

function knockoutPlan(teamCount){
  if(teamCount<=0) return {bracketSize:0,preliminary:false,firstStage:"",nextStage:""};
  const size=nextPowerOfTwo(teamCount);
  if(teamCount===size){
    if(size===2) return {bracketSize:2,preliminary:false,firstStage:"FINAL",nextStage:""};
    if(size===4) return {bracketSize:4,preliminary:false,firstStage:"SEMIFINAL",nextStage:"FINAL"};
    if(size===8) return {bracketSize:8,preliminary:false,firstStage:"QUARTERFINAL",nextStage:"SEMIFINAL"};
    if(size===16) return {bracketSize:16,preliminary:false,firstStage:"ROUND OF 16",nextStage:"QUARTERFINAL"};
  }
  return {bracketSize:size,preliminary:true,firstStage:"PRELIMINARY",nextStage:size===8?"QUARTERFINAL":"ROUND OF 16"};
}

function bracketSlot(match) {
  if(!match) return `<span class="bracket-tbd">TBD</span>`;
  return `<span class="bracket-team">${escapeHTML(match.homePlayer||"TBD")}</span><b>${match.played?`${Number(match.homeGoals||0)} — ${Number(match.awayGoals||0)}`:"VS"}</b><span class="bracket-team">${escapeHTML(match.awayPlayer||"TBD")}</span>`;
}

function setBracketLabel(selector,text){
  const el=document.querySelector(selector); if(el) el.textContent=text;
}

function renderKnockoutBracket() {
  const {preliminary,r16,qf,sf,f}=knockoutRounds();
  ["round16-left","round16-right","quarterfinals-left","quarterfinals-right","semifinals-left","semifinals-right"].forEach(id=>{const e=document.getElementById(id);if(e)e.innerHTML="";});
  const drawColumn=(id,list,empty)=>{const e=document.getElementById(id);if(!e)return;if(!list.length){e.innerHTML=`<div class="knockout-empty">${empty}</div>`;return;}list.forEach(m=>{const d=document.createElement("div");d.className="modern-bracket-match";d.innerHTML=bracketSlot(m);e.appendChild(d);});};
  const teams=[...new Set(matches.filter(m=>m.homePlayer||m.awayPlayer).flatMap(m=>[m.homePlayer,m.awayPlayer]).filter(Boolean))];
  const plan=knockoutPlan(Math.max(teams.length,getQualifiedTeams().length));
  const first=preliminary.length?preliminary:r16;

  // The three visible columns are reused dynamically: first stage, next stage, semi-final.
  const firstLabel=plan.preliminary?(plan.bracketSize<=8?"PLAY-IN":"PRELIMINARY"):plan.firstStage;
  const middleLabel=plan.preliminary?plan.nextStage:(plan.firstStage==="FINAL"?"":"");
  setBracketLabel(".bracket-left .bracket-round-labels span:nth-child(1)",firstLabel||"—");
  setBracketLabel(".bracket-left .bracket-round-labels span:nth-child(2)",middleLabel||"—");
  setBracketLabel(".bracket-left .bracket-round-labels span:nth-child(3)","SEMIFINAL");
  setBracketLabel(".bracket-right .bracket-round-labels span:nth-child(1)",firstLabel||"—");
  setBracketLabel(".bracket-right .bracket-round-labels span:nth-child(2)",middleLabel||"—");
  setBracketLabel(".bracket-right .bracket-round-labels span:nth-child(3),.bracket-right .bracket-round-labels span:nth-child(3)","SEMIFINAL");

  if(plan.firstStage==="FINAL"){
    drawColumn("round16-left",[],"Finalists will meet in the centre");
    drawColumn("round16-right",[],"Finalists will meet in the centre");
    drawColumn("quarterfinals-left",[],""); drawColumn("quarterfinals-right",[],"");
    drawColumn("semifinals-left",[],""); drawColumn("semifinals-right",[],"");
  } else if(plan.firstStage==="SEMIFINAL"){
    drawColumn("round16-left",[],"No earlier round"); drawColumn("round16-right",[],"No earlier round");
    drawColumn("quarterfinals-left",[],"No quarter-final"); drawColumn("quarterfinals-right",[],"No quarter-final");
    drawColumn("semifinals-left",sf.slice(0,1),"Waiting"); drawColumn("semifinals-right",sf.slice(1,2),"Waiting");
  } else if(plan.firstStage==="QUARTERFINAL"){
    drawColumn("round16-left",qf.slice(0,2),"Quarter-final"); drawColumn("round16-right",qf.slice(2,4),"Quarter-final");
    drawColumn("quarterfinals-left",[],""); drawColumn("quarterfinals-right",[],"");
    drawColumn("semifinals-left",sf.slice(0,1),"SF pending"); drawColumn("semifinals-right",sf.slice(1,2),"SF pending");
  } else {
    drawColumn("round16-left",first.slice(0,Math.ceil(first.length/2)),"Awaiting teams");
    drawColumn("round16-right",first.slice(Math.ceil(first.length/2)),"Awaiting teams");
    const middle=qf.length?r16.length?qf:r16:[];
    drawColumn("quarterfinals-left",middle.slice(0,Math.ceil(middle.length/2)),"Next round pending");
    drawColumn("quarterfinals-right",middle.slice(Math.ceil(middle.length/2)),"Next round pending");
    drawColumn("semifinals-left",sf.slice(0,1),"SF pending"); drawColumn("semifinals-right",sf.slice(1,2),"SF pending");
  }
  const finalEl=document.getElementById("final");
  if(finalEl) finalEl.innerHTML=f.length?f.map(m=>`<div class="modern-bracket-match">${bracketSlot(m)}</div>`).join(""):"<div class='knockout-empty'>Finalists will meet here</div>";
  const champ=document.getElementById("championCenter"); const final=f[0], winner=winnerOf(final);
  if(champ) champ.innerHTML=winner?`🏆 <span>${escapeHTML(winner)}</span>`:`🏆 <span>CHAMPION</span>`;
}

function renderTournamentHistory() {
  const c=document.getElementById("historyContainer"); if(!c)return; c.innerHTML="";
  getDocs(collection(db,"champions")).then(snap=>{
    const rows=snap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>Number(b.year||0)-Number(a.year||0));
    if(!rows.length){c.innerHTML='<div class="history-empty">🏆 No champions recorded yet.</div>';return;}
    rows.forEach(x=>{const card=document.createElement("div");card.className="champion-card";card.innerHTML=`<div class="champion-year">${escapeHTML(x.year||"—")}</div><div class="champion-cup">🏆</div><div><small>CHAMPION</small><h3>${escapeHTML(x.champion||"—")}</h3><p>Runner-up: ${escapeHTML(x.runnerUp||"—")} ${x.score?`• Final ${escapeHTML(x.score)}`:""}</p></div>`;c.appendChild(card);});
  }).catch(()=>{c.innerHTML='<div class="history-empty">History is not available yet.</div>';});
}

async function ensureKnockoutCreated() {
  if(!tournamentStarted || tournamentSettings.format !== "groups") return;
  const groupMatches=matches.filter(m=>!isKnockoutMatch(m));
  if(!groupMatches.length || groupMatches.some(m=>!m.played)) return;
  const qualified=getQualifiedTeams();
  if(qualified.length<2) return;

  const existing=knockoutRounds();
  const allKnockout=[...existing.preliminary,...existing.r16,...existing.qf,...existing.sf,...existing.f];
  if(!allKnockout.length){
    const plan=knockoutPlan(qualified.length);
    let pairs=[];
    if(plan.preliminary){
      // Top seeds receive byes; the remaining teams play the preliminary round.
      const byeCount=plan.bracketSize-qualified.length;
      const playing=qualified.slice(byeCount);
      for(let i=0;i<playing.length;i+=2){ if(playing[i+1]) pairs.push([playing[i],playing[i+1]]); }
      for(let i=0;i<pairs.length;i++) await addDoc(collection(db,"matches"),{matchNumber:100+i+1,stage:"PRELIMINARY",group:"PRELIMINARY",homePlayer:pairs[i][0],awayPlayer:pairs[i][1],date:"TBD",time:"TBD",homeGoals:null,awayGoals:null,played:false,createdAt:serverTimestamp()});
      // Store the seeded byes so the next round can be generated once preliminaries finish.
      await loadMatches();
    } else {
      for(let i=0;i<qualified.length;i+=2) pairs.push([qualified[i],qualified[i+1]]);
      for(let i=0;i<pairs.length;i++) await addDoc(collection(db,"matches"),{matchNumber:100+i+1,stage:plan.firstStage,group:plan.firstStage,homePlayer:pairs[i][0],awayPlayer:pairs[i][1],date:"TBD",time:"TBD",homeGoals:null,awayGoals:null,played:false,createdAt:serverTimestamp()});
      await loadMatches();
    }
  }

  async function makeStage(stage,pairs,base){
    if(!pairs.length || matches.some(m=>String(m.stage||"").toUpperCase()===stage)) return;
    for(let i=0;i<pairs.length;i++) if(pairs[i][0]&&pairs[i][1]) await addDoc(collection(db,"matches"),{matchNumber:base+i,stage,group:stage,homePlayer:pairs[i][0],awayPlayer:pairs[i][1],date:"TBD",time:"TBD",homeGoals:null,awayGoals:null,played:false,createdAt:serverTimestamp()});
  }

  await loadMatches();
  let r=knockoutRounds();
  const prelim=r.preliminary;
  if(prelim.length && prelim.every(m=>m.played)){
    const winners=prelim.map(winnerOf).filter(Boolean);
    const qualifiedNow=getQualifiedTeams();
    const plan=knockoutPlan(qualifiedNow.length);
    const byeCount=plan.bracketSize-qualifiedNow.length;
    const byes=qualifiedNow.slice(0,byeCount);
    const entrants=[...byes,...winners];
    const nextSize=plan.bracketSize/2;
    let pairs=[];
    for(let i=0;i<entrants.length;i+=2) if(entrants[i+1]) pairs.push([entrants[i],entrants[i+1]]);
    const nextStage=nextSize===8?"QUARTERFINAL":nextSize===4?"SEMIFINAL":"FINAL";
    await makeStage(nextStage,pairs,200);
  }
  await loadMatches(); r=knockoutRounds();
  if(r.r16.length && r.r16.every(m=>m.played)){
    const w=r.r16.map(winnerOf); if(w.every(Boolean)) await makeStage("QUARTERFINAL",[[w[0],w[1]],[w[2],w[3]],[w[4],w[5]],[w[6],w[7]]],250);
  }
  await loadMatches(); r=knockoutRounds();
  if(r.qf.length && r.qf.every(m=>m.played)){
    const w=r.qf.map(winnerOf); if(w.every(Boolean)) await makeStage("SEMIFINAL",[[w[0],w[1]],[w[2],w[3]]],300);
  }
  await loadMatches(); r=knockoutRounds();
  if(r.sf.length && r.sf.every(m=>m.played)){
    const w=r.sf.map(winnerOf); if(w.every(Boolean)) await makeStage("FINAL",[[w[0],w[1]]],400);
  }
  await loadMatches(); r=knockoutRounds();
  if(r.f.length===1 && r.f[0].played){
    const winner=winnerOf(r.f[0]);
    if(winner){
      const snap=await getDocs(collection(db,"champions"));
      if(!snap.docs.some(d=>String(d.data().finalMatchId||"")===String(r.f[0].id))){
        const runner=winner===r.f[0].homePlayer?r.f[0].awayPlayer:r.f[0].homePlayer;
        await addDoc(collection(db,"champions"),{year:new Date().getFullYear(),champion:winner,runnerUp:runner,score:`${r.f[0].homeGoals} — ${r.f[0].awayGoals}`,finalMatchId:r.f[0].id,createdAt:serverTimestamp()});
      }
    }
  }
  renderResults(); renderKnockoutBracket(); renderTournamentHistory();
}

// =====================================================
// START TOURNAMENT
// =====================================================

async function startTournament() {
  if (!adminLoggedIn) { alert("🔐 Admin login kwanza."); return; }
  if (players.length < 2) { alert("⚠️ Register at least 2 players first."); return; }
  if (!matches.length) { alert("⚠️ Generate fixtures kwanza."); return; }
  if (tournamentStarted) { alert("🏆 Tournament tayari imeanza."); return; }
  const confirmed = confirm("🏆 Una uhakika kuanza tournament?");
  if (!confirmed) return;
  try {
    await addDoc(collection(db, "tournament"), {
      status: "started", playerCount: players.length, format: tournamentSettings.format,
      groupCount: tournamentSettings.groupCount, startedAt: serverTimestamp()
    });
    tournamentStarted = true;
    alert("🏆 TOURNAMENT STARTED!");
    updateTournamentUI();
  } catch (error) { console.error("Start tournament error:", error); alert("❌ Failed to start tournament."); }
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