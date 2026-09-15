import {
  SUBJECTS, CLASSROOM_IDS, CLASSROOM_CAPACITY, CLASSROOM_MAX_TEACHERS,
  GYM_CAPACITY, GYM_MAX_TEACHERS, CAFETERIA_CAPACITY, CAFETERIA_MAX_TEACHERS,
  LOCATIONS, BOND_COUPLE_THRESHOLD, STAT_OF_SUBJECT, TRAITS,
  GRADE_TIERS, SKILL_TREE, SUBJECT_LABEL, MAX_TEACHERS, TEACHER_RECRUIT_CHANCE,
  ROOM_UPGRADE_MAX_LEVEL, ROOM_UPGRADE_INCREMENT, roomUpgradeCost,
  MAX_STAMINA, STAMINA_COST_GYM, STAMINA_COST_EXPLORE, STAMINA_COST_TEACH, STAMINA_RECHARGE_CAFETERIA,
} from "./data.js";
import {
  makeCharacter, randInt, pick, maxHpFor, overallLevel, starterArmory, effectiveGrade,
  gradeLetter, availableSkillPoints, withTeacherHonorific, stripHonorific, teachingBonus,
  bestClassroomSubjectFor,
} from "./characters.js";

const clamp01 = (x) => Math.max(0, Math.min(1, x));
const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));

// ---------- state creation ----------

