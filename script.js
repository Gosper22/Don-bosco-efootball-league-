// ======================================================
// DON BOSCO eFOOTBALL LEAGUE
// FULL LEAGUE SCRIPT - GROUPS A TO H
// ======================================================

import { initializeApp } from
  "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";

import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  updateDoc,
  doc,
  serverTimestamp
} from
  "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";


// ======================================================
// FIREBASE
// ======================================================

const firebaseConfig = {

  apiKey:
    "AIzaSyDCjPMCRUSjPezL2WBfgLI5a-xGknsfrpo",

  authDomain:
    "don-bosco-efootball-league.firebaseapp.com",

  projectId:
    "don-bosco-efootball-league",

  storageBucket:
    "don-bosco-efootball-league.firebasestorage.app",

  messagingSenderId:
    "935312157026",

  appId:
    "1:935312157026:web:5f7e6cfbd615331538e43b"

};


const app =
  initializeApp(firebaseConfig);

const db =
  getFirestore(app);


// ======================================================
// GLOBAL DATA
// ======================================================

let players = [];

let matches = [];

let tournamentStarted = false;


// ======================================================
// GROUPS
// ======================================================

const groupLetters = [
  "A",
  "B",
  "C",
  "D",
  "E",
  "F",
  "G",
  "H"
];


// ======================================================
// 4 PLAYERS = 6 MATCHES
// ======================================================

const fixturePairs = [

  [0, 1],
  [0, 2],
  [0, 3],
  [1, 2],
  [1, 3],
  [2, 3]

];


// ======================================================
// PAGE LOADED
// ======================================================

document.addEventListener(
  "DOMContentLoaded",
  async function () {

    setupRegisterButtons();

    setupRegistration();

    setupAdmin();

    setupTournamentControl();

    await loadLeague();

  }
);


// ======================================================
// REGISTER BUTTONS
// ======================================================

function setupRegisterButtons() {

  const buttons = [

    document.getElementById(
      "registerBtn"
    ),

    document.getElementById(
      "heroRegisterBtn"
    )

  ];


  buttons.forEach(
    function (button) {

      if (!button) return;


      button.addEventListener(
        "click",
        function () {

          const section =
            document.getElementById(
              "register"
            );


          if (!section) return;


          section.style.display =
            "block";


          section.scrollIntoView({

            behavior:
              "smooth",

            block:
              "start"

          });

        }
      );

    }
  );

}


// ======================================================
// REGISTRATION
// ======================================================

function setupRegistration() {

  const form =
    document.getElementById(
      "registerForm"
    );

  const submit =
    document.getElementById(
      "submitBtn"
    );

  const message =
    document.getElementById(
      "message"
    );


  if (!form) return;


  form.addEventListener(
    "submit",
    async function (event) {

      event.preventDefault();


      const name =
        document.getElementById(
          "name"
        )?.value.trim();


      const phone =
        document.getElementById(
          "phone"
        )?.value.trim();


      const username =
        document.getElementById(
          "username"
        )?.value.trim();


      if (
        !name ||
        !phone ||
        !username
      ) {

        message.textContent =
          "⚠️ Tafadhali jaza taarifa zote.";

        message.className =
          "message error";

        return;

      }


      if (tournamentStarted) {

        message.textContent =
          "🔒 Tournament tayari imeanza. Registration imefungwa.";

        message.className =
          "message error";

        return;

      }


      if (players.length >= 32) {

        message.textContent =
          "🚫 League is FULL! Players 32 tayari wamejisajili.";

        message.className =
          "message error";

        return;

      }


      submit.disabled =
        true;

      submit.innerHTML =
        "<span>CHECKING...</span>";


      try {

        const snapshot =
          await getDocs(
            collection(
              db,
              "registrations"
            )
          );


        const registered =
          snapshot.docs.map(
            function (item) {

              return item.data();

            }
          );


        if (
          registered.length >= 32
        ) {

          message.textContent =
            "🚫 League is FULL! Players 32 tayari wamejisajili.";

          message.className =
            "message error";

          resetSubmit(submit);

          return;

        }


        const duplicate =
          registered.some(
            function (player) {

              return (

                String(
                  player.username || ""
                ).toLowerCase() ===

                username.toLowerCase()

              );

            }
          );


        if (duplicate) {

          message.textContent =
            "❌ Username hiyo tayari imesajiliwa.";

          message.className =
            "message error";

          resetSubmit(submit);

          return;

        }


        const playerNumber =
          registered.length + 1;


        await addDoc(
          collection(
            db,
            "registrations"
          ),
          {

            name:
              name,

            phone:
              phone,

            username:
              username,

            playerNumber:
              playerNumber,

            createdAt:
              serverTimestamp()

          }
        );


        message.textContent =
          `🎉 Registration successful! Player ${playerNumber} of 32.`;

        message.className =
          "message success";


        form.reset();


        resetSubmit(
          submit
        );


        await loadLeague();

      }

      catch (error) {

        console.error(
          "Registration error:",
          error
        );


        message.textContent =
          "❌ Registration failed. Please try again.";

        message.className =
          "message error";


        resetSubmit(
          submit
        );

      }

    }
  );

}


