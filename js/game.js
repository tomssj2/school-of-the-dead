import {
  SUBJECTS, CLASSROOM_IDS, CLASSROOM_CAPACITY, CLASSROOM_MAX_TEACHERS,
  GYM_CAPACITY, GYM_MAX_TEACHERS, CAFETERIA_MAX_TEACHERS, LOUNGE_CAPACITY, LOUNGE_RECOVERY,
  FARM_CAPACITY, SCRAPYARD_CAPACITY, LAB_CAPACITY,
  FARM_YIELD_FOOD, SCRAPYARD_YIELD_MATERIALS, LAB_YIELD_RESEARCH, FORTIFICATION_CAP,
  LOCATIONS, BOND_COUPLE_THRESHOLD, STAT_OF_SUBJECT, TRAITS,
  GRADE_TIERS, SKILL_TREE, SUBJECT_LABEL, MAX_TEACHERS, TEACHER_RECRUIT_CHANCE,
  ROOM_UPGRADE_MAX_LEVEL, ROOM_UPGRADE_INCREMENT, roomUpgradeCost,
  MAX_STAMINA, STAMINA_COST_GYM, STAMINA_COST_EXPLORE, STAMINA_COST_TEACH, STAMINA_RECHARGE_CAFETERIA,
  HAPPINESS_START, HAPPINESS_MIN, HAPPINESS_MAX, HAPPINESS_GAIN_WIN, HAPPINESS_GAIN_RECRUIT,
  HAPPINESS_LOSS_MISSION_FAIL, HAPPINESS_LOSS_DEATH,
  FACILITY_RAID_CHANCE, ASSAULT_CHANCE, RAIDABLE_FACILITIES, LEGENDARY_CHANCE,
  EVENT_CHANCE, EVENTS, TECH_TREE,
  SCOUT_STAMINA_COST, SCOUT_ENCOUNTER_CHANCE_PER_HEX, SCOUT_ENCOUNTER_HP_LOSS,
  ENTRANCE_GRID_SIZE, DEFENSE_STRUCTURES, ITEM_TEMPLATES,
  ZOMBIE_HIT_CHANCE, FIST_WEAPON, BATTLE_MAX_TICKS, DOWNED_DEATH_CHANCE, MEDICINE_PER_STABILIZE,
  zombieStatsForDay, ZOMBIE_TYPES, hordeComposition, isBossNight, bossNameForDay,
  RESCUE_BROADCAST_DAY, RESCUE_DAY, RESCUE_DELAY_DAYS, ANTENNA_STAGES,
  EXPEDITION_ITEM_CHANCE, EXPEDITION_ITEM_CHANCE_FAILED,
  INFIRMARY_CAPACITY, INFIRMARY_MAX_TEACHERS, INFIRMARY_MEDICINE_PER_PATIENT, INFIRMARY_HEAL_BASE,
  INFIRMARY_NURSE_BONUS, INFIRMARY_BED_REST, INGREDIENTS, STARTING_PANTRY, DISHES,
  EXPEDITION_INGREDIENT_CHANCE, EXPEDITION_INGREDIENT_CHANCE_FAILED,
} from "./data.js";
import {
  makeCharacter, makeLegendaryCharacter, randInt, pick, maxHpFor, overallLevel, starterArmory, effectiveGrade,
  gradeLetter, availableSkillPoints, withTeacherHonorific, stripHonorific, teachingBonus,
  bestClassroomSubjectFor, emptyEquipment, makeItem,
} from "./characters.js";

const clamp01 = (x) => Math.max(0, Math.min(1, x));
const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));

export function adjustHappiness(state, amount) {
  state.happiness = clamp(state.happiness + amount, HAPPINESS_MIN, HAPPINESS_MAX);
}

// A character dying affects happiness no matter which turn/system caused it, so every death
// goes through this instead of setting c.alive directly.
function killCharacter(state, c) {
  c.alive = false;
  c.hp = 0;
  c.diedOnDay = state.day;
  adjustHappiness(state, -HAPPINESS_LOSS_DEATH);
}

// ---------- state creation ----------

export function createInitialState() {
  const state = {
    day: 1,
    turn: 1, // 1=training, 2=exploration, 3=defense
    resources: { food: 60, materials: 30, medicine: 20, research: 0 },
    fortification: 0,
    happiness: HAPPINESS_START,
    pendingRaid: null, // { facility } once a facility raid triggers post-battle, until resolved
    pendingAssault: false, // true once an Assault opportunity triggers post-battle, until resolved
    raidDefenders: [],
    eventLog: [], // most recent random events, newest first
    exploredHexes: [], // "q,r" keys the fog of war has been lifted from
    techUnlocked: [], // TECH_TREE ids purchased with banked Research
    entranceGrid: { size: ENTRANCE_GRID_SIZE, students: {}, defenses: {} }, // "row,col" -> id
    rescue: null, // { day, stagesDone, evacuated } once the radio broadcast has come in
    victory: false,
    bossesSlain: [], // boss names, for the epilogue
    pantry: { ...STARTING_PANTRY }, // ingredient id -> count
    dishesToday: [], // DISHES ids served today; their buffs last until the day rolls over
    characters: [],
    rooms: {
      classrooms: Object.fromEntries(
        CLASSROOM_IDS.map((id) => [id, { subject: null, seats: Array(CLASSROOM_CAPACITY).fill(null) }])
      ),
      gym: { studentCapacity: GYM_CAPACITY, teacherCapacity: GYM_MAX_TEACHERS },
      cafeteria: { teacherCapacity: CAFETERIA_MAX_TEACHERS },
      lounge: { studentCapacity: LOUNGE_CAPACITY, recovery: LOUNGE_RECOVERY },
      infirmary: { studentCapacity: INFIRMARY_CAPACITY, teacherCapacity: INFIRMARY_MAX_TEACHERS },
      farm: { studentCapacity: FARM_CAPACITY },
      scrapyard: { studentCapacity: SCRAPYARD_CAPACITY },
      lab: { studentCapacity: LAB_CAPACITY },
    },
    recruitPool: [],
    log: [],
    gameOver: false,
    teamLocations: [null, null, null],
    armory: starterArmory(),
  };

  for (let i = 0; i < 10; i++) {
    state.characters.push(makeCharacter("student", i % 2 === 0 ? "F" : "M"));
  }
  for (let i = 0; i < 3; i++) {
    state.characters.push(makeCharacter("teacher", i % 2 === 0 ? "M" : "F"));
  }

  addLog(state, `Day 1 begins. ${state.characters.length} souls are relying on you.`);
  return state;
}

export function addLog(state, msg) {
  state.log.unshift({ day: state.day, turn: state.turn, msg });
  if (state.log.length > 300) state.log.length = 300;
}

export function getChar(state, id) {
  return state.characters.find((c) => c.id === id);
}

// Also finds pending recruits, who aren't in the roster yet but still need a viewable card.
export function getCharAnywhere(state, id) {
  return getChar(state, id) || state.recruitPool.find((r) => r.id === id) || null;
}

export function renameCharacter(state, id, name) {
  const c = getCharAnywhere(state, id);
  if (!c) return false;
  const raw = (name || "").trim();
  if (!raw) return false;
  if (c.role === "teacher") {
    // Teachers always keep their gender-appropriate honorific — strip whatever the player
    // typed (even an attempt to remove or swap it) and re-derive it, so it can't be dropped.
    const bare = stripHonorific(raw);
    if (!bare) return false;
    c.name = withTeacherHonorific(bare, c.gender).slice(0, 20);
  } else {
    c.name = raw.slice(0, 20);
  }
  return true;
}

// Re-rolls a fresh random pixel-art look without changing identity. Sprite generation is
// deterministic from spriteSeed (falling back to the character's id), so changing the seed to
// a new random string picks a new deterministic look; gender keeps its own art rules.
export function rerollPortrait(state, id) {
  const c = getCharAnywhere(state, id);
  if (!c) return false;
  c.spriteSeed = `${c.id}:${Math.random().toString(36).slice(2, 10)}`;
  return true;
}

export function aliveChars(state) {
  return state.characters.filter((c) => c.alive);
}

export function teacherCount(state) {
  return state.characters.filter((c) => c.role === "teacher" && c.alive).length;
}

// Teachers are rare finds, and the school only has room for so many (MAX_TEACHERS).
function rollRecruitRole(state) {
  if (teacherCount(state) < MAX_TEACHERS && Math.random() < TEACHER_RECRUIT_CHANCE) return "teacher";
  return "student";
}

export function availableChars(state) {
  // alive, not currently on an exploration team or defending
  return aliveChars(state).filter((c) => c.exploreTeam === null && !c.defending);
}

// ---------- room / seat assignment ----------

export function assignSeat(state, studentId, roomId, index) {
  const c = getChar(state, studentId);
  if (!c || c.role !== "student") return false;
  const room = state.rooms.classrooms[roomId];
  if (!room || room.seats[index]) return false;
  // vacate old seat
  if (c.seat) {
    const oldRoom = state.rooms.classrooms[c.seat.room];
    if (oldRoom && oldRoom.seats[c.seat.index] === c.id) oldRoom.seats[c.seat.index] = null;
  }
  room.seats[index] = c.id;
  c.seat = { room: roomId, index };
  return true;
}

export function unseat(state, studentId) {
  const c = getChar(state, studentId);
  if (!c || !c.seat) return;
  const room = state.rooms.classrooms[c.seat.room];
  if (room && room.seats[c.seat.index] === c.id) room.seats[c.seat.index] = null;
  c.seat = null;
}

export function deskPartner(state, studentId) {
  const c = getChar(state, studentId);
  if (!c || !c.seat) return null;
  const deskIndex = Math.floor(c.seat.index / 2);
  const otherIndex = c.seat.index % 2 === 0 ? c.seat.index + 1 : c.seat.index - 1;
  const room = state.rooms.classrooms[c.seat.room];
  const otherId = room.seats[otherIndex];
  return otherId ? getChar(state, otherId) : null;
}

// teacher posts: 'classroom:<roomId>', 'gym', 'cafeteria', 'research', 'crafting', 'council', or null.
// A classroom room has no subject ("Classroom N") until its first teacher is assigned, at which
// point it takes on whichever classroom subject that teacher is best qualified to teach. It
// reverts to unassigned the moment its last teacher leaves, so rooms can be freely repurposed.
export function setTeacherPost(state, teacherId, post) {
  const t = getChar(state, teacherId);
  if (!t || t.role !== "teacher") return false;
  const oldPost = t.post;

  // capacity checks
  if (post && post.startsWith("classroom:")) {
    if (t.stamina <= 0) return false; // too exhausted to teach
    const roomId = post.split(":")[1];
    if (!state.rooms.classrooms[roomId]) return false;
    const count = state.characters.filter((c) => c.role === "teacher" && c.post === post).length;
    if (count >= CLASSROOM_MAX_TEACHERS) return false;
  } else if (post === "gym") {
    const count = state.characters.filter((c) => c.role === "teacher" && c.post === "gym").length;
    if (count >= state.rooms.gym.teacherCapacity) return false;
  } else if (post === "cafeteria") {
    const count = state.characters.filter((c) => c.role === "teacher" && c.post === "cafeteria").length;
    if (count >= state.rooms.cafeteria.teacherCapacity) return false;
  } else if (post === "infirmary") {
    const count = state.characters.filter((c) => c.role === "teacher" && c.post === "infirmary").length;
    if (count >= state.rooms.infirmary.teacherCapacity) return false;
  } else if (post && ["research", "crafting", "council"].includes(post)) {
    const count = state.characters.filter((c) => c.role === "teacher" && c.post === post).length;
    if (count >= 1) return false;
  }

  t.post = post;

  // Leaving a classroom: if no teacher is left there, the room goes back to unassigned.
  if (oldPost && oldPost.startsWith("classroom:") && oldPost !== post) {
    const oldRoom = state.rooms.classrooms[oldPost.split(":")[1]];
    const stillStaffed = state.characters.some((c) => c.role === "teacher" && c.post === oldPost);
    if (oldRoom && !stillStaffed) oldRoom.subject = null;
  }

  // Joining an unassigned classroom: it takes on this teacher's best classroom subject.
  if (post && post.startsWith("classroom:")) {
    const room = state.rooms.classrooms[post.split(":")[1]];
    if (room && room.subject === null) room.subject = bestClassroomSubjectFor(t);
  }

  return true;
}

export function setGymToday(state, studentId, value) {
  const c = getChar(state, studentId);
  if (!c || c.role !== "student") return false;
  if (value) {
    if (c.stamina <= 0) return false; // too exhausted to train
    const count = state.characters.filter((x) => x.gymToday).length;
    if (count >= state.rooms.gym.studentCapacity) return false;
  }
  c.gymToday = value;
  return true;
}

// Resting in the lounge recharges stamina (state.rooms.lounge.recovery) — anyone can rest
// regardless of their current stamina, unlike Gym/exploring which require some left to spend.
export function setLoungeToday(state, studentId, value) {
  const c = getChar(state, studentId);
  if (!c || c.role !== "student") return false;
  if (value) {
    const count = state.characters.filter((x) => x.loungeToday).length;
    if (count >= state.rooms.lounge.studentCapacity) return false;
  }
  c.loungeToday = value;
  return true;
}

export function setInfirmaryToday(state, studentId, value) {
  const c = getChar(state, studentId);
  if (!c || c.role !== "student") return false;
  if (value) {
    const count = state.characters.filter((x) => x.infirmaryToday).length;
    if (count >= state.rooms.infirmary.studentCapacity) return false;
  }
  c.infirmaryToday = value;
  return true;
}

// Outside facilities worked during Turn 2 as an alternative to exploring — a student can do one
// or the other on a given day, never both, so each setter blocks while the other is active.
function makeOutsideFacilitySetter(flagKey, roomKey) {
  return function (state, studentId, value) {
    const c = getChar(state, studentId);
    if (!c || c.role !== "student") return false;
    if (value) {
      if (c.exploreTeam !== null) return false;
      const count = state.characters.filter((x) => x[flagKey]).length;
      if (count >= state.rooms[roomKey].studentCapacity) return false;
    }
    c[flagKey] = value;
    return true;
  };
}

export const setFarmToday = makeOutsideFacilitySetter("farmToday", "farm");
export const setScrapyardToday = makeOutsideFacilitySetter("scrapyardToday", "scrapyard");
export const setLabToday = makeOutsideFacilitySetter("labToday", "lab");

// ---------- room upgrades ----------
// Spends materials to raise one of a room's stats, up to ROOM_UPGRADE_MAX_LEVEL times. A "kind"
// is student/teacher capacity, or the lounge's per-day stamina recovery. Classroom teacher
// capacity is fixed at 1 and can't be upgraded.

// Base (unupgraded) value per room type/kind, used to work out the current upgrade level from the
// room's live value.
const ROOM_BASE_CAPACITY = {
  gym: { student: GYM_CAPACITY, teacher: GYM_MAX_TEACHERS },
  cafeteria: { teacher: CAFETERIA_MAX_TEACHERS },
  lounge: { student: LOUNGE_CAPACITY, recovery: LOUNGE_RECOVERY },
  infirmary: { student: INFIRMARY_CAPACITY }, // one nurse, not upgradeable
  farm: { student: FARM_CAPACITY },
  scrapyard: { student: SCRAPYARD_CAPACITY },
  lab: { student: LAB_CAPACITY },
};
const ROOM_LABELS = {
  gym: "the Gym", cafeteria: "the Cafeteria", lounge: "the Lounge", infirmary: "the Nurse's Office",
  farm: "the Farm", scrapyard: "the Scrapyard", lab: "the Lab",
};
const UPGRADE_FIELD = { student: "studentCapacity", teacher: "teacherCapacity", recovery: "recovery" };
const upgradeIncrement = (roomType, kind) => ROOM_UPGRADE_INCREMENT[`${roomType}${kind[0].toUpperCase()}${kind.slice(1)}`];

function roomUpgradeLevel(state, roomType, roomId, kind) {
  if (roomType === "classroom") {
    const room = state.rooms.classrooms[roomId];
    if (!room) return null;
    return Math.round((room.seats.length - CLASSROOM_CAPACITY) / ROOM_UPGRADE_INCREMENT.classroomStudent);
  }
  const room = state.rooms[roomType];
  if (!room) return null;
  const base = ROOM_BASE_CAPACITY[roomType]?.[kind];
  if (base === undefined) return null;
  return Math.round((room[UPGRADE_FIELD[kind]] - base) / upgradeIncrement(roomType, kind));
}

export function roomUpgradeInfo(state, roomType, roomId, kind) {
  if (roomType === "classroom" && kind === "teacher") return { level: 0, maxed: true, cost: null };
  const level = roomUpgradeLevel(state, roomType, roomId, kind);
  if (level === null) return { level: 0, maxed: true, cost: null };
  const maxed = level >= ROOM_UPGRADE_MAX_LEVEL;
  return { level, maxed, cost: maxed ? null : roomUpgradeCost(level) };
}

export function upgradeRoom(state, roomType, roomId, kind) {
  if (roomType === "classroom" && kind === "teacher") return false;
  const { level, maxed, cost } = roomUpgradeInfo(state, roomType, roomId, kind);
  if (maxed || cost === null) return false;
  if (state.resources.materials < cost) return false;

  let label;
  if (roomType === "classroom") {
    const room = state.rooms.classrooms[roomId];
    room.seats.push(...Array(ROOM_UPGRADE_INCREMENT.classroomStudent).fill(null));
    label = `Classroom ${roomId}`;
  } else {
    state.rooms[roomType][UPGRADE_FIELD[kind]] += upgradeIncrement(roomType, kind);
    label = ROOM_LABELS[roomType];
  }

  state.resources.materials -= cost;
  const what = kind === "recovery" ? "stamina recovery" : `${kind} capacity`;
  addLog(state, `Upgraded ${label}'s ${what} to level ${level + 1} (-${cost} materials).`);
  return true;
}

// ---------- bonds / couples ----------

function bumpBond(state, aId, bId, amount) {
  if (aId === bId) return;
  const a = getChar(state, aId);
  const b = getChar(state, bId);
  if (!a || !b || !a.alive || !b.alive) return;
  a.bonds[bId] = (a.bonds[bId] || 0) + amount;
  b.bonds[aId] = (b.bonds[aId] || 0) + amount;
  maybeFormCouple(state, a, b);
}

function maybeFormCouple(state, a, b) {
  if (a.coupleId || b.coupleId) return;
  if (a.gender === b.gender) return;
  if (a.role !== "student" || b.role !== "student") return;
  const bond = a.bonds[b.id] || 0;
  if (bond >= BOND_COUPLE_THRESHOLD && Math.random() < 0.25) {
    a.coupleId = b.id;
    b.coupleId = a.id;
    for (const stat of ["CHA", "CON"]) {
      const subj = Object.keys(STAT_OF_SUBJECT).find((k) => STAT_OF_SUBJECT[k] === stat);
      a.grades[subj] = clamp(a.grades[subj] + 3, 0, 100);
      b.grades[subj] = clamp(b.grades[subj] + 3, 0, 100);
    }
    addLog(state, `${a.name} and ${b.name} have become a couple! They fight better side by side.`);
  }
}

function teamBondBumps(state, memberIds) {
  for (let i = 0; i < memberIds.length; i++) {
    for (let j = i + 1; j < memberIds.length; j++) {
      bumpBond(state, memberIds[i], memberIds[j], 1);
    }
  }
}

// ---------- xp / grades ----------

function xpThreshold(grade) {
  return 20 + grade * 1.5;
}

const TRAIT_GROWTH_BONUS = 1.3; // +30% xp gain in a trait's matching subject

function traitGrowthMultiplier(c, subject) {
  if (!c.traits || !c.traits.length) return 1;
  const has = c.traits.some((tid) => {
    const t = TRAITS.find((x) => x.id === tid);
    return t && t.subject === subject;
  });
  return has ? TRAIT_GROWTH_BONUS : 1;
}

// ---------- cooking ----------
// Each cook can serve one dish a day; a dish's buff covers the whole school until the day rolls over.

export function dishMultiplier(state, effectKey) {
  return (state.dishesToday || []).reduce((mult, id) => {
    const dish = DISHES.find((d) => d.id === id);
    return mult * (dish?.effect[effectKey] || 1);
  }, 1);
}

export function cooksOnDuty(state) {
  return state.characters.filter((c) => c.role === "teacher" && c.post === "cafeteria" && c.alive);
}

export function canCookDish(state, dish) {
  if (state.dishesToday.includes(dish.id)) return false;
  if (state.dishesToday.length >= cooksOnDuty(state).length) return false;
  if (state.resources.food < dish.food) return false;
  return Object.entries(dish.ingredients).every(([id, n]) => (state.pantry[id] || 0) >= n);
}

export function cookDish(state, dishId) {
  const dish = DISHES.find((d) => d.id === dishId);
  if (!dish || !canCookDish(state, dish)) return false;
  for (const [id, n] of Object.entries(dish.ingredients)) state.pantry[id] -= n;
  state.resources.food -= dish.food;
  state.dishesToday.push(dish.id);
  addLog(state, `The cafeteria serves ${dish.icon} ${dish.name} — ${dish.desc}`);
  return true;
}

function grantXp(state, charId, subject, amount) {
  const c = getChar(state, charId);
  if (!c || !c.alive) return;
  if (c.grades[subject] >= 100) return;
  c.xp[subject] += amount * traitGrowthMultiplier(c, subject) * dishMultiplier(state, "xp");
  let guard = 0;
  while (c.xp[subject] >= xpThreshold(c.grades[subject]) && c.grades[subject] < 100 && guard < 50) {
    c.xp[subject] -= xpThreshold(c.grades[subject]);
    c.grades[subject] = Math.min(100, c.grades[subject] + 1);
    guard++;
  }
  c.maxHp = maxHpFor(c.grades);
}

// ---------- TURN 1: training ----------

export function resolveTraining(state) {
  // classrooms — a good teacher gives seated students a standing effective-grade bonus (see
  // classroomTeachingBonus/effectiveGrade) rather than speeding up their academic growth, so
  // daily XP gain here is teacher-independent.
  for (const roomId of CLASSROOM_IDS) {
    const room = state.rooms.classrooms[roomId];
    const subject = room.subject;
    const studentIds = room.seats.filter(Boolean);
    if (!subject) continue; // no teacher has ever claimed this room yet — nothing is taught here
    for (const sid of studentIds) {
      const c = getChar(state, sid);
      if (!c || !c.alive) continue;
      const gain = 4 + randInt(0, 2);
      grantXp(state, sid, subject, gain);
    }
    if (studentIds.length) {
      addLog(state, `${SUBJECT_LABEL[subject]} class held for ${studentIds.length} student(s).`);
    }

    // Teaching costs the room's one teacher stamina; if they run out, they step down and the
    // room reverts to unassigned until someone rested takes it over.
    const teacher = state.characters.find((c) => c.role === "teacher" && c.post === `classroom:${roomId}` && c.alive);
    if (teacher) {
      teacher.stamina = Math.max(0, teacher.stamina - STAMINA_COST_TEACH);
      if (teacher.stamina === 0) {
        addLog(state, `${teacher.name} is too exhausted to keep teaching and steps down from ${SUBJECT_LABEL[subject]}.`);
        teacher.post = null;
        room.subject = null;
      }
    }
  }

  // gym — no teacher required; one who's assigned adds a training bonus on top.
  const gymTeacherIds = state.characters
    .filter((c) => c.role === "teacher" && c.post === "gym" && c.alive)
    .map((c) => c.id);
  const peBonus = gymTeacherIds.reduce((sum, id) => sum + teachingBonus(getChar(state, id).grades.PE), 0);
  const gymBonus = gymTeacherIds.reduce((sum, id) => sum + teachingBonus(getChar(state, id).grades.Gymnastics), 0);
  const gymStudents = state.characters.filter((c) => c.gymToday && c.alive);
  for (const c of gymStudents) {
    grantXp(state, c.id, "PE", 3 + peBonus + randInt(0, 2));
    grantXp(state, c.id, "Gymnastics", 3 + gymBonus + randInt(0, 2));
    c.stamina = Math.max(0, c.stamina - STAMINA_COST_GYM);
  }
  if (gymStudents.length) addLog(state, `Gym session held for ${gymStudents.length} student(s).`);
  teamBondBumps(state, gymStudents.map((c) => c.id));

  // cafeteria — cooks stretch the rations (their dishes are served on demand, see cookDish) and
  // recharge their own stamina; cooking is how teachers recover.
  const cooks = cooksOnDuty(state);
  if (cooks.length) {
    state.resources.food += 6;
    addLog(state, `${cooks.map((c) => c.name).join(" & ")} stretch${cooks.length === 1 ? "es" : ""} the rations (+6 food).`);
  }
  for (const c of cooks) c.stamina = Math.min(c.maxStamina, c.stamina + STAMINA_RECHARGE_CAFETERIA);

  // lounge — students resting here recover stamina
  const resting = state.characters.filter((c) => c.loungeToday && c.alive);
  for (const c of resting) c.stamina = Math.min(c.maxStamina, c.stamina + state.rooms.lounge.recovery);
  if (resting.length) addLog(state, `${resting.length} student(s) rested in the lounge (+${state.rooms.lounge.recovery} stamina).`);

  // nurse's office — patients heal a big chunk of HP for a little medicine each; a nurse's Biology
  // adds on top. Without medicine to spare, they only get bed rest.
  const nurse = state.characters.find((c) => c.role === "teacher" && c.post === "infirmary" && c.alive);
  const patients = state.characters.filter((c) => c.infirmaryToday && c.alive);
  for (const c of patients) {
    const treated = state.resources.medicine >= INFIRMARY_MEDICINE_PER_PATIENT;
    if (treated) state.resources.medicine -= INFIRMARY_MEDICINE_PER_PATIENT;
    const share = treated ? INFIRMARY_HEAL_BASE + (nurse ? (nurse.grades.Biology / 100) * INFIRMARY_NURSE_BONUS : 0) : INFIRMARY_BED_REST;
    const healed = Math.min(c.maxHp - c.hp, Math.round(c.maxHp * share));
    c.hp += healed;
    c.injured = c.hp < c.maxHp * 0.5;
    addLog(state, `${c.name} ${treated ? "was treated" : "got bed rest (no medicine to spare)"} in the Nurse's Office (+${healed} HP).`);
  }

  // research
  const researcher = state.characters.find((c) => c.role === "teacher" && c.post === "research" && c.alive);
  if (researcher) {
    const gain = 1 + Math.floor(researcher.grades.Physics / 25);
    state.resources.medicine += gain;
    addLog(state, `${researcher.name} synthesizes ${gain} medicine in the research room.`);
  }

  // crafting
  const crafter = state.characters.find((c) => c.role === "teacher" && c.post === "crafting" && c.alive);
  if (crafter && state.resources.materials > 0) {
    const use = Math.min(state.resources.materials, 4);
    state.resources.materials -= use;
    const gain = Math.round((use + crafter.grades.Gymnastics / 20) * 0.8);
    state.fortification = Math.min(FORTIFICATION_CAP, state.fortification + gain);
    addLog(state, `${crafter.name} reinforces the school defenses (+${gain} fortification).`);
  }

  // student council
  const council = state.characters.find((c) => c.role === "teacher" && c.post === "council" && c.alive);
  if (council && Math.random() < 0.15 + council.grades.SocialStudies / 300) {
    const role = rollRecruitRole(state);
    const recruit = makeCharacter(role, Math.random() < 0.5 ? "M" : "F");
    state.recruitPool.push(recruit);
    addLog(state, `${council.name} hears of a survivor, ${recruit.name}, wanting to join.`);
  }

  addLog(state, `Turn 1 (Classes) resolved.`);
}

// ---------- TURN 2: exploration ----------

// Rough 1-4 power tier from an item's total stat bonuses, so harder locations can drop better gear.
function itemTier(t) {
  const sum = Object.values(t.bonuses).reduce((a, b) => a + b, 0);
  return sum <= 4 ? 1 : sum <= 6 ? 2 : sum <= 8 ? 3 : 4;
}

// Legendary gear never drops here — it only arrives on legendary survivors.
function rollExpeditionItem(state, location, success) {
  const chance = success ? EXPEDITION_ITEM_CHANCE + location.difficulty * 0.08 : EXPEDITION_ITEM_CHANCE_FAILED;
  if (Math.random() >= chance) return null;
  const maxTier = Math.min(4, Math.ceil(location.difficulty * 0.8));
  const pool = ITEM_TEMPLATES.filter((t) => itemTier(t) <= maxTier);
  const weighted = pool.flatMap((t) => (t.slot === location.lootBias ? [t, t, t] : [t]));
  const item = makeItem(pick(weighted).id);
  state.armory.push(item);
  return item;
}

function rollExpeditionIngredient(state, location, success) {
  const chance = success ? EXPEDITION_INGREDIENT_CHANCE + (location.ingredientBonus || 0) : EXPEDITION_INGREDIENT_CHANCE_FAILED;
  if (Math.random() >= chance) return null;
  const id = pick(Object.keys(INGREDIENTS));
  const qty = randInt(1, 3);
  state.pantry[id] = (state.pantry[id] || 0) + qty;
  return { id, qty };
}

export function resolveExploration(state) {
  let teamsSent = 0;
  let successes = 0;
  const itemsFound = [];
  const ingredientsFound = [];
  for (let teamIndex = 0; teamIndex < 3; teamIndex++) {
    const locationId = state.teamLocations[teamIndex];
    const location = LOCATIONS.find((l) => l.id === locationId);
    const members = state.characters.filter((c) => c.exploreTeam === teamIndex && c.alive);
    if (!location || !members.length) continue;
    teamsSent++;

    const avg = (statKey) => members.reduce((sum, c) => sum + effectiveGrade(state, c, statKey), 0) / members.length;
    const power = (avg("PE") + avg("Gymnastics")) / 2;
    const safety = (avg("Biology") + avg("Physics")) / 2;
    const wis = avg("History");
    const cha = avg("SocialStudies");

    const requirement = location.difficulty * 15;
    const successChance = clamp01(0.3 + (power - requirement) / 100);
    const success = Math.random() < successChance;

    const lootMult = (0.5 + wis / 100) * (success ? 1 : 0.35);
    const dangerReq = location.danger * 15;
    const baseCasualty = clamp01(0.05 + (dangerReq - safety) / 150) * (success ? 0.5 : 1.2);

    const stewMult = (key) => (key === "materials" ? dishMultiplier(state, "expeditionMaterials") : 1);
    if (success) {
      successes++;
      for (const key of Object.keys(location.rewards)) {
        const amt = Math.round(location.rewards[key] * lootMult * stewMult(key) * (0.8 + Math.random() * 0.4));
        state.resources[key] += amt;
      }
      addLog(state, `${location.name}: expedition succeeded! Loot brought home.`);
    } else {
      for (const key of Object.keys(location.rewards)) {
        const amt = Math.round(location.rewards[key] * lootMult * stewMult(key) * (0.5 + Math.random() * 0.5));
        state.resources[key] += amt;
      }
      addLog(state, `${location.name}: expedition struggled and barely scraped by.`);
      adjustHappiness(state, -HAPPINESS_LOSS_MISSION_FAIL);
    }

    const found = rollExpeditionItem(state, location, success);
    if (found) {
      itemsFound.push(found);
      addLog(state, `The team brought back ${found.icon} ${found.name} from the ${location.name} — it's in the armory.`);
    }
    const ingredient = rollExpeditionIngredient(state, location, success);
    if (ingredient) {
      ingredientsFound.push(ingredient);
      const info = INGREDIENTS[ingredient.id];
      addLog(state, `The team brought back ${info.icon} ${info.name} ×${ingredient.qty} from the ${location.name} for the pantry.`);
    }

    for (const c of members) {
      c.stamina = Math.max(0, c.stamina - STAMINA_COST_EXPLORE);
      const roll = Math.random();
      const personalCasualty = clamp01(baseCasualty - (effectiveGrade(state, c, "Biology") - 40) / 400);
      if (roll < personalCasualty) {
        if (Math.random() < 0.25) {
          killCharacter(state, c);
          addLog(state, `${c.name} was lost during the ${location.name} run.`);
        } else {
          const dmg = randInt(15, 40);
          c.hp = Math.max(1, c.hp - dmg);
          c.injured = c.hp < c.maxHp * 0.5;
          addLog(state, `${c.name} was injured at ${location.name} (-${dmg} HP).`);
        }
      } else {
        grantXp(state, c.id, "PE", 2 + randInt(0, 2));
        grantXp(state, c.id, "Gymnastics", 2 + randInt(0, 2));
      }
    }

    const recruitBonus = location.recruitBonus || 1;
    const recruitChance = clamp01((cha - 20) / 150 * recruitBonus * (success ? 1 : 0.4) * dishMultiplier(state, "recruitChance"));
    if (Math.random() < recruitChance) {
      const role = rollRecruitRole(state);
      const recruit = makeCharacter(role, Math.random() < 0.5 ? "M" : "F");
      state.recruitPool.push(recruit);
      addLog(state, `Your team found a survivor at ${location.name}: ${recruit.name} wants to join.`);
    }

    teamBondBumps(state, members.map((c) => c.id));
  }

  // outside facilities — passive daily yield for students working the Farm/Scrapyard/Lab
  // instead of exploring.
  const farmWorkers = state.characters.filter((c) => c.farmToday && c.alive);
  if (farmWorkers.length) {
    const gain = farmWorkers.length * FARM_YIELD_FOOD;
    state.resources.food += gain;
    addLog(state, `The Farm brings in ${gain} food from ${farmWorkers.length} student(s).`);
  }
  const scrapyardWorkers = state.characters.filter((c) => c.scrapyardToday && c.alive);
  if (scrapyardWorkers.length) {
    const gain = scrapyardWorkers.length * SCRAPYARD_YIELD_MATERIALS;
    state.resources.materials += gain;
    addLog(state, `The Scrapyard salvages ${gain} materials from ${scrapyardWorkers.length} student(s).`);
  }
  const labWorkers = state.characters.filter((c) => c.labToday && c.alive);
  if (labWorkers.length) {
    const gain = labWorkers.length * LAB_YIELD_RESEARCH;
    state.resources.research += gain;
    addLog(state, `The Lab produces ${gain} research from ${labWorkers.length} student(s).`);
  }

  addLog(state, `Turn 2 (Exploration) resolved.`);
  return { teamsSent, successes, itemsFound, ingredientsFound };
}

// ---------- TURN 3: defense (entrance grid battle) ----------
// The whole fight is simulated up front, tick by tick, on the entrance grid: zombies spawn in the
// bottom rows and shamble one row up per tick; each defender hits the most advanced zombie within
// reach (melee weapon or fists first if anything's that close, otherwise their ranged weapon);
// walls block a lane until smashed, traps hurt whatever walks over them. A zombie that walks off
// the top row hits the gate (fortification x2 HP) and, once that's down, breaks into the school.
// Every tick is recorded as a frame so the UI can replay the battle afterwards — state itself is
// resolved immediately, same as every other turn.

const chebyshev = (a, b) => Math.max(Math.abs(a.row - b.row), Math.abs(a.col - b.col));

function shuffled(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Student-zone cells, front line (the row nearest the horde) first.
function studentZoneCells(size) {
  const third = Math.floor(size / 3);
  const cells = [];
  for (let row = third - 1; row >= 0; row--) for (let col = 0; col < size; col++) cells.push(`${row},${col}`);
  return cells;
}

export function firstFreeEntranceCell(state) {
  return studentZoneCells(state.entranceGrid.size).find((k) => !state.entranceGrid.students[k]) || null;
}

function battleStats(state, c) {
  const eq = c.equipment || {};
  const chili = dishMultiplier(state, "battleDamage");
  return {
    melee: eq.meleeWeapon || FIST_WEAPON,
    ranged: eq.rangedWeapon || null,
    meleeMult: (0.5 + effectiveGrade(state, c, "PE") / 100) * chili,
    rangedMult: (0.5 + effectiveGrade(state, c, "Gymnastics") / 100) * chili,
    hitChance: Math.min(0.95, 0.7 + effectiveGrade(state, c, "Gymnastics") / 500),
    armorMult: Math.max(0.4, 1 - effectiveGrade(state, c, "Biology") / 250),
  };
}

export function simulateEntranceBattle(state) {
  const grid = state.entranceGrid;
  const size = grid.size;
  const zStats = zombieStatsForDay(state.day);
  const comp = hordeComposition(state.day);
  const queue = shuffled(["walker", "runner", "brute", "spitter"].flatMap((t) => Array(comp[t]).fill(t)));
  if (comp.boss) queue.push("boss"); // the boss brings up the rear
  const toSpawn = queue.length;
  const spawnRows = [size - 1, size - 2];

  const students = Object.entries(grid.students)
    .map(([key, id]) => ({ key, c: getChar(state, id) }))
    .filter(({ c }) => c && c.alive)
    .map(({ key, c }) => {
      const [row, col] = key.split(",").map(Number);
      return { id: c.id, row, col, hp: c.hp, maxHp: c.maxHp, downed: false, kills: 0, usedMelee: false, usedRanged: false, ...battleStats(state, c) };
    });

  const structures = {};
  for (const [key, structureId] of Object.entries(grid.defenses)) {
    const def = DEFENSE_STRUCTURES.find((d) => d.id === structureId);
    if (!def) continue;
    const [row, col] = key.split(",").map(Number);
    structures[key] = { key, row, col, def, hp: def.hp || 0, destroyed: false };
  }
  const gate = { hp: state.fortification * 2, max: state.fortification * 2 };

  const zombies = [];
  let spawned = 0;
  let killed = 0;
  let breached = 0;
  const frames = [];

  const zombieAt = (row, col) => zombies.find((z) => z.alive && z.row === row && z.col === col);
  const studentAt = (row, col) => students.find((s) => !s.downed && s.row === row && s.col === col);
  const wallAt = (row, col) => {
    const st = structures[`${row},${col}`];
    return st && st.def.blocks && !st.destroyed ? st : null;
  };
  const killZombie = (z, events) => {
    z.alive = false;
    z.killed = true;
    killed++;
    events.push({ type: "kill", at: [z.row, z.col], boss: z.type === "boss" });
  };
  const snapshot = (tick, events) => ({
    tick,
    events,
    zombies: zombies.filter((z) => z.alive).map((z) => ({ id: z.id, type: z.type, row: z.row, col: z.col, hp: z.hp, maxHp: z.maxHp })),
    students: students.map((s) => ({ id: s.id, row: s.row, col: s.col, hp: Math.max(0, s.hp), maxHp: s.maxHp, downed: s.downed })),
    structures: Object.values(structures).map((st) => ({ key: st.key, id: st.def.id, hp: st.hp, maxHp: st.def.hp || 0, destroyed: st.destroyed })),
    gate: { ...gate },
    killed,
    breached,
    spawned,
  });

  frames.push(snapshot(0, []));

  for (let tick = 1; tick <= BATTLE_MAX_TICKS; tick++) {
    const events = [];

    // 1. the next few zombies shamble in, back row first
    for (let n = 0; n < Math.ceil(size / 2) && spawned < toSpawn; n++) {
      const free = [];
      for (const row of spawnRows) for (let col = 0; col < size; col++) if (!zombieAt(row, col)) free.push({ row, col });
      if (!free.length) break;
      const back = free.filter((p) => p.row === size - 1);
      const spot = pick(back.length ? back : free);
      const type = queue[spawned];
      const T = ZOMBIE_TYPES[type];
      const hp = Math.round(zStats.hp * T.hpMult);
      const dmg = Math.max(1, Math.round(zStats.damage * T.dmgMult));
      zombies.push({ id: spawned + 1, type, row: spot.row, col: spot.col, hp, maxHp: hp, dmg, alive: true, snagged: false });
      spawned++;
    }

    // 2. defenders strike
    for (const s of students) {
      if (s.downed) continue;
      const live = zombies.filter((z) => z.alive);
      if (!live.length) break;
      const inMelee = live.filter((z) => chebyshev(s, z) <= s.melee.range);
      const inRanged = s.ranged ? live.filter((z) => chebyshev(s, z) <= s.ranged.range) : [];
      const pool = inMelee.length ? inMelee : inRanged;
      if (!pool.length) continue;
      const target = [...pool].sort((a, b) => a.row - b.row || a.hp - b.hp)[0];
      const useMelee = inMelee.length > 0;
      const weapon = useMelee ? s.melee : s.ranged;
      if (useMelee) s.usedMelee = true;
      else s.usedRanged = true;
      const hit = Math.random() < s.hitChance;
      const dmg = hit ? Math.max(1, Math.round(weapon.damage * (useMelee ? s.meleeMult : s.rangedMult) * (0.85 + Math.random() * 0.3))) : 0;
      target.hp -= dmg;
      events.push({ type: "attack", from: [s.row, s.col], to: [target.row, target.col], zid: target.id, dmg, hit, kind: useMelee ? "melee" : "ranged", icon: weapon.icon });
      if (target.hp <= 0) {
        s.kills++;
        killZombie(target, events);
      }
    }

    // 3. the horde advances, front-most first so the ones behind can step up
    const hurtStudent = (z, s, dmgBase, type, events) => {
      const hit = Math.random() < ZOMBIE_HIT_CHANCE;
      const dmg = hit ? Math.max(1, Math.round(dmgBase * s.armorMult * (0.85 + Math.random() * 0.3))) : 0;
      s.hp -= dmg;
      events.push({ type, from: [z.row, z.col], to: [s.row, s.col], dmg, hit });
      if (s.hp <= 0) {
        s.downed = true;
        events.push({ type: "downed", at: [s.row, s.col], id: s.id });
      }
    };

    // One row forward (or its outcome if something's in the way). Returns true only on a move.
    const advance = (z, T, events) => {
      const ahead = z.row - 1;
      if (ahead < 0) {
        if (gate.hp > 0) {
          gate.hp = Math.max(0, gate.hp - z.dmg);
          events.push({ type: "gate", at: [z.row, z.col], dmg: z.dmg });
        } else {
          z.alive = false;
          breached++;
          events.push({ type: "breach", at: [z.row, z.col] });
        }
        return false;
      }

      const wall = wallAt(ahead, z.col);
      if (wall) {
        const dmg = z.dmg * (T.wallMult || 1);
        wall.hp -= dmg;
        events.push({ type: "smash", at: [ahead, z.col], dmg });
        if (wall.hp <= 0) {
          wall.hp = 0;
          wall.destroyed = true;
          events.push({ type: "destroyed", at: [ahead, z.col] });
        }
        return false;
      }

      // straight ahead if it's clear, otherwise try to shuffle diagonally around whoever's in the way
      const sides = Math.random() < 0.5 ? [z.col - 1, z.col + 1] : [z.col + 1, z.col - 1];
      const destCol = [z.col, ...sides].find(
        (col) => col >= 0 && col < size && !zombieAt(ahead, col) && !studentAt(ahead, col) && !wallAt(ahead, col)
      );
      if (destCol === undefined) return false;
      z.row = ahead;
      z.col = destCol;

      const trap = structures[`${ahead},${destCol}`];
      if (trap && !trap.def.blocks && trap.def.enterDamage) {
        z.hp -= trap.def.enterDamage;
        events.push({ type: "trap", at: [ahead, destCol], dmg: trap.def.enterDamage });
        if (trap.def.slows && !T.unsnaggable) z.snagged = true;
        if (z.hp <= 0) {
          killZombie(z, events);
          return false;
        }
        if (z.snagged) return false;
      }
      return true;
    };

    for (const z of zombies.filter((z) => z.alive).sort((a, b) => a.row - b.row)) {
      const T = ZOMBIE_TYPES[z.type];
      if (z.snagged) {
        z.snagged = false;
        continue;
      }

      const adjacentTo = () =>
        students
          .filter((s) => !s.downed && chebyshev(s, z) <= 1)
          .sort((a, b) => (a.col === z.col ? 0 : 1) - (b.col === z.col ? 0 : 1));
      const adjacent = adjacentTo();
      if (adjacent.length) {
        hurtStudent(z, adjacent[0], z.dmg, "bite", events);
        continue;
      }

      if (T.spitRange) {
        const inRange = students.filter((s) => !s.downed && chebyshev(s, z) <= T.spitRange);
        if (inRange.length) {
          const target = inRange.sort((a, b) => chebyshev(a, z) - chebyshev(b, z))[0];
          hurtStudent(z, target, z.dmg, "spit", events);
          continue;
        }
      }

      for (let step = 0; step < (T.speed || 1); step++) {
        if (step > 0 && adjacentTo().length) break; // closed the distance — it'll bite next turn
        if (!advance(z, T, events)) break;
      }
    }

    frames.push(snapshot(tick, events));
    if (spawned >= toSpawn && !zombies.some((z) => z.alive)) break;
  }

  return {
    size,
    frames,
    spawned,
    killed,
    breached,
    held: zombies.filter((z) => z.alive).length, // still on the field at dawn — they drift off
    bossKilled: zombies.some((z) => z.type === "boss" && z.killed),
    students,
    destroyedKeys: Object.values(structures).filter((st) => st.destroyed).map((st) => st.key),
  };
}

export function resolveDefense(state) {
  // Anyone flagged as defending without a spot on the grid (e.g. an older save) takes the next one.
  for (const c of state.characters.filter((c) => c.defending && c.alive)) {
    if (Object.values(state.entranceGrid.students).includes(c.id)) continue;
    const cell = firstFreeEntranceCell(state);
    if (cell) state.entranceGrid.students[cell] = c.id;
    else c.defending = false;
  }
  const defenders = state.characters.filter((c) => c.defending && c.alive);

  const battle = simulateEntranceBattle(state);
  const { spawned, killed, breached } = battle;
  const bossName = isBossNight(state.day) ? bossNameForDay(state.day) : null;
  addLog(state, `The horde attacks the entrance — ${spawned} zombies shamble out of the dark${bossName ? `, led by ${bossName}` : ""}.`);
  if (!defenders.length) addLog(state, `No one was defending the entrance!`);

  if (bossName && battle.bossKilled) {
    state.bossesSlain.push(bossName);
    state.resources.materials += 25;
    state.resources.food += 15;
    const item = makeItem(pick(ITEM_TEMPLATES.filter((t) => itemTier(t) >= 3)).id);
    state.armory.push(item);
    adjustHappiness(state, HAPPINESS_GAIN_WIN);
    addLog(state, `${bossName} is down! Its hoard: +25 materials, +15 food and ${item.icon} ${item.name}.`);
  } else if (bossName) {
    addLog(state, `${bossName} survived the night and slunk back into the dark.`);
  }

  let downedCount = 0;
  for (const s of battle.students) {
    const c = getChar(state, s.id);
    if (!c) continue;
    if (s.downed) {
      downedCount++;
      c.defending = false; // too hurt to join any chase afterwards
      clearEntranceCellForChar(state, c.id);
      const stabilized = state.resources.medicine >= MEDICINE_PER_STABILIZE;
      const deathChance = clamp01(DOWNED_DEATH_CHANCE - (effectiveGrade(state, c, "Biology") - 40) / 200);
      if (!stabilized && Math.random() < deathChance) {
        killCharacter(state, c);
        addLog(state, `${c.name} fell defending the entrance.`);
      } else {
        if (stabilized) state.resources.medicine -= MEDICINE_PER_STABILIZE;
        c.hp = Math.max(1, Math.round(c.maxHp * 0.1));
        c.injured = true;
        addLog(
          state,
          stabilized
            ? `${c.name} went down at the entrance — patched up with ${MEDICINE_PER_STABILIZE} medicine.`
            : `${c.name} went down at the entrance but was dragged to safety.`
        );
      }
      continue;
    }
    c.hp = Math.max(1, s.hp);
    c.injured = c.hp < c.maxHp * 0.5;
    const killBonus = Math.min(3, s.kills);
    grantXp(state, c.id, "PE", 2 + randInt(0, 2) + (s.usedMelee ? killBonus : 0));
    grantXp(state, c.id, "Gymnastics", 2 + randInt(0, 2) + (s.usedRanged ? killBonus : 0));
    if (s.kills >= 3) addLog(state, `${c.name} cut down ${s.kills} zombies at the entrance.`);
  }

  for (const key of battle.destroyedKeys) {
    const def = DEFENSE_STRUCTURES.find((d) => d.id === state.entranceGrid.defenses[key]);
    delete state.entranceGrid.defenses[key];
    if (def) addLog(state, `The horde smashed a ${def.name} at the entrance to pieces.`);
  }

  if (breached > 0) {
    let hurt = 0;
    for (let i = 0; i < breached; i++) {
      const inside = aliveChars(state).filter((c) => !c.defending);
      const victim = pick(inside.length ? inside : aliveChars(state));
      if (!victim) break;
      if (Math.random() < 0.08) {
        killCharacter(state, victim);
        addLog(state, `A zombie that broke into the school got ${victim.name}.`);
      } else {
        victim.hp = Math.max(1, victim.hp - (randInt(10, 20) + state.day));
        victim.injured = victim.hp < victim.maxHp * 0.5;
        hurt++;
      }
    }
    const lost = Math.round(state.resources.food * Math.min(0.25, breached * 0.04));
    state.resources.food = Math.max(0, state.resources.food - lost);
    adjustHappiness(state, -2 * breached);
    addLog(
      state,
      `${breached} zombie${breached === 1 ? "" : "s"} broke into the school` +
        (hurt ? `, hurting ${hurt} ${hurt === 1 ? "person" : "people"}` : "") +
        (lost ? ` and spoiling ${lost} food` : "") +
        ` before being put down.`
    );
  }

  const won = breached === 0;
  const routed = won && killed === spawned && downedCount === 0;
  if (routed) addLog(state, `The defense was overwhelming. The horde was routed with ease.`);
  else if (won) addLog(state, `The entrance held — ${killed} of ${spawned} zombies were put down.`);

  teamBondBumps(state, defenders.map((c) => c.id));

  // A won battle can lead into one (never both) follow-up: a facility raid demanding an
  // immediate response, or a chance to chase the horde down for a bigger prize.
  if (won) {
    adjustHappiness(state, HAPPINESS_GAIN_WIN);
    if (Math.random() < FACILITY_RAID_CHANCE) {
      const facility = pick(RAIDABLE_FACILITIES);
      state.pendingRaid = { facility };
      addLog(state, `While the entrance held, the horde peeled off toward the ${facility}!`);
    } else if (Math.random() < ASSAULT_CHANCE) {
      state.pendingAssault = true;
      addLog(state, `The horde is retreating — there may be time to chase them down.`);
    }
  }

  addLog(state, `Turn 3 (Defense) resolved.`);
  return {
    won, routed, spawned, killed, breached, downedCount, defenderCount: defenders.length,
    bossName, bossKilled: battle.bossKilled, size: battle.size, frames: battle.frames,
  };
}

// ---------- facility raid ----------

export function setRaidDefender(state, charId, value) {
  const c = getChar(state, charId);
  if (!c || c.role !== "student" || !c.alive) return false;
  if (value) {
    if (!state.raidDefenders.includes(charId)) state.raidDefenders.push(charId);
  } else {
    state.raidDefenders = state.raidDefenders.filter((id) => id !== charId);
  }
  return true;
}

export function resolveFacilityRaid(state) {
  const raid = state.pendingRaid;
  if (!raid) return;
  const defenders = state.raidDefenders.map((id) => getChar(state, id)).filter((c) => c && c.alive);
  const power = defenders.length
    ? defenders.reduce((sum, c) => sum + (effectiveGrade(state, c, "PE") + effectiveGrade(state, c, "Gymnastics")) / 2, 0) / defenders.length
    : 0;
  const successChance = clamp01(0.25 + (power - 40) / 100) * (defenders.length ? 1 : 0.1);
  const success = Math.random() < successChance;
  const room = state.rooms[raid.facility];

  if (success) {
    addLog(state, `The team beat back the raid on the ${raid.facility}.`);
    for (const c of defenders) grantXp(state, c.id, "PE", 2 + randInt(0, 2));
  } else {
    adjustHappiness(state, -HAPPINESS_LOSS_MISSION_FAIL);
    if (room && room.studentCapacity > 1) room.studentCapacity -= 1;
    addLog(state, `The raid on the ${raid.facility} got through — its capacity is damaged until repaired.`);
    for (const c of defenders) {
      if (Math.random() < 0.3) {
        const dmg = randInt(10, 30);
        c.hp = Math.max(1, c.hp - dmg);
        c.injured = c.hp < c.maxHp * 0.5;
        addLog(state, `${c.name} was hurt defending the ${raid.facility} (-${dmg} HP).`);
      }
    }
  }

  state.pendingRaid = null;
  state.raidDefenders = [];
  advanceTurn(state);
}

// ---------- assault (boss fight) ----------

export function resolveAssault(state, chase) {
  if (!state.pendingAssault) return null;
  state.pendingAssault = false;
  if (!chase) {
    addLog(state, `You let the horde go and secured the school for the night.`);
    advanceTurn(state);
    return { chased: false, won: null };
  }

  const squad = state.characters.filter((c) => c.defending && c.alive);
  const power = squad.length
    ? squad.reduce((sum, c) => sum + (effectiveGrade(state, c, "PE") + effectiveGrade(state, c, "Gymnastics")) / 2, 0) / squad.length
    : 0;
  const successChance = clamp01(0.3 + (power - 45) / 100) * (squad.length ? 1 : 0.1);
  const success = Math.random() < successChance;

  if (success) {
    for (const key of ["food", "materials", "medicine"]) {
      const amt = randInt(15, 35);
      state.resources[key] += amt;
    }
    for (const c of squad) grantXp(state, c.id, "PE", 4 + randInt(0, 3));
    addLog(state, `The squad ran down the horde's leader and looted its trail — a big haul.`);

    if (Math.random() < LEGENDARY_CHANCE) {
      const role = rollRecruitRole(state);
      const recruit = makeLegendaryCharacter(role, pick(["M", "F"]));
      // Teachers never fight and have no Inventory tab to manage gear from — hand the item to
      // the shared armory instead of leaving it permanently stuck, unusable, on their sheet.
      if (role === "teacher") {
        const { meleeWeapon, rangedWeapon, armor, accessories } = recruit.equipment;
        for (const item of [meleeWeapon, rangedWeapon, armor, ...accessories]) {
          if (item) state.armory.push(item);
        }
        recruit.equipment = emptyEquipment();
      }
      state.recruitPool.push(recruit);
      addLog(state, `Among the dead, a survivor: ${recruit.name} wants to join the school.`);
    }
  } else {
    for (const c of squad) {
      if (Math.random() < 0.4) {
        const dmg = randInt(10, 30);
        c.hp = Math.max(1, c.hp - dmg);
        c.injured = c.hp < c.maxHp * 0.5;
        addLog(state, `${c.name} was hurt chasing the horde (-${dmg} HP).`);
      }
    }
    addLog(state, `The chase went badly — the squad pulled back empty-handed.`);
  }

  advanceTurn(state);
  return { chased: true, won: success };
}

// ---------- turn advance / reset ----------

// One food per living character (student or teacher) is consumed at the end of each day. Coming
// up short doesn't touch teachers — it hits every student with a flat penalty.
function resolveDailyFoodUpkeep(state) {
  const pop = aliveChars(state).length;
  state.resources.food -= pop;
  if (state.resources.food < 0) {
    state.resources.food = 0;
    addLog(state, `Food ran out! The students go hungry (-20 HP, -10 stamina).`);
    for (const c of state.characters) {
      if (c.role !== "student" || !c.alive) continue;
      c.hp = Math.max(1, c.hp - 20);
      c.injured = c.hp < c.maxHp * 0.5;
      c.stamina = Math.max(0, c.stamina - 10);
    }
    return false;
  }
  return true;
}

// A fed school gets a night's rest: everyone recovers a slice of their max HP, so battle damage
// doesn't just stack up night after night. Going hungry skips it.
const OVERNIGHT_RECOVERY = 0.15;
function resolveOvernightRecovery(state) {
  for (const c of aliveChars(state)) {
    c.hp = Math.min(c.maxHp, c.hp + Math.round(c.maxHp * OVERNIGHT_RECOVERY));
    c.injured = c.hp < c.maxHp * 0.5;
  }
}

// ---------- the rescue ----------

export function antennaReady(state) {
  return !!state.rescue && state.rescue.stagesDone >= ANTENNA_STAGES.length;
}

export function repairAntenna(state) {
  if (!state.rescue) return false;
  const stage = ANTENNA_STAGES[state.rescue.stagesDone];
  if (!stage) return false;
  const cost = Object.entries(stage.cost);
  if (cost.some(([res, amt]) => (state.resources[res] || 0) < amt)) return false;
  for (const [res, amt] of cost) state.resources[res] -= amt;
  state.rescue.stagesDone++;
  addLog(
    state,
    antennaReady(state)
      ? `📡 The antenna is fixed and the school's signal is on the air — now hold out until the helicopters come.`
      : `📡 Antenna repair: ${stage.name} done (${state.rescue.stagesDone}/${ANTENNA_STAGES.length}).`
  );
  return true;
}

// Staying behind after the evacuation turns the run into endless survival.
export function stayAfterRescue(state) {
  state.victory = false;
  addLog(state, `A handful of survivors stay behind to hold the school.`);
}

// Run at the end of each day for the day that's about to start — everything is logged before the
// day number ticks over so it lands in the Day Recap shown right afterwards.
function resolveDayMilestones(state, nextDay) {
  if (!state.rescue && nextDay >= RESCUE_BROADCAST_DAY) {
    state.rescue = { day: Math.max(RESCUE_DAY, nextDay + 10), stagesDone: 0, evacuated: false };
    addLog(
      state,
      `📻 The radio crackles to life: a military evacuation will sweep the city on day ${state.rescue.day}. ` +
        `They'll only find survivors who can signal them — the rooftop antenna has to be repaired by then.`
    );
  }
  if (state.rescue && !state.rescue.evacuated && nextDay >= state.rescue.day && aliveChars(state).length > 0) {
    if (antennaReady(state)) {
      state.victory = true;
      state.rescue.evacuated = true;
      addLog(state, `🚁 Rotor blades over the school! The evacuation found your signal — everyone left alive is flown out.`);
    } else {
      state.rescue.day = nextDay + RESCUE_DELAY_DAYS;
      adjustHappiness(state, -15);
      addLog(state, `🚁 Helicopters circle the city but can't find the school without a working antenna. They'll try again on day ${state.rescue.day}.`);
    }
  }
  if (isBossNight(nextDay + 1)) {
    addLog(state, `☠ Scouts report something huge moving with the horde — ${bossNameForDay(nextDay + 1)} will lead the attack on night ${nextDay + 1}.`);
  } else if (isBossNight(nextDay)) {
    addLog(state, `☠ ${bossNameForDay(nextDay)} leads the horde on night ${nextDay}. Build up the entrance while there's still daylight.`);
  }
}

export function advanceTurn(state) {
  state.turn++;
  if (state.turn > 3) {
    if (resolveDailyFoodUpkeep(state)) resolveOvernightRecovery(state); // end of the day that just finished
    resolveDayMilestones(state, state.day + 1);
    state.dishesToday = []; // the day's meals wear off overnight
    state.turn = 1;
    state.day++;
    addLog(state, `Day ${state.day} begins.`);
    rollRandomEvent(state);
  }
  for (const c of state.characters) {
    c.gymToday = false;
    c.loungeToday = false;
    c.infirmaryToday = false;
    c.farmToday = false;
    c.scrapyardToday = false;
    c.labToday = false;
    c.exploreTeam = null;
    c.defending = false;
  }
  state.entranceGrid.students = {}; // built defenses persist; daily placements don't
  state.teamLocations = [null, null, null];
  checkGameOver(state);
}

// ---------- random events ----------
// Rolled once per day at the night->morning rollover. Happiness skews good vs bad, but never
// removes the chance of either outright.

function rollRandomEvent(state) {
  if (Math.random() >= EVENT_CHANCE) return;
  const goodChance = clamp01(0.5 + (state.happiness - 50) / 100);
  const kind = Math.random() < goodChance ? "good" : "bad";
  const pool = EVENTS.filter((e) => e.kind === kind);
  if (!pool.length) return;
  applyEvent(state, pick(pool));
}

// Generic interpreter for the small effect shape shared by random EVENTS and TECH_TREE
// purchases: plain resource/happiness deltas plus a few special one-off actions.
function applyEffect(state, e) {
  if (!e) return;
  if (e.food) state.resources.food = Math.max(0, state.resources.food + e.food);
  if (e.materials) state.resources.materials = Math.max(0, state.resources.materials + e.materials);
  if (e.medicine) state.resources.medicine = Math.max(0, state.resources.medicine + e.medicine);
  if (e.research) state.resources.research = Math.max(0, state.resources.research + e.research);
  if (e.fortification) state.fortification = Math.min(FORTIFICATION_CAP, state.fortification + e.fortification);
  if (e.happiness) adjustHappiness(state, e.happiness);

  if (e.recruit) {
    const recruit = makeCharacter(e.recruit, pick(["M", "F"]));
    state.recruitPool.push(recruit);
    addLog(state, `${recruit.name} wants to join the school.`);
  }
  if (e.kill) {
    const victims = aliveChars(state);
    if (victims.length) {
      const victim = pick(victims);
      killCharacter(state, victim);
      addLog(state, `${victim.name} did not make it.`);
    }
  }
  if (e.injure) {
    const candidates = aliveChars(state);
    if (candidates.length) {
      const victim = pick(candidates);
      const dmg = randInt(15, 35);
      victim.hp = Math.max(1, victim.hp - dmg);
      victim.injured = victim.hp < victim.maxHp * 0.5;
      addLog(state, `${victim.name} was hurt in the incident (-${dmg} HP).`);
    }
  }
}

function applyEvent(state, event) {
  applyEffect(state, event.effect);
  addLog(state, `${event.kind === "good" ? "📈" : "📉"} Event: ${event.title} — ${event.desc}`);
  state.eventLog.unshift({ day: state.day, id: event.id, kind: event.kind, title: event.title, desc: event.desc });
  if (state.eventLog.length > 10) state.eventLog.length = 10;
}

// ---------- research tech tree ----------

export function buyTech(state, techId) {
  const node = TECH_TREE.find((t) => t.id === techId);
  if (!node) return false;
  if (state.techUnlocked.includes(techId)) return false;
  if (node.requires && !state.techUnlocked.includes(node.requires)) return false;
  if (state.resources.research < node.cost) return false;

  state.resources.research -= node.cost;
  state.techUnlocked.push(techId);
  applyEffect(state, node.effect);
  addLog(state, `Research complete: ${node.name} (-${node.cost} research).`);
  return true;
}

function checkGameOver(state) {
  const pop = aliveChars(state).length;
  if (pop === 0) {
    state.gameOver = true;
    addLog(state, `Everyone is gone. The school has fallen. GAME OVER.`);
  }
}

// ---------- headmaster actions ----------

export const PROMOTE_LEVEL_THRESHOLD = 6; // overallLevel >= 6 (avg grade >= 60)

export function expelCharacter(state, id) {
  const idx = state.characters.findIndex((c) => c.id === id);
  if (idx === -1) return false;
  const c = state.characters[idx];
  unseat(state, id);
  if (c.coupleId) {
    const partner = getChar(state, c.coupleId);
    if (partner) partner.coupleId = null;
  }
  state.characters.splice(idx, 1);
  addLog(state, `${c.name} was expelled from the school.`);
  return true;
}

export function promoteToTeacher(state, id) {
  const c = getChar(state, id);
  if (!c || c.role !== "student") return false;
  if (overallLevel(c) < PROMOTE_LEVEL_THRESHOLD) return false;
  if (teacherCount(state) >= MAX_TEACHERS) return false;
  unseat(state, id);
  c.role = "teacher";
  c.post = null;
  c.exploreTeam = null;
  c.defending = false;
  clearEntranceCellForChar(state, id);
  // Their teaching specialty becomes whatever subject they excelled in as a student.
  c.teachSubject = SUBJECTS.reduce((best, s) => (c.grades[s] > c.grades[best] ? s : best), SUBJECTS[0]);
  c.name = withTeacherHonorific(c.name, c.gender);
  addLog(state, `${c.name} has been promoted to teacher!`);
  return true;
}

export function acceptRecruit(state, index) {
  const recruit = state.recruitPool[index];
  if (!recruit) return false;
  if (recruit.role === "teacher" && teacherCount(state) >= MAX_TEACHERS) {
    addLog(state, `The school has no room for another teacher (${MAX_TEACHERS} max) — ${recruit.name} was turned away.`);
    return false;
  }
  state.characters.push(recruit);
  state.recruitPool.splice(index, 1);
  adjustHappiness(state, HAPPINESS_GAIN_RECRUIT);
  addLog(state, `${recruit.name} joined the school.`);
  return true;
}

export function rejectRecruit(state, index) {
  const recruit = state.recruitPool[index];
  if (!recruit) return false;
  state.recruitPool.splice(index, 1);
  addLog(state, `${recruit.name} was turned away.`);
  return true;
}

// ---------- equipment ----------
// slot is "meleeWeapon", "rangedWeapon", "armor", or "accessory0"/"accessory1"/"accessory2".
// Equipping pulls the item out of the shared armory; unequipping returns it there. Only one
// school's worth of gear exists at a time, so equipping one unit can mean un-equipping another.

function requiredSlotType(slot) {
  if (slot === "meleeWeapon" || slot === "rangedWeapon") return "weapon";
  if (slot === "armor") return "armor";
  return "accessory";
}

// A weapon's `requires` is checked against the character's own raw STR/DEX (their PE/Gymnastics
// grade) — not equipment-boosted — so gear can't bootstrap the strength/dexterity needed to
// wield it in the first place.
export function statValue(c, statKey) {
  const subject = SUBJECTS.find((s) => STAT_OF_SUBJECT[s] === statKey);
  return subject ? c.grades[subject] : 0;
}

export function meetsItemRequirement(c, item) {
  if (!item || !item.requires) return true;
  return Object.entries(item.requires).every(([stat, min]) => statValue(c, stat) >= min);
}

export function equipItem(state, charId, slot, itemUid) {
  const c = getChar(state, charId);
  if (!c) return false;
  const idx = state.armory.findIndex((it) => it.uid === itemUid);
  if (idx === -1) return false;
  const item = state.armory[idx];
  if (item.slot !== requiredSlotType(slot)) return false;
  if (slot === "meleeWeapon" && item.category !== "melee") return false;
  if (slot === "rangedWeapon" && item.category !== "ranged") return false;
  if (!meetsItemRequirement(c, item)) return false;

  state.armory.splice(idx, 1);
  let old;
  if (slot === "meleeWeapon" || slot === "rangedWeapon" || slot === "armor") {
    old = c.equipment[slot];
    c.equipment[slot] = item;
  } else {
    const accIdx = Number(slot.replace("accessory", ""));
    old = c.equipment.accessories[accIdx];
    c.equipment.accessories[accIdx] = item;
  }
  if (old) state.armory.push(old);
  return true;
}

export function unequipItem(state, charId, slot) {
  const c = getChar(state, charId);
  if (!c) return false;
  let old;
  if (slot === "meleeWeapon" || slot === "rangedWeapon" || slot === "armor") {
    old = c.equipment[slot];
    c.equipment[slot] = null;
  } else {
    const accIdx = Number(slot.replace("accessory", ""));
    old = c.equipment.accessories[accIdx];
    c.equipment.accessories[accIdx] = null;
  }
  if (!old) return false;
  state.armory.push(old);
  return true;
}

// ---------- skill tree ----------
// A node needs three things to be buyable: the subject's grade has reached that tier, the
// previous node on the same path is already owned (paths are strictly linear), and the
// character has an unspent skill point (1 earned per level). Purchases are permanent.

export function buySkill(state, charId, subject, tier) {
  const c = getChar(state, charId);
  if (!c) return false;
  if (!c.skills) c.skills = [];
  const key = `${subject}:${tier}`;
  if (c.skills.includes(key)) return false;

  const path = SKILL_TREE[subject];
  const posInPath = path.findIndex((n) => n.tier === tier);
  if (posInPath === -1) return false;

  const gradeIdx = GRADE_TIERS.indexOf(gradeLetter(c.grades[subject]));
  const nodeIdx = GRADE_TIERS.indexOf(tier);
  if (gradeIdx < nodeIdx) return false;

  if (posInPath > 0) {
    const prevKey = `${subject}:${path[posInPath - 1].tier}`;
    if (!c.skills.includes(prevKey)) return false;
  }

  if (availableSkillPoints(c) <= 0) return false;

  c.skills.push(key);
  addLog(state, `${c.name} learned ${path[posInPath].name} (${SUBJECT_LABEL[subject]} — ${tier}).`);
  return true;
}

// ---------- exploration team helpers ----------

export function setExploreTeam(state, charId, teamIndex) {
  const c = getChar(state, charId);
  if (!c || !c.alive) return false;
  if (teamIndex === null) {
    c.exploreTeam = null;
    return true;
  }
  if (c.role !== "student") return false; // teachers stay at the school, never explore
  if (c.stamina <= 0) return false; // too exhausted to go out
  if (c.farmToday || c.scrapyardToday || c.labToday) return false; // already working an outside facility today
  if (teamIndex < 0 || teamIndex > 2) return false;
  const teammateCount = state.characters.filter((x) => x.exploreTeam === teamIndex && x.id !== c.id).length;
  if (teammateCount >= 5) return false;
  c.exploreTeam = teamIndex;
  return true;
}

export function setTeamLocation(state, teamIndex, locationId) {
  if (teamIndex < 0 || teamIndex > 2) return false;
  const usedElsewhere = state.teamLocations.some((l, i) => l === locationId && i !== teamIndex);
  if (locationId && usedElsewhere) return false;
  state.teamLocations[teamIndex] = locationId || null;
  return true;
}

// ---------- fog of war ----------

export function hexKey(q, r) {
  return `${q},${r}`;
}

export function isHexExplored(state, q, r) {
  return state.exploredHexes.includes(hexKey(q, r));
}

function hexDistance(q, r) {
  return (Math.abs(q) + Math.abs(r) + Math.abs(q + r)) / 2;
}

const HEX_NEIGHBOR_OFFSETS = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, -1], [-1, 1]];

// The frontier rule: a hex can only be scouted once it borders the school or a hex someone has
// already scouted — you can't jump into unconnected fog.
export function canScoutHex(state, q, r) {
  if (isHexExplored(state, q, r)) return false;
  return HEX_NEIGHBOR_OFFSETS.some(([dq, dr]) => {
    const nq = q + dq, nr = r + dr;
    return (nq === 0 && nr === 0) || isHexExplored(state, nq, nr);
  });
}

// A cheap, instant scouting errand — separate from committing a full team to loot a location.
// Reveals whatever's on a fogged hex; only a discovered LOCATIONS hex becomes lootable via the
// normal setTeamLocation/setExploreTeam flow afterward. Every new tile risks a zombie encounter
// that grows more likely the farther it is from the school (more encounter types come later).
export function scoutHex(state, studentId, q, r) {
  const c = getChar(state, studentId);
  if (!c || c.role !== "student" || !c.alive) return null;
  if (c.stamina < SCOUT_STAMINA_COST) return null;
  if (!canScoutHex(state, q, r)) return null;

  c.stamina -= SCOUT_STAMINA_COST;

  const encounterChance = clamp01(hexDistance(q, r) * SCOUT_ENCOUNTER_CHANCE_PER_HEX);
  const encountered = Math.random() < encounterChance;
  if (encountered) {
    const power = (effectiveGrade(state, c, "PE") + effectiveGrade(state, c, "Gymnastics")) / 2;
    const winChance = clamp01(0.5 + (power - 40) / 100);
    if (Math.random() >= winChance) {
      c.hp = Math.max(1, c.hp - SCOUT_ENCOUNTER_HP_LOSS);
      c.injured = c.hp < c.maxHp * 0.5;
      addLog(state, `${c.name} was ambushed by a zombie while scouting and fled back to the school (-${SCOUT_ENCOUNTER_HP_LOSS} HP).`);
      return { ambushed: true, encountered: true, location: null };
    }
    const lootKey = pick(["food", "materials", "medicine"]);
    const amt = randInt(5, 15);
    state.resources[lootKey] += amt;
    grantXp(state, c.id, "PE", 3 + randInt(0, 2));
    grantXp(state, c.id, "Gymnastics", 3 + randInt(0, 2));
    addLog(state, `${c.name} fought off a zombie while scouting and salvaged ${amt} ${lootKey}.`);
  }

  state.exploredHexes.push(hexKey(q, r));
  const location = LOCATIONS.find((l) => l.hex.q === q && l.hex.r === r) || null;

  if (location) {
    addLog(state, `${c.name} discovered ${location.name} while scouting.`);
  } else {
    addLog(state, `${c.name} scouted the area and found nothing of interest.`);
  }
  return { ambushed: false, encountered, location };
}

// Removes any grid cell a character occupies, without touching their `defending` flag — used
// wherever `defending` is cleared from elsewhere (setDefending, promotion) so the grid never
// points at a student who isn't actually defending.
function clearEntranceCellForChar(state, charId) {
  const students = state.entranceGrid.students;
  for (const key of Object.keys(students)) {
    if (students[key] === charId) delete students[key];
  }
}

// Checking a defender from the Night Watch list drops them into the first free front-line spot,
// so "defending" always means "standing somewhere on the entrance grid".
export function setDefending(state, charId, value) {
  const c = getChar(state, charId);
  if (!c) return false;
  if (value && c.role !== "student") return false; // teachers never defend either
  if (value) {
    if (!Object.values(state.entranceGrid.students).includes(charId)) {
      const cell = firstFreeEntranceCell(state);
      if (!cell) return false;
      state.entranceGrid.students[cell] = charId;
    }
  } else {
    clearEntranceCellForChar(state, charId);
  }
  c.defending = value;
  return true;
}

// ---------- entrance battle grid ----------

export function placeEntranceStudent(state, cellKey, studentId) {
  const c = getChar(state, studentId);
  if (!c || c.role !== "student" || !c.alive) return false;
  clearEntranceCellForChar(state, studentId);
  state.entranceGrid.students[cellKey] = studentId;
  c.defending = true;
  return true;
}

export function clearEntranceStudentCell(state, cellKey) {
  const studentId = state.entranceGrid.students[cellKey];
  if (!studentId) return false;
  delete state.entranceGrid.students[cellKey];
  const c = getChar(state, studentId);
  if (c) c.defending = false;
  return true;
}

export function buildDefense(state, cellKey, structureId) {
  if (state.entranceGrid.defenses[cellKey]) return false;
  const def = DEFENSE_STRUCTURES.find((d) => d.id === structureId);
  if (!def) return false;
  for (const res of Object.keys(def.cost)) {
    if ((state.resources[res] || 0) < def.cost[res]) return false;
  }
  for (const res of Object.keys(def.cost)) state.resources[res] -= def.cost[res];
  state.entranceGrid.defenses[cellKey] = structureId;
  addLog(state, `Built a ${def.name} at the entrance.`);
  return true;
}

export function clearDefense(state, cellKey) {
  if (!state.entranceGrid.defenses[cellKey]) return false;
  delete state.entranceGrid.defenses[cellKey];
  return true;
}

export { LOCATIONS };
