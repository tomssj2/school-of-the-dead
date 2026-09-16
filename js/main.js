import * as G from "./game.js";
import { renderApp, renderCharacterCard, renderMissionModal } from "./ui.js";
import { emptyEquipment, starterArmory, withTeacherHonorific } from "./characters.js";
import {
  SUBJECTS, CLASSROOM_IDS, CLASSROOM_CAPACITY, MAX_STAMINA, GYM_CAPACITY, GYM_MAX_TEACHERS,
  CAFETERIA_CAPACITY, CAFETERIA_MAX_TEACHERS,
} from "./data.js";

const SAVE_KEY = "school-apocalypse-save-v1";

let state = loadGame() || G.createInitialState();
migrateState(state);
let activeTab = "overview";
let openCardId = null;
let cardTab = "stats";
let rosterFilter = "all";
let mobileView = false;
let openMissionLocationId = null;

const root = document.getElementById("app");

// Fills in fields added by later versions of the game so saves from before traits/equipment
// existed still load without crashing.
function migrateState(s) {
  if (!s.armory) s.armory = starterArmory();
  const fixup = (c) => {
    if (!c.traits) c.traits = [];
    if (!c.equipment) c.equipment = emptyEquipment();
    if (!c.skills) c.skills = [];
    if (c.stamina === undefined) c.stamina = MAX_STAMINA;
    if (c.maxStamina === undefined) c.maxStamina = MAX_STAMINA;
    if (c.cafeteriaToday === undefined) c.cafeteriaToday = false;
    if (c.role === "teacher") {
      if (!/^(mr|mrs)\.\s/i.test(c.name)) c.name = withTeacherHonorific(c.name, c.gender);
      if (!c.teachSubject) {
        c.teachSubject = SUBJECTS.reduce((best, s) => (c.grades[s] > c.grades[best] ? s : best), SUBJECTS[0]);
      }
    }
  };
  s.characters.forEach(fixup);
  (s.recruitPool || []).forEach(fixup);

  migrateClassroomRooms(s);
  if (!s.rooms.gym) s.rooms.gym = { studentCapacity: GYM_CAPACITY, teacherCapacity: GYM_MAX_TEACHERS };
  if (!s.rooms.cafeteria) s.rooms.cafeteria = { studentCapacity: CAFETERIA_CAPACITY, teacherCapacity: CAFETERIA_MAX_TEACHERS };
}

// Classrooms used to be permanently keyed by subject ("Biology", "Physics", ...). They're now
// generic numbered rooms ("1".."4") whose subject is decided by whichever teacher is posted
// there. Convert an old save's rooms/seats/posts over to the new shape, preserving what was
// being taught in each room and who was sitting/teaching there.
function migrateClassroomRooms(s) {
  const rooms = s.rooms.classrooms;
  if (!rooms || rooms[CLASSROOM_IDS[0]]) return; // already the new format (or nothing to migrate)

  const oldSubjects = ["Biology", "Physics", "History", "SocialStudies"];
  const mapping = {};
  const newRooms = {};
  CLASSROOM_IDS.forEach((id, i) => {
    const oldSubject = oldSubjects[i];
    const oldRoom = rooms[oldSubject];
    mapping[oldSubject] = id;
    newRooms[id] = {
      subject: oldRoom ? oldSubject : null,
      seats: oldRoom ? oldRoom.seats : Array(CLASSROOM_CAPACITY).fill(null),
    };
  });
  s.rooms.classrooms = newRooms;

  const fixup = (c) => {
    if (c.seat && c.seat.subject) {
      const roomId = mapping[c.seat.subject];
      c.seat = roomId ? { room: roomId, index: c.seat.index } : null;
    }
    if (c.post && c.post.startsWith("classroom:")) {
      const roomId = mapping[c.post.split(":")[1]];
      c.post = roomId ? `classroom:${roomId}` : null;
    }
  };
  s.characters.forEach(fixup);
  (s.recruitPool || []).forEach(fixup);
}

function render() {
  const card = openCardId ? G.getCharAnywhere(state, openCardId) : null;
  if (openCardId && !card) openCardId = null; // e.g. expelled while card was open
  if (openMissionLocationId && !state.teamLocations.includes(openMissionLocationId)) openMissionLocationId = null;
  root.classList.toggle("mobile-forced", mobileView);
  const modalHtml = card
    ? renderCharacterCard(state, card, cardTab)
    : openMissionLocationId
    ? renderMissionModal(state, openMissionLocationId)
    : "";
  root.innerHTML = renderApp(state, activeTab, rosterFilter, mobileView) + modalHtml;
}

function loadGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

function saveGame() {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
    flash("Game saved.");
  } catch (e) {
    flash("Could not save game.");
  }
}

