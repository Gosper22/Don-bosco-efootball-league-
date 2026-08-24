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
renderStandings();

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
// =====================================================
// PREMIUM RESULTS + AUTOMATIC KNOCKOUT SYSTEM
// =====================================================

function resultStatus(match) {
  if (match.played) return "finished";
  return "upcoming";
}

function renderResults(filter = "all") {
  const container = document.getElementById("resultsContainer");
  if (!container) return;
  const filtered = matches.filter((m) => {
    if (filter === "finished") return !!m.played;
    if (filter === "live") return m.status === "live";
    if (filter === "upcoming") return !m.played && m.status !== "live";
    return true;
  });
  container.innerHTML = "";
  if (!filtered.length) {
    container.innerHTML = "<div class='loading'>No matches in this category yet.</div>";
    return;
  }
  filtered.forEach((match) => {
    const card = document.createElement("article");
    card.className = "result-card";
    const stage = match.stage === "knockout" ? (match.round || "KNOCKOUT") : (match.group || "LEAGUE");
    const status = match.status === "live" ? "LIVE" : (match.played ? "FULL TIME" : "UPCOMING");
    const score = match.played ? `${Number(match.homeGoals || 0)} — ${Number(match.awayGoals || 0)}` : "VS";
    card.innerHTML = `
      <div class="result-top"><span>${escapeHTML(stage)}</span><b class="result-status ${status.toLowerCase().replace(/\s/g,'-')}">${status}</b></div>
      <div class="result-teams"><strong>${escapeHTML(match.homePlayer || "TBD")}</strong><div class="result-score">${score}</div><strong>${escapeHTML(match.awayPlayer || "TBD")}</strong></div>
      <div class="result-meta"><span>📅 ${escapeHTML(match.date || "TBD")}</span><span>⏰ ${escapeHTML(match.time || "--:--")}</span></div>
    `;
    container.appendChild(card);
  });
}

function setupResultsFilters() {
  document.querySelectorAll("[data-result-filter]").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll("[data-result-filter]").forEach((b) => b.classList.remove("active"));
      button.classList.add("active");
      renderResults(button.dataset.resultFilter || "all");
    });
  });
}

document.addEventListener("DOMContentLoaded", setupResultsFilters);

function getQualifiedPlayers() {
  if (tournamentSettings.format === "league") {
    const table = buildStats(players);
    return table.slice(0, 16);
  }
  const groups = getGroups();
  const targetPerGroup = Math.floor(16 / groups.length);
  const remainder = 16 % groups.length;
  const qualified = [];
  groups.forEach((group, i) => {
    const count = targetPerGroup + (i < remainder ? 1 : 0);
    qualified.push(...buildStats(group.players).slice(0, count));
  });
  return qualified.slice(0, 16);
}

function buildStats(groupPlayers) {
  const stats = {};
  groupPlayers.forEach((player) => {
    const name = player.username || player.name || "PLAYER";
    stats[name] = { name, P:0, W:0, D:0, L:0, GF:0, GA:0, GD:0, PTS:0 };
  });
  matches.forEach((match) => {
    if (!match.played || match.stage === "knockout") return;
    const home = stats[match.homePlayer], away = stats[match.awayPlayer];
    if (!home || !away) return;
    const hg = Number(match.homeGoals || 0), ag = Number(match.awayGoals || 0);
    home.P++; away.P++; home.GF += hg; home.GA += ag; away.GF += ag; away.GA += hg;
    if (hg > ag) { home.W++; home.PTS += 3; away.L++; }
    else if (hg < ag) { away.W++; away.PTS += 3; home.L++; }
    else { home.D++; away.D++; home.PTS++; away.PTS++; }
  });
  return Object.values(stats).map(p => ({...p, GD:p.GF-p.GA})).sort((a,b) => b.PTS-a.PTS || b.GD-a.GD || b.GF-a.GF);
}

