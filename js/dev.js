// Test shortcuts for developing the game (main.js exposes them as window.schoolDev on localhost;
// the /max and /min project commands run them). Nothing here saves — the player's Save does.
import * as G from "./game.js";
import { makeCharacter, makeLegendaryCharacter, makeItem } from "./characters.js";
import { MAP_RADIUS } from "./map.js";
import { CLASSROOM_IDS, PRODUCERS, YARD_JOBS, STUDENT_MAX_LEVEL, xpToNextLevel, DEFENSE_ROW0, STREET_ROW0 } from "./data.js";

// Every room and facility to the top level, and every slot filled: teachers in every post,
// every classroom seat, training, resting, beds, outside workers, plots and pens. Hires whoever is
// needed. Students get levels spread from 1 to 10. Scrap is put back afterwards.
export function maxOutSchool(state) {
  const scrap = state.resources.materials;
  state.boardedRooms = [];
  state.resources.materials = 1e9;
  for (const key of G.ROOM_KEYS) if (key !== "radio") while (G.upgradeRoom(state, key));
  state.resources.materials = scrap;
  // the Radio Station to level 4 — level 5 (satellite) would send for the helicopter
  buildRadio(state, 4);
  state.teamSlots = 3; // every expedition team bought

  const hired = { teachers: 0, students: 0 };
  const hire = (role) => {
    const c = makeCharacter(role, Math.random() < 0.5 ? "M" : "F");
    state.characters.push(c);
    hired[`${role}s`]++;
    return c;
  };
  const alive = (role) => state.characters.filter((c) => c.alive && c.role === role && !c.infection);

  // teachers: every post up to its slots
  const posts = [...CLASSROOM_IDS.map((id) => `classroom:${id}`), "gym:PE", "gym:Gymnastics", "cafeteria", "infirmary", "research", "crafting", "radio"];
  for (const post of posts) {
    const slots = G.roomState(state, G.postRoomKey(post)).teacherCapacity;
    while (alive("teacher").filter((t) => t.post === post).length < slots) {
      const t = alive("teacher").find((x) => !x.post) || hire("teacher");
      if (!G.setTeacherPost(state, t.id, post)) break;
    }
  }

  // students: enough to fill every classroom seat, all seated
  const seats = CLASSROOM_IDS.reduce((sum, id) => sum + state.rooms.classrooms[id].seats.length, 0);
  while (alive("student").length < seats) hire("student");
  for (const c of alive("student").filter((x) => !x.seat)) {
    for (const id of CLASSROOM_IDS) {
      const idx = state.rooms.classrooms[id].seats.findIndex((x) => !x);
      if (idx >= 0 && G.assignSeat(state, c.id, id, idx)) break;
    }
  }

  // daily jobs: fill each room's student slots from whoever is free
  const busy = (c) => c.gymToday || c.radioToday || c.researchToday || c.craftingToday || c.infirmaryToday || c.restToday || c.farmToday || c.scrapyardToday || c.exploreTeam !== null || c.defending;
  const fill = (count, assign) => {
    for (let i = 0; i < count; i++) {
      const c = alive("student").find((x) => !busy(x));
      if (!c || !assign(c)) break;
    }
  };
  const count = (flag, value = true) => state.characters.filter((c) => c.alive && (value === true ? c[flag] : c[flag] === value)).length;
  fill(state.rooms.gym.studentCapacity - count("gymToday", "PE"), (c) => G.setGymToday(state, c.id, "PE"));
  fill(state.rooms.acrobatics.studentCapacity - count("gymToday", "Gymnastics"), (c) => G.setGymToday(state, c.id, "Gymnastics"));
  fill(state.rooms.radio.studentCapacity - count("radioToday"), (c) => G.setRadioToday(state, c.id, true));
  fill(state.rooms.research.studentCapacity - count("researchToday"), (c) => G.setResearchToday(state, c.id, true));
  fill(state.rooms.crafting.studentCapacity - count("craftingToday"), (c) => G.setCraftingToday(state, c.id, true));
  fill(state.rooms.cafeteria.studentCapacity - count("restToday"), (c) => {
    c.stamina = Math.round(c.maxStamina * 0.25);
    return G.setRestToday(state, c.id, true);
  });
  fill(state.rooms.infirmary.studentCapacity - G.infirmaryBedsUsed(state), (c) => {
    c.hp = Math.round(c.maxHp * 0.5);
    return G.setInfirmaryToday(state, c.id, "heal");
  });

  // student levels spread from 1 to the top, with some experience toward the next, so every level
  // (and promotion at the top) can be tried out
  alive("student").forEach((c, i) => {
    c.level = 1 + (i % STUDENT_MAX_LEVEL);
    c.exp = c.level >= STUDENT_MAX_LEVEL ? 0 : Math.floor(Math.random() * xpToNextLevel(c.level));
  });

  // the Farm's fields and pens: something in every slot, every other one ready to collect and the
  // rest part-grown (but one of each of the last two groups left empty, to see how that looks),
  // and a few seeds and animals in stock
  for (const kind of Object.keys(PRODUCERS)) {
    const days = PRODUCERS[kind].growDays;
    state.plots[kind].forEach((plot, i) => {
      if (plot.id || ((kind === "tomatoes" || kind === "cow") && i === state.plots[kind].length - 1)) return;
      Object.assign(plot, { id: kind, growth: i % 2 === 0 ? days : i % days });
    });
    state.stock[kind] = Math.max(state.stock[kind] || 0, 2);
  }
  // the Scrapyard's piles and benches: every other one ready
  for (const kind of Object.keys(YARD_JOBS)) state.yard[kind].forEach((slot, i) => { slot.growth = i % 2 === 0 ? YARD_JOBS[kind].growDays : i % YARD_JOBS[kind].growDays; });
  G.autoAssignFarm(state); // as many workers as the ready slots need
  G.autoAssignSite(state, "scrapyard");

  return {
    levels: "all rooms at level 5",
    teachers: alive("teacher").length,
    students: alive("student").length,
    hired,
  };
}

// Quarantines `n` students (not already infected) with 1-5 days left, to test how it looks.
export function infectStudents(state, n = 3) {
  const picked = state.characters
    .filter((c) => c.role === "student" && c.alive && !c.infection && !c.infirmaryToday)
    .slice(0, n);
  picked.forEach((c, i) => {
    G.infect(state, c, "was bitten (test)");
    c.infection.dueDay = state.day + (i % 5);
  });
  return `${picked.length} student${picked.length === 1 ? "" : "s"} quarantined · ${G.infectedChars(state).length} in quarantine`;
}

// Adds `n` survivors to the Headmaster's Office waiting list (every 4th a teacher, the 3rd legendary).
export function addRecruits(state, n = 4) {
  let added = 0;
  for (let i = 0; i < n; i++) {
    const role = i % 4 === 3 ? "teacher" : "student";
    const gender = Math.random() < 0.5 ? "M" : "F";
    if (G.addRecruit(state, i === 2 ? makeLegendaryCharacter(role, gender) : makeCharacter(role, gender))) added++;
  }
  return `${added} recruit${added === 1 ? "" : "s"} added · ${state.recruitPool.length} waiting`;
}

// Lifts the fog out to `rings` hexes from the school (no finds rolled — just the map revealed).
export function exploreMap(state, rings = MAP_RADIUS) {
  let added = 0;
  for (let q = -rings; q <= rings; q++) {
    for (let r = -rings; r <= rings; r++) {
      const d = (Math.abs(q) + Math.abs(r) + Math.abs(q + r)) / 2;
      if (d <= 1 || d > rings || G.isHexExplored(state, q, r)) continue;
      state.exploredHexes.push(G.hexKey(q, r));
      added++;
    }
  }
  const milestones = G.checkMapMilestones(state);
  return `${added} blocks revealed · ${state.exploredHexes.length} explored${milestones.length ? ` · milestones ${milestones.map((m) => `${m.pct}%`).join(", ")} paid out` : ""}`;
}

