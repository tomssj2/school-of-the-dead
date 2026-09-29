import {
  CLASSROOM_IDS, SUBJECTS, SUBJECT_LABEL, STAT_OF_SUBJECT, STAT_LABEL, TRAITS,
  CLASSROOM_CAPACITY, LOCATIONS,
  GRADE_TIERS, SKILL_TREE, ROOM_MAX_LEVEL, STUDENT_MAX_LEVEL, xpToNextLevel, CRAFT_HELP_DEX_PER_POINT, roomUpgradeCost,
  FARM_YIELD_FOOD, SCRAPYARD_YIELD_MATERIALS, TECH_TREE, ROOM_LEVELS, ROOM_TEACHER_LEVELS, CAFETERIA_RATIONS_BY_LEVEL,
  ITEM_TEMPLATES, LEGENDARY_ITEM_TEMPLATES, DEFENSE_STRUCTURES, zombieCountForDay, zombieStatsForDay,
  ZOMBIE_TYPES, hordeComposition, isBossNight, bossNameForDay,
  DISHES, INGREDIENTS, PRODUCERS, FARM_GROUPS, FARM_SLOTS_BY_LEVEL, PLOTS_PER_WORKER, GYM_SIDES, NO_TEACHER_CAP, INFIRMARY_MEDICINE_PER_PATIENT, INFIRMARY_BED_REST, INFIRMARY_NURSE_HP_PER_RANK,
  RESEARCH_ROOM_INT_PER_POINT, MEDICINE_PER_STABILIZE, TECH_BRANCHES, STAT_EFFECTS, SKILL_EFFECTS,
  MAP_DROPS, RESCUE_DELAY_DAYS, RADIO_UPGRADES, RESCUE_ARRIVAL_DAYS, RADIO_CHA_PER_PERCENT, LANDMARKS, BOARDED_ROOMS, ROOM_FIGHT_SQUAD, ROOM_FIGHT_STAMINA, RAID_MAX_TEAM, RAID_MAX_ROUNDS, NEST_CLEAR_STAMINA, NEST_CLEAR_MAX,
} from "./data.js";
import {
  overallLevel, gradeLetter, effectiveGrade, equipmentBonus, availableSkillPoints, teachingBonus,
  bestClassroomSubjectFor, stripHonorific,
} from "./characters.js";
import {
  getChar, aliveChars, PROMOTE_LEVEL_THRESHOLD, teacherCount, workerYield, crafterGain, craftHelpGain, promotable, researchCrew, radioRecruitChance, radioStage, satelliteReady, radioCrew, radioCrewBonus, trainingGain, healAmount, treatedPatientIds, infectedChars, infectionDaysLeft, infirmaryBedsUsed, roomState, roomLevel, roomLevelStats, roomUpgradeCostFor, roomRepairCost, infirmaryNurseBonus,
  isHexExplored, canScoutHex, dropAt, nearHorde, meetsItemRequirement, canCookDish, cooksOnDuty, researchRoomYield,
  techPerk, gateHp, infirmaryHeal, nurseHpBonus, cafeteriaRest, dishCapacity, exploreStaminaCost, tendedPlots, stockLabel, facilityWorkers,
  gymTeachers, gymLesson, promotionSlots, recruitSlots, classroomLesson, classGain, gymRoom, isBoarded, roomFightOdds, canFightForRoom, roomLabel, currentObjective, objectiveProgress, isNest, nextToNest, nestClearChance, scoutCost, scoutEncounterChance, raidCooldownLeft, raidBoss, raidEstimate, RAID_TEAM,
} from "./game.js";
import {
  hexTileKey, tileBackground, hexTerrain, TERRAIN_NAMES, locationAt, landmarkAt, MAP_RADIUS, isSchoolHex,
} from "./map.js";
import { hexToWorld, viewBox, cityBaseUrl, fogUrl, WORLD_W, WORLD_H } from "./citymap.js";
import { zombieSprite } from "./zombies.js";
import { characterSprite } from "./sprite.js";
import { getBest, isBestRun } from "./score.js";
import { getGraphics, GFX_LEVELS, getUiSize, UI_SIZES } from "./graphics.js";
import { sceneBackground, pixelIcon, moodIcon } from "./scenes.js";
import { isSoundEnabled } from "./sound.js";

const TURN_NAMES = { 1: "Classes (Morning)", 2: "Exploration (Afternoon)", 3: "Defense (Night)" };

// ---------- hex map (Turn 2) ----------

const LOCATION_ICON = {
  corner_store: "🏪",
  pharmacy: "💊",
  supermarket: "🛒",
  hardware_store: "🔧",
  hospital: "🏥",
  police_station: "🚓",
  mall: "🛍",
  neighborhood: "🏘",
  farmstead: "🚜",
  gas_station: "⛽",
  garden_center: "🌻",
  fire_station: "🚒",
  church: "⛪",
  marina: "⚓",
  warehouse: "📦",
  library: "📚",
  petting_zoo: "🐐",
  army_surplus: "🎖",
  checkpoint: "🪖",
  stadium: "🏟",
  institute: "🧬",
};
const RESOURCE_ICON = { food: "🍞", materials: "🔧", medicine: "💊", research: "🧠", serum: "💉" };

// Expedition teams 1-3 and the raid squad each get a colour for their route, markers and chips.
const TEAM_COLORS = ["#4caf7d", "#3fa7d6", "#e0a536", "#e0455f"];
const teamLabel = (i) => (i === RAID_TEAM ? "Raid squad" : `Team ${i + 1}`);

function hexDistance(q, r) {
  return (Math.abs(q) + Math.abs(r) + Math.abs(q + r)) / 2;
}

// All axial hexes within `radius` of the school, minus the school grounds themselves.
const HEX_RADIUS = MAP_RADIUS;
function hexesInRadius(radius) {
  const hexes = [];
  for (let q = -radius; q <= radius; q++) {
    for (let r = -radius; r <= radius; r++) {
      if (isSchoolHex(q, r)) continue;
      if (hexDistance(q, r) <= radius) hexes.push({ q, r });
    }
  }
  return hexes;
}


function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function hpBar(c) {
  const pct = Math.max(0, Math.round((c.hp / c.maxHp) * 100));
  const cls = pct < 35 ? "hp-low" : pct < 70 ? "hp-mid" : "hp-high";
  return `<div class="hpbar"><div class="hpfill ${cls}" style="width:${pct}%"></div><span>${c.hp}/${c.maxHp}</span></div>`;
}

function staminaBar(c) {
  const pct = Math.max(0, Math.round((c.stamina / c.maxStamina) * 100));
  const cls = pct <= 0 ? "stamina-empty" : pct < 35 ? "stamina-low" : "stamina-ok";
  return `<div class="hpbar staminabar"><div class="hpfill ${cls}" style="width:${pct}%"></div><span>${c.stamina}/${c.maxStamina}</span></div>`;
}

// The room's one Upgrade button, in the bottom-left corner of its banner (roomScene's `actions`):
// it opens a popup with what the next level brings. Nothing at max level (the plaque says MAX
// instead), unless a raid left something to repair.
function roomUpgradeButton(state, key) {
  if (key === "radio") return radioStage(state) >= RADIO_UPGRADES.length ? "" : `<button class="scene-upgrade" data-action="open-upgrade" data-room="radio">Upgrade</button>`;
  const cost = roomUpgradeCostFor(state, key);
  const repair = roomRepairCost(state, key);
  if (cost === null && !repair) return "";
  return `<button class="scene-upgrade ${repair ? "scene-upgrade-damaged" : ""}" data-action="open-upgrade" data-room="${key}">${repair ? "⚠ " : ""}${cost === null ? "Repair" : "Upgrade"}</button>`;
}

const levelBadge = (state, key) => {
  const level = roomLevel(state, key);
  return level >= ROOM_MAX_LEVEL ? `<span class="plaque-level plaque-max">MAX</span>` : `<span class="plaque-level">Lv ${level}</span>`;
};

// "Gymnasium", "Biology" / "Classroom 2" — how the popup titles a room.
function roomTitle(state, key) {
  if (key.startsWith("classroom:")) return roomDisplayName(state, key.split(":")[1]);
  return ROOM_LEVELS[key].name;
}

// The Upgrade popup: the room's level, what each of its numbers goes to at the next level (the
// ones that change are highlighted), the cost, and a repair if a raid broke a worker slot.
export function renderRoomUpgradeModal(state, key) {
  if (key === "radio") return renderRadioUpgradeModal(state);
  const level = roomLevel(state, key);
  const maxed = level >= ROOM_MAX_LEVEL;
  const now = roomLevelStats(key, level);
  const next = maxed ? null : roomLevelStats(key, level + 1);
  const cost = roomUpgradeCostFor(state, key);
  const scrap = state.resources.materials;
  const repair = roomRepairCost(state, key);
  const damage = roomState(state, key).damage || 0;
  const pips = Array.from({ length: ROOM_MAX_LEVEL }, (_, i) =>
    `<span class="upg-pip ${i < level ? "upg-pip-on" : i === level ? "upg-pip-next" : ""}"></span>`).join("");
  const rows = now.map((row, i) => {
    const up = next && next[i].value !== row.value;
    return `<div class="upg-row ${up ? "upg-row-up" : ""}"><span>${row.label}</span><span>${row.text}${up ? ` <span class="upg-arrow">→</span> <b>${next[i].text}</b>` : ""}</span></div>`;
  }).join("");
  return `<div class="modal-overlay" data-action="close-upgrade">
    <div class="char-card mission-card upgrade-modal" data-action="noop">
      <button class="cc-close" data-action="close-upgrade" title="Close">✕</button>
      <h3>${esc(roomTitle(state, key))}</h3>
      <div class="upg-level"><span>${maxed ? `Level ${level} · <b>Max</b>` : `Level ${level} → <b>Level ${level + 1}</b>`}</span><span class="upg-pips">${pips}</span></div>
      <div class="upg-rows">${rows}</div>
      ${damage ? `<div class="upg-damage">⚠ A raid broke ${damage} worker slot${damage === 1 ? "" : "s"}.
        <button class="btn btn-sm" data-action="repair-room" ${scrap < repair ? "disabled" : ""}>🔧 Repair (${repair} scrap)</button></div>` : ""}
      ${maxed ? `<p class="muted upg-note">This room is fully upgraded.</p>` : `<div class="upg-actions">
        <button class="btn btn-primary" data-action="confirm-upgrade" ${scrap < cost ? "disabled" : ""}>Upgrade · ${cost} scrap</button>
        ${scrap < cost ? `<span class="muted">You have ${scrap}/${cost} scrap</span>` : ""}
      </div>`}
    </div>
  </div>`;
}

// The Radio Station's upgrades, one per level, in a pop-up like the other rooms' — the next one
// can be built here (in scrap and research).
function renderRadioUpgradeModal(state) {
  const level = radioStage(state);
  const room = state.rooms.radio;
  const costLabel = (cost) => Object.entries(cost || {}).map(([res, amt]) => `${TECH_EFFECT_ICON[res]} ${amt}`).join(" ");
  const rows = RADIO_UPGRADES.map((up, i) => {
    const affordable = Object.entries(up.cost || {}).every(([res, amt]) => (state.resources[res] || 0) >= amt);
    const status = i < level
      ? '<span class="tag tag-ok">✓ Done</span>'
      : i === level
      ? `<button class="btn btn-sm btn-primary" data-action="radio-upgrade" ${affordable ? "" : "disabled"}>Build ${costLabel(up.cost)}</button>`
      : `<span class="radio-locked">🔒 ${costLabel(up.cost)}</span>`;
    const effect = up.id === "satellite" ? "" : ` · base ${Math.round(up.baseChance * 100)}% a day`;
    return `<div class="radio-row ${i < level ? "radio-done" : ""} ${i === level ? "radio-next" : ""}">
      <span class="radio-lv">Lv ${i + 1}</span>
      <span class="radio-icon">${up.icon}</span>
      <span class="radio-text"><b>${esc(up.name)}</b><small>${esc(up.desc)}${effect}</small></span>
      ${status}
    </div>`;
  }).join("");
  const pips = Array.from({ length: RADIO_UPGRADES.length }, (_, i) =>
    `<span class="upg-pip ${i < level ? "upg-pip-on" : i === level ? "upg-pip-next" : ""}"></span>`).join("");
  return `<div class="modal-overlay" data-action="close-upgrade">
    <div class="char-card mission-card upgrade-modal radio-modal" data-action="noop">
      <button class="cc-close" data-action="close-upgrade" title="Close">✕</button>
      <h3>Radio Station</h3>
      <div class="upg-level"><span>${level >= RADIO_UPGRADES.length ? `Level ${level} · <b>Max</b>` : `Level ${level} → <b>Level ${level + 1}</b>`}</span><span class="upg-pips">${pips}</span></div>
      <p class="muted upg-note">Each level adds an on-air student slot (${room.studentCapacity} now); an assistant teacher joins at level 5.</p>
      <div class="radio-list">${rows}</div>
    </div>
  </div>`;
}

// A student's level tooltip: experience toward the next level, and how it's earned.
function levelTip(c) {
  const lv = overallLevel(c);
  if (lv >= STUDENT_MAX_LEVEL) return { title: `⭐ Level ${lv} — max`, notes: ["Can be promoted to teacher in the Headmaster's Office"] };
  return {
    title: `⭐ Level ${lv}`,
    rows: [["Experience", `${c.exp || 0}/${xpToNextLevel(lv)}`]],
    notes: ["Earned in classes, training and work (+8–10 a day)", "Scouting, expeditions, defending and raids give more", `Level ${STUDENT_MAX_LEVEL} unlocks promotion to teacher`],
  };
}

function statChips(c) {
  if (c.role === "teacher") {
    return `<div class="stat-chips">
      ${SUBJECTS.map((s) => {
        const specialty = s === c.teachSubject;
        return `<span class="chip ${specialty ? "chip-specialty" : ""}" title="${SUBJECT_LABEL[s]}${specialty ? " (specialty)" : ""}">${STAT_OF_SUBJECT[s]} ${gradeLetter(c.grades[s])}</span>`;
      }).join("")}
    </div>`;
  }
  const studentStats = [
    ["STR", "Strength (PE)", c.grades.PE],
    ["DEX", "Dexterity (Gymnastics)", c.grades.Gymnastics],
    ["CON", "Constitution (Biology)", c.grades.Biology],
    ["INT", "Intelligence (Physics)", c.grades.Physics],
    ["WIS", "Wisdom (History)", c.grades.History],
    ["CHA", "Charisma (Social Studies)", c.grades.SocialStudies],
  ];
  const best = Math.max(...studentStats.map(([, , v]) => v));
  return `<div class="stat-chips">
    ${studentStats
      .map(([label, title, val]) => {
        const top = val === best;
        return `<span class="chip ${top ? "chip-specialty" : ""}" title="${title}${top ? " (highest)" : ""}">${label} ${val}</span>`;
      })
      .join("")}
  </div>`;
}

// Bolds whichever of STR/DEX is higher — used in the compact defender-picking lists (Night
// Watch, facility raids) that only show these two combat stats, not the full statChips().
function strDexLabel(c) {
  const str = c.grades.PE;
  const dex = c.grades.Gymnastics;
  const max = Math.max(str, dex);
  const strHtml = str === max ? `<b class="stat-top">STR ${str}</b>` : `STR ${str}`;
  const dexHtml = dex === max ? `<b class="stat-top">DEX ${dex}</b>` : `DEX ${dex}`;
  return `${strHtml} ${dexHtml}`;
}

// Letter grade (+ the flat bonus a teacher's grade gives students while teaching), used
// wherever a teacher is being assigned to a post.
function teachBonusLabel(gradeValue) {
  return `${gradeLetter(gradeValue)} (+${teachingBonus(gradeValue)})`;
}

// "🦠 infected · 3 days left" — the last day reads "dies tonight".
function infectionTag(state, c) {
  const left = infectionDaysLeft(state, c);
  return `<span class="tag tag-infected" title="Cure with antiviral serum in the Nurse's Office by the end of day ${c.infection.dueDay}">🦠 infected · ${left <= 0 ? "dies tonight" : `${left} day${left === 1 ? "" : "s"} left`}</span>`;
}

function statusTag(c, state = null) {
  if (!c.alive) return `<span class="tag tag-dead">deceased</span>`;
  if (c.infection) return state ? infectionTag(state, c) : `<span class="tag tag-infected">🦠 infected</span>`;
  if (c.injured) return `<span class="tag tag-injured">injured</span>`;
  return `<span class="tag tag-ok">healthy</span>`;
}

// How the UI names people: a teacher by title and surname ("Mrs. Wilson"), a student by first
// name ("Ella"). The full name stays on their card, in the Roster and in hover tooltips.
function shortName(c) {
  const parts = stripHonorific(c.name).split(" ");
  if (c.role !== "teacher") return parts[0];
  const title = c.name.match(/^(mr|mrs|ms|dr|miss)\.?(?=\s)/i)?.[0];
  const surname = parts[parts.length - 1];
  return title ? `${title} ${surname}` : surname;
}

function nameTag(c, { icon = true } = {}) {
  const role = icon ? `${c.role === "teacher" ? "🎓" : "🧳"} ` : "";
  const legendary = c.legendary ? "✨ " : "";
  return `<span class="unit-link" data-action="open-card" data-id="${c.id}" title="${esc(c.name)}">${legendary}${role}${esc(shortName(c))}</span>`;
}

// A room's staff on one row: its teacher (cook, nurse…) and the assistant slot, each with the
// person's card, an Assign button when someone is free to fill it, or a greyed-out lock until the
// room reaches the level that opens it. The first one posted is the teacher; the second the assistant.
function staffLine(state, label, teachers, capacity, rowHtml, pickerAttrs) {
  const free = state.characters.some((c) => c.role === "teacher" && c.alive && !c.infection && !c.post);
  const unlockLevel = ROOM_TEACHER_LEVELS[0];
  const slot = (i, name) => {
    let body;
    if (teachers[i]) body = `<ul class="assign-list staff-list">${rowHtml(teachers[i])}</ul>`;
    else if (i >= capacity) {
      body = `<button class="staff-locked" data-action="locked-slot" data-msg="The ${name.toLowerCase()} slot unlocks when this room reaches level ${unlockLevel}." title="Unlocks at room level ${unlockLevel}">🔒 Lv ${unlockLevel}</button>`;
    } else if (free) body = `<button class="btn btn-sm staff-add" ${pickerAttrs} title="Assign a teacher">+ Assign</button>`;
    else body = `<span class="staff-none" title="Every teacher already has a post">none free</span>`;
    return `<span class="mini-label ${i >= capacity ? "staff-label-locked" : ""}">${name}</span><div class="staff-slot">${body}</div>`;
  };
  return `<div class="staff-row">${slot(0, label)}${slot(1, "Assistant")}</div>`;
}

// A teacher in a room's staff list: name and their grade for the job, four to a line; the ✕
// shows on hover. `detail` is short (a grade letter and bonus); `title` says it in full.
function staffRow(t, detail, title = "") {
  return `<li title="${esc(title || t.name)}"><span class="assign-who">${nameTag(t, { icon: false })}</span><span class="staff-grade">${detail}</span><button class="btn-x" data-action="clear-post" data-id="${t.id}" title="Remove ${esc(t.name)}">✕</button></li>`;
}

// A generic classroom shows as "Classroom N" until a teacher claims it, then as its subject.
function roomDisplayName(state, roomId) {
  const room = state.rooms.classrooms[roomId];
  if (!room) return `Classroom ${roomId}`;
  return room.subject ? SUBJECT_LABEL[room.subject] : `Classroom ${roomId}`;
}

const TEACHER_POST_LABEL = {
  "gym:PE": "Gymnasium",
  "gym:Gymnastics": "Acrobatics",
  cafeteria: "Cafeteria",
  infirmary: "Nurse's Office",
  research: "Research Room",
  crafting: "Crafting Room",
  radio: "Radio Station",
};

// Where a character currently is — a teacher's post, or a student's active daily assignment
// (defending/exploring/gym/cafeteria take priority over their home classroom for the day).
function occupationLabel(state, c) {
  if (c.infection) return "Quarantined (Nurse's Office)";
  if (c.role === "teacher") {
    if (!c.post) return "Unassigned";
    if (c.post.startsWith("classroom:")) return roomDisplayName(state, c.post.split(":")[1]);
    return TEACHER_POST_LABEL[c.post] || c.post;
  }
  if (c.defending) return "Defending";
  if (c.exploreTeam !== null) return c.exploreTeam === RAID_TEAM ? "Raiding" : `Exploring (Team ${c.exploreTeam + 1})`;
  if (c.infirmaryToday) return "Nurse's Office";
  if (c.restToday) return "Resting (Cafeteria)";
  if (c.radioToday) return "Radio Station";
  if (c.researchToday) return "Research Room";
  if (c.craftingToday) return "Crafting Room";
  if (c.gymToday) return GYM_SIDES[c.gymToday].room;
  if (c.farmToday) return "Farm";
  if (c.scrapyardToday) return "Scrapyard";
  if (c.seat) return roomDisplayName(state, c.seat.room);
  return "Unassigned";
}

// Like nameTag, but swaps the role emoji for a mini version of the character's own card portrait.
function rosterNameTag(c) {
  const portrait = characterSprite(c, 40);
  return `<span class="roster-name unit-link" data-action="open-card" data-id="${c.id}">
    <span class="mini-portrait ${!c.alive ? "cc-dead" : ""}">${portrait}</span>
    <span>${c.legendary ? "✨ " : ""}${esc(c.name)}</span>
  </span>`;
}

// ---------- person tiles ----------
// Someone working in a room, as a small portrait tile: sprite, first name, anything extra (a
// treatment toggle, an infection countdown) and their HP/stamina bar, with a ✕ on hover to take
// them off the job. Rooms list their people as a grid of these — with a dashed "+" tile for each
// free slot — so a full, upgraded room stays compact and keeps the same height as it fills up.
function personTile(c, { bar = "", extra = "", remove = "", title = "", cls = "" } = {}) {
  return `<div class="person-tile ${cls}" title="${esc(title || c.name)}">
    ${remove ? `<button class="btn-x pt-x" data-action="${remove}" data-id="${c.id}" title="Remove ${esc(c.name)}">✕</button>` : ""}
    <span class="pt-portrait" data-action="open-card" data-id="${c.id}">${characterSprite(c, 30)}</span>
    <span class="pt-name unit-link" data-action="open-card" data-id="${c.id}">${esc(shortName(c))}</span>
    ${extra}
    ${bar}
  </div>`;
}

// "100 → 110": what a stat is now and what today's job takes it to (just "100 max" / "full" when
// there's nothing left to gain; "max" is red, so a maxed-out student stands out to be moved).
// Shown on a tile in place of an HP/stamina bar.
function gainLine(from, to, done = "max") {
  return to > from
    ? `<span class="pt-gain">${from} → <b>${to}</b></span>`
    : `<span class="pt-gain pt-gain-done ${done === "max" ? "pt-gain-max" : ""}">${from} ${done}</span>`;
}

// The tiles plus one dashed "+" tile per free slot (each opens the picker).
function tileGrid(tiles, freeSlots, pickerAttrs) {
  const empty = Array.from({ length: Math.max(0, freeSlots) }, () =>
    `<button class="person-tile pt-empty" ${pickerAttrs} title="Assign someone">+</button>`).join("");
  return `<div class="person-tiles">${tiles.join("")}${empty}</div>`;
}

// ---------- room scenes ----------

// Tooltip contents, built to scan rather than read: a title, an optional breakdown — rows of
// [label, value, cls] and a total — and a few one-line notes. Never a paragraph.
function tip({ title = "", rows = [], total = null, notes = [] } = {}) {
  const row = ([label, value, cls = ""]) =>
    `<span class="tip-label ${cls}">${label}</span><span class="tip-value ${cls} ${/^[−-]\d/.test(String(value)) ? "tip-neg" : ""}">${value}</span>`;
  // Only spans (styled as blocks), so a tooltip can sit inside a <p> or a heading.
  return (title ? `<span class="tip-title">${title}</span>` : "")
    + (rows.length ? `<span class="tip-rows">${rows.map(row).join("")}${total ? row([total[0], total[1], "tip-total"]) : ""}</span>` : "")
    + (notes.length ? `<span class="tip-notes">${notes.map((n) => `<span class="tip-note">${n}</span>`).join("")}</span>` : "");
}
// Hover/focus "i" holding a tooltip: a tip() spec, or one short line of text.
function infoDot(content) {
  const html = tip(typeof content === "string" ? { notes: [esc(content)] } : content);
  const plain = html.replace(/<\/(li|div|span)>/g, " ").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
  return `<span class="info-dot" tabindex="0" aria-label="${esc(plain)}">i<span class="tip-box" role="tooltip">${html}</span></span>`;
}
// "No teacher yet" and the like: a greyed-out breakdown row.
const tipNone = (label, value) => [label, value, "tip-dim"];
// A hover tooltip with tip() markup, for an element's attributes (main.js shows it on hover).
const tipAttr = (spec) => `data-tip="${esc(tip(spec))}"`;
// A plain title="…" as a tooltip: "Head — the rest." becomes a bold title over one note per
// sentence; a short line stays one line. (main.js calls this for every title on hover.)
export function tipFromText(text) {
  const clean = String(text || "").trim();
  if (!clean) return "";
  const sentences = (s) => s.replace(/\b(Mr|Mrs)\. /g, "$1.\u0001").split(/(?<=[.!?])\s+/)
    .map((x) => x.replace(/\u0001/g, " ").trim().replace(/\.$/, "")).filter(Boolean)
    .map((x) => esc(x.charAt(0).toUpperCase() + x.slice(1)));
  const dash = clean.indexOf(" — ");
  if (dash > 0 && dash < 48) return tip({ title: esc(clean.slice(0, dash)), notes: sentences(clean.slice(dash + 3)) });
  const parts = sentences(clean);
  return parts.length > 1 ? tip({ notes: parts }) : `<span class="tip-plain">${esc(clean)}</span>`;
}

