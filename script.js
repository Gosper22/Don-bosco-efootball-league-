import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";

import {
getFirestore,
collection,
addDoc,
getDocs,
updateDoc,
doc,
serverTimestamp,
runTransaction
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


  const normalizedUsername = normalizeKey(username);

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
      normalizeKey(player.username || "") === normalizedUsername
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

  // Re-check uniqueness inside a Firestore transaction.
  // This prevents two people submitting the same team/username
  // at almost exactly the same time.
  const teamKey = "team_" + String(Number(teamNumber)).padStart(2, "0");
  const usernameKey = "username_" + normalizedUsername;
  const teamUniqueRef = doc(db, "registration_uniques", teamKey);
  const usernameUniqueRef = doc(db, "registration_uniques", usernameKey);
  const playerNumber = players.length + 1;
  const registrationRef = doc(collection(db, "registrations"));

  await runTransaction(db, async (transaction) => {
    const teamUnique = await transaction.get(teamUniqueRef);
    const usernameUnique = await transaction.get(usernameUniqueRef);

    if (teamUnique.exists()) {
      throw new Error("TEAM_ALREADY_REGISTERED");
    }

    if (usernameUnique.exists()) {
      throw new Error("USERNAME_ALREADY_REGISTERED");
    }

    const registrationData = {
      teamNumber: Number(teamNumber),
      name: name,
      phone: phone,
      username: username,
      usernameKey: normalizedUsername,
      playerNumber: playerNumber,
      createdAt: serverTimestamp()
    };

    transaction.set(registrationRef, registrationData);
    transaction.set(teamUniqueRef, {
      type: "team",
      value: Number(teamNumber),
      registrationId: registrationRef.id,
      createdAt: serverTimestamp()
    });
    transaction.set(usernameUniqueRef, {
      type: "username",
      value: normalizedUsername,
      registrationId: registrationRef.id,
      createdAt: serverTimestamp()
    });
  });


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

  const registrationError =
    error?.message === "TEAM_ALREADY_REGISTERED"
      ? "❌ Team number hiyo tayari imetumika."
      : error?.message === "USERNAME_ALREADY_REGISTERED"
        ? "❌ eFootball username hiyo tayari imesajiliwa."
        : "❌ Registration failed. Check Firebase.";

  showMessage(
    message,
    registrationError,
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
renderKnockout();

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

  const groupStats = buildGroupStats(group.players, group.shortName);
  const statsByName = Object.fromEntries(
    groupStats.map((item) => [item.name, item])
  );

  group.players.forEach((player, index) => {
    const playerName = player.username || player.name || "PLAYER";
    const playerStat = statsByName[playerName];

    card.innerHTML +=
      "<div class='group-player group-player-status'>" +

      "<div class='group-player-main'>" +
      "<span>" +
      String(index + 1).padStart(2, "0") +
      "</span>" +
      "<strong>" +
      escapeHTML(playerName) +
      "</strong>" +
      "</div>" +

      statusBadge(playerStat?.status) +

      "</div>";
  });

}


grid.appendChild(card);

});

}

// =====================================================
// KNOCKOUT BRACKET DISPLAY
// =====================================================

