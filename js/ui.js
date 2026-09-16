import {
  CLASSROOM_IDS, SUBJECTS, SUBJECT_LABEL, STAT_OF_SUBJECT, STAT_LABEL, TRAITS,
  CLASSROOM_CAPACITY, CLASSROOM_MAX_TEACHERS, LOCATIONS,
  BOND_COUPLE_THRESHOLD, GRADE_TIERS, SKILL_TREE, MAX_TEACHERS, ROOM_UPGRADE_MAX_LEVEL,
  FARM_YIELD_FOOD, SCRAPYARD_YIELD_MATERIALS, LAB_YIELD_RESEARCH,
} from "./data.js";
import {
  overallLevel, gradeLetter, effectiveGrade, equipmentBonus, availableSkillPoints, teachingBonus,
  classroomTeachingBonus, bestClassroomSubjectFor,
} from "./characters.js";
import {
  getChar, aliveChars, deskPartner, PROMOTE_LEVEL_THRESHOLD, teacherCount, roomUpgradeInfo,
  isHexExplored,
} from "./game.js";
import { characterSprite } from "./sprite.js";

const TURN_NAMES = { 1: "Classes (Morning)", 2: "Exploration (Afternoon)", 3: "Defense (Night)" };
const TURN_NAMES_SHORT = { 1: "Classes", 2: "Exploration", 3: "Defense" };

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
};
const RESOURCE_ICON = { food: "🍞", materials: "🔧", medicine: "💊" };

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