let flashTimer = null;
function flash(msg) {
  let el = document.getElementById("flash");
  if (!el) {
    el = document.createElement("div");
    el.id = "flash";
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(flashTimer);
  flashTimer = setTimeout(() => el.classList.remove("show"), 1800);
}

function resolveCurrentTurn() {
  if (state.turn === 1) G.resolveTraining(state);
  else if (state.turn === 2) G.resolveExploration(state);
  else G.resolveDefense(state);
  G.advanceTurn(state);
}

// ---------- event delegation ----------

root.addEventListener("click", (e) => {
  const el = e.target.closest("[data-action]");
  if (!el) return;
  const action = el.dataset.action;

  switch (action) {
    case "set-tab":
      activeTab = el.dataset.tab;
      render();
      break;
    case "set-roster-filter":
      rosterFilter = el.dataset.filter;
      render();
      break;
    case "resolve-turn":
      resolveCurrentTurn();
      render();
      break;
    case "save-game":
      saveGame();
      break;
    case "reset-game":
      if (confirm("Start a brand new game? This will erase your current progress.")) {
        state = G.createInitialState();
        activeTab = "overview";
        render();
      }
      break;
    case "unseat":
      G.unseat(state, el.dataset.id);
      render();
      break;
    case "clear-post":
      G.setTeacherPost(state, el.dataset.id, null);
      render();
      break;
    case "remove-gym":
      G.setGymToday(state, el.dataset.id, false);
      render();
      break;
    case "remove-cafeteria":
      G.setCafeteriaToday(state, el.dataset.id, false);
      render();
      break;
    case "upgrade-room":
      G.upgradeRoom(state, el.dataset.roomType, el.dataset.roomId || null, el.dataset.kind);
      render();
      break;
    case "promote":
      G.promoteToTeacher(state, el.dataset.id);
      render();
      break;
    case "expel":
      {
        const c = G.getChar(state, el.dataset.id);
        if (c && confirm(`Expel ${c.name} from the school? This cannot be undone.`)) {
          G.expelCharacter(state, el.dataset.id);
          render();
        }
      }
      break;
    case "accept-recruit":
      G.acceptRecruit(state, Number(el.dataset.index));
      render();
      break;
    case "reject-recruit":
      G.rejectRecruit(state, Number(el.dataset.index));
      render();
      break;
    case "open-card":
      e.preventDefault(); // stop a click inside a <label> from also toggling its checkbox
      openCardId = el.dataset.id;
      cardTab = "stats";
      openMissionLocationId = null;
      render();
      break;
    case "close-card":
      openCardId = null;
      render();
      break;
    case "open-mission": {
      const locationId = el.dataset.location;
      let teamIndex = state.teamLocations.indexOf(locationId);
      if (teamIndex === -1) {
        teamIndex = state.teamLocations.findIndex((l) => !l);
        if (teamIndex === -1) {
          flash("All 3 teams are already out on missions.");
          break;
        }
        G.setTeamLocation(state, teamIndex, locationId);
      }
      openCardId = null;
      openMissionLocationId = locationId;
      render();
      break;
    }
    case "close-mission":
      openMissionLocationId = null;
      render();
      break;
    case "clear-mission": {
      const teamIndex = Number(el.dataset.team);
      state.characters.filter((c) => c.exploreTeam === teamIndex).forEach((c) => G.setExploreTeam(state, c.id, null));
      G.setTeamLocation(state, teamIndex, null);
      openMissionLocationId = null;
      render();
      break;
    }
    case "set-card-tab":
      cardTab = el.dataset.tab;
      render();
      break;
    case "unequip-item":
      G.unequipItem(state, el.dataset.id, el.dataset.slot);
      render();
      break;
    case "buy-skill":
      G.buySkill(state, el.dataset.id, el.dataset.subject, el.dataset.tier);
      render();
      break;
    case "rename-char": {
      const c = G.getCharAnywhere(state, el.dataset.id);
      if (!c) break;
      const name = prompt("Enter a new name (max 20 letters):", c.name);
      if (name !== null) {
        G.renameCharacter(state, el.dataset.id, name);
        render();
      }
      break;
    }
    case "reroll-portrait":
      G.rerollPortrait(state, el.dataset.id);
      render();
      break;
    case "noop":
      break;
    default:
      break;
  }
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && (openCardId || openMissionLocationId)) {
    openCardId = null;
    openMissionLocationId = null;
    render();
  }
});

root.addEventListener("change", (e) => {
  const el = e.target.closest("[data-action]");
  if (!el) return;
  const action = el.dataset.action;

  switch (action) {
    case "assign-seat": {
      const roomId = el.dataset.room;
      const index = Number(el.dataset.index);
      const studentId = el.value;
      if (studentId) G.assignSeat(state, studentId, roomId, index);
      render();
      break;
    }
    case "assign-classroom-teacher": {
      const roomId = el.dataset.room;
      const teacherId = el.value;
      if (teacherId) G.setTeacherPost(state, teacherId, `classroom:${roomId}`);
      render();
      break;
    }
    case "assign-gym-teacher": {
      if (el.value) G.setTeacherPost(state, el.value, "gym");
      render();
      break;
    }
    case "assign-cafeteria": {
      if (el.value) G.setTeacherPost(state, el.value, "cafeteria");
      render();
      break;
    }
    case "assign-utility": {
      const post = el.dataset.post;
      if (el.value) G.setTeacherPost(state, el.value, post);
      render();
      break;
    }
    case "add-gym": {
      if (el.value) G.setGymToday(state, el.value, true);
      render();
      break;
    }
    case "add-cafeteria": {
      if (el.value) G.setCafeteriaToday(state, el.value, true);
      render();
      break;
    }
    case "toggle-gym": {
      G.setGymToday(state, el.dataset.id, el.checked);
      render();
      break;
    }
    case "set-team-location": {
      const teamIndex = Number(el.dataset.team);
      G.setTeamLocation(state, teamIndex, el.value || null);
      render();
      break;
    }
    case "toggle-team-member": {
      const teamIndex = Number(el.dataset.team);
      G.setExploreTeam(state, el.dataset.id, el.checked ? teamIndex : null);
      render();
      break;
    }
    case "toggle-defend": {
      G.setDefending(state, el.dataset.id, el.checked);
      render();
      break;
    }
    case "toggle-show-dead": {
      window.__showDead = el.checked;
      render();
      break;
    }
    case "toggle-mobile-view": {
      mobileView = el.checked;
      render();
      break;
    }
    case "equip-item": {
      if (el.value) G.equipItem(state, el.dataset.id, el.dataset.slot, el.value);
      render();
      break;
    }
    default:
      break;
  }
});

render();
