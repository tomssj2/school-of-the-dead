import * as G from "./game.js";
import { renderApp, renderCharacterCard, renderMissionModal, renderAssaultModal, renderScoutModal, renderFightAnimation } from "./ui.js";
import { emptyEquipment, starterArmory, withTeacherHonorific } from "./characters.js";
import {
  SUBJECTS, CLASSROOM_IDS, CLASSROOM_CAPACITY, MAX_STAMINA, GYM_CAPACITY, GYM_MAX_TEACHERS,
  CAFETERIA_CAPACITY, CAFETERIA_MAX_TEACHERS, FARM_CAPACITY, SCRAPYARD_CAPACITY, LAB_CAPACITY,
  HAPPINESS_START,
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
let openScoutHex = null; // { q, r } or null
let fightAnimation = null; // { studentId, ambushed, phase: "clash" | "result" } or null

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
    if (c.farmToday === undefined) c.farmToday = false;
    if (c.scrapyardToday === undefined) c.scrapyardToday = false;
    if (c.labToday === undefined) c.labToday = false;
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
  if (!s.rooms.farm) s.rooms.farm = { studentCapacity: FARM_CAPACITY };
  if (!s.rooms.scrapyard) s.rooms.scrapyard = { studentCapacity: SCRAPYARD_CAPACITY };
  if (!s.rooms.lab) s.rooms.lab = { studentCapacity: LAB_CAPACITY };
  if (s.resources.research === undefined) s.resources.research = 0;
  if (s.happiness === undefined) s.happiness = HAPPINESS_START;
  if (s.pendingRaid === undefined) s.pendingRaid = null;
  if (s.pendingAssault === undefined) s.pendingAssault = false;
  if (!s.raidDefenders) s.raidDefenders = [];
  if (!s.eventLog) s.eventLog = [];
  if (!s.exploredHexes) s.exploredHexes = [];
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

// Closing the mission modal without ever assigning a student shouldn't leave a phantom mission
// occupying one of the 3 team slots.
function closeMissionModal() {
  const teamIndex = state.teamLocations.indexOf(openMissionLocationId);
  if (teamIndex !== -1 && !state.characters.some((c) => c.exploreTeam === teamIndex)) {
    G.setTeamLocation(state, teamIndex, null);
  }
  openMissionLocationId = null;
}

function render() {
  const card = openCardId ? G.getCharAnywhere(state, openCardId) : null;
  if (openCardId && !card) openCardId = null; // e.g. expelled while card was open
  if (openMissionLocationId && !state.teamLocations.includes(openMissionLocationId)) openMissionLocationId = null;
  if (openScoutHex && G.isHexExplored(state, openScoutHex.q, openScoutHex.r)) openScoutHex = null;
  root.classList.toggle("mobile-forced", mobileView);
  const modalHtml = fightAnimation
    ? renderFightAnimation(state, fightAnimation)
    : card
    ? renderCharacterCard(state, card, cardTab)
    : openMissionLocationId
    ? renderMissionModal(state, openMissionLocationId)
    : openScoutHex
    ? renderScoutModal(state, openScoutHex.q, openScoutHex.r)
    : state.pendingAssault
    ? renderAssaultModal()
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
  else {
    G.resolveDefense(state);
    // A won battle can roll a facility raid or an Assault opportunity that must be handled
    // (assigning raid defenders, or answering the Assault popup) before the day advances —
    // resolveFacilityRaid/resolveAssault call advanceTurn themselves once that happens.
    if (state.pendingRaid || state.pendingAssault) return;
  }
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
    case "remove-farm":
      G.setFarmToday(state, el.dataset.id, false);
      render();
      break;
    case "resolve-raid":
      G.resolveFacilityRaid(state);
      render();
      break;
    case "assault-chase":
      G.resolveAssault(state, true);
      render();
      break;
    case "assault-decline":
      G.resolveAssault(state, false);
      render();
      break;
    case "remove-scrapyard":
      G.setScrapyardToday(state, el.dataset.id, false);
      render();
      break;
    case "remove-lab":
      G.setLabToday(state, el.dataset.id, false);
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
      closeMissionModal();
      openScoutHex = null;
      openCardId = el.dataset.id;
      cardTab = "stats";
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
      openScoutHex = null;
      openMissionLocationId = locationId;
      render();
      break;
    }
    case "close-mission":
      closeMissionModal();
      render();
      break;
    case "open-scout": {
      const q = Number(el.dataset.q);
      const r = Number(el.dataset.r);
      if (!G.canScoutHex(state, q, r)) break;
      openCardId = null;
      openMissionLocationId = null;
      openScoutHex = { q, r };
      render();
      break;
    }
    case "close-scout":
      openScoutHex = null;
      render();
      break;
    case "confirm-scout": {
      if (!openScoutHex) break;
      const studentId = el.dataset.id;
      const result = G.scoutHex(state, studentId, openScoutHex.q, openScoutHex.r);
      openScoutHex = null;
      if (!result) {
        flash("Can't scout that hex.");
        render();
        break;
      }
      const finish = () => {
        if (result.ambushed) flash("Ambushed! The scout fled back to the school.");
        else if (result.location) flash(`Discovered ${result.location.name}!`);
        else flash("Scouted the area — nothing there.");
        render();
      };
      if (result.encountered) {
        fightAnimation = { studentId, ambushed: result.ambushed, phase: "clash" };
        render();
        setTimeout(() => {
          fightAnimation.phase = "result";
          render();
          setTimeout(() => {
            fightAnimation = null;
            finish();
          }, 900);
        }, 1100);
      } else {
        finish();
      }
      break;
    }
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
    closeMissionModal();
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
    case "add-farm": {
      if (el.value) G.setFarmToday(state, el.value, true);
      render();
      break;
    }
    case "add-scrapyard": {
      if (el.value) G.setScrapyardToday(state, el.value, true);
      render();
      break;
    }
    case "add-lab": {
      if (el.value) G.setLabToday(state, el.value, true);
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
    case "toggle-raid-defender": {
      G.setRaidDefender(state, el.dataset.id, el.checked);
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
