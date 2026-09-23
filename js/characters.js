import {
  SUBJECTS, MALE_NAMES, FEMALE_NAMES, LAST_NAMES, GRADE_TIERS, GRADE_RANGES,
  STUDENT_TIER_WEIGHTS, TEACHER_SECONDARY_TIERS, TEACHER_SECONDARY_WEIGHTS, TRAITS,
  STAT_OF_SUBJECT, TEACH_BONUS_BY_TIER, ITEM_TEMPLATES, STARTER_ARMORY_IDS, CLASSROOM_SUBJECTS,
  MAX_STAMINA, LEGENDARY_ITEM_TEMPLATES, LEGENDARY_TITLES,
} from "./data.js";

let _idCounter = 1;
export function nextId() {
  return "c" + _idCounter++;
}

let _itemUidCounter = 1;
export function nextItemUid() {
  return "i" + _itemUidCounter++;
}

// Creates a fresh item instance (with its own uid) from a template id.
export function makeItem(templateId) {
  const template = ITEM_TEMPLATES.find((t) => t.id === templateId);
  if (!template) return null;
  return { ...template, bonuses: { ...template.bonuses }, uid: nextItemUid() };
}

export function starterArmory() {
  return STARTER_ARMORY_IDS.map((id) => makeItem(id)).filter(Boolean);
}

export function emptyEquipment() {
  return { meleeWeapon: null, rangedWeapon: null, armor: null, accessories: [null, null, null] };
}

// Sum of a stat's bonuses across everything a character has equipped.
export function equipmentBonus(c, stat) {
  const eq = c.equipment;
  if (!eq) return 0;
  const items = [eq.meleeWeapon, eq.rangedWeapon, eq.armor, ...(eq.accessories || [])].filter(Boolean);
  return items.reduce((sum, it) => sum + (it.bonuses[stat] || 0), 0);
}

// Which of the 4 classroom-eligible subjects a teacher is best qualified to teach — used to
// name a generic classroom the moment it gets its first teacher (PE/Gymnastics never apply
// here even if that's a teacher's specialty; those only happen in the Gym).
export function bestClassroomSubjectFor(t) {
  return CLASSROOM_SUBJECTS.reduce((best, s) => (t.grades[s] > t.grades[best] ? s : best), CLASSROOM_SUBJECTS[0]);
}

// A live bonus a student gets in one subject for as long as they're seated in a classroom
// currently teaching that subject and a teacher is assigned to teach it there — the teacher's
// grade in that subject determines the size (see teachingBonus below). A standing buff, not a
// one-time XP gain, and it follows whatever subject the room is currently teaching.
export function classroomTeachingBonus(state, c, subject) {
  if (c.role !== "student" || !c.seat) return 0;
  const room = state.rooms.classrooms[c.seat.room];
  if (!room || room.subject !== subject) return 0;
  const teachers = state.characters.filter(
    (t) => t.role === "teacher" && t.alive && t.post === `classroom:${c.seat.room}`
  );
  return teachers.reduce((sum, t) => sum + teachingBonus(t.grades[subject]), 0);
}

// A subject's grade plus any equipment bonus to its stat, plus any classroom teaching bonus —
// used for combat/expedition math. Academic grades themselves (and their letter tiers) are
// never touched by either.
export function effectiveGrade(state, c, subject) {
  return c.grades[subject] + equipmentBonus(c, STAT_OF_SUBJECT[subject]) + classroomTeachingBonus(state, c, subject);
}

export function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function randomName(gender) {
  const first = gender === "M" ? pick(MALE_NAMES) : pick(FEMALE_NAMES);
  const last = pick(LAST_NAMES);
  return `${first} ${last}`;
}

// Teachers always carry a gender-appropriate honorific. It's re-derived on every name change
// (creation, promotion, rename) rather than just checked once, so it can never be stripped out.
const TEACHER_HONORIFIC = { M: "Mr.", F: "Mrs." };

export function honorificFor(gender) {
  return TEACHER_HONORIFIC[gender] || "Mr.";
}

// Removes a leading honorific (Mr./Mrs./Ms./Dr./Miss, with or without a period) if present.
export function stripHonorific(name) {
  return (name || "").replace(/^(mr|mrs|ms|dr|miss)\.?\s+/i, "").trim();
}

export function withTeacherHonorific(name, gender) {
  return `${honorificFor(gender)} ${stripHonorific(name)}`.trim();
}

function weightedTierIndex(weights) {
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < weights.length; i++) {
    if (r < weights[i]) return i;
    r -= weights[i];
  }
  return weights.length - 1;
}

function rollGrade(weights) {
  const tier = GRADE_TIERS[weightedTierIndex(weights)];
  const [lo, hi] = GRADE_RANGES[tier];
  return randInt(lo, hi);
}

// Letter grade (F-S) a numeric grade falls into.
export function gradeLetter(value) {
  for (const tier of GRADE_TIERS) {
    const [lo, hi] = GRADE_RANGES[tier];
    if (value >= lo && value <= hi) return tier;
  }
  return value >= 100 ? "S" : "F";
}

// Bumps a numeric grade up one letter tier (e.g. F -> D, A -> S), re-rolling within the new
// tier's range. Since tier ranges are contiguous, the result always exceeds the old tier.
function bumpTier(value) {
  const idx = GRADE_TIERS.indexOf(gradeLetter(value));
  const nextTier = GRADE_TIERS[Math.min(idx + 1, GRADE_TIERS.length - 1)];
  const [lo, hi] = GRADE_RANGES[nextTier];
  return randInt(lo, hi);
}

