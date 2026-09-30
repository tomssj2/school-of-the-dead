import * as G from "./game.js";
import { renderApp, renderCharacterCard, renderMissionModal, renderAssaultModal, renderScoutModal, renderFightAnimation, renderPickerModal, renderBattleAnimation, renderDayRecap, renderDefenseBuildModal, renderPlotModal,
  renderScoutReport, renderNestModal, renderRaidModal, renderRaidFight, renderExpeditionReport,
  renderClearRoomModal, renderRoomFight, renderRoomUpgradeModal, renderEvacuationModal, renderMenuModal, renderQuarantineModal, tipFromText, setRoleTab,
  renderEncounterModal, renderExpeditionSkirmish,
  warnMenuIsOpen, toggleWarnMenu, toggleWarningKind, showAllWarnings } from "./ui.js";
import { recordRun } from "./score.js";
import { emptyEquipment, starterArmory, withTeacherHonorific, capTeacherGrades, repairIds, maxStaminaFor, maxHpFor } from "./characters.js";
import { playHit, playSuccess, playFail, playChime, isSoundEnabled, setSoundEnabled,
  playShot, playSwing, playCrit, playKill, playBoom, playGrowl, playAbility, playWave, playHeal } from "./sound.js";
import { applyGraphics, setGraphics, applyUiScale, setUiSize } from "./graphics.js";
import { maxOutSchool, infectStudents, buildRadio, addRecruits, exploreMap, mapEvents, setNight, forceFollowUp, armDefenders } from "./dev.js";
import {
  SUBJECTS, CLASSROOM_IDS, CLASSROOM_CAPACITY, GYM_CAPACITY, GYM_MAX_TEACHERS,
  CAFETERIA_MAX_TEACHERS, RESEARCH_ROOM_TEACHERS, FARM_CAPACITY, SCRAPYARD_CAPACITY,
  HAPPINESS_START, ENTRANCE_GRID_SIZE, ITEM_TEMPLATES, LEGENDARY_ITEM_TEMPLATES,
  INFIRMARY_CAPACITY, INFIRMARY_MAX_TEACHERS, STARTING_PANTRY, INGREDIENTS, LEGACY_DISH_IDS, STARTING_STOCK, FACILITY_PLOTS, PRODUCERS, WORK_SITES, NIGHT_ACTIONS, OBJECTIVES, ROOM_FIGHT_SQUAD, ROOM_MAX_LEVEL, LOCATIONS, LANDMARKS, LEGACY_POI_HEXES, LEGACY_LOCATION_IDS,
} from "./data.js";

const SAVE_KEY = "school-apocalypse-save-v1";

// Room sizes before rooms had levels and were shrunk — what older saves were built with.
const LEGACY_SIZE = { classroom: 24, gym: 5, farm: 10, ranch: 10, scrapyard: 10, gymTeachers: 2, cafeteriaTeachers: 3 };

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
let cardAsk = ""; // the open card is asking to confirm a "promote" or a "recruit"
let cardTab = "stats";
let rosterFilter = "student"; // the Roster shows students or teachers
let rosterSortKey = "name";
let rosterSortDir = "asc";
let openMissionLocationId = null;
let openScoutHex = null; // { q, r } or null
let fightAnimation = null; // { studentId, ambushed, phase: "clash" | "result" } or null
let battleAnimation = null; // { kind: "defense" | "exploration", summary, phase: "clash" | "result" } or null
let openPicker = null; // { kind, roomId, seatIndex, postKey } or null
let clearRoom = null; // { roomKey, ids } while picking a squad to clear a boarded-up room
let roomFight = null; // { report, frameIndex, phase } while a room-clearing fight replays
let scoutReport = null; // { q, r, scoutName, result } — what the last scout found
let openNest = null; // { q, r, ids } while picking a squad to clear a zombie nest
let openRaid = null; // LANDMARKS id whose raid screen is open
let raidFight = null; // { report, frameIndex, phase: "battle" | "result", after } while a raid replays
let expeditionReport = null; // { summary, phase: "travel" | "report" } at the end of Turn 2
let openUpgrade = null; // room key whose Upgrade popup is open
let openMenu = false; // the Cafeteria's menu pop-up
let openQuarantine = false; // the Nurse's Office quarantine pop-up
let assaultPick = null; // Set of ids picked to chase the retreating horde (all of tonight's defenders at first)
let openPlot = null; // { kind: a crop or animal (PRODUCERS id), index } of the Farm slot being looked at
let openDefenseBuild = null; // cell key ("row,col") of an empty middle-zone entrance cell, or null
let pickerSortKey = "level";
let pickerSortDir = "desc";
// who a picker recommends: "low" (the weakest in the stat — most to learn) or "high" (the strongest
// — push a specialist further); remembered in this browser
let pickerRecMode = (() => { try { return localStorage.getItem("sotd-picker-rec") === "high" ? "high" : "low"; } catch { return "low"; } })();
let lastResources = null; // resources/happiness snapshot from the previous render(), for floaties
let lastHappiness = null;
let lastPopulation = null;
let lastDay = state.day; // for the day-rollover chime, however the advance happened
let lastRenderedTab = null;
let floaties = [];
let floatyClearTimer = null;
let dayRecap = null; // { day, entries } shown once right after a day rolls over

const root = document.getElementById("app");