async function ensureKnockoutStage() {
  if (tournamentSettings.format === "league") return;
  const qualified = getQualifiedPlayers();
  if (qualified.length < 16) return;
  const groupMatches = matches.filter(m => m.stage !== "knockout");
  const completed = groupMatches.length > 0 && groupMatches.every(m => m.played);
  if (!completed) return;
  const existing = matches.filter(m => m.stage === "knockout");
  if (existing.length) return;
  const now = new Date();
  const seeds = qualified.map(p => p.name);
  for (let i=0;i<8;i++) {
    const home = seeds[i*2], away = seeds[i*2+1];
    await addDoc(collection(db,"matches"), {
      matchNumber: 1000+i+1, stage:"knockout", round:"ROUND OF 16", pair:i+1,
      side:i<4?"right":"left", homePlayer:home, awayPlayer:away,
      homeGoals:null, awayGoals:null, played:false, date:formatDate(now), time:formatTime(now), createdAt:serverTimestamp()
    });
  }
  const rounds = [
    {round:"QUARTERFINALS", count:4, base:1100},
    {round:"SEMIFINALS", count:2, base:1200},
    {round:"FINAL", count:1, base:1300}
  ];
  for (const r of rounds) for (let i=0;i<r.count;i++) {
    await addDoc(collection(db,"matches"), {
      matchNumber:r.base+i+1, stage:"knockout", round:r.round, pair:i+1,
      side:i < Math.ceil(r.count/2) ? "right" : "left", homePlayer:null, awayPlayer:null,
      homeGoals:null, awayGoals:null, played:false, date:formatDate(now), time:formatTime(now), createdAt:serverTimestamp()
    });
  }
}

function knockoutMatches(round) {
  return matches.filter(m => m.stage === "knockout" && m.round === round).sort((a,b)=>Number(a.pair||0)-Number(b.pair||0));
}

function renderQualificationNotice() {
  const el=document.getElementById("qualificationNotice"); if(!el) return;
  const qualified=getQualifiedPlayers();
  if(qualified.length<16){ el.textContent="🔒 Knockout will unlock automatically when the group stage is complete and 16 teams are qualified."; return; }
  const names=qualified.map(p=>p.name).join(" • ");
  el.innerHTML=`🎉 <strong>${qualified.length} teams qualified</strong> — ${escapeHTML(names)}. The Round of 16 bracket is generated automatically.`;
}

function renderKnockout() {
  const ids = ["round16Left","round16Right","quarterfinalsLeft","quarterfinalsRight","semifinalsLeft","semifinalsRight","final"];
  ids.forEach(id => { const el=document.getElementById(id); if(el) el.innerHTML=""; });
  const renderRound = (round, leftId, rightId) => {
    const left=document.getElementById(leftId), right=document.getElementById(rightId);
    knockoutMatches(round).forEach((m,i)=>{
      const el=document.createElement("div"); el.className="bracket-match";
      el.innerHTML=`<div>${escapeHTML(m.homePlayer||"QUALIFIER")}</div><b>VS</b><div>${escapeHTML(m.awayPlayer||"QUALIFIER")}</div>`;
      const target=(m.side==="left"?left:right) || right || left; target?.appendChild(el);
    });
  };
  renderRound("ROUND OF 16","round16Left","round16Right");
  renderRound("QUARTERFINALS","quarterfinalsLeft","quarterfinalsRight");
  renderRound("SEMIFINALS","semifinalsLeft","semifinalsRight");
  const finalEl=document.getElementById("final");
  const final=knockoutMatches("FINAL")[0];
  if(finalEl && final) finalEl.innerHTML=`<div class="bracket-match final-bracket-match"><div>${escapeHTML(final.homePlayer||"FINALIST")}</div><b>VS</b><div>${escapeHTML(final.awayPlayer||"FINALIST")}</div></div>`;
  const champion=document.getElementById("championCard");
  const championName=final?.played ? (Number(final.homeGoals)>Number(final.awayGoals)?final.homePlayer:final.awayPlayer) : null;
  if(champion) champion.innerHTML=`<span>🏆 CHAMPION</span><strong>${escapeHTML(championName||"WAITING")}</strong>`;
}

