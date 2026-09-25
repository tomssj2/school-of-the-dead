import * as G from "./game.js";
import { renderApp, renderCharacterCard, renderMissionModal, renderAssaultModal, renderScoutModal, renderFightAnimation, renderPickerModal, renderBattleAnimation, renderDayRecap, renderDefenseBuildModal, renderPlotModal,
  renderScoutReport, renderNestModal, renderRaidModal, renderRaidFight, renderExpeditionReport } from "./ui.js";
import { emptyEquipment, starterArmory, withTeacherHonorific, repairIds, maxStaminaFor, maxHpFor } from "./characters.js";
import { playHit, playSuccess, playFail, playChime, isSoundEnabled, setSoundEnabled } from "./sound.js";
import {
  SUBJECTS, CLASSROOM_IDS, CLASSROOM_CAPACITY, MAX_STAMINA, GYM_CAPACITY, GYM_MAX_TEACHERS,
  CAFETERIA_MAX_TEACHERS, LOUNGE_CAPACITY, LOUNGE_RECOVERY, RESEARCH_ROOM_TEACHERS, FARM_CAPACITY, SCRAPYARD_CAPACITY, RANCH_CAPACITY,
  HAPPINESS_START, ENTRANCE_GRID_SIZE, ITEM_TEMPLATES, LEGENDARY_ITEM_TEMPLATES,
  INFIRMARY_CAPACITY, INFIRMARY_MAX_TEACHERS, STARTING_PANTRY, INGREDIENTS, LEGACY_DISH_IDS, STARTING_STOCK, FACILITY_PLOTS, ROOM_UPGRADE_INCREMENT, LOCATIONS, LANDMARKS, LEGACY_POI_HEXES, LEGACY_LOCATION_IDS,
} from "./data.js";

const SAVE_KEY = "school-apocalypse-save-v1";

// Costs of the original resource-granting Research tree, which was replaced by buffs. Research
// spent on those nodes is refunded so it can go into the new tree; what they granted is kept.
// Declared before the save loads because migrateState() runs immediately below.
const LEGACY_TECH_COST = {
  fortify_walls: 15, stockpile: 15, field_rations: 15,
  reinforced_gates: 30, grain_silos: 30, surplus_trade: 30,
  watchtowers: 50, greenhouse: 50, scrap_refinery: 50,
  barricade_network: 75, livestock_pens: 75, trade_caravan: 75,
  bastion_walls: 110, cold_storage: 110, black_market: 110,
};

let state = loadGame() || G.createInitialState();
migrateState(state);
repairIds(state);
let activeTab = "overview";
let openCardId = null;
let cardTab = "stats";
let rosterFilter = "all";
let rosterSortKey = "name";
let rosterSortDir = "asc";
let mobileView = false;
let openMissionLocationId = null;
let openScoutHex = null; // { q, r } or null
let fightAnimation = null; // { studentId, ambushed, phase: "clash" | "result" } or null
let battleAnimation = null; // { kind: "defense" | "exploration", summary, phase: "clash" | "result" } or null
let openPicker = null; // { kind, roomId, seatIndex, postKey } or null
let scoutReport = null; // { q, r, scoutName, result } — what the last scout found
let openNest = null; // { q, r, ids } while picking a squad to clear a zombie nest
let openRaid = null; // LANDMARKS id whose raid screen is open
let raidFight = null; // { report, frameIndex, phase: "battle" | "result", after } while a raid replays
let expeditionReport = null; // { summary, phase: "travel" | "report" } at the end of Turn 2
let openPlot = null; // { facility: "farm" | "ranch", index } while choosing what to plant/pen
let openDefenseBuild = null; // cell key ("row,col") of an empty middle-zone entrance cell, or null
let pickerSortKey = "level";
let pickerSortDir = "desc";
let lastResources = null; // resources/happiness snapshot from the previous render(), for floaties
let lastHappiness = null;
let lastPopulation = null;
let lastDay = state.day; // for the day-rollover chime, however the advance happened
let lastRenderedTab = null;
let floaties = [];
let floatyClearTimer = null;
let dayRecap = null; // { day, entries } shown once right after a day rolls over