// Pixel-art banner for a room with everyone working in it standing on the floor — click one to
// open their card. Up to SCENE_ROW people stand in one row; more split into a back row (teachers
// first, slightly raised and dimmed) and a front row, alternating so every head shows, like a class
// photo. Past SCENE_MAX_PEOPLE the rest collapse into a "+N" chip.
const SCENE_ROW = 9;
const SCENE_MAX_PEOPLE = 18;
// `actions` (the Upgrade button) sits in the bottom-left corner with the figures to its right.
// The room's headline number goes under the teacher row instead (statRow).
function roomScene(kind, people, title, info = "", actions = "") {
  const shown = [...people].sort((a, b) => (b.role === "teacher") - (a.role === "teacher")).slice(0, SCENE_MAX_PEOPLE);
  const extra = people.length - shown.length;
  const twoRows = shown.length > SCENE_ROW;
  // Two rows: the back row takes the first half (teachers first) and stands in the even slots, the
  // front row in the odd ones, so neighbours in a row are two slots apart.
  const back = twoRows ? shown.slice(0, Math.ceil(shown.length / 2)) : [];
  const front = twoRows ? shown.slice(back.length) : shown;
  const placed = twoRows
    ? shown.map((_, k) => (k % 2 === 0 ? { c: back[k / 2], row: "back" } : { c: front[(k - 1) / 2], row: "front" })).filter((p) => p.c)
    : front.map((c) => ({ c, row: "" }));
  const figures = placed
    .map(({ c, row }, i) => {
      const left = (((i + 1) / (placed.length + 1)) * 100).toFixed(1);
      return `<span class="scene-person ${row === "back" ? "scene-back" : ""}" style="left:${left}%;animation-delay:-${((i * 0.43) % 1.8).toFixed(2)}s"
        data-action="open-card" data-id="${c.id}" title="${esc(c.name)}">${characterSprite(c, 40)}</span>`;
    })
    .join("");
  return `<div class="room-scene" style="background-image:${sceneBackground(kind)}">
    <div class="scene-top">
      <div class="scene-plaque">${title}${info ? infoDot(info) : ""}</div>
    </div>
    ${actions
      ? `<div class="scene-bottom"><div class="scene-actions">${actions}</div><div class="scene-figures">${figures}</div></div>`
      : figures}
    ${extra > 0 ? `<span class="scene-more">+${extra}</span>` : ""}
  </div>`;
}

// A room's headline number and info dot on the left, its section label (e.g. "Students (12/16)")
// on the right, in one full-width pill under the teacher row, so the banner's art stays clear.
function statRow(label, pill, cls = "") {
  return `<div class="stat-row ${cls}">${pill ? `<span class="stat-pill">${pill}</span>` : ""}<span class="mini-label">${label}</span></div>`;
}

// A room still overrun from the first night: its scene boarded over, and the cost to clear it.
function renderBoardedRoom(state, roomKey, scene, cls = "") {
  const b = BOARDED_ROOMS[roomKey];
  const afford = state.resources.materials >= b.cost;
  return `<div class="room ${cls} room-boarded">
    <div class="room-scene room-scene-boarded" style="background-image:${sceneBackground(`${scene}@1`)}">
      <div class="boards"></div>
      <div class="scene-plaque">🔒 ${b.name}</div>
    </div>
    <p class="room-tagline">Boarded up — overrun on the first night, and ${b.zombies.length} zombies are still inside. Fight them out, then spend the scrap to board the windows back up.</p>
    <div class="boarded-actions">
      <button class="btn btn-sm btn-primary" data-action="open-clear-room" data-room="${roomKey}">🔨 Clear it out (${b.cost} scrap)</button>
      ${afford ? "" : `<span class="muted">you have ${state.resources.materials}/${b.cost} scrap</span>`}
    </div>
  </div>`;
}

// Picking a squad to clear a boarded-up room: who's inside, what it costs, and the odds.
export function renderClearRoomModal(state, clear) {
  const b = BOARDED_ROOMS[clear.roomKey];
  const squad = clear.ids.map((id) => getChar(state, id)).filter(canFightForRoom);
  const afford = state.resources.materials >= b.cost;
  const rows = state.characters
    .filter((c) => c.role === "student" && c.alive && !c.infection)
    .map((c) => {
      const able = canFightForRoom(c);
      const picked = clear.ids.includes(c.id);
      const full = !picked && clear.ids.length >= ROOM_FIGHT_SQUAD;
      return `<label class="check-row ${able ? "" : "check-row-disabled"}">
        <input type="checkbox" data-action="toggle-clear-member" data-id="${c.id}" ${picked ? "checked" : ""} ${!able || full ? "disabled" : ""}/>
        <span class="assign-who">${nameTag(c)} — Lv${overallLevel(c)} ${statusTag(c)}${able ? "" : ' <span class="tag tag-injured">too tired</span>'}</span>${hpBar(c)}
      </label>`;
    })
    .join("");
  const pct = Math.round(roomFightOdds(state, clear.roomKey, squad) * 100);
  const zombies = b.zombies.map((z) => `<div class="clear-zombie">${zombieSprite(z.look, 44)}<span>${z.type === "walker" ? "Walker" : z.type === "runner" ? "Runner" : "Brute"}</span></div>`).join("");
  return `<div class="modal-overlay" data-action="close-clear-room">
    <div class="char-card mission-card" data-action="noop">
      <button class="cc-close" data-action="close-clear-room" title="Close">✕</button>
      <h3>🔨 Clear out ${esc(roomLabel(clear.roomKey))}</h3>
      <p class="muted">Pick up to ${ROOM_FIGHT_SQUAD} students (${ROOM_FIGHT_STAMINA} stamina each) to fight their way in. Win, and ${b.cost} scrap boards the broken windows back up — the room is yours. Lose, and they fall back with nothing spent. Nobody dies in here: anyone who goes down gets dragged out.</p>
      <div class="mini-label">Still inside</div>
      <div class="clear-zombies">${zombies}</div>
      <div class="mission-stats-row"><span class="${afford ? "" : "plot-warn"}">🔧 ${state.resources.materials}/${b.cost} scrap</span></div>
      ${squad.length ? `<div class="mission-success ${pct >= 70 ? "mission-good" : pct >= 40 ? "mission-ok" : "mission-bad"}">Chance to clear it: <b>${pct}%</b></div>` : ""}
      <div class="mini-label">Squad (${squad.length}/${ROOM_FIGHT_SQUAD})</div>
      <div class="check-list">${rows}</div>
      <div class="row-actions">
        <button class="btn btn-sm" data-action="close-clear-room">Not now</button>
        <button class="btn btn-primary" data-action="go-clear-room" ${squad.length && afford ? "" : "disabled"}>${afford ? "⚔ Go in" : `Need ${b.cost - state.resources.materials} more scrap`}</button>
      </div>
    </div>
  </div>`;
}

// What the tutorial fight explains, one tip per round.
const ROOM_FIGHT_TIPS = [
  "Every fight in the game works like this one. Your squad strikes first each round — melee hits harder with STR, ranged with DEX, and gear adds its own damage.",
  "Then the zombies swing back. High DEX lets a student dodge, high CON soaks up the damage. Watch the HP bars.",
  "The squad fights as a team: its most charismatic member (CHA) leads, so everyone hits harder, and its most aware (WIS) warns the others, so they take less damage.",
  "Clearing a room is the safe way to learn: nobody dies in here. Out in the city — and at the gate at night — students can.",
];

export function renderRoomFight(state, anim) {
  const { report } = anim;
  const b = BOARDED_ROOMS[report.roomKey];
  const frame = report.frames[anim.frameIndex];
  const hitById = new Map(frame.hits.map((h) => [h.id, h]));
  const members = report.memberIds
    .map((id, i) => {
      const c = getChar(state, id);
      if (!c) return "";
      const hp = frame.hp[i];
      const hit = hitById.get(id);
      return `<div class="raid-member ${hp <= 0 ? "raid-member-down" : ""} ${hit && hit.dmg ? "raid-member-hit" : ""}">
        ${characterSprite(c, 40)}
        <div class="raid-hp"><div style="width:${Math.max(0, Math.round((hp / c.maxHp) * 100))}%"></div></div>
        <span class="raid-name">${esc(c.name.split(" ")[0])}</span>
        ${hit ? (hit.dodged ? '<span class="raid-float raid-float-dodge">dodge!</span>' : hit.dmg ? `<span class="raid-float raid-float-bad">-${hit.dmg}</span>` : '<span class="raid-float raid-float-dodge">miss</span>') : ""}
      </div>`;
    })
    .join("");
  const hitsOn = (zi) => frame.zHits.filter((h) => h.zi === zi).reduce((sum, h) => sum + h.dmg, 0);
  const zombies = report.zombies
    .map((z, zi) => {
      const hp = frame.zHp[zi];
      const took = hitsOn(zi);
      return `<div class="raid-member room-zombie ${hp <= 0 ? "raid-member-down" : ""} ${took ? "raid-member-hit" : ""}">
        ${zombieSprite(z.look, 52)}
        <div class="raid-hp room-zombie-hp"><div style="width:${Math.round((hp / z.maxHp) * 100)}%"></div></div>
        ${took ? `<span class="raid-float raid-float-good">-${took}</span>` : ""}
      </div>`;
    })
    .join("");
  const done = anim.phase === "result";
  const tip = report.tutorial && !done ? ROOM_FIGHT_TIPS[Math.min(anim.frameIndex, ROOM_FIGHT_TIPS.length - 1)] : "";
  return `<div class="modal-overlay raid-overlay room-fight-overlay">
    <div class="raid-stage">
      <div class="raid-title">🔨 Clearing ${esc(roomLabel(report.roomKey))}</div>
      <div class="raid-arena room-arena">
        <div class="raid-squad">${members}</div>
        <div class="room-zombies">${zombies}</div>
      </div>
      <div class="raid-log">${esc(frame.text)}</div>
      ${tip ? `<div class="fight-tip">💡 ${tip}</div>` : ""}
      ${done
        ? `<div class="raid-result ${report.won ? "raid-won" : "raid-lost"}">
            <div class="raid-result-title">${report.won ? `${esc(roomLabel(report.roomKey).replace(/^./, (ch) => ch.toUpperCase()))} is clear!` : "The squad fell back."}</div>
            <div class="muted">${report.won ? `-${report.cost} scrap to board the windows back up. It's ready to use.` : "Nothing was spent — rest up and try again, maybe with more students or better gear."}</div>
            ${report.hurt.length ? `<div class="exp-hurt">${report.hurt.map(esc).join(" · ")}</div>` : ""}
            <button class="btn btn-primary" data-action="finish-room-fight">Continue</button>
          </div>`
        : '<button class="btn btn-sm raid-skip" data-action="skip-room-fight">⏭ Skip</button>'}
    </div>
  </div>`;
}

// ---------- topbar ----------

// Small "+5"/"-3" pop that floats up out of a topbar stat when it changes between renders —
// see the `floaties` computation in main.js's render().
function floatyFor(floaties, key) {
  const f = floaties.find((x) => x.key === key);
  if (!f) return "";
  const cls = f.delta > 0 ? "floaty-pos" : "floaty-neg";
  return `<span class="floaty ${cls}">${f.delta > 0 ? "+" : ""}${f.delta}</span>`;
}
function tbItemClass(floaties, key) {
  return floaties.some((f) => f.key === key) ? "tb-item tb-pulse" : "tb-item";
}

// The tooltip on each topbar stat: what it stands at, and where it comes from / goes.
function hudTips(state) {
  const r = state.resources;
  const pop = aliveChars(state).length;
  const teachers = teacherCount(state);
  return {
    population: { title: "👥 People", rows: [["Students", `${pop - teachers}`], ["Teachers", `${teachers}`]], total: ["Everyone alive", `${pop}`] },
    teachers: { title: "🎓 Teachers", rows: [["At the school", `${teachers}`]], notes: ["Found on expeditions or through the Radio Station", `Or promoted from students who reach level ${PROMOTE_LEVEL_THRESHOLD} (max)`] },
    happiness: { title: "😊 Morale", rows: [["Now", `${state.happiness}`]], notes: ["Rises with won battles and new recruits", "Falls with failed missions and deaths", "Tilts random events toward good or bad"] },
    food: { title: "🍞 Food", rows: [["On hand", `${r.food}`], ["Eaten tonight", `−${pop}`]], total: ["Left after tonight", `${r.food - pop}`], notes: ["Grown at the Farm, found on expeditions"] },
    materials: { title: "⚙ Scrap", rows: [["On hand", `${r.materials}`]], notes: ["From expeditions and the Scrapyard", "Spent on upgrades, defenses, the Radio Station and crafting"] },
    medicine: { title: "💊 Medicine", rows: [["On hand", `${r.medicine}`]], notes: [`Treating a patient costs ${INFIRMARY_MEDICINE_PER_PATIENT}`, "Saving a defender who goes down costs 5 (automatic)", "Found on expeditions"] },
    research: { title: "🧠 Research", rows: [["On hand", `${r.research}`], ["Made a day", `+${researchRoomYield(state)}`]], notes: ["Made by teachers in the Research Room", "Spent on the tech tree and the Radio Station"] },
    serum: { title: "💉 Antiviral Serum", rows: [["On hand", `${r.serum}`]], notes: ["The only cure for an infection — one per person", "Hospital, Pharmacy and Fire Station; every raid boss drops some"] },
    infected: { title: "🦠 Infected", rows: [["In quarantine", `${infectedChars(state).length}`]], notes: ["Each needs a serum by the end of their fifth day, or they die", "Cure them from the Nurse's Office"] },
  };
}

const DAY_STEPS = [["sun", "Classes"], ["dusk", "Explore"], ["moon", "Night"]];

// Tile colour behind each HUD stat's pixel icon.
const HUD_TILE = {
  people: "#233a57", teacher: "#262f4f", mood: "#4a4121", food: "#4a3818", scrap: "#333a45",
  medicine: "#4d2226", research: "#34284d", serum: "#1d3f28", virus: "#2c4219", antenna: "#3a3020",
};

// One HUD counter: an icon tile, the number, and a small label (hidden on narrow screens).
// `extra` goes after the number (today's meal buffs ride on the Food counter).
function hudStat(floaties, key, iconHtml, tile, value, label, tipSpec, { sub = "", cls = "", extra = "" } = {}) {
  return `<span class="${key ? tbItemClass(floaties, key) : "tb-item"} hud-stat ${cls}" ${tipAttr(tipSpec)}>
    <span class="hud-icon" style="--tile:${tile}">${iconHtml}</span>
    <span class="hud-val"><span class="hud-num"><b>${value}</b>${sub}</span><small>${label}</small></span>
    ${extra}
    ${key ? floatyFor(floaties, key) : ""}
  </span>`;
}

export function renderTopbar(state, floaties = [], activeTab = "") {
  const pop = aliveChars(state).length;
  const r = state.resources;
  const infected = infectedChars(state).length;
  const served = state.dishesToday.map((id) => DISHES.find((d) => d.id === id)).filter(Boolean);
  const meals = served.length
    ? `<span class="hud-buffs">${served.map((d) => `<span class="tb-buff" ${tipAttr({ title: `${d.icon} ${esc(d.name)}`, notes: [esc(d.desc), "Today's meal — wears off tonight"] })}>${d.icon}</span>`).join("")}</span>`
    : "";
  const tips = hudTips(state);
  const stage = radioStage(state);
  const rescue = state.rescue?.evacuated
    ? ""
    : `<button class="hud-stat hud-rescue ${satelliteReady(state) ? "hud-rescue-ready" : ""}" data-action="set-tab" data-tab="floor3"
        ${tipAttr(state.rescue
          ? { title: "🚁 Rescue", rows: [["Helicopter lands", `day ${state.rescue.day}`]], notes: ["Evacuate or hold out when it lands", "Click to go to the Radio Station"] }
          : { title: "📻 Radio Station", rows: [["Upgrades", `${stage}/${RADIO_UPGRADES.length}`], ["Recruit chance", `${Math.round(radioRecruitChance(state) * 100)}% a day`]], notes: ["Level 5 — satellite communications — calls the rescue helicopter", "Click to go to the Radio Station"] })}>
        <span class="hud-icon" style="--tile:${HUD_TILE.antenna}">${pixelIcon("antenna", 20)}</span>
        <span class="hud-val"><span class="hud-num"><b>${state.rescue ? `Day ${state.rescue.day}` : "Radio"}</b></span><small>${state.rescue ? "Evac" : `${stage}/${RADIO_UPGRADES.length}`}</small></span>
        <span class="hud-rescue-bars">${RADIO_UPGRADES.map((_, i) => `<i class="${i < stage ? "on" : ""}"></i>`).join("")}</span>
      </button>`;
  return `
  <header class="hud ${infected || r.serum || served.length > 1 ? "hud-tight" : ""}">
    <div class="hud-left">
      <details class="options-dropdown menu-dropdown">
        <summary class="hud-menu" title="Menu">${pixelIcon("menu", 20)}</summary>
        <div class="options-menu">
          <button class="options-item ${activeTab === "log" ? "active" : ""}" data-action="set-tab" data-tab="log">📜 Log</button>
          <button class="options-item ${activeTab === "itemlist" ? "active" : ""}" data-action="set-tab" data-tab="itemlist">📖 Item List</button>
          <button class="options-item" data-action="save-game">💾 Save</button>
          <button class="options-item" data-action="reset-game">🔄 New Game</button>
          ${getBest() ? `<div class="options-item options-note">🏆 Best run: day ${getBest().day}</div>` : ""}
          <label class="options-item options-gfx">🔍 UI Size
            <select class="res-select" data-action="set-ui-size">${UI_SIZES.map((size) => `<option value="${size}" ${getUiSize() === size ? "selected" : ""}>${size}%</option>`).join("")}</select>
          </label>
          <div class="options-item options-gfx">🎨 Graphics
            <span class="gfx-seg">${GFX_LEVELS.map((level) => `<button class="gfx-opt ${getGraphics() === level ? "on" : ""}" data-action="set-gfx" data-gfx="${level}">${level[0].toUpperCase() + level.slice(1)}</button>`).join("")}</span>
          </div>
          <label class="options-item options-toggle">
            <input type="checkbox" data-action="toggle-sound" ${isSoundEnabled() ? "checked" : ""}/>
            🔊 Sound
          </label>
        </div>
      </details>
      <div class="hud-group">
        ${hudStat(floaties, "population", pixelIcon("people", 20), HUD_TILE.people, pop, "People", tips.population)}
        ${hudStat(floaties, null, pixelIcon("teacher", 20), HUD_TILE.teacher, teacherCount(state), "Teachers", tips.teachers)}
        ${hudStat(floaties, "happiness", moodIcon(state.happiness, 20), HUD_TILE.mood, state.happiness, "Morale", tips.happiness)}
      </div>
    </div>
    <div class="hud-center">${rescue}</div>
    <div class="hud-right">
      <div class="hud-group">
        ${hudStat(floaties, "food", pixelIcon("food", 20), HUD_TILE.food, r.food, "Food", tips.food,
          { sub: `<span class="tb-sub">−${pop}</span>`, cls: r.food < pop ? "tb-warn" : "", extra: meals })}
        ${hudStat(floaties, "materials", pixelIcon("scrap", 20), HUD_TILE.scrap, r.materials, "Scrap", tips.materials)}
        ${hudStat(floaties, "medicine", pixelIcon("medicine", 20), HUD_TILE.medicine, r.medicine, "Meds", tips.medicine)}
        ${hudStat(floaties, "research", pixelIcon("research", 20), HUD_TILE.research, r.research, "Research", tips.research)}
        ${infected ? hudStat(floaties, null, pixelIcon("virus", 20), HUD_TILE.virus, infected, "Infected", tips.infected, { cls: "tb-infected hud-compact" }) : ""}
        ${r.serum ? hudStat(floaties, "serum", pixelIcon("serum", 20), HUD_TILE.serum, r.serum, "Serum", tips.serum, { cls: "hud-compact" }) : ""}
      </div>
    </div>
  </header>`;
}

// The left 3 tabs change with the turn — you manage the school on Turn 1, the outside
// facilities on Turn 2 (while teams are out exploring), and night-related screens on Turn 3.
// Each tab is [id, label, pixel icon].
const LEFT_TABS_BY_TURN = {
  1: [["floor1", "Lobby", "lobby"], ["floor2", "Classrooms", "classrooms"], ["floor3", "Facilities", "facilities"]],
  2: [["farm", "Farm", "farm"], ["scrapyard", "Scrapyard", "scrap"]],
  3: [["defense", "Defense", "defense"], ["assault", "Assault", "assault"], ["event", "Event", "event"]],
};
const RIGHT_TABS = [["roster", "Roster", "roster"], ["armory", "Armory", "armory"], ["research", "Research", "research"]];
// The center button always returns to the current turn's action screen (assigning classes,
// missions, or defenders + the button that actually advances the turn) — labeled per-turn so
// it doesn't read as a generic "advance turn" action.
const OVERVIEW_TAB = { 1: ["Classes", "classes"], 2: ["Explore", "explore"], 3: ["Night Watch", "moon"] };

const navBtn = (activeTab, [id, label, icon], cls = "", size = 18) =>
  `<button class="nav-btn ${cls} ${activeTab === id ? "active" : ""}" data-action="set-tab" data-tab="${id}">${pixelIcon(icon, size)}<span>${label}</span></button>`;

// The turn button doubles as the clock: a tear-off day card, then the turn's name over the
// sun → dusk → moon track with the current phase lit.
function renderTurnButton(state, activeTab) {
  const [label, icon] = OVERVIEW_TAB[state.turn];
  const phases = DAY_STEPS.map(([phaseIcon, name], i) => {
    const cls = i + 1 === state.turn ? "now" : i + 1 < state.turn ? "done" : "";
    const link = i ? `<span class="turn-phase-link ${i < state.turn ? "done" : ""}"></span>` : "";
    return `${link}<span class="turn-phase ${cls}" title="Turn ${i + 1}: ${name}">${pixelIcon(phaseIcon, 14)}</span>`;
  }).join("");
  return `<button class="nav-btn nav-turn ${activeTab === "overview" ? "active" : ""}" data-action="set-tab" data-tab="overview"
    title="Day ${state.day}, turn ${state.turn} of 3 — ${label}">
    <span class="turn-day"><small>DAY</small><b>${state.day}</b></span>
    <span class="turn-body">
      <span class="turn-label">${pixelIcon(icon, 18)}<span>${label}</span></span>
      <span class="turn-track">${phases}</span>
    </span>
  </button>`;
}

export function renderTabs(state, activeTab) {
  return `<nav class="nav">
    <div class="nav-left">${(LEFT_TABS_BY_TURN[state.turn] || LEFT_TABS_BY_TURN[1]).map((t) => navBtn(activeTab, t)).join("")}</div>
    <div class="nav-center">${renderTurnButton(state, activeTab)}</div>
    <div class="nav-right">${RIGHT_TABS.map((t) => navBtn(activeTab, t)).join("")}</div>
  </nav>`;
}

// ---------- overview / turn action ----------

function renderMemorial(fallen) {
  if (!fallen.length) return "";
  return `<div class="mini-label">🕯 In Memoriam</div>
    <div class="memorial-list">
      ${fallen
        .map(
          (c) => `<div class="memorial-row" title="${esc(c.name)}">
            <span class="mini-portrait cc-dead">${characterSprite(c, 32)}</span>
            <span class="memorial-name">${esc(c.name)}</span>
            <span class="muted memorial-day">Day ${c.diedOnDay || "?"}</span>
          </div>`
        )
        .join("")}
    </div>`;
}

function runStats(state) {
  const bosses = state.bossesSlain || [];
  return `
    <div>Research unlocked: <b>${state.techUnlocked.length}</b></div>
    <div>Bosses slain: <b>${bosses.length}</b>${bosses.length ? ` <span class="muted">(${bosses.map(esc).join(", ")})</span>` : ""}</div>
    <div>Legendary survivors found: <b>${state.characters.filter((c) => c.legendary).length}</b></div>
    <div>Events weathered: <b>${state.eventLog.length}</b></div>`;
}

// The run's score is the last day the school stood; the best run on this device is kept too.
function renderScore(state) {
  const best = getBest();
  const note = isBestRun(state)
    ? `<span class="score-best">🏆 New best!</span>`
    : best
    ? `<span class="muted">Best: day ${best.day}${best.evacuated ? " (evacuated)" : ""}</span>`
    : "";
  return `<div class="score-block"><span class="score-label">Score</span><span class="score-day">Day ${state.day}</span>${note}</div>`;
}