// ======================================================
// RESET SUBMIT
// ======================================================

function resetSubmit(button) {

  if (!button) return;


  button.disabled =
    false;


  button.innerHTML =
    "<span>REGISTER PLAYER</span><span>→</span>";

}


// ======================================================
// LOAD EVERYTHING
// ======================================================

async function loadLeague() {

  try {

    await loadPlayers();

    await loadMatches();

    await loadTournamentStatus();

    createGroups();

    createAllFixtures();

    createAllStandings();

    loadAdminFixtures();

    updateTournamentStatus();

  }

  catch (error) {

    console.error(
      "League loading error:",
      error
    );

  }

}


// ======================================================
// LOAD PLAYERS
// ======================================================

async function loadPlayers() {

  const snapshot =
    await getDocs(
      collection(
        db,
        "registrations"
      )
    );


  players =
    snapshot.docs.map(
      function (item) {

        return {

          id:
            item.id,

          ...item.data()

        };

      }
    );


  players.sort(
    function (a, b) {

      return (

        (a.playerNumber || 999) -
        (b.playerNumber || 999)

      );

    }
  );

}


// ======================================================
// LOAD MATCHES
// ======================================================

async function loadMatches() {

  const snapshot =
    await getDocs(
      collection(
        db,
        "matches"
      )
    );


  matches =
    snapshot.docs.map(
      function (item) {

        return {

          id:
            item.id,

          ...item.data()

        };

      }
    );


  matches.sort(
    function (a, b) {

      return (
        (a.matchNumber || 9999) -
        (b.matchNumber || 9999)
      );

    }
  );

}


// ======================================================
// TOURNAMENT STATUS
// ======================================================

async function loadTournamentStatus() {

  try {

    const snapshot =
      await getDocs(
        collection(
          db,
          "tournament"
        )
      );


    tournamentStarted =
      snapshot.docs.some(
        function (item) {

          return (
            item.data().status ===
            "started"
          );

        }
      );

  }

  catch (error) {

    console.error(
      "Tournament status error:",
      error
    );

    tournamentStarted =
      false;

  }

}


// ======================================================
// CREATE GROUPS
// ======================================================

function createGroups() {

  const grid =
    document.getElementById(
      "groupsGrid"
    );


  if (!grid) return;


  grid.innerHTML =
    "";


  groupLetters.forEach(
    function (
      letter,
      groupIndex
    ) {

      const card =
        document.createElement(
          "div"
        );


      card.className =
        "group-card";


      card.innerHTML = `

        <div class="group-title">

          <span>GROUP</span>

          <strong>
            ${letter}
          </strong>

        </div>

      `;


      for (
        let i = 0;
        i < 4;
        i++
      ) {

        const player =
          players[
            groupIndex * 4 + i
          ];


        const row =
          document.createElement(
            "div"
          );


        row.className =
          "group-player";


        const playerName =
          player
            ? (
                player.username ||
                player.name
              )
            : "Waiting...";


        row.innerHTML = `

          <span>
            ${String(
              i + 1
            ).padStart(2, "0")}
          </span>

          <strong>
            ${escapeHTML(playerName)}
          </strong>

        `;


        card.appendChild(
          row
        );

      }


      grid.appendChild(
        card
      );

    }
  );

}


// ======================================================
// ALL FIXTURES PUBLIC
// ======================================================

function createAllFixtures() {

  const container =
    document.getElementById(
      "fixturesGrid"
    );


  if (!container) return;


  container.innerHTML =
    "";


  groupLetters.forEach(
    function (
      letter,
      groupIndex
    ) {

      const groupPlayers =
        players.slice(
          groupIndex * 4,
          groupIndex * 4 + 4
        );


      const section =
        document.createElement(
          "div"
        );


      section.className =
        "group-fixtures";


      section.innerHTML = `

        <div class="section-heading">

          <span>GROUP ${letter}</span>

          <h2>
            GROUP
            <strong>${letter} FIXTURES</strong>
          </h2>

        </div>

      `;


      const list =
        document.createElement(
          "div"
        );


      list.className =
        "fixtures-container";


      if (
        groupPlayers.length < 4
      ) {

        list.innerHTML = `

          <div class="groups-loading">

            ⏳ Waiting for 4 players...

          </div>

        `;


        section.appendChild(
          list
        );


        container.appendChild(
          section
        );


        return;

      }


      fixturePairs.forEach(
        function (
          pair
        ) {

          const home =
            groupPlayers[
              pair[0]
            ];


          const away =
            groupPlayers[
              pair[1]
            ];


          const homeName =
            home.username ||
            home.name;


          const awayName =
            away.username ||
            away.name;


          const match =
            findMatch(
              letter,
              homeName,
              awayName
            );


          const fixture =
            document.createElement(
              "div"
            );


          fixture.className =
            "fixture";


          fixture.innerHTML = `

            <div class="fixture-players">

              <strong>
                ${escapeHTML(homeName)}
              </strong>

              <span>
                VS
              </span>

              <strong>
                ${escapeHTML(awayName)}
              </strong>

            </div>

            <div class="match-schedule">

              📅
              ${
                match?.date ||
                "Schedule pending"
              }

              &nbsp;&nbsp;

              ⏰
              ${
                match?.time ||
                "--:--"
              }

            </div>

            <div class="match-status">

              ${
                match?.played === true
                  ? `${match.homeGoals} - ${match.awayGoals}`
                  : "UPCOMING"
              }

            </div>

          `;


          list.appendChild(
            fixture
          );

        }
      );


      section.appendChild(
        list
      );


      container.appendChild(
        section
      );

    }
  );

}


// ======================================================
// FIND MATCH
// ======================================================

function findMatch(
  group,
  home,
  away
) {

  return matches.find(
    function (match) {

      return (

        match.group === group &&

        match.homePlayer === home &&

        match.awayPlayer === away

      );

    }
  );

}


// ======================================================
// ALL STANDINGS
// ======================================================

function createAllStandings() {

  const container =
    document.getElementById(
      "standingsGrid"
    );


  if (!container) return;


  container.innerHTML =
    "";


  groupLetters.forEach(
    function (letter) {

      const section =
        document.createElement(
          "div"
        );


      section.className =
        "group-standing";


      section.innerHTML = `

        <div class="section-heading">

          <span>GROUP ${letter}</span>

          <h2>
            GROUP
            <strong>${letter}</strong>
          </h2>

        </div>

        <div class="table-wrapper">

          <table class="standings-table">

            <thead>

              <tr>

                <th>#</th>
                <th>PLAYER</th>
                <th>P</th>
                <th>W</th>
                <th>D</th>
                <th>L</th>
                <th>GF</th>
                <th>GA</th>
                <th>GD</th>
                <th>PTS</th>

              </tr>

            </thead>

            <tbody
              id="table-${letter}"
            >

            </tbody>

          </table>

        </div>

      `;


      container.appendChild(
        section
      );


      createGroupStanding(
        letter
      );

    }
  );

}