// Puts the wandering horde on the map (or moves it a block) and fills the map with supply drops.
export function mapEvents(state) {
  G.moveHorde(state);
  for (let i = 0; i < 3; i++) G.rollMapDrop(state, true);
  return `horde at ${state.horde.q},${state.horde.r} · ${state.mapDrops.length} drops on the map`;
}

// Jumps to the Night Watch of `day` (a bigger horde, maybe a boss, its weather) with the best
// fighters posted on the steps, front row first, and some scrap and medicine for night actions.
export function setNight(state, day = 8) {
  state.day = day;
  state.turn = 3;
  state.pendingRaid = null;
  state.pendingAssault = false;
  for (const key of Object.keys(state.entranceGrid.students)) G.clearEntranceStudentCell(state, key);
  const size = state.entranceGrid.size;
  const third = 3; // the defenders' rows (data.js ENTRANCE_ZONES.students)
  const fighters = state.characters
    .filter((c) => c.role === "student" && c.alive && !c.infection && c.exploreTeam === null)
    .sort((a, b) => (b.grades.PE + b.grades.Gymnastics) - (a.grades.PE + a.grades.Gymnastics))
    .slice(0, size * third);
  fighters.forEach((c, i) => G.moveEntranceStudent(state, `${third - 1 - Math.floor(i / size)},${i % size}`, c.id));
  state.resources.materials = Math.max(state.resources.materials, 30);
  state.resources.medicine = Math.max(state.resources.medicine, 20);
  return `Night ${day}: ${G.nightCondition(state).name}, ${fighters.length} on watch`;
}

// Fills the courtyard with defenses (free), each kind in turn — to see them on the board.
export function fortifyEntrance(state) {
  const grid = state.entranceGrid;
  let n = 0;
  for (let row = DEFENSE_ROW0; row < STREET_ROW0; row++) {
    for (let col = 0; col < grid.size; col++) grid.defenses[`${row},${col}`] = G.buildableDefenses(state)[n++ % 2].id;
  }
  return `${n} defenses built`;
}

// Hands everyone on watch tonight a Fire Axe and a Recurve Bow (made on the spot, so the armory
// isn't touched) — to see the fight with real weapons.
export function armDefenders(state) {
  const defenders = state.characters.filter((c) => c.defending && c.alive);
  for (const c of defenders) {
    c.equipment = c.equipment || { meleeWeapon: null, rangedWeapon: null, armor: null, accessories: [null, null, null] };
    c.equipment.meleeWeapon = makeItem("axe");
    c.equipment.rangedWeapon = makeItem("recurve_bow");
  }
  return `${defenders.length} defender${defenders.length === 1 ? "" : "s"} armed with 🪓 and 🏹`;
}

// What can follow a won night: "assault" (the horde falls back and can be chased — tonight's
// defenders make the squad) or "farm" / "scrapyard" (a raid on that facility).
export function forceFollowUp(state, kind = "assault") {
  state.turn = 3;
  if (kind === "assault") {
    state.pendingRaid = null;
    state.pendingAssault = true;
    return `The horde is falling back — ${G.assaultCandidates(state).length} can chase it`;
  }
  state.pendingAssault = false;
  state.pendingRaid = { facility: kind };
  state.raidDefenders = [];
  return `A raid on the ${kind}`;
}

// Clears the Radio Station's boards and builds its first `stage` upgrades for free (5 = satellite
// communications, which sends for the helicopter).
export function buildRadio(state, stage = 5) {
  state.boardedRooms = (state.boardedRooms || []).filter((k) => k !== "radio");
  const saved = { ...state.resources };
  state.resources.materials = state.resources.research = 1e6;
  while (G.radioStage(state) < stage && G.buildRadioUpgrade(state));
  state.resources.materials = saved.materials;
  state.resources.research = saved.research;
  return `Radio Station at ${G.radioStage(state)}/5${state.rescue ? ` · helicopter lands on day ${state.rescue.day}` : ""}`;
}
