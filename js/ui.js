import {
  CLASSROOM_IDS, SUBJECTS, SUBJECT_LABEL, STAT_OF_SUBJECT, STAT_LABEL, TRAITS,
  CLASSROOM_CAPACITY, LOCATIONS,
  BOND_COUPLE_THRESHOLD, GRADE_TIERS, SKILL_TREE, MAX_TEACHERS, ROOM_MAX_LEVEL, roomUpgradeCost,
  FARM_YIELD_FOOD, SCRAPYARD_YIELD_MATERIALS, RANCH_YIELD_FOOD, TECH_TREE, ROOM_LEVELS, CAFETERIA_RATIONS_BY_LEVEL,
  ITEM_TEMPLATES, LEGENDARY_ITEM_TEMPLATES, DEFENSE_STRUCTURES, zombieCountForDay, zombieStatsForDay,
  ZOMBIE_TYPES, hordeComposition, isBossNight, bossNameForDay, ANTENNA_STAGES,
  DISHES, INGREDIENTS, PRODUCERS, PLOTS_PER_WORKER, GYM_SIDES, GYM_MAX_BONUS, STAMINA_COST_GYM, INFIRMARY_MEDICINE_PER_PATIENT, INFIRMARY_NURSE_BONUS,
  RESEARCH_ROOM_INT_PER_POINT, MEDICINE_PER_STABILIZE, TECH_BRANCHES, STAT_EFFECTS, SKILL_EFFECTS,
  RESCUE_DELAY_DAYS, LANDMARKS, BOARDED_ROOMS, ROOM_FIGHT_SQUAD, ROOM_FIGHT_STAMINA, RAID_MAX_TEAM, RAID_MAX_ROUNDS, NEST_CLEAR_STAMINA, NEST_CLEAR_MAX,
} from "./data.js";
import {
  overallLevel, gradeLetter, effectiveGrade, equipmentBonus, availableSkillPoints, teachingBonus,
  classroomTeachingBonus, bestClassroomSubjectFor,
} from "./characters.js";
import {
  getChar, aliveChars, deskPartner, PROMOTE_LEVEL_THRESHOLD, teacherCount, infectedChars, infectionDaysLeft, infirmaryBedsUsed, roomState, roomLevel, roomLevelStats, roomUpgradeCostFor, roomRepairCost, infirmaryNurseBonus,
  isHexExplored, canScoutHex, meetsItemRequirement, antennaReady, canCookDish, cooksOnDuty, researchRoomYield,
  techPerk, gateHp, infirmaryHealShare, infirmaryRest, dishCapacity, exploreStaminaCost, tendedPlots, stockLabel, facilityWorkers,
  gymTeachers, gymGain, gymRoom, teacherRank, isBoarded, roomFightOdds, canFightForRoom, roomLabel, currentObjective, objectiveProgress, isNest, nextToNest, nestClearChance, scoutCost, scoutEncounterChance, raidCooldownLeft, raidBoss, raidEstimate, RAID_TEAM,
} from "./game.js";
import {
  hexTileKey, tileBackground, tileDataUri, hexTerrain, TERRAIN_NAMES, locationAt, landmarkAt, MAP_RADIUS, isSchoolHex,
} from "./map.js";
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

const HEX_W = 76;
const HEX_H = 66;
const HEX_SIZE = HEX_W / 2;

// Flat-top axial hex -> pixel center, and axial distance from the origin.
function hexCenter(q, r) {
  return { x: 1.5 * HEX_SIZE * q, y: Math.sqrt(3) * HEX_SIZE * (r + q / 2) };
}
function hexDistance(q, r) {
  return (Math.abs(q) + Math.abs(r) + Math.abs(q + r)) / 2;
}

// All axial hexes within `radius` of the school, minus the school grounds themselves (drawn as
// one big campus), for a full fog-of-war field rather than just the sparse curated LOCATIONS.
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