// ======================================================
// ONE GROUP STANDING
// ======================================================

function createGroupStanding(
  groupLetter
) {

  const table =
    document.getElementById(
      `table-${groupLetter}`
    );


  if (!table) return;


  const groupIndex =
    groupLetters.indexOf(
      groupLetter
    );


  const groupPlayers =
    players.slice(
      groupIndex * 4,
      groupIndex * 4 + 4
    );


  const stats = {};


  groupPlayers.forEach(
    function (player) {

      const name =
        player.username ||
        player.name;


      stats[name] = {

        name:
          name,

        P: 0,

        W: 0,

        D: 0,

        L: 0,

        GF: 0,

        GA: 0,

        GD: 0,

        PTS: 0

      };

    }
  );


  matches.forEach(
    function (match) {

      if (
        match.group !==
        groupLetter
      ) {

        return;

      }


      if (
        match.played !== true
      ) {

        return;

      }


      const home =
        stats[
          match.homePlayer
        ];


      const away =
        stats[
          match.awayPlayer
        ];


      if (
        !home ||
        !away
      ) {

        return;

      }


      const hg =
        Number(
          match.homeGoals
        );


      const ag =
        Number(
          match.awayGoals
        );


      home.P++;
      away.P++;


      home.GF += hg;
      home.GA += ag;


      away.GF += ag;
      away.GA += hg;


      if (
        hg > ag
      ) {

        home.W++;

        home.PTS += 3;

        away.L++;

      }

      else if (
        hg < ag
      ) {

        away.W++;

        away.PTS += 3;

        home.L++;

      }

      else {

        home.D++;
        away.D++;

        home.PTS++;
        away.PTS++;

      }

    }
  );


  Object.values(stats)
    .forEach(
      function (player) {

        player.GD =
          player.GF -
          player.GA;

      }
    );


  const sorted =
    Object.values(stats)
      .sort(
        function (a, b) {

          if (
            b.PTS !== a.PTS
          ) {

            return (
              b.PTS -
              a.PTS
            );

          }


          if (
            b.GD !== a.GD
          ) {

            return (
              b.GD -
              a.GD
            );

          }


          return (
            b.GF -
            a.GF
          );

        }
      );


  table.innerHTML =
    "";


  if (
    sorted.length === 0
  ) {

    table.innerHTML = `

      <tr>

        <td colspan="10">
          Waiting for players...
        </td>

      </tr>

    `;

    return;

  }


  sorted.forEach(
    function (
      player,
      index
    ) {

      const row =
        document.createElement(
          "tr"
        );


      row.innerHTML = `

        <td>
          ${index + 1}
        </td>

        <td>
          ${escapeHTML(player.name)}
        </td>

        <td>
          ${player.P}
        </td>

        <td>
          ${player.W}
        </td>

        <td>
          ${player.D}
        </td>

        <td>
          ${player.L}
        </td>

        <td>
          ${player.GF}
        </td>

        <td>
          ${player.GA}
        </td>

        <td>
          ${
            player.GD >= 0
              ? "+" + player.GD
              : player.GD
          }
        </td>

        <td>
          <strong>
            ${player.PTS}
          </strong>
        </td>

      `;


      table.appendChild(
        row
      );

    }
  );

}


// ======================================================
// ADMIN LOGIN
// ======================================================

function setupAdmin() {

  const loginBtn =
    document.getElementById(
      "adminLoginBtn"
    );


  const password =
    document.getElementById(
      "adminPassword"
    );


  const panel =
    document.getElementById(
      "adminPanel"
    );


  if (
    !loginBtn ||
    !password ||
    !panel
  ) {

    return;

  }


  loginBtn.addEventListener(
    "click",
    function () {

      if (
        password.value ===
        "Gosper2026"
      ) {

        panel.style.display =
          "block";


        password.value =
          "";


        loginBtn.textContent =
          "ADMIN LOGGED IN";


        loadAdminFixtures();

        updateTournamentStatus();

      }

      else {

        alert(
          "❌ Wrong admin password."
        );

      }

    }
  );

}