// Students roll on a table weighted toward low tiers (F is the common default).
export function randomGrades() {
  const grades = {};
  for (const s of SUBJECTS) grades[s] = rollGrade(STUDENT_TIER_WEIGHTS);
  return grades;
}

// Teachers are built completely differently: one randomly chosen specialty subject always
// rolls S rank, and every other subject rolls C/B/A only — never below C, and never S (S is
// reserved for the specialty, so a teacher is always the undisputed best at one specific thing).
export function randomTeacherGrades() {
  const specialty = pick(SUBJECTS);
  const grades = {};
  for (const s of SUBJECTS) {
    if (s === specialty) {
      const [lo, hi] = GRADE_RANGES.S;
      grades[s] = randInt(lo, hi);
    } else {
      const tier = TEACHER_SECONDARY_TIERS[weightedTierIndex(TEACHER_SECONDARY_WEIGHTS)];
      const [lo, hi] = GRADE_RANGES[tier];
      grades[s] = randInt(lo, hi);
    }
  }
  return { grades, specialty };
}

// The bonus a teacher's grade in a subject gives every student in the room while teaching it.
export function teachingBonus(teacherGradeValue) {
  return TEACH_BONUS_BY_TIER[gradeLetter(teacherGradeValue)] || 0;
}

// Every character spawns with 1-3 unique traits, drawn from the shared TRAITS pool.
export function pickTraits() {
  const count = randInt(1, 3);
  const pool = [...TRAITS];
  const chosen = [];
  for (let i = 0; i < count && pool.length; i++) {
    const idx = Math.floor(Math.random() * pool.length);
    chosen.push(pool.splice(idx, 1)[0]);
  }
  return chosen;
}

export function emptyXp() {
  const xp = {};
  for (const s of SUBJECTS) xp[s] = 0;
  return xp;
}

export function conOf(grades) {
  return grades.Biology;
}

export function maxHpFor(grades) {
  return 40 + Math.round(conOf(grades) * 1.2);
}

export function makeCharacter(role, gender) {
  let grades, teachSubject;
  if (role === "teacher") {
    const result = randomTeacherGrades();
    grades = result.grades;
    teachSubject = result.specialty;
  } else {
    grades = randomGrades();
    teachSubject = null;
  }
  const traits = pickTraits();
  for (const t of traits) grades[t.subject] = bumpTier(grades[t.subject]);

  const id = nextId();
  const rawName = randomName(gender);
  return {
    id,
    name: role === "teacher" ? withTeacherHonorific(rawName, gender) : rawName,
    gender, // 'M' | 'F'
    role, // 'student' | 'teacher'
    grades,
    teachSubject, // teachers only: the one subject they specialize in (always S rank)
    traits: traits.map((t) => t.id),
    equipment: emptyEquipment(),
    skills: [], // purchased skill keys, e.g. "PE:D" (students only)
    xp: emptyXp(),
    hp: maxHpFor(grades),
    maxHp: maxHpFor(grades),
    stamina: MAX_STAMINA,
    maxStamina: MAX_STAMINA,
    alive: true,
    injured: false,
    seat: null, // { subject, index } for floor2 classroom seating (students only, persistent "home")
    post: null, // teacher's job post: 'classroom:<subject>' | 'gym' | 'cafeteria' | 'research' | 'crafting' | 'council' | null
    coupleId: null,
    bonds: {}, // otherId -> integer bond strength
    gymToday: false,
    cafeteriaToday: false, // resting in the cafeteria today (students; teachers rest via a post instead)
    exploreTeam: null, // 0,1,2 or null - this turn's exploration assignment (students only)
    defending: false, // this turn's defense assignment (students only)
    log: [],
  };
}

// A named, rare survivor found by winning a Turn 3 Assault boss fight — every grade is a tier
// stronger than a normal roll, and they arrive already carrying one legendary item.
export function makeLegendaryCharacter(role, gender) {
  const c = makeCharacter(role, gender);
  for (const s of SUBJECTS) c.grades[s] = bumpTier(c.grades[s]);
  c.maxHp = maxHpFor(c.grades);
  c.hp = c.maxHp;
  c.legendary = true;

  const title = pick(LEGENDARY_TITLES);
  const baseName = role === "teacher" ? stripHonorific(c.name) : c.name;
  c.name = role === "teacher" ? withTeacherHonorific(`${baseName} ${title}`, gender) : `${baseName} ${title}`;

  const template = pick(LEGENDARY_ITEM_TEMPLATES);
  const item = { ...template, bonuses: { ...template.bonuses }, uid: nextItemUid() };
  if (item.slot === "weapon") c.equipment[item.category === "ranged" ? "rangedWeapon" : "meleeWeapon"] = item;
  else if (item.slot === "armor") c.equipment.armor = item;
  else c.equipment.accessories[0] = item;

  return c;
}

export function overallLevel(c) {
  const vals = SUBJECTS.map((s) => c.grades[s]);
  const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
  return Math.max(1, Math.floor(avg / 10));
}

// 1 skill point is earned per level; spending one on a skill node uses it up permanently.
export function availableSkillPoints(c) {
  return Math.max(0, overallLevel(c) - (c.skills ? c.skills.length : 0));
}

export function statLabelShort(c) {
  return `STR ${c.grades.PE} DEX ${c.grades.Gymnastics} CON ${c.grades.Biology} INT ${c.grades.Physics} WIS ${c.grades.History} CHA ${c.grades.SocialStudies}`;
}