// The school spans its own hex and the six around it: one pixel-art campus clipped to that
// seven-hex flower, with a gold outline traced around just its outer edge.
const SCHOOL_CELLS = [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1], [1, -1], [-1, 1]];
function renderCampus(mapWidth, mapHeight) {
  const size = HEX_SIZE;
  const half = (Math.sqrt(3) / 2) * size;
  const boxW = 5 * size;
  const boxH = 6 * half;
  const corners = [[size, 0], [size / 2, half], [-size / 2, half], [-size, 0], [-size / 2, -half], [size / 2, -half]];
  const hexes = SCHOOL_CELLS.map(([q, r]) => {
    const { x, y } = hexCenter(q, r);
    return corners.map(([dx, dy]) => [x + dx + boxW / 2, y + dy + boxH / 2]);
  });
  // Edges shared by two cells are inside the flower; the ones used once make up its outline.
  const edgeCount = new Map();
  const key = ([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`;
  for (const pts of hexes) {
    pts.forEach((p, i) => {
      const q = pts[(i + 1) % 6];
      const k = [key(p), key(q)].sort().join("|");
      edgeCount.set(k, (edgeCount.get(k) || 0) + 1);
    });
  }
  const outline = [...edgeCount].filter(([, n]) => n === 1).map(([k]) => {
    const [a, b] = k.split("|");
    return `M${a} L${b}`;
  }).join(" ");
  const polygons = hexes.map((pts) => `<polygon points="${pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ")}"/>`).join("");
  return `<div class="hex-campus" style="left:${mapWidth / 2 - boxW / 2}px;top:${mapHeight / 2 - boxH / 2}px;width:${boxW}px;height:${boxH}px;">
    <svg width="${boxW}" height="${boxH}" viewBox="0 0 ${boxW} ${boxH}">
      <defs><clipPath id="campus-clip">${polygons}</clipPath></defs>
      <image href="${tileDataUri("campus")}" x="0" y="0" width="${boxW}" height="${boxH}" preserveAspectRatio="none" clip-path="url(#campus-clip)"/>
      <path class="campus-edge" d="${outline}"/>
    </svg>
    <span class="hex-name hex-name-school">🏫 School</span>
  </div>`;
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

// The room's one Upgrade button, in the top-right corner of its banner (roomScene's `actions`):
// it opens a popup with what the next level brings. At the top level it just says Max — unless a
// raid broke something, when it opens the popup to repair it.
function roomUpgradeButton(state, key) {
  const cost = roomUpgradeCostFor(state, key);
  const repair = roomRepairCost(state, key);
  if (cost === null && !repair) return `<span class="scene-upgrade scene-upgrade-maxed">Max</span>`;
  return `<button class="scene-upgrade ${repair ? "scene-upgrade-damaged" : ""}" data-action="open-upgrade" data-room="${key}">${repair ? "⚠ " : ""}${cost === null ? "Repair" : "Upgrade"}</button>`;
}

const levelBadge = (state, key) => `<span class="plaque-level">Lv ${roomLevel(state, key)}</span>`;

// "Gymnasium", "Biology" / "Classroom 2" — how the popup titles a room.
function roomTitle(state, key) {
  if (key.startsWith("classroom:")) return roomDisplayName(state, key.split(":")[1]);
  return ROOM_LEVELS[key].name;
}

// The Upgrade popup: the room's level, what each of its numbers goes to at the next level (the
// ones that change are highlighted), the cost, and a repair if a raid broke a worker slot.
export function renderRoomUpgradeModal(state, key) {
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

function nameTag(c) {
  const couple = c.coupleId ? " 💞" : "";
  const role = c.role === "teacher" ? "🎓" : "🧳";
  const legendary = c.legendary ? "✨ " : "";
  return `<span class="unit-link" data-action="open-card" data-id="${c.id}">${legendary}${role} ${esc(c.name)}${couple}</span>`;
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
  council: "Student Council",
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
  if (c.infirmaryToday) return c.infirmaryToday === "rest" ? "Resting (Nurse)" : "Nurse's Office";
  if (c.gymToday) return GYM_SIDES[c.gymToday].room;
  if (c.farmToday) return "Farm";
  if (c.scrapyardToday) return "Scrapyard";
  if (c.ranchToday) return "Ranch";
  if (c.seat) return roomDisplayName(state, c.seat.room);
  return "Unassigned";
}

// Like nameTag, but swaps the role emoji for a mini version of the character's own card portrait.
function rosterNameTag(c) {
  const couple = c.coupleId ? " 💞" : "";
  const portrait = characterSprite(c, 40);
  return `<span class="roster-name unit-link" data-action="open-card" data-id="${c.id}">
    <span class="mini-portrait ${!c.alive ? "cc-dead" : ""}">${portrait}</span>
    <span>${c.legendary ? "✨ " : ""}${esc(c.name)}${couple}</span>
  </span>`;
}

// ---------- room scenes ----------

// Hover/focus "i" that holds a room's full rules, so the card itself only needs a one-liner.
function infoDot(text) {
  return `<span class="info-dot" tabindex="0" aria-label="${esc(text)}" data-tip="${esc(text)}">i</span>`;
}

// Pixel-art banner for a room with everyone working in it standing on the floor — click one to
// open their card. Past 7 people the rest collapse into a "+N" chip so nobody overlaps too much.
const SCENE_MAX_PEOPLE = 7;
// `actions` (the room's upgrade buttons) stack in the top-right corner.
function roomScene(kind, people, title, info = "", actions = "") {
  const shown = people.slice(0, SCENE_MAX_PEOPLE);
  const extra = people.length - shown.length;
  const figures = shown
    .map((c, i) => {
      const left = (((i + 1) / (shown.length + 1)) * 100).toFixed(1);
      return `<span class="scene-person" style="left:${left}%;animation-delay:-${((i * 0.43) % 1.8).toFixed(2)}s"
        data-action="open-card" data-id="${c.id}" title="${esc(c.name)}">${characterSprite(c, 40)}</span>`;
    })
    .join("");
  return `<div class="room-scene" style="background-image:${sceneBackground(kind)}">
    <div class="scene-plaque">${title}${info ? infoDot(info) : ""}</div>
    ${actions ? `<div class="scene-actions">${actions}</div>` : ""}
    ${figures}
    ${extra > 0 ? `<span class="scene-more">+${extra}</span>` : ""}
    ${people.length ? "" : `<span class="scene-empty">empty</span>`}
  </div>`;
}

// A room still overrun from the first night: its scene boarded over, and the cost to clear it.
function renderBoardedRoom(state, roomKey, scene, cls = "") {
  const b = BOARDED_ROOMS[roomKey];
  const afford = state.resources.materials >= b.cost;
  return `<div class="room ${cls} room-boarded">
    <div class="room-scene room-scene-boarded" style="background-image:${sceneBackground(scene)}">
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

// Name + "how you get it" shown on hover over every topbar stat — esc() isn't needed since
// these are all static, developer-authored strings, never user/character data.
const TB_INFO = {
  population: "Population — every student and teacher alive at the school right now.",
  teachers: "Teachers — recruited through exploration or promoted from high-level students, capped at 20.",
  happiness: "Happiness — rises from won battles and new recruits, falls from failed missions and deaths. Skews random events toward good or bad.",
  food: "Food — grown at the Farm and looted from exploration sites. Consumed every night to feed the school.",
  materials: "Scrap — looted from exploration and salvaged at the Scrapyard. Spent on room upgrades, defenses, the antenna and the Crafting Room.",
  medicine: "Medicine — looted from exploration sites during Turn 2. Spent treating patients in the Nurse's Office (3 each) and, automatically, saving defenders who go down in the night battle (5 each).",
  research: "Research — produced by teachers in the Research Room (Floor 3). Spent on the Research tech tree and the antenna.",
  serum: "Antiviral Serum — rare, and the only cure for an infection: one cures one infected person in the Nurse's Office. Sometimes found at the Hospital, Pharmacy and Fire Station; every raid boss drops some.",
};

const DAY_STEPS = [["sun", "Classes"], ["dusk", "Explore"], ["moon", "Night"]];

// Tile colour behind each HUD stat's pixel icon.
const HUD_TILE = {
  people: "#233a57", teacher: "#262f4f", mood: "#4a4121", food: "#4a3818", scrap: "#333a45",
  medicine: "#4d2226", research: "#34284d", serum: "#1d3f28", virus: "#2c4219", antenna: "#3a3020",
};

// One HUD counter: an icon tile, the number, and a small label (hidden on narrow screens).
// `extra` goes after the number (today's meal buffs ride on the Food counter).
function hudStat(floaties, key, iconHtml, tile, value, label, title, { sub = "", cls = "", extra = "" } = {}) {
  return `<span class="${key ? tbItemClass(floaties, key) : "tb-item"} hud-stat ${cls}" title="${title}">
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
    ? `<span class="hud-buffs">${served.map((d) => `<span class="tb-buff" title="Today's meal: ${esc(d.name)} — ${esc(d.desc)} Wears off tonight.">${d.icon}</span>`).join("")}</span>`
    : "";
  const rescue = state.rescue && !state.rescue.evacuated
    ? `<button class="hud-stat hud-rescue ${antennaReady(state) ? "hud-rescue-ready" : ""}" data-action="set-tab" data-tab="rescue"
        title="Evacuation on day ${state.rescue.day} — the rooftop antenna has to be working by then (${state.rescue.stagesDone}/${ANTENNA_STAGES.length} repaired). Click for the rescue plan.">
        <span class="hud-icon" style="--tile:${HUD_TILE.antenna}">${pixelIcon("antenna", 20)}</span>
        <span class="hud-val"><span class="hud-num"><b>Day ${state.rescue.day}</b></span><small>Evac</small></span>
        <span class="hud-rescue-bars">${ANTENNA_STAGES.map((_, i) => `<i class="${i < state.rescue.stagesDone ? "on" : ""}"></i>`).join("")}</span>
      </button>`
    : "";
  return `
  <header class="hud ${infected || r.serum || served.length > 1 ? "hud-tight" : ""}">
    <div class="hud-left">
      <details class="options-dropdown menu-dropdown">
        <summary class="hud-menu" title="Menu">${pixelIcon("menu", 20)}</summary>
        <div class="options-menu">
          <button class="options-item ${activeTab === "log" ? "active" : ""}" data-action="set-tab" data-tab="log">📜 Log</button>
          <button class="options-item ${activeTab === "itemlist" ? "active" : ""}" data-action="set-tab" data-tab="itemlist">📖 Item List</button>
          ${state.rescue ? `<button class="options-item ${activeTab === "rescue" ? "active" : ""}" data-action="set-tab" data-tab="rescue">📡 Rescue Plan</button>` : ""}
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
        ${hudStat(floaties, "population", pixelIcon("people", 20), HUD_TILE.people, pop, "People", TB_INFO.population)}
        ${hudStat(floaties, null, pixelIcon("teacher", 20), HUD_TILE.teacher, teacherCount(state), "Teachers", TB_INFO.teachers)}
        ${hudStat(floaties, "happiness", moodIcon(state.happiness, 20), HUD_TILE.mood, state.happiness, "Morale", TB_INFO.happiness)}
      </div>
    </div>
    <div class="hud-center">${rescue}</div>
    <div class="hud-right">
      <div class="hud-group">
        ${hudStat(floaties, "food", pixelIcon("food", 20), HUD_TILE.food, r.food, "Food", `${TB_INFO.food} ${r.food} on hand, ${pop} needed tonight.`,
          { sub: `<span class="tb-sub">−${pop}</span>`, cls: r.food < pop ? "tb-warn" : "", extra: meals })}
        ${hudStat(floaties, "materials", pixelIcon("scrap", 20), HUD_TILE.scrap, r.materials, "Scrap", TB_INFO.materials)}
        ${hudStat(floaties, "medicine", pixelIcon("medicine", 20), HUD_TILE.medicine, r.medicine, "Meds", TB_INFO.medicine)}
        ${hudStat(floaties, "research", pixelIcon("research", 20), HUD_TILE.research, r.research, "Research", TB_INFO.research)}
        ${infected ? hudStat(floaties, null, pixelIcon("virus", 20), HUD_TILE.virus, infected, "Infected",
          `Infected — ${infected} in quarantine in the Nurse's Office. Each needs a vial of antiviral serum by the end of their fifth day, or they die.`, { cls: "tb-infected hud-compact" }) : ""}
        ${r.serum ? hudStat(floaties, "serum", pixelIcon("serum", 20), HUD_TILE.serum, r.serum, "Serum", TB_INFO.serum, { cls: "hud-compact" }) : ""}
      </div>
    </div>
  </header>`;
}

// The left 3 tabs change with the turn — you manage the school on Turn 1, the outside
// facilities on Turn 2 (while teams are out exploring), and night-related screens on Turn 3.
// Each tab is [id, label, pixel icon].
const LEFT_TABS_BY_TURN = {
  1: [["floor1", "Lobby", "lobby"], ["floor2", "Classrooms", "classrooms"], ["floor3", "Facilities", "facilities"]],
  2: [["farm", "Farm", "farm"], ["ranch", "Ranch", "ranch"], ["scrapyard", "Scrapyard", "scrap"]],
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
      <h3>🚁 The helicopters have landed</h3>
      <p>They followed your signal to the roof and can fly all ${alive} survivor${alive === 1 ? "" : "s"} out right now — ending the run on <b>day ${state.day}</b>.</p>
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

function renderTurn1Overview(state) {
  const classroomSummaries = CLASSROOM_IDS.map((roomId) => {
    const room = state.rooms.classrooms[roomId];
    if (isBoarded(state, `classroom:${roomId}`)) return `<li><b>Classroom ${roomId}</b>: <span class="muted">boarded up</span></li>`;
    const n = room.seats.filter(Boolean).length;
    const teachers = state.characters.filter((c) => c.role === "teacher" && c.post === `classroom:${roomId}`);
    return `<li><b>${roomDisplayName(state, roomId)}</b>: ${n}/${room.seats.length} students, ${teachers.length} teacher(s)</li>`;
  }).join("");
  const gymCount = (side) => state.characters.filter((c) => c.gymToday === side).length;
  const cooks = cooksOnDuty(state);
  const patientCount = state.characters.filter((c) => c.infirmaryToday).length;
  const nurse = state.characters.find((c) => c.role === "teacher" && c.post === "infirmary" && c.alive);
  const served = state.dishesToday.map((id) => DISHES.find((d) => d.id === id)).filter(Boolean);
  return `
  <div class="card">
    <h2>Turn 1 — Classes ${infoDot(`Students in their home classroom earn XP toward their grade in that subject. Send students to train: the Gymnasium (PE) builds max HP, Acrobatics (Gymnastics) max stamina, and the better the teachers in a room, the more each session gives. A Floor 2 classroom teacher doesn't speed up grades, but gives every seated student a standing bonus to that subject.`)}</h2>
    <p class="room-tagline">Classes build grades · training costs 20 stamina · exploring costs ${exploreStaminaCost(state)} · resting at the nurse's restores ${infirmaryRest(state)}</p>
    <ul class="summary-list">
      ${classroomSummaries}
      <li><b>Gymnasium</b>: ${gymCount("PE")}/${state.rooms.gym.studentCapacity} training PE today</li>
      <li><b>Acrobatics</b>: ${gymCount("Gymnastics")}/${state.rooms.acrobatics.studentCapacity} training Gymnastics today</li>
      <li><b>Cafeteria</b>: ${cooks.length ? cooks.map((c) => esc(c.name)).join(", ") : "no cooks assigned"}</li>
      <li><b>Today's meals</b>: ${served.length ? served.map((d) => `${d.icon} ${esc(d.name)}`).join(", ") : `none yet${cooks.length ? " — cook something in the Cafeteria" : ""}`}</li>
      <li><b>Nurse's Office</b>: ${nurse ? esc(nurse.name) : "no nurse"}, ${patientCount}/${state.rooms.infirmary.studentCapacity} patients today</li>
    </ul>
    <button class="btn btn-primary btn-big" data-action="resolve-turn">📚 Hold Classes &amp; Advance to Afternoon</button>
  </div>`;
}

function renderTurn2Overview(state) {
  const missionChips = [0, 1, 2]
    .map((i) => {
      const locId = state.teamLocations[i];
      if (!locId) return "";
      const loc = LOCATIONS.find((l) => l.id === locId);
      const memberCount = state.characters.filter((c) => c.exploreTeam === i && c.alive).length;
      return `<button class="mission-chip" style="--team:${TEAM_COLORS[i]}" data-action="open-mission" data-location="${locId}">
        <span><i class="team-dot"></i>${LOCATION_ICON[locId]} ${esc(loc.name)}</span>
        <span class="muted">${memberCount}/5</span>
        <span class="btn-x" data-action="clear-mission" data-team="${i}" title="Recall team">✕</span>
      </button>`;
    })
    .join("");
  const raidLm = LANDMARKS.find((l) => l.id === state.raidTarget);
  const raidCount = state.characters.filter((c) => c.exploreTeam === RAID_TEAM && c.alive).length;
  const raidChip = raidLm
    ? `<button class="mission-chip mission-chip-raid" style="--team:${TEAM_COLORS[RAID_TEAM]}" data-action="open-raid" data-landmark="${raidLm.id}">
        <span><i class="team-dot"></i>☠ ${esc(raidLm.boss.name)}</span>
        <span class="${raidCount < raidLm.minTeam ? "plot-warn" : "muted"}">${raidCount}/${raidLm.minTeam}+</span>
        <span class="btn-x" data-action="clear-raid" title="Call off the raid">✕</span>
      </button>`
    : "";

  return `
  <div class="card">
    <h2>Turn 2 — Exploration ${infoDot("Click a location on the map to send a team there. Distance from the school sets the difficulty — closer is safer, farther pays better (and is more dangerous). Teachers stay at the school. A fuller team of up to 5 students succeeds more often. Scout the fog (?) to grow the map — every hex hides something, from supplies to survivors to zombie nests. Landmarks at the edge of town hold raid bosses that need a big, high-level squad but drop legendary gear.")}</h2>
    <p class="room-tagline">Send teams to locations · scout the fog to grow the map · raid the landmarks at the edge of town</p>
    ${renderExplorationMap(state)}
    <div class="mission-chips">${missionChips + raidChip || '<p class="muted">No teams assigned yet — click a location on the map to start a mission, or a "?" to scout.</p>'}</div>
    <button class="btn btn-primary btn-big" data-action="resolve-turn">🧳 Launch Expeditions &amp; Advance to Night</button>
  </div>`;
}

function hexTile(key) {
  return `<div class="hex-tile" style="background-image:${tileBackground(key)}"></div>`;
}

function renderExplorationMap(state) {
  const width = 1.5 * HEX_SIZE * HEX_RADIUS * 2 + HEX_W + 20;
  const height = Math.sqrt(3) * HEX_SIZE * HEX_RADIUS * 2 + HEX_H + 20;
  const toPos = (x, y) => ({ left: x + width / 2 - HEX_W / 2, top: y + height / 2 - HEX_H / 2 });
  // Tooltips open upward and centred, except near an edge where they'd be cut off.
  const tipClass = (pos) =>
    `hex-tooltip ${pos.top < 120 ? "hex-tip-below" : ""} ${pos.left < 70 ? "hex-tip-right" : pos.left > width - 150 ? "hex-tip-left" : ""}`;

  const teamAt = {};
  state.teamLocations.forEach((id, i) => {
    if (id) teamAt[id] = i;
  });
  if (state.raidTarget) teamAt[state.raidTarget] = RAID_TEAM;

  let hexesHtml = renderCampus(width, height);
  let routes = "";

  for (const { q, r } of hexesInRadius(HEX_RADIUS)) {
    const { x, y } = hexCenter(q, r);
    const pos = toPos(x, y);
    const style = `left:${pos.left}px;top:${pos.top}px;`;

    if (!isHexExplored(state, q, r)) {
      const reachable = canScoutHex(state, q, r);
      const danger = reachable && nextToNest(state, q, r);
      hexesHtml += `<div class="hex hex-fog ${reachable ? "hex-fog-reachable" : ""}" ${reachable ? `data-action="open-scout" data-q="${q}" data-r="${r}"` : ""} style="${style}">
        <div class="hex-tile hex-fog-tile"></div>
        ${reachable ? `<span class="hex-fog-icon">?</span>` : ""}
        ${reachable ? `<div class="${tipClass(pos)}"><b>Unexplored</b><p class="muted">Send a scout (${scoutCost(q, r)} stamina) to see what's here.${danger ? " ⚠ Next to a zombie nest — expect trouble." : ""}</p></div>` : ""}
      </div>`;
      continue;
    }

    const loc = locationAt(q, r);
    const lm = landmarkAt(q, r);
    const place = loc || lm;
    const team = place ? teamAt[place.id] : undefined;
    let cls = "hex";
    let action = "";
    let extra = "";
    let tip = "";

    if (loc) {
      cls += " hex-loc hex-poi";
      action = `data-action="open-mission" data-location="${loc.id}"`;
      const rewardsStr = Object.entries(loc.rewards).map(([k, v]) => `${RESOURCE_ICON[k]} ~${v}`).join("  ");
      tip = `<b>${esc(loc.name)}</b>
        <p class="muted">${esc(loc.desc)}</p>
        <div>Difficulty ${loc.difficulty}/5 · Danger ${loc.danger}/5</div>
        <div>${rewardsStr}</div>
        ${loc.serumChance ? `<div>💉 Rare: antiviral serum</div>` : ""}
        ${nextToNest(state, q, r) ? `<div class="plot-warn">⚠ A zombie nest next door makes runs here riskier.</div>` : ""}`;
      extra = `<span class="hex-name">${esc(loc.name)}</span>`;
    } else if (lm) {
      const cooldown = raidCooldownLeft(state, lm.id);
      const boss = raidBoss(state, lm);
      cls += ` hex-loc hex-poi hex-landmark ${cooldown ? "hex-landmark-cleared" : ""}`;
      action = `data-action="open-raid" data-landmark="${lm.id}"`;
      tip = `<b>${esc(lm.name)}</b>
        <p class="muted">${esc(lm.desc)}</p>
        <div>☠ ${esc(boss.name)} — ${boss.hp} HP</div>
        <div>Raid squad: ${lm.minTeam}+ students, Lv${lm.minLevel}+</div>
        <div class="legend-text">🌟 Legendary gear · legendary survivors</div>
        ${cooldown ? `<div class="muted">Cleared — back in ${cooldown} day${cooldown === 1 ? "" : "s"}.</div>` : ""}`;
      extra = `<span class="hex-name">${esc(lm.name)}</span>
        <span class="hex-badge ${cooldown ? "" : "hex-badge-boss"}">${cooldown ? `💤 ${cooldown}d` : "☠ Raid"}</span>`;
    } else {
      const terrain = hexTerrain(q, r);
      if (isNest(state, q, r)) {
        cls += " hex-nest hex-loc";
        action = `data-action="open-nest" data-q="${q}" data-r="${r}"`;
        tip = `<b>Zombie Nest</b><p class="muted">In the ${TERRAIN_NAMES[terrain].toLowerCase()}. Everything next to it is more dangerous until a squad burns it out.</p>`;
        extra = `<span class="hex-badge hex-badge-nest">🧟 Nest</span>`;
      } else {
        cls += " hex-terrain";
        tip = `<b>${TERRAIN_NAMES[terrain]}</b><p class="muted">Scouted.</p>`;
      }
    }

    if (team !== undefined) {
      const color = TEAM_COLORS[team];
      const members = state.characters.filter((c) => c.exploreTeam === team && c.alive);
      cls += " hex-assigned";
      extra += `<div class="hex-team" style="--team:${color}">
        ${members.slice(0, 3).map((c) => `<span class="hex-team-sprite">${characterSprite(c, 16)}</span>`).join("")}
        ${members.length > 3 || !members.length ? `<span class="hex-team-more">${members.length ? `+${members.length - 3}` : "0"}</span>` : ""}
      </div>`;
      // A gently curved, marching dashed route from the school to the team's target.
      const sx = width / 2;
      const sy = height / 2;
      const ex = x + width / 2;
      const ey = y + height / 2;
      const len = Math.hypot(ex - sx, ey - sy) || 1;
      const bend = team % 2 ? 18 : -18;
      const cx = (sx + ex) / 2 + (-(ey - sy) / len) * bend;
      const cy = (sy + ey) / 2 + ((ex - sx) / len) * bend;
      routes += `<path d="M${sx},${sy} Q${cx.toFixed(1)},${cy.toFixed(1)} ${ex},${ey}" stroke="${color}"/>`;
    }

    hexesHtml += `<div class="${cls}" ${action} style="${style}${team !== undefined ? `--team:${TEAM_COLORS[team]};` : ""}">
      ${hexTile(hexTileKey(q, r))}
      ${extra}
      ${tip ? `<div class="${tipClass(pos)}">${tip}</div>` : ""}
    </div>`;
  }

  return `<div class="hexmap-wrap"><div class="hexmap" style="width:${width}px;height:${height}px;">
    <svg class="hex-routes" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${routes}</svg>
    ${hexesHtml}
  </div></div>`;
}

// What a scout turned up — the hex's tile and a line about the find.
export function renderScoutReport(state, report) {
  const { q, r, scoutName, result } = report;
  let title;
  let body;
  if (result.location) {
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
          : c.farmToday || c.scrapyardToday || c.ranchToday
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

export function renderScoutModal(state, q, r) {
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
      <h3>🌫 Unexplored Territory</h3>
      <p class="muted">Every hex hides something — supplies, gear, seeds, animals, survivors, or a zombie nest. The further from the school, the more it costs to get there.</p>
      <div class="mission-stats-row"><span>⚡ ${cost} stamina</span><span class="${danger >= 40 ? "plot-warn" : ""}">🧟 up to ${danger}% chance of a zombie — less for a high-DEX scout</span></div>
      <div class="mini-label">Send a scout</div>
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
      !c.farmToday && !c.scrapyardToday && !c.ranchToday
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
        ${loc.serumChance ? `<span title="${esc(TB_INFO.serum)}">💉 Rare: antiviral serum (${Math.round(loc.serumChance * 100)}%)</span>` : ""}
      </div>
      ${nextToNest(state, loc.hex.q, loc.hex.r) ? `<div class="mission-success mission-bad">⚠ A zombie nest next door: lower odds and more injuries until it's cleared.</div>` : ""}
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

const FACILITY_LABEL = { farm: "Farm", scrapyard: "Scrapyard", ranch: "Ranch" };
const FACILITY_ICON = { farm: "🌾", scrapyard: "🔩", ranch: "🐄" };

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
    <h2>Turn 3 — Night Watch ${infoDot("The horde climbs the grid from the bottom rows, one row per turn. Defenders hit whatever's in reach — melee weapons at 1–2 squares, ranged weapons from 4–9, bare fists only point-blank. Walls block a lane until they're smashed; traps hurt anything that walks over them. A zombie that gets past the top row hits the gate, then breaks into the school.")}</h2>
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
// plain <select> dropdowns (Gym/Cafeteria/Classroom/Research/Crafting/Council/Farm/Scrapyard/
// Ranch). Characters already busy elsewhere still show up (greyed out, sorted to the bottom, no
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
  if (exceptFlag !== "farmToday" && c.farmToday) return "Working the Farm";
  if (exceptFlag !== "scrapyardToday" && c.scrapyardToday) return "Working the Scrapyard";
  if (exceptFlag !== "ranchToday" && c.ranchToday) return "Working the Ranch";
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
          .map((c) => studentRow(c, "gymToday", (c) => (c.stamina <= 0 ? "Exhausted" : null))),
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
          .map((c) => studentRow(c, "infirmaryToday", (c) => (c.hp >= c.maxHp && c.stamina >= c.maxStamina ? "Already fully rested and healed" : null))),
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
    case "scrapyard":
    case "ranch": {
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

// The Gymnasium (PE → max HP) and Acrobatics (Gymnastics → max stamina) work the same way.
function renderTrainingRoom(state, side) {
  const info = GYM_SIDES[side];
  const room = gymRoom(state, side);
  const students = state.characters.filter((c) => c.gymToday === side && c.alive);
  const teachers = gymTeachers(state, side);
  const bar = side === "PE" ? hpBar : staminaBar;
  const trained = (c) => (side === "PE" ? c.trainedHp || 0 : c.trainedStamina || 0);
  return `<div class="room room-${info.roomKey}">
    ${roomScene(info.roomKey, [...teachers, ...students], `${info.room}${levelBadge(state, info.roomKey)}`,
      `Trains ${info.label}, which builds ${info.gains}: every session gives each student here 1 + the combined ${info.label} rank of the teachers posted here (F 0, D 1, C 2, B 3, A 4, S 5), up to +${GYM_MAX_BONUS} ${info.gains} in total. Students also earn ${info.label} grade XP. Up to ${room.studentCapacity} students and ${room.teacherCapacity} teachers; training costs ${STAMINA_COST_GYM} stamina.`,
      roomUpgradeButton(state, info.roomKey))}
    <p class="room-tagline">${info.icon} <b>+${gymGain(state, side)} ${info.gains}</b> a session ${teachers.length ? "(1 + teachers' ranks)" : "— a teacher adds their rank"} · ${STAMINA_COST_GYM} stamina</p>
    <div class="mini-label">Teachers (${teachers.length}/${room.teacherCapacity})</div>
      <ul class="assign-list">
        ${teachers.map((t) => `<li><span class="assign-who">${nameTag(t)} — ${side} ${gradeLetter(t.grades[side])} <span class="muted">(+${teacherRank(t, side)})</span></span><button class="btn-x" data-action="clear-post" data-id="${t.id}">✕</button></li>`).join("") || '<li class="muted">none</li>'}
      </ul>
      ${teachers.length < room.teacherCapacity ? `<button class="btn btn-sm" data-action="open-picker" data-kind="gym-teacher" data-post="${side}">+ Assign teacher…</button>` : ""}
      <div class="mini-label">Training today (${students.length}/${room.studentCapacity})</div>
      <ul class="assign-list">
        ${students.map((s) => `<li><span class="assign-who">${nameTag(s)} <span class="muted">+${trained(s)}/${GYM_MAX_BONUS}</span></span>${bar(s)}<button class="btn-x" data-action="remove-gym" data-id="${s.id}">✕</button></li>`).join("") || '<li class="muted">none</li>'}
      </ul>
      ${students.length < room.studentCapacity ? `<button class="btn btn-sm" data-action="open-picker" data-kind="gym-student" data-post="${side}">+ Send student…</button>` : ""}
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
  const nurseBonus = Math.round(infirmaryNurseBonus(state) * 100);

  const pantryGroup = (source, label, tip) => {
    const items = Object.entries(INGREDIENTS)
      .filter(([, ing]) => ing.source === source)
      .map(([id, ing]) => `<span class="pantry-item ${state.pantry[id] ? "" : "pantry-empty"}" title="${ing.name}">${ing.icon} ${state.pantry[id] || 0}</span>`)
      .join("");
    return `<div class="pantry-group" title="${tip}"><span class="pantry-label">${label}</span>${items}</div>`;
  };
  const pantry =
    pantryGroup("farm", "Farm", "Staple crops — grown in the Farm's plots in Turn 2.") +
    pantryGroup("ranch", "Ranch", "Eggs, milk and mutton — from the animals in the Ranch's pens in Turn 2.") +
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

  return `
  <div class="card">
    <h2>Floor 1 — Lobby</h2>
    <div class="floor-grid floor1-grid">
      ${renderTrainingRoom(state, "PE")}
      ${renderTrainingRoom(state, "Gymnastics")}
      <div class="room room-cafeteria">
        ${roomScene("cafeteria", cooks, `Cafeteria${levelBadge(state, "cafeteria")}`,
          `Up to ${cafeRoom.teacherCapacity} teachers (cooks). Each cook can serve one dish a day — its buff covers the whole school until tonight — stretches the rations (+${CAFETERIA_RATIONS_BY_LEVEL[roomLevel(state, "cafeteria") - 1]} food a day between them).`,
          roomUpgradeButton(state, "cafeteria"))}
        <p class="room-tagline">Each cook serves one buff dish a day</p>
        <div class="mini-label">Cooks (${cooks.length}/${cafeRoom.teacherCapacity})</div>
        <ul class="assign-list">
          ${cooks.map((t) => `<li><span class="assign-who">${nameTag(t)} — Biology ${gradeLetter(t.grades.Biology)}</span><button class="btn-x" data-action="clear-post" data-id="${t.id}">✕</button></li>`).join("") || '<li class="muted">none — assign a cook to start serving dishes</li>'}
        </ul>
        ${cooks.length < cafeRoom.teacherCapacity ? `<button class="btn btn-sm" data-action="open-picker" data-kind="cafeteria-teacher">+ Assign cook…</button>` : ""}
        <div class="mini-label">Today's menu (${state.dishesToday.length}/${dishCapacity(state)} dish${dishCapacity(state) === 1 ? "" : "es"} served)</div>
        <div class="pantry">${pantry}</div>
        <div class="dish-list">${menu}</div>
      </div>
      <div class="room room-infirmary">
        ${roomScene("infirmary", [...nurses, ...infected, ...patients], `Nurse's Office${levelBadge(state, "infirmary")}`,
          `Up to ${infRoom.studentCapacity} patients/day, each either healed or resting. 💊 Heal: ${Math.round(infirmaryHealShare(state) * 100)}% of max HP${nurses.length ? ` +${nurseBonus}% from the nurses' Biology` : " (each nurse's Biology adds up to 25% more)"} for ${INFIRMARY_MEDICINE_PER_PATIENT} medicine — with none to spare only bed rest (10%). 😴 Rest: +${infirmaryRest(state)} stamina, free. Upgrading the room raises both. The infected are quarantined here too — each takes a bed until they're cured with antiviral serum. Everyone also gets a little stamina and HP back on nights the school is fed.`,
          roomUpgradeButton(state, "infirmary"))}
        <p class="room-tagline">💊 Heal <b>${Math.round(infirmaryHealShare(state) * 100) + nurseBonus}% HP</b> for ${INFIRMARY_MEDICINE_PER_PATIENT} medicine · 😴 Rest <b>+${infirmaryRest(state)} stamina</b></p>
        <div class="mini-label">Nurses (${nurses.length}/${infRoom.teacherCapacity})</div>
        <ul class="assign-list">
          ${nurses.map((t) => `<li>${nameTag(t)} — Biology ${gradeLetter(t.grades.Biology)} <button class="btn-x" data-action="clear-post" data-id="${t.id}">✕</button></li>`).join("") || '<li class="muted">none</li>'}
        </ul>
        ${nurses.length < infRoom.teacherCapacity ? `<button class="btn btn-sm" data-action="open-picker" data-kind="infirmary-teacher">+ Assign nurse…</button>` : ""}
        ${infected.length ? `<div class="mini-label quarantine-label">🦠 Quarantine (${infected.length}) · 💉 ${state.resources.serum} serum</div>
        <ul class="assign-list">
          ${infected.map((c) => `<li><span class="assign-who">${nameTag(c)} ${infectionTag(state, c)}</span><button class="btn btn-sm btn-cure" data-action="cure-infection" data-id="${c.id}" ${state.resources.serum ? "" : "disabled"} title="${state.resources.serum ? "Use 1 antiviral serum" : "No antiviral serum — find it at medical locations or on raids"}">💉 Cure</button></li>`).join("")}
        </ul>` : ""}
        <div class="mini-label">Patients today (${patients.length}/${patients.length + Math.max(0, bedsFree)}${infected.length ? ` · ${infected.length} bed${infected.length === 1 ? "" : "s"} in quarantine` : ""})</div>
        <ul class="assign-list">
          ${patients.map((s) => {
            const mode = s.infirmaryToday === "rest" ? "rest" : "heal";
            return `<li><span class="assign-who">${nameTag(s)}
              <span class="treat-toggle">
                <button class="treat-btn ${mode === "heal" ? "treat-on" : ""}" data-action="set-treatment" data-id="${s.id}" data-mode="heal" title="Heal HP for ${INFIRMARY_MEDICINE_PER_PATIENT} medicine">💊 Heal</button>
                <button class="treat-btn ${mode === "rest" ? "treat-on" : ""}" data-action="set-treatment" data-id="${s.id}" data-mode="rest" title="Rest for stamina">😴 Rest</button>
              </span></span>${mode === "rest" ? staminaBar(s) : hpBar(s)}<button class="btn-x" data-action="remove-infirmary" data-id="${s.id}">✕</button></li>`;
          }).join("") || '<li class="muted">none</li>'}
        </ul>
        ${bedsFree > 0 ? `<button class="btn btn-sm" data-action="open-picker" data-kind="infirmary-student">+ Admit patient…</button>` : ""}
      </div>
    </div>
  </div>`;
}

// ---------- floor 2 ----------

export function renderFloor2(state) {
  const rooms = CLASSROOM_IDS.map((roomId) => renderClassroom(state, roomId)).join("");
  return `<div class="card"><h2>Floor 2 — Classrooms &amp; Dorms ${infoDot(
    `Students live and sleep in their assigned classroom. Each room is unassigned ("Classroom N") until a teacher is posted there, then it takes on whichever subject that teacher is best qualified to teach — and reverts to unassigned if it goes unstaffed, so rooms can be freely repurposed. Deskmates who fight together bond — opposite-gender deskmates may become a couple at bond ${BOND_COUPLE_THRESHOLD}+.`
  )}</h2>
  <p class="room-tagline">The teacher posted in a room picks its subject · deskmates bond</p>
  <div class="floor2-grid">${rooms}</div></div>`;
}

function renderClassroom(state, roomId) {
  const room = state.rooms.classrooms[roomId];
  const subject = room.subject; // null until a teacher claims this room
  const post = `classroom:${roomId}`;
  if (isBoarded(state, post)) return renderBoardedRoom(state, post, "classroom_empty", "room-classroom");
  const teachers = state.characters.filter((c) => c.role === "teacher" && c.post === post && c.alive);

  const rowCount = room.seats.length / 6;
  let seatsHtml = "";
  for (let row = 0; row < rowCount; row++) {
    let rowHtml = `<div class="seat-row">`;
    for (let desk = 0; desk < 3; desk++) {
      rowHtml += `<div class="desk">`;
      for (let slot = 0; slot < 2; slot++) {
        const idx = row * 6 + desk * 2 + slot;
        const occupantId = room.seats[idx];
        if (occupantId) {
          const occ = getChar(state, occupantId);
          const partner = deskPartner(state, occupantId);
          const bond = partner ? occ.bonds[partner.id] || 0 : 0;
          const couple = occ.coupleId && partner && occ.coupleId === partner.id;
          rowHtml += `<div class="seat seat-occ ${couple ? "seat-couple" : ""}" title="${esc(occ.name)} — bond ${bond}">
            <span class="seat-name" data-action="open-card" data-id="${occ.id}">${occ.gender === "F" ? "👧" : "👦"} ${esc(occ.name.split(" ")[0])}</span>
            <button class="btn-x" data-action="unseat" data-id="${occ.id}">✕</button>
          </div>`;
        } else {
          rowHtml += `<div class="seat seat-empty">
            <button class="btn-seat-assign" data-action="open-picker" data-kind="classroom-seat" data-room="${roomId}" data-seat="${idx}">+ empty</button>
          </div>`;
        }
      }
      rowHtml += `</div>`;
    }
    rowHtml += `</div>`;
    seatsHtml += rowHtml;
  }

  const count = room.seats.filter(Boolean).length;

  return `
  <div class="room room-classroom">
    ${roomScene(
      subject ? `classroom_${subject}` : "classroom_empty",
      [...teachers, ...room.seats.filter(Boolean).map((id) => getChar(state, id)).filter((c) => c && c.alive)],
      `${subject ? SUBJECT_LABEL[subject] : `Classroom ${roomId}`}${levelBadge(state, post)} <span class="plaque-sub">${count}/${room.seats.length}</span>`,
      subject ? "" : "Unassigned — the one teacher posted here decides the subject.",
      roomUpgradeButton(state, post)
    )}
    <div class="mini-label">Teachers (${teachers.length}/${room.teacherCapacity}) — each gives every student a grade boost</div>
    <ul class="assign-list">
      ${teachers.map((t) => `<li><span class="assign-who">${nameTag(t)} — ${teachBonusLabel(t.grades[subject])}</span><button class="btn-x" data-action="clear-post" data-id="${t.id}">✕</button></li>`).join("") || '<li class="muted">none</li>'}
    </ul>
    ${teachers.length < room.teacherCapacity ? `<button class="btn btn-sm" data-action="open-picker" data-kind="classroom-teacher" data-room="${roomId}">+ Assign teacher…</button>` : ""}
    <div class="mini-label">Seating (${rowCount} rows × 3 desks)</div>
    <div class="seat-grid">${seatsHtml}</div>
  </div>`;
}

// ---------- floor 3 ----------

export function renderFloor3(state) {
  const students = state.characters.filter((c) => c.role === "student" && c.alive).sort((a, b) => overallLevel(b) - overallLevel(a));
  const atTeacherCap = teacherCount(state) >= MAX_TEACHERS;
  const promoteRows = students
    .map((s) => {
      const lvl = overallLevel(s);
      const eligible = lvl >= PROMOTE_LEVEL_THRESHOLD && !atTeacherCap;
      const reason = atTeacherCap ? `Already at the ${MAX_TEACHERS}-teacher cap` : `Needs level ${PROMOTE_LEVEL_THRESHOLD}+`;
      return `<tr>
        <td>${nameTag(s)}</td>
        <td>Lv${lvl}</td>
        <td>${statChips(s)}</td>
        <td>
          <button class="btn btn-sm" data-action="promote" data-id="${s.id}" ${eligible ? "" : "disabled"} title="${eligible ? "Promote to teacher" : reason}">🎓 Promote</button>
          <button class="btn btn-sm btn-danger" data-action="expel" data-id="${s.id}">🚪 Expel</button>
        </td>
      </tr>`;
    })
    .join("");

  const recruits = state.recruitPool
    .map((r, i) => {
      const blocked = r.role === "teacher" && atTeacherCap;
      return `<div class="subcard recruit-card">
      <b class="unit-link" data-action="open-card" data-id="${r.id}">${r.legendary ? "✨ " : ""}${r.gender === "F" ? "👧" : "👦"} ${esc(r.name)}</b> — ${r.role}${r.role === "teacher" ? ` (teaches ${SUBJECT_LABEL[r.teachSubject]})` : ""}
      ${statChips(r)}
      ${blocked ? `<p class="muted">No room — already at the ${MAX_TEACHERS}-teacher cap.</p>` : ""}
      <div class="row-actions">
        <button class="btn btn-sm btn-primary" data-action="accept-recruit" data-index="${i}" ${blocked ? "disabled" : ""}>✅ Accept</button>
        <button class="btn btn-sm btn-danger" data-action="reject-recruit" data-index="${i}">❌ Turn away</button>
      </div>
    </div>`;
    })
    .join("");

  const researchers = state.characters.filter((c) => c.role === "teacher" && c.post === "research" && c.alive);
  const researchSlots = state.rooms.research.teacherCapacity;
  const utilityRoom = (scene, title, desc, postKey, statLabel, statKey) => {
    if (isBoarded(state, postKey)) return renderBoardedRoom(state, postKey, scene, "room-utility");
    const staff = state.characters.filter((c) => c.role === "teacher" && c.post === postKey && c.alive);
    const slots = state.rooms[postKey].teacherCapacity;
    return `<div class="room room-utility">
      ${roomScene(scene, staff, `${title}${levelBadge(state, postKey)}`, "", roomUpgradeButton(state, postKey))}
      <p class="room-tagline">${desc}</p>
      <div class="mini-label">Assigned (${staff.length}/${slots})</div>
      <ul class="assign-list">
        ${staff.map((t) => `<li>${nameTag(t)} — ${statLabel} ${gradeLetter(t.grades[statKey])} <button class="btn-x" data-action="clear-post" data-id="${t.id}">✕</button></li>`).join("") || '<li class="muted">none</li>'}
      </ul>
      ${staff.length < slots ? `<button class="btn btn-sm" data-action="open-picker" data-kind="utility" data-post="${postKey}">+ Assign teacher…</button>` : ""}
    </div>`;
  };

  return `
  <div class="card">
    <h2>Floor 3 — Headmaster's Office &amp; Special Rooms</h2>
    <div class="subcard">
      <h3>🧑‍💼 Headmaster's Office ${infoDot(`Promote high-achieving students (Level ${PROMOTE_LEVEL_THRESHOLD}+) to teachers, or expel anyone. The school has room for ${MAX_TEACHERS} teachers at most.`)}</h3>
      <p class="room-tagline">Promote Level ${PROMOTE_LEVEL_THRESHOLD}+ students · teachers ${teacherCount(state)}/${MAX_TEACHERS}</p>
      <div class="table-wrap">
        <table class="roster-table">
          <thead><tr><th>Name</th><th>Level</th><th>Stats</th><th>Actions</th></tr></thead>
          <tbody>${promoteRows || '<tr><td colspan="4" class="muted">No students.</td></tr>'}</tbody>
        </table>
      </div>
    </div>
    <div class="subcard">
      <h3>🙋 Pending Recruits</h3>
      ${recruits ? `<div class="recruit-list">${recruits}</div>` : '<p class="muted">No one is waiting to join right now. Explore the city or staff the Student Council room to find survivors.</p>'}
    </div>
    <div class="floor3-grid">
      ${isBoarded(state, "research") ? renderBoardedRoom(state, "research", "research", "room-utility") : `<div class="room room-utility">
        ${roomScene("research", researchers, `Research Room${levelBadge(state, "research")}`,
          `Produces research points each day: 1 per ${RESEARCH_ROOM_INT_PER_POINT} INT (Physics grade) across every teacher posted here, plus the room's level bonus.`,
          roomUpgradeButton(state, "research"))}
        <p class="room-tagline">Producing <b>${researchRoomYield(state)} research/day</b> from the team's INT</p>
        <div class="mini-label">Researchers (${researchers.length}/${researchSlots})</div>
        <ul class="assign-list">
          ${researchers.map((t) => `<li>${nameTag(t)} — INT ${t.grades.Physics} (${gradeLetter(t.grades.Physics)}) <button class="btn-x" data-action="clear-post" data-id="${t.id}">✕</button></li>`).join("") || '<li class="muted">none</li>'}
        </ul>
        ${researchers.length < researchSlots ? `<button class="btn btn-sm" data-action="open-picker" data-kind="utility" data-post="research">+ Assign teacher…</button>` : ""}
      </div>`}
      ${utilityRoom("crafting", "Crafting Room", "Turns scrap into permanent Fortification · scales with DEX", "crafting", "DEX", "Gymnastics")}
      ${utilityRoom("council", "Student Council", "Daily chance a survivor asks to join · scales with CHA", "council", "CHA", "SocialStudies")}
    </div>
  </div>`;
}

// ---------- outside facilities (Turn 2) ----------

function renderOutsideFacility(state, roomKey, flagKey, title, tagline, desc, extra = "") {
  const room = state.rooms[roomKey];
  const workers = state.characters.filter((c) => c[flagKey] && c.alive);

  return `
  <div class="card room-outside">
    ${roomScene(roomKey, workers, `${title}${levelBadge(state, roomKey)}`, desc, roomUpgradeButton(state, roomKey))}
    <p class="room-tagline">${tagline}</p>
    <div class="mini-label">Working today (${workers.length}/${room.studentCapacity})</div>
    <ul class="assign-list">
      ${workers.map((s) => `<li>${nameTag(s)} ${statusTag(s)} <button class="btn-x" data-action="remove-${roomKey}" data-id="${s.id}">✕</button></li>`).join("") || '<li class="muted">none</li>'}
    </ul>
    ${workers.length < room.studentCapacity ? `<button class="btn btn-sm" data-action="open-picker" data-kind="${roomKey}">+ Assign student…</button>` : ""}
    ${extra}
  </div>`;
}

const PLOT_WORDS = {
  farm: { plot: "plot", plots: "Plots", stock: "Seed shed", choose: "Plant a crop", verb: "Plant", have: "seeds", done: "at harvest" },
  ranch: { plot: "pen", plots: "Pens", stock: "Barn", choose: "Bring in an animal", verb: "Bring in", have: "in the barn", done: "at butchering" },
};

// What a crop/animal makes, e.g. "4 🥔 after 3 days" or "1 🥚 every day".
function producerYieldText(p) {
  const product = INGREDIENTS[p.product];
  const days = p.growDays === 1 ? "day" : `${p.growDays} days`;
  return p.perennial ? `${p.yield} ${product.icon} ${product.name.toLowerCase()} every ${days}` : `${p.yield} ${product.icon} ${product.name.toLowerCase()} after ${days}`;
}

function renderPlotTile(state, facility, plot, index, tended) {
  const words = PLOT_WORDS[facility];
  const open = `data-action="open-plot" data-facility="${facility}" data-index="${index}"`;
  if (!plot.id) {
    return `<button class="plot plot-empty" ${open}>
      <div class="plot-icon">+</div>
      <div class="plot-body"><b>${words.choose}</b><span class="muted">Empty ${words.plot}</span></div>
    </button>`;
  }
  const p = PRODUCERS[plot.id];
  const product = INGREDIENTS[p.product];
  const pct = Math.round((plot.growth / p.growDays) * 100);
  const line = p.perennial
    ? `${p.yield} ${product.icon} every ${p.growDays === 1 ? "day" : `${p.growDays} days`}`
    : `Day ${plot.growth}/${p.growDays} · ${p.yield} ${product.icon} ${words.done}`;
  return `<button class="plot ${tended ? "plot-tended" : "plot-idle"}" ${open}>
    <div class="plot-icon">${p.icon}</div>
    <div class="plot-body">
      <b>${p.name}</b>
      ${p.growDays > 1 ? `<div class="plot-bar"><div style="width:${pct}%"></div></div>` : ""}
      <span>${line}</span>
      ${tended ? "" : `<span class="plot-warn">Not tended today</span>`}
    </div>
  </button>`;
}

const PLOT_INFO = {
  farm: `Each farm worker tends ${PLOTS_PER_WORKER} plots a day, and only tended plots grow. Click an empty plot to plant one of your seeds. A harvest goes to the Cafeteria's pantry and has a 50% chance to save a seed; the plot replants itself while you have seeds of that crop. Seeds turn up on expeditions — the Abandoned Farmstead, Suburban Neighborhood and Hardware Store are best — and in random events.`,
  ranch: `Each ranch worker tends ${PLOTS_PER_WORKER} pens a day, and animals only produce on tended days. Chickens lay eggs and dairy cows give milk for as long as you keep them. Sheep are raised for meat: after 4 tended days they're butchered for mutton, with a 50% chance a lamb was born to raise next. Animals are found on expeditions (the Abandoned Farmstead has all three; backyard chickens turn up in the Suburban Neighborhood) and in random events.`,
};

function renderPlots(state, facility) {
  const words = PLOT_WORDS[facility];
  const workers = facilityWorkers(state, facility);
  const tended = new Set(tendedPlots(state, facility, workers));
  const list = state.plots[facility];
  const occupied = list.filter((plot) => plot.id).length;
  const stock = Object.entries(PRODUCERS)
    .filter(([, p]) => p.facility === facility)
    .map(([id, p]) => {
      const n = state.stock[id] || 0;
      return `<span class="pantry-item ${n ? "" : "pantry-empty"}" title="${n === 1 ? p.stockName : p.stockPlural}">${p.stockIcon}${facility === "farm" ? p.icon : ""} ${n}</span>`;
    })
    .join("");
  return `
    <div class="mini-label">${words.stock}</div>
    <div class="pantry"><div class="pantry-group">${stock}</div></div>
    <div class="mini-label">${words.plots} (${list.length}) · tending ${Math.min(occupied, workers * PLOTS_PER_WORKER)} of ${occupied} ${infoDot(PLOT_INFO[facility])}</div>
    <div class="plot-grid">${list.map((plot, i) => renderPlotTile(state, facility, plot, i, tended.has(i))).join("")}</div>`;
}

// Clicking a plot: an empty one asks what to plant (only what's in stock can be chosen); an
// occupied one shows how it's doing, with the option to dig it up / move the animal out.
export function renderPlotModal(state, facility, index) {
  const words = PLOT_WORDS[facility];
  const plot = state.plots[facility][index];
  let body;
  if (!plot.id) {
    const rows = Object.entries(PRODUCERS)
      .filter(([, p]) => p.facility === facility)
      .map(([id, p]) => {
        const n = state.stock[id] || 0;
        return `<div class="plot-choice ${n ? "" : "plot-choice-off"}">
          <div class="plot-icon">${p.icon}</div>
          <div class="plot-body"><b>${p.name}</b><span class="muted">${producerYieldText(p)}</span></div>
          <div class="plot-choice-side">
            <span class="plot-stock">${p.stockIcon} ${n} ${words.have}</span>
            <button class="btn btn-sm btn-primary" data-action="plant-plot" data-id="${id}" ${n ? "" : "disabled"}>${words.verb}</button>
          </div>
        </div>`;
      })
      .join("");
    body = `<h3>${words.choose}</h3>
      <p class="muted">${facility === "farm" ? "Planting uses one of your seeds." : "Pick an animal from the barn."} Find more on expeditions.</p>
      <div class="plot-choices">${rows}</div>`;
  } else {
    const p = PRODUCERS[plot.id];
    const tended = tendedPlots(state, facility).includes(index);
    const progress = p.perennial
      ? `Produces ${producerYieldText(p)}.`
      : `Day ${plot.growth} of ${p.growDays} — then ${producerYieldText(p).replace(/ after .*/, "")} ${words.done}.`;
    body = `<h3>${p.icon} ${p.name}</h3>
      <p>${progress}</p>
      <p class="${tended ? "muted" : "plot-warn"}">${tended ? "Being tended today." : `Not tended today — assign more ${facility} workers (each tends ${PLOTS_PER_WORKER}).`}</p>
      <button class="btn btn-sm btn-danger" data-action="clear-plot">${facility === "farm" ? "Dig up (the seed is lost)" : "Move back to the barn"}</button>`;
  }
  return `<div class="modal-overlay" data-action="close-plot">
    <div class="char-card mission-card plot-modal" data-action="noop">
      <button class="cc-close" data-action="close-plot" title="Close">✕</button>
      ${body}
    </div>
  </div>`;
}

export function renderFarm(state) {
  return renderOutsideFacility(
    state, "farm", "farmToday", "Farm", `Each worker grows <b>${FARM_YIELD_FOOD} food</b> and tends <b>${PLOTS_PER_WORKER} plots</b>`,
    `Assign students to farm instead of sending them out to explore today. Each worker yields ${FARM_YIELD_FOOD} food when the day ends and tends ${PLOTS_PER_WORKER} of the plots below, where the Cafeteria's staple crops grow.`,
    renderPlots(state, "farm")
  );
}

export function renderRanch(state) {
  return renderOutsideFacility(
    state, "ranch", "ranchToday", "Ranch", `Each worker raises <b>${RANCH_YIELD_FOOD} food</b> and tends <b>${PLOTS_PER_WORKER} pens</b>`,
    `Assign students to the ranch instead of sending them out to explore today. Each worker yields ${RANCH_YIELD_FOOD} food when the day ends and tends ${PLOTS_PER_WORKER} of the pens below, where chickens, cows and sheep give the Cafeteria eggs, milk and mutton.`,
    renderPlots(state, "ranch")
  );
}

export function renderScrapyard(state) {
  return renderOutsideFacility(
    state, "scrapyard", "scrapyardToday", "Scrapyard", `Each worker salvages <b>${SCRAPYARD_YIELD_MATERIALS} scrap</b> by the end of the day`,
    `Assign students to strip nearby wrecks for parts instead of exploring today. Each worker yields ${SCRAPYARD_YIELD_MATERIALS} scrap when the day ends.`
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
    <h2>🛡 Entrance Defenses ${infoDot("Click an empty middle-row cell to build, or a top-row cell to post a defender. Smashed walls are gone for good; damaged ones get patched up by morning. Fortification makes the gate sturdier.")}</h2>
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

// ---------- rescue plan ----------

export function renderRescue(state) {
  const r = state.rescue;
  if (!r) return renderComingSoon("📡", "Rescue", "Keep the radio on — maybe someone out there is still broadcasting.");
  if (r.evacuated) {
    return renderComingSoon("🚁", "Rescue", "The evacuation has come and gone. Whoever stayed behind is on their own now.");
  }

  const daysLeft = r.day - state.day;
  const next = r.stagesDone;
  const costLabel = (cost) => Object.entries(cost).map(([res, amt]) => `${TECH_EFFECT_ICON[res]} ${amt}`).join("  ");
  const stages = ANTENNA_STAGES.map((stage, i) => {
    const affordable = Object.entries(stage.cost).every(([res, amt]) => (state.resources[res] || 0) >= amt);
    const action =
      i < next
        ? `<span class="tag tag-ok">✓ Done</span>`
        : i === next
        ? `<button class="btn btn-sm btn-primary" data-action="repair-antenna" ${affordable ? "" : "disabled"}>🔧 Repair (${costLabel(stage.cost)})</button>`
        : `<span class="tag tag-injured">🔒 ${costLabel(stage.cost)}</span>`;
    return `<div class="subcard tech-node ${i < next ? "tech-owned" : ""}">
      <div class="tech-node-main">
        <div><span class="tech-icon">${stage.icon}</span> <b>${i + 1}. ${esc(stage.name)}</b></div>
        ${action}
      </div>
    </div>`;
  }).join("");

  return `
  <div class="card">
    <h2>📡 Rescue Plan</h2>
    <p class="muted">A military evacuation sweeps the city on <b>day ${r.day}</b> — ${
      daysLeft > 0 ? `${daysLeft} day${daysLeft === 1 ? "" : "s"} from now` : "today"
    }. They'll only find survivors who can signal them, so the rooftop antenna has to be fully repaired by then.
    If it isn't, the helicopters leave and try again 5 days later — and the horde doesn't wait. When they land you can
    evacuate, or send them away and hold out longer: your score is the last day the school stands.</p>
    <div class="rescue-progress"><span style="width:${Math.round((next / ANTENNA_STAGES.length) * 100)}%"></span></div>
    <div class="summary-list">
      <div>Antenna: <b>${next}/${ANTENNA_STAGES.length}</b> ${antennaReady(state) ? "— on the air! Just hold out until the helicopters arrive." : "repairs done"}</div>
    </div>
    <div class="rescue-stages">${stages}</div>
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
    <h2>📖 Item List ${infoDot("Common gear is brought back by expeditions — harder locations turn up better gear, and the Hardware Store and Police Station lean toward weapons. The rare ✨ legendary items are carried by legendary survivors.")}</h2>
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

export function renderRoster(state, filter = "all", sortKey = "name", sortDir = "asc") {
  const showDead = window.__showDead;
  const fields = ROSTER_SORT_FIELDS;
  const effectiveSortKey = fields.some((f) => f.key === sortKey) ? sortKey : "name";
  const list = state.characters
    .filter((c) => (showDead || c.alive) && (filter === "all" || c.role === filter))
    .sort((a, b) => {
      const va = rosterSortValue(a, effectiveSortKey);
      const vb = rosterSortValue(b, effectiveSortKey);
      const cmp = typeof va === "string" ? va.localeCompare(vb) : va - vb;
      return sortDir === "asc" ? cmp : -cmp;
    });
  const rows = list
    .map((c) => {
      const loc =
        c.role === "teacher"
          ? c.post
            ? c.post.startsWith("classroom:")
              ? roomDisplayName(state, c.post.split(":")[1])
              : c.post
            : "unassigned"
          : c.seat
          ? roomDisplayName(state, c.seat.room)
          : "unassigned";
      return `<tr class="${c.alive ? "" : "row-dead"}">
        <td>${rosterNameTag(c)}</td>
        <td>${c.role}</td>
        <td>${c.gender}</td>
        <td>${c.role === "teacher" ? `🌟 ${SUBJECT_LABEL[c.teachSubject]}` : `Lv${overallLevel(c)}`}</td>
        <td>${c.role === "teacher" ? '<span class="muted">—</span>' : hpBar(c)}</td>
        <td>${c.role === "teacher" ? '<span class="muted">—</span>' : staminaBar(c)}</td>
        <td>${statusTag(c, state)}</td>
        <td>${esc(loc)}</td>
        <td>${statChips(c)}</td>
      </tr>`;
    })
    .join("");

  const filterTabs = [
    ["all", "All"],
    ["student", "🧳 Students"],
    ["teacher", "🎓 Teachers"],
  ];
  const filterBar = `<div class="subtabs">${filterTabs
    .map(([id, label]) => `<button class="subtab-btn ${filter === id ? "active" : ""}" data-action="set-roster-filter" data-filter="${id}">${label}</button>`)
    .join("")}</div>`;

  const sortOptions = fields.map((f) => `<option value="${f.key}" ${f.key === effectiveSortKey ? "selected" : ""}>${f.label}</option>`).join("");

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
    ${filterBar}
    <div class="picker-sort-row">
      <span class="mini-label">Sort by</span>
      <select data-action="set-roster-sort">${sortOptions}</select>
      <button class="btn btn-sm" data-action="toggle-roster-sort-dir" title="Toggle ascending/descending">${sortDir === "asc" ? "⬆ Ascending" : "⬇ Descending"}</button>
    </div>
    <label class="check-row"><input type="checkbox" data-action="toggle-show-dead" ${showDead ? "checked" : ""}/> Show deceased</label>
    <div class="table-wrap">
      <table class="roster-table">
        <thead><tr><th>Name</th><th>Role</th><th>Sex</th><th>Level / Teaches</th><th>HP</th><th>Stamina</th><th>Status</th><th>Assignment</th><th>Stats</th></tr></thead>
        <tbody>${rows || '<tr><td colspan="9" class="muted">Nobody here.</td></tr>'}</tbody>
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
  if (/joined|couple|survivor|wants to join/.test(m)) return "log-social";
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
    const classBonus = classroomTeachingBonus(state, c, s);
    const total = val + gearBonus + classBonus;
    const hasBonus = gearBonus + classBonus > 0;
    const isBest = val === bestGrade;
    const bonusParts = [];
    if (gearBonus) bonusParts.push(`+${gearBonus} from equipped gear`);
    if (classBonus) bonusParts.push(`+${classBonus} from classroom teacher`);
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
    bonus from equipped gear or a classroom teacher — hover it to see the breakdown. Hover a subject to see what its stat does. The 🌟 marks their strongest stat.</p>`;
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
      <span class="gr-teacher-bonus">Class bonus: <b>+${teachingBonus(val)}</b></span>
    </div>`;
  }).join("");
  return `<div class="cc-section-label">Grades &amp; Teaching Bonus</div><div class="grade-list">${gradeRows}</div>
    <p class="muted cc-grade-note">🌟 = their specialty (always S rank). Assign them to a Floor 2 classroom to give every
    seated student a standing bonus to that subject, or to the Gymnasium / Acrobatics to speed up PE / Gymnastics training.</p>`;
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

function renderSocialTab(state, c) {
  let teacherSection = "";
  if (c.role === "student" && c.seat) {
    const roomId = c.seat.room;
    const teachers = state.characters.filter((t) => t.role === "teacher" && t.post === `classroom:${roomId}` && t.alive);
    teacherSection = `<div class="social-section">
      <div class="cc-section-label">Homeroom Teacher — ${roomDisplayName(state, roomId)}</div>
      ${teachers.length ? teachers.map((t) => `<div class="social-row">${nameTag(t)}</div>`).join("") : '<p class="muted">No teacher currently assigned to this classroom.</p>'}
    </div>`;
  } else if (c.role === "teacher" && c.post && c.post.startsWith("classroom:")) {
    const roomId = c.post.split(":")[1];
    const studentCount = state.rooms.classrooms[roomId].seats.filter(Boolean).length;
    teacherSection = `<div class="social-section">
      <div class="cc-section-label">Teaching — ${roomDisplayName(state, roomId)}</div>
      <p class="muted">${studentCount} student(s) in this classroom.</p>
    </div>`;
  }

  let loveSection = "";
  if (c.coupleId) {
    const partner = getChar(state, c.coupleId);
    if (partner) {
      loveSection = `<div class="social-section">
        <div class="cc-section-label">💞 Love Interest</div>
        <div class="social-row">${nameTag(partner)}</div>
      </div>`;
    }
  }

  const friendEntries = Object.entries(c.bonds || {})
    .filter(([id, bond]) => bond > 0 && id !== c.coupleId)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([id, bond]) => ({ char: getChar(state, id), bond }))
    .filter((e) => e.char && e.char.alive);

  const friendsSection = `<div class="social-section">
    <div class="cc-section-label">Friends</div>
    ${friendEntries.length ? friendEntries.map((e) => `<div class="social-row">${nameTag(e.char)} <span class="muted">bond ${e.bond}</span></div>`).join("") : '<p class="muted">No close bonds yet — team them up on expeditions or defense.</p>'}
  </div>`;

  return `${teacherSection}${loveSection}${friendsSection}`;
}

export function renderCharacterCard(state, c, cardTab = "stats") {
  const sprite = characterSprite(c, 150);
  const isTeacher = c.role === "teacher";
  const points = availableSkillPoints(c);

  const traitBadges = (c.traits || [])
    .map((tid) => TRAITS.find((t) => t.id === tid))
    .filter(Boolean)
    .map((t) => `<span class="trait-pill" title="${esc(t.desc)}">${t.icon} ${esc(t.name)}</span>`)
    .join("");

  // Teachers don't train, equip gear for combat, or level up — they only have grades/bonuses
  // and relationships, so their card drops the Inventory and Skills tabs entirely.
  const TABS = isTeacher
    ? [["stats", "📊 Stats"], ["social", "👥 Social"]]
    : [["stats", "📊 Stats"], ["inventory", "🧳 Inventory"], ["skills", "🌳 Skills"], ["social", "👥 Social"]];
  const tabBar = `<div class="cc-tabs">${TABS.map(
    ([id, label]) => `<button class="cc-tab-btn ${cardTab === id ? "active" : ""}" data-action="set-card-tab" data-tab="${id}">${label}</button>`
  ).join("")}</div>`;

  let body;
  if (cardTab === "inventory" && !isTeacher) body = renderInventoryTab(state, c);
  else if (cardTab === "skills" && !isTeacher) body = renderSkillsTab(c);
  else if (cardTab === "social") body = renderSocialTab(state, c);
  else body = renderStatsTab(state, c);

  const topStatFirst = isTeacher
    ? `<div class="cc-stat-box"><span class="cc-label">Teaches</span><span class="cc-value">🌟 ${SUBJECT_LABEL[c.teachSubject]}</span></div>`
    : `<div class="cc-stat-box"><span class="cc-label">Level</span><span class="cc-value">${overallLevel(c)}</span></div>`;

  return `
  <div class="modal-overlay" data-action="close-card">
    <div class="char-card" data-action="noop">
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
        ${c.coupleId ? `<div class="cc-couple">💞 In a relationship</div>` : ""}
        ${!isTeacher ? `<div class="cc-skillpoints ${points > 0 ? "has-points" : ""}" title="Earned 1 per level, spent on the Skills tab">
          ✨ ${points} skill point${points === 1 ? "" : "s"}
        </div>` : ""}
        ${traitBadges ? `<div class="cc-section-label cc-talents-label">Talents</div><div class="cc-traits">${traitBadges}</div>` : ""}
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
    </div>
  </div>`;
}

// ---------- root ----------

export function renderApp(state, activeTab, rosterFilter = "all", floaties = [], rosterSortKey = "name", rosterSortDir = "asc") {
  let content;
  if (activeTab === "floor1") content = renderFloor1(state);
  else if (activeTab === "floor2") content = renderFloor2(state);
  else if (activeTab === "floor3") content = renderFloor3(state);
  else if (activeTab === "farm") content = renderFarm(state);
  else if (activeTab === "scrapyard") content = renderScrapyard(state);
  else if (activeTab === "ranch") content = renderRanch(state);
  else if (activeTab === "defense") content = renderDefenseTab(state);
  else if (activeTab === "assault") content = renderAssaultTab(state);
  else if (activeTab === "event") content = renderEventTab(state);
  else if (activeTab === "roster") content = renderRoster(state, rosterFilter, rosterSortKey, rosterSortDir);
  else if (activeTab === "research") content = renderResearch(state);
  else if (activeTab === "armory") content = renderArmory(state);
  else if (activeTab === "itemlist") content = renderItemList();
  else if (activeTab === "rescue") content = renderRescue(state);
  else if (activeTab === "log") content = renderLog(state);
  else content = renderOverview(state); // "overview" and any stale/unrecognized tab both land here

  return `${renderTopbar(state, floaties, activeTab)}${renderTabs(state, activeTab)}<div class="content">${content}</div>`;
}