export function createInitialState() {
  const state = {
    day: 1,
    turn: 1, // 1=training, 2=exploration, 3=defense
    resources: { food: 60, materials: 30, medicine: 20 },
    fortification: 0,
    characters: [],
    rooms: {
      classrooms: Object.fromEntries(
        CLASSROOM_IDS.map((id) => [id, { subject: null, seats: Array(CLASSROOM_CAPACITY).fill(null) }])
      ),
      gym: { studentCapacity: GYM_CAPACITY, teacherCapacity: GYM_MAX_TEACHERS },
      cafeteria: { studentCapacity: CAFETERIA_CAPACITY, teacherCapacity: CAFETERIA_MAX_TEACHERS },
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

// Resting in the cafeteria recharges stamina (see STAMINA_RECHARGE_CAFETERIA) — anyone can rest
// regardless of their current stamina, unlike Gym/exploring which require some left to spend.
export function setCafeteriaToday(state, studentId, value) {
  const c = getChar(state, studentId);
  if (!c || c.role !== "student") return false;
  if (value) {
    const count = state.characters.filter((x) => x.cafeteriaToday).length;
    if (count >= state.rooms.cafeteria.studentCapacity) return false;
  }
  c.cafeteriaToday = value;
  return true;
}

// ---------- room upgrades ----------
// Spends materials to add more capacity to a room, up to ROOM_UPGRADE_MAX_LEVEL times. Classroom
// teacher capacity is fixed at 1 and can't be upgraded — everything else can.

function roomUpgradeLevel(state, roomType, roomId, kind) {
  if (roomType === "classroom") {
    const room = state.rooms.classrooms[roomId];
    if (!room) return null;
    return Math.round((room.seats.length - CLASSROOM_CAPACITY) / ROOM_UPGRADE_INCREMENT.classroomStudent);
  }
  const room = state.rooms[roomType];
  if (!room) return null;
  const base = roomType === "gym" ? (kind === "student" ? GYM_CAPACITY : GYM_MAX_TEACHERS)
    : (kind === "student" ? CAFETERIA_CAPACITY : CAFETERIA_MAX_TEACHERS);
  const inc = ROOM_UPGRADE_INCREMENT[`${roomType}${kind === "student" ? "Student" : "Teacher"}`];
  const field = kind === "student" ? "studentCapacity" : "teacherCapacity";
  return Math.round((room[field] - base) / inc);
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
    const room = state.rooms[roomType];
    const inc = ROOM_UPGRADE_INCREMENT[`${roomType}${kind === "student" ? "Student" : "Teacher"}`];
    const field = kind === "student" ? "studentCapacity" : "teacherCapacity";
    room[field] += inc;
    label = roomType === "gym" ? "the Gym" : "the Cafeteria";
  }

  state.resources.materials -= cost;
  addLog(state, `Upgraded ${label}'s ${kind} capacity to level ${level + 1} (-${cost} materials).`);
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

function grantXp(state, charId, subject, amount) {
  const c = getChar(state, charId);
  if (!c || !c.alive) return;
  if (c.grades[subject] >= 100) return;
  c.xp[subject] += amount * traitGrowthMultiplier(c, subject);
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

  // cafeteria — up to a few teachers cook (heals everyone, stretches food) and, along with any
  // students sent to rest here today, recharge their own stamina.
  const cooks = state.characters.filter((c) => c.role === "teacher" && c.post === "cafeteria" && c.alive);
  if (cooks.length) {
    const healAmt = 4 + cooks.reduce((sum, c) => sum + Math.round(c.grades.Biology / 20), 0);
    for (const c of aliveChars(state)) {
      c.hp = Math.min(c.maxHp, c.hp + healAmt);
      c.injured = c.hp < c.maxHp * 0.5;
    }
    state.resources.food += 6;
    addLog(
      state,
      `${cooks.map((c) => c.name).join(" & ")} cook${cooks.length === 1 ? "s" : ""} a hot meal for everyone (+${healAmt} HP, +6 food).`
    );
  }
  const restingStudents = state.characters.filter((c) => c.cafeteriaToday && c.alive);
  for (const c of [...cooks, ...restingStudents]) {
    c.stamina = Math.min(c.maxStamina, c.stamina + STAMINA_RECHARGE_CAFETERIA);
  }
  if (restingStudents.length) addLog(state, `${restingStudents.length} student(s) rested in the cafeteria.`);

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
    state.fortification = Math.min(60, state.fortification + gain);
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

  // daily food upkeep
  const pop = aliveChars(state).length;
  state.resources.food -= pop;
  if (state.resources.food < 0) {
    const deficit = -state.resources.food;
    state.resources.food = 0;
    addLog(state, `Food ran out! Everyone goes hungry.`);
    for (const c of aliveChars(state)) {
      c.hp = Math.max(1, c.hp - Math.min(10, 2 + Math.round(deficit / Math.max(1, pop))));
      c.injured = c.hp < c.maxHp * 0.5;
    }
  }

  addLog(state, `Turn 1 (Classes) resolved.`);
}

// ---------- TURN 2: exploration ----------

export function resolveExploration(state) {
  for (let teamIndex = 0; teamIndex < 3; teamIndex++) {
    const locationId = state.teamLocations[teamIndex];
    const location = LOCATIONS.find((l) => l.id === locationId);
    const members = state.characters.filter((c) => c.exploreTeam === teamIndex && c.alive);
    if (!location || !members.length) continue;

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

    if (success) {
      for (const key of Object.keys(location.rewards)) {
        const amt = Math.round(location.rewards[key] * lootMult * (0.8 + Math.random() * 0.4));
        state.resources[key] += amt;
      }
      addLog(state, `${location.name}: expedition succeeded! Loot brought home.`);
    } else {
      for (const key of Object.keys(location.rewards)) {
        const amt = Math.round(location.rewards[key] * lootMult * (0.5 + Math.random() * 0.5));
        state.resources[key] += amt;
      }
      addLog(state, `${location.name}: expedition struggled and barely scraped by.`);
    }

    for (const c of members) {
      c.stamina = Math.max(0, c.stamina - STAMINA_COST_EXPLORE);
      const roll = Math.random();
      const personalCasualty = clamp01(baseCasualty - (effectiveGrade(state, c, "Biology") - 40) / 400);
      if (roll < personalCasualty) {
        if (Math.random() < 0.25) {
          c.alive = false;
          c.hp = 0;
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
    const recruitChance = clamp01((cha - 20) / 150) * recruitBonus * (success ? 1 : 0.4);
    if (Math.random() < recruitChance) {
      const role = rollRecruitRole(state);
      const recruit = makeCharacter(role, Math.random() < 0.5 ? "M" : "F");
      state.recruitPool.push(recruit);
      addLog(state, `Your team found a survivor at ${location.name}: ${recruit.name} wants to join.`);
    }

    teamBondBumps(state, members.map((c) => c.id));
  }

  addLog(state, `Turn 2 (Exploration) resolved.`);
}

// ---------- TURN 3: defense ----------

export function resolveDefense(state) {
  const defenders = state.characters.filter((c) => c.defending && c.alive);
  const waveStrength = 22 + state.day * 6 + randInt(-5, 5);
  const defensePower =
    defenders.reduce((sum, c) => sum + (effectiveGrade(state, c, "PE") + effectiveGrade(state, c, "Gymnastics")) / 2, 0) / Math.max(1, defenders.length) *
      Math.sqrt(Math.max(1, defenders.length)) +
    state.fortification;

  const ratio = defenders.length === 0 ? 0 : defensePower / waveStrength;

  let severity; // higher = worse
  if (ratio >= 1.3) severity = 0.05;
  else if (ratio >= 1.0) severity = 0.15;
  else if (ratio >= 0.7) severity = 0.35;
  else severity = 0.6;

  addLog(
    state,
    `The horde attacks! Wave strength ${Math.round(waveStrength)} vs defense ${Math.round(defensePower)}.`
  );

  for (const c of defenders) {
    const personal = clamp01(severity - (effectiveGrade(state, c, "Biology") - 40) / 400);
    if (Math.random() < personal) {
      if (Math.random() < 0.2) {
        c.alive = false;
        c.hp = 0;
        addLog(state, `${c.name} fell defending the entrance.`);
      } else {
        const dmg = randInt(10, 35);
        c.hp = Math.max(1, c.hp - dmg);
        c.injured = c.hp < c.maxHp * 0.5;
        addLog(state, `${c.name} was wounded defending the entrance (-${dmg} HP).`);
      }
    } else {
      grantXp(state, c.id, "PE", 2 + randInt(0, 2));
      grantXp(state, c.id, "Gymnastics", 2 + randInt(0, 2));
    }
  }

  if (ratio < 0.7) {
    const lost = Math.round(state.resources.food * 0.15);
    state.resources.food = Math.max(0, state.resources.food - lost);
    addLog(state, `The horde breached the entrance and spoiled ${lost} food before being pushed back.`);
    if (defenders.length === 0) {
      addLog(state, `No one was defending the entrance!`);
    }
  } else if (ratio >= 1.3) {
    addLog(state, `The defense was overwhelming. The horde was routed with ease.`);
  }

  teamBondBumps(state, defenders.map((c) => c.id));

  addLog(state, `Turn 3 (Defense) resolved.`);
}

// ---------- turn advance / reset ----------

export function advanceTurn(state) {
  state.turn++;
  if (state.turn > 3) {
    state.turn = 1;
    state.day++;
    addLog(state, `Day ${state.day} begins.`);
  }
  for (const c of state.characters) {
    c.gymToday = false;
    c.cafeteriaToday = false;
    c.exploreTeam = null;
    c.defending = false;
  }
  state.teamLocations = [null, null, null];
  checkGameOver(state);
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
// slot is "weapon", "armor", or "accessory0"/"accessory1"/"accessory2". Equipping pulls the
// item out of the shared armory; unequipping returns it there. Only one school's worth of gear
// exists at a time, so equipping one unit can mean un-equipping another first.

function requiredSlotType(slot) {
  if (slot === "weapon" || slot === "armor") return slot;
  return "accessory";
}

export function equipItem(state, charId, slot, itemUid) {
  const c = getChar(state, charId);
  if (!c) return false;
  const idx = state.armory.findIndex((it) => it.uid === itemUid);
  if (idx === -1) return false;
  const item = state.armory[idx];
  if (item.slot !== requiredSlotType(slot)) return false;

  state.armory.splice(idx, 1);
  let old;
  if (slot === "weapon" || slot === "armor") {
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
  if (slot === "weapon" || slot === "armor") {
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

export function setDefending(state, charId, value) {
  const c = getChar(state, charId);
  if (!c) return false;
  if (value && c.role !== "student") return false; // teachers never defend either
  c.defending = value;
  return true;
}

export { LOCATIONS };