// All axial hexes within `radius` of the school (excluding the school's own tile), for a full
// fog-of-war field rather than just the sparse curated LOCATIONS.
const HEX_RADIUS = 5;
function hexesInRadius(radius) {
  const hexes = [];
  for (let q = -radius; q <= radius; q++) {
    for (let r = -radius; r <= radius; r++) {
      if (q === 0 && r === 0) continue;
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

// Small upgrade button used across Gym/Cafeteria/Classroom room cards.
function upgradeButton(state, roomType, roomId, kind, label) {
  const info = roomUpgradeInfo(state, roomType, roomId, kind);
  if (info.maxed) return `<span class="muted upgrade-maxed">${label} maxed</span>`;
  return `<button class="btn btn-sm btn-upgrade" data-action="upgrade-room" data-room-type="${roomType}" data-room-id="${roomId || ""}" data-kind="${kind}" ${state.resources.materials < info.cost ? "disabled" : ""} title="Level ${info.level} → ${info.level + 1}">⬆ ${label} (${info.cost} materials)</button>`;
}

function statChips(c) {
  if (c.role === "teacher") {
    return `<div class="stat-chips">
      ${SUBJECTS.map((s) => {
        const specialty = s === c.teachSubject;
        return `<span class="chip ${specialty ? "chip-specialty" : ""}" title="${SUBJECT_LABEL[s]}${specialty ? " (specialty)" : ""}">${specialty ? "🌟 " : ""}${STAT_OF_SUBJECT[s]} ${gradeLetter(c.grades[s])}</span>`;
      }).join("")}
    </div>`;
  }
  return `<div class="stat-chips">
    <span class="chip" title="Strength (PE)">STR ${c.grades.PE}</span>
    <span class="chip" title="Dexterity (Gymnastics)">DEX ${c.grades.Gymnastics}</span>
    <span class="chip" title="Constitution (Biology)">CON ${c.grades.Biology}</span>
    <span class="chip" title="Intelligence (Physics)">INT ${c.grades.Physics}</span>
    <span class="chip" title="Wisdom (History)">WIS ${c.grades.History}</span>
    <span class="chip" title="Charisma (Social Studies)">CHA ${c.grades.SocialStudies}</span>
  </div>`;
}

// Letter grade (+ the flat bonus a teacher's grade gives students while teaching), used
// wherever a teacher is being assigned to a post.
function teachBonusLabel(gradeValue) {
  return `${gradeLetter(gradeValue)} (+${teachingBonus(gradeValue)})`;
}

function statusTag(c) {
  if (!c.alive) return `<span class="tag tag-dead">deceased</span>`;
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
  gym: "Gym",
  cafeteria: "Cafeteria",
  research: "Research Room",
  crafting: "Crafting Room",
  council: "Student Council",
};

// Where a character currently is — a teacher's post, or a student's active daily assignment
// (defending/exploring/gym/cafeteria take priority over their home classroom for the day).
function occupationLabel(state, c) {
  if (c.role === "teacher") {
    if (!c.post) return "Unassigned";
    if (c.post.startsWith("classroom:")) return roomDisplayName(state, c.post.split(":")[1]);
    return TEACHER_POST_LABEL[c.post] || c.post;
  }
  if (c.defending) return "Defending";
  if (c.exploreTeam !== null) return "Exploring";
  if (c.cafeteriaToday) return "Cafeteria";
  if (c.gymToday) return "Gym";
  if (c.seat) return roomDisplayName(state, c.seat.room);
  return "Unassigned";
}

// Like nameTag, but swaps the role emoji for a mini version of the character's own card portrait.
function rosterNameTag(c) {
  const couple = c.coupleId ? " 💞" : "";
  const portrait = characterSprite(c, 24);
  return `<span class="roster-name unit-link" data-action="open-card" data-id="${c.id}">
    <span class="mini-portrait ${!c.alive ? "cc-dead" : ""}">${portrait}</span>
    <span>${c.legendary ? "✨ " : ""}${esc(c.name)}${couple}</span>
  </span>`;
}

// ---------- topbar ----------

function happinessFace(v) {
  if (v >= 75) return "😄";
  if (v >= 50) return "🙂";
  if (v >= 25) return "😐";
  return "😢";
}

export function renderTopbar(state) {
  const pop = aliveChars(state).length;
  return `
  <div class="topbar">
    <div class="topbar-left">
      <div class="tb-stats">
        <span class="tb-item">👥 <b>${pop}</b></span>
        <span class="tb-item">🎓 <b>${teacherCount(state)}</b></span>
        <span class="tb-item" title="Happiness">${happinessFace(state.happiness)} <b>${state.happiness}</b></span>
      </div>
    </div>
    <div class="topbar-center">
      <span class="tb-day">📅 Day <b>${state.day}</b></span>
      <span class="tb-sep">|</span>
      <span class="tb-turn-indicator">⏰ ${state.turn}/3 · <b>${TURN_NAMES_SHORT[state.turn]}</b></span>
    </div>
    <div class="topbar-right">
      <div class="tb-stats">
        <span class="tb-item">🍞 <b>${state.resources.food}</b></span>
        <span class="tb-item">🔧 <b>${state.resources.materials}</b></span>
        <span class="tb-item">💊 <b>${state.resources.medicine}</b></span>
        <span class="tb-item">🧠 <b>${state.resources.research}</b></span>
      </div>
    </div>
  </div>`;
}

// The left 3 tabs change with the turn — you manage the school on Turn 1, the outside
// facilities on Turn 2 (while teams are out exploring), and (once defined) night-related
// screens on Turn 3.
const LEFT_TABS_BY_TURN = {
  1: [
    ["floor1", "🚪 Entrance"],
    ["floor2", "🏫 Classrooms"],
    ["floor3", "🏢 Facilities"],
  ],
  2: [
    ["farm", "🌾 Farm"],
    ["scrapyard", "🔩 Scrapyard"],
    ["lab", "🧪 Lab"],
  ],
  3: [
    ["defense", "🛡 Defense"],
    ["assault", "⚔ Assault"],
    ["event", "🎲 Event"],
  ],
};
// The center button always returns to the current turn's action screen (assigning classes,
// missions, or defenders + the button that actually advances the turn) — labeled per-turn so
// it doesn't read as a generic "advance turn" action.
const OVERVIEW_TAB_LABEL = { 1: "📚 Classes", 2: "🗺 Explore", 3: "🌙 Night Watch" };

export function renderTabs(state, activeTab, mobileView) {
  const floorBtns = (LEFT_TABS_BY_TURN[state.turn] || LEFT_TABS_BY_TURN[1])
    .map(
      ([id, label]) =>
        `<button class="tab-btn ${activeTab === id ? "active" : ""}" data-action="set-tab" data-tab="${id}">${label}</button>`
    )
    .join("");

  return `<div class="tabs">
    <div class="tabs-left">
      ${floorBtns}
    </div>
    <div class="tabs-center">
      <button class="tab-btn tab-btn-turn ${activeTab === "overview" ? "active" : ""}" data-action="set-tab" data-tab="overview">${OVERVIEW_TAB_LABEL[state.turn]}</button>
    </div>
    <div class="tabs-right">
      <button class="tab-btn ${activeTab === "roster" ? "active" : ""}" data-action="set-tab" data-tab="roster">📋 Roster</button>
      <button class="tab-btn ${activeTab === "research" ? "active" : ""}" data-action="set-tab" data-tab="research">🧠 Research</button>
      <button class="tab-btn ${activeTab === "log" ? "active" : ""}" data-action="set-tab" data-tab="log">📜 Log</button>
      <details class="options-dropdown">
        <summary class="tab-btn options-summary">⚙ Options ▾</summary>
        <div class="options-menu">
          <button class="options-item" data-action="save-game">💾 Save</button>
          <button class="options-item" data-action="reset-game">🔄 New Game</button>
          <label class="options-item options-toggle">
            <input type="checkbox" data-action="toggle-mobile-view" ${mobileView ? "checked" : ""}/>
            📱 Mobile View
          </label>
        </div>
      </details>
    </div>
  </div>`;
}

// ---------- overview / turn action ----------

export function renderOverview(state) {
  if (state.gameOver) {
    return `<div class="card"><h2>Game Over</h2><p>The school has fallen after ${state.day} days. Everyone is gone.</p>
      <button class="btn btn-primary" data-action="reset-game">Start a New Game</button></div>`;
  }
  if (state.turn === 1) return renderTurn1Overview(state);
  if (state.turn === 2) return renderTurn2Overview(state);
  return renderTurn3Overview(state);
}

function renderTurn1Overview(state) {
  const classroomSummaries = CLASSROOM_IDS.map((roomId) => {
    const room = state.rooms.classrooms[roomId];
    const n = room.seats.filter(Boolean).length;
    const teachers = state.characters.filter((c) => c.role === "teacher" && c.post === `classroom:${roomId}`);
    return `<li><b>${roomDisplayName(state, roomId)}</b>: ${n}/${room.seats.length} students, ${teachers.length} teacher(s)</li>`;
  }).join("");
  const gymCount = state.characters.filter((c) => c.gymToday).length;
  const restCount = state.characters.filter((c) => c.cafeteriaToday).length;
  const cooks = state.characters.filter((c) => c.role === "teacher" && c.post === "cafeteria");
  return `
  <div class="card">
    <h2>Turn 1 — Classes</h2>
    <p>Students in their home classroom earn XP toward their grade in that subject. Send students to the Gym for
    Physical Education &amp; Gymnastics training — a Gym teacher speeds that up, no teacher required. A <b>Floor 2</b>
    classroom teacher doesn't speed up grades, but gives every seated student a standing bonus to that subject.
    Gym and exploring cost 20 stamina; resting in the Cafeteria recovers 50.</p>
    <ul class="summary-list">
      ${classroomSummaries}
      <li><b>Gym</b>: ${gymCount}/${state.rooms.gym.studentCapacity} students training today</li>
      <li><b>Cafeteria</b>: ${cooks.length ? cooks.map((c) => esc(c.name)).join(", ") : "no cooks assigned"}, ${restCount}/${state.rooms.cafeteria.studentCapacity} students resting today</li>
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
      return `<button class="mission-chip" data-action="open-mission" data-location="${locId}">
        <span>${LOCATION_ICON[locId]} ${esc(loc.name)}</span>
        <span class="muted">${memberCount}/5</span>
        <span class="btn-x" data-action="clear-mission" data-team="${i}" title="Recall team">✕</span>
      </button>`;
    })
    .join("");

  return `
  <div class="card">
    <h2>Turn 2 — Exploration</h2>
    <p>Click a location on the map to send a team there. Distance from the school sets the difficulty — closer is
    safer, farther pays better (and is more dangerous). Teachers stay at the school. A fuller team of up to 5
    students succeeds more often.</p>
    ${renderExplorationMap(state)}
    <div class="mission-chips">${missionChips || '<p class="muted">No teams assigned yet — click a hex on the map to start a mission.</p>'}</div>
    <button class="btn btn-primary btn-big" data-action="resolve-turn">🧳 Launch Expeditions &amp; Advance to Night</button>
  </div>`;
}

function renderExplorationMap(state) {
  const width = 1.5 * HEX_SIZE * HEX_RADIUS * 2 + HEX_W + 20;
  const height = Math.sqrt(3) * HEX_SIZE * HEX_RADIUS * 2 + HEX_H + 20;
  const toPos = (x, y) => ({ left: x + width / 2 - HEX_W / 2, top: y + height / 2 - HEX_H / 2 });

  const schoolPos = toPos(0, 0);
  let hexesHtml = `<div class="hex hex-school" style="left:${schoolPos.left}px;top:${schoolPos.top}px;" title="Your school">
    <div class="hex-inner"><span class="hex-icon">🏫</span><span class="hex-label">School</span></div>
  </div>`;

  for (const { q, r } of hexesInRadius(HEX_RADIUS)) {
    const { x, y } = hexCenter(q, r);
    const pos = toPos(x, y);
    const loc = LOCATIONS.find((l) => l.hex.q === q && l.hex.r === r);
    const explored = isHexExplored(state, q, r);

    if (!explored) {
      hexesHtml += `<div class="hex hex-fog" data-action="open-scout" data-q="${q}" data-r="${r}" style="left:${pos.left}px;top:${pos.top}px;">
        <div class="hex-inner"><span class="hex-icon hex-fog-icon">?</span></div>
        <div class="hex-tooltip hex-tooltip-fog"><b>Unexplored</b><p class="muted">Click to send a scout (5 stamina).</p></div>
      </div>`;
      continue;
    }

    if (!loc) {
      hexesHtml += `<div class="hex hex-explored-empty" style="left:${pos.left}px;top:${pos.top}px;"></div>`;
      continue;
    }

    const dist = hexDistance(q, r);
    const diffClass = dist <= 2 ? "hex-easy" : dist <= 4 ? "hex-medium" : "hex-hard";
    const teamIndex = state.teamLocations.indexOf(loc.id);
    const assigned = teamIndex !== -1;
    const memberCount = assigned ? state.characters.filter((c) => c.exploreTeam === teamIndex && c.alive).length : 0;
    const rewardsStr = Object.entries(loc.rewards).map(([k, v]) => `${RESOURCE_ICON[k]} ~${v}`).join("  ");
    const recruitStr = loc.recruitBonus ? "🙋 Good chance of finding survivors" : "🙋 Slim chance of finding survivors";

    hexesHtml += `<div class="hex hex-loc ${diffClass} ${assigned ? "hex-assigned" : ""}" data-action="open-mission" data-location="${loc.id}" style="left:${pos.left}px;top:${pos.top}px;">
      <div class="hex-inner">
        <span class="hex-icon">${LOCATION_ICON[loc.id]}</span>
        <span class="hex-label">${esc(loc.name)}</span>
        ${assigned ? `<span class="hex-team-badge">👥 ${memberCount}/5</span>` : ""}
      </div>
      <div class="hex-tooltip">
        <b>${esc(loc.name)}</b>
        <p class="muted">${esc(loc.desc)}</p>
        <div>Difficulty ${loc.difficulty}/5 · Danger ${loc.danger}/5</div>
        <div>${rewardsStr}</div>
        <div class="muted">${recruitStr}</div>
      </div>
    </div>`;
  }

  return `<div class="hexmap-wrap"><div class="hexmap" style="width:${width}px;height:${height}px;">${hexesHtml}</div></div>`;
}

export function renderScoutModal(state, q, r) {
  const eligible = state.characters.filter((c) => c.role === "student" && c.alive && c.stamina >= 5);
  const rows = eligible
    .map(
      (s) => `<div class="check-row scout-row">
        <span>${nameTag(s)} ${staminaBar(s)} ${statusTag(s)}</span>
        <button class="btn btn-sm btn-primary" data-action="confirm-scout" data-id="${s.id}" data-q="${q}" data-r="${r}">Send (−5 stamina)</button>
      </div>`
    )
    .join("");

  return `
  <div class="modal-overlay" data-action="close-scout">
    <div class="char-card mission-card" data-action="noop">
      <button class="cc-close" data-action="close-scout" title="Close">✕</button>
      <h3>🌫 Unexplored Territory</h3>
      <p class="muted">Send a student to scout this hex. Most turn up nothing, but it's the only way to find loot.</p>
      <div class="mini-label">Send a scout</div>
      <div class="check-list">${rows || '<p class="muted">No student has enough stamina to scout right now.</p>'}</div>
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
      (c.exploreTeam === null || c.exploreTeam === teamIndex) &&
      !c.farmToday && !c.scrapyardToday && !c.labToday
  );
  const studentRows = availableStudents
    .map((s) => {
      const checked = s.exploreTeam === teamIndex ? "checked" : "";
      const exhausted = s.stamina <= 0 && s.exploreTeam !== teamIndex;
      const disabled = (members.length >= 5 && s.exploreTeam !== teamIndex) || exhausted ? "disabled" : "";
      return `<label class="check-row ${exhausted ? "check-row-disabled" : ""}">
        <input type="checkbox" data-action="toggle-team-member" data-team="${teamIndex}" data-id="${s.id}" ${checked} ${disabled}/>
        ${nameTag(s)} — Lv${overallLevel(s)} ${staminaBar(s)} ${statusTag(s)}${exhausted ? ' <span class="tag tag-injured">exhausted</span>' : ""}
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
      </div>
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

const FACILITY_LABEL = { farm: "Farm", scrapyard: "Scrapyard", lab: "Lab" };
const FACILITY_ICON = { farm: "🌾", scrapyard: "🔩", lab: "🧪" };

function renderTurn3Overview(state) {
  if (state.pendingRaid) return renderFacilityRaidPanel(state);

  const defenders = state.characters.filter((c) => c.defending && c.alive);
  const available = state.characters.filter((c) => c.role === "student" && c.alive && c.exploreTeam === null);
  const power = defenders.length
    ? Math.round(
        (defenders.reduce((sum, c) => sum + (effectiveGrade(state, c, "PE") + effectiveGrade(state, c, "Gymnastics")) / 2, 0) / defenders.length) *
          Math.sqrt(defenders.length) +
          state.fortification
      )
    : state.fortification;
  const estWave = 22 + state.day * 6;

  const rows = available
    .map((c) => {
      const checked = c.defending ? "checked" : "";
      return `<label class="check-row">
        <input type="checkbox" data-action="toggle-defend" data-id="${c.id}" ${checked}/>
        ${nameTag(c)} — STR ${c.grades.PE} DEX ${c.grades.Gymnastics} ${statusTag(c)}
      </label>`;
    })
    .join("");

  return `
  <div class="card">
    <h2>Turn 3 — Defense</h2>
    <p>Zombies attack the main entrance at night. Assign defenders now — high STR/DEX repels the horde, high CON
    keeps your defenders alive. Crafting-room fortification adds a flat bonus.</p>
    <div class="summary-list">
      <div>Estimated wave strength tonight: <b>~${estWave}</b></div>
      <div>Current estimated defense power: <b>${power}</b> ${power >= estWave ? "✅" : "⚠️"}</div>
      <div>Defenders assigned: <b>${defenders.length}</b></div>
    </div>
    <div class="mini-label">Assign defenders</div>
    <div class="check-list">${rows || '<p class="muted">Nobody available.</p>'}</div>
    <button class="btn btn-primary btn-big" data-action="resolve-turn">🛡 Defend the Entrance &amp; Advance to Next Day</button>
  </div>`;
}

// A won main battle can peel off part of the horde toward one of the outside facilities — this
// replaces the normal Night Watch panel until it's resolved, since it's the same slot in the
// turn flow (there's no skipping past it; it *is* what advancing the day now requires).
function renderFacilityRaidPanel(state) {
  const facility = state.pendingRaid.facility;
  const available = state.characters.filter((c) => c.role === "student" && c.alive && c.exploreTeam === null);
  const rows = available
    .map((c) => {
      const checked = state.raidDefenders.includes(c.id) ? "checked" : "";
      return `<label class="check-row">
        <input type="checkbox" data-action="toggle-raid-defender" data-id="${c.id}" ${checked}/>
        ${nameTag(c)} — STR ${c.grades.PE} DEX ${c.grades.Gymnastics} ${statusTag(c)}
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

// ---------- floor 1 ----------

export function renderFloor1(state) {
  const gymRoom = state.rooms.gym;
  const cafeRoom = state.rooms.cafeteria;

  const gymStudents = state.characters.filter((c) => c.gymToday && c.alive);
  const gymTeachers = state.characters.filter((c) => c.role === "teacher" && c.post === "gym" && c.alive);
  const availableForGym = state.characters.filter((c) => c.role === "student" && c.alive && !c.gymToday);
  const availableTeachersGym = state.characters.filter((c) => c.role === "teacher" && c.alive && c.post !== "gym");

  const cooks = state.characters.filter((c) => c.role === "teacher" && c.post === "cafeteria" && c.alive);
  const restingStudents = state.characters.filter((c) => c.cafeteriaToday && c.alive);
  const availableForCafe = state.characters.filter((c) => c.role === "student" && c.alive && !c.cafeteriaToday);
  const availableTeachersCafe = state.characters.filter((c) => c.role === "teacher" && c.alive && c.post !== "cafeteria");

  return `
  <div class="card">
    <h2>Floor 1</h2>
    <div class="floor-grid floor1-grid">
      <div class="room room-gym">
        <h3>🏋 Gym <span class="muted">(PE &amp; Gymnastics)</span></h3>
        <p class="muted">Up to ${gymRoom.studentCapacity} students/day, ${gymRoom.teacherCapacity} teachers. No teacher
        required — one assigned just adds a training bonus. Training costs 20 stamina.</p>
        <div class="mini-label">Teachers (optional)</div>
        <ul class="assign-list">
          ${gymTeachers.map((t) => `<li>${nameTag(t)} — PE ${teachBonusLabel(t.grades.PE)}, Gym ${teachBonusLabel(t.grades.Gymnastics)} <button class="btn-x" data-action="clear-post" data-id="${t.id}">✕</button></li>`).join("") || '<li class="muted">none</li>'}
        </ul>
        ${gymTeachers.length < gymRoom.teacherCapacity ? `<select data-action="assign-gym-teacher"><option value="">+ assign teacher…</option>${availableTeachersGym.map((t) => `<option value="${t.id}">${esc(t.name)} (PE ${teachBonusLabel(t.grades.PE)} / Gym ${teachBonusLabel(t.grades.Gymnastics)})</option>`).join("")}</select>` : ""}
        ${upgradeButton(state, "gym", null, "teacher", "Teacher slot")}
        <div class="mini-label">Training today (${gymStudents.length}/${gymRoom.studentCapacity})</div>
        <ul class="assign-list">
          ${gymStudents.map((s) => `<li>${nameTag(s)} ${staminaBar(s)} <button class="btn-x" data-action="remove-gym" data-id="${s.id}">✕</button></li>`).join("") || '<li class="muted">none</li>'}
        </ul>
        ${gymStudents.length < gymRoom.studentCapacity ? `<select data-action="add-gym"><option value="">+ send student…</option>${availableForGym.map((s) => `<option value="${s.id}" ${s.stamina <= 0 ? "disabled" : ""}>${esc(s.name)} (${s.stamina}/${s.maxStamina} stamina)${s.stamina <= 0 ? " — exhausted" : ""}</option>`).join("")}</select>` : ""}
        ${upgradeButton(state, "gym", null, "student", "Student slot")}
      </div>
      <div class="room room-entrance">
        <h3>🚪 Main Entrance</h3>
        <p class="muted">Defended each night during Turn 3. Assign defenders from the Turn panel.</p>
        <p>Fortification: <b>${state.fortification}</b> (from the Crafting Room)</p>
      </div>
      <div class="room room-cafeteria">
        <h3>🍽 Cafeteria</h3>
        <p class="muted">Up to ${cafeRoom.studentCapacity} students/day, ${cafeRoom.teacherCapacity} teachers (cooks).
        Everyone assigned here recharges 50 stamina/day. Cooks also heal everyone a little and stretch the food supply.</p>
        <div class="mini-label">Cooks (${cooks.length}/${cafeRoom.teacherCapacity})</div>
        <ul class="assign-list">
          ${cooks.map((t) => `<li>${nameTag(t)} — Biology ${gradeLetter(t.grades.Biology)} ${staminaBar(t)} <button class="btn-x" data-action="clear-post" data-id="${t.id}">✕</button></li>`).join("") || '<li class="muted">none</li>'}
        </ul>
        ${cooks.length < cafeRoom.teacherCapacity ? `<select data-action="assign-cafeteria"><option value="">+ assign cook…</option>${availableTeachersCafe.map((t) => `<option value="${t.id}">${esc(t.name)} (Biology ${gradeLetter(t.grades.Biology)})</option>`).join("")}</select>` : ""}
        ${upgradeButton(state, "cafeteria", null, "teacher", "Cook slot")}
        <div class="mini-label">Resting today (${restingStudents.length}/${cafeRoom.studentCapacity})</div>
        <ul class="assign-list">
          ${restingStudents.map((s) => `<li>${nameTag(s)} ${staminaBar(s)} <button class="btn-x" data-action="remove-cafeteria" data-id="${s.id}">✕</button></li>`).join("") || '<li class="muted">none</li>'}
        </ul>
        ${restingStudents.length < cafeRoom.studentCapacity ? `<select data-action="add-cafeteria"><option value="">+ send student…</option>${availableForCafe.map((s) => `<option value="${s.id}">${esc(s.name)} (${s.stamina}/${s.maxStamina} stamina)</option>`).join("")}</select>` : ""}
        ${upgradeButton(state, "cafeteria", null, "student", "Student slot")}
      </div>
    </div>
  </div>`;
}

// ---------- floor 2 ----------

export function renderFloor2(state) {
  const rooms = CLASSROOM_IDS.map((roomId) => renderClassroom(state, roomId)).join("");
  return `<div class="card"><h2>Floor 2 — Classrooms &amp; Dorms</h2>
  <p class="muted">Students live and sleep in their assigned classroom. Each room is unassigned ("Classroom N") until a
  teacher is posted there, then it takes on whichever subject that teacher is best qualified to teach — and reverts to
  unassigned if it goes unstaffed, so rooms can be freely repurposed. Deskmates who fight together bond — opposite-gender
  deskmates may become a couple at bond ${BOND_COUPLE_THRESHOLD}+.</p>
  <div class="floor2-grid">${rooms}</div></div>`;
}

function renderClassroom(state, roomId) {
  const room = state.rooms.classrooms[roomId];
  const subject = room.subject; // null until a teacher claims this room
  const post = `classroom:${roomId}`;
  const teachers = state.characters.filter((c) => c.role === "teacher" && c.post === post && c.alive);
  const availableTeachers = state.characters.filter((c) => c.role === "teacher" && c.alive && c.post !== post);
  const unseated = state.characters.filter((c) => c.role === "student" && c.alive && !c.seat);

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
            <select data-action="assign-seat" data-room="${roomId}" data-index="${idx}">
              <option value="">empty</option>
              ${unseated.map((s) => `<option value="${s.id}">${esc(s.name)}</option>`).join("")}
            </select>
          </div>`;
        }
      }
      rowHtml += `</div>`;
    }
    rowHtml += `</div>`;
    seatsHtml += rowHtml;
  }

  const count = room.seats.filter(Boolean).length;

  // For an empty room, preview what subject/bonus each candidate teacher would bring — the
  // room doesn't have a subject to grade them against yet, so show their own best fit.
  const optionLabel = (t) => {
    if (subject) return `${teachBonusLabel(t.grades[subject])}`;
    const preview = bestClassroomSubjectFor(t);
    return `${SUBJECT_LABEL[preview]} ${teachBonusLabel(t.grades[preview])}`;
  };

  return `
  <div class="room room-classroom">
    <h3>${subject ? SUBJECT_LABEL[subject] : `Classroom ${roomId}`} <span class="muted">(${count}/${room.seats.length})</span></h3>
    ${!subject ? '<p class="muted">Unassigned — the one teacher posted here decides the subject.</p>' : ""}
    <div class="mini-label">Teacher (grade boost per student, 1 max)</div>
    <ul class="assign-list">
      ${teachers.map((t) => `<li>${nameTag(t)} — ${teachBonusLabel(t.grades[subject])} ${staminaBar(t)} <button class="btn-x" data-action="clear-post" data-id="${t.id}">✕</button></li>`).join("") || '<li class="muted">none</li>'}
    </ul>
    ${teachers.length < CLASSROOM_MAX_TEACHERS ? `<select data-action="assign-classroom-teacher" data-room="${roomId}"><option value="">+ assign teacher…</option>${availableTeachers.map((t) => `<option value="${t.id}" ${t.stamina <= 0 ? "disabled" : ""}>${esc(t.name)} (${optionLabel(t)})${t.stamina <= 0 ? " — exhausted" : ""}</option>`).join("")}</select>` : ""}
    <div class="mini-label">Seating (${rowCount} rows × 3 desks)</div>
    <div class="seat-grid">${seatsHtml}</div>
    ${upgradeButton(state, "classroom", roomId, "student", "Row")}
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

  const researcher = state.characters.find((c) => c.role === "teacher" && c.post === "research" && c.alive);
  const crafter = state.characters.find((c) => c.role === "teacher" && c.post === "crafting" && c.alive);
  const council = state.characters.find((c) => c.role === "teacher" && c.post === "council" && c.alive);

  const utilityRoom = (title, desc, current, postKey, statLabel, statKey) => {
    const available = state.characters.filter((c) => c.role === "teacher" && c.alive && c.post !== postKey);
    return `<div class="room room-utility">
      <h3>${title}</h3>
      <p class="muted">${desc}</p>
      <div class="mini-label">Assigned</div>
      <ul class="assign-list">
        ${current ? `<li>${nameTag(current)} — ${statLabel} ${gradeLetter(current.grades[statKey])} <button class="btn-x" data-action="clear-post" data-id="${current.id}">✕</button></li>` : '<li class="muted">none</li>'}
      </ul>
      ${!current ? `<select data-action="assign-utility" data-post="${postKey}"><option value="">+ assign teacher…</option>${available.map((t) => `<option value="${t.id}">${esc(t.name)} (${statLabel} ${gradeLetter(t.grades[statKey])})</option>`).join("")}</select>` : ""}
    </div>`;
  };

  return `
  <div class="card">
    <h2>Floor 3 — Headmaster's Office &amp; Special Rooms</h2>
    <div class="subcard">
      <h3>🧑‍💼 Headmaster's Office</h3>
      <p class="muted">Promote high-achieving students (Level ${PROMOTE_LEVEL_THRESHOLD}+) to teachers, or expel anyone.
      The school has room for ${MAX_TEACHERS} teachers at most — currently ${teacherCount(state)}/${MAX_TEACHERS}.</p>
      <div class="table-wrap">
        <table class="roster-table">
          <thead><tr><th>Name</th><th>Level</th><th>Stats</th><th>Actions</th></tr></thead>
          <tbody>${promoteRows || '<tr><td colspan="4" class="muted">No students.</td></tr>'}</tbody>
        </table>
      </div>
    </div>
    <div class="subcard">
      <h3>🙋 Pending Recruits</h3>
      <div class="recruit-list">${recruits || '<p class="muted">No one is waiting to join right now. Explore the city or staff the Student Council room to find survivors.</p>'}</div>
    </div>
    <div class="floor3-grid">
      ${utilityRoom("🔬 Research Room", "Generates medicine each day, scaled by the assigned teacher's Physics (INT) grade.", researcher, "research", "INT", "Physics")}
      ${utilityRoom("🛠 Crafting Room", "Converts materials into permanent entrance Fortification, scaled by Gymnastics (DEX).", crafter, "crafting", "DEX", "Gymnastics")}
      ${utilityRoom("🗳 Student Council Room", "Chance each day to hear of a survivor wanting to join, scaled by Social Studies (CHA).", council, "council", "CHA", "SocialStudies")}
    </div>
  </div>`;
}

// ---------- outside facilities (Turn 2) ----------

function renderOutsideFacility(state, roomKey, flagKey, icon, title, desc) {
  const room = state.rooms[roomKey];
  const workers = state.characters.filter((c) => c[flagKey] && c.alive);
  const available = state.characters.filter(
    (c) => c.role === "student" && c.alive && !c[flagKey] && c.exploreTeam === null
  );

  return `
  <div class="card">
    <h2>${icon} ${title}</h2>
    <p class="muted">${desc}</p>
    <div class="mini-label">Working today (${workers.length}/${room.studentCapacity})</div>
    <ul class="assign-list">
      ${workers.map((s) => `<li>${nameTag(s)} ${statusTag(s)} <button class="btn-x" data-action="remove-${roomKey}" data-id="${s.id}">✕</button></li>`).join("") || '<li class="muted">none</li>'}
    </ul>
    ${workers.length < room.studentCapacity ? `<select data-action="add-${roomKey}"><option value="">+ assign student…</option>${available.map((s) => `<option value="${s.id}">${esc(s.name)}</option>`).join("")}</select>` : ""}
    ${upgradeButton(state, roomKey, null, "student", "Student slot")}
  </div>`;
}

export function renderFarm(state) {
  return renderOutsideFacility(
    state, "farm", "farmToday", "🌾", "Farm",
    `Assign students to grow food instead of sending them out to explore today. Each worker yields ${FARM_YIELD_FOOD} food when the day ends.`
  );
}

export function renderScrapyard(state) {
  return renderOutsideFacility(
    state, "scrapyard", "scrapyardToday", "🔩", "Scrapyard",
    `Assign students to strip nearby wrecks for parts instead of exploring today. Each worker yields ${SCRAPYARD_YIELD_MATERIALS} materials when the day ends.`
  );
}

export function renderLab(state) {
  return renderOutsideFacility(
    state, "lab", "labToday", "🧪", "Lab",
    `Assign students to run experiments instead of exploring today. Each worker yields ${LAB_YIELD_RESEARCH} research when the day ends — spend research on the skill tree (coming soon).`
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
  return renderComingSoon("🛡", "Defense", "Fortification and defender-loadout options will live here. A facility raid (10% chance after a won battle) will show up as an alert here and on the Night Watch panel.");
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

export function renderResearch(state) {
  return `
  <div class="card">
    <h2>🧠 Research</h2>
    <p class="muted">Earned by staffing the Lab during Turn 2. A skill tree to spend it on is coming soon.</p>
    <div class="summary-list">
      <div>Research banked: <b>${state.resources.research}</b></div>
    </div>
  </div>`;
}

// ---------- roster ----------

export function renderRoster(state, filter = "all") {
  const showDead = window.__showDead;
  const list = state.characters.filter((c) => (showDead || c.alive) && (filter === "all" || c.role === filter));
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
        <td>${hpBar(c)}</td>
        <td>${staminaBar(c)}</td>
        <td>${statusTag(c)}</td>
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

  return `<div class="card">
    <h2>Roster</h2>
    ${filterBar}
    <label class="check-row"><input type="checkbox" data-action="toggle-show-dead" ${showDead ? "checked" : ""}/> Show deceased</label>
    <div class="table-wrap">
      <table class="roster-table">
        <thead><tr><th>Name</th><th>Role</th><th>Sex</th><th>Level / Teaches</th><th>HP</th><th>Stamina</th><th>Status</th><th>Assignment</th><th>Stats</th></tr></thead>
        <tbody>${rows || '<tr><td colspan="9" class="muted">Nobody here.</td></tr>'}</tbody>
      </table>
    </div>
  </div>`;
}

// ---------- log ----------

export function renderLog(state) {
  const items = state.log
    .map((e) => `<li><span class="log-tag">D${e.day}T${e.turn}</span> ${esc(e.msg)}</li>`)
    .join("");
  return `<div class="card"><h2>Log</h2><ul class="log-list">${items || '<li class="muted">Nothing yet.</li>'}</ul></div>`;
}

// ---------- character card ----------

function formatBonuses(bonuses) {
  return Object.entries(bonuses).map(([k, v]) => `+${v} ${k}`).join("  ") || "no bonus";
}

function renderStatsTab(state, c) {
  return c.role === "teacher" ? renderTeacherStatsTab(c) : renderStudentStatsTab(state, c);
}

function renderStudentStatsTab(state, c) {
  const gradeRows = SUBJECTS.map((s) => {
    const val = c.grades[s];
    const letter = gradeLetter(val);
    const stat = STAT_OF_SUBJECT[s];
    const gearBonus = equipmentBonus(c, stat);
    const classBonus = classroomTeachingBonus(state, c, s);
    const total = val + gearBonus + classBonus;
    const hasBonus = gearBonus + classBonus > 0;
    const bonusParts = [];
    if (gearBonus) bonusParts.push(`+${gearBonus} from equipped gear`);
    if (classBonus) bonusParts.push(`+${classBonus} from classroom teacher`);
    const tooltip = bonusParts.join(", ");
    return `<div class="grade-row-v2">
      <span class="gr-col gr-name">${SUBJECT_LABEL[s]}</span>
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
    bonus from equipped gear or a classroom teacher — hover it to see the breakdown.</p>`;
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
    seated student a standing bonus to that subject, or to the Gym to speed up PE/Gymnastics training.</p>`;
}

function renderInventoryTab(state, c) {
  const eq = c.equipment || { weapon: null, armor: null, accessories: [null, null, null] };

  const slotRow = (label, slotKey, item, allowedSlotType) => {
    const options = state.armory.filter((it) => it.slot === allowedSlotType);
    const itemHtml = item
      ? `<div class="inv-item">
          <span class="inv-item-icon">${item.icon}</span>
          <span class="inv-item-name">${esc(item.name)}</span>
          <span class="inv-item-bonus">${formatBonuses(item.bonuses)}</span>
          <button class="btn-x" data-action="unequip-item" data-id="${c.id}" data-slot="${slotKey}">✕</button>
        </div>`
      : `<select data-action="equip-item" data-id="${c.id}" data-slot="${slotKey}">
          <option value="">— empty —</option>
          ${options.map((it) => `<option value="${it.uid}">${it.icon} ${esc(it.name)} (${formatBonuses(it.bonuses)})</option>`).join("")}
        </select>`;
    return `<div class="inv-slot"><div class="inv-slot-label">${label}</div>${itemHtml}</div>`;
  };

  const rows = [
    slotRow("Weapon", "weapon", eq.weapon, "weapon"),
    slotRow("Armor", "armor", eq.armor, "armor"),
    slotRow("Accessory 1", "accessory0", eq.accessories[0], "accessory"),
    slotRow("Accessory 2", "accessory1", eq.accessories[1], "accessory"),
    slotRow("Accessory 3", "accessory2", eq.accessories[2], "accessory"),
  ].join("");

  const allItems = [eq.weapon, eq.armor, ...eq.accessories].filter(Boolean);
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
        const title = `${node.name} (${node.tier}) — ${node.desc}. ${SKILL_STATUS_REASON[status]}`;
        return `<button type="button" class="skill-node ${cls}" ${clickAttr} ${status === "buyable" ? "" : "disabled"} title="${esc(title)}">
          <span class="skill-node-tier">${status === "owned" ? "✓" : node.tier}</span>
          <span class="skill-node-name">${esc(node.name)}</span>
        </button>`;
      })
      .join("");
    const hiddenChip = hiddenCount
      ? `<span class="skill-node skill-hidden" title="${hiddenCount} more skill${hiddenCount === 1 ? "" : "s"} on this path — raise the ${SUBJECT_LABEL[s]} grade and learn the one before it to reveal them">🔒 +${hiddenCount}</span>`
      : "";
    return `<div class="skill-row">
      <div class="skill-subject">${SUBJECT_LABEL[s]} <b class="grade-letter grade-letter-${letter}">${letter}</b></div>
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
  const sprite = characterSprite(c, 132);
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
        <div class="cc-top-stats">
          <div class="cc-stat-box cc-hp-box"><span class="cc-label">HP</span>${hpBar(c)}</div>
          <div class="cc-stat-box cc-hp-box"><span class="cc-label">Stamina</span>${staminaBar(c)}</div>
        </div>
        ${tabBar}
        ${body}
      </div>
    </div>
  </div>`;
}

// ---------- root ----------

export function renderApp(state, activeTab, rosterFilter = "all", mobileView = false) {
  let content;
  if (activeTab === "floor1") content = renderFloor1(state);
  else if (activeTab === "floor2") content = renderFloor2(state);
  else if (activeTab === "floor3") content = renderFloor3(state);
  else if (activeTab === "farm") content = renderFarm(state);
  else if (activeTab === "scrapyard") content = renderScrapyard(state);
  else if (activeTab === "lab") content = renderLab(state);
  else if (activeTab === "defense") content = renderDefenseTab(state);
  else if (activeTab === "assault") content = renderAssaultTab(state);
  else if (activeTab === "event") content = renderEventTab(state);
  else if (activeTab === "roster") content = renderRoster(state, rosterFilter);
  else if (activeTab === "research") content = renderResearch(state);
  else if (activeTab === "log") content = renderLog(state);
  else content = renderOverview(state); // "overview" and any stale/unrecognized tab both land here

  return `${renderTopbar(state)}${renderTabs(state, activeTab, mobileView)}<div class="content">${content}</div>`;
}