function renderKnockout() {
  const round16 = document.getElementById("round16");
  const quarterfinals = document.getElementById("quarterfinals");
  const semifinals = document.getElementById("semifinals");
  const final = document.getElementById("final");

  if (!round16) return;

  if (tournamentSettings.format !== "groups") {
    round16.innerHTML = "<div class='knockout-match'><span>GROUP FORMAT REQUIRED</span></div>";
    if (quarterfinals) quarterfinals.innerHTML = "<div class='knockout-match'><span>QUARTERFINALISTS TBD</span></div>";
    if (semifinals) semifinals.innerHTML = "<div class='knockout-match'><span>SEMIFINALISTS TBD</span></div>";
    if (final) final.innerHTML = "<div class='knockout-match final-match'><span>FINALISTS TBD</span></div>";
    return;
  }

  const groups = getGroups();
  const qualified = groups.map((group) => {
    const standings = buildGroupStats(group.players, group.shortName);
    return {
      group: group.shortName,
      first: standings[0]?.status === "qualified" ? standings[0].name : null,
      second: standings[1]?.status === "qualified" ? standings[1].name : null
    };
  });

  const pairings = [];
  for (let i = 0; i < qualified.length; i += 2) {
    const a = qualified[i];
    const b = qualified[i + 1];

    if (!a || !b) continue;

    pairings.push([a.first || "GROUP " + a.group + " #1", b.second || "GROUP " + b.group + " #2"]);
    pairings.push([b.first || "GROUP " + b.group + " #1", a.second || "GROUP " + a.group + " #2"]);
  }

  round16.innerHTML = pairings.map((pair, index) =>
    "<div class='knockout-match'>" +
      "<small>R16 MATCH " + (index + 1) + "</small>" +
      "<span>" + escapeHTML(pair[0]) + "</span>" +
      "<strong>VS</strong>" +
      "<span>" + escapeHTML(pair[1]) + "</span>" +
    "</div>"
  ).join("");

  if (!round16.innerHTML) {
    round16.innerHTML = "<div class='knockout-match'><span>QUALIFIERS TBD</span></div>";
  }

  const qf = Array.from({length: 4}, (_, i) =>
    "<div class='knockout-match'><small>QF " + (i + 1) + "</small><span>R16 WINNER</span><strong>VS</strong><span>R16 WINNER</span></div>"
  ).join("");
  const sf = Array.from({length: 2}, (_, i) =>
    "<div class='knockout-match'><small>SF " + (i + 1) + "</small><span>QF WINNER</span><strong>VS</strong><span>QF WINNER</span></div>"
  ).join("");

  if (quarterfinals) quarterfinals.innerHTML = qf;
  if (semifinals) semifinals.innerHTML = sf;
  if (final) final.innerHTML =
    "<div class='knockout-match final-match'><span>SF WINNER</span><strong>VS</strong><span>SF WINNER</span></div>";
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
// GROUP STANDINGS + MATHEMATICAL QUALIFICATION
// =====================================================

function normalizeKey(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function buildGroupStats(groupPlayers, groupName) {
  const stats = {};

  groupPlayers.forEach((player) => {
    const name = player.username || player.name || "PLAYER";

    stats[name] = {
      name,
      P: 0,
      W: 0,
      D: 0,
      L: 0,
      GF: 0,
      GA: 0,
      GD: 0,
      PTS: 0,
      remaining: 0,
      maxPTS: 0,
      status: "pending"
    };
  });

  matches.forEach((match) => {
    if (match.group !== groupName) return;

    const home = stats[match.homePlayer];
    const away = stats[match.awayPlayer];

    if (!home || !away) return;

    if (!match.played) {
      home.remaining++;
      away.remaining++;
      return;
    }

    const hg = Number(match.homeGoals || 0);
    const ag = Number(match.awayGoals || 0);

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
    player.GD = player.GF - player.GA;
    player.maxPTS = player.PTS + player.remaining * 3;
  });

  const sorted = Object.values(stats).sort(compareStandings);

  // In group format, the top 2 advance to the Round of 16.
  // A player is "QUALIFIED" early only when no other player can
  // mathematically reach their current points.
  if (groupName !== "LEAGUE" && sorted.length > 2) {
    sorted.forEach((player) => {
      const highestChaserMax = Math.max(
        ...sorted
          .filter((other) => other.name !== player.name)
          .map((other) => other.maxPTS)
      );

      if (player.PTS > highestChaserMax) {
        player.status = "qualified";
      }
    });

    const allPlayed = sorted.every((player) => player.remaining === 0);

    if (allPlayed) {
      sorted.forEach((player, index) => {
        player.status = index < 2 ? "qualified" : "eliminated";
      });
    } else {
      const secondPlace = sorted[1];

      sorted.forEach((player) => {
        if (
          player.status !== "qualified" &&
          player.maxPTS < secondPlace.PTS
        ) {
          player.status = "eliminated";
        }
      });
    }
  }

  return sorted;
}

function compareStandings(a, b) {
  if (b.PTS !== a.PTS) return b.PTS - a.PTS;
  if (b.GD !== a.GD) return b.GD - a.GD;
  return b.GF - a.GF;
}

function statusBadge(status) {
  if (status === "qualified") {
    return "<span class='qualification-badge qualified'>🏆 CONGRATULATIONS — QUALIFIED</span>";
  }

  if (status === "eliminated") {
    return "<span class='qualification-badge eliminated'>❌ ELIMINATED</span>";
  }

  return "";
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
    group.players,
    group.shortName
  )
);

});

}

// =====================================================
// STANDINGS TABLE
// =====================================================

function createStandingsTable(groupPlayers, groupName = null) {

const wrapper = document.createElement("div");
wrapper.className = "table-wrapper";

if (!groupPlayers.length) {
  wrapper.innerHTML =
    "<div class='loading'>WAITING FOR PLAYERS</div>";
  return wrapper;
}

const statsList = groupName
  ? buildGroupStats(groupPlayers, groupName)
  : buildGroupStats(groupPlayers, "LEAGUE");

const table = document.createElement("table");
table.className = "standings-table";

table.innerHTML =
"<thead><tr>" +
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
"<th>STATUS</th>" +
"</tr></thead><tbody></tbody>";

const tbody = table.querySelector("tbody");

statsList.forEach((player, index) => {
  const row = document.createElement("tr");

  row.innerHTML =
    "<td>" + (index + 1) + "</td>" +
    "<td><strong>" + escapeHTML(player.name) + "</strong></td>" +
    "<td>" + player.P + "</td>" +
    "<td>" + player.W + "</td>" +
    "<td>" + player.D + "</td>" +
    "<td>" + player.L + "</td>" +
    "<td>" + player.GF + "</td>" +
    "<td>" + player.GA + "</td>" +
    "<td>" + (player.GD >= 0 ? "+" + player.GD : player.GD) + "</td>" +
    "<td><strong>" + player.PTS + "</strong></td>" +
    "<td>" + statusBadge(player.status) + "</td>";

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