// Asked the morning the helicopters land: fly out now, or send them away and hold out longer.
export function renderEvacuationModal(state) {
  const back = state.day + RESCUE_DELAY_DAYS;
  const alive = aliveChars(state).length;
  const best = getBest();
  return `<div class="modal-overlay">
    <div class="char-card mission-card evac-modal" data-action="noop">
      <h3>🚁 The helicopter has landed</h3>
      <p>It followed the satellite signal to the roof and can fly all ${alive} survivor${alive === 1 ? "" : "s"} out right now — ending the run on <b>day ${state.day}</b>.</p>
      <p class="muted">Or send them away and keep holding the school. They'll come back on day ${back}, and your score is the last day the school stands — but the horde grows every night.${best ? ` Your best is day ${best.day}.` : ""}</p>
      <div class="row-actions">
        <button class="btn" data-action="evac-delay">🏫 Hold out until day ${back}</button>
        <button class="btn btn-primary" data-action="evac-go">🚁 Evacuate now</button>
      </div>
    </div>
  </div>`;
}

function renderGameOver(state) {
  const title =
    state.day > 30 ? "Beyond the Last Helicopter" : state.day >= 20 ? "A Legend Among the Ashes" : state.day >= 10 ? "A Valiant Last Stand" : "A Short, Brutal Fall";

  return `<div class="card gameover-card">
    <h2>💀 The School Has Fallen</h2>
    <p class="gameover-title">${title}</p>
    <p class="muted">Day ${state.day}. Every soul who called this place home is gone.</p>
    ${renderScore(state)}
    <div class="summary-list">
      <div>Days survived: <b>${state.day}</b></div>
      ${runStats(state)}
    </div>
    ${renderMemorial(state.characters.filter((c) => !c.alive))}
    <button class="btn btn-primary btn-big" data-action="reset-game">🔄 Start a New Game</button>
  </div>`;
}

function renderVictory(state) {
  const survivors = aliveChars(state);
  const fallen = state.characters.filter((c) => !c.alive);
  const share = survivors.length / Math.max(1, survivors.length + fallen.length);
  const title = share >= 0.9 ? "Nobody Left Behind" : share >= 0.6 ? "Out of the Fire" : "The Few Who Made It";

  return `<div class="card gameover-card victory-card">
    <h2>🚁 Rescued!</h2>
    <p class="gameover-title">${title}</p>
    <p class="muted">Day ${state.day}. The helicopters followed your signal to the rooftop and flew
    ${survivors.length} survivor${survivors.length === 1 ? "" : "s"} out of the city.</p>
    ${renderScore(state)}
    <div class="victory-survivors">
      ${survivors.map((c) => `<span class="mini-portrait" title="${esc(c.name)}">${characterSprite(c, 32)}</span>`).join("")}
    </div>
    <div class="summary-list">
      <div>Survivors evacuated: <b>${survivors.length}</b></div>
      <div>Lost along the way: <b>${fallen.length}</b></div>
      ${runStats(state)}
    </div>
    ${renderMemorial(fallen)}
    <button class="btn btn-primary btn-big" data-action="reset-game">🔄 Start a New Game</button>
    <button class="btn btn-big" data-action="stay-after-rescue">🏫 Stay behind and keep holding the school (endless)</button>
  </div>`;
}

export function renderOverview(state) {
  if (state.gameOver) return renderGameOver(state);
  if (state.victory) return renderVictory(state);
  const banner = renderObjectiveBanner(state);
  if (state.turn === 1) return banner + renderTurn1Overview(state);
  if (state.turn === 2) return banner + renderTurn2Overview(state);
  return banner + renderTurn3Overview(state);
}

const REWARD_ICON = { food: "🍞", materials: "🔧", medicine: "💊", research: "🧠" };
function renderObjectiveBanner(state) {
  const o = currentObjective(state);
  if (!o) return "";
  const progress = objectiveProgress(state, o);
  const reward = Object.entries(o.reward).map(([k, v]) => `${REWARD_ICON[k]} +${v}`).join(" ");
  const step = state.objectivesDone.length + 1;
  return `<div class="objective-banner">
    <div class="objective-head"><span class="objective-tag">📋 Objective ${step}</span><b>${esc(o.title)}</b><span class="objective-reward">Reward: ${reward}</span></div>
    <div class="objective-hint">${esc(o.hint)}</div>
    ${progress ? `<div class="objective-progress">${esc(progress)}</div>` : ""}
  </div>`;
}

// One room at a glance on the Turn 1 dashboard: a strip of its pixel art with its name, the one
// number that matters today, how full it is, and a short line — or what's wrong, in orange.
// Clicking it goes to the room's floor.
function overviewCard({ tab, scene, name, level = "", big, unit = "", used = null, cap = null, meta = "", warn = "", locked = false }) {
  const pct = cap ? Math.round((Math.min(used, cap) / cap) * 100) : 0;
  return `<button class="ov-card ${locked ? "ov-locked" : ""}" data-action="set-tab" data-tab="${tab}">
    <span class="ov-banner" style="background-image:${sceneBackground(scene)}"><span class="ov-plaque">${locked ? "🔒 " : ""}${name}${level}</span></span>
    <span class="ov-big">${big}${unit ? ` <small>${unit}</small>` : ""}</span>
    ${cap ? `<span class="ov-bar ${used >= cap ? "ov-bar-full" : used ? "" : "ov-bar-empty"}"><i style="width:${pct}%"></i></span>` : ""}
    ${meta ? `<span class="ov-meta">${meta}</span>` : ""}
    ${warn ? `<span class="ov-warn">${warn}</span>` : ""}
  </button>`;
}

function renderTurn1Overview(state) {
  const count = (flag, value = true) => state.characters.filter((c) => c.alive && (value === true ? c[flag] : c[flag] === value)).length;
  const posted = (post) => state.characters.filter((c) => c.role === "teacher" && c.alive && c.post === post).length;
  const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;
  const locked = (key, scene, tab) => overviewCard({ tab, scene: `${scene}@1`, name: BOARDED_ROOMS[key].name, big: "Boarded up", locked: true, meta: `${BOARDED_ROOMS[key].cost} scrap to clear` });

  const classrooms = CLASSROOM_IDS.map((id) => {
    const key = `classroom:${id}`;
    if (isBoarded(state, key)) return locked(key, "classroom_empty", "floor2");
    const room = state.rooms.classrooms[id];
    const lesson = classroomLesson(state, id);
    const seated = room.seats.filter(Boolean).length;
    return overviewCard({
      tab: "floor2", scene: `${room.subject ? `classroom_${room.subject}` : "classroom_empty"}@${room.level || 1}`, name: roomDisplayName(state, id), level: levelBadge(state, key),
      big: lesson.subject ? `+${lesson.gain}` : "—", unit: lesson.subject ? `${STAT_OF_SUBJECT[room.subject]} a day` : "",
      used: seated, cap: room.seats.length, meta: `${seated}/${room.seats.length} students · ${plural(posted(key), "teacher")}`,
      warn: lesson.subject ? "" : "No teacher — no class",
    });
  }).join("");

  const training = ["PE", "Gymnastics"].map((side) => {
    const info = GYM_SIDES[side];
    const lesson = gymLesson(state, side);
    const n = count("gymToday", side);
    const cap = gymRoom(state, side).studentCapacity;
    return overviewCard({ tab: "floor1", scene: `${info.roomKey}@${roomLevel(state, info.roomKey)}`, name: info.room, level: levelBadge(state, info.roomKey), big: `+${lesson.gain}`, unit: `${info.gains} a session`,
      used: n, cap, meta: `${n}/${cap} training · up to ${lesson.ceiling}` });
  }).join("");
  const cooks = cooksOnDuty(state).length;
  const resting = count("restToday");
  const cafeCap = state.rooms.cafeteria.studentCapacity;
  const cafeteria = overviewCard({ tab: "floor1", scene: `cafeteria@${roomLevel(state, "cafeteria")}`, name: "Cafeteria", level: levelBadge(state, "cafeteria"), big: `+${cafeteriaRest(state)}`, unit: "stamina rest",
    used: resting, cap: cafeCap, meta: `${resting}/${cafeCap} resting · 🍲 ${state.dishesToday.length}/${dishCapacity(state)} dishes`,
    warn: !cooks ? "No cook" : state.dishesToday.length < dishCapacity(state) ? "A dish is ready to cook" : "" });
  const patients = count("infirmaryToday");
  const infected = infectedChars(state).length;
  const bedCap = state.rooms.infirmary.studentCapacity;
  const nurse = overviewCard({ tab: "floor1", scene: `infirmary@${roomLevel(state, "infirmary")}`, name: "Nurse's Office", level: levelBadge(state, "infirmary"), big: `+${healHealAmount(state)}`, unit: "HP a treatment",
    used: patients, cap: bedCap, meta: `${patients}/${bedCap} healing`, warn: infected ? `🦠 ${infected} in quarantine` : "" });

  const ready = state.characters.filter(promotable).length;
  const office = overviewCard({ tab: "floor3", scene: "headmaster", name: "Headmaster's Office", big: `${state.recruitPool.length}`, unit: "recruits waiting",
    used: state.recruitPool.length, cap: recruitSlots(state), meta: `${ready} ready to promote · ${teacherCount(state)} teachers` });
  const radio = isBoarded(state, "radio") ? locked("radio", "radio", "floor3") : overviewCard({ tab: "floor3", scene: `radio@${radioStage(state)}`, name: "Radio Station", level: levelBadge(state, "radio"),
    big: `${Math.round(radioRecruitChance(state) * 100)}%`, unit: "recruit chance a day", used: count("radioToday"), cap: state.rooms.radio.studentCapacity,
    meta: state.rescue && !state.rescue.evacuated ? `🚁 Helicopter on day ${state.rescue.day}` : `${count("radioToday")}/${state.rooms.radio.studentCapacity} on the air · ${plural(posted("radio"), "teacher")}` });
  const research = isBoarded(state, "research") ? locked("research", "research", "floor3") : overviewCard({ tab: "floor3", scene: `research@${roomLevel(state, "research")}`, name: "Research Room", level: levelBadge(state, "research"),
    big: `+${researchRoomYield(state)}`, unit: "research a day", used: posted("research"), cap: state.rooms.research.teacherCapacity, meta: plural(posted("research"), "teacher"),
    warn: posted("research") ? "" : "No teacher" });
  const crafting = isBoarded(state, "crafting") ? locked("crafting", "crafting", "floor3") : overviewCard({ tab: "floor3", scene: `crafting@${roomLevel(state, "crafting")}`, name: "Crafting Room", level: levelBadge(state, "crafting"),
    big: `+${craftingToday(state)}`, unit: "fortification a day", used: posted("crafting"), cap: state.rooms.crafting.teacherCapacity, meta: plural(posted("crafting"), "teacher"),
    warn: posted("crafting") ? "" : "No teacher" });

  return `
  <div class="card">
    <h2>Turn 1 — Classes ${infoDot({ title: "📚 Turn 1 — Classes", notes: ["Classrooms raise their subject every day, up to the teacher's grade", "The Gymnasium raises STR, Acrobatics DEX", "Resting and healing happen now too", "Click a room to go to it"] })}</h2>
    <div class="ov-chips">
      <span class="ov-chip">🥾 Exploring costs <b>${exploreStaminaCost(state)}</b> stamina</span>
      <span class="ov-chip">😴 Resting restores <b>${cafeteriaRest(state)}</b></span>
    </div>
    <div class="mini-label ov-section">Classrooms</div>
    <div class="ov-grid">${classrooms}</div>
    <div class="mini-label ov-section">Lobby</div>
    <div class="ov-grid">${training}${cafeteria}${nurse}</div>
    <div class="mini-label ov-section">Facilities</div>
    <div class="ov-grid">${office}${radio}${research}${crafting}</div>
    <button class="btn btn-primary btn-big" data-action="resolve-turn">📚 Hold Classes &amp; Advance to Afternoon</button>
  </div>`;
}

// What the Nurse's Office heals per treatment today (the room's level + its nurses).
const healHealAmount = (state) => infirmaryHeal(state) + infirmaryNurseBonus(state);
// The Crafting Room's fortification today: each crafter in turn uses up to 4 of the scrap left.
function craftingToday(state) {
  let scrap = state.resources.materials;
  const crafters = state.characters.filter((c) => c.role === "teacher" && c.post === "crafting" && c.alive).reduce((sum, t) => {
    const use = Math.min(Math.max(scrap, 0), 4);
    scrap -= use;
    return sum + (use > 0 ? crafterGain(state, t, use) : 0);
  }, 0);
  return crafters + state.characters.filter((c) => c.craftingToday && c.alive && !c.infection).reduce((sum, c) => sum + craftHelpGain(c), 0);
}

function renderTurn2Overview(state) {
  // The side panel: the three expedition teams and the raid squad, each with where it's headed.
  const teamRows = [0, 1, 2]
    .map((i) => {
      const locId = state.teamLocations[i];
      const loc = locId && LOCATIONS.find((l) => l.id === locId);
      const memberCount = state.characters.filter((c) => c.exploreTeam === i && c.alive).length;
      return loc
        ? `<button class="ex-team" style="--team:${TEAM_COLORS[i]}" data-action="open-mission" data-location="${locId}">
            <i class="team-dot"></i><span class="ex-team-name">${teamLabel(i)}</span>
            <span class="ex-team-target">${LOCATION_ICON[locId]} ${esc(loc.name)}</span>
            <span class="ex-team-count ${memberCount ? "" : "plot-warn"}">${memberCount}/5</span>
            <span class="btn-x" data-action="clear-mission" data-team="${i}" title="Recall team">✕</span>
          </button>`
        : `<div class="ex-team ex-team-idle" style="--team:${TEAM_COLORS[i]}">
            <i class="team-dot"></i><span class="ex-team-name">${teamLabel(i)}</span>
            <span class="ex-team-target muted">Pick a place on the map</span>
          </div>`;
    })
    .join("");
  const raidLm = LANDMARKS.find((l) => l.id === state.raidTarget);
  const raidCount = state.characters.filter((c) => c.exploreTeam === RAID_TEAM && c.alive).length;
  const raidRow = raidLm
    ? `<button class="ex-team" style="--team:${TEAM_COLORS[RAID_TEAM]}" data-action="open-raid" data-landmark="${raidLm.id}">
        <i class="team-dot"></i><span class="ex-team-name">${teamLabel(RAID_TEAM)}</span>
        <span class="ex-team-target">☠ ${esc(raidLm.boss.name)}</span>
        <span class="ex-team-count ${raidCount < raidLm.minTeam ? "plot-warn" : ""}">${raidCount}/${raidLm.minTeam}+</span>
        <span class="btn-x" data-action="clear-raid" title="Call off the raid">✕</span>
      </button>`
    : "";

  return `
  <div class="card explore-card">
    <div class="explore-layout">
      ${renderExplorationMap(state)}
      <aside class="explore-side">
        <h2>Exploration ${infoDot({ title: "🗺 Turn 2 — Exploration", notes: ["Click a place on the map to send a team of up to 5 students — fuller teams do better", "Farther is harder but pays better", "Click the fog (?) to send a scout and open up the town", "Grab supply drops before they're gone, and mind the horde", "Scroll to zoom, drag to look around","Landmarks at the edge hold raid bosses and legendary gear", "Teachers stay at the school"] })}</h2>
        <div class="mini-label">Teams</div>
        ${teamRows}${raidRow}
        <div class="ex-legend">
          <span><b class="ex-key ex-key-fog">?</b> Scout the fog</span>
          <span><b class="ex-key">🏪</b> Send a team</span>
          <span><b class="ex-key ex-key-nest">🧟</b> Zombie nest</span>
          <span><b class="ex-key ex-key-raid">☠</b> Raid boss</span>
          <span><b class="ex-key ex-key-drop">📦</b> Grab supplies</span>
          <span><b class="ex-key ex-key-nest">👣</b> The horde</span>
        </div>
        <button class="btn btn-primary btn-big" data-action="resolve-turn">🧳 Launch Expeditions</button>
      </aside>
    </div>
  </div>`;
}

// Why a block is riskier than usual: a nest next door, the horde close by, or both.
const NEIGHBORS = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, -1], [-1, 1]];
function dangerNotes(state, q, r) {
  const notes = [];
  if (NEIGHBORS.some(([dq, dr]) => isNest(state, q + dq, r + dr))) notes.push("⚠ A zombie nest next door");
  if (nearHorde(state, q, r)) notes.push("⚠ The horde is close");
  return notes;
}

function hexTile(key) {
  return `<div class="hex-tile" style="background-image:${tileBackground(key)}"></div>`;
}

// The town around the school (js/citymap.js draws it): the scouted streets, fog over the rest,
// and a marker on everything you can click — "?" on the fog a scout can reach, a label on every
// place found, nests and raid landmarks. The map is scaled to fit its box (main.js fitCityMap),
// framing just the part of town that matters so far.
function renderExplorationMap(state) {
  const teamAt = {};
  state.teamLocations.forEach((id, i) => {
    if (id) teamAt[id] = i;
  });
  if (state.raidTarget) teamAt[state.raidTarget] = RAID_TEAM;

  const clear = [...state.exploredHexes];
  const reachable = [];
  const shown = [];
  let cells = "";
  let routes = "";
  const at = (q, r) => {
    const { x, y } = hexToWorld(q, r);
    return `--x:${x.toFixed(1)};--y:${y.toFixed(1)};`;
  };

  for (const { q, r } of hexesInRadius(HEX_RADIUS)) {
    if (!isHexExplored(state, q, r)) {
      if (!canScoutHex(state, q, r)) continue;
      reachable.push(`${q},${r}`);
      shown.push({ q, r });
      const danger = Math.round(scoutEncounterChance(state, q, r) * 100);
      cells += `<div class="cm-cell cm-fog" data-action="open-scout" data-q="${q}" data-r="${r}" style="${at(q, r)}" ${tipAttr({
        title: "🌫 Unexplored",
        rows: [["Scout", `⚡ ${scoutCost(q, r)} stamina`], ["Zombie risk", `up to ${danger}%`]],
        notes: dangerNotes(state, q, r),
      })}><span class="cm-q">?</span></div>`;
      continue;
    }
    shown.push({ q, r });
    const loc = locationAt(q, r);
    const lm = landmarkAt(q, r);
    const place = loc || lm;
    const team = place ? teamAt[place.id] : undefined;
    const teamStyle = team !== undefined ? `--team:${TEAM_COLORS[team]};` : "";
    let squad = "";
    if (team !== undefined) {
      const members = state.characters.filter((c) => c.exploreTeam === team && c.alive);
      squad = `<span class="cm-squad">${members.slice(0, 3).map((c) => characterSprite(c, 16)).join("")}${members.length > 3 ? `<b>+${members.length - 3}</b>` : members.length ? "" : "<b>0</b>"}</span>`;
      const { x, y } = hexToWorld(q, r);
      const sx = WORLD_W / 2;
      const sy = WORLD_H / 2;
      const len = Math.hypot(x - sx, y - sy) || 1;
      const bend = team % 2 ? 14 : -14;
      const mx = (sx + x) / 2 + (-(y - sy) / len) * bend;
      const my = (sy + y) / 2 + ((x - sx) / len) * bend;
      routes += `<path d="M${sx},${sy} Q${mx.toFixed(1)},${my.toFixed(1)} ${x.toFixed(1)},${y.toFixed(1)}" stroke="${TEAM_COLORS[team]}"/>`;
    }

    if (loc) {
      const rewards = Object.entries(loc.rewards).map(([k, v]) => `${RESOURCE_ICON[k]} ~${v}`).join(" ");
      cells += `<div class="cm-cell cm-place ${team !== undefined ? "cm-assigned" : ""}" data-action="open-mission" data-location="${loc.id}" style="${at(q, r)}${teamStyle}" ${tipAttr({
        title: `${LOCATION_ICON[loc.id]} ${esc(loc.name)}`,
        rows: [["Difficulty", `${loc.difficulty}/5`], ["Danger", `${loc.danger}/5`], ["Loot", rewards], ...(loc.serumChance ? [["Rare", "💉 serum"]] : [])],
        notes: [esc(loc.desc), ...dangerNotes(state, q, r)],
      })}>${squad}<span class="cm-label">${LOCATION_ICON[loc.id]}<span class="cm-name"> ${esc(loc.name)}</span></span></div>`;
    } else if (lm) {
      const cooldown = raidCooldownLeft(state, lm.id);
      const boss = raidBoss(state, lm);
      cells += `<div class="cm-cell cm-place cm-landmark ${cooldown ? "cm-cleared" : ""} ${team !== undefined ? "cm-assigned" : ""}" data-action="open-raid" data-landmark="${lm.id}" style="${at(q, r)}${teamStyle}" ${tipAttr({
        title: `☠ ${esc(lm.name)}`,
        rows: [["Boss", `${esc(boss.name)} · ${boss.hp} HP`], ["Squad", `${lm.minTeam}+ students, Lv ${lm.minLevel}+`]],
        notes: ["🌟 Legendary gear and survivors", ...(cooldown ? [`Cleared — back in ${cooldown} day${cooldown === 1 ? "" : "s"}`] : [])],
      })}>${squad}<span class="cm-label cm-label-raid">${cooldown ? `💤 ${cooldown}d` : "☠"}<span class="cm-name"> ${esc(lm.name)}</span></span></div>`;
    } else if (isNest(state, q, r)) {
      cells += `<div class="cm-cell cm-nest" data-action="open-nest" data-q="${q}" data-r="${r}" style="${at(q, r)}" ${tipAttr({
        title: "🧟 Zombie Nest",
        notes: ["Everything next to it is more dangerous", "Send a squad to burn it out"],
      })}><span class="cm-badge">🧟</span></div>`;
    }
  }

  // Things that come and go: supply drops on scouted blocks, and the horde — big enough to see
  // from the rooftop even through the fog.
  for (const d of state.mapDrops || []) {
    const md = MAP_DROPS[d.kind];
    const left = d.expires - state.day + 1;
    cells += `<div class="cm-cell cm-drop" data-action="open-drop" data-q="${d.q}" data-r="${d.r}" style="${at(d.q, d.r)}" ${tipAttr({
      title: `${md.icon} ${md.name}`,
      rows: [["Runner", `⚡ ${scoutCost(d.q, d.r)} stamina`], ["Gone in", left <= 1 ? "1 day" : `${left} days`]],
      notes: ["Send a runner to grab it"],
    })}><span class="cm-drop-icon">${md.icon}</span></div>`;
  }
  if (state.horde) {
    const { q, r } = state.horde;
    cells += `<div class="cm-cell cm-horde" style="${at(q, r)}"><span class="cm-horde-crowd" ${tipAttr({
      title: "🧟 The Horde",
      notes: ["Moves a block every day", "Scouting and runs on or next to it are more dangerous"],
    })}>${zombieSprite("walker", 18)}${zombieSprite("walker", 18)}${zombieSprite("walker", 18)}</span></div>`;
  }

  const [vx, vy, vw, vh] = viewBox(shown);
  const school = hexToWorld(0, 0);
  return `<div class="citymap" data-view="${vx},${vy},${vw},${vh}">
    <div class="cm-world" style="width:${WORLD_W}px;height:${WORLD_H}px">
      <img class="cm-layer" src="${cityBaseUrl()}" alt="" draggable="false">
      <img class="cm-layer" src="${fogUrl(clear, reachable)}" alt="" draggable="false">
      <svg class="cm-routes" width="${WORLD_W}" height="${WORLD_H}" viewBox="0 0 ${WORLD_W} ${WORLD_H}">${routes}</svg>
    </div>
    <button class="cm-reset" data-action="map-reset" title="Zoom back out">⤢ Whole map</button>
    <div class="cm-cell cm-school" style="--x:${school.x};--y:${school.y + 34};"><span class="cm-label cm-label-school">🏫<span class="cm-name"> School</span></span></div>
    ${cells}
  </div>`;
}

// What a scout turned up — the hex's tile and a line about the find.
export function renderScoutReport(state, report) {
  const { q, r, scoutName, result } = report;
  let title;
  let body;
  if (result.drop) {
    const d = MAP_DROPS[result.drop.kind];
    title = `${d.icon} ${d.name}`;
    body = `${esc(scoutName)} made it there and back: ${esc(result.drop.text)}.`;
  } else if (result.location) {
    title = `Discovered: ${esc(result.location.name)}`;
    body = `${esc(scoutName)} found the ${esc(result.location.name)}. ${esc(result.location.desc)} Send a team there any day.`;
  } else if (result.landmark) {
    title = `Landmark: ${esc(result.landmark.name)}`;
    body = `${esc(scoutName)} spotted the ${esc(result.landmark.name)} at the edge of town. ${esc(result.landmark.boss.name)} is inside — a raid needs ${result.landmark.minTeam}+ students at Lv${result.landmark.minLevel} or higher, but it's guarding legendary gear.`;
  } else {
    title = TERRAIN_NAMES[result.find.terrain];
    body = `${esc(scoutName)} scouted the ${TERRAIN_NAMES[result.find.terrain].toLowerCase()} and found ${esc(result.find.text)}.`;
  }
  const nest = result.find?.type === "nest";
  return `<div class="modal-overlay" data-action="close-scout-report">
    <div class="char-card mission-card scout-report ${nest ? "scout-report-nest" : ""}" data-action="noop">
      <div class="scout-report-tile ${nest ? "hex-nest" : ""}">${hexTile(hexTileKey(q, r))}${nest ? `<span class="hex-badge hex-badge-nest">🧟 Nest</span>` : ""}</div>
      <h3>${title}</h3>
      <p>${body}</p>
      <button class="btn btn-primary" data-action="close-scout-report">Continue</button>
    </div>
  </div>`;
}

export function renderNestModal(state, nest) {
  const { q, r, ids } = nest;
  const candidates = state.characters.filter((c) => c.role === "student" && c.alive && !c.infection);
  const squad = ids.map((id) => getChar(state, id)).filter(Boolean);
  const rows = candidates
    .map((c) => {
      const tired = c.stamina < NEST_CLEAR_STAMINA;
      const picked = ids.includes(c.id);
      const full = !picked && ids.length >= NEST_CLEAR_MAX;
      return `<label class="check-row ${tired ? "check-row-disabled" : ""}">
        <input type="checkbox" data-action="toggle-nest-member" data-id="${c.id}" ${picked ? "checked" : ""} ${tired || full ? "disabled" : ""}/>
        <span class="assign-who">${nameTag(c)} — Lv${overallLevel(c)} ${statusTag(c)}${tired ? ' <span class="tag tag-injured">too tired</span>' : ""}</span>${staminaBar(c)}
      </label>`;
    })
    .join("");
  const pct = Math.round(nestClearChance(state, squad) * 100);
  return `<div class="modal-overlay" data-action="close-nest">
    <div class="char-card mission-card" data-action="noop">
      <button class="cc-close" data-action="close-nest" title="Close">✕</button>
      <div class="scout-report-tile hex-nest">${hexTile(hexTileKey(q, r))}<span class="hex-badge hex-badge-nest">🧟 Nest</span></div>
      <h3>🧟 Zombie Nest — ${TERRAIN_NAMES[hexTerrain(q, r)]}</h3>
      <p class="muted">While it's here, scouting next to it is more dangerous and locations beside it are riskier to raid. Send up to ${NEST_CLEAR_MAX} students (${NEST_CLEAR_STAMINA} stamina each) to burn it out — win and there's scrap, maybe gear, in the pile.</p>
      ${squad.length ? `<div class="mission-success ${pct >= 60 ? "mission-good" : pct >= 35 ? "mission-ok" : "mission-bad"}">Chance to clear it: <b>${pct}%</b></div>` : ""}
      <div class="mini-label">Squad (${squad.length}/${NEST_CLEAR_MAX})</div>
      <div class="check-list">${rows}</div>
      <div class="row-actions">
        <button class="btn btn-sm" data-action="close-nest">Not now</button>
        <button class="btn btn-primary" data-action="attack-nest" ${squad.length ? "" : "disabled"}>🔥 Burn it out</button>
      </div>
    </div>
  </div>`;
}

export function renderRaidModal(state, landmarkId) {
  const lm = LANDMARKS.find((l) => l.id === landmarkId);
  if (!lm) return "";
  const boss = raidBoss(state, lm);
  const cooldown = raidCooldownLeft(state, lm.id);
  const planned = state.raidTarget === lm.id;
  const squad = state.characters.filter((c) => c.exploreTeam === RAID_TEAM && c.alive);
  const rewards = Object.entries(lm.rewards).map(([k, v]) => `${RESOURCE_ICON[k]} ${v}`).join(" ");
  const header = `
    <div class="raid-intro">
      <div class="raid-intro-boss">${zombieSprite(lm.boss.look, 88)}</div>
      <div>
        <h3>☠ ${esc(boss.name)}</h3>
        <div class="muted">${esc(lm.name)}${boss.kills ? ` · killed ${boss.kills}× — tougher each time` : ""}</div>
        <div class="raid-boss-stats"><span>❤ ${boss.hp} HP</span><span>⚔ ${boss.damage} × ${boss.attacks} a round</span><span>⏱ ${RAID_MAX_ROUNDS} rounds</span></div>
      </div>
    </div>
    <p class="muted">${esc(lm.desc)}</p>
    <div class="raid-reqs">
      <span class="raid-req ${squad.length >= lm.minTeam ? "raid-req-ok" : ""}">👥 ${lm.minTeam}–${RAID_MAX_TEAM} students</span>
      <span class="raid-req raid-req-ok">⭐ Lv${lm.minLevel}+ each</span>
    </div>
    <div class="raid-rewards">
      <span class="legend-text">🌟 ${lm.legendaryItems} legendary item${lm.legendaryItems > 1 ? "s" : ""}</span>
      <span class="legend-text">🙋 ${Math.round(lm.legendaryRecruitChance * 100)}% legendary survivor</span>
      <span>${rewards}</span>
    </div>`;

  let body;
  if (cooldown) {
    body = `<div class="mission-success mission-ok">${esc(boss.name)} is dead — for now. Something takes its place in ${cooldown} day${cooldown === 1 ? "" : "s"}.</div>`;
  } else if (!planned) {
    body = `<div class="row-actions">
      <button class="btn btn-sm" data-action="close-raid">Not today</button>
      <button class="btn btn-primary" data-action="plan-raid" data-landmark="${lm.id}">☠ Plan a raid</button>
    </div>`;
  } else {
    const rows = state.characters
      .filter((c) => c.role === "student" && c.alive && !c.infection)
      .map((c) => {
        const lvl = overallLevel(c);
        const onSquad = c.exploreTeam === RAID_TEAM;
        const reason = onSquad
          ? null
          : lvl < lm.minLevel
          ? `needs Lv${lm.minLevel}`
          : c.exploreTeam !== null
          ? `on Team ${c.exploreTeam + 1}`
          : c.farmToday || c.scrapyardToday
          ? "working outside"
          : c.stamina <= 0
          ? "exhausted"
          : !onSquad && squad.length >= RAID_MAX_TEAM
          ? "squad full"
          : null;
        return `<label class="check-row ${reason ? "check-row-disabled" : ""}">
          <input type="checkbox" data-action="toggle-team-member" data-team="${RAID_TEAM}" data-id="${c.id}" ${onSquad ? "checked" : ""} ${reason ? "disabled" : ""}/>
          <span class="assign-who">${nameTag(c)} — Lv${lvl} ${statusTag(c)}${reason ? ` <span class="tag tag-injured">${reason}</span>` : ""}</span>${hpBar(c)}
        </label>`;
      })
      .sort((x, y) => x.includes("check-row-disabled") - y.includes("check-row-disabled"))
      .join("");
    let verdict = `<p class="muted">Pick at least ${lm.minTeam} students to see how the fight might go.</p>`;
    if (squad.length) {
      const est = raidEstimate(state, lm, squad);
      const cls = est.rounds <= RAID_MAX_ROUNDS * 0.7 ? "mission-good" : est.rounds <= RAID_MAX_ROUNDS ? "mission-ok" : "mission-bad";
      const say = est.rounds <= RAID_MAX_ROUNDS * 0.7 ? "should bring it down with time to spare" : est.rounds <= RAID_MAX_ROUNDS ? "a close fight — it could go either way" : "not enough firepower — they'd have to retreat";
      verdict = `<div class="mission-success ${cls}">~${est.perRound} damage a round → about ${est.rounds === Infinity ? "∞" : est.rounds} of ${RAID_MAX_ROUNDS} rounds: <b>${say}</b>${squad.length < lm.minTeam ? ` · needs ${lm.minTeam - squad.length} more` : ""}</div>`;
    }
    body = `${verdict}
      <div class="mini-label">Raid squad (${squad.length}/${RAID_MAX_TEAM})</div>
      <div class="check-list">${rows}</div>
      <p class="muted">The raid launches with the day's expeditions. Anyone who goes down is patched up with ${MEDICINE_PER_STABILIZE} medicine if you have it — otherwise they might not make it.</p>
      <div class="row-actions">
        <button class="btn btn-danger btn-sm" data-action="clear-raid">Call off</button>
        <button class="btn btn-primary" data-action="close-raid">☠ Confirm squad &amp; close</button>
      </div>`;
  }
  return `<div class="modal-overlay" data-action="close-raid">
    <div class="char-card mission-card raid-card" data-action="noop">
      <button class="cc-close" data-action="close-raid" title="Close">✕</button>
      ${header}
      ${body}
    </div>
  </div>`;
}

// The raid, replayed a round at a time: the squad on the left, the boss on the right.
export function renderRaidFight(state, anim) {
  const { report } = anim;
  const lm = LANDMARKS.find((l) => l.id === report.landmarkId);
  const frame = report.frames[anim.frameIndex];
  const hitIds = new Map(frame.hits.map((h) => [h.id, h]));
  const members = report.memberIds
    .map((id, i) => {
      const c = getChar(state, id);
      if (!c) return "";
      const hp = frame.hp[i];
      const pct = Math.max(0, Math.round((hp / c.maxHp) * 100));
      const hit = hitIds.get(id);
      return `<div class="raid-member ${hp <= 0 ? "raid-member-down" : ""} ${hit ? "raid-member-hit" : ""}">
        ${characterSprite(c, 40)}
        <div class="raid-hp"><div style="width:${pct}%"></div></div>
        <span class="raid-name">${esc(c.name.split(" ")[0])}</span>
        ${hit ? (hit.dodged ? `<span class="raid-float raid-float-dodge">dodge!</span>` : `<span class="raid-float raid-float-bad">-${hit.dmg}</span>`) : ""}
      </div>`;
    })
    .join("");
  const bossPct = Math.round((frame.bossHp / report.bossMaxHp) * 100);
  const done = anim.phase === "result";
  const loot = [
    ...report.items.map((it) => `<span class="legend-text">${it.icon} ${esc(it.name)}</span>`),
    ...(report.recruit ? [`<span class="legend-text">🙋 ${esc(report.recruit)} wants to join</span>`] : []),
    ...Object.entries(report.loot).map(([k, v]) => `<span>${RESOURCE_ICON[k]} +${v}</span>`),
  ];
  return `<div class="modal-overlay raid-overlay">
    <div class="raid-stage">
      <div class="raid-title">☠ Raid — ${esc(lm.name)}</div>
      <div class="raid-arena">
        <div class="raid-squad">${members}</div>
        <div class="raid-boss ${frame.enraged ? "raid-boss-enraged" : ""} ${frame.dealt ? "raid-boss-hit" : ""} ${frame.bossHp <= 0 ? "raid-boss-dead" : ""}">
          ${frame.dealt ? `<span class="raid-float raid-float-good">-${frame.dealt}</span>` : ""}
          ${zombieSprite(report.look, 128)}
          <div class="raid-boss-name">${esc(report.bossName)}${frame.enraged ? " · berserk" : ""}</div>
          <div class="raid-boss-bar"><div style="width:${bossPct}%"></div><span>${frame.bossHp} / ${report.bossMaxHp}</span></div>
        </div>
      </div>
      <div class="raid-log">${esc(frame.text)}</div>
      ${done
        ? `<div class="raid-result ${report.won ? "raid-won" : "raid-lost"}">
            <div class="raid-result-title">${report.won ? `${esc(report.bossName)} is dead!` : "The squad fell back."}</div>
            ${loot.length ? `<div class="raid-loot">${loot.join("")}</div>` : ""}
            ${report.lost.length ? `<div class="exp-bad">Lost: ${report.lost.map(esc).join(", ")}</div>` : ""}
            ${report.hurt.length ? `<div class="exp-hurt">${report.hurt.map(esc).join(" · ")}</div>` : ""}
            <button class="btn btn-primary" data-action="finish-raid">Continue</button>
          </div>`
        : `<button class="btn btn-sm raid-skip" data-action="skip-raid">⏭ Skip</button>`}
    </div>
  </div>`;
}

// End of Turn 2: each team walks out to its target, then reports what happened.
export function renderExpeditionReport(state, anim) {
  const { summary, phase } = anim;
  const arrived = phase === "report";
  const lootChips = (loot) => Object.entries(loot).filter(([, v]) => v).map(([k, v]) => `<span class="exp-chip">${RESOURCE_ICON[k]} +${v}</span>`).join("");
  const row = (color, fromKey, toKey, leader, title, resultTag, details) => `
    <div class="exp-row ${arrived ? "exp-arrived" : ""}" style="--team:${color}">
      <div class="exp-route">
        <div class="exp-tile">${hexTile(fromKey)}</div>
        <div class="exp-path"><span class="exp-walker">${leader ? characterSprite(leader, 22) : ""}</span></div>
        <div class="exp-tile">${hexTile(toKey)}</div>
      </div>
      <div class="exp-info">
        <div class="exp-head"><b>${title}</b>${arrived ? resultTag : `<span class="muted">on the way…</span>`}</div>
        ${arrived ? details : ""}
      </div>
    </div>`;

  const rows = summary.teams.map((t) => {
    const loc = LOCATIONS.find((l) => l.id === t.locationId);
    const leader = getChar(state, t.memberIds[0]);
    const tag = t.success ? `<span class="tag tag-ok">✅ Success</span>` : `<span class="tag tag-injured">⚠ Struggled</span>`;
    const details = `<div class="exp-finds">${lootChips(t.loot)}${t.finds.map((f) => `<span class="exp-chip">${esc(f)}</span>`).join("")}${t.recruit ? `<span class="exp-chip exp-good">🙋 ${esc(t.recruit)} wants to join</span>` : ""}</div>
      ${t.hurt.length ? `<div class="exp-hurt">🩹 ${t.hurt.map(esc).join(", ")}</div>` : ""}
      ${t.lost.length ? `<div class="exp-bad">☠ Lost: ${t.lost.map(esc).join(", ")}</div>` : ""}
      ${t.nearNest ? `<div class="muted">A zombie nest next door made it harder.</div>` : ""}`;
    return row(TEAM_COLORS[t.teamIndex], "school", loc.id, leader, `${teamLabel(t.teamIndex)} → ${esc(loc.name)}`, tag, details);
  });
  if (summary.raid?.calledOff) {
    const lm = LANDMARKS.find((l) => l.id === summary.raid.landmarkId);
    rows.push(`<div class="exp-row" style="--team:${TEAM_COLORS[RAID_TEAM]}">
      <div class="exp-info">
        <div class="exp-head"><b>Raid squad → ${esc(lm.name)}</b><span class="tag tag-injured">Called off</span></div>
        <div class="muted">Only ${summary.raid.squadSize} of the ${summary.raid.minTeam} students it needs — they stayed home.</div>
      </div>
    </div>`);
  } else if (summary.raid) {
    const rd = summary.raid;
    const lm = LANDMARKS.find((l) => l.id === rd.landmarkId);
    const tag = rd.won ? `<span class="tag tag-ok">☠ Boss slain</span>` : `<span class="tag tag-injured">Retreated</span>`;
    const details = `<div class="exp-finds">${rd.items.map((it) => `<span class="exp-chip exp-legend">${it.icon} ${esc(it.name)}</span>`).join("")}${rd.recruit ? `<span class="exp-chip exp-legend">🙋 ${esc(rd.recruit)}</span>` : ""}${lootChips(rd.loot)}</div>
      ${rd.hurt.length ? `<div class="exp-hurt">🩹 ${rd.hurt.map(esc).join(", ")}</div>` : ""}
      ${rd.lost.length ? `<div class="exp-bad">☠ Lost: ${rd.lost.map(esc).join(", ")}</div>` : ""}`;
    rows.push(row(TEAM_COLORS[RAID_TEAM], "school", lm.id, getChar(state, rd.memberIds[0]), `Raid squad → ${esc(lm.name)}`, tag, details));
  }
  return `<div class="modal-overlay">
    <div class="char-card mission-card exp-report" data-action="noop">
      <h3>🧳 Expedition Report — Day ${state.day}</h3>
      <div class="exp-rows">${rows.join("")}</div>
      ${arrived ? `<button class="btn btn-primary btn-big" data-action="finish-expedition">Continue to Night</button>` : ""}
    </div>
  </div>`;
}

export function renderScoutModal(state, q, r, isDrop = false) {
  const drop = isDrop ? dropAt(state, q, r) : null;
  const d = drop && MAP_DROPS[drop.kind];
  const cost = scoutCost(q, r);
  const danger = Math.round(scoutEncounterChance(state, q, r) * 100);
  const eligible = state.characters.filter((c) => c.role === "student" && c.alive && !c.infection && c.stamina >= cost);
  const canEverGo = state.characters.some((c) => c.role === "student" && c.alive && c.maxStamina >= cost);
  const rows = eligible
    .map(
      (s) => `<div class="check-row scout-row">
        <span class="assign-who">${nameTag(s)} ${statusTag(s)} <span class="muted" title="Their own chance of running into a zombie — high DEX sneaks past">🧟 ${Math.round(scoutEncounterChance(state, q, r, s) * 100)}%</span></span>${staminaBar(s)}
        <button class="btn btn-sm btn-primary" data-action="confirm-scout" data-id="${s.id}" data-q="${q}" data-r="${r}">Send (−${cost} stamina)</button>
      </div>`
    )
    .join("");

  return `
  <div class="modal-overlay" data-action="close-scout">
    <div class="char-card mission-card" data-action="noop">
      <button class="cc-close" data-action="close-scout" title="Close">✕</button>
      ${d
        ? `<h3>${d.icon} ${d.name}</h3>
      <p class="muted">${{ crate: "Supplies someone left behind", wreck: "A car full of scrap", survivor: "Someone waving from a rooftop — they'd join the school" }[drop.kind]}. Gone ${drop.expires <= state.day ? "tomorrow" : `in ${drop.expires - state.day + 1} days`}.</p>`
        : `<h3>🌫 Unexplored Territory</h3>
      <p class="muted">Every block hides something — supplies, gear, seeds, animals, survivors, or a zombie nest. The further from the school, the more it costs to get there.</p>`}
      <div class="mission-stats-row"><span>⚡ ${cost} stamina</span><span class="${danger >= 40 ? "plot-warn" : ""}">🧟 up to ${danger}% chance of a zombie — less for a high-DEX ${d ? "runner" : "scout"}</span></div>
      <div class="mini-label">${d ? "Send a runner" : "Send a scout"}</div>
      <div class="check-list">${rows || `<p class="muted">Nobody has the ${cost} stamina it takes to get this far out${canEverGo ? " right now — let someone rest first." : ". Raise a student's max stamina in Acrobatics to reach it."}</p>`}</div>
    </div>
  </div>`;
}

// A short, non-interactive cinematic shown over everything else while a scout's zombie
// encounter plays out — main.js drives it through two timed phases ("clash" then "result")
// before applying the flash message and letting the player continue.
export function renderFightAnimation(state, anim) {
  const c = getChar(state, anim.studentId);
  const sprite = c ? characterSprite(c, 96) : "";

  if (anim.phase === "clash") {
    return `
    <div class="modal-overlay fight-overlay">
      <div class="fight-scene">
        <div class="fight-combatant fight-scout">${sprite}</div>
        <div class="fight-impact">💥</div>
        <div class="fight-combatant fight-zombie">${zombieSprite("walker", 80)}</div>
      </div>
      <div class="fight-caption">${c ? esc(c.name) : "Your scout"} runs into a zombie…</div>
    </div>`;
  }

  const won = !anim.ambushed;
  return `
  <div class="modal-overlay fight-overlay">
    <div class="fight-result ${won ? "fight-win" : "fight-lose"}">
      <div class="fight-result-icon">${won ? "✅" : "☠"}</div>
      <div class="fight-result-text">${won ? "Fought them off!" : "Ambushed!"}</div>
    </div>
  </div>`;
}

// Replays one recorded frame of the night battle (see simulateEntranceBattle in game.js): who's
// standing where, everyone's HP, and flashes/pop-up numbers for whatever happened that tick.
function renderGridBattle(state, anim) {
  const { summary } = anim;
  const frame = summary.frames[anim.frameIndex];
  const size = summary.size;
  const third = Math.floor(size / 3);
  const key = (row, col) => `${row},${col}`;

  const byCell = {};
  const cell = (k) => byCell[k] || (byCell[k] = {});
  for (const st of frame.structures) if (!st.destroyed) cell(st.key).structure = st;
  for (const s of frame.students) cell(key(s.row, s.col)).student = s;
  for (const z of frame.zombies) cell(key(z.row, z.col)).zombie = z;

  const fx = {};
  const mark = (at, cls, pop) => {
    const k = key(at[0], at[1]);
    const f = fx[k] || (fx[k] = { cls: new Set(), pops: [] });
    f.cls.add(cls);
    if (pop) f.pops.push(pop);
  };
  for (const e of frame.events) {
    if (e.type === "attack") {
      const z = frame.zombies.find((zz) => zz.id === e.zid);
      mark(e.from, e.kind === "melee" ? "fx-swing" : "fx-shoot");
      mark(z ? [z.row, z.col] : e.to, e.hit ? "fx-hit" : "fx-miss", e.hit ? `-${e.dmg}` : "miss");
    } else if (e.type === "bite") mark(e.to, e.hit ? "fx-bitten" : "fx-miss", e.hit ? `-${e.dmg}` : "miss");
    else if (e.type === "spit") {
      mark(e.from, "fx-spit");
      mark(e.to, e.hit ? "fx-bitten" : "fx-miss", e.hit ? `🤮-${e.dmg}` : "miss");
    } else if (e.type === "kill") mark(e.at, "fx-kill", e.boss ? "👑💥" : "💥");
    else if (e.type === "destroyed") mark(e.at, "fx-kill", "💥");
    else if (e.type === "trap") mark(e.at, "fx-hit", `-${e.dmg}`);
    else if (e.type === "smash") mark(e.at, "fx-smash", `-${e.dmg}`);
    else if (e.type === "downed") mark(e.at, "fx-downed");
    else if (e.type === "breach") mark(e.at, "fx-breach", "🚨");
    else if (e.type === "gate") mark(e.at, "fx-smash", "🚪");
  }

  const bar = (hp, max, cls) => `<span class="gb-hp ${cls}"><span style="width:${Math.max(0, Math.round((hp / max) * 100))}%"></span></span>`;
  const cells = [];
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      const k = key(row, col);
      const x = byCell[k] || {};
      const f = fx[k];
      const zone = row < third ? "top" : row < third * 2 ? "mid" : "bottom";
      let inner = "";
      if (x.structure) {
        const def = DEFENSE_STRUCTURES.find((d) => d.id === x.structure.id);
        inner += `<span class="gb-structure">${def ? def.icon : "?"}</span>`;
        if (x.structure.maxHp) inner += bar(x.structure.hp, x.structure.maxHp, "gb-hp-wall");
      }
      if (x.student) {
        const c = getChar(state, x.student.id);
        inner += `<span class="gb-unit ${x.student.downed ? "gb-downed" : ""}">${c ? characterSprite(c, 30) : "🧍"}</span>`;
        inner += bar(x.student.hp, x.student.maxHp, "gb-hp-student");
      }
      if (x.zombie) {
        const T = ZOMBIE_TYPES[x.zombie.type] || ZOMBIE_TYPES.walker;
        const badge = T.badge ? `<span class="gb-zbadge">${T.badge}</span>` : "";
        inner += `<span class="gb-unit gb-zombie gb-z-${x.zombie.type}" title="${T.name}">🧟${badge}</span>${bar(x.zombie.hp, x.zombie.maxHp, "gb-hp-zombie")}`;
      }
      if (f) inner += f.pops.map((p) => `<span class="gb-pop">${p}</span>`).join("");
      cells.push(`<div class="gb-cell gb-${zone} ${f ? [...f.cls].join(" ") : ""}">${inner}</div>`);
    }
  }

  const gate = frame.gate.max
    ? `<div class="gb-gate"><span>🚪 Gate</span>${bar(frame.gate.hp, frame.gate.max, "gb-hp-gate")}<span class="muted">${frame.gate.hp}/${frame.gate.max}</span></div>`
    : `<div class="gb-gate gb-gate-none">🚪 No gate — anything that slips past the top row walks straight in</div>`;

  let footer;
  if (anim.phase === "battle") {
    footer = `<button class="btn" data-action="skip-battle">⏩ Skip to the result</button>`;
  } else {
    const { won, routed, killed, spawned, breached, downedCount, bossName, bossKilled } = summary;
    const icon = routed ? "🛡️" : won ? "✅" : "⚠️";
    const text = routed ? "The horde was routed!" : won ? "The entrance held!" : `${breached} zombie${breached === 1 ? "" : "s"} broke through!`;
    const bossLine = bossName
      ? `<div class="gb-boss-result ${bossKilled ? "fight-win" : "fight-lose"}">${bossKilled ? `👑 ${esc(bossName)} is down — its hoard is yours` : `👑 ${esc(bossName)} got away`}</div>`
      : "";
    footer = `<div class="fight-result gb-result ${won ? "fight-win" : "fight-lose"}">
        <div class="fight-result-icon">${icon}</div>
        <div class="fight-result-text">${text}</div>
        ${bossLine}
        <div class="gb-result-stats">💀 ${killed}/${spawned} put down · 🚨 ${breached} broke in · 🩸 ${downedCount} defender${downedCount === 1 ? "" : "s"} went down</div>
        <button class="btn btn-primary" data-action="finish-battle">Continue</button>
      </div>`;
  }

  return `
  <div class="modal-overlay fight-overlay gb-overlay">
    <div class="gb-header">
      <div class="gb-title">🌙 Night ${state.day} — ${summary.bossName ? `☠ ${esc(summary.bossName)} leads the horde` : "the horde hits the entrance"}</div>
      <div class="gb-counters">🧟 ${frame.spawned}/${summary.spawned} arrived · 💀 ${frame.killed} down · 🚨 ${frame.breached} broke in</div>
    </div>
    ${gate}
    <div class="gb-grid" style="--gb-size: ${size};">${cells.join("")}</div>
    ${footer}
  </div>`;
}

// The same clash -> result cinematic as renderFightAnimation, generalized to Turn 2's
// expeditions and Turn 3's Assault chase. Turn 3's main battle plays out on the grid instead.
export function renderBattleAnimation(state, anim) {
  if (anim.kind === "grid") return renderGridBattle(state, anim);

  if (anim.kind === "exploration") {
    if (anim.phase === "clash") {
      return `
      <div class="modal-overlay fight-overlay">
        <div class="fight-scene battle-lineup">
          <div class="battle-side"><div class="fight-combatant fight-scout">🧳</div></div>
          <div class="fight-impact">💥</div>
          <div class="fight-combatant fight-zombie">🧟</div>
        </div>
        <div class="fight-caption">Your teams reach the city…</div>
      </div>`;
    }

    const { teamsSent, successes, itemsFound = [], ingredientsFound = [], stockFound = [] } = anim.summary;
    const none = successes === 0;
    const icon = successes === teamsSent ? "🧳" : none ? "😬" : "⚖️";
    const text = `${successes}/${teamsSent} expedition${teamsSent === 1 ? "" : "s"} succeeded`;
    const finds = [
      ...itemsFound.map((it) => `${it.icon} ${esc(it.name)}`),
      ...ingredientsFound.map((g) => `${INGREDIENTS[g.id].icon} ${esc(INGREDIENTS[g.id].name)} ×${g.qty}`),
      ...stockFound.map((g) => stockLabel(g.id, g.qty)),
    ];
    const loot = finds.length ? `<div class="fight-result-sub">Found: ${finds.join(", ")}</div>` : "";
    return `
    <div class="modal-overlay fight-overlay">
      <div class="fight-result ${none ? "fight-lose" : "fight-win"}">
        <div class="fight-result-icon">${icon}</div>
        <div class="fight-result-text">${text}</div>
        ${loot}
      </div>
    </div>`;
  }

  // kind === "assault" — the squad (whoever defended tonight) chasing the horde's leader
  if (anim.phase === "clash") {
    const squad = state.characters.filter((c) => c.defending && c.alive);
    const shown = squad.slice(0, 4);
    const extra = squad.length - shown.length;
    const sprites = shown.map((c) => `<div class="fight-combatant fight-scout">${characterSprite(c, 72)}</div>`).join("");
    return `
    <div class="modal-overlay fight-overlay">
      <div class="fight-scene battle-lineup">
        <div class="battle-side">${sprites || '<div class="fight-combatant fight-scout">🧍</div>'}${extra > 0 ? `<div class="battle-extra">+${extra}</div>` : ""}</div>
        <div class="fight-impact">💥</div>
        <div class="fight-combatant fight-zombie">🧟‍♂️</div>
      </div>
      <div class="fight-caption">The squad chases the horde's leader into the dark…</div>
    </div>`;
  }

  const won = anim.summary.won;
  return `
  <div class="modal-overlay fight-overlay">
    <div class="fight-result ${won ? "fight-win" : "fight-lose"}">
      <div class="fight-result-icon">${won ? "🏆" : "💨"}</div>
      <div class="fight-result-text">${won ? "Struck it rich!" : "The chase came up empty."}</div>
    </div>
  </div>`;
}

export function renderMissionModal(state, locationId) {
  const loc = LOCATIONS.find((l) => l.id === locationId);
  const teamIndex = state.teamLocations.indexOf(locationId);
  if (!loc || teamIndex === -1) return "";

  const members = state.characters.filter((c) => c.exploreTeam === teamIndex && c.alive);
  const availableStudents = state.characters.filter(
    (c) =>
      c.role === "student" &&
      c.alive &&
      !c.infection &&
      (c.exploreTeam === null || c.exploreTeam === teamIndex) &&
      !c.farmToday && !c.scrapyardToday
  );
  const studentRows = availableStudents
    .map((s) => {
      const checked = s.exploreTeam === teamIndex ? "checked" : "";
      const exhausted = s.stamina <= 0 && s.exploreTeam !== teamIndex;
      const disabled = (members.length >= 5 && s.exploreTeam !== teamIndex) || exhausted ? "disabled" : "";
      return `<label class="check-row ${exhausted ? "check-row-disabled" : ""}">
        <input type="checkbox" data-action="toggle-team-member" data-team="${teamIndex}" data-id="${s.id}" ${checked} ${disabled}/>
        <span class="assign-who">${nameTag(s)} — Lv${overallLevel(s)} ${statusTag(s)}${exhausted ? ' <span class="tag tag-injured">exhausted</span>' : ""}</span>${staminaBar(s)}
      </label>`;
    })
    .join("");

  let successHtml = `<p class="muted">Assign students to estimate the odds of success.</p>`;
  if (members.length) {
    const avg = (statKey) => members.reduce((sum, c) => sum + effectiveGrade(state, c, statKey), 0) / members.length;
    const power = (avg("PE") + avg("Gymnastics")) / 2;
    const requirement = loc.difficulty * 15;
    const pct = Math.round(Math.max(0, Math.min(1, 0.3 + (power - requirement) / 100)) * 100);
    const cls = pct >= 60 ? "mission-good" : pct >= 35 ? "mission-ok" : "mission-bad";
    successHtml = `<div class="mission-success ${cls}">Estimated success: <b>${pct}%</b>${members.length < 5 ? " — a fuller team does better" : " — full team!"}</div>`;
  }

  return `
  <div class="modal-overlay" data-action="close-mission">
    <div class="char-card mission-card" data-action="noop">
      <button class="cc-close" data-action="close-mission" title="Close">✕</button>
      <h3>${LOCATION_ICON[locationId]} ${esc(loc.name)}</h3>
      <p class="muted">${esc(loc.desc)}</p>
      <div class="mission-stats-row">
        <span>Difficulty ${loc.difficulty}/5</span>
        <span>Danger ${loc.danger}/5</span>
        ${loc.recruitBonus ? `<span>🙋 Good recruit odds</span>` : ""}
        ${loc.serumChance ? `<span ${tipAttr({ title: "💉 Antiviral Serum", notes: ["The only cure for an infection — one per person", "Rare: found here, at the Hospital, Pharmacy and Fire Station, and on raid bosses"] })}>💉 Rare: antiviral serum (${Math.round(loc.serumChance * 100)}%)</span>` : ""}
      </div>
      ${nextToNest(state, loc.hex.q, loc.hex.r) ? `<div class="mission-success mission-bad">${dangerNotes(state, loc.hex.q, loc.hex.r).join(" · ")}: lower odds and more injuries.</div>` : ""}
      ${successHtml}
      <div class="mini-label">Team (${members.length}/5)</div>
      <div class="check-list">${studentRows || '<p class="muted">No available students.</p>'}</div>
      <div class="row-actions">
        <button class="btn btn-danger btn-sm" data-action="clear-mission" data-team="${teamIndex}">Recall Team</button>
        <button class="btn btn-primary" data-action="close-mission">🗡️ Confirm Team &amp; Close</button>
      </div>
    </div>
  </div>`;
}

const FACILITY_LABEL = { farm: "Farm", scrapyard: "Scrapyard" };
const FACILITY_ICON = { farm: "🌾", scrapyard: "🔩" };

function renderTurn3Overview(state) {
  if (state.pendingRaid) return renderFacilityRaidPanel(state);

  const defenders = state.characters.filter((c) => c.defending && c.alive);
  const available = state.characters.filter((c) => c.role === "student" && c.alive && !c.infection && c.exploreTeam === null);
  const zombies = zombieCountForDay(state.day);
  const z = zombieStatsForDay(state.day);
  const unarmed = defenders.filter((c) => !c.equipment?.meleeWeapon && !c.equipment?.rangedWeapon).length;
  const stabilizeCost = MEDICINE_PER_STABILIZE - techPerk(state, "stabilizeDiscount");
  const saves = Math.floor(state.resources.medicine / stabilizeCost);
  const comp = hordeComposition(state.day);
  const mix = ["walker", "runner", "brute", "spitter"]
    .filter((t) => comp[t])
    .map((t) => `${comp[t]} ${ZOMBIE_TYPES[t].name.toLowerCase()}${comp[t] === 1 ? "" : "s"}${ZOMBIE_TYPES[t].badge ? ` ${ZOMBIE_TYPES[t].badge}` : ""}`)
    .join(", ");
  const boss = isBossNight(state.day)
    ? `<div class="boss-warning">☠ <b>Boss night:</b> ${esc(bossNameForDay(state.day))} brings up the rear —
       ${Math.round(z.hp * ZOMBIE_TYPES.boss.hpMult)} HP, hits for about ${Math.round(z.damage * ZOMBIE_TYPES.boss.dmgMult)}, smashes walls three
       times as hard. Bring it down for its hoard.</div>`
    : "";

  const rows = available
    .map((c) => {
      const checked = c.defending ? "checked" : "";
      return `<label class="check-row">
        <input type="checkbox" data-action="toggle-defend" data-id="${c.id}" ${checked}/>
        ${nameTag(c)} — ${strDexLabel(c)} ${statusTag(c)}
      </label>`;
    })
    .join("");

  return `
  <div class="card">
    <h2>Turn 3 — Night Watch ${infoDot({ title: "🌙 Turn 3 — Night Watch", notes: ["The horde climbs the grid from the bottom, one row a turn", "Melee hits 1–2 squares away, ranged 4–9, fists only point-blank", "Walls block a lane until smashed; traps hurt whatever walks over", "A zombie past the top row hits the gate, then the school"] })}</h2>
    <p class="room-tagline">Post defenders on the top rows, build in the middle — the horde climbs up from the bottom</p>
    ${boss}
    <div class="summary-list">
      <div>Tonight's horde: <b>${zombies} zombies</b> — ${mix}. A walker has ${z.hp} HP and hits for about ${z.damage}.</div>
      <div>Gate: <b>${gateHp(state)} HP</b> ${state.fortification ? "(from fortification)" : "— no fortification yet, so anything that slips past gets straight in"}</div>
      <div>Defenders on the grid: <b>${defenders.length}</b>${unarmed ? ` · ⚠️ ${unarmed} fighting bare-handed — hand out weapons from each student's Inventory tab` : ""}</div>
      <div>Medicine: <b>${state.resources.medicine}</b> — enough to patch up <b>${saves}</b> defender${saves === 1 ? "" : "s"} who go down (${stabilizeCost} each; without it, they might not get back up)</div>
    </div>
    ${renderEntranceGrid(state)}
    <div class="mini-label">Quick assign — drops them on the front line</div>
    <div class="check-list">${rows || '<p class="muted">Nobody available.</p>'}</div>
    <button class="btn btn-primary btn-big" data-action="resolve-turn">🛡 Defend the Entrance &amp; Advance to Next Day</button>
  </div>`;
}

// A won main battle can peel off part of the horde toward one of the outside facilities — this
// replaces the normal Night Watch panel until it's resolved, since it's the same slot in the
// turn flow (there's no skipping past it; it *is* what advancing the day now requires).
function renderFacilityRaidPanel(state) {
  const facility = state.pendingRaid.facility;
  const available = state.characters.filter((c) => c.role === "student" && c.alive && !c.infection && c.exploreTeam === null);
  const rows = available
    .map((c) => {
      const checked = state.raidDefenders.includes(c.id) ? "checked" : "";
      return `<label class="check-row">
        <input type="checkbox" data-action="toggle-raid-defender" data-id="${c.id}" ${checked}/>
        ${nameTag(c)} — ${strDexLabel(c)} ${statusTag(c)}
      </label>`;
    })
    .join("");

  return `
  <div class="card">
    <h2>${FACILITY_ICON[facility]} The ${FACILITY_LABEL[facility]} is Under Attack!</h2>
    <p>While the entrance held, part of the horde broke off toward the ${FACILITY_LABEL[facility]}. Send students to
    defend it before the night is over — high STR/DEX repels them.</p>
    <div class="mini-label">Assign defenders (${state.raidDefenders.length})</div>
    <div class="check-list">${rows || '<p class="muted">Nobody available.</p>'}</div>
    <button class="btn btn-primary btn-big" data-action="resolve-raid">⚔ Repel the Raid &amp; Advance to Next Day</button>
  </div>`;
}

// The Assault popup — shown automatically (see main.js render()) whenever state.pendingAssault
// is true. Resolves immediately on "Chase" using whoever defended that night, no team-picker.
export function renderAssaultModal() {
  return `
  <div class="modal-overlay" data-action="assault-decline">
    <div class="char-card mission-card" data-action="noop">
      <h3>⚔ The Horde is Retreating</h3>
      <p class="muted">Your squad broke the attack and the horde is falling back. Chase them down for a chance at
      extra loot, XP, and — if you're lucky — a legendary survivor? Whoever defended tonight will make the run.</p>
      <div class="row-actions">
        <button class="btn btn-sm" data-action="assault-decline">🏠 Let them go</button>
        <button class="btn btn-primary" data-action="assault-chase">⚔ Chase the horde</button>
      </div>
    </div>
  </div>`;
}

// ---------- assignment picker ----------
// A single generic "who should fill this slot" modal, replacing what used to be 8 separate
// plain <select> dropdowns (Gym/Cafeteria/Classroom/Research/Crafting/Farm/Scrapyard).
// Characters already busy elsewhere still show up (greyed out, sorted to the bottom, no
// Assign button) instead of silently disappearing, so the player can see where everyone is.

const STUDENT_SORT_FIELDS = [
  { key: "level", label: "Level" },
  { key: "STR", label: "STR" },
  { key: "DEX", label: "DEX" },
  { key: "CON", label: "CON" },
  { key: "INT", label: "INT" },
  { key: "WIS", label: "WIS" },
  { key: "CHA", label: "CHA" },
];
const TEACHER_SORT_FIELDS = STUDENT_SORT_FIELDS.filter((f) => f.key !== "level");

// Classrooms only teach the four desk subjects, so say which one a teacher would take on — and
// point a teacher whose best grade is PE or Gymnastics toward the Gym, where it actually counts.
// A room that already has a subject keeps it, so a second or third teacher teaches that.
function classroomTeacherNote(t, roomSubject = null) {
  const subject = roomSubject || bestClassroomSubjectFor(t);
  let note = `<div class="picker-note">📚 Would ${roomSubject ? "help teach" : "teach"} <b>${SUBJECT_LABEL[subject]}</b> here (${gradeLetter(t.grades[subject])})</div>`;
  const gym = ["PE", "Gymnastics"].filter((s) => t.grades[s] > t.grades[subject]).sort((a, b) => t.grades[b] - t.grades[a])[0];
  if (gym) {
    note += `<div class="picker-note picker-note-warn">${gym === "PE" ? "💪" : "🤸"} Best at ${SUBJECT_LABEL[gym]} (${gradeLetter(t.grades[gym])}) — classrooms don't teach it. They'd do more coaching in ${GYM_SIDES[gym].ref}.</div>`;
  }
  return note;
}

function pickerSortValue(c, sortKey) {
  if (sortKey === "level") return overallLevel(c);
  const subject = SUBJECTS.find((s) => STAT_OF_SUBJECT[s] === sortKey);
  return c.grades[subject];
}

function teacherBusyLabel(state, c, exceptPost) {
  if (c.infection) return "🦠 Infected — in quarantine";
  if (!c.post || c.post === exceptPost) return null;
  return occupationLabel(state, c);
}

function studentBusyLabel(c, exceptFlag) {
  if (c.infection) return "🦠 Infected — in quarantine";
  if (exceptFlag !== "gymToday" && c.gymToday) return `Training in ${GYM_SIDES[c.gymToday].ref}`;
  if (exceptFlag !== "infirmaryToday" && c.infirmaryToday) return "In the Nurse's Office";
  if (exceptFlag !== "restToday" && c.restToday) return "Resting in the Cafeteria";
  if (exceptFlag !== "radioToday" && c.radioToday) return "On the air at the Radio Station";
  if (exceptFlag !== "researchToday" && c.researchToday) return "Assisting in the Research Room";
  if (exceptFlag !== "craftingToday" && c.craftingToday) return "Helping in the Crafting Room";
  if (exceptFlag !== "farmToday" && c.farmToday) return "Working the Farm";
  if (exceptFlag !== "scrapyardToday" && c.scrapyardToday) return "Working the Scrapyard";
  if (c.exploreTeam !== null) return c.exploreTeam === RAID_TEAM ? "On the raid squad" : `Exploring (Team ${c.exploreTeam + 1})`;
  if (exceptFlag !== "defending" && c.defending) return "Defending the Entrance";
  return null;
}

function resolvePickerCandidates(state, picker) {
  const { kind, roomId, postKey } = picker;
  const teacherRow = (c, exceptPost) => ({ c, reason: teacherBusyLabel(state, c, exceptPost) });
  const studentRow = (c, exceptFlag, extraReason) => ({ c, reason: studentBusyLabel(c, exceptFlag) || (extraReason ? extraReason(c) : null) });

  switch (kind) {
    case "gym-teacher":
      return {
        role: "teacher", title: `Assign a ${GYM_SIDES[postKey].room} Coach`,
        list: state.characters.filter((c) => c.role === "teacher" && c.alive && c.post !== `gym:${postKey}`).map((c) => teacherRow(c, `gym:${postKey}`)),
      };
    case "gym-student":
      return {
        role: "student", title: `Send a Student to ${GYM_SIDES[postKey].ref}`,
        list: state.characters.filter((c) => c.role === "student" && c.alive && !c.infection && c.gymToday !== postKey)
          .map((c) => studentRow(c, "gymToday")),
      };
    case "cafeteria-teacher":
      return {
        role: "teacher", title: "Assign a Cook",
        list: state.characters.filter((c) => c.role === "teacher" && c.alive && c.post !== "cafeteria").map((c) => teacherRow(c, "cafeteria")),
      };
    case "infirmary-teacher":
      return {
        role: "teacher", title: "Assign a Nurse",
        list: state.characters.filter((c) => c.role === "teacher" && c.alive && c.post !== "infirmary").map((c) => teacherRow(c, "infirmary")),
      };
    case "infirmary-student":
      return {
        role: "student", title: "Send a Student to the Nurse",
        list: state.characters.filter((c) => c.role === "student" && c.alive && !c.infection && !c.infirmaryToday)
          .map((c) => studentRow(c, "infirmaryToday", (c) => (c.hp >= c.maxHp ? "Already at full HP" : null))),
      };
    case "research-student":
      return {
        role: "student", title: "Send a Student to the Research Room",
        list: state.characters.filter((c) => c.role === "student" && c.alive && !c.infection && !c.researchToday)
          .sort((a, b) => b.grades.Physics - a.grades.Physics)
          .map((c) => studentRow(c, "researchToday")),
      };
    case "crafting-student":
      return {
        role: "student", title: "Send a Student to the Crafting Room",
        list: state.characters.filter((c) => c.role === "student" && c.alive && !c.infection && !c.craftingToday)
          .sort((a, b) => b.grades.Gymnastics - a.grades.Gymnastics)
          .map((c) => studentRow(c, "craftingToday")),
      };
    case "radio-student":
      return {
        role: "student", title: "Put a Student on the Air",
        list: state.characters.filter((c) => c.role === "student" && c.alive && !c.infection && !c.radioToday)
          .sort((a, b) => b.grades.SocialStudies - a.grades.SocialStudies)
          .map((c) => studentRow(c, "radioToday")),
      };
    case "cafeteria-rest":
      return {
        role: "student", title: "Send a Student to Rest",
        list: state.characters.filter((c) => c.role === "student" && c.alive && !c.infection && !c.restToday)
          .map((c) => studentRow(c, "restToday", (c) => (c.stamina >= c.maxStamina ? "Already fully rested" : null))),
      };
    case "classroom-teacher": {
      const post = `classroom:${roomId}`;
      return {
        role: "teacher", title: "Assign a Classroom Teacher",
        list: state.characters.filter((c) => c.role === "teacher" && c.alive && c.post !== post)
          .map((c) => ({ c, reason: teacherBusyLabel(state, c, post), note: classroomTeacherNote(c, state.rooms.classrooms[roomId].subject) })),
      };
    }
    case "classroom-seat":
      return {
        role: "student", title: "Assign a Seat",
        list: state.characters.filter((c) => c.role === "student" && c.alive)
          .map((c) => ({ c, reason: c.seat ? `Seated in ${roomDisplayName(state, c.seat.room)}` : null })),
      };
    case "utility":
      return {
        role: "teacher", title: "Assign a Teacher",
        list: state.characters.filter((c) => c.role === "teacher" && c.alive && c.post !== postKey).map((c) => teacherRow(c, postKey)),
      };
    case "entrance-student": {
      const placed = new Set(Object.values(state.entranceGrid.students));
      return {
        role: "student", title: "Place a Student at the Entrance",
        list: state.characters.filter((c) => c.role === "student" && c.alive && !c.infection && !placed.has(c.id))
          .map((c) => studentRow(c, "defending")),
      };
    }
    case "farm":
    case "scrapyard": {
      const flagKey = `${kind}Today`;
      const label = kind.charAt(0).toUpperCase() + kind.slice(1);
      return {
        role: "student", title: `Assign to the ${label}`,
        list: state.characters.filter((c) => c.role === "student" && c.alive && !c.infection && !c[flagKey]).map((c) => studentRow(c, flagKey)),
      };
    }
    default:
      return { role: "student", title: "Assign", list: [] };
  }
}

export function renderPickerModal(state, picker, sortKey, sortDir) {
  const { role, title, list } = resolvePickerCandidates(state, picker);
  const fields = role === "student" ? STUDENT_SORT_FIELDS : TEACHER_SORT_FIELDS;
  const effectiveSortKey = fields.some((f) => f.key === sortKey) ? sortKey : fields[0].key;

  const sorted = [...list].sort((a, b) => {
    if (!!a.reason !== !!b.reason) return a.reason ? 1 : -1; // selectable first, busy/ineligible last
    const va = pickerSortValue(a.c, effectiveSortKey);
    const vb = pickerSortValue(b.c, effectiveSortKey);
    return sortDir === "asc" ? va - vb : vb - va;
  });

  const rows = sorted
    .map(
      ({ c, reason, note }) => `
    <div class="picker-row ${reason ? "picker-row-disabled" : ""}">
      <div class="picker-row-main">
        <span>${nameTag(c)} ${role === "student" ? `<span class="muted">Lv${overallLevel(c)}</span>` : ""}</span>
        ${reason ? `<span class="tag tag-injured">${esc(reason)}</span>` : `<button class="btn btn-sm btn-primary" data-action="confirm-picker" data-id="${c.id}">✓ Assign</button>`}
      </div>
      ${note || ""}
      ${statChips(c)}
    </div>`
    )
    .join("");

  const sortOptions = fields.map((f) => `<option value="${f.key}" ${f.key === effectiveSortKey ? "selected" : ""}>${f.label}</option>`).join("");

  return `
  <div class="modal-overlay" data-action="close-picker">
    <div class="char-card mission-card" data-action="noop">
      <button class="cc-close" data-action="close-picker" title="Close">✕</button>
      <h3>${esc(title)}</h3>
      <div class="picker-sort-row">
        <span class="mini-label">Sort by</span>
        <select data-action="set-picker-sort">${sortOptions}</select>
        <button class="btn btn-sm" data-action="toggle-picker-sort-dir" title="Toggle ascending/descending">${sortDir === "asc" ? "⬆ Ascending" : "⬇ Descending"}</button>
      </div>
      <div class="check-list picker-list">${rows || '<p class="muted">No one available.</p>'}</div>
    </div>
  </div>`;
}

export function renderDefenseBuildModal(state, cellKey) {
  const options = DEFENSE_STRUCTURES.map((d) => {
    const affordable = Object.keys(d.cost).every((res) => (state.resources[res] || 0) >= d.cost[res]);
    const costLabel = Object.keys(d.cost).map((res) => `${TECH_EFFECT_ICON[res] || ""} ${d.cost[res]}`).join("  ");
    return `<button class="defense-build-option" data-action="build-defense" data-cell="${cellKey}" data-structure="${d.id}" ${affordable ? "" : "disabled"}>
      <div class="defense-build-option-main"><span class="tech-icon">${d.icon}</span> <b>${esc(d.name)}</b> <span class="muted">${costLabel}</span></div>
      <p class="muted">${esc(d.desc)}</p>
    </button>`;
  }).join("");

  return `
  <div class="modal-overlay" data-action="close-defense-build">
    <div class="char-card mission-card" data-action="noop">
      <button class="cc-close" data-action="close-defense-build" title="Close">✕</button>
      <h3>Build a Defense</h3>
      <div class="defense-build-list">${options}</div>
    </div>
  </div>`;
}

// ---------- floor 1 ----------

function entranceCellKey(row, col) {
  return `${row},${col}`;
}

// Shown during the Night Watch (Turn 3's overview and Defense tab), where defenders take their
// spots and defenses get built.
function renderEntranceGrid(state) {
  const grid = state.entranceGrid;
  const size = grid.size;
  const third = Math.floor(size / 3);
  const cells = [];

  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      const key = entranceCellKey(row, col);
      if (row < third) {
        const studentId = grid.students[key];
        const c = studentId ? getChar(state, studentId) : null;
        const eq = c?.equipment || {};
        const gear = [eq.meleeWeapon, eq.rangedWeapon].filter(Boolean);
        const gearTitle = gear.length ? gear.map((w) => `${w.name} (range ${w.range})`).join(", ") : "bare fists (range 1)";
        cells.push(
          c && c.alive
            ? `<div class="entrance-cell entrance-cell-top entrance-cell-filled" title="${esc(c.name)} — ${esc(gearTitle)}">
                <button class="cell-remove" data-action="clear-entrance-student" data-cell="${key}" title="Remove">✕</button>
                <span class="entrance-cell-portrait">${characterSprite(c, 26)}</span>
                <span class="entrance-cell-gear">${gear.length ? gear.map((w) => w.icon).join("") : "👊"}</span>
              </div>`
            : `<div class="entrance-cell entrance-cell-top entrance-cell-empty" data-action="open-picker" data-kind="entrance-student" data-room="${key}" title="Place a student here">+</div>`
        );
      } else if (row < third * 2) {
        const structureId = grid.defenses[key];
        const def = structureId ? DEFENSE_STRUCTURES.find((d) => d.id === structureId) : null;
        cells.push(
          def
            ? `<div class="entrance-cell entrance-cell-mid entrance-cell-filled" title="${esc(def.name)}">
                <button class="cell-remove" data-action="clear-defense" data-cell="${key}" title="Demolish">✕</button>
                <span class="entrance-cell-icon">${def.icon}</span>
              </div>`
            : `<div class="entrance-cell entrance-cell-mid entrance-cell-empty" data-action="open-defense-build" data-cell="${key}" title="Build a defense here">+</div>`
        );
      } else {
        cells.push(`<div class="entrance-cell entrance-cell-bottom"></div>`);
      }
    }
  }

  return `
    <div class="entrance-grid" style="grid-template-columns: repeat(${size}, 1fr);">${cells.join("")}</div>
    <p class="muted entrance-legend">🔵 Top — defenders &nbsp;·&nbsp; 🟡 Middle — build defenses &nbsp;·&nbsp; 🔴 Bottom — the horde spawns here</p>`;
}

// The Gymnasium (PE → STR) and Acrobatics (Gymnastics → DEX) work the same way, taught like a class.
function renderTrainingRoom(state, side) {
  const info = GYM_SIDES[side];
  const room = gymRoom(state, side);
  const students = state.characters.filter((c) => c.gymToday === side && c.alive);
  const teachers = gymTeachers(state, side);
  // How a session adds up: the room's level bonus, plus each teacher's bonus for their grade.
  const lesson = gymLesson(state, side);
  const level = roomLevel(state, info.roomKey);
  const gainHow = {
    title: `${info.icon} +${lesson.gain} ${info.gains} a session`,
    rows: [[`Room · level ${level}`, `+${lesson.levelBonus}`],
      ...(teachers.length ? teachers.map((t) => [`${esc(shortName(t))} · ${gradeLetter(t.grades[side])}`, `+${teachingBonus(t.grades[side])}`]) : [tipNone("No teacher yet", "+0")])],
    total: ["Total", `+${lesson.gain}`],
    notes: [`Stops at <b>${lesson.ceiling}</b> — the best teacher's grade (${NO_TEACHER_CAP} with none)`, "Teachers add D +1 · C +3 · B +5 · A +7 · S +10", `More ${info.gains} also means more ${info.also}`],
  };
  return `<div class="room room-${info.roomKey}">
    ${roomScene(`${info.roomKey}@${level}`, [...teachers, ...students], `${info.room}${levelBadge(state, info.roomKey)}`,
      "",
      roomUpgradeButton(state, info.roomKey))}
    ${staffLine(state, "Teacher", teachers, room.teacherCapacity,
      (t) => staffRow(t, `${gradeLetter(t.grades[side])} <span class="muted">+${teachingBonus(t.grades[side])}</span>`, `${t.name} — ${STAT_OF_SUBJECT[side]} ${gradeLetter(t.grades[side])}, adds +${teachingBonus(t.grades[side])} a session`),
      `data-action="open-picker" data-kind="gym-teacher" data-post="${side}"`)}
      ${statRow(`Training today (${students.length}/${room.studentCapacity})`, `${info.icon} <b>+${lesson.gain}</b> ${info.gains} · up to ${lesson.ceiling} ${infoDot(gainHow)}`)}
      ${tileGrid(
        students.map((s) => personTile(s, {
          extra: gainLine(s.grades[side], s.grades[side] + trainingGain(state, s, side), "max"),
          remove: "remove-gym",
          title: `${s.name} — ${info.gains} ${s.grades[side]} → ${s.grades[side] + trainingGain(state, s, side)} after today's session${s.grades[side] >= lesson.ceiling ? ` (at the limit of ${lesson.ceiling})` : ""}`,
        })),
        room.studentCapacity - students.length,
        `data-action="open-picker" data-kind="gym-student" data-post="${side}"`
      )}
  </div>`;
}

export function renderFloor1(state) {
  const cafeRoom = state.rooms.cafeteria;

  const cooks = cooksOnDuty(state);

  const infRoom = state.rooms.infirmary;
  const nurses = state.characters.filter((c) => c.role === "teacher" && c.post === "infirmary" && c.alive);
  const patients = state.characters.filter((c) => c.infirmaryToday && c.alive);
  const infected = infectedChars(state);
  const bedsFree = infRoom.studentCapacity - infirmaryBedsUsed(state);
  const treatedIds = treatedPatientIds(state);
  const cafeLevel = roomLevel(state, "cafeteria");
  const napBonus = techPerk(state, "restRecovery");
  const cafeRations = CAFETERIA_RATIONS_BY_LEVEL[cafeLevel - 1];
  const cafeHow = {
    title: "🍲 Cafeteria",
    rows: [["Dishes a day · 1 per cook", `${dishCapacity(state)}`], ["Rations while cooking", `+${cafeRations} food`],
      [`Rest · level ${cafeLevel}`, `+${cafeteriaRest(state) - napBonus}`], ...(napBonus ? [["Power Naps", `+${napBonus}`]] : [])],
    total: ["Rest per student", `+${cafeteriaRest(state)} stamina`],
    notes: ["A dish's buff covers the whole school until tonight", "Cook dishes from the menu below"],
  };
  const nurseBonus = infirmaryNurseBonus(state);
  const healHp = infirmaryHeal(state) + nurseBonus;
  const nurseParts = nurses.map((t) => `${nurseHpBonus(t)} (${shortName(t)}, CON ${gradeLetter(t.grades.Biology)})`);
  const nurseHow = {
    title: `💊 Heal +${healHp} HP`,
    rows: [[`Room · level ${roomLevel(state, "infirmary")}`, `+${infirmaryHeal(state)}`],
      ...(nurses.length ? nurses.map((t) => [`${esc(shortName(t))} · CON ${gradeLetter(t.grades.Biology)}`, `+${nurseHpBonus(t)}`]) : [tipNone("No nurse yet", "+0")])],
    total: ["Per treatment", `+${healHp} HP`],
    notes: [`Costs ${INFIRMARY_MEDICINE_PER_PATIENT} medicine — without it, only bed rest (+${INFIRMARY_BED_REST} HP)`, `Nurses add ${INFIRMARY_NURSE_HP_PER_RANK} HP per CON rank (D +5 … S +25)`, "The infected wait in quarantine, not in a bed"],
  };
  const resting = state.characters.filter((c) => c.restToday && c.alive);

  const served = state.dishesToday.map((id) => DISHES.find((d) => d.id === id)).filter(Boolean);
  return `
  <div class="card">
    <h2>Floor 1 — Lobby</h2>
    <div class="floor-grid floor1-grid">
      ${renderTrainingRoom(state, "PE")}
      ${renderTrainingRoom(state, "Gymnastics")}
      <div class="room room-cafeteria">
        ${roomScene(`cafeteria@${cafeLevel}`, [...cooks, ...resting], `Cafeteria${levelBadge(state, "cafeteria")}`,
          "",
          roomUpgradeButton(state, "cafeteria"))}
        ${staffLine(state, "Cook", cooks, cafeRoom.teacherCapacity,
          (t) => staffRow(t, gradeLetter(t.grades.Biology), `${t.name} — CON ${gradeLetter(t.grades.Biology)}`),
          'data-action="open-picker" data-kind="cafeteria-teacher"')}
        ${statRow(`Resting today (${resting.length}/${cafeRoom.studentCapacity})`, `🍲 <b>${dishCapacity(state)}</b> dish${dishCapacity(state) === 1 ? "" : "es"} a day · 😴 <b>+${cafeteriaRest(state)}</b> stamina ${infoDot(cafeHow)}`)}
        ${tileGrid(
          resting.map((s) => {
            const to = Math.min(s.maxStamina, s.stamina + cafeteriaRest(state));
            return personTile(s, { extra: gainLine(s.stamina, to, "full"), remove: "remove-rest", title: `${s.name} — stamina ${s.stamina} → ${to} of ${s.maxStamina} after resting` });
          }),
          cafeRoom.studentCapacity - resting.length,
          'data-action="open-picker" data-kind="cafeteria-rest"'
        )}
        <div class="mini-label">Today's menu (${state.dishesToday.length}/${dishCapacity(state)} dish${dishCapacity(state) === 1 ? "" : "es"} served)</div>
        <div class="menu-strip">
          ${served.map((d) => `<span class="menu-served" title="${esc(d.name)} — ${esc(d.desc)} Wears off tonight.">${d.icon} ${esc(d.name)}</span>`).join("") || `<span class="muted">${cooks.length ? "Nothing served yet today" : "No cook on duty — assign one to serve dishes"}</span>`}
          ${cooks.length ? '<button class="btn btn-sm btn-primary" data-action="open-menu">🍲 Cook a dish…</button>' : ""}
        </div>
      </div>
      <div class="room room-infirmary">
        ${roomScene(`infirmary@${roomLevel(state, "infirmary")}`, [...nurses, ...infected, ...patients], `Nurse's Office${levelBadge(state, "infirmary")}`,
          "",
          roomUpgradeButton(state, "infirmary"))}
        ${staffLine(state, "Nurse", nurses, infRoom.teacherCapacity,
          (t) => staffRow(t, gradeLetter(t.grades.Biology), `${t.name} — CON ${gradeLetter(t.grades.Biology)}`),
          'data-action="open-picker" data-kind="infirmary-teacher"')}
        ${statRow(`Healing today (${patients.length}/${infRoom.studentCapacity})`, `💊 Heal <b>+${healHp}</b> HP · ${INFIRMARY_MEDICINE_PER_PATIENT} meds ${infoDot(nurseHow)}`)}
        ${tileGrid(
          [
            ...patients.map((s) => {
              const treated = treatedIds.has(s.id);
              const to = s.hp + healAmount(state, s, treated);
              return personTile(s, {
                remove: "remove-infirmary",
                title: `${s.name} — HP ${s.hp} → ${to} of ${s.maxHp} ${treated ? "after treatment" : "after bed rest (no medicine to spare)"}`,
                extra: gainLine(s.hp, to, "full"),
              });
            }),
          ],
          bedsFree,
          'data-action="open-picker" data-kind="infirmary-student"'
        )}
        <div class="mini-label">Quarantined (${infected.length}) · 💉 ${state.resources.serum} serum</div>
        <div class="menu-strip">
          <span class="quarantine-chips">${quarantineOrder(state, infected).slice(0, 3).map((c) => `<span class="quarantine-chip" title="${esc(c.name)} — infected: cure with antiviral serum by the end of day ${c.infection.dueDay}">${esc(shortName(c))} · ${daysLeftLabel(state, c, true)}</span>`).join("")}${infected.length > 3 ? `<span class="quarantine-chip" title="${infected.length - 3} more in quarantine">+${infected.length - 3}</span>` : ""}${infected.length ? "" : '<span class="muted">Nobody in quarantine</span>'}</span>
          ${infected.length ? '<button class="btn btn-sm btn-primary" data-action="open-quarantine">🦠 Quarantine…</button>' : ""}
        </div>
      </div>
    </div>
  </div>`;
}

// The infected, soonest to die first.
const quarantineOrder = (state, infected) => [...infected].sort((a, b) => infectionDaysLeft(state, a) - infectionDaysLeft(state, b));
// "dies tonight" / "2 days left" ("tonight" / "2d" when short).
function daysLeftLabel(state, c, short = false) {
  const left = infectionDaysLeft(state, c);
  if (left <= 0) return short ? "tonight" : "dies tonight";
  return short ? `${left}d` : `${left} day${left === 1 ? "" : "s"} left`;
}

// The Nurse's Office quarantine: everyone infected, how long they have, their stats (to choose
// who gets the serum when there isn't enough), and a Cure button each.
export function renderQuarantineModal(state) {
  const infected = quarantineOrder(state, infectedChars(state));
  const serum = state.resources.serum;
  const rows = infected.map((c) => {
    const left = infectionDaysLeft(state, c);
    return `<div class="q-row ${left <= 0 ? "q-urgent" : ""}">
      <span class="q-portrait" data-action="open-card" data-id="${c.id}" title="Open ${esc(c.name)}'s card">${characterSprite(c, 40)}</span>
      <div class="q-main">
        <div class="q-head">
          <b class="unit-link" data-action="open-card" data-id="${c.id}">${esc(c.name)}</b>
          <span class="muted">${c.role === "teacher" ? "Teacher" : `Lv${overallLevel(c)}`} · HP ${c.hp}/${c.maxHp}</span>
          <span class="q-days">🦠 ${daysLeftLabel(state, c)}</span>
        </div>
        ${statChips(c)}
      </div>
      <button class="btn btn-sm btn-primary q-cure" data-action="cure-infection" data-id="${c.id}" ${serum ? "" : "disabled"} title="${serum ? "Cure with 1 antiviral serum" : "No antiviral serum — find it at medical locations or on raids"}">💉 Cure</button>
    </div>`;
  }).join("");
  return `<div class="modal-overlay" data-action="close-quarantine">
    <div class="char-card mission-card quarantine-modal" data-action="noop">
      <button class="cc-close" data-action="close-quarantine" title="Close">✕</button>
      <div class="q-header">
        <h3>🦠 Quarantine</h3>
        <span class="q-serum ${serum ? "" : "q-serum-none"}" title="Antiviral serum — each vial cures one infected person">${pixelIcon("serum", 18)} <b>${serum}</b> serum</span>
      </div>
      <p class="muted">Each serum cures one person. Anyone not cured by the end of their last day dies. Click someone to see their full card.</p>
      <div class="q-list">${rows || '<p class="muted">Nobody in quarantine.</p>'}</div>
    </div>
  </div>`;
}

// The Cafeteria's menu: the pantry and every dish with its Cook button, in a pop-up so the room
// card stays short.
export function renderMenuModal(state) {
  const pantryGroup = (source, label, tip) => {
    const items = Object.entries(INGREDIENTS)
      .filter(([, ing]) => ing.source === source)
      .map(([id, ing]) => `<span class="pantry-item ${state.pantry[id] ? "" : "pantry-empty"}" title="${ing.name}">${ing.icon} ${state.pantry[id] || 0}</span>`)
      .join("");
    return `<div class="pantry-group" title="${tip}"><span class="pantry-label">${label}</span>${items}</div>`;
  };
  const pantry =
    pantryGroup("farm", "Fields", "Staple crops — grown in the Farm's fields in Turn 2.") +
    pantryGroup("ranch", "Animals", "Eggs, milk and mutton — from the animals in the Farm's pens in Turn 2.") +
    pantryGroup("scavenged", "Scavenged", "Extras that only turn up on expeditions.");
  const menu = DISHES.map((d) => {
    const served = state.dishesToday.includes(d.id);
    const cost = Object.entries(d.ingredients).map(([id, n]) => `${INGREDIENTS[id].icon}${n > 1 ? `×${n}` : ""}`).join(" ") + ` 🍞${d.food}`;
    const recipe = Object.entries(d.ingredients).map(([id, n]) => `${n} ${INGREDIENTS[id].name}`).join(", ") + `, ${d.food} food`;
    const action = served
      ? `<span class="tag tag-ok">✓ Served</span>`
      : `<button class="btn btn-sm btn-primary" data-action="cook-dish" data-id="${d.id}" title="Needs ${recipe}" ${canCookDish(state, d) ? "" : "disabled"}>Cook (${cost})</button>`;
    return `<div class="dish-row ${served ? "dish-served" : ""}">
      <div class="dish-main"><span class="dish-icon">${d.icon}</span> <b>${esc(d.name)}</b> ${action}</div>
      <div class="muted">${esc(d.desc)}</div>
    </div>`;
  }).join("");
  const cooks = cooksOnDuty(state).length;
  return `<div class="modal-overlay" data-action="close-menu">
    <div class="char-card mission-card menu-modal" data-action="noop">
      <button class="cc-close" data-action="close-menu" title="Close">✕</button>
      <h3>🍲 Today's Menu</h3>
      <p class="muted">${state.dishesToday.length}/${dishCapacity(state)} dish${dishCapacity(state) === 1 ? "" : "es"} served · ${cooks ? "each cook serves one dish a day, and its buff lasts until tonight" : "assign a cook in the Cafeteria to start serving dishes"}</p>
      <div class="mini-label">Pantry</div>
      <div class="pantry">${pantry}</div>
      <div class="dish-list">${menu}</div>
    </div>
  </div>`;
}

// ---------- floor 2 ----------

export function renderFloor2(state) {
  const rooms = CLASSROOM_IDS.map((roomId) => renderClassroom(state, roomId)).join("");
  return `<div class="card"><h2>Floor 2 — Classrooms</h2>
  <p class="room-tagline">The teacher posted in a room picks its subject</p>
  <div class="floor2-grid">${rooms}</div></div>`;
}

function renderClassroom(state, roomId) {
  const room = state.rooms.classrooms[roomId];
  const subject = room.subject; // null until a teacher claims this room
  const post = `classroom:${roomId}`;
  if (isBoarded(state, post)) return renderBoardedRoom(state, post, "classroom_empty", "room-classroom");
  const teachers = state.characters.filter((c) => c.role === "teacher" && c.post === post && c.alive);

  const count = room.seats.filter(Boolean).length;
  // Today's lesson: the room's level bonus plus each teacher's, up to the best teacher's grade.
  const lesson = classroomLesson(state, roomId);
  const rawLesson = lesson.levelBonus + teachers.reduce((s, t) => s + teachingBonus(t.grades[subject]), 0);
  const classHow = lesson.subject
    ? {
        title: `📚 +${lesson.gain} ${STAT_OF_SUBJECT[subject]} a day`,
        rows: [[`Room · level ${room.level || 1}`, `+${lesson.levelBonus}`],
          ...teachers.map((t) => [`${esc(shortName(t))} · ${gradeLetter(t.grades[subject])}`, `+${teachingBonus(t.grades[subject])}`]),
          ...(lesson.gain !== rawLesson ? [["Study Groups", `+${lesson.gain - rawLesson}`]] : [])],
        total: ["Total", `+${lesson.gain}`],
        notes: [`Stops at <b>${lesson.ceiling}</b> — the best teacher's grade`, "Teachers add D +1 · C +3 · B +5 · A +7 · S +10", 'At the limit (red "max"), move them to another class'],
      }
    : "";

  // Seats 2k and 2k+1 share a desk, so the tiles come in pairs, four desks to a row.
  const seatTile = (idx) => {
    const occ = getChar(state, room.seats[idx]);
    if (!occ) {
      return `<button class="person-tile pt-empty" data-action="open-picker" data-kind="classroom-seat" data-room="${roomId}" data-seat="${idx}" title="Seat someone here">+</button>`;
    }
    const grade = subject ? occ.grades[subject] : null;
    return personTile(occ, {
      remove: "unseat",
      title: `${occ.name}${lesson.subject ? ` — ${STAT_OF_SUBJECT[subject]} ${grade} → ${grade + classGain(state, occ)} after today's class${grade >= lesson.ceiling ? ` (at the limit of ${lesson.ceiling})` : ""}` : ""}`,
      extra: lesson.subject ? gainLine(grade, grade + classGain(state, occ), "max") : "",
    });
  };
  const desks = [];
  for (let i = 0; i < room.seats.length; i += 2) desks.push(`<div class="pt-desk">${seatTile(i)}${seatTile(i + 1)}</div>`);

  return `
  <div class="room room-classroom">
    ${roomScene(
      `${subject ? `classroom_${subject}` : "classroom_empty"}@${room.level || 1}`,
      [...teachers, ...room.seats.filter(Boolean).map((id) => getChar(state, id)).filter((c) => c && c.alive)],
      `${subject ? SUBJECT_LABEL[subject] : `Classroom ${roomId}`}${levelBadge(state, post)}`,
      "",
      roomUpgradeButton(state, post)
    )}
    ${staffLine(state, "Teacher", teachers, room.teacherCapacity,
      (t) => staffRow(t, `${gradeLetter(t.grades[subject])} <span class="muted">+${teachingBonus(t.grades[subject])}</span>`, `${t.name} — ${SUBJECT_LABEL[subject]} ${teachBonusLabel(t.grades[subject])}`),
      `data-action="open-picker" data-kind="classroom-teacher" data-room="${roomId}"`)}
    ${statRow(`Students (${count}/${room.seats.length})`, lesson.subject
      ? `📚 <b>+${lesson.gain}</b> ${STAT_OF_SUBJECT[subject]} a day · up to ${lesson.ceiling} ${infoDot(classHow)}`
      : `📚 No subject yet ${infoDot({ title: "📚 No subject yet", notes: ["The first teacher posted here picks the subject — whatever they're best at", "No teacher, no class"] })}`)}
    <div class="desk-tiles">${desks.join("")}</div>
  </div>`;
}

// ---------- floor 3 ----------

export function renderFloor3(state) {
  const students = state.characters.filter((c) => c.role === "student" && c.alive).sort((a, b) => overallLevel(b) - overallLevel(a));
  // The Headmaster's Office: its bottom half is split — the students ready to become teachers
  // (level PROMOTE_LEVEL_THRESHOLD+, best first) on the left, survivors waiting to join on the right,
  // each with as many slots as the office's level gives.
  const ready = students.filter(promotable);
  const promoSlots = promotionSlots(state);
  const shownReady = ready.slice(0, promoSlots);
  const readyTiles = shownReady.map((s) => personTile(s, {
    title: `${s.name} — level ${overallLevel(s)}, best at ${SUBJECT_LABEL[SUBJECTS.reduce((b, x) => (s.grades[x] > s.grades[b] ? x : b), SUBJECTS[0])]}`,
    extra: `<button class="pt-promote-btn" data-action="ask-promote" data-id="${s.id}" title="Promote ${esc(s.name)} to teacher">Promote</button>`,
  }));
  const pool = state.recruitPool;
  const recSlots = recruitSlots(state);
  const recruitTiles = pool.map((r) => {
    return personTile(r, {
      cls: r.legendary ? "pt-legendary" : "",
      title: `${r.legendary ? "✨ Legendary — " : ""}${r.name} — ${r.role === "teacher" ? `teacher (${SUBJECT_LABEL[r.teachSubject]})` : `student, level ${overallLevel(r)}`} wants to join`,
      extra: `<button class="pt-promote-btn" data-action="ask-recruit" data-id="${r.id}" title="Let ${esc(r.name)} join the school">Recruit</button>`,
    });
  });
  const placeholders = (n) => Array.from({ length: Math.max(0, n) }, () => `<div class="person-tile pt-slot"></div>`).join("");
  const officeHow = {
    title: "🎓 Headmaster's Office",
    rows: [["Teachers", `${teacherCount(state)}`], ["Ready to promote", `${ready.length}`], ["Recruits waiting", `${pool.length}/${recSlots}`]],
    notes: [`Students who reach level ${PROMOTE_LEVEL_THRESHOLD} (max) can become teachers — they teach their best subject`, "Students level up from experience: classes, training, work, scouting and fighting", `With ${recSlots} recruits waiting, newcomers are turned away (legendary ones always fit)`, "Expel someone from their character card"],
  };
  const office = `<div class="room room-office">
    ${roomScene("headmaster", [...shownReady, ...pool], "Headmaster's Office", officeHow)}
    <div class="office-split">
      <div>
        ${statRow(`Promotions (${shownReady.length}/${promoSlots})${ready.length > promoSlots ? ` · +${ready.length - promoSlots} more` : ""}`, "", "stat-row-left")}
        <div class="person-tiles">${readyTiles.join("")}${placeholders(promoSlots - shownReady.length)}</div>
      </div>
      <div>
        ${statRow(`Recruits (${pool.length}/${recSlots})`, "", "stat-row-left")}
        <div class="person-tiles">${recruitTiles.join("")}${placeholders(recSlots - pool.length)}</div>
      </div>
    </div>
  </div>`;


  const researchers = state.characters.filter((c) => c.role === "teacher" && c.post === "research" && c.alive);
  const assistants = state.characters.filter((c) => c.researchToday && c.alive);
  const researchSlots = state.rooms.research.teacherCapacity;
  const crew = researchCrew(state);
  const totalInt = crew.reduce((sum, t) => sum + t.grades.Physics, 0);
  const researchLevelBonus = crew.length ? researchRoomYield(state) - Math.floor(totalInt / RESEARCH_ROOM_INT_PER_POINT) : 0;
  const researchHow = crew.length
    ? {
        title: `🧠 +${researchRoomYield(state)} research a day`,
        rows: [[`INT of the ${crew.length} working here`, `${totalInt}`], [`Research · 1 per ${RESEARCH_ROOM_INT_PER_POINT} INT`, `+${Math.floor(totalInt / RESEARCH_ROOM_INT_PER_POINT)}`], [`Room · level ${roomLevel(state, "research")}`, `+${researchLevelBonus}`]],
        total: ["Total", `+${researchRoomYield(state)}`],
        notes: ["Teachers and assisting students all add their INT", "Research buys the tech tree and the Radio Station's upgrades"],
      }
    : { title: "🧠 No research yet", notes: [`Post a teacher or send a student: 1 research for every ${RESEARCH_ROOM_INT_PER_POINT} INT, plus a level bonus`] };
  const helpersOf = (postKey) => state.characters.filter((c) => c.alive && c[`${postKey}Today`]);
  // `footer(staff)` gives the room's headline: its daily result with a breakdown.
  const utilityRoom = (scene, title, desc, postKey, statLabel, statKey, footer) => {
    if (isBoarded(state, postKey)) return renderBoardedRoom(state, postKey, scene, "room-utility");
    const staff = state.characters.filter((c) => c.role === "teacher" && c.post === postKey && c.alive);
    const slots = state.rooms[postKey].teacherCapacity;
    return `<div class="room room-utility">
      ${roomScene(`${scene}@${roomLevel(state, postKey)}`, [...staff, ...helpersOf(postKey)], `${title}${levelBadge(state, postKey)}`, desc, roomUpgradeButton(state, postKey))}
      ${staffLine(state, "Teacher", staff, slots,
        (t) => staffRow(t, gradeLetter(t.grades[statKey]), `${t.name} — ${statLabel} ${gradeLetter(t.grades[statKey])}`),
        `data-action="open-picker" data-kind="utility" data-post="${postKey}"`)}
      ${statRow(`Helping today (${helpersOf(postKey).length}/${state.rooms[postKey].studentCapacity})`, footer(staff))}
      ${tileGrid(
        helpersOf(postKey).map((s) => personTile(s, { remove: `remove-${postKey}`, title: `${s.name} — DEX ${s.grades.Gymnastics}, adds +${craftHelpGain(s)} fortification`, extra: `<span class="pt-gain">+<b>${craftHelpGain(s)}</b> 🛡</span>` })),
        state.rooms[postKey].studentCapacity - helpersOf(postKey).length,
        `data-action="open-picker" data-kind="${postKey}-student"`
      )}
    </div>`;
  };
  // Crafting: each crafter turns up to 4 scrap into fortification, in turn, while the scrap lasts.
  const craftingFooter = (staff) => {
    let scrap = state.resources.materials;
    const parts = staff.map((t) => {
      const use = Math.min(Math.max(scrap, 0), 4);
      scrap -= use;
      return { t, use, gain: use > 0 ? crafterGain(state, t, use) : 0 };
    });
    const helpers = helpersOf("crafting");
    const total = parts.reduce((sum, p) => sum + p.gain, 0) + helpers.reduce((sum, c) => sum + craftHelpGain(c), 0);
    const how = staff.length || helpers.length
      ? {
          title: `🛡 +${total} fortification a day`,
          rows: [...parts.map((p) => [`${esc(shortName(p.t))} · ${p.use} scrap`, `+${p.gain}`]), ...helpers.map((c) => [`${esc(shortName(c))} · DEX ${c.grades.Gymnastics}`, `+${craftHelpGain(c)}`])],
          total: ["Total", `+${total}`],
          notes: ["Each crafter turns up to 4 scrap a day into fortification", `Students help for free: +1 per ${CRAFT_HELP_DEX_PER_POINT} DEX`],
        }
      : { title: "🛡 No crafting yet", notes: ["Post a teacher: up to 4 scrap a day becomes permanent fortification", "Or send students: +1 per 25 DEX, no scrap"] };
    return `🛡 <b>+${total}</b> fortification a day ${infoDot(how)}`;
  };
  // The Radio Station: levels like the other rooms (its upgrades are in the Upgrade pop-up), a
  // teacher (+ an assistant at level 5) and students on the air today, who all recruit with their CHA.
  const radio = (() => {
    if (isBoarded(state, "radio")) return renderBoardedRoom(state, "radio", "radio", "room-radio");
    const room = state.rooms.radio;
    const teachers = state.characters.filter((c) => c.role === "teacher" && c.post === "radio" && c.alive);
    const onAir = state.characters.filter((c) => c.radioToday && c.alive);
    const chance = radioRecruitChance(state);
    const pct = (v) => `${(v * 100).toFixed(v * 100 < 10 && v * 100 % 1 ? 1 : 0)}%`;
    const base = RADIO_UPGRADES[radioStage(state) - 1].baseChance;
    const crew = radioCrew(state);

    const rawChance = base + crew.reduce((s, c) => s + radioCrewBonus(c), 0);
    const how = {
      title: `📻 ${pct(chance)} chance of a recruit a day`,
      rows: [[`Station · level ${radioStage(state)}`, `+${pct(base)}`],
        ...(crew.length ? crew.map((c) => [`${esc(shortName(c))} · CHA ${c.grades.SocialStudies}`, `+${pct(radioCrewBonus(c))}`]) : [tipNone("Nobody on the air", "+0%")]),
        ...(rawChance > 0 && chance < 1 && Math.abs(chance - rawChance) > 0.0005 ? [["Meals & research", `×${(chance / rawChance).toFixed(2)}`]] : [])],
      total: ["Total", pct(chance)],
      notes: [`Recruiters add CHA ÷ ${RADIO_CHA_PER_PERCENT} % — the teacher and the students on the air`, "Base: 5 / 7 / 9 / 11% at levels 1–4", `Level 5 calls the helicopter — it lands ${RESCUE_ARRIVAL_DAYS} days later`],
    };
    const pill = state.rescue
      ? state.rescue.evacuated ? "🚁 The helicopter has come and gone" : `🚁 Helicopter lands on <b>day ${state.rescue.day}</b> · 📻 ${pct(chance)}`
      : `📻 <b>${pct(chance)}</b> chance of a recruit a day`;
    return `<div class="room room-radio">
      ${roomScene(`radio@${radioStage(state)}`, [...teachers, ...onAir], `Radio Station${levelBadge(state, "radio")}`, "", roomUpgradeButton(state, "radio"))}
      ${staffLine(state, "Teacher", teachers, room.teacherCapacity,
        (t) => staffRow(t, `${gradeLetter(t.grades.SocialStudies)} <span class="muted">+${pct(radioCrewBonus(t))}</span>`, `${t.name} — CHA ${t.grades.SocialStudies}, adds ${pct(radioCrewBonus(t))} a day`),
        'data-action="open-picker" data-kind="utility" data-post="radio"')}
      ${statRow(`On the air today (${onAir.length}/${room.studentCapacity})`, `${pill} ${infoDot(how)}`)}
      ${tileGrid(
        onAir.map((s) => personTile(s, {
          remove: "remove-radio",
          title: `${s.name} — CHA ${s.grades.SocialStudies}, adds ${pct(radioCrewBonus(s))} to today's recruit chance`,
          extra: `<span class="pt-gain">+<b>${pct(radioCrewBonus(s))}</b></span>`,
        })),
        room.studentCapacity - onAir.length,
        'data-action="open-picker" data-kind="radio-student"'
      )}
    </div>`;
  })();

  return `
  <div class="card">
    <h2>Floor 3 — Headmaster's Office &amp; Special Rooms</h2>
    <div class="floor1-grid floor3-grid">
      ${office}
      ${radio}
      ${isBoarded(state, "research") ? renderBoardedRoom(state, "research", "research", "room-utility") : `<div class="room room-utility">
        ${roomScene(`research@${roomLevel(state, "research")}`, [...researchers, ...assistants], `Research Room${levelBadge(state, "research")}`,
          "",
          roomUpgradeButton(state, "research"))}
        ${staffLine(state, "Teacher", researchers, researchSlots,
          (t) => staffRow(t, gradeLetter(t.grades.Physics), `${t.name} — INT ${t.grades.Physics} (${gradeLetter(t.grades.Physics)})`),
          'data-action="open-picker" data-kind="utility" data-post="research"')}
        ${statRow(`Assisting today (${assistants.length}/${state.rooms.research.studentCapacity})`, `🧠 <b>+${researchRoomYield(state)}</b> research a day ${infoDot(researchHow)}`)}
        ${tileGrid(
          assistants.map((s) => personTile(s, { remove: "remove-research", title: `${s.name} — adds INT ${s.grades.Physics} to the room`, extra: `<span class="pt-gain">INT <b>${s.grades.Physics}</b></span>` })),
          state.rooms.research.studentCapacity - assistants.length,
          'data-action="open-picker" data-kind="research-student"'
        )}
      </div>`}
      ${utilityRoom("crafting", "Crafting Room", "", "crafting", "DEX", "Gymnastics", craftingFooter)}
    </div>
  </div>`;
}

// ---------- outside facilities (Turn 2) ----------

// Each facility's banner line: today's total from its workers, with a per-worker breakdown.
const FACILITY_YIELD = {
  farm: { icon: "🌾", unit: "food", base: FARM_YIELD_FOOD, str: true },
  scrapyard: { icon: "🔩", unit: "scrap", base: SCRAPYARD_YIELD_MATERIALS, str: true },
};

function renderOutsideFacility(state, roomKey, flagKey, title, desc, extra = "") {
  const room = state.rooms[roomKey];
  const workers = state.characters.filter((c) => c[flagKey] && c.alive);
  const y = FACILITY_YIELD[roomKey];
  const total = workers.reduce((sum, c) => sum + workerYield(roomKey, c), 0);
  const shownWorkers = workers.slice(0, 8);
  const restYield = workers.slice(8).reduce((sum, c) => sum + workerYield(roomKey, c), 0);
  const how = {
    title: `${y.icon} +${total} ${y.unit} today`,
    rows: workers.length
      ? [...shownWorkers.map((c) => [esc(shortName(c)), `+${workerYield(roomKey, c)}`]), ...(workers.length > 8 ? [[`${workers.length - 8} more`, `+${restYield}`]] : [])]
      : [tipNone("Nobody working today", "+0")],
    total: ["Total", `+${total}`],
    notes: [`Each worker brings in ${y.base} ${y.unit}${y.str ? ", +1 per 25 STR" : ""}`, ...(roomKey === "farm" ? [`Each worker also tends ${PLOTS_PER_WORKER} fields or pens`] : []), "Workers stay home instead of exploring"],
  };

  return `
  <div class="card room-outside">
    ${roomScene(`${roomKey}@${roomLevel(state, roomKey)}`, workers, `${title}${levelBadge(state, roomKey)}`, desc, roomUpgradeButton(state, roomKey))}
    ${statRow(`Working today (${workers.length}/${room.studentCapacity})`, `${y.icon} <b>+${total}</b> ${y.unit} today ${infoDot(how)}`)}
    ${tileGrid(
      workers.map((s) => personTile(s, { remove: `remove-${roomKey}` })),
      room.studentCapacity - workers.length,
      `data-action="open-picker" data-kind="${roomKey}"`
    )}
    ${extra}
  </div>`;
}

// The Farm's two halves: a field for each crop on the left, a pen for each animal on the right.
const PLOT_WORDS = {
  farm: { side: "🌱 Fields", verb: "Plant", none: "No seeds", store: "in the seed shed" },
  ranch: { side: "🐄 Animals", verb: "Add", none: "None in the barn", store: "in the barn" },
};

// What a crop/animal makes, e.g. "4 🥔 after 3 days" or "1 🥚 every day".
function producerYieldText(p) {
  const product = INGREDIENTS[p.product];
  const days = p.growDays === 1 ? "day" : `${p.growDays} days`;
  return p.perennial ? `${p.yield} ${product.icon} ${product.name.toLowerCase()} every ${days}` : `${p.yield} ${product.icon} ${product.name.toLowerCase()} after ${days}`;
}

// The Farm level a group's slot `index` opens at.
const slotLevel = (index) => FARM_SLOTS_BY_LEVEL.findIndex((n) => n > index) + 1;

// One slot of a group: growing / producing (click for details), empty (click to plant or pen one
// from stock) or still locked (opens at a higher Farm level).
function renderFarmSlot(state, kind, plot, index, tended) {
  const p = PRODUCERS[kind];
  const words = PLOT_WORDS[p.facility];
  if (!plot) return `<div class="fslot fslot-locked" title="Opens at Farm level ${slotLevel(index)}">🔒<span>Lv ${slotLevel(index)}</span></div>`;
  if (!plot.id) {
    const have = state.stock[kind] || 0;
    return `<button class="fslot fslot-empty ${have ? "" : "fslot-none"}" data-action="plant-plot" data-kind="${kind}" data-index="${index}" title="${have ? `${words.verb}: ${have} ${words.store}` : `${words.none} — find more on expeditions`}">
      <b>+</b><span>${have ? words.verb : words.none}</span>
    </button>`;
  }
  const pct = Math.round((plot.growth / p.growDays) * 100);
  const status = p.perennial
    ? `every ${p.growDays === 1 ? "day" : `${p.growDays} days`}`
    : `day ${plot.growth}/${p.growDays}`;
  return `<button class="fslot ${tended ? "fslot-tended" : "fslot-idle"}" data-action="open-plot" data-kind="${kind}" data-index="${index}" title="${p.name} — ${tended ? "tended today" : "not tended today"}">
    <span class="fslot-icon">${p.icon}</span>
    ${p.growDays > 1 ? `<span class="plot-bar"><i style="width:${pct}%"></i></span>` : ""}
    <span class="fslot-status">${tended ? status : "not tended"}</span>
  </button>`;
}

const PLOT_INFO = {
  farm: {
    title: "🌱 Fields",
    notes: [`Each worker tends ${PLOTS_PER_WORKER} slots a day, going round every field and pen in turn — only tended crops grow`, "Click an empty slot to plant a seed from the seed shed", "A harvest goes to the pantry, with a 50% chance to save a seed", "Seeds come from expeditions (Farmstead, Suburbs, Hardware Store) and events"],
  },
  ranch: {
    title: "🐄 Animals",
    notes: [`Each worker tends ${PLOTS_PER_WORKER} slots a day, going round every field and pen in turn — animals only produce on tended days`, "Chickens lay eggs and cows give milk for as long as you keep them", "Sheep are butchered for mutton after 4 tended days (50% chance of a lamb)", "Animals come from expeditions (Farmstead, Suburbs) and events"],
  },
};

// One half of the Farm: its three groups top to bottom, each a row of slots.
function renderFarmSide(state, facility) {
  const words = PLOT_WORDS[facility];
  const kinds = FARM_GROUPS[facility];
  let tendedCount = 0;
  let occupied = 0;
  const groups = kinds.map((kind) => {
    const p = PRODUCERS[kind];
    const list = state.plots[kind];
    const tended = new Set(tendedPlots(state, kind));
    tendedCount += tended.size;
    occupied += list.filter((plot) => plot.id).length;
    const have = state.stock[kind] || 0;
    const slots = Array.from({ length: FARM_SLOTS_BY_LEVEL[ROOM_MAX_LEVEL - 1] }, (_, i) => renderFarmSlot(state, kind, list[i], i, tended.has(i))).join("");
    return `<div class="farm-group">
      <div class="farm-group-head">
        <span class="farm-group-icon">${p.icon}</span><b>${p.name}</b>
        <span class="muted">${producerYieldText(p)}</span>
        <span class="farm-group-stock ${have ? "" : "pantry-empty"}" title="${have === 1 ? p.stockName : p.stockPlural} ${words.store}">${p.stockIcon} ${have}</span>
      </div>
      <div class="farm-slots">${slots}</div>
    </div>`;
  }).join("");
  return `<section class="farm-side">
    ${statRow(`tending ${tendedCount} of ${occupied}`, `<b class="farm-side-title">${words.side}</b> ${infoDot(PLOT_INFO[facility])}`)}
    ${groups}
  </section>`;
}

// Clicking a growing crop or a penned animal: how it's doing, and the option to dig it up / move
// the animal back to the barn.
export function renderPlotModal(state, kind, index) {
  const p = PRODUCERS[kind];
  const plot = state.plots[kind]?.[index];
  if (!plot?.id) return "";
  const tended = tendedPlots(state, kind).includes(index);
  const progress = p.perennial
    ? `Produces ${producerYieldText(p)}.`
    : `Day ${plot.growth} of ${p.growDays} — then ${producerYieldText(p).replace(/ after .*/, "")} ${p.facility === "farm" ? "at harvest" : "at butchering"}.`;
  return `<div class="modal-overlay" data-action="close-plot">
    <div class="char-card mission-card plot-modal" data-action="noop">
      <button class="cc-close" data-action="close-plot" title="Close">✕</button>
      <h3>${p.icon} ${p.name}</h3>
      <p>${progress}</p>
      <p class="${tended ? "muted" : "plot-warn"}">${tended ? "Being tended today." : `Not tended today — assign more Farm workers (each tends ${PLOTS_PER_WORKER}).`}</p>
      <button class="btn btn-sm btn-danger" data-action="clear-plot">${p.facility === "farm" ? "Dig up (the seed is lost)" : "Move back to the barn"}</button>
    </div>
  </div>`;
}

// The Farm: one crew of workers, then the page split down the middle — crops on the left, animals
// on the right (like its banner: fields, the barn in the middle, pens).
export function renderFarm(state) {
  return renderOutsideFacility(
    state, "farm", "farmToday", "Farm",
    "",
    `<div class="farm-split">${renderFarmSide(state, "farm")}${renderFarmSide(state, "ranch")}</div>`
  );
}

export function renderScrapyard(state) {
  return renderOutsideFacility(
    state, "scrapyard", "scrapyardToday", "Scrapyard",
    "",
  );
}


// ---------- Turn 3 side screens ----------

function renderComingSoon(icon, title, desc) {
  return `<div class="card"><h2>${icon} ${title}</h2><p class="muted">${desc}</p></div>`;
}

export function renderDefenseTab(state) {
  if (state.pendingRaid) {
    return renderComingSoon("🛡", "Defense", `The ${FACILITY_LABEL[state.pendingRaid.facility]} is under attack right now — assign defenders from the Night Watch panel.`);
  }
  const structures = DEFENSE_STRUCTURES.map(
    (d) => `<div class="armory-item">
      <span class="armory-icon">${d.icon}</span>
      <span class="armory-name">${esc(d.name)}</span>
      <span class="armory-bonus">${esc(d.desc)}</span>
      <span class="weapon-stats">🔧 ${d.cost.materials}</span>
    </div>`
  ).join("");
  return `
  <div class="card">
    <h2>🛡 Entrance Defenses ${infoDot({ notes: ["Click an empty middle-row cell to build, a top-row cell to post a defender", "Smashed walls are gone; damaged ones are patched by morning", "Fortification makes the gate sturdier"] })}</h2>
    <p class="room-tagline">Fortification ${state.fortification} · gate <b>${gateHp(state)} HP</b></p>
    ${renderEntranceGrid(state)}
    <div class="mini-label">What you can build</div>
    <div class="armory-list">${structures}</div>
    <div class="mini-label">Know your enemy</div>
    <div class="armory-list">${Object.values(ZOMBIE_TYPES)
      .map(
        (t) => `<div class="armory-item">
          <span class="armory-icon">🧟${t.badge}</span>
          <span class="armory-name">${esc(t.name)}</span>
          <span class="armory-bonus">${esc(t.desc)}</span>
          <span class="weapon-stats">${t === ZOMBIE_TYPES.boss ? "every 5th night" : t.from > 1 ? `from day ${t.from}` : "always"}</span>
        </div>`
      )
      .join("")}</div>
  </div>`;
}

export function renderAssaultTab(state) {
  if (state.pendingAssault) {
    return renderComingSoon("⚔", "Assault", "The horde is retreating and there may be time to chase them down — answer the popup on screen.");
  }
  return renderComingSoon("⚔", "Assault", "Winning a battle has a 20% chance to open a chance to chase the horde for a boss fight — extra loot, XP, and a shot at a legendary survivor.");
}

export function renderEventTab(state) {
  if (!state.eventLog.length) {
    return renderComingSoon("🎲", "Event", "Random events roll once per day and can help or hurt the school — happiness tips the odds toward good or bad. None have happened yet.");
  }
  const rows = state.eventLog
    .map((e) => `<li><span class="tag ${e.kind === "good" ? "tag-ok" : "tag-injured"}">${e.kind === "good" ? "📈" : "📉"}</span> Day ${e.day} — <b>${esc(e.title)}</b>: ${esc(e.desc)}</li>`)
    .join("");
  return `
  <div class="card">
    <h2>🎲 Event Log</h2>
    <p class="muted">Random events roll once per day. Happiness tips the odds toward good or bad.</p>
    <ul class="summary-list">${rows}</ul>
  </div>`;
}

// ---------- research ----------

const TECH_EFFECT_ICON = { food: "🍞", materials: "🔧", medicine: "💊", research: "🧠", fortification: "🛡", happiness: "🙂" };

function renderTechNode(state, node, tier) {
  const owned = state.techUnlocked;
  const isOwned = owned.includes(node.id);
  const lockedBy = node.requires && !owned.includes(node.requires) ? TECH_TREE.find((t) => t.id === node.requires) : null;
  const affordable = state.resources.research >= node.cost;

  let action;
  if (isOwned) action = `<span class="tag tag-ok">✓ Active</span>`;
  else if (lockedBy) action = `<span class="tag tag-injured">🔒 ${node.cost}</span>`;
  else action = `<button class="btn btn-sm btn-primary" data-action="buy-tech" data-id="${node.id}" ${affordable ? "" : "disabled"}>🧠 ${node.cost}</button>`;

  return `<div class="subcard tech-node ${isOwned ? "tech-owned" : lockedBy ? "tech-locked" : ""}" title="${lockedBy ? `Needs ${esc(lockedBy.name)} first` : ""}">
    <div class="tech-node-main">
      <div><span class="tech-tier">${tier}</span><span class="tech-icon">${node.icon}</span> <b>${esc(node.name)}</b></div>
      ${action}
    </div>
    <div class="tech-effect">${esc(node.desc)}</div>
  </div>`;
}

export function renderResearch(state) {
  const branches = TECH_BRANCHES.map((branch) => {
    const nodes = TECH_TREE.filter((t) => t.branch === branch.id);
    const chain = [nodes.find((t) => !t.requires)];
    for (let next = nodes.find((t) => t.requires === chain[0].id); next; next = nodes.find((t) => t.requires === next.id)) chain.push(next);
    const owned = chain.filter((t) => state.techUnlocked.includes(t.id)).length;
    return `<div class="tech-branch">
      <div class="tech-branch-head"><b>${branch.name}</b> <span class="muted">${owned}/${chain.length}</span><div class="muted">${esc(branch.desc)}</div></div>
      ${chain.map((t, i) => renderTechNode(state, t, i + 1)).join("")}
    </div>`;
  }).join("");

  return `
  <div class="card">
    <h2>🧠 Research</h2>
    <p class="room-tagline">Permanent buffs for the whole school · each branch unlocks top to bottom ${infoDot("Research comes from the teachers posted in the Research Room (Floor 3).")}</p>
    <div class="summary-list">
      <div>Research banked: <b>${state.resources.research}</b></div>
    </div>
    <div class="tech-grid">${branches}</div>
  </div>`;
}

// ---------- armory ----------

const ARMORY_SLOT_LABEL = { melee: "🗡 Melee Weapons", ranged: "🏹 Ranged Weapons", armor: "🛡 Armor", accessory: "💍 Accessories" };
const armoryGroupKey = (it) => (it.slot === "weapon" ? it.category : it.slot);

// Damage/range (and the STR/DEX floor to wield it) shown on every weapon row, on top of the
// usual stat bonuses.
function weaponStatsLabel(it) {
  if (it.slot !== "weapon") return "";
  const req = it.requires && Object.keys(it.requires).length
    ? ` · 🔒 ${Object.entries(it.requires).map(([k, v]) => `${k} ${v}+`).join(" ")}`
    : "";
  return `<span class="weapon-stats">⚔ ${it.damage} dmg · 📏 ${it.range} range${req}</span>`;
}

// An armory row in fixed columns — icon, name, bonus, damage, range, requirement — so every
// row's numbers sit under each other (armor and accessories leave the weapon columns empty).
function armoryItemRow(it) {
  const weapon = it.slot === "weapon";
  const req = weapon && it.requires && Object.keys(it.requires).length
    ? `🔒 ${Object.entries(it.requires).map(([k, v]) => `${k} ${v}+`).join(" ")}`
    : "";
  return `<div class="armory-item ${it.legendary ? "armory-legendary" : ""}">
    <span class="armory-icon">${it.icon}</span>
    <span class="armory-name">${it.legendary ? "✨ " : ""}${esc(it.name)}</span>
    <span class="armory-bonus">${formatBonuses(it.bonuses)}</span>
    <span class="armory-cell">${weapon ? `⚔ ${it.damage} dmg` : ""}</span>
    <span class="armory-cell">${weapon ? `📏 ${it.range} range` : ""}</span>
    <span class="armory-cell armory-req">${req}</span>
  </div>`;
}

export function renderArmory(state) {
  const grouped = { melee: [], ranged: [], armor: [], accessory: [] };
  for (const it of state.armory) (grouped[armoryGroupKey(it)] || (grouped[armoryGroupKey(it)] = [])).push(it);

  const section = (key) => {
    const items = grouped[key] || [];
    return `<div class="subcard">
      <h3>${ARMORY_SLOT_LABEL[key]} <span class="muted">(${items.length})</span></h3>
      <div class="armory-list">${items.map(armoryItemRow).join("") || '<p class="muted">Nothing in storage right now.</p>'}</div>
    </div>`;
  };

  return `<div class="card">
    <h2>🗡 Armory</h2>
    <p class="muted">Unequipped gear sitting in the shared armory — equip it on a student from their card's Inventory tab.</p>
    ${section("melee")}
    ${section("ranged")}
    ${section("armor")}
    ${section("accessory")}
  </div>`;
}

// ---------- item list (full equipment catalog) ----------

export function renderItemList() {
  const all = [...ITEM_TEMPLATES, ...LEGENDARY_ITEM_TEMPLATES];
  const grouped = { melee: [], ranged: [], armor: [], accessory: [] };
  for (const it of all) (grouped[armoryGroupKey(it)] || (grouped[armoryGroupKey(it)] = [])).push(it);

  const section = (key) => {
    const items = grouped[key] || [];
    return `<div class="subcard">
      <h3>${ARMORY_SLOT_LABEL[key]} <span class="muted">(${items.length})</span></h3>
      <div class="armory-list">${items.map(armoryItemRow).join("")}</div>
    </div>`;
  };

  return `<div class="card">
    <h2>📖 Item List ${infoDot({ notes: ["Expeditions bring back common gear — harder places, better gear", "The Hardware Store and Police Station lean toward weapons", "✨ Legendary items come with legendary survivors"] })}</h2>
    <p class="room-tagline">Everything that can turn up · one melee (needs STR) and one ranged weapon (needs DEX) per student</p>
    ${section("melee")}
    ${section("ranged")}
    ${section("armor")}
    ${section("accessory")}
  </div>`;
}

// ---------- roster ----------

const ROSTER_SORT_FIELDS = [
  { key: "name", label: "Name" },
  { key: "level", label: "Level" },
  { key: "hp", label: "HP" },
  { key: "stamina", label: "Stamina" },
  { key: "STR", label: "STR" },
  { key: "DEX", label: "DEX" },
  { key: "CON", label: "CON" },
  { key: "INT", label: "INT" },
  { key: "WIS", label: "WIS" },
  { key: "CHA", label: "CHA" },
];

function rosterSortValue(c, key) {
  if (key === "name") return c.name.toLowerCase();
  if (key === "level") return overallLevel(c);
  if (key === "hp") return c.role === "teacher" ? -1 : c.hp;
  if (key === "stamina") return c.role === "teacher" ? -1 : c.stamina;
  const subject = SUBJECTS.find((s) => STAT_OF_SUBJECT[s] === key);
  return c.grades[subject];
}

export function renderRoster(state, filter = "student", sortKey = "name", sortDir = "asc") {
  if (filter !== "teacher") filter = "student";
  const teachersView = filter === "teacher";
  // "Show deceased" only appears when someone in this view has died.
  const anyDead = state.characters.some((c) => !c.alive && c.role === filter);
  const showDead = anyDead && window.__showDead;
  const fields = ROSTER_SORT_FIELDS;
  const effectiveSortKey = fields.some((f) => f.key === sortKey) && !(teachersView && ["level", "hp", "stamina"].includes(sortKey)) ? sortKey : "name";
  const list = state.characters
    .filter((c) => (showDead || c.alive) && c.role === filter)
    .sort((a, b) => {
      const va = rosterSortValue(a, effectiveSortKey);
      const vb = rosterSortValue(b, effectiveSortKey);
      const cmp = typeof va === "string" ? va.localeCompare(vb) : va - vb;
      return sortDir === "asc" ? cmp : -cmp;
    });
  const rows = list
    .map((c) => {
      // Teachers: their post by name; students: their classroom.
      const loc = c.role === "teacher" ? occupationLabel(state, c) : c.seat ? roomDisplayName(state, c.seat.room) : "Unassigned";
      return `<tr class="${c.alive ? "" : "row-dead"}">
        <td>${rosterNameTag(c)}</td>
        <td>${c.gender}</td>
        <td>${teachersView ? `🌟 ${SUBJECT_LABEL[c.teachSubject]}` : overallLevel(c)}</td>
        ${teachersView ? "" : `<td>${hpBar(c)}</td><td>${staminaBar(c)}</td>`}
        <td>${statusTag(c, state)}</td>
        <td>${esc(loc)}</td>
        <td>${statChips(c)}</td>
      </tr>`;
    })
    .join("");

  const filterTabs = [
    ["student", "🧳 Students"],
    ["teacher", "🎓 Teachers"],
  ];
  const filterBar = `<div class="subtabs">${filterTabs
    .map(([id, label]) => `<button class="subtab-btn ${filter === id ? "active" : ""}" data-action="set-roster-filter" data-filter="${id}">${label}</button>`)
    .join("")}</div>`;

  const sortOptions = fields.filter((f) => !teachersView || !["level", "hp", "stamina"].includes(f.key)).map((f) => `<option value="${f.key}" ${f.key === effectiveSortKey ? "selected" : ""}>${f.label}</option>`).join("");

  const fallen = state.characters.filter((c) => !c.alive);
  const memorial = fallen.length
    ? `<div class="subcard memorial-card">
        <h3>🕯 In Memoriam</h3>
        <div class="memorial-list">
          ${fallen
            .map(
              (c) => `<div class="memorial-row" title="${esc(c.name)}">
                <span class="mini-portrait cc-dead">${characterSprite(c, 32)}</span>
                <span class="memorial-name">${esc(c.name)}</span>
                <span class="muted memorial-day">Day ${c.diedOnDay || "?"}</span>
              </div>`
            )
            .join("")}
        </div>
      </div>`
    : "";

  return `<div class="card">
    <h2>Roster</h2>
    <div class="roster-controls">
      <div class="roster-filters">
        ${filterBar}
        ${anyDead ? `<label class="check-row"><input type="checkbox" data-action="toggle-show-dead" ${showDead ? "checked" : ""}/> Show deceased</label>` : ""}
      </div>
      <div class="picker-sort-row">
        <span class="mini-label">Sort by</span>
        <select data-action="set-roster-sort">${sortOptions}</select>
        <button class="btn btn-sm" data-action="toggle-roster-sort-dir" title="Toggle ascending/descending">${sortDir === "asc" ? "⬆ Ascending" : "⬇ Descending"}</button>
      </div>
    </div>
    <div class="table-wrap">
      <table class="roster-table">
        <thead><tr><th>Name</th><th>Sex</th>${teachersView ? "<th>Teaches</th>" : "<th>Lvl</th><th>HP</th><th>Stamina</th>"}<th>Status</th><th>Assignment</th><th>Stats</th></tr></thead>
        <tbody>${rows || `<tr><td colspan="${teachersView ? 6 : 8}" class="muted">Nobody here.</td></tr>`}</tbody>
      </table>
    </div>
    ${memorial}
  </div>`;
}

// ---------- log ----------

// Cheap keyword sniff so the log reads at a glance instead of as a wall of uniform text — no
// new bookkeeping needed at each addLog() call site.
function logCategory(msg) {
  const m = msg.toLowerCase();
  if (/fell|wounded|ambushed|attack|horde|defend|fought off|routed|breached|hurt|chase|zombie|went down/.test(m)) return "log-combat";
  if (/discovered|scouted|expedition|brought back/.test(m)) return "log-explore";
  if (/joined|survivor|wants to join/.test(m)) return "log-social";
  if (/food|scrap|medicine|research|salvage|upgrad|fortif|stockpile/.test(m)) return "log-economy";
  return "";
}

export function renderLog(state) {
  const items = state.log
    .map((e) => `<li class="${logCategory(e.msg)}"><span class="log-tag">D${e.day}T${e.turn}</span> ${esc(e.msg)}</li>`)
    .join("");
  return `<div class="card"><h2>Log</h2><ul class="log-list">${items || '<li class="muted">Nothing yet.</li>'}</ul></div>`;
}

// A short recap shown once right after a day rolls over (whichever path triggered it — see
// main.js's render()) — the same log entries as the Log tab, just curated to that one day and
// framed as a "here's what happened" beat instead of scrolling the full history.
export function renderDayRecap(recap) {
  const items = recap.entries
    .filter((e) => !/resolved\.$|begins\.$/.test(e.msg))
    .map((e) => `<li class="${logCategory(e.msg)}">${esc(e.msg)}</li>`)
    .join("");
  return `
  <div class="modal-overlay" data-action="close-day-recap">
    <div class="char-card mission-card" data-action="noop">
      <button class="cc-close" data-action="close-day-recap" title="Close">✕</button>
      <h3>📰 Day ${recap.day} Recap</h3>
      <ul class="log-list day-recap-list">${items || '<li class="muted">A quiet day.</li>'}</ul>
      <button class="btn btn-primary" data-action="close-day-recap">Continue to Day ${recap.day + 1}</button>
    </div>
  </div>`;
}

// ---------- character card ----------

function formatBonuses(bonuses) {
  return Object.entries(bonuses).map(([k, v]) => `+${v} ${k}`).join("  ") || "no bonus";
}

function renderStatsTab(state, c) {
  return c.role === "teacher" ? renderTeacherStatsTab(c) : renderStudentStatsTab(state, c);
}

function renderStudentStatsTab(state, c) {
  const bestGrade = Math.max(...SUBJECTS.map((s) => c.grades[s]));
  const gradeRows = SUBJECTS.map((s) => {
    const val = c.grades[s];
    const letter = gradeLetter(val);
    const stat = STAT_OF_SUBJECT[s];
    const gearBonus = equipmentBonus(c, stat);
    const total = val + gearBonus;
    const hasBonus = gearBonus > 0;
    const isBest = val === bestGrade;
    const bonusParts = [];
    if (gearBonus) bonusParts.push(`+${gearBonus} from equipped gear`);
    const tooltip = bonusParts.join(", ");
    return `<div class="grade-row-v2 ${isBest ? "grade-row-best" : ""}">
      <span class="gr-col gr-name" title="${stat}: ${esc(STAT_EFFECTS[stat])}">${isBest ? "🌟 " : ""}${SUBJECT_LABEL[s]}</span>
      <span class="gr-sep">|</span>
      <span class="gr-col gr-letter grade-letter-${letter}">${letter}</span>
      <span class="gr-sep">|</span>
      <span class="gr-col gr-stat ${hasBonus ? "gr-stat-bonus" : ""}" ${tooltip ? `title="${esc(tooltip)}"` : ""}>${stat}: ${total}</span>
      <span class="gr-sep">|</span>
      <div class="gr-bar"><div class="gr-bar-fill" style="width:${Math.min(100, total)}%"></div></div>
    </div>`;
  }).join("");
  return `<div class="cc-section-label">Grades</div><div class="grade-list">${gradeRows}</div>
    <p class="muted cc-grade-note">The letter grade reflects academic performance only. A highlighted number includes a
    bonus from equipped gear — hover it to see the breakdown. Hover a subject to see what its stat does. The 🌟 marks their strongest stat.</p>`;
}

// Teachers don't have combat stats — their grades only matter as a teaching bonus for whatever
// classroom they're assigned to. No numeric value or bar, just the letter and what it's worth.
function renderTeacherStatsTab(c) {
  const gradeRows = SUBJECTS.map((s) => {
    const val = c.grades[s];
    const letter = gradeLetter(val);
    const specialty = s === c.teachSubject;
    return `<div class="grade-row-v2 grade-row-v2-teacher">
      <span class="gr-col gr-name">${specialty ? "🌟 " : ""}${SUBJECT_LABEL[s]}</span>
      <span class="gr-sep">|</span>
      <span class="gr-col gr-letter grade-letter-${letter}">${letter}</span>
      <span class="gr-sep">|</span>
      <span class="gr-teacher-bonus">Teaches: <b>+${teachingBonus(val)}</b> a day</span>
    </div>`;
  }).join("");
  return `<div class="cc-section-label">Grades &amp; Teaching Bonus</div><div class="grade-list">${gradeRows}</div>
    <p class="muted cc-grade-note">🌟 = their specialty, always their best grade — every other grade is at least one rank lower. Assign them to a Floor 2 classroom and every
    seated student gains that much of the subject a day, up to the teacher's own grade — or to the Gymnasium / Acrobatics to speed up training.</p>`;
}

function renderInventoryTab(state, c) {
  const eq = c.equipment || { meleeWeapon: null, rangedWeapon: null, armor: null, accessories: [null, null, null] };

  const slotRow = (label, slotKey, item, allowedSlotType, category) => {
    const options = state.armory.filter((it) => it.slot === allowedSlotType && (!category || it.category === category));
    const itemHtml = item
      ? `<div class="inv-item">
          <span class="inv-item-icon">${item.icon}</span>
          <span class="inv-item-name">${esc(item.name)}</span>
          <span class="inv-item-bonus">${formatBonuses(item.bonuses)}</span>
          ${weaponStatsLabel(item)}
          <button class="btn-x" data-action="unequip-item" data-id="${c.id}" data-slot="${slotKey}">✕</button>
        </div>`
      : `<select data-action="equip-item" data-id="${c.id}" data-slot="${slotKey}">
          <option value="">— empty —</option>
          ${options
            .map((it) => {
              const ok = meetsItemRequirement(c, it);
              const reqNote = it.requires && Object.keys(it.requires).length
                ? ` [needs ${Object.entries(it.requires).map(([k, v]) => `${k} ${v}+`).join(" ")}]`
                : "";
              return `<option value="${it.uid}" ${ok ? "" : "disabled"}>${ok ? "" : "🔒 "}${it.icon} ${esc(it.name)} (${formatBonuses(it.bonuses)})${reqNote}</option>`;
            })
            .join("")}
        </select>`;
    return `<div class="inv-slot"><div class="inv-slot-label">${label}</div>${itemHtml}</div>`;
  };

  const rows = [
    slotRow("Melee Weapon", "meleeWeapon", eq.meleeWeapon, "weapon", "melee"),
    slotRow("Ranged Weapon", "rangedWeapon", eq.rangedWeapon, "weapon", "ranged"),
    slotRow("Armor", "armor", eq.armor, "armor"),
    slotRow("Accessory 1", "accessory0", eq.accessories[0], "accessory"),
    slotRow("Accessory 2", "accessory1", eq.accessories[1], "accessory"),
    slotRow("Accessory 3", "accessory2", eq.accessories[2], "accessory"),
  ].join("");

  const allItems = [eq.meleeWeapon, eq.rangedWeapon, eq.armor, ...eq.accessories].filter(Boolean);
  const totals = {};
  for (const it of allItems) for (const [k, v] of Object.entries(it.bonuses)) totals[k] = (totals[k] || 0) + v;
  const totalStr = Object.keys(totals).length
    ? Object.entries(totals).map(([k, v]) => `+${v} ${k}`).join("  ")
    : "none equipped";

  return `<div class="cc-section-label">Equipment</div>
    <div class="inv-list">${rows}</div>
    <div class="inv-total"><b>Total combat bonus:</b> ${totalStr}</div>`;
}

function skillNodeStatus(c, subject, tier, path) {
  const key = `${subject}:${tier}`;
  if ((c.skills || []).includes(key)) return "owned";

  const gradeIdx = GRADE_TIERS.indexOf(gradeLetter(c.grades[subject]));
  const nodeIdx = GRADE_TIERS.indexOf(tier);
  if (gradeIdx < nodeIdx) return "locked-grade";

  const posInPath = path.findIndex((n) => n.tier === tier);
  if (posInPath > 0) {
    const prevKey = `${subject}:${path[posInPath - 1].tier}`;
    if (!(c.skills || []).includes(prevKey)) return "locked-order";
  }

  if (availableSkillPoints(c) <= 0) return "locked-points";
  return "buyable";
}

const SKILL_STATUS_REASON = {
  owned: "Learned.",
  "locked-grade": "Grade too low for this tier yet.",
  "locked-order": "Learn the previous skill on this path first.",
  "locked-points": "No skill points available.",
  buyable: "Click to learn — costs 1 skill point.",
};

// Only shows a path's learned nodes plus whichever is next in line (buyable now, or eligible
// but waiting on a skill point) — nodes still out of reach (grade too low, or the previous node
// on the path not owned yet) stay hidden, collapsed into a single "+N more" indicator.
function renderSkillsTab(c) {
  const rows = SUBJECTS.map((s) => {
    const letter = gradeLetter(c.grades[s]);
    const path = SKILL_TREE[s];
    let hiddenCount = 0;
    const nodes = path
      .map((node) => {
        const status = skillNodeStatus(c, s, node.tier, path);
        if (status === "locked-grade" || status === "locked-order") {
          hiddenCount++;
          return "";
        }
        const cls =
          status === "owned"
            ? `skill-owned grade-letter-${node.tier}`
            : status === "buyable"
            ? "skill-buyable"
            : "skill-locked";
        const clickAttr = status === "buyable" ? `data-action="buy-skill" data-id="${c.id}" data-subject="${s}" data-tier="${node.tier}"` : "";
        const title = `${node.name} (${node.tier}) — ${node.desc} +${Math.round(SKILL_EFFECTS[s].per * 100)}% ${SKILL_EFFECTS[s].what}. ${SKILL_STATUS_REASON[status]}`;
        return `<button type="button" class="skill-node ${cls}" ${clickAttr} ${status === "buyable" ? "" : "disabled"} title="${esc(title)}">
          <span class="skill-node-tier">${status === "owned" ? "✓" : node.tier}</span>
          <span class="skill-node-name">${esc(node.name)}</span>
        </button>`;
      })
      .join("");
    const hiddenChip = hiddenCount
      ? `<span class="skill-node skill-hidden" title="${hiddenCount} more skill${hiddenCount === 1 ? "" : "s"} on this path — raise the ${SUBJECT_LABEL[s]} grade and learn the one before it to reveal them">🔒 +${hiddenCount}</span>`
      : "";
    const effect = SKILL_EFFECTS[s];
    const owned = (c.skills || []).filter((k) => k.startsWith(`${s}:`)).length;
    return `<div class="skill-row">
      <div class="skill-subject">${SUBJECT_LABEL[s]} <b class="grade-letter grade-letter-${letter}">${letter}</b>
        <span class="skill-effect">each: +${Math.round(effect.per * 100)}% ${effect.what}${owned ? ` · now +${Math.round(effect.per * owned * 100)}%` : ""}</span></div>
      <div class="skill-nodes">${nodes}${hiddenChip}</div>
    </div>`;
  }).join("");
  return `<div class="cc-section-label">Skill Tree</div>
    <div class="skills-list">${rows}</div>`;
}

// Under a student's card when promoting them from the Headmaster's Office: yes, no, or keep them
// a student for good (which frees their promotion slot).
function promoteConfirm(c) {
  const best = SUBJECTS.reduce((b, s) => (c.grades[s] > c.grades[b] ? s : b), SUBJECTS[0]);
  return `<div class="cc-confirm">
    <div class="cc-confirm-text"><b>🎓 Promote ${esc(c.name)} to teacher?</b>
      <span class="muted">They'd teach ${SUBJECT_LABEL[best]} (${gradeLetter(c.grades[best])}). A teacher can't go back to being a student.</span></div>
    <div class="cc-confirm-actions">
      <button class="btn btn-primary" data-action="confirm-promote" data-id="${c.id}">✓ Yes</button>
      <button class="btn" data-action="close-card">No</button>
      <button class="btn btn-danger" data-action="never-promote" data-id="${c.id}" title="Keep them a student and free their promotion slot">🚫 Never promote</button>
    </div>
  </div>`;
}

// Under a waiting recruit's card: let them join, leave them waiting, or turn them away for good.
function recruitConfirm(c) {
  const who = c.role === "teacher"
    ? `A teacher of ${SUBJECT_LABEL[c.teachSubject]} (${gradeLetter(c.grades[c.teachSubject])})`
    : `A level ${overallLevel(c)} student`;
  return `<div class="cc-confirm">
    <div class="cc-confirm-text"><b>🚪 Let ${esc(c.name)} join the school?</b>
      <span class="muted">${c.legendary ? "✨ Legendary · " : ""}${who}. "No" leaves them waiting.</span></div>
    <div class="cc-confirm-actions">
      <button class="btn btn-primary" data-action="confirm-recruit" data-id="${c.id}">✓ Yes</button>
      <button class="btn" data-action="close-card">No</button>
      <button class="btn btn-danger" data-action="never-recruit" data-id="${c.id}" title="Turn them away — you won't see them again">🚫 Never show again</button>
    </div>
  </div>`;
}

export function renderCharacterCard(state, c, cardTab = "stats", confirm = "") {
  const sprite = characterSprite(c, 150);
  const isTeacher = c.role === "teacher";
  const points = availableSkillPoints(c);

  const traitBadges = (c.traits || [])
    .map((tid) => TRAITS.find((t) => t.id === tid))
    .filter(Boolean)
    .map((t) => `<span class="trait-pill" title="${esc(t.desc)}">${t.icon} ${esc(t.name)}</span>`)
    .join("");

  // Teachers don't train, equip gear or level up — their card is just their
  // grades and teaching bonuses, with no tabs at all.
  const TABS = [["stats", "📊 Stats"], ["inventory", "🧳 Inventory"], ["skills", "🌳 Skills"]];
  const tabBar = isTeacher ? "" : `<div class="cc-tabs">${TABS.map(
    ([id, label]) => `<button class="cc-tab-btn ${cardTab === id ? "active" : ""}" data-action="set-card-tab" data-tab="${id}">${label}</button>`
  ).join("")}</div>`;

  let body;
  if (isTeacher) body = renderStatsTab(state, c);
  else if (cardTab === "inventory") body = renderInventoryTab(state, c);
  else if (cardTab === "skills") body = renderSkillsTab(c);
  else body = renderStatsTab(state, c);

  const topStatFirst = isTeacher
    ? `<div class="cc-stat-box"><span class="cc-label">Teaches</span><span class="cc-value">🌟 ${SUBJECT_LABEL[c.teachSubject]}</span></div>`
    : `<div class="cc-stat-box" ${tipAttr(levelTip(c))}><span class="cc-label">Level</span><span class="cc-value">${overallLevel(c) >= STUDENT_MAX_LEVEL ? "MAX" : overallLevel(c)}</span>${overallLevel(c) >= STUDENT_MAX_LEVEL ? "" : `<span class="xp-bar"><i style="width:${Math.round(((c.exp || 0) / xpToNextLevel(overallLevel(c))) * 100)}%"></i></span>`}</div>`;

  return `
  <div class="modal-overlay" data-action="close-card">
    <div class="char-card ${confirm ? "cc-with-confirm" : ""}" data-action="noop">
      <button class="cc-close" data-action="close-card" title="Close">✕</button>
      <div class="cc-left">
        <div class="cc-sprite-wrap ${!c.alive ? "cc-dead" : ""}">
          ${sprite}
          <button class="cc-reroll-btn" data-action="reroll-portrait" data-id="${c.id}" title="Randomize appearance">🎲</button>
          <button class="cc-rename-btn" data-action="rename-char" data-id="${c.id}" title="Rename">✏️</button>
        </div>
        <div class="cc-name">${c.legendary ? "✨ " : ""}${esc(c.name)}</div>
        <div class="cc-role-row">
          <span class="cc-role-tag">${isTeacher ? "🎓 Teacher" : "🧳 Student"}</span>
          ${statusTag(c)}
        </div>
        ${!isTeacher ? `<div class="cc-skillpoints ${points > 0 ? "has-points" : ""}" title="Earned 1 per level, spent on the Skills tab">
          ✨ ${points} skill point${points === 1 ? "" : "s"}
        </div>` : ""}
        ${traitBadges && !isTeacher ? `<div class="cc-section-label cc-talents-label">Talents</div><div class="cc-traits">${traitBadges}</div>` : ""}
        ${!isTeacher && c.neverPromote ? `<div class="cc-kept">🚫 Staying a student <button class="btn btn-sm" data-action="allow-promote" data-id="${c.id}">Allow promotion</button></div>` : ""}
        ${!isTeacher && c.alive && state.characters.includes(c) ? `<button class="btn btn-sm btn-danger cc-expel" data-action="expel" data-id="${c.id}" title="Send them away from the school for good">🚪 Expel</button>` : ""}
      </div>
      <div class="cc-right">
        <div class="cc-top-stats">
          ${topStatFirst}
          <div class="cc-stat-box"><span class="cc-label">Sex</span><span class="cc-value">${c.gender === "F" ? "Female" : "Male"}</span></div>
          <div class="cc-stat-box"><span class="cc-label">Occupation</span><span class="cc-value cc-occupation">${esc(occupationLabel(state, c))}</span></div>
        </div>
        ${c.role === "teacher" ? "" : `<div class="cc-top-stats">
          <div class="cc-stat-box cc-hp-box"><span class="cc-label">HP</span>${hpBar(c)}</div>
          <div class="cc-stat-box cc-hp-box"><span class="cc-label">Stamina</span>${staminaBar(c)}</div>
        </div>`}
        ${tabBar}
        ${body}
      </div>
      ${confirm === "promote" ? promoteConfirm(c) : confirm === "recruit" ? recruitConfirm(c) : ""}
    </div>
  </div>`;
}

// ---------- root ----------

export function renderApp(state, activeTab, rosterFilter = "student", floaties = [], rosterSortKey = "name", rosterSortDir = "asc") {
  let content;
  if (activeTab === "floor1") content = renderFloor1(state);
  else if (activeTab === "floor2") content = renderFloor2(state);
  else if (activeTab === "floor3") content = renderFloor3(state);
  else if (activeTab === "farm") content = renderFarm(state);
  else if (activeTab === "scrapyard") content = renderScrapyard(state);
  else if (activeTab === "defense") content = renderDefenseTab(state);
  else if (activeTab === "assault") content = renderAssaultTab(state);
  else if (activeTab === "event") content = renderEventTab(state);
  else if (activeTab === "roster") content = renderRoster(state, rosterFilter, rosterSortKey, rosterSortDir);
  else if (activeTab === "research") content = renderResearch(state);
  else if (activeTab === "armory") content = renderArmory(state);
  else if (activeTab === "itemlist") content = renderItemList();
  else if (activeTab === "log") content = renderLog(state);
  else content = renderOverview(state); // "overview" and any stale/unrecognized tab both land here

  return `${renderTopbar(state, floaties, activeTab)}${renderTabs(state, activeTab)}<div class="content">${content}</div>`;
}