// ======================================================
// TOURNAMENT CONTROL
// ======================================================

function setupTournamentControl() {

  const generateBtn =
    document.getElementById(
      "generateFixturesBtn"
    );


  const startBtn =
    document.getElementById(
      "startTournamentBtn"
    );


  if (generateBtn) {

    generateBtn.addEventListener(
      "click",
      generateFullFixtures
    );

  }


  if (startBtn) {

    startBtn.addEventListener(
      "click",
      startTournament
    );

  }

}


// ======================================================
// TOURNAMENT STATUS
// ======================================================

function updateTournamentStatus() {

  const status =
    document.getElementById(
      "tournamentStatus"
    );


  const counter =
    document.getElementById(
      "playerCounter"
    );


  const generateBtn =
    document.getElementById(
      "generateFixturesBtn"
    );


  const startBtn =
    document.getElementById(
      "startTournamentBtn"
    );


  const management =
    document.getElementById(
      "adminMatches"
    );


  const notice =
    document.getElementById(
      "matchManagementNotice"
    );


  if (counter) {

    counter.textContent =
      `Players: ${players.length} / 32`;

  }


  if (
    players.length < 32
  ) {

    if (status) {

      status.textContent =
        `🟡 WAITING FOR PLAYERS — ${players.length}/32`;

    }


    if (generateBtn) {

      generateBtn.disabled =
        true;

    }


    if (startBtn) {

      startBtn.disabled =
        true;

    }


    if (notice) {

      notice.textContent =
        "🔒 Match Management itafunguka baada ya players kufika 32.";

    }


    if (management) {

      management.style.opacity =
        "0.6";

    }


    return;

  }


  if (
    tournamentStarted
  ) {

    if (status) {

      status.textContent =
        "🟢 TOURNAMENT STARTED";

    }


    if (generateBtn) {

      generateBtn.disabled =
        true;

    }


    if (startBtn) {

      startBtn.disabled =
        true;

    }


    if (notice) {

      notice.textContent =
        "🏆 Tournament imeanza.";

    }


    if (management) {

      management.style.opacity =
        "1";

    }


    return;

  }


  if (status) {

    status.textContent =
      matches.length > 0
        ? "🔵 READY — 32/32 PLAYERS"
        : "🟢 32/32 PLAYERS — GENERATE FIXTURES";

  }


  if (generateBtn) {

    generateBtn.disabled =
      false;

  }


  if (startBtn) {

    startBtn.disabled =
      matches.length === 0;

  }


  if (notice) {

    notice.textContent =
      matches.length > 0
        ? "✅ Match Management iko tayari."
        : "⚙️ Generate fixtures kwanza.";

  }


  if (management) {

    management.style.opacity =
      "1";

  }

}


// ======================================================
// GENERATE ALL 48 FIXTURES
// ======================================================