const root = document.getElementById("app");

// Weapons used to be a single "weapon" slot/type with no category/damage/range/requires — backfill
// those from the current template (falling back to sane melee defaults if the template's gone).
function migrateWeaponItem(item) {
  if (!item || item.slot !== "weapon" || item.category) return item;
  const template = ITEM_TEMPLATES.find((t) => t.id === item.id) || LEGENDARY_ITEM_TEMPLATES.find((t) => t.id === item.id);
  item.category = template?.category || "melee";
  item.damage = template?.damage ?? 8;
  item.range = template?.range ?? 1;
  item.requires = template?.requires || {};
  return item;
}

// Fills in fields added by later versions of the game so saves from before traits/equipment
// existed still load without crashing.
function migrateState(s) {
  if (!s.armory) s.armory = starterArmory();
  s.armory.forEach(migrateWeaponItem);
  const fixup = (c) => {
    if (!c.traits) c.traits = [];
    if (!c.equipment) c.equipment = emptyEquipment();
    if (c.equipment.weapon !== undefined) {
      // old single-weapon-slot shape: route it into melee/ranged by category, then drop the field
      if (c.equipment.meleeWeapon === undefined) {
        const w = migrateWeaponItem(c.equipment.weapon);
        c.equipment.meleeWeapon = w && w.category === "ranged" ? null : w;
        c.equipment.rangedWeapon = w && w.category === "ranged" ? w : null;
      }
      delete c.equipment.weapon;
    }
    if (c.equipment.meleeWeapon === undefined) c.equipment.meleeWeapon = null;
    if (c.equipment.rangedWeapon === undefined) c.equipment.rangedWeapon = null;
    migrateWeaponItem(c.equipment.meleeWeapon);
    migrateWeaponItem(c.equipment.rangedWeapon);
    if (!c.skills) c.skills = [];
    if (c.stamina === undefined) c.stamina = MAX_STAMINA;
    // Max stamina now grows with DEX + WIS (and Gym training) — recomputed on every load so it
    // always matches the grades.
    c.maxStamina = maxStaminaFor(c);
    c.stamina = Math.min(c.stamina, c.maxStamina);
    // Max HP now comes from CON and STR (plus Gym training) — also recomputed on every load.
    c.maxHp = maxHpFor(c.grades) + (c.trainedHp || 0);
    if (c.alive !== false) c.hp = Math.min(c.hp, c.maxHp);
    // students used to rest in the cafeteria; that moved to the lounge
    if (c.loungeToday === undefined) c.loungeToday = !!c.cafeteriaToday;
    delete c.cafeteriaToday;
    if (c.infirmaryToday === undefined) c.infirmaryToday = false;
    if (c.farmToday === undefined) c.farmToday = false;
    if (c.scrapyardToday === undefined) c.scrapyardToday = false;
    delete c.labToday; // the Lab was replaced by the Ranch
    if (c.ranchToday === undefined) c.ranchToday = false;
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
  if (!s.rooms.cafeteria) s.rooms.cafeteria = { teacherCapacity: CAFETERIA_MAX_TEACHERS };
  if (!s.rooms.lounge) {
    // carry any rest-slot upgrades bought for the old cafeteria over to the lounge
    s.rooms.lounge = { studentCapacity: s.rooms.cafeteria.studentCapacity || LOUNGE_CAPACITY, recovery: LOUNGE_RECOVERY };
  }
  delete s.rooms.cafeteria.studentCapacity;
  if (!s.rooms.research) s.rooms.research = { teacherCapacity: RESEARCH_ROOM_TEACHERS };
  if (!s.rooms.farm) s.rooms.farm = { studentCapacity: FARM_CAPACITY };
  if (!s.rooms.scrapyard) s.rooms.scrapyard = { studentCapacity: SCRAPYARD_CAPACITY };
  delete s.rooms.lab;
  if (!s.rooms.ranch) s.rooms.ranch = { studentCapacity: RANCH_CAPACITY, plots: FACILITY_PLOTS.ranch };
  if (s.pendingRaid?.facility === "lab") s.pendingRaid.facility = "ranch";
  if (s.resources.research === undefined) s.resources.research = 0;
  if (s.happiness === undefined) s.happiness = HAPPINESS_START;
  if (s.pendingRaid === undefined) s.pendingRaid = null;
  if (s.pendingAssault === undefined) s.pendingAssault = false;
  if (!s.raidDefenders) s.raidDefenders = [];
  if (!s.eventLog) s.eventLog = [];
  if (!s.exploredHexes) s.exploredHexes = [];
  if (!s.techUnlocked) s.techUnlocked = [];
  const legacyTech = s.techUnlocked.filter((id) => LEGACY_TECH_COST[id]);
  if (legacyTech.length) {
    const refund = legacyTech.reduce((sum, id) => sum + LEGACY_TECH_COST[id], 0);
    s.resources.research += refund;
    s.techUnlocked = s.techUnlocked.filter((id) => !LEGACY_TECH_COST[id]);
    G.addLog(s, `🧠 The Research tree was redesigned around permanent buffs — ${refund} research refunded from ${legacyTech.length} old project(s).`);
  }
  if (!s.entranceGrid) s.entranceGrid = { size: ENTRANCE_GRID_SIZE, students: {}, defenses: {} };
  if (s.rescue === undefined) s.rescue = null; // an older save past day 3 gets its broadcast at the next day rollover
  if (s.victory === undefined) s.victory = false;
  if (!s.bossesSlain) s.bossesSlain = [];
  if (!s.rooms.infirmary) s.rooms.infirmary = { studentCapacity: INFIRMARY_CAPACITY, teacherCapacity: INFIRMARY_MAX_TEACHERS };
  if (!s.pantry) s.pantry = { ...STARTING_PANTRY };
  if (!s.dishesToday) s.dishesToday = [];
  // Ingredients that no longer exist (honey, chocolate) are dropped; new ones start at the
  // starting pantry amount. Dishes already served today keep their buff under their new id.
  for (const id of Object.keys(s.pantry)) if (!INGREDIENTS[id]) delete s.pantry[id];
  for (const id of Object.keys(INGREDIENTS)) if (s.pantry[id] === undefined) s.pantry[id] = STARTING_PANTRY[id];
  s.dishesToday = s.dishesToday.map((id) => LEGACY_DISH_IDS[id] || id);
  // Seeds + farm plots (with hen coops) became stock + Farm plots and Ranch pens: seeds carry
  // over, hens — spare or cooped — become Ranch chickens, and growing crops keep growing.
  if (!s.stock) {
    s.stock = { ...STARTING_STOCK };
    if (s.seeds) Object.assign(s.stock, { potatoes: s.seeds.potatoes || 0, tomatoes: s.seeds.tomatoes || 0, wheat: s.seeds.wheat || 0, chicken: s.seeds.eggs || 0 });
    delete s.seeds;
  }
  if (!s.plots) {
    s.plots = { farm: [], ranch: [] };
    for (const old of s.farmPlots || []) {
      if (old.crop === "eggs" && old.planted) s.stock.chicken += 1;
      const growing = old.planted && old.crop !== "eggs";
      s.plots.farm.push({ id: growing ? old.crop : null, growth: growing ? old.growth : 0 });
    }
    delete s.farmPlots;
  }
  if (s.rooms.farm.plots === undefined) s.rooms.farm.plots = FACILITY_PLOTS.farm;
  G.syncPlots(s, "farm");
  G.syncPlots(s, "ranch");
  // The Gym was split into PE / Gymnastics sides with per-side capacities: keep the upgrade
  // levels already bought, move gym teachers to the PE side, and send today's trainees there too.
  if (!s.gymSplit) {
    const studentLevel = Math.max(0, Math.round((s.rooms.gym.studentCapacity - 10) / 5));
    const teacherLevel = Math.max(0, s.rooms.gym.teacherCapacity - 3);
    s.rooms.gym.studentCapacity = GYM_CAPACITY + ROOM_UPGRADE_INCREMENT.gymStudent * studentLevel;
    s.rooms.gym.teacherCapacity = GYM_MAX_TEACHERS + teacherLevel;
    for (const c of s.characters) {
      if (c.post === "gym") c.post = "gym:PE";
      if (c.gymToday === true) c.gymToday = "PE";
    }
    s.gymSplit = true;
  }
  if (!s.nests) s.nests = [];
  if (s.raidTarget === undefined) s.raidTarget = null;
  if (!s.raidCooldowns) s.raidCooldowns = {};
  if (!s.raidKills) s.raidKills = {};
  // Locations moved apart by the no-touching map rule: a save that had explored the old spot sees
  // the new one too, and no nest is left sitting under a location.
  const poiKey = (p) => `${p.hex.q},${p.hex.r}`;
  for (const [id, oldKeys] of Object.entries(LEGACY_POI_HEXES)) {
    const newKey = poiKey([...LOCATIONS, ...LANDMARKS].find((p) => p.id === id));
    if (oldKeys.some((k) => s.exploredHexes.includes(k)) && !s.exploredHexes.includes(newKey)) s.exploredHexes.push(newKey);
  }
  s.teamLocations = s.teamLocations.map((id) => LEGACY_LOCATION_IDS[id] || id);
  // ...and nothing is left on what are now the school grounds (its hex and the six around it).
  const onGrounds = (k) => {
    const [q, r] = k.split(",").map(Number);
    return (Math.abs(q) + Math.abs(r) + Math.abs(q + r)) / 2 <= 1;
  };
  s.nests = s.nests.filter((k) => !onGrounds(k) && ![...LOCATIONS, ...LANDMARKS].some((p) => poiKey(p) === k));
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

// Diffs resources/happiness against the previous render() so a floaty can pop up over whichever
// topbar stat changed — catches every source of change (turn resolution, upgrades, scouting,
// events, tech) in one place instead of instrumenting each action individually.
function computeFloaties() {
  const result = [];
  if (lastResources) {
    for (const key of ["food", "materials", "medicine", "research"]) {
      const delta = state.resources[key] - lastResources[key];
      if (delta !== 0) result.push({ key, delta });
    }
  }
  if (lastHappiness !== null) {
    const delta = state.happiness - lastHappiness;
    if (delta !== 0) result.push({ key: "happiness", delta });
  }
  const population = state.characters.filter((c) => c.alive).length;
  if (lastPopulation !== null) {
    const delta = population - lastPopulation;
    if (delta !== 0) result.push({ key: "population", delta });
  }
  return result;
}

function render() {
  const card = openCardId ? G.getCharAnywhere(state, openCardId) : null;
  if (openCardId && !card) openCardId = null; // e.g. expelled while card was open
  if (openMissionLocationId && !state.teamLocations.includes(openMissionLocationId)) openMissionLocationId = null;
  if (openScoutHex && G.isHexExplored(state, openScoutHex.q, openScoutHex.r)) openScoutHex = null;

  const newFloaties = computeFloaties();
  if (newFloaties.length) {
    floaties = newFloaties;
    clearTimeout(floatyClearTimer);
    floatyClearTimer = setTimeout(() => {
      floaties = [];
      render();
    }, 1300);
  }
  lastResources = { ...state.resources };
  lastHappiness = state.happiness;
  lastPopulation = state.characters.filter((c) => c.alive).length;

  if (state.day !== lastDay) {
    playChime(); // covers every path a new day can start from
    dayRecap = { day: lastDay, entries: state.log.filter((e) => e.day === lastDay) };
  }
  lastDay = state.day;

  root.classList.toggle("mobile-forced", mobileView);
  // Drives the time-of-day backdrop in style.css: morning, golden afternoon, starry night.
  document.body.dataset.turn = state.gameOver ? "over" : state.victory ? "victory" : String(state.turn);
  // Content eases in only when the tab actually changes, not on every re-render within a tab.
  root.classList.toggle("tab-enter", activeTab !== lastRenderedTab);
  lastRenderedTab = activeTab;
  const modalHtml = raidFight
    ? renderRaidFight(state, raidFight)
    : expeditionReport
    ? renderExpeditionReport(state, expeditionReport)
    : battleAnimation
    ? renderBattleAnimation(state, battleAnimation)
    : fightAnimation
    ? renderFightAnimation(state, fightAnimation)
    : dayRecap
    ? renderDayRecap(dayRecap)
    : card
    ? renderCharacterCard(state, card, cardTab)
    : scoutReport
    ? renderScoutReport(state, scoutReport)
    : openRaid
    ? renderRaidModal(state, openRaid)
    : openNest
    ? renderNestModal(state, openNest)
    : openMissionLocationId
    ? renderMissionModal(state, openMissionLocationId)
    : openScoutHex
    ? renderScoutModal(state, openScoutHex.q, openScoutHex.r)
    : openPicker
    ? renderPickerModal(state, openPicker, pickerSortKey, pickerSortDir)
    : openDefenseBuild
    ? renderDefenseBuildModal(state, openDefenseBuild)
    : openPlot
    ? renderPlotModal(state, openPlot.facility, openPlot.index)
    : state.pendingAssault
    ? renderAssaultModal()
    : "";
  // The whole app re-renders, so keep the exploration map scrolled where the player left it
  // (centred on the school the first time — on a phone the map is wider than the screen).
  const oldMap = root.querySelector('.hexmap-wrap');
  const mapScroll = oldMap ? { left: oldMap.scrollLeft, top: oldMap.scrollTop } : null;
  root.innerHTML = renderApp(state, activeTab, rosterFilter, mobileView, floaties, rosterSortKey, rosterSortDir) + modalHtml;
  const newMap = root.querySelector('.hexmap-wrap');
  if (newMap) {
    newMap.scrollLeft = mapScroll ? mapScroll.left : (newMap.scrollWidth - newMap.clientWidth) / 2;
    newMap.scrollTop = mapScroll ? mapScroll.top : (newMap.scrollHeight - newMap.clientHeight) / 2;
  }
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

// Stages a clash -> result cinematic (same two-step timing as the scout fight animation) before
// running `afterResult`, which finishes resolving the turn. `afterResult` runs even if the
// player has moved on by the time the timers fire — it only ever touches `state`/`render`.
function playBattleAnimation(kind, summary, won, afterResult) {
  battleAnimation = { kind, summary, phase: "clash" };
  playHit();
  render();
  setTimeout(() => {
    battleAnimation.phase = "result";
    won ? playSuccess() : playFail();
    render();
    setTimeout(() => {
      battleAnimation = null;
      afterResult();
    }, 1200);
  }, 1300);
}

// Replays a raid a round at a time; "Skip" jumps to the result, "Continue" runs `after`.
const RAID_TICK_MS = 800;
let raidTimer = null;
function playRaidFight(report, after) {
  raidFight = { report, frameIndex: 0, phase: "battle", after };
  playHit();
  render();
  const step = () => {
    if (!raidFight || raidFight.phase !== "battle") return;
    if (raidFight.frameIndex >= report.frames.length - 1) {
      showRaidResult();
      return;
    }
    raidFight.frameIndex++;
    playHit();
    render();
    raidTimer = setTimeout(step, RAID_TICK_MS);
  };
  raidTimer = setTimeout(step, RAID_TICK_MS);
}
function showRaidResult() {
  if (!raidFight || raidFight.phase !== "battle") return;
  clearTimeout(raidTimer);
  raidFight.phase = "result";
  raidFight.frameIndex = raidFight.report.frames.length - 1;
  (raidFight.report.won ? playSuccess : playFail)();
  render();
}

// A quick scout-vs-zombie clash, then `done` — used by scouting ambushes and nest clearing.
function playSkirmish(studentId, lost, done) {
  fightAnimation = { studentId, ambushed: lost, phase: "clash" };
  playHit();
  render();
  setTimeout(() => {
    fightAnimation.phase = "result";
    (lost ? playFail : playSuccess)();
    render();
    setTimeout(() => {
      fightAnimation = null;
      done();
    }, 900);
  }, 1100);
}

// Replays the night battle's recorded frames on the grid, one tick at a time. The battle itself
// is already fully resolved in `state`; "Skip" just jumps to the result, and "Continue" on the
// result screen runs `afterResult` to finish the turn.
const BATTLE_TICK_MS = 450;
let battleTimer = null;
function playGridBattle(summary, afterResult) {
  const anim = { kind: "grid", summary, frameIndex: 0, phase: "battle" };
  const showResult = () => {
    if (anim.phase !== "battle") return;
    clearTimeout(battleTimer);
    anim.phase = "result";
    anim.frameIndex = summary.frames.length - 1;
    (summary.won ? playSuccess : playFail)();
    render();
  };
  const step = () => {
    if (anim.frameIndex >= summary.frames.length - 1) return showResult();
    anim.frameIndex++;
    const events = summary.frames[anim.frameIndex].events;
    if (events.some((e) => (e.type === "bite" && e.hit) || e.type === "breach" || e.type === "downed")) playHit();
    render();
    battleTimer = setTimeout(step, BATTLE_TICK_MS);
  };
  anim.skip = showResult;
  anim.finish = () => {
    clearTimeout(battleTimer);
    battleAnimation = null;
    afterResult();
  };
  battleAnimation = anim;
  playHit();
  render();
  battleTimer = setTimeout(step, 900);
}

function resolveCurrentTurn() {
  if (state.turn === 1) {
    G.resolveTraining(state);
    G.advanceTurn(state);
    render();
  } else if (state.turn === 2) {
    const summary = G.resolveExploration(state);
    const showReport = () => {
      if (!summary.teamsSent && !summary.raid) {
        G.advanceTurn(state);
        render();
        return;
      }
      expeditionReport = { summary, phase: "travel" };
      render();
      setTimeout(() => {
        if (!expeditionReport) return;
        expeditionReport.phase = "report";
        (summary.successes > 0 || summary.raid?.won ? playSuccess : playFail)();
        render();
      }, 1700);
    };
    if (summary.raid && !summary.raid.calledOff) playRaidFight(summary.raid, showReport);
    else showReport();
  } else {
    const summary = G.resolveDefense(state);
    playGridBattle(summary, () => {
      // A won battle can roll a facility raid or an Assault opportunity that must be handled
      // (assigning raid defenders, or answering the Assault popup) before the day advances —
      // resolveFacilityRaid/resolveAssault call advanceTurn themselves once that happens.
      if (!state.pendingRaid && !state.pendingAssault) G.advanceTurn(state);
      render();
    });
  }
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
    case "remove-lounge":
      G.setLoungeToday(state, el.dataset.id, false);
      render();
      break;
    case "remove-infirmary":
      G.setInfirmaryToday(state, el.dataset.id, false);
      render();
      break;
    case "cook-dish":
      if (!G.cookDish(state, el.dataset.id)) flash("Can't cook that right now.");
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
    case "assault-chase": {
      const result = G.resolveAssault(state, true);
      if (!result) {
        render();
        break;
      }
      battleAnimation = { kind: "assault", summary: result, phase: "clash" };
      playHit();
      render();
      setTimeout(() => {
        battleAnimation.phase = "result";
        (result.won ? playSuccess : playFail)();
        render();
        setTimeout(() => {
          battleAnimation = null;
          render();
        }, 1200);
      }, 1300);
      break;
    }
    case "assault-decline":
      G.resolveAssault(state, false);
      render();
      break;
    case "remove-scrapyard":
      G.setScrapyardToday(state, el.dataset.id, false);
      render();
      break;
    case "remove-ranch":
      G.setRanchToday(state, el.dataset.id, false);
      render();
      break;
    case "open-plot":
      openPlot = { facility: el.dataset.facility, index: Number(el.dataset.index) };
      render();
      break;
    case "close-plot":
      openPlot = null;
      render();
      break;
    case "plant-plot":
      if (openPlot && !G.plantPlot(state, openPlot.facility, openPlot.index, el.dataset.id)) flash("You don't have any of those.");
      openPlot = null;
      render();
      break;
    case "clear-plot": {
      if (!openPlot) break;
      const plot = state.plots[openPlot.facility][openPlot.index];
      if (openPlot.facility === "ranch" || confirm(`Dig up the ${plot.id}? The seed will be lost.`)) {
        G.clearPlot(state, openPlot.facility, openPlot.index);
        openPlot = null;
      }
      render();
      break;
    }
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
      openPicker = null;
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
      openPicker = null;
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
      openPicker = null;
      openScoutHex = { q, r };
      render();
      break;
    }
    case "close-scout-report":
      scoutReport = null;
      render();
      break;
    case "open-nest":
      openCardId = null;
      openMissionLocationId = null;
      openRaid = null;
      openNest = { q: Number(el.dataset.q), r: Number(el.dataset.r), ids: [] };
      render();
      break;
    case "close-nest":
      openNest = null;
      render();
      break;
    case "attack-nest": {
      if (!openNest || !openNest.ids.length) break;
      const { q, r, ids } = openNest;
      const result = G.clearNest(state, q, r, ids);
      openNest = null;
      if (!result) {
        flash("Nobody fit enough to go.");
        render();
        break;
      }
      playSkirmish(ids[0], !result.won, () => {
        flash(result.won ? `Nest burned out! ${result.loot}.` : `The squad fell back${result.hurt.length ? ` — ${result.hurt.join(", ")}` : ""}.`);
        render();
      });
      break;
    }
    case "open-raid":
      openCardId = null;
      openMissionLocationId = null;
      openNest = null;
      openRaid = el.dataset.landmark;
      render();
      break;
    case "plan-raid":
      if (!G.setRaidTarget(state, el.dataset.landmark)) flash("That boss isn't back yet.");
      render();
      break;
    case "clear-raid":
      G.setRaidTarget(state, null);
      openRaid = null;
      render();
      break;
    case "close-raid":
      // An empty squad shouldn't leave a phantom raid planned.
      if (state.raidTarget === openRaid && !state.characters.some((c) => c.exploreTeam === G.RAID_TEAM)) G.setRaidTarget(state, null);
      openRaid = null;
      render();
      break;
    case "skip-raid":
      showRaidResult();
      break;
    case "finish-raid": {
      const after = raidFight?.after;
      raidFight = null;
      if (after) after();
      else render();
      break;
    }
    case "finish-expedition":
      expeditionReport = null;
      G.advanceTurn(state);
      render();
      break;
    case "close-scout":
      openScoutHex = null;
      render();
      break;
    case "confirm-scout": {
      if (!openScoutHex) break;
      const studentId = el.dataset.id;
      const { q, r } = openScoutHex;
      const result = G.scoutHex(state, studentId, q, r);
      openScoutHex = null;
      if (!result) {
        flash("Can't scout that hex.");
        render();
        break;
      }
      const scoutName = G.getChar(state, studentId).name;
      const finish = () => {
        if (result.ambushed) flash("Ambushed! The scout fled back to the school.");
        else scoutReport = { q, r, scoutName, result };
        render();
      };
      if (result.encountered) playSkirmish(studentId, result.ambushed, finish);
      else finish();
      break;
    }
    case "open-picker": {
      const kind = el.dataset.kind;
      const roomId = el.dataset.room || null;
      const postKey = el.dataset.post || null;
      const seatIndex = el.dataset.seat !== undefined ? Number(el.dataset.seat) : null;
      openCardId = null;
      openMissionLocationId = null;
      openScoutHex = null;
      openPicker = { kind, roomId, postKey, seatIndex };
      render();
      break;
    }
    case "close-picker":
      openPicker = null;
      render();
      break;
    case "open-defense-build": {
      openCardId = null;
      openMissionLocationId = null;
      openScoutHex = null;
      openPicker = null;
      openDefenseBuild = el.dataset.cell;
      render();
      break;
    }
    case "close-defense-build":
      openDefenseBuild = null;
      render();
      break;
    case "build-defense":
      if (!G.buildDefense(state, el.dataset.cell, el.dataset.structure)) flash("Can't build that here.");
      openDefenseBuild = null;
      render();
      break;
    case "clear-defense":
      G.clearDefense(state, el.dataset.cell);
      render();
      break;
    case "clear-entrance-student":
      G.clearEntranceStudentCell(state, el.dataset.cell);
      render();
      break;
    case "close-day-recap":
      dayRecap = null;
      render();
      break;
    case "skip-battle":
      if (battleAnimation && battleAnimation.skip) battleAnimation.skip();
      break;
    case "finish-battle":
      if (battleAnimation && battleAnimation.finish) battleAnimation.finish();
      break;
    case "buy-tech":
      if (!G.buyTech(state, el.dataset.id)) flash("Can't buy that yet.");
      render();
      break;
    case "repair-antenna":
      if (!G.repairAntenna(state)) flash("Not enough resources for that repair yet.");
      render();
      break;
    case "stay-after-rescue":
      G.stayAfterRescue(state);
      render();
      break;
    case "confirm-picker": {
      if (!openPicker) break;
      const id = el.dataset.id;
      const { kind, roomId, postKey, seatIndex } = openPicker;
      switch (kind) {
        case "gym-teacher": G.setTeacherPost(state, id, `gym:${postKey}`); break;
        case "gym-student": G.setGymToday(state, id, postKey); break;
        case "cafeteria-teacher": G.setTeacherPost(state, id, "cafeteria"); break;
        case "lounge-student": G.setLoungeToday(state, id, true); break;
        case "infirmary-teacher": G.setTeacherPost(state, id, "infirmary"); break;
        case "infirmary-student": G.setInfirmaryToday(state, id, true); break;
        case "classroom-teacher": G.setTeacherPost(state, id, `classroom:${roomId}`); break;
        case "classroom-seat": G.assignSeat(state, id, roomId, seatIndex); break;
        case "utility": G.setTeacherPost(state, id, postKey); break;
        case "farm": G.setFarmToday(state, id, true); break;
        case "scrapyard": G.setScrapyardToday(state, id, true); break;
        case "ranch": G.setRanchToday(state, id, true); break;
        case "entrance-student": G.placeEntranceStudent(state, roomId, id); break;
        default: break;
      }
      openPicker = null;
      render();
      break;
    }
    case "toggle-picker-sort-dir":
      pickerSortDir = pickerSortDir === "asc" ? "desc" : "asc";
      render();
      break;
    case "toggle-roster-sort-dir":
      rosterSortDir = rosterSortDir === "asc" ? "desc" : "asc";
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

// Info-dot tooltips open rightward from the dot; slide them back when that would run off the
// window (the bubble is at most min(280px, 76vw) wide — see .info-dot::after in style.css).
function placeInfoTip(e) {
  const dot = e.target.closest?.(".info-dot");
  if (!dot) return;
  const vw = document.documentElement.clientWidth;
  const tipWidth = Math.min(280, vw * 0.76);
  const left = dot.getBoundingClientRect().left - 8;
  const shift = Math.max(8 - left, Math.min(0, vw - 8 - tipWidth - left));
  dot.style.setProperty("--tip-shift", `${Math.round(shift)}px`);
}
root.addEventListener("pointerover", placeInfoTip);
root.addEventListener("focusin", placeInfoTip);

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && (openCardId || openMissionLocationId || openPlot || openRaid || openNest || scoutReport)) {
    openCardId = null;
    openPlot = null;
    openRaid = null;
    openNest = null;
    scoutReport = null;
    closeMissionModal();
    render();
  }
});

root.addEventListener("change", (e) => {
  const el = e.target.closest("[data-action]");
  if (!el) return;
  const action = el.dataset.action;

  switch (action) {
    case "set-picker-sort":
      pickerSortKey = el.value;
      render();
      break;
    case "set-roster-sort":
      rosterSortKey = el.value;
      render();
      break;
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
    case "toggle-nest-member": {
      if (!openNest) break;
      const id = el.dataset.id;
      openNest.ids = el.checked ? [...openNest.ids, id].slice(0, 3) : openNest.ids.filter((x) => x !== id);
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
      if (!G.setDefending(state, el.dataset.id, el.checked)) flash("No free spots left on the entrance grid.");
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
    case "toggle-sound": {
      setSoundEnabled(el.checked);
      if (el.checked) playSuccess();
      render();
      break;
    }
    case "equip-item": {
      if (el.value && !G.equipItem(state, el.dataset.id, el.dataset.slot, el.value)) {
        flash("Not strong/dextrous enough to wield that yet.");
      }
      render();
      break;
    }
    default:
      break;
  }
});

render();
