import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";

import {
getFirestore,
collection,
addDoc,
getDocs,
getDoc,
updateDoc,
setDoc,
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
let settingsDocId = null;
let potState = { pot1Locked: false, pot2Locked: false, pot3Locked: false, groupingLocked: false };
let knockoutStages = [];
let hallOfFame = [];
let seasons = [];
let activeSeasonId = null;
let activeSeason = null;

let tournamentSettings = {
format: "groups",
groupCount: 2
};

async function ensureSeasons() {
  try {
    const snap = await getDocs(collection(db, "seasons"));
    seasons = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    seasons.sort((a,b) => Number(a.number || 0) - Number(b.number || 0));

    if (!seasons.length) {
      const ref = await addDoc(collection(db, "seasons"), {
        number: 1,
        name: "Season 1",
        status: "ONGOING",
        createdAt: serverTimestamp()
      });
      seasons = [{ id: ref.id, number: 1, name: "Season 1", status: "ONGOING" }];
    }

    const preferred = activeSeasonId && seasons.find(s => s.id === activeSeasonId);
    activeSeason = preferred || seasons.find(s => s.status === "ONGOING") || seasons.find(s => s.status === "UPCOMING") || seasons[seasons.length - 1];
    activeSeasonId = activeSeason.id;
  } catch (e) {
    console.error("Seasons load error:", e);
  }
}

function seasonMatches(data) {
  return !data.seasonId ? (activeSeason?.number === 1) : data.seasonId === activeSeasonId;
}

async function createSeason() {
  if (!adminLoggedIn) return;
  const nextNumber = seasons.reduce((max, s) => Math.max(max, Number(s.number || 0)), 0) + 1;
  const name = (prompt("Season name:", "Season " + nextNumber) || "").trim();
  if (!name) return;

  const ref = await addDoc(collection(db, "seasons"), {
    number: nextNumber,
    name,
    status: "UPCOMING",
    createdAt: serverTimestamp()
  });

  seasons.push({ id: ref.id, number: nextNumber, name, status: "UPCOMING" });
  await selectSeason(ref.id);
  alert("✅ " + name + " created as UPCOMING. Set it to ONGOING when ready.");
}

async function setSeasonOngoing(id) {
  if (!adminLoggedIn) return;
  const target = seasons.find(s => s.id === id);
  if (!target) return;
  if (!confirm("Set " + target.name + " to ONGOING? The current ONGOING season will become COMPLETED.")) return;

  for (const s of seasons) {
    if (s.id === id) {
      await updateDoc(doc(db, "seasons", s.id), { status: "ONGOING", updatedAt: serverTimestamp() });
      s.status = "ONGOING";
    } else if (s.status === "ONGOING") {
      await updateDoc(doc(db, "seasons", s.id), { status: "COMPLETED", updatedAt: serverTimestamp() });
      s.status = "COMPLETED";
    }
  }
  activeSeasonId = id;
  activeSeason = seasons.find(s => s.id === id);
  await loadLeague();
  renderSeasonManager();
}

async function selectSeason(id) {
  if (!adminLoggedIn) return;
  const found = seasons.find(s => s.id === id);
  if (!found) return;
  activeSeasonId = id;
  activeSeason = found;
  await loadLeague();
  renderSeasonManager();
}

function renderSeasonManager() {
  const box = document.getElementById("seasonManagerContent");
  if (!box || !adminLoggedIn) return;
  box.innerHTML = `
    <div class="season-active-banner">
      <strong>Viewing: ${escapeHTML(activeSeason?.name || "")}</strong>
      <span class="season-status ${String(activeSeason?.status || "").toLowerCase()}">${escapeHTML(activeSeason?.status || "")}</span>
    </div>
    <div class="season-list">
      ${seasons.map(s => `
        <div class="season-row ${s.id === activeSeasonId ? "selected" : ""}">
          <div><strong>${escapeHTML(s.name)}</strong><span>${escapeHTML(s.status)}</span></div>
          <div class="season-actions">
            <button type="button" class="secondary-btn" data-select-season="${s.id}">VIEW</button>
            ${s.status !== "ONGOING" ? `<button type="button" class="primary-btn" data-ongoing-season="${s.id}">SET ONGOING</button>` : ""}
          </div>
        </div>`).join("")}
    </div>
    <button type="button" id="createSeasonBtn" class="primary-btn">➕ CREATE NEW SEASON</button>`;
  box.querySelectorAll("[data-select-season]").forEach(b => b.addEventListener("click", () => selectSeason(b.dataset.selectSeason)));
  box.querySelectorAll("[data-ongoing-season]").forEach(b => b.addEventListener("click", () => setSeasonOngoing(b.dataset.ongoingSeason)));
  document.getElementById("createSeasonBtn")?.addEventListener("click", createSeason);
}

async function loadKnockoutStages() {
  try {
    const snapshot = await getDocs(collection(db, "knockoutStages"));
    knockoutStages = snapshot.docs.map(d => ({ id: d.id, ...d.data() })).filter(seasonMatches);
    knockoutStages.sort((a,b) => Number(a.order || 0) - Number(b.order || 0));
  } catch (e) { console.error("Knockout stages load error", e); knockoutStages = []; }
}
function knockoutRoundName(n) {
  const names={2:"FINAL",4:"SEMIFINALS",8:"QUARTERFINALS",16:"ROUND OF 16",32:"ROUND OF 32"};
  return names[n] || ("ROUND OF " + n);
}
function nextPowerOfTwo(n) { let p=1; while(p<n)p*=2; return p; }
function currentKnockoutStage() { return knockoutStages.length ? knockoutStages[knockoutStages.length-1] : null; }
function getKnockoutMatches(stageName) { return matches.filter(m=>m.stage==="knockout" && m.round===stageName); }
function knockoutTieWinner(tie) {
  if(!tie.length || tie.some(m=>!m.played)) return null;
  let a=0,b=0; const home=tie[0].homePlayer, away=tie[0].awayPlayer;
  tie.forEach(m=>{a+=Number(m.homeGoals||0);b+=Number(m.awayGoals||0);});
  if(a>b)return home; if(b>a)return away;
  return tie.find(m=>m.tieWinner)?.tieWinner || null;
}
function stageIsComplete(name) { const ms=getKnockoutMatches(name); return ms.length>0 && ms.every(m=>m.played); }

// =====================================================
// START
// =====================================================

document.addEventListener("DOMContentLoaded", () => {
setupRegisterButtons();
setupRegistration();
setupAdminLogin();
setupTournamentSettings();
setupTournamentControls();
setupPotManagement();
setupKnockoutAdmin();
setupHallOfFameAdmin();

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


if (activeSeason?.status === "COMPLETED" || tournamentStarted || potState.groupingLocked) {

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

  const normalizedPhone = normalizePhone(phone);

  const samePhone = players.some(
    (player) => normalizePhone(player.phone || "") === normalizedPhone
  );

  if (samePhone) {
    showMessage(message, "❌ Namba ya simu hii tayari imesajiliwa.", "error");
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
  const seasonKey = activeSeasonId || "season1";
  const teamKey = seasonKey + "_team_" + String(Number(teamNumber)).padStart(2, "0");
  const usernameKey = seasonKey + "_username_" + normalizedUsername;
  const phoneKey = seasonKey + "_phone_" + normalizedPhone;
  const phoneUniqueRef = doc(db, "registration_uniques", phoneKey);
  const teamUniqueRef = doc(db, "registration_uniques", teamKey);
  const usernameUniqueRef = doc(db, "registration_uniques", usernameKey);
  const playerNumber = players.length + 1;
  const registrationRef = doc(collection(db, "registrations"));

  await runTransaction(db, async (transaction) => {
    const teamUnique = await transaction.get(teamUniqueRef);
    const usernameUnique = await transaction.get(usernameUniqueRef);
    const phoneUnique = await transaction.get(phoneUniqueRef);

    if (teamUnique.exists()) {
      throw new Error("TEAM_ALREADY_REGISTERED");
    }

    if (usernameUnique.exists()) {
      throw new Error("USERNAME_ALREADY_REGISTERED");
    }
    if (phoneUnique.exists()) {
      throw new Error("PHONE_ALREADY_REGISTERED");
    }

    const registrationData = {
      teamNumber: Number(teamNumber),
      name: name,
      phone: phone,
      username: username,
      seasonId: activeSeasonId,
      seasonName: activeSeason?.name || "Season 1",
      usernameKey: normalizedUsername,
      phoneKey: normalizedPhone,
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
    transaction.set(phoneUniqueRef, {
      type: "phone",
      value: normalizedPhone,
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
        : error?.message === "PHONE_ALREADY_REGISTERED"
          ? "❌ Namba ya simu hii tayari imesajiliwa."
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
  loadAdminKnockoutMatches();
  renderPotManagement();
  renderAdminHallOfFame();

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

await ensureSeasons();
await loadPlayers();
await loadMatches();
await loadTournamentSettings();
await loadPotState();
await loadTournamentStatus();
await loadKnockoutStages();
await loadHallOfFame();

updateSettingsPreview();

updateTournamentUI();

renderFormat();
renderGroups();
renderFixtures();
renderStandings();
renderKnockout();
renderHallOfFame();
renderSeasonManager();

if (adminLoggedIn) {
  loadAdminMatches();
  loadAdminKnockoutMatches();
  renderPotManagement();
  renderAdminHallOfFame();
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
})).filter(seasonMatches);

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
})).filter(seasonMatches);

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

const allSettings =
  await getDocs(collection(db, "settings"));
const snapshot = { docs: allSettings.docs.filter(d => seasonMatches(d.data())), empty: allSettings.docs.filter(d => seasonMatches(d.data())).length === 0 };


if (snapshot.empty) {

  settingsDocId = null;
  tournamentSettings = {
    format: "groups",
    groupCount: 2
  };

  return;
}


settingsDocId = snapshot.docs[0].id;
const data = snapshot.docs[0].data();

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

potState = {
  pot1Locked: data.pot1Locked === true,
  pot2Locked: data.pot2Locked === true,
  pot3Locked: data.pot3Locked === true,
  groupingLocked: data.groupingLocked === true
};

} catch (error) {

console.error(
  "Settings error:",
  error
);

}

}

// =====================================================
// POT / GROUP DRAW STATE
// =====================================================

async function loadPotState() {
  try {
    if (!settingsDocId) return;
    const snap = await getDoc(doc(db, "settings", settingsDocId));
    if (!snap.exists()) return;
    const data = snap.data();
    potState = {
      pot1Locked: data.pot1Locked === true,
      pot2Locked: data.pot2Locked === true,
      pot3Locked: data.pot3Locked === true,
      groupingLocked: data.groupingLocked === true
    };
  } catch (error) {
    console.error("Pot state error:", error);
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

if (potState.groupingLocked) {
  alert("🔒 Grouping tayari imefungwa. Huwezi kubadilisha group count.");
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

if (format === "groups" && players.length && groupCount * 3 > players.length) {
  alert("⚠️ Group count hii haiwezekani kwa " + players.length + " players kwa sababu Pot 1, Pot 2 na Pot 3 kila moja inahitaji angalau player mmoja kwa kila group.");
  return;
}

try {

const allSettings = await getDocs(collection(db, "settings"));
const snapshot = { docs: allSettings.docs.filter(d => seasonMatches(d.data())), empty: allSettings.docs.filter(d => seasonMatches(d.data())).length === 0 };


const data = {
  seasonId: activeSeasonId,
  seasonName: activeSeason?.name || "Season 1",

  format: format,
  groupCount: groupCount,
  pot1Locked: potState.pot1Locked,
  pot2Locked: potState.pot2Locked,
  pot3Locked: potState.pot3Locked,
  groupingLocked: potState.groupingLocked,
  updatedAt: serverTimestamp()

};


if (snapshot.empty) {

  const ref = await addDoc(
    collection(db, "settings"),
    data
  );
  settingsDocId = ref.id;

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
  if (tournamentSettings.format === "league") {
    return [{ name: "LEAGUE", shortName: "LEAGUE", players: [...players] }];
  }
  if (!potState.groupingLocked) return [];
  const count = Math.max(1, Number(tournamentSettings.groupCount || 2));
  return Array.from({length: count}, (_, i) => ({
    name: "GROUP " + groupLetter(i),
    shortName: groupLetter(i),
    players: players.filter(p => String(p.group || "") === groupLetter(i))
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
const groups = getGroups();
if (!groups.length) {
  if (description) description.textContent = "Groups zitatengenezwa baada ya admin kufanya draw kutoka kwenye pots.";
  grid.innerHTML = "<div class='loading'>⏳ Groups hazijageneratiwa bado.</div>";
  return;
}
if (description) description.textContent = groups.length + " groups • Draw completed";

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
  const container = document.getElementById("knockoutDynamic");
  if (!container) return;
  container.innerHTML = "";
  if (tournamentSettings.format !== "groups") {
    container.innerHTML = '<div class="loading">Knockout is available in GROUPS format.</div>';
    return;
  }
  if (!knockoutStages.length) {
    container.innerHTML = '<div class="loading">⏳ Knockout has not started yet. Admin will generate the correct round after the group stage.</div>';
    return;
  }
  knockoutStages.forEach(stage => {
    const stageMatches = getKnockoutMatches(stage.name);
    const round = document.createElement("div");
    round.className = "round" + (stage.name === "FINAL" ? " final-round" : "");
    round.innerHTML = `<h3>${stage.name === "FINAL" ? "🏆 FINAL" : escapeHTML(stage.name)}</h3>`;
    const body = document.createElement("div");
    const byTie = {};
    stageMatches.forEach(m => (byTie[m.tieId] ||= []).push(m));
    const ties = Object.values(byTie);
    if (!ties.length) body.innerHTML = '<div class="knockout-match"><span>WAITING FOR QUALIFIERS</span></div>';
    ties.forEach((tie, i) => {
      tie.sort((a,b) => Number(a.leg || 1) - Number(b.leg || 1));
      const first = tie[0], second = tie[1];
      const winner = knockoutTieWinner(tie);
      const card = document.createElement("div");
      card.className = "knockout-match";
      card.innerHTML = `<small>TIE ${i+1}</small><span>${escapeHTML(first?.homePlayer || "TBD")}</span><strong>VS</strong><span>${escapeHTML(first?.awayPlayer || "TBD")}</span><small>LEG 1: ${first?.played ? `${first.homeGoals} - ${first.awayGoals}` : "—"}</small>` +
        (second ? `<small>LEG 2: ${escapeHTML(second.homePlayer)} ${second.played ? `${second.homeGoals} - ${second.awayGoals}` : "—"} ${escapeHTML(second.awayPlayer)}</small>` : "<small>BYE</small>") +
        (winner ? `<strong>🏆 ${escapeHTML(winner)}</strong>` : "");
      body.appendChild(card);
    });
    round.appendChild(body); container.appendChild(round);
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
// GROUP STANDINGS + MATHEMATICAL QUALIFICATION
// =====================================================

function normalizePhone(value) { return String(value || "").replace(/[^0-9]/g, ""); }

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

const groups = getGroups();
if (!groups.length) {
  container.innerHTML = "<div class='loading'>⏳ Standings zitaonekana baada ya groups kugeneratiwa.</div>";
  return;
}

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
// POT MANAGEMENT / GROUP DRAW
// =====================================================

function setupPotManagement() {
  document.getElementById("drawGroupsFromPotsBtn")?.addEventListener("click", drawGroupsFromPots);
}

function potPlayers(pot) {
  return players.filter((p) => Number(p.pot) === pot);
}

function renderPotManagement() {
  const container = document.getElementById("potManagementContent");
  if (!container || !adminLoggedIn) return;

  const potNames = ["POT 1", "POT 2", "POT 3"];
  const locks = [potState.pot1Locked, potState.pot2Locked, potState.pot3Locked];

  container.innerHTML = `
    <div class="pot-summary">
      ${[1,2,3].map(p => `<div class="pot-summary-item"><strong>POT ${p}</strong><span>${potPlayers(p).length} players</span></div>`).join("")}
    </div>
    <div class="pot-grid">
      ${[1,2,3].map((pot) => {
        const list = potPlayers(pot);
        const locked = locks[pot - 1];
        return `
          <div class="pot-card ${locked ? "pot-locked" : ""}">
            <div class="pot-header"><h3>${potNames[pot-1]}</h3><span>${locked ? "🔒 LOCKED" : "🟢 OPEN"}</span></div>
            <div class="pot-count">${list.length} players</div>
            <div class="pot-player-list">
              ${players.map((player) => {
                const current = Number(player.pot) || 0;
                const disabled = current === pot ? locked : (potState["pot" + pot + "Locked"] || false);
                const label = escapeHTML(player.username || player.name || "PLAYER");
                return `<div class="pot-player-row">
                  <span><b>${String(player.teamNumber || "-").padStart(2,"0")}</b> ${label}</span>
                  <select data-pot-player="${player.id}" ${disabled ? "disabled" : ""}>
                    <option value="0" ${current===0 ? "selected" : ""}>Unassigned</option>
                    <option value="1" ${current===1 ? "selected" : ""}>Pot 1</option>
                    <option value="2" ${current===2 ? "selected" : ""}>Pot 2</option>
                    <option value="3" ${current===3 ? "selected" : ""}>Pot 3</option>
                  </select>
                </div>`;
              }).join("")}
            </div>
            <button type="button" class="primary-btn pot-lock-btn" data-lock-pot="${pot}" ${locked ? "disabled" : ""}>${locked ? "🔒 POT ${pot} LOCKED" : "🔒 LOCK POT ${pot}"}</button>
          </div>`;
      }).join("")}
    </div>
    <div class="pot-actions">
      <p class="pot-help">Assign every registered player to Pot 1, 2 or 3. Lock each pot when you are satisfied, then draw the groups.</p>
      <button type="button" class="primary-btn" id="drawGroupsFromPotsBtn" ${potState.groupingLocked ? "disabled" : ""}>🎲 DRAW GROUPS FROM POTS</button>
      ${potState.groupingLocked ? `<span class="draw-locked">🔒 GROUPS LOCKED</span>` : ""}
    </div>`;

  container.querySelectorAll("select[data-pot-player]").forEach((select) => {
    select.addEventListener("change", async () => {
      await assignPlayerPot(select.dataset.potPlayer, Number(select.value));
    });
  });

  container.querySelectorAll("[data-lock-pot]").forEach((button) => {
    button.addEventListener("click", () => lockPot(Number(button.dataset.lockPot)));
  });

  document.getElementById("drawGroupsFromPotsBtn")?.addEventListener("click", drawGroupsFromPots);
}

async function assignPlayerPot(playerId, pot) {
  if (!adminLoggedIn || potState.groupingLocked) return;
  if (pot < 0 || pot > 3) return;
  if (pot > 0 && potState["pot" + pot + "Locked"]) {
    alert("🔒 Pot hiyo imefungwa.");
    renderPotManagement();
    return;
  }
  const player = players.find((p) => p.id === playerId);
  if (!player) return;
  const current = Number(player.pot) || 0;
  if (current > 0 && potState["pot" + current + "Locked"] && current !== pot) {
    alert("🔒 Mchezaji wa pot iliyofungwa hawezi kuhamishwa.");
    renderPotManagement();
    return;
  }
  try {
    await updateDoc(doc(db, "registrations", playerId), { pot, updatedAt: serverTimestamp() });
    player.pot = pot;
    renderPotManagement();
  } catch (error) {
    console.error("Pot assignment error:", error);
    alert("❌ Failed to assign player to pot.");
  }
}

async function lockPot(pot) {
  if (!adminLoggedIn) return;
  if (pot < 1 || pot > 3) return;
  const count = potPlayers(pot).length;
  const groupCount = Number(tournamentSettings.groupCount || 2);
  if (count < groupCount) {
    alert(`⚠️ Pot ${pot} ina players ${count}, lakini una groups ${groupCount}. Weka angalau ${groupCount} players kwenye pot hii.`);
    return;
  }
  if (players.some((p) => !Number(p.pot))) {
    alert("⚠️ Assign players wote kwenye pots kwanza.");
    return;
  }
  potState["pot" + pot + "Locked"] = true;
  await savePotState();
  renderPotManagement();
}

async function savePotState() {
  try {
    const data = {
      seasonId: activeSeasonId,
      seasonName: activeSeason?.name || "Season 1",
      ...tournamentSettings,
      ...potState,
      updatedAt: serverTimestamp()
    };
    if (settingsDocId) {
      await updateDoc(doc(db, "settings", settingsDocId), data);
    } else {
      const ref = await addDoc(collection(db, "settings"), data);
      settingsDocId = ref.id;
    }
  } catch (error) {
    console.error("Save pot state error:", error);
    alert("❌ Failed to save pot state.");
  }
}

function shuffle(list) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

async function drawGroupsFromPots() {
  if (!adminLoggedIn) return;
  if (potState.groupingLocked) { alert("🔒 Grouping tayari imefungwa."); return; }
  if (tournamentSettings.format !== "groups") { alert("⚠️ Chagua GROUPS format kwanza."); return; }
  if (![1,2,3].every((p) => potState["pot" + p + "Locked"])) {
    alert("🔒 Funga Pot 1, Pot 2 na Pot 3 kwanza.");
    return;
  }
  if (players.some((p) => !Number(p.pot))) {
    alert("⚠️ Kila player lazima awe kwenye pot.");
    return;
  }

  const groupCount = Number(tournamentSettings.groupCount || 2);
  if (players.length < groupCount) { alert("⚠️ Players wachache kuliko groups."); return; }
  if (groupCount * 3 > players.length) { alert("⚠️ Group count hii haiwezi kugawa players kwenye Pot 1–3 kwa usawa. Punguza number ya groups."); return; }

  const confirmed = confirm(`🎲 Generate ${groupCount} groups kutoka Pot 1–3? Hii itafunga grouping.`);
  if (!confirmed) return;

  try {
    const groups = Array.from({ length: groupCount }, (_, i) => ({ shortName: groupLetter(i), players: [] }));
    const used = new Set();

    // First round: one player from every pot per group.
    for (const pot of [1,2,3]) {
      const pool = shuffle(potPlayers(pot));
      for (let i = 0; i < groupCount; i++) {
        const player = pool[i];
        if (!player) continue;
        groups[i].players.push(player);
        used.add(player.id);
      }
    }

    // Any remaining players are distributed fairly across groups.
    const remaining = shuffle(players.filter((p) => !used.has(p.id)));
    remaining.forEach((player, index) => {
      groups[index % groupCount].players.push(player);
    });

    for (const group of groups) {
      for (const player of group.players) {
        await updateDoc(doc(db, "registrations", player.id), { group: group.shortName, updatedAt: serverTimestamp() });
      }
    }

    potState.groupingLocked = true;
    await savePotState();
    await loadPlayers();
    renderGroups();
    renderKnockout();
    renderPotManagement();
    alert("🏆 Groups generated successfully and locked!");
  } catch (error) {
    console.error("Group draw error:", error);
    alert("❌ Failed to generate groups.");
  }
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
  alert("⚠️ Fixtures tayari zimetengenezwa kwa season hii. Huwezi kuzalisha duplicate fixtures.");
  return;
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

      await createMatch(matchNumber, "LEAGUE", players[i], players[j], current, 1);
      matchNumber++;
      current = new Date(current.getTime() + interval * 60000);
      await createMatch(matchNumber, "LEAGUE", players[j], players[i], current, 2);
      matchNumber++;
      current = new Date(current.getTime() + interval * 60000);

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

        await createMatch(matchNumber, group.shortName, group.players[i], group.players[j], current, 1);
      matchNumber++;
      current = new Date(current.getTime() + interval * 60000);
      await createMatch(matchNumber, group.shortName, group.players[j], group.players[i], current, 2);
      matchNumber++;
      current = new Date(current.getTime() + interval * 60000);

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
date,
leg = 1
) {

await addDoc(
collection(db, "matches"),
{

  matchNumber: matchNumber,
  seasonId: activeSeasonId,

  group: group,
  leg: leg,
  stage: "group",

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

matches.filter(match => match.stage !== "knockout").forEach((match, index) => {

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
// KNOCKOUT ADMIN + DYNAMIC ROUNDS
// =====================================================
function qualifiedPlayersFromGroups() {
  const groups = getGroups(); const qualifiers = [];
  groups.forEach(group => { const stats = buildGroupStats(group.players, group.shortName); if (stats[0]) qualifiers.push(stats[0].name); if (stats[1]) qualifiers.push(stats[1].name); });
  return qualifiers;
}
function pairKnockoutTeams(teams) { const pairs=[]; for(let i=0;i<teams.length;i+=2) if(teams[i]&&teams[i+1]) pairs.push([teams[i],teams[i+1]]); return pairs; }
async function generateNextKnockoutRound() {
  if (!adminLoggedIn) return alert("🔐 Admin login kwanza.");
  if (tournamentSettings.format !== "groups") return alert("⚠️ Tumia GROUPS format.");
  if (!potState.groupingLocked) return alert("⚠️ Generate groups kwanza.");

  const last = currentKnockoutStage();
  let teams = [];
  let firstKnockoutDraw = false;

  if (!last) {
    const groups = getGroups();
    if (!groups.length || groups.some(g => g.players.length < 2)) return alert("⚠️ Groups bado hazijakamilika.");
    const groupMatches = matches.filter(m => m.stage !== "knockout");
    if (groupMatches.length && !groupMatches.every(m => m.played)) return alert("⚠️ Maliza group stage kwanza.");

    // Seed the first knockout round by group positions: A1 vs B2, A2 vs B1, etc.
    const qualifiedByGroup = groups.map(g => {
      const st = buildGroupStats(g.players, g.shortName);
      return { group: g.shortName, first: st[0]?.name || null, second: st[1]?.name || null };
    });
    const seeded = [];
    for (let i = 0; i < qualifiedByGroup.length; i += 2) {
      const left = qualifiedByGroup[i];
      const right = qualifiedByGroup[i + 1];
      if (left && right) {
        if (left.first) seeded.push(left.first);
        if (right.second) seeded.push(right.second);
        if (left.second) seeded.push(left.second);
        if (right.first) seeded.push(right.first);
      } else if (left) {
        if (left.first) seeded.push(left.first);
        if (left.second) seeded.push(left.second);
      }
    }
    teams = seeded;
    firstKnockoutDraw = true;
  } else {
    if (!stageIsComplete(last.name)) return alert("⚠️ Maliza matokeo yote ya " + last.name + " kwanza.");
    const ties = {};
    getKnockoutMatches(last.name).forEach(m => (ties[m.tieId] ||= []).push(m));
    const unresolvedDraw = Object.values(ties).find(t => !knockoutTieWinner(t));
    if (unresolvedDraw) return alert("⚠️ Kuna tie iliyo draw kwa aggregate. Chagua mshindi wa tie kwanza.");
    Object.values(ties).forEach(t => {
      const w = knockoutTieWinner(t);
      if (!w) {
        throw new Error("DRAW_TIE_NEEDS_WINNER");
      }
      teams.push(w);
    });
    if (Array.isArray(last.byeTeams)) teams.push(...last.byeTeams);
  }

  teams = [...new Set(teams)];
  if (teams.length === 1) { await announceChampion(teams[0]); return; }
  if (teams.length < 2) return alert("⚠️ Hakuna qualifiers wa kutosha.");

  // If the field is not already a power of two, create a PLAY-IN ROUND.
  // Only enough matches are created to reduce the field to the next lower
  // power of two; the remaining teams receive BYEs.
  const exactPower = (teams.length & (teams.length - 1)) === 0;
  const targetSize = exactPower ? teams.length : Math.pow(2, Math.floor(Math.log2(teams.length)));
  const roundName = exactPower ? knockoutRoundName(targetSize) : "PLAY-IN ROUND";

  if (knockoutStages.some(st => st.name === roundName)) return alert("⚠️ " + roundName + " tayari imegenerate.");

  // Do not randomize the first knockout round; preserve the seeded group order.
  const matchesNeeded = exactPower ? targetSize / 2 : teams.length - targetSize;
  const playingTeamsCount = matchesNeeded * 2;
  const byeCount = teams.length - playingTeamsCount;
  const byeTeams = teams.slice(playingTeamsCount);
  const playable = teams.slice(0, playingTeamsCount);
  const pairs = pairKnockoutTeams(playable);

  const stageRef = await addDoc(collection(db, "knockoutStages"), {
    seasonId: activeSeasonId,
    name: roundName,
    order: knockoutStages.length + 1,
    teamCount: teams.length,
    targetSize,
    bracketSize: targetSize,
    byeTeams,
    createdAt: serverTimestamp()
  });

  let n = Math.max(0, ...matches.map(m => Number(m.matchNumber || 0))) + 1;
  for (let i = 0; i < pairs.length; i++) {
    const [a, b] = pairs[i];
    const tieId = stageRef.id + "_TIE_" + (i + 1);
    await addDoc(collection(db, "matches"), {
      seasonId: activeSeasonId, stage: "knockout", round: roundName, tieId,
      leg: 1, homePlayer: a, awayPlayer: b, group: roundName,
      matchNumber: n++, played: false, createdAt: serverTimestamp()
    });
    await addDoc(collection(db, "matches"), {
      seasonId: activeSeasonId, stage: "knockout", round: roundName, tieId,
      leg: 2, homePlayer: b, awayPlayer: a, group: roundName,
      matchNumber: n++, played: false, createdAt: serverTimestamp()
    });
  }

  alert("✅ " + roundName + " generated. " + byeTeams.length + " BYE(s), " + pairs.length + " two-leg ties.");
  await loadLeague();
}

function loadAdminKnockoutMatches(){
  const c=document.getElementById("adminKnockoutMatches"); if(!c)return; c.innerHTML="";
  if(!knockoutStages.length){c.innerHTML='<div class="loading">⏳ Waiting for teams to qualify. Knockout results will appear here immediately after qualification.</div>';return;}
  knockoutStages.forEach(stage=>{
    const ms=getKnockoutMatches(stage.name), title=document.createElement("h3"); title.className="knockout-stage-title"; title.textContent=stage.name; c.appendChild(title);
    const ties={}; ms.forEach(m=>(ties[m.tieId] ||= []).push(m));
    Object.values(ties).forEach((tie,idx)=>{
      tie.sort((a,b)=>Number(a.leg)-Number(b.leg));
      const card=document.createElement("div"); card.className="knockout-admin-match";
      const teams=[...new Set(tie.flatMap(m=>[m.homePlayer,m.awayPlayer]))];
      const aggregate = tie.every(m=>m.played) ? tie.reduce((x,m)=>x+Number(m.homeGoals||0),0) - tie.reduce((x,m)=>x+Number(m.awayGoals||0),0) : null;
      const needsWinner = aggregate === 0 && !tie.some(m=>m.tieWinner);
      card.innerHTML=`<h3>Tie ${idx+1}: ${escapeHTML(tie[0].homePlayer)} VS ${escapeHTML(tie[0].awayPlayer)}</h3>`+
        tie.map(m=>`<div class="leg-title">LEG ${m.leg}: ${escapeHTML(m.homePlayer)} VS ${escapeHTML(m.awayPlayer)}</div><div class="score-box"><div><label>${escapeHTML(m.homePlayer)}</label><input type="number" min="0" id="ko-home-${m.id}" value="${m.played?m.homeGoals:""}"></div><strong>VS</strong><div><label>${escapeHTML(m.awayPlayer)}</label><input type="number" min="0" id="ko-away-${m.id}" value="${m.played?m.awayGoals:""}"></div></div><button type="button" class="primary-btn" data-ko-save="${m.id}">💾 SAVE LEG ${m.leg}</button>`).join("")+
        (needsWinner ? `<div class="tie-winner-box"><label>AGGREGATE DRAW — SELECT WINNER</label><select id="tie-winner-${escapeHTML(tie[0].tieId)}"><option value="">Select winner</option>${teams.map(t=>`<option value="${escapeHTML(t)}">${escapeHTML(t)}</option>`).join("")}</select><button type="button" class="primary-btn" data-tie-winner="${escapeHTML(tie[0].tieId)}">🏆 SAVE TIE WINNER</button></div>` : "");
      card.querySelectorAll("[data-ko-save]").forEach(btn=>btn.addEventListener("click",()=>saveKnockoutResult(btn.dataset.koSave)));
      card.querySelector("[data-tie-winner]")?.addEventListener("click",()=>saveKnockoutTieWinner(card.querySelector("[data-tie-winner]").dataset.tieWinner));
      c.appendChild(card);
    });
  });
  const last = currentKnockoutStage();
  if (last && stageIsComplete(last.name)) {
    const btn=document.createElement("button"); btn.type="button"; btn.className="primary-btn"; btn.textContent="➡️ GENERATE NEXT ROUND";
    btn.addEventListener("click", generateNextKnockoutRound); c.appendChild(btn);
  }
}

async function saveKnockoutTieWinner(tieId){
  if(!adminLoggedIn)return alert("🔐 Admin login kwanza.");
  const select=document.getElementById("tie-winner-"+tieId); const winner=select?.value;
  if(!winner)return alert("⚠️ Chagua mshindi wa tie.");
  const tie=getKnockoutMatches(currentKnockoutStage()?.name).filter(m=>m.tieId===tieId);
  if(!tie.length || tie.some(m=>!m.played)) return alert("⚠️ Weka results za legs zote kwanza.");
  await Promise.all(tie.map(m=>updateDoc(doc(db,"matches",m.id),{tieWinner:winner,updatedAt:serverTimestamp()})));
  await loadLeague();
  if (currentKnockoutStage()?.name === "FINAL") {
    await announceChampion(winner);
  } else {
    alert("🏆 Tie winner saved: "+winner);
  }
}

async function saveKnockoutResult(id){
  if(!adminLoggedIn)return alert("🔐 Admin login kwanza.");
  const h=document.getElementById("ko-home-"+id)?.value,a=document.getElementById("ko-away-"+id)?.value;
  if(h===""||a==="")return alert("⚠️ Weka goals zote mbili.");
  await updateDoc(doc(db,"matches",id),{homeGoals:Number(h),awayGoals:Number(a),played:true,updatedAt:serverTimestamp()});
  await loadLeague();
  const last=currentKnockoutStage();
  if(last && stageIsComplete(last.name) && last.name === "FINAL"){
    const ties={}; getKnockoutMatches("FINAL").forEach(m=>(ties[m.tieId] ||= []).push(m));
    const winner=Object.values(ties).map(t=>knockoutTieWinner(t))[0];
    if(winner){ await announceChampion(winner); }
  }
  alert("✅ Knockout result saved!");
}
function setupKnockoutAdmin(){document.getElementById("generateKnockoutBtn")?.addEventListener("click",generateNextKnockoutRound);}

// =====================================================
// HALL OF FAME
// =====================================================
async function loadHallOfFame(){try{const snap=await getDocs(collection(db,"hallOfFame"));hallOfFame=snap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>Number(b.year||0)-Number(a.year||0));}catch(e){console.error("Hall of Fame load error",e);hallOfFame=[];}}
function renderHallOfFame(){const c=document.getElementById("hallOfFameContainer");if(!c)return;c.innerHTML=hallOfFame.length?hallOfFame.map(w=>`<div class="hall-card"><div class="hall-trophy">🏆</div><div><strong>${escapeHTML(w.winner||"CHAMPION")}</strong><span>${escapeHTML(w.edition||"Don Bosco eFootball League")}</span><small>${escapeHTML(w.year||"")}</small></div></div>`).join(""):'<div class="loading">No champions recorded yet.</div>';}
function setupHallOfFameAdmin(){document.getElementById("addHallWinnerBtn")?.addEventListener("click",addHallWinner);}
async function addHallWinner(){if(!adminLoggedIn)return alert("🔐 Admin login kwanza.");const edition=document.getElementById("hallEdition")?.value.trim(),winner=document.getElementById("hallWinner")?.value.trim(),year=document.getElementById("hallYear")?.value.trim();if(!edition||!winner||!year)return alert("⚠️ Jaza edition, champion na year.");await addDoc(collection(db,"hallOfFame"),{edition,winner,year:Number(year),seasonId:activeSeasonId,seasonName:activeSeason?.name || "Season 1",createdAt:serverTimestamp()});document.getElementById("hallEdition").value="";document.getElementById("hallWinner").value="";document.getElementById("hallYear").value="";await loadHallOfFame();renderHallOfFame();renderAdminHallOfFame();alert("🏆 Champion added to Hall of Fame.");}
function renderAdminHallOfFame(){const c=document.getElementById("adminHallOfFame");if(!c)return;c.innerHTML=hallOfFame.map(w=>`<div class="admin-hall-row"><strong>${escapeHTML(w.edition)}</strong><span>🏆 ${escapeHTML(w.winner)} (${escapeHTML(w.year)})</span></div>`).join("")||'<div class="loading">No champions yet.</div>';}
async function announceChampion(winner){
  if (!adminLoggedIn || !activeSeason) return;
  try {
    const current = seasons.find(s => s.id === activeSeasonId);
    if (current?.status !== "COMPLETED") {
      await updateDoc(doc(db, "seasons", activeSeasonId), {
        status: "COMPLETED",
        champion: winner,
        completedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      current.status = "COMPLETED";
      current.champion = winner;
    }

    const tournamentSnap = await getDocs(collection(db, "tournament"));
    for (const item of tournamentSnap.docs.filter(d => seasonMatches(d.data()))) {
      await updateDoc(doc(db, "tournament", item.id), { status: "completed", completedAt: serverTimestamp(), champion: winner });
    }

    // Automatically preserve the champion in the historical Hall of Fame.
    if (!hallOfFame.some(w => w.seasonId === activeSeasonId)) {
      await addDoc(collection(db, "hallOfFame"), {
        edition: activeSeason.name || ("Season " + activeSeason.number),
        winner,
        year: new Date().getFullYear(),
        seasonId: activeSeasonId,
        seasonName: activeSeason.name || ("Season " + activeSeason.number),
        createdAt: serverTimestamp()
      });
    }

    // Prepare the next season as UPCOMING so the league can continue immediately.
    const nextNumber = seasons.reduce((max, s) => Math.max(max, Number(s.number || 0)), 0) + 1;
    if (!seasons.some(s => Number(s.number) === nextNumber)) {
      const ref = await addDoc(collection(db, "seasons"), {
        number: nextNumber,
        name: "Season " + nextNumber,
        status: "UPCOMING",
        createdAt: serverTimestamp()
      });
      seasons.push({ id: ref.id, number: nextNumber, name: "Season " + nextNumber, status: "UPCOMING" });
    }

    await loadHallOfFame();
    renderHallOfFame();
    renderSeasonManager();
    alert("🏆 TOURNAMENT CHAMPION: " + winner + "\nSeason " + activeSeason.number + " is now COMPLETED. Season " + nextNumber + " is ready as UPCOMING.");
  } catch (error) {
    console.error("Complete season error:", error);
    alert("🏆 Champion: " + winner + "\n⚠️ Champion was decided, but season archiving failed. Check Firebase.");
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
    seasonId: activeSeasonId,
    seasonName: activeSeason?.name || "Season 1",

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
  snapshot.docs.filter(item => seasonMatches(item.data())).some(
    (item) => item.data().status === "started"
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