async function generateFullFixtures() {

  if (
    players.length < 32
  ) {

    alert(
      "⏳ Players bado hawajafika 32."
    );

    return;

  }


  const dateInput =
    document.getElementById(
      "fixtureStartDate"
    );


  const timeInput =
    document.getElementById(
      "fixtureStartTime"
    );


  const intervalInput =
    document.getElementById(
      "fixtureInterval"
    );


  const startDate =
    dateInput?.value;


  const startTime =
    timeInput?.value;


  const interval =
    Number(
      intervalInput?.value || 120
    );


  if (
    !startDate ||
    !startTime
  ) {

    alert(
      "⚠️ Weka tarehe na muda wa kuanzia."
    );

    return;

  }


  if (
    matches.length > 0
  ) {

    const proceed =
      confirm(
        "⚠️ Fixtures tayari zipo. Unataka kuziregenerate?"
      );


    if (!proceed) return;

  }


  try {

    const current =
      new Date(
        `${startDate}T${startTime}:00`
      );


    let matchNumber =
      1;


    for (
      let g = 0;
      g < 8;
      g++
    ) {

      const groupPlayers =
        players.slice(
          g * 4,
          g * 4 + 4
        );


      for (
        let i = 0;
        i < fixturePairs.length;
        i++
      ) {

        const pair =
          fixturePairs[i];


        const home =
          groupPlayers[
            pair[0]
          ];


        const away =
          groupPlayers[
            pair[1]
          ];


        if (
          !home ||
          !away
        ) {

          continue;

        }


        await addDoc(
          collection(
            db,
            "matches"
          ),
          {

            matchNumber:
              matchNumber,

            group:
              groupLetters[g],

            homePlayer:
              home.username ||
              home.name,

            awayPlayer:
              away.username ||
              away.name,

            date:
              formatDate(
                current
              ),

            time:
              formatTime(
                current
              ),

            homeGoals:
              null,

            awayGoals:
              null,

            played:
              false,

            createdAt:
              serverTimestamp()

          }
        );


        matchNumber++;


        current.setTime(
          current.getTime() +
          interval * 60000
        );

      }

    }


    alert(
      "✅ Fixtures zote 48 zimetengenezwa."
    );


    await loadLeague();

  }

  catch (error) {

    console.error(
      "Generate fixtures error:",
      error
    );


    alert(
      "❌ Imeshindikana kutengeneza fixtures."
    );

  }

}


// ======================================================
// START TOURNAMENT
// ======================================================

async function startTournament() {

  if (
    players.length < 32
  ) {

    alert(
      "⚠️ Subiri players wafike 32."
    );

    return;

  }


  if (
    matches.length < 48
  ) {

    alert(
      "⚠️ Generate fixtures zote 48 kwanza."
    );

    return;

  }


  const confirmStart =
    confirm(
      "🏆 Una uhakika unataka START TOURNAMENT?"
    );


  if (!confirmStart) return;


  try {

    await addDoc(
      collection(
        db,
        "tournament"
      ),
      {

        status:
          "started",

        playerCount:
          players.length,

        startedAt:
          serverTimestamp()

      }
    );


    tournamentStarted =
      true;


    alert(
      "🏆 TOURNAMENT STARTED!"
    );


    updateTournamentStatus();

  }

  catch (error) {

    console.error(
      "Start tournament error:",
      error
    );


    alert(
      "❌ Imeshindikana kuanza tournament."
    );

  }

}


// ======================================================
// ADMIN MATCH MANAGEMENT
// ALL GROUPS
// ======================================================

function loadAdminFixtures() {

  const container =
    document.getElementById(
      "adminMatches"
    );


  if (!container) return;


  if (
    players.length < 32
  ) {

    container.innerHTML = `

      <p>
        🔒 Waiting for 32 players...
      </p>

    `;

    return;

  }


  if (
    matches.length === 0
  ) {

    container.innerHTML = `

      <p>
        ⚙️ Players 32/32 wamefika.
        Generate fixtures kwanza.
      </p>

    `;

    return;

  }


  container.innerHTML =
    "";


  groupLetters.forEach(
    function (letter) {

      const groupMatches =
        matches.filter(
          function (match) {

            return (
              match.group === letter
            );

          }
        );


      const title =
        document.createElement(
          "h3"
        );


      title.textContent =
        `GROUP ${letter}`;


      container.appendChild(
        title
      );


      groupMatches.forEach(
        function (
          match,
          index
        ) {

          createAdminMatchCard(
            container,
            match
          );

        }
      );

    }
  );

}


// ======================================================
// ADMIN MATCH CARD
// ======================================================