// Every hover tooltip in the game — title="…" text or data-tip="…" markup — shows in one styled
// box (the info dots' look) instead of the browser's plain one: a short delay, placed under the
// element (or above it near the bottom), kept inside the window. Rects come back in screen pixels,
// fixed positions are in layout pixels, hence the zoom.
const hoverTip = document.createElement("div");
hoverTip.className = "tip-box hover-tip";
hoverTip.setAttribute("role", "tooltip");
document.body.appendChild(hoverTip);
let tipTarget = null;
let tipTimer = 0;
function hideHoverTip() {
  clearTimeout(tipTimer);
  tipTarget = null;
  hoverTip.classList.remove("show");
}
function showHoverTip(el) {
  // An info dot carries its tooltip inside it (hidden); everything else in data-tip / title text.
  const html = el.classList.contains("info-dot") ? el.querySelector(".tip-box")?.innerHTML : el.dataset.tip || tipFromText(el.dataset.tipText || "");
  if (!html) return;
  hoverTip.innerHTML = html;
  hoverTip.classList.add("show");
  const zoom = parseFloat(document.documentElement.style.zoom) || 1;
  const r = el.getBoundingClientRect();
  const vw = window.innerWidth / zoom;
  const vh = window.innerHeight / zoom;
  const x = Math.max(8, Math.min(r.left / zoom, vw - 8 - hoverTip.offsetWidth));
  let y = r.bottom / zoom + 6;
  if (y + hoverTip.offsetHeight > vh - 8) y = Math.max(8, r.top / zoom - 6 - hoverTip.offsetHeight);
  hoverTip.style.left = `${Math.round(x)}px`;
  hoverTip.style.top = `${Math.round(y)}px`;
}
// Info dots show theirs straight away; other elements after a short pause, like the browser's.
document.addEventListener("pointerover", (e) => {
  const el = e.target.closest?.(".info-dot, [title], [data-tip], [data-tip-text]");
  if (!el) {
    if (tipTarget && !tipTarget.contains(e.target)) hideHoverTip();
    return;
  }
  // Take the text off title="" so the browser's own tooltip never shows.
  if (el.hasAttribute("title")) {
    el.dataset.tipText = el.getAttribute("title");
    el.removeAttribute("title");
  }
  if (el === tipTarget) return;
  hideHoverTip();
  tipTarget = el;
  tipTimer = setTimeout(() => { if (tipTarget === el && el.isConnected) showHoverTip(el); }, el.classList.contains("info-dot") ? 0 : 200);
});
document.addEventListener("pointerout", (e) => { if (tipTarget && !tipTarget.contains(e.relatedTarget)) hideHoverTip(); });
document.addEventListener("pointerdown", hideHoverTip, true);
document.addEventListener("scroll", hideHoverTip, true);
// Tapping (or tabbing to) an info dot focuses it: show its tooltip until focus moves on.
document.addEventListener("focusin", (e) => {
  const dot = e.target.closest?.(".info-dot");
  if (!dot) return;
  hideHoverTip();
  tipTarget = dot;
  showHoverTip(dot);
});
document.addEventListener("focusout", (e) => { if (e.target === tipTarget) hideHoverTip(); });

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
    if (c.stamina === undefined) c.stamina = maxStaminaFor(c);
    // Max stamina now grows with DEX + WIS (and Gym training) — recomputed on every load so it
    // always matches the grades.
    c.maxStamina = maxStaminaFor(c);
    c.stamina = Math.min(c.stamina, c.maxStamina);
    // Max HP now comes from CON and STR (plus Gym training) — also recomputed on every load.
    c.maxHp = maxHpFor(c.grades) + (c.trainedHp || 0);
    if (c.alive !== false) c.hp = Math.min(c.hp, c.maxHp);
    // Resting moved from the cafeteria to the lounge, and then to the Nurse's Office.
    delete c.cafeteriaToday;
    delete c.loungeToday;
    if (c.infirmaryToday === undefined) c.infirmaryToday = false;
    if (c.infirmaryToday === true) c.infirmaryToday = "heal";
    // Resting moved from the Nurse's Office to the Cafeteria.
    if (c.infirmaryToday === "rest") {
      c.infirmaryToday = false;
      c.restToday = true;
    }
    if (c.restToday === undefined) c.restToday = false;
    if (c.farmToday === undefined) c.farmToday = false;
    if (c.scrapyardToday === undefined) c.scrapyardToday = false;
    delete c.labToday; // the Lab was replaced by the Ranch
    delete c.bonds; // friendships and couples were removed
    // Levels come from experience now: a student keeps the level their grades gave them.
    if (c.level == null) {
      const avg = Object.values(c.grades).reduce((a, b) => a + b, 0) / Object.values(c.grades).length;
      c.level = c.role === "student" ? Math.min(10, Math.max(1, Math.floor(avg / 10))) : 1;
      c.exp = 0;
    }
    if (c.researchToday === undefined) c.researchToday = false;
    if (c.craftingToday === undefined) c.craftingToday = false;
    delete c.coupleId;
    // The Ranch was folded into the Farm: whoever worked it today works the Farm.
    if (c.ranchToday) c.farmToday = "animals";
    delete c.ranchToday;
    if (c.role === "teacher") {
      if (!/^(mr|mrs)\.\s/i.test(c.name)) c.name = withTeacherHonorific(c.name, c.gender);
      if (!c.teachSubject) {
        c.teachSubject = SUBJECTS.reduce((best, s) => (c.grades[s] > c.grades[best] ? s : best), SUBJECTS[0]);
      }
      capTeacherGrades(c);
      c.traits = [];
    }
  };
  s.characters.forEach(fixup);
  (s.recruitPool || []).forEach(fixup);

  migrateClassroomRooms(s);
  // A classroom with no teacher has no subject (saves from when rooms kept theirs).
  for (const id of CLASSROOM_IDS) {
    const room = s.rooms.classrooms?.[id];
    if (room && !s.characters.some((c) => c.role === "teacher" && c.alive && c.post === `classroom:${id}`)) room.subject = null;
  }
  if (!s.rooms.gym) s.rooms.gym = { studentCapacity: GYM_CAPACITY, teacherCapacity: GYM_MAX_TEACHERS };
  if (!s.rooms.cafeteria) s.rooms.cafeteria = { teacherCapacity: CAFETERIA_MAX_TEACHERS };
  // The Lounge is gone (students rest in the Nurse's Office now): refund what its upgrades cost.
  if (s.rooms.lounge) {
    const slotLevels = Math.max(0, Math.round((s.rooms.lounge.studentCapacity - 10) / 5));
    const restLevels = Math.max(0, Math.round((s.rooms.lounge.recovery - 50) / 15));
    let refund = 0;
    const legacyUpgradeCost = (l) => 15 * (l + 1);
    for (let l = 0; l < slotLevels; l++) refund += legacyUpgradeCost(l);
    for (let l = 0; l < restLevels; l++) refund += legacyUpgradeCost(l);
    if (refund) {
      s.resources.materials += refund;
      G.addLog(s, `🛏 The Lounge was turned over to the Nurse's Office — students rest there now. ${refund} scrap from its upgrades was refunded.`);
    }
    delete s.rooms.lounge;
  }
  if (!s.rooms.research) s.rooms.research = { teacherCapacity: RESEARCH_ROOM_TEACHERS };
  if (!s.rooms.farm) s.rooms.farm = { studentCapacity: FARM_CAPACITY };
  if (!s.rooms.scrapyard) s.rooms.scrapyard = { studentCapacity: SCRAPYARD_CAPACITY };
  delete s.rooms.lab;
  if (s.pendingRaid?.facility === "lab" || s.pendingRaid?.facility === "ranch") s.pendingRaid.facility = "farm";
  if (s.resources.research === undefined) s.resources.research = 0;
  if (s.resources.serum === undefined) s.resources.serum = 0;
  for (const c of s.characters) if (c.role === "teacher") c.injured = false; // teachers have no HP
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
  if (s.rescue === undefined) s.rescue = null;
  // The Student Council became the Radio Station, and the antenna repairs its upgrades: an old
  // save's repairs carry over, and a finished antenna keeps its rescue date.
  if (!s.rooms.radio) {
    const done = Math.min(5, s.radio?.stage ?? s.rescue?.stagesDone ?? 0);
    s.rooms.radio = { level: Math.max(1, done) };
    if (s.rescue && !s.rescue.evacuated && done < 5 && !s.rescue.landed) s.rescue = null;
    if (s.rescue) delete s.rescue.stagesDone;
  }
  delete s.radio; // the Radio Station's progress is its room level now
  s.boardedRooms = (s.boardedRooms || []).map((k) => (k === "council" ? "radio" : k));
  delete s.rooms.council;
  delete s.rooms.headmaster; // the office has no levels any more
  for (const c of s.characters) if (c.post === "council") c.post = null;
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
  if (!s.roomLevels && s.rooms.farm.plots === undefined) s.rooms.farm.plots = FACILITY_PLOTS.farm;
  // The Gym was split into PE / Gymnastics sides with per-side capacities: keep the upgrade
  // levels already bought, move gym teachers to the PE side, and send today's trainees there too.
  if (!s.gymSplit) {
    const studentLevel = Math.max(0, Math.round((s.rooms.gym.studentCapacity - 10) / 5));
    const teacherLevel = Math.max(0, s.rooms.gym.teacherCapacity - 3);
    s.rooms.gym.studentCapacity = LEGACY_SIZE.gym + 3 * studentLevel;
    s.rooms.gym.teacherCapacity = LEGACY_SIZE.gymTeachers + teacherLevel;
    for (const c of s.characters) {
      if (c.post === "gym") c.post = "gym:PE";
      if (c.gymToday === true) c.gymToday = "PE";
    }
    s.gymSplit = true;
  }
  // Gymnastics moved out of the Gym into its own room (briefly called the Dance Studio, key
  // "studio"): it starts with the same capacity, since upgrades bought for the old two-sided Gym
  // counted for both sides.
  if (s.rooms.studio) {
    s.rooms.acrobatics = s.rooms.studio;
    delete s.rooms.studio;
  }
  if (!s.rooms.acrobatics) s.rooms.acrobatics = { ...s.rooms.gym };
  // Rooms got levels (1-5) in place of separate upgrades per slot type: a room starts at 1 + the
  // upgrades already bought for it, and teachers beyond its new slots go back to unassigned.
  if (!s.roomLevels) {
    const r = s.rooms;
    const bought = (value, base, step) => Math.max(0, Math.round(((value ?? base) - base) / step));
    const trainingLevels = (room) => bought(room.studentCapacity, LEGACY_SIZE.gym, 3) + bought(room.teacherCapacity, LEGACY_SIZE.gymTeachers, 1);
    const upgrades = {
      gym: trainingLevels(r.gym),
      acrobatics: trainingLevels(r.acrobatics),
      cafeteria: bought(r.cafeteria.teacherCapacity, LEGACY_SIZE.cafeteriaTeachers, 1),
      research: bought(r.research.teacherCapacity, RESEARCH_ROOM_TEACHERS, 1),
      infirmary: bought(r.infirmary.studentCapacity, INFIRMARY_CAPACITY, 2) + (r.infirmary.care || 0),
      farm: bought(r.farm.studentCapacity, LEGACY_SIZE.farm, 5) + bought(r.farm.plots, FACILITY_PLOTS.farm, 2),
      ranch: r.ranch ? bought(r.ranch.studentCapacity, LEGACY_SIZE.ranch, 5) + bought(r.ranch.plots, FACILITY_PLOTS.ranch, 1) : 0,
      scrapyard: bought(r.scrapyard.studentCapacity, LEGACY_SIZE.scrapyard, 5),
    };
    for (const id of CLASSROOM_IDS) upgrades[`classroom:${id}`] = bought(r.classrooms[id].seats.length, LEGACY_SIZE.classroom, 6);
    r.crafting = r.crafting || {};
    delete r.infirmary.care;
    for (const key of G.ROOM_KEYS) {
      const room = G.roomState(s, key);
      if (!room.level) room.level = Math.min(ROOM_MAX_LEVEL, 1 + (upgrades[key] || 0));
    }
    if (r.ranch && !r.ranch.level) r.ranch.level = Math.min(ROOM_MAX_LEVEL, 1 + upgrades.ranch);
    for (const key of G.ROOM_KEYS) G.applyRoomLevel(s, key);
    s.roomLevels = true;
  }
  // The Ranch was folded into the Farm, its pens now the Farm's: the Farm keeps the higher of the
  // two levels.
  if (s.rooms.ranch) {
    s.rooms.farm.level = Math.min(ROOM_MAX_LEVEL, Math.max(s.rooms.farm.level || 1, s.rooms.ranch.level || 1));
    delete s.rooms.ranch;
  }
  // The Farm's slots were grouped by crop and animal: whatever was growing or penned moves into its
  // own group while there's a free slot (the rest goes back to the seed shed or the barn).
  if (Array.isArray(s.plots.farm) || Array.isArray(s.plots.ranch)) {
    const old = [...(s.plots.farm || []), ...(s.plots.ranch || [])];
    s.plots = {};
    G.syncPlots(s);
    for (const p of old) {
      if (!p.id || !s.plots[p.id]) continue;
      const slot = s.plots[p.id].find((x) => !x.id);
      if (slot) Object.assign(slot, { id: p.id, growth: p.growth });
      else G.addStock(s, p.id, 1);
    }
    delete s.rooms.farm.plots;
    delete s.rooms.farm.pens;
  }
  if (!s.defenseKits) s.defenseKits = {};
  for (const key of G.ROOM_KEYS) G.applyRoomLevel(s, key); // (also sets up the Scrapyard's piles and benches)
  // The Farm and the Scrapyard each have two crews: anyone working one from before joins its first
  // crew (the second once that's full), and whoever doesn't fit goes back to being free.
  for (const [site, def] of Object.entries(WORK_SITES)) {
    const crewSlots = G.siteWorkerSlots(s, site);
    const [first, second] = Object.keys(def.sides);
    const crews = { [first]: 0, [second]: 0 };
    for (const c of s.characters) {
      if (!c[def.flag]) continue;
      let side = c[def.flag] === true ? (crews[first] < crewSlots ? first : second) : c[def.flag];
      if (!(side in crews) || crews[side] >= crewSlots) side = false;
      c[def.flag] = side;
      if (side) crews[side]++;
    }
  }
  // A room holds only as many teachers as its level allows (1, then 2 at level 3, 3 at level 5):
  // any beyond that — from an older save with bigger rooms — go back to unassigned.
  const posted = {};
  for (const c of s.characters) {
    if (c.role !== "teacher" || !c.alive || !c.post) continue;
    posted[c.post] = (posted[c.post] || 0) + 1;
    if (posted[c.post] > (G.roomState(s, G.postRoomKey(c.post))?.teacherCapacity ?? 0)) G.setTeacherPost(s, c.id, null);
  }
  // Rooms were shrunk to fit the school (a level-1 classroom went from 24 seats to 12): anyone
  // sitting past a classroom's new last row moves to a free seat, or is left unseated if it's full.
  if (!s.roomSizesV2) {
    for (const id of CLASSROOM_IDS) {
      const room = s.rooms.classrooms[id];
      const seats = G.roomLevelStats(`classroom:${id}`, room.level).find((row) => row.id === "students").value;
      for (let i = seats; i < room.seats.length; i++) {
        const c = s.characters.find((x) => x.id === room.seats[i]);
        if (!c) continue;
        const free = room.seats.findIndex((x, j) => j < seats && !x);
        if (free >= 0) {
          room.seats[free] = c.id;
          c.seat = { room: id, index: free };
        } else {
          c.seat = null;
        }
      }
      room.seats.length = Math.min(room.seats.length, seats);
    }
    s.roomSizesV2 = true;
  }
  if (!s.runId) s.runId = G.newRunId();
  if (!s.boardedRooms) s.boardedRooms = []; // older saves already had every room open
  // Objectives and the room-fight tutorial are for new schools; an older save starts past them.
  if (!s.objectivesDone) s.objectivesDone = OBJECTIVES.map((o) => o.id);
  if (s.roomFightsDone === undefined) s.roomFightsDone = 1;
  if (s.expeditionsSent === undefined) s.expeditionsSent = 1;
  if (!s.nests) s.nests = [];
  if (!s.mapDrops) s.mapDrops = [];
  if (s.horde === undefined) s.horde = null;
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
  // Expedition teams are bought now: an old save keeps as many as it has in use (at least one).
  if (!s.teamSlots) s.teamSlots = Math.max(1, ...[0, 1, 2].filter((i) => s.teamLocations[i] || s.characters.some((c) => c.exploreTeam === i)).map((i) => i + 1));
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