async function advanceKnockout(match) {
  if (!match.played || match.homePlayer == null || match.awayPlayer == null) return;
  if (Number(match.homeGoals) === Number(match.awayGoals)) return;
  const winner = Number(match.homeGoals) > Number(match.awayGoals) ? match.homePlayer : match.awayPlayer;
  const map = {"ROUND OF 16":"QUARTERFINALS","QUARTERFINALS":"SEMIFINALS","SEMIFINALS":"FINAL"};
  const nextRound = map[match.round];
  if (!nextRound) {
    if (match.round === "FINAL") await saveChampion(winner, match);
    return;
  }
  const next = knockoutMatches(nextRound);
  const nextIndex = Math.floor((Number(match.pair)-1)/2);
  const nextMatch = next[nextIndex];
  if (!nextMatch) return;
  const patch = Number(match.pair)%2===1 ? {homePlayer:winner} : {awayPlayer:winner};
  await updateDoc(doc(db,"matches",nextMatch.id), patch);
}

async function saveChampion(name, finalMatch) {
  const historySnap = await getDocs(collection(db,"history"));
  const year = new Date().getFullYear();
  const exists = historySnap.docs.some(d => d.data().year === year);
  if (exists) return;
  const runnerUp = Number(finalMatch.homeGoals)>Number(finalMatch.awayGoals) ? finalMatch.awayPlayer : finalMatch.homePlayer;
  await addDoc(collection(db,"history"), { year, champion:name, runnerUp, score:`${finalMatch.homeGoals}-${finalMatch.awayGoals}`, createdAt:serverTimestamp() });
}

async function renderHistory() {
  const container=document.getElementById("historyContainer"); if(!container) return;
  try {
    const snap=await getDocs(collection(db,"history"));
    const rows=snap.docs.map(d=>d.data()).sort((a,b)=>Number(b.year||0)-Number(a.year||0));
    container.innerHTML="";
    if(!rows.length){container.innerHTML="<div class='loading'>No champions recorded yet.</div>";return;}
    rows.forEach(r=>{const card=document.createElement("div");card.className="history-card";card.innerHTML=`<span>${escapeHTML(r.year||"")}</span><div><strong>🏆 ${escapeHTML(r.champion||"UNKNOWN")}</strong><small>Runner-up: ${escapeHTML(r.runnerUp||"—")} · Final ${escapeHTML(r.score||"—")}</small></div>`;container.appendChild(card);});
  } catch(e){console.error("History error",e);}
}

// Replace the old public fixture renderer with the richer Results Centre.
function renderFixtures() {
  const container=document.getElementById("fixturesContainer"); if(!container)return;
  container.innerHTML="";
  if(!matches.length){container.innerHTML="<div class='loading'>⏳ Fixtures are not generated yet.</div>";return;}
  matches.filter(m=>m.stage!=="knockout").forEach(match=>{
    const card=document.createElement("div"); card.className="fixture";
    card.innerHTML=`<div class="fixture-players"><strong>${escapeHTML(match.homePlayer||"TBD")}</strong><span>VS</span><strong>${escapeHTML(match.awayPlayer||"TBD")}</strong></div><div class="match-schedule">📍 ${escapeHTML(match.group||"LEAGUE")} &nbsp; 📅 ${escapeHTML(match.date||"TBD")} &nbsp; ⏰ ${escapeHTML(match.time||"--:--")}</div><div class="match-status">${match.played?`${match.homeGoals} - ${match.awayGoals}`:"UPCOMING"}</div>`;
    container.appendChild(card);
  });
}

// Add knockout/history/result rendering after every normal data refresh.
const originalLoadLeague = loadLeague;
loadLeague = async function(){
  await originalLoadLeague();
  try { await ensureKnockoutStage(); await loadMatches(); renderResults(); renderQualificationNotice(); renderKnockout(); await renderHistory(); } catch(e){ console.error("Enhanced tournament render error",e); }
};

const originalSaveAdminMatch = saveAdminMatch;
saveAdminMatch = async function(matchId){
  await originalSaveAdminMatch(matchId);
  const match=matches.find(m=>m.id===matchId);
  if(match && match.stage==="knockout") {
    await advanceKnockout(match);
    await loadLeague();
  }
};