function createAdminMatchCard(
  container,
  match
) {

  const card =
    document.createElement(
      "div"
    );


  card.className =
    "admin-match";


  const safeId =
    match.id;


  card.innerHTML = `

    <h3>

      ${escapeHTML(
        match.homePlayer
      )}

      <span>VS</span>

      ${escapeHTML(
        match.awayPlayer
      )}

    </h3>


    <label>
      Match date
    </label>

    <input
      type="date"
      id="date-${safeId}"
      value="${match.date || ""}"
    >


    <label>
      Match time
    </label>

    <input
      type="time"
      id="time-${safeId}"
      value="${match.time || ""}"
    >


    <label>
      Home goals
    </label>

    <input
      type="number"
      min="0"
      id="home-${safeId}"
      value="${
        match.played === true
          ? match.homeGoals
          : ""
      }"
    >


    <label>
      Away goals
    </label>

    <input
      type="number"
      min="0"
      id="away-${safeId}"
      value="${
        match.played === true
          ? match.awayGoals
          : ""
      }"
    >


    <button
      type="button"
      class="primary-btn"
      id="save-${safeId}"
    >
      SAVE MATCH
    </button>

  `;


  const saveButton =
    card.querySelector(
      `#save-${safeId}`
    );


  saveButton.addEventListener(
    "click",
    function () {

      saveMatch(
        match.id
      );

    }
  );


  container.appendChild(
    card
  );

}


// ======================================================
// SAVE MATCH
// ======================================================

async function saveMatch(
  matchId
) {

  const match =
    matches.find(
      function (item) {

        return (
          item.id === matchId
        );

      }
    );


  if (!match) {

    alert(
      "❌ Match haipatikani."
    );

    return;

  }


  const date =
    document.getElementById(
      `date-${matchId}`
    )?.value;


  const time =
    document.getElementById(
      `time-${matchId}`
    )?.value;


  const homeValue =
    document.getElementById(
      `home-${matchId}`
    )?.value;


  const awayValue =
    document.getElementById(
      `away-${matchId}`
    )?.value;


  if (
    !date ||
    !time
  ) {

    alert(
      "⚠️ Weka tarehe na muda."
    );

    return;

  }


  const played =
    homeValue !== "" &&
    awayValue !== "";


  let homeGoals =
    null;


  let awayGoals =
    null;


  if (played) {

    homeGoals =
      Number(homeValue);

    awayGoals =
      Number(awayValue);


    if (
      homeGoals < 0 ||
      awayGoals < 0 ||
      !Number.isInteger(homeGoals) ||
      !Number.isInteger(awayGoals)
    ) {

      alert(
        "⚠️ Goals lazima ziwe namba kamili kuanzia 0."
      );

      return;

    }

  }


  try {

    await updateDoc(
      doc(
        db,
        "matches",
        matchId
      ),
      {

        date:
          date,

        time:
          time,

        homeGoals:
          homeGoals,

        awayGoals:
          awayGoals,

        played:
          played

      }
    );


    alert(
      "✅ Match saved successfully."
    );


    await loadLeague();

  }

  catch (error) {

    console.error(
      "Save match error:",
      error
    );


    alert(
      "❌ Imeshindikana kuhifadhi match."
    );

  }

}


// ======================================================
// DATE FORMAT
// ======================================================

function formatDate(
  date
) {

  const year =
    date.getFullYear();


  const month =
    String(
      date.getMonth() + 1
    ).padStart(
      2,
      "0"
    );


  const day =
    String(
      date.getDate()
    ).padStart(
      2,
      "0"
    );


  return (
    `${year}-${month}-${day}`
  );

}


// ======================================================
// TIME FORMAT
// ======================================================

function formatTime(
  date
) {

  const hours =
    String(
      date.getHours()
    ).padStart(
      2,
      "0"
    );


  const minutes =
    String(
      date.getMinutes()
    ).padStart(
      2,
      "0"
    );


  return (
    `${hours}:${minutes}`
  );

}


// ======================================================
// ESCAPE HTML
// ======================================================

function escapeHTML(
  value
) {

  return String(
    value ?? ""
  )
    .replaceAll(
      "&",
      "&amp;"
    )
    .replaceAll(
      "<",
      "&lt;"
    )
    .replaceAll(
      ">",
      "&gt;"
    )
    .replaceAll(
      '"',
      "&quot;"
    )
    .replaceAll(
      "'",
      "&#039;"
    );

}


// ======================================================
// GLOBAL FUNCTION
// ======================================================

window.saveMatch =
  saveMatch;


// ======================================================
// END
// ======================================================