// A place's pop-up only sends a team when asked (send-team), so closing it leaves nothing behind.
function closeMissionModal() {
  openMissionLocationId = null;
}

// Diffs resources/happiness against the previous render() so a floaty can pop up over whichever
// topbar stat changed — catches every source of change (turn resolution, upgrades, scouting,
// events, tech) in one place instead of instrumenting each action individually.
function computeFloaties() {
  const result = [];
  if (lastResources) {
    for (const key of ["food", "materials", "medicine", "research", "serum"]) {
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
  hideHoverTip(); // whatever it pointed at is about to be replaced
  if (!openCardId) cardAsk = ""; // a closed card takes its question with it
  const card = openCardId ? G.getCharAnywhere(state, openCardId) : null;
  if (openCardId && !card) openCardId = null; // e.g. expelled while card was open
  if (openScoutHex && (openScoutHex.drop ? !G.dropAt(state, openScoutHex.q, openScoutHex.r) : G.isHexExplored(state, openScoutHex.q, openScoutHex.r))) openScoutHex = null;

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

  // (The objectives are switched off for now — the Headmaster will hand out missions instead.)

  // Drives the time-of-day backdrop in style.css: morning, golden afternoon, starry night.
  document.body.dataset.turn = state.gameOver ? "over" : state.victory ? "victory" : String(state.turn);
  // Content eases in only when the tab actually changes, not on every re-render within a tab.
  const sameTab = activeTab === lastRenderedTab;
  root.classList.toggle("tab-enter", !sameTab);
  lastRenderedTab = activeTab;
  const modalHtml = roomFight
    ? renderRoomFight(state, roomFight)
    : raidFight
    ? renderRaidFight(state, raidFight)
    : encounter
    ? renderEncounterModal(state, encounter)
    : skirmish
    ? renderExpeditionSkirmish(state, skirmish)
    : expeditionReport
    ? renderExpeditionReport(state, expeditionReport)
    : battleAnimation
    ? renderBattleAnimation(state, battleAnimation)
    : fightAnimation
    ? renderFightAnimation(state, fightAnimation)
    : dayRecap
    ? renderDayRecap(dayRecap)
    : state.rescue?.landed && !state.gameOver
    ? renderEvacuationModal(state)
    : card
    ? renderCharacterCard(state, card, cardTab, cardAsk)
    : clearRoom
    ? renderClearRoomModal(state, clearRoom)
    : scoutReport
    ? renderScoutReport(state, scoutReport)
    : openRaid
    ? renderRaidModal(state, openRaid)
    : openNest
    ? renderNestModal(state, openNest)
    : openMissionLocationId
    ? renderMissionModal(state, openMissionLocationId)
    : openScoutHex
    ? renderScoutModal(state, openScoutHex.q, openScoutHex.r, openScoutHex.drop)
    : openPicker
    ? renderPickerModal(state, openPicker, pickerSortKey, pickerSortDir, pickerRecMode)
    : openDefenseBuild
    ? renderDefenseBuildModal(state, openDefenseBuild)
    : openMenu
    ? renderMenuModal(state)
    : openQuarantine
    ? renderQuarantineModal(state)
    : openUpgrade
    ? renderRoomUpgradeModal(state, openUpgrade)
    : openPlot
    ? renderPlotModal(state, openPlot.kind, openPlot.index)
    : state.pendingAssault
    ? renderAssaultModal(state, assaultPick || (assaultPick = new Set(G.assaultCandidates(state).map((c) => c.id))))
    : "";
  // The page never scrolls — the content area does — so keep it where it was within the same tab.
  const contentScroll = sameTab ? root.querySelector(".content")?.scrollTop || 0 : 0;
  if (state.gameOver || state.victory) recordRun(state, G.aliveChars(state).length);
  root.innerHTML = renderApp(state, activeTab, rosterFilter, floaties, rosterSortKey, rosterSortDir) + modalHtml;
  const newContent = root.querySelector(".content");
  if (newContent) newContent.scrollTop = contentScroll;
  fitCityMap();
}

// The exploration map and its side panel fill exactly the space left under the screen's header,
// and the town inside is scaled to show the part that matters (the view the map asks for in
// data-view, in art pixels) as big as fits — up to 3.5x, so early on it's close in on the school.
function fitCityMap() {
  const layout = root.querySelector(".explore-layout");
  const map = layout?.querySelector(".citymap");
  const content = root.querySelector(".content");
  if (!map || !content) return;
  const zoom = parseFloat(document.documentElement.style.zoom) || 1;
  const box = content.getBoundingClientRect();
  const above = (layout.getBoundingClientRect().top - box.top) / zoom + content.scrollTop;
  let height = Math.max(360, Math.floor(box.height / zoom - above - 20));
  layout.style.height = `${height}px`;
  const over = content.scrollHeight - content.clientHeight; // the card's own padding below it
  if (over > 0 && height > 360) layout.style.height = `${(height = Math.max(360, height - over))}px`;
  placeCamera(map);
}

// ---------- the Night Watch board: drag defenders about, see what they reach ----------
// Drag a student from the roster (or the board) onto a square of the steps — onto someone else
// swaps them — or back onto the roster to take them off watch.
let dragStudentId = null;
const clearDropHighlights = () => document.querySelectorAll(".nw-drop-over").forEach((x) => x.classList.remove("nw-drop-over"));
document.addEventListener("dragstart", (e) => {
  const el = e.target.closest?.("[data-drag-student]");
  if (!el) return;
  dragStudentId = el.dataset.dragStudent;
  e.dataTransfer.effectAllowed = "move";
  e.dataTransfer.setData("text/plain", dragStudentId);
  hideHoverTip();
  requestAnimationFrame(() => document.body.classList.add("nw-dragging"));
});
document.addEventListener("dragend", () => {
  dragStudentId = null;
  document.body.classList.remove("nw-dragging");
  clearDropHighlights();
});
document.addEventListener("dragover", (e) => {
  if (!dragStudentId) return;
  const target = e.target.closest?.("[data-drop-cell], [data-drop-roster], [data-drop-team], [data-drop-role]");
  document.querySelectorAll(".nw-drop-over").forEach((x) => x !== target && x.classList.remove("nw-drop-over"));
  if (!target) return;
  e.preventDefault();
  target.classList.add("nw-drop-over");
});
document.addEventListener("drop", (e) => {
  if (!dragStudentId) return;
  const cell = e.target.closest?.("[data-drop-cell]");
  const roster = e.target.closest?.("[data-drop-roster]");
  const role = e.target.closest?.("[data-drop-role]");
  const slot = e.target.closest?.("[data-drop-team]");
  if (!cell && !roster && !role && !slot) return;
  e.preventDefault();
  const id = dragStudentId;
  dragStudentId = null;
  document.body.classList.remove("nw-dragging");
  if (slot) {
    // an expedition team's slot: onto someone swaps them out
    const team = Number(slot.dataset.dropTeam);
    const occupant = slot.dataset.occupant;
    if (occupant && occupant !== id) G.setExploreTeam(state, occupant, null);
    if (!G.assignTeamSlot(state, id, team, slot.dataset.slotRole)) {
      if (occupant && occupant !== id) G.setExploreTeam(state, occupant, team);
      flash("They can't join that team.");
    }
    render();
    return;
  }
  if (role) {
    // the Exploration tab's role windows
    G.setExploreRole(state, id, role.dataset.dropRole);
    render();
    return;
  }
  const live = battleAnimation?.live && battleAnimation.b.phase === "break" ? battleAnimation : null;
  if (cell && live) {
    // between waves: move a defender on the battle board
    const [row, col] = cell.dataset.dropCell.split(",").map(Number);
    if (G.battleMoveDefender(state, live.b, id, row, col)) live.frameIndex = live.b.frames.length - 1;
  } else if (cell) {
    if (!G.moveEntranceStudent(state, cell.dataset.dropCell, id)) flash("They can't stand watch tonight.");
  } else if (!battleAnimation) {
    const key = Object.keys(state.entranceGrid.students).find((k) => state.entranceGrid.students[k] === id);
    if (key) G.clearEntranceStudentCell(state, key);
  }
  render();
});

// Hovering a defender lights up the squares they reach: melee close in, ranged further out.
let reachEl = null;
document.addEventListener("pointerover", (e) => {
  const el = e.target.closest?.("[data-reach]") || null;
  if (el === reachEl) return;
  reachEl = el;
  document.querySelectorAll(".nw-reach-melee, .nw-reach-ranged, .nw-reach-self").forEach((x) => x.classList.remove("nw-reach-melee", "nw-reach-ranged", "nw-reach-self"));
  if (!el || document.body.classList.contains("nw-dragging")) return;
  const [row, col, melee, ranged] = el.dataset.reach.split(",").map(Number);
  el.closest(".nw-board")?.querySelectorAll(".nw-cell").forEach((cell) => {
    const d = Math.max(Math.abs(cell.dataset.row - row), Math.abs(cell.dataset.col - col));
    const cls = d === 0 ? "nw-reach-self" : d <= melee ? "nw-reach-melee" : d <= ranged ? "nw-reach-ranged" : null;
    if (cls) cell.classList.add(cls);
  });
});

// The player's own zoom on top of the fit: mapCam.z times the fitted scale (1 = the whole view),
// looking at world point (x, y) — kept across re-renders until reset.
let mapCam = { z: 1, x: null, y: null };
const MAP_MAX_SCALE = 5;

function mapFit(map) {
  const [vx, vy, vw, vh] = map.dataset.view.split(",").map(Number);
  const cw = map.clientWidth;
  const ch = map.clientHeight;
  return { vx, vy, vw, vh, cw, ch, s: Math.min(cw / vw, ch / vh, 3.5) };
}

function placeCamera(map) {
  const f = mapFit(map);
  const zMax = Math.max(1, MAP_MAX_SCALE / f.s);
  mapCam.z = Math.min(Math.max(1, mapCam.z), zMax);
  const s = f.s * mapCam.z;
  // Zoomed in, the centre can move anywhere that keeps the view box's edge on screen.
  const halfW = f.cw / 2 / s;
  const halfH = f.ch / 2 / s;
  const clampTo = (v, lo, hi) => (lo > hi ? (lo + hi) / 2 : Math.min(Math.max(v, lo), hi));
  if (mapCam.z <= 1 || mapCam.x === null) {
    mapCam.x = f.vx + f.vw / 2;
    mapCam.y = f.vy + f.vh / 2;
  }
  mapCam.x = clampTo(mapCam.x, f.vx + halfW, f.vx + f.vw - halfW);
  mapCam.y = clampTo(mapCam.y, f.vy + halfH, f.vy + f.vh - halfH);
  // Zoomed far out (a small screen, the whole town explored), names shrink to their icon.
  map.classList.toggle("cm-compact", s < 1.35);
  map.classList.toggle("cm-zoomed", mapCam.z > 1.001);
  map.style.setProperty("--s", s.toFixed(4));
  map.style.setProperty("--ox", `${(f.cw / 2 - mapCam.x * s).toFixed(1)}px`);
  map.style.setProperty("--oy", `${(f.ch / 2 - mapCam.y * s).toFixed(1)}px`);
}

// Mouse wheel: zoom towards the cursor.
document.addEventListener("wheel", (e) => {
  const map = e.target.closest?.(".citymap");
  if (!map) return;
  e.preventDefault();
  const f = mapFit(map);
  const rect = map.getBoundingClientRect();
  const zoom = parseFloat(document.documentElement.style.zoom) || 1;
  const mx = (e.clientX - rect.left) / zoom;
  const my = (e.clientY - rect.top) / zoom;
  const s = f.s * mapCam.z;
  const ox = f.cw / 2 - mapCam.x * s;
  const oy = f.ch / 2 - mapCam.y * s;
  const wx = (mx - ox) / s; // the world point under the cursor stays put
  const wy = (my - oy) / s;
  mapCam.z = Math.min(Math.max(1, mapCam.z * Math.exp(-e.deltaY * 0.0015)), Math.max(1, MAP_MAX_SCALE / f.s));
  const s2 = f.s * mapCam.z;
  mapCam.x = wx - (mx - f.cw / 2) / s2;
  mapCam.y = wy - (my - f.ch / 2) / s2;
  placeCamera(map);
}, { passive: false });

// Drag to pan while zoomed in. A drag doesn't count as a click on whatever it started over.
let mapDrag = null;
document.addEventListener("pointerdown", (e) => {
  const map = e.target.closest?.(".citymap");
  if (!map || e.button !== 0 || mapCam.z <= 1.001) return;
  mapDrag = { map, x: e.clientX, y: e.clientY, cx: mapCam.x, cy: mapCam.y, moved: false };
});
document.addEventListener("pointermove", (e) => {
  if (!mapDrag) return;
  const zoom = parseFloat(document.documentElement.style.zoom) || 1;
  const dx = (e.clientX - mapDrag.x) / zoom;
  const dy = (e.clientY - mapDrag.y) / zoom;
  if (!mapDrag.moved && Math.hypot(dx, dy) < 4) return;
  mapDrag.moved = true;
  mapDrag.map.classList.add("cm-dragging");
  const s = mapFit(mapDrag.map).s * mapCam.z;
  mapCam.x = mapDrag.cx - dx / s;
  mapCam.y = mapDrag.cy - dy / s;
  placeCamera(mapDrag.map);
});
document.addEventListener("pointerup", () => {
  if (!mapDrag) return;
  mapDrag.map.classList.remove("cm-dragging");
  if (mapDrag.moved) {
    const swallow = (ev) => { ev.stopPropagation(); ev.preventDefault(); };
    document.addEventListener("click", swallow, { capture: true, once: true });
    setTimeout(() => document.removeEventListener("click", swallow, { capture: true }), 0);
  }
  mapDrag = null;
});

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
    const f = report.frames[raidFight.frameIndex];
    if (f.dealt) playSwing();
    if (f.crits) playCrit();
    if (f.hits.some((h) => h.dmg)) playHit();
    if (f.bossHp <= 0) playKill();
    else if (f.enraged && !report.frames[raidFight.frameIndex - 1]?.enraged) playGrowl();
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

// Replays a room-clearing fight a round at a time (slower on the tutorial fight, to read the tips).
let roomFightTimer = null;
function playRoomFight(report) {
  roomFight = { report, frameIndex: 0, phase: "battle" };
  playHit();
  render();
  const tick = report.tutorial ? 2200 : 900;
  const step = () => {
    if (!roomFight || roomFight.phase !== "battle") return;
    if (roomFight.frameIndex >= report.frames.length - 1) {
      showRoomFightResult();
      return;
    }
    roomFight.frameIndex++;
    playHit();
    render();
    roomFightTimer = setTimeout(step, tick);
  };
  roomFightTimer = setTimeout(step, tick);
}
function showRoomFightResult() {
  if (!roomFight || roomFight.phase !== "battle") return;
  clearTimeout(roomFightTimer);
  roomFight.phase = "result";
  roomFight.frameIndex = roomFight.report.frames.length - 1;
  (roomFight.report.won ? playSuccess : playFail)();
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

// One turn of a fight, heard: a sound for each kind of thing that happened (once each, so a
// volley doesn't turn into noise), the biggest last.
function playBattleSounds(events) {
  const has = (fn) => events.some(fn);
  if (has((e) => e.type === "attack" && e.hit && e.kind === "ranged")) playShot();
  if (has((e) => e.type === "attack" && e.hit && e.kind === "melee")) playSwing();
  if (has((e) => e.type === "attack" && e.crit)) playCrit();
  if (has((e) => e.type === "kill")) playKill();
  if (has((e) => (e.type === "bite" || e.type === "spit") && e.hit)) playHit();
  if (has((e) => e.type === "heal")) playHeal();
  if (has((e) => e.type === "ability")) playAbility();
  if (has((e) => e.type === "bossArrives" || e.type === "telegraph" || e.type === "enrage")) playGrowl();
  if (has((e) => e.type === "gate" || e.type === "breach" || e.type === "destroyed" || e.type === "slam" || e.type === "fire")) playBoom();
  if (has((e) => e.type === "cleared")) playWave();
}

// The night battle, played live: a turn every BATTLE_TICK_MS. It waits at the break between
// waves (for "Send them in") and while a night action is being aimed; "Skip" plays the rest out
// at once, and "Continue" on the result screen runs `afterResult` to finish the turn.
const BATTLE_TICK_MS = 650;
let battleTimer = null;
function playNightBattle(afterResult) {
  const b = G.startNightBattle(state);
  const anim = { kind: "grid", live: true, b, summary: b, frameIndex: 0, phase: "battle", target: null };
  const sync = () => { anim.frameIndex = b.frames.length - 1; };
  const showResult = () => {
    if (anim.phase !== "battle") return;
    clearTimeout(battleTimer);
    anim.target = null;
    anim.summary = { ...b, ...G.finishNightBattle(state, b) };
    anim.phase = "result";
    sync();
    (anim.summary.won ? playSuccess : playFail)();
    render();
  };
  const step = () => {
    clearTimeout(battleTimer);
    if (anim.phase !== "battle" || anim.target) return; // done, or paused while aiming
    if (b.phase === "done") return showResult();
    let lastKill = false;
    if (b.phase === "fight") {
      const frame = G.battleTick(state, b);
      playBattleSounds(frame.events);
      lastKill = b.phase === "done" && frame.events.some((e) => e.type === "kill");
    }
    sync();
    render();
    if (b.phase === "fight") battleTimer = setTimeout(step, BATTLE_TICK_MS);
    // the last kill lingers a moment (the board goes slow-motion) before the result
    else if (b.phase === "done") battleTimer = setTimeout(showResult, lastKill ? 1800 : 900);
    // a break waits for the player
  };
  anim.resume = step;
  // after a night action: show what it did, then carry on a turn later
  anim.resumeSoon = () => {
    clearTimeout(battleTimer);
    sync();
    playBattleSounds(b.frames[b.frames.length - 1].events);
    render();
    if (b.phase === "fight") battleTimer = setTimeout(step, BATTLE_TICK_MS);
  };
  anim.skip = () => {
    if (anim.phase !== "battle") return;
    clearTimeout(battleTimer);
    anim.target = null;
    G.runNightBattle(state, b);
    showResult();
  };
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

// Turn 2, once the encounters are settled: the teams go in, fight it out (the skirmish, a beat
// every SKIRMISH_BEAT_MS), then the report — or a raid's fight first, if a squad went raiding.
let encounter = null; // { queue: [{ teamIndex, id }], idx, result }
let skirmish = null; // { summary, beat }
const SKIRMISH_BEAT_MS = 850;
function runExpeditions() {
  const summary = G.resolveExploration(state);
  const report = () => {
    expeditionReport = { summary, phase: "report" };
    (summary.successes > 0 || summary.raid?.won ? playSuccess : playFail)();
    render();
  };
  const showReport = () => {
    if (!summary.teamsSent && !summary.raid) {
      G.advanceTurn(state);
      render();
      return;
    }
    if (!summary.teamsSent) {
      // only a raid: the old walk out, then the report
      expeditionReport = { summary, phase: "travel" };
      render();
      setTimeout(() => expeditionReport && report(), 1700);
      return;
    }
    // the teams fight their way in, a beat at a time
    skirmish = { summary, beat: 0 };
    render();
    const beat = () => {
      if (!skirmish) return;
      skirmish.beat++;
      const teams = summary.teams;
      if (skirmish.beat === 1) { playSwing(); playShot(); }
      if (skirmish.beat === 2 && teams.some((t) => Object.keys(t.hurtIds).length || t.lostIds.length)) playHit();
      if (skirmish.beat === 3) (teams.some((t) => t.success) ? playKill : playFail)();
      render();
      if (skirmish.beat < 3) setTimeout(beat, SKIRMISH_BEAT_MS);
      else setTimeout(() => { skirmish = null; report(); }, 1400);
    };
    setTimeout(beat, SKIRMISH_BEAT_MS);
  };
  if (summary.raid && !summary.raid.calledOff) playRaidFight(summary.raid, showReport);
  else showReport();
}

function resolveCurrentTurn() {
  if (state.turn === 1) {
    G.resolveTraining(state);
    G.advanceTurn(state);
    render();
  } else if (state.turn === 2) {
    // each team sent meets an encounter on the way in first (encounter-pick / encounter-next)
    const sent = G.sentTeams(state);
    if (sent.length) {
      encounter = { queue: sent.map((teamIndex) => ({ teamIndex, id: G.pickEncounter() })), idx: 0, result: null };
      playGrowl();
      render();
      return;
    }
    runExpeditions();
  } else {
    playNightBattle(() => {
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
  // the Turn 1 warnings drop-down closes on any click outside it
  if (warnMenuIsOpen() && !e.target.closest(".ov-warn-dd")) {
    toggleWarnMenu(false);
    if (!e.target.closest("[data-action]")) render();
  }
  const el = e.target.closest("[data-action]");
  if (!el) return;
  const action = el.dataset.action;

  switch (action) {
    case "encounter-pick": {
      // who handles the team's encounter: it's rolled at once
      if (!encounter || encounter.result) break;
      const cur = encounter.queue[encounter.idx];
      encounter.result = G.resolveEncounter(state, cur.teamIndex, cur.id, el.dataset.role);
      (encounter.result.ok ? playSuccess : playFail)();
      render();
      break;
    }
    case "encounter-next":
      if (!encounter?.result) break;
      if (encounter.idx < encounter.queue.length - 1) {
        encounter.idx++;
        encounter.result = null;
        playGrowl();
        render();
      } else {
        encounter = null;
        runExpeditions();
      }
      break;
    case "open-missions":
      // the Headmaster's missions aren't in yet
      flash("📜 The Headmaster's missions are coming soon.");
      break;
    case "toggle-warn-menu":
      toggleWarnMenu();
      render();
      break;
    case "toggle-warning":
      toggleWarningKind(el.dataset.kind);
      render();
      break;
    case "show-all-warnings":
      showAllWarnings(state.turn);
      render();
      break;
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
    case "locked-slot":
      flash(el.dataset.msg);
      break;
    case "remove-gym":
      G.setGymToday(state, el.dataset.id, false);
      render();
      break;
    case "remove-rest":
      G.setRestToday(state, el.dataset.id, false);
      render();
      break;
    case "remove-radio":
      G.setRadioToday(state, el.dataset.id, false);
      render();
      break;
    case "remove-research":
      G.setResearchToday(state, el.dataset.id, false);
      render();
      break;
    case "remove-crafting":
      G.setCraftingToday(state, el.dataset.id, false);
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
    case "assault-toggle": {
      // who runs the horde down: tonight's defenders still standing, all of them unless unpicked
      const id = el.dataset.id;
      if (assaultPick.has(id)) assaultPick.delete(id);
      else assaultPick.add(id);
      render();
      break;
    }
    case "assault-chase": {
      const report = G.resolveAssault(state, true, [...assaultPick]);
      assaultPick = null;
      if (!report?.chased && report?.frames) playRaidFight(report, () => render());
      else render();
      break;
    }
    case "assault-decline":
      G.resolveAssault(state, false);
      assaultPick = null;
      render();
      break;
    case "raid-defender-toggle":
      G.setRaidDefender(state, el.dataset.id, !state.raidDefenders.includes(el.dataset.id));
      render();
      break;
    case "site-auto": {
      const site = el.dataset.site;
      const n = G.autoAssignSite(state, site);
      const name = WORK_SITES[site].name;
      flash(n ? `Assigned ${n} student${n === 1 ? "" : "s"} to the ${name}.` : `Nobody free has the stamina for a day at the ${name}.`);
      render();
      break;
    }
    case "remove-scrapyard":
      G.setScrapyardToday(state, el.dataset.id, false);
      render();
      break;
    case "open-plot":
      openPlot = { kind: el.dataset.kind, index: Number(el.dataset.index) };
      render();
      break;
    case "close-plot":
      openPlot = null;
      render();
      break;
    case "plant-plot": {
      // an empty slot plants its own crop / pens its own animal straight from stock
      const kind = el.dataset.kind;
      if (!G.plantPlot(state, kind, Number(el.dataset.index))) flash(`No ${PRODUCERS[kind].stockPlural.toLowerCase()} left — find more on expeditions.`);
      render();
      break;
    }
    case "clear-plot": {
      if (!openPlot) break;
      const { kind, index } = openPlot;
      if (PRODUCERS[kind].facility === "ranch" || confirm(`Dig up the ${PRODUCERS[kind].name.toLowerCase()}? The seed will be lost.`)) {
        G.clearPlot(state, kind, index);
        openPlot = null;
      }
      render();
      break;
    }
    case "open-menu":
      openMenu = true;
      render();
      break;
    case "close-menu":
      openMenu = false;
      render();
      break;
    case "open-quarantine":
      openQuarantine = true;
      render();
      break;
    case "close-quarantine":
      openQuarantine = false;
      render();
      break;
    case "open-upgrade":
      openUpgrade = el.dataset.room;
      render();
      break;
    case "close-upgrade":
      openUpgrade = null;
      render();
      break;
    case "confirm-upgrade":
      if (openUpgrade && !G.upgradeRoom(state, openUpgrade)) flash("Not enough scrap for that upgrade yet.");
      render();
      break;
    case "repair-room":
      if (openUpgrade && !G.repairRoom(state, openUpgrade)) flash("Not enough scrap for the repairs yet.");
      render();
      break;
    case "promote":
      G.promoteToTeacher(state, el.dataset.id);
      render();
      break;
    case "ask-promote":
    case "ask-recruit":
      openCardId = el.dataset.id;
      cardTab = "stats";
      cardAsk = action === "ask-promote" ? "promote" : "recruit";
      render();
      break;
    case "confirm-recruit":
    case "never-recruit": {
      const index = state.recruitPool.findIndex((r) => r.id === el.dataset.id);
      if (action === "confirm-recruit") G.acceptRecruit(state, index);
      else G.rejectRecruit(state, index);
      openCardId = null;
      render();
      break;
    }
    case "confirm-promote":
      G.promoteToTeacher(state, el.dataset.id);
      openCardId = null;
      render();
      break;
    case "never-promote":
      G.setNeverPromote(state, el.dataset.id, true);
      openCardId = null;
      render();
      break;
    case "allow-promote":
      G.setNeverPromote(state, el.dataset.id, false);
      render();
      break;
    case "expel":
      {
        const c = G.getChar(state, el.dataset.id);
        if (c && confirm(`Expel ${c.name} from the school? This cannot be undone.`)) {
          G.expelCharacter(state, el.dataset.id);
          if (openCardId === el.dataset.id) openCardId = null;
          render();
        }
      }
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
      // the place's pop-up: send one of the free teams (built in the side panel), or recall it
      const locationId = el.dataset.location;
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
    case "map-reset": {
      mapCam = { z: 1, x: null, y: null };
      const map = root.querySelector(".citymap");
      if (map) placeCamera(map);
      break;
    }
    case "open-drop": {
      const q = Number(el.dataset.q);
      const r = Number(el.dataset.r);
      if (!G.dropAt(state, q, r)) break;
      openCardId = null;
      openMissionLocationId = null;
      openPicker = null;
      openScoutHex = { q, r, drop: true };
      render();
      break;
    }
    case "open-clear-room":
      openCardId = null;
      clearRoom = { roomKey: el.dataset.room, ids: [] };
      render();
      break;
    case "close-clear-room":
      clearRoom = null;
      render();
      break;
    case "go-clear-room": {
      if (!clearRoom || !clearRoom.ids.length) break;
      const report = G.fightForRoom(state, clearRoom.roomKey, clearRoom.ids);
      clearRoom = null;
      if (!report) {
        flash("Can't clear it right now.");
        render();
        break;
      }
      playRoomFight(report);
      break;
    }
    case "skip-room-fight":
      showRoomFightResult();
      break;
    case "finish-room-fight":
      roomFight = null;
      render();
      break;
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
      const { q, r, drop } = openScoutHex;
      const result = drop ? G.collectDrop(state, studentId, q, r) : G.scoutHex(state, studentId, q, r);
      openScoutHex = null;
      if (!result) {
        flash(drop ? "Can't get there right now." : "Can't scout that hex.");
        render();
        break;
      }
      const scoutName = G.getChar(state, studentId).name;
      const finish = () => {
        if (result.ambushed) flash(drop ? "Ambushed! The runner fled back to the school." : "Ambushed! The scout fled back to the school.");
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
    case "nw-quick": {
      // a roster chip: post them to the first free square of the steps, or take them off watch
      const id = el.dataset.id;
      const key = Object.keys(state.entranceGrid.students).find((k) => state.entranceGrid.students[k] === id);
      if (key) G.clearEntranceStudentCell(state, key);
      else {
        const free = G.firstFreeEntranceCell(state);
        if (!free) flash("The steps are full — drag someone off first.");
        else if (!G.moveEntranceStudent(state, free, id)) flash("They can't stand watch tonight.");
      }
      render();
      break;
    }
    case "close-day-recap":
      dayRecap = null;
      render();
      break;
    case "skip-battle":
      if (battleAnimation && battleAnimation.skip) battleAnimation.skip();
      break;
    case "night-action": {
      // a night action: Rally goes off at once, the rest wait for a square (the battle pauses)
      const anim = battleAnimation;
      if (!anim?.live || anim.phase !== "battle") break;
      const id = el.dataset.id;
      if (!NIGHT_ACTIONS[id].target) {
        if (!G.battleAction(state, anim.b, id)) flash("Can't do that right now.");
        anim.resumeSoon();
        break;
      }
      clearTimeout(battleTimer);
      anim.target = anim.target === id ? null : id;
      render();
      if (!anim.target) anim.resume();
      break;
    }
    case "night-target": {
      const anim = battleAnimation;
      if (!anim?.target) break;
      if (!G.battleAction(state, anim.b, anim.target, Number(el.dataset.row), Number(el.dataset.col))) {
        flash(anim.target === "focus" ? "Pick a square with a zombie on it." : anim.target === "patch" ? "Pick a hurt defender." : "Can't do that right now.");
        break;
      }
      anim.target = null;
      anim.resumeSoon();
      break;
    }
    case "use-ability": {
      // a charged defender's ability goes off; the fight carries on a moment later
      const anim = battleAnimation;
      if (!anim?.live || anim.phase !== "battle") break;
      if (!G.battleUseAbility(state, anim.b, el.dataset.id)) {
        flash("Nothing in reach for that yet.");
        break;
      }
      anim.resumeSoon();
      break;
    }
    case "toggle-auto-abilities":
      if (battleAnimation?.live) {
        G.setAutoAbilities(battleAnimation.b, !battleAnimation.b.autoAbilities);
        render();
      }
      break;
    case "night-cancel":
      if (battleAnimation?.target) {
        battleAnimation.target = null;
        battleAnimation.resume();
      }
      break;
    case "start-wave":
      if (battleAnimation?.live) {
        G.startNextWave(battleAnimation.b);
        battleAnimation.resume();
      }
      break;
    case "finish-battle":
      if (battleAnimation && battleAnimation.finish) battleAnimation.finish();
      break;
    case "buy-tech":
      if (!G.buyTech(state, el.dataset.id)) flash("Can't buy that yet.");
      render();
      break;
    case "radio-upgrade":
      if (!G.buildRadioUpgrade(state)) flash("Not enough resources for that upgrade yet.");
      render();
      break;
    case "evac-go":
      G.evacuate(state);
      activeTab = "overview";
      render();
      break;
    case "evac-delay":
      G.delayEvacuation(state);
      render();
      break;
    case "cure-infection":
      if (!G.cureInfection(state, el.dataset.id)) flash("You need a vial of antiviral serum to cure an infection.");
      render();
      break;
    case "set-gfx":
      setGraphics(el.dataset.gfx);
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
        case "infirmary-teacher": G.setTeacherPost(state, id, "infirmary"); break;
        case "infirmary-student": G.setInfirmaryToday(state, id, "heal"); break;
        case "cafeteria-rest": G.setRestToday(state, id, true); break;
        case "radio-student": G.setRadioToday(state, id, true); break;
        case "research-student": G.setResearchToday(state, id, true); break;
        case "crafting-student": G.setCraftingToday(state, id, true); break;
        case "classroom-teacher": G.setTeacherPost(state, id, `classroom:${roomId}`); break;
        case "classroom-seat": G.assignSeat(state, id, roomId, seatIndex); break;
        case "utility": G.setTeacherPost(state, id, postKey); break;
        case "farm": G.setFarmToday(state, id, postKey); break;
        case "scrapyard": G.setScrapyardToday(state, id, postKey); break;
        case "entrance-student": G.placeEntranceStudent(state, roomId, id); break;
        case "team-slot": if (!G.assignTeamSlot(state, id, Number(roomId), postKey)) flash("They can't join that team."); break;
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
    case "set-role-tab":
      setRoleTab(el.dataset.role);
      render();
      break;
    case "reset-roles":
      G.resetExploreRoles(state);
      render();
      break;
    case "set-picker-rec":
      pickerRecMode = el.dataset.mode === "high" ? "high" : "low";
      try { localStorage.setItem("sotd-picker-rec", pickerRecMode); } catch {}
      render();
      break;
    case "toggle-roster-sort-dir":
      rosterSortDir = rosterSortDir === "asc" ? "desc" : "asc";
      render();
      break;
    case "clear-mission": {
      // recall: the team stays together, it just isn't going anywhere
      G.setTeamLocation(state, Number(el.dataset.team), null);
      openMissionLocationId = null;
      render();
      break;
    }
    case "send-team": {
      if (!openMissionLocationId) break;
      if (!G.setTeamLocation(state, Number(el.dataset.team), openMissionLocationId)) flash("That team can't go there.");
      openMissionLocationId = null;
      render();
      break;
    }
    case "buy-team":
      if (!G.buyTeamSlot(state)) flash("Not enough scrap.");
      render();
      break;
    case "team-remove":
      G.setExploreTeam(state, el.dataset.id, null);
      render();
      break;
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
  if (e.key === "Escape" && battleAnimation?.target) {
    battleAnimation.target = null; // stop aiming a night action
    battleAnimation.resume();
    return;
  }
  if (e.key === "Escape" && (openCardId || openMissionLocationId || openPlot || openUpgrade || openMenu || openQuarantine || openRaid || openNest || scoutReport || clearRoom)) {
    openCardId = null;
    openUpgrade = null;
    openMenu = false;
    openQuarantine = false;
    clearRoom = null;
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
    case "set-ui-size":
      setUiSize(el.value);
      render();
      break;
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
    case "toggle-clear-member": {
      if (!clearRoom) break;
      const id = el.dataset.id;
      clearRoom.ids = el.checked ? [...clearRoom.ids, id].slice(0, ROOM_FIGHT_SQUAD) : clearRoom.ids.filter((x) => x !== id);
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

// PC only: laid out for a 1080p window and zoomed to fit the real one (plus the UI Size setting),
// in a fixed-height frame — see applyUiScale() in graphics.js.
applyUiScale();
window.addEventListener("resize", () => {
  applyUiScale(); // the zoom first, then the map refits under it
  fitCityMap();
});
applyGraphics();

// Test shortcuts, only when the game runs on this computer (the /max and /min project commands
// run these): schoolDev.max() puts every room at level 5 with every slot filled; schoolDev.min()
// brings back the game as it was before max()/infect() — or a fresh one after a reload;
// schoolDev.infect(n, serum) quarantines n students in the Nurse's Office (and optionally sets the
// serum count). Nothing is saved.
if (["localhost", "127.0.0.1"].includes(location.hostname)) {
  let beforeMax = null;
  window.schoolDev = {
    max() {
      if (!beforeMax) beforeMax = JSON.stringify(state);
      const summary = maxOutSchool(state);
      render();
      return summary;
    },
    min() {
      state = beforeMax ? JSON.parse(beforeMax) : G.createInitialState();
      const restored = !!beforeMax;
      beforeMax = null;
      openPicker = null;
      openUpgrade = null;
      openMenu = false;
      openQuarantine = false;
      openCardId = null;
      render();
      return restored ? "restored the game from before max()" : "started a fresh game (nothing to restore)";
    },
    infect(n = 3, serum = null) {
      if (!beforeMax) beforeMax = JSON.stringify(state);
      if (serum !== null) state.resources.serum = serum;
      const summary = infectStudents(state, n);
      render();
      return summary;
    },
    // schoolDev.radio(stage): build the Radio Station up to `stage` (5 = satellite) for free.
    radio(stage = 5) {
      if (!beforeMax) beforeMax = JSON.stringify(state);
      const summary = buildRadio(state, stage);
      render();
      return summary;
    },
    // schoolDev.recruits(n): n survivors waiting to join in the Headmaster's Office.
    recruits(n = 4) {
      if (!beforeMax) beforeMax = JSON.stringify(state);
      const summary = addRecruits(state, n);
      render();
      return summary;
    },
    // schoolDev.explore(rings): lift the fog out to `rings` hexes from the school (7 = everything).
    explore(rings) {
      if (!beforeMax) beforeMax = JSON.stringify(state);
      const summary = exploreMap(state, rings);
      render();
      return summary;
    },
    // schoolDev.night(day): the Night Watch of that day, best fighters on the steps.
    night(day) {
      if (!beforeMax) beforeMax = JSON.stringify(state);
      const summary = setNight(state, day);
      activeTab = "overview";
      render();
      return summary;
    },
    // schoolDev.arm(): everyone on watch gets an axe and a bow.
    arm() {
      if (!beforeMax) beforeMax = JSON.stringify(state);
      const summary = armDefenders(state);
      render();
      return summary;
    },
    // schoolDev.followUp("assault" | "farm" | "scrapyard"): a chase or a facility raid, as after a won night.
    followUp(kind) {
      if (!beforeMax) beforeMax = JSON.stringify(state);
      const summary = forceFollowUp(state, kind);
      assaultPick = null;
      activeTab = "overview";
      render();
      return summary;
    },
    // schoolDev.mapEvents(): the wandering horde on the map (or a block further on) and 3 supply drops.
    mapEvents() {
      if (!beforeMax) beforeMax = JSON.stringify(state);
      const summary = mapEvents(state);
      render();
      return summary;
    },
  };
}

render();
