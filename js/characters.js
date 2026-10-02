import {
  SUBJECTS, MALE_NAMES, FEMALE_NAMES, LAST_NAMES, GRADE_TIERS, GRADE_RANGES,
  STUDENT_TIER_WEIGHTS, TEACHER_SECONDARY_TIERS, TEACHER_SECONDARY_WEIGHTS, TRAITS,
  STAT_OF_SUBJECT, TEACH_BONUS_BY_TIER, ITEM_TEMPLATES, STARTER_ARMORY_IDS, CLASSROOM_SUBJECTS,
  LEGENDARY_ITEM_TEMPLATES, LEGENDARY_TITLES, STAT_TUNING, NAME_PART_MAX,
} from "./data.js";

let _idCounter = 1;
export function nextId() {
  return "c" + _idCounter++;
}

let _itemUidCounter = 1;
export function nextItemUid() {
  return "i" + _itemUidCounter++;
}

// The counters above start from 1 on every page load, but a loaded save already uses ids — so
// after loading, move them past the highest ones in the save, and give a fresh id to anything
// that an older build (which didn't do this) let share an id. Returns how many were repaired.
export function repairIds(state) {
  const num = (id) => Number(String(id).slice(1)) || 0;
  const chars = [...state.characters, ...(state.recruitPool || [])];
  const gear = (ch) => {
    const e = ch.equipment || {};
    return [e.meleeWeapon, e.rangedWeapon, e.armor, ...(e.accessories || [])];
  };
  const items = [...(state.armory || []), ...chars.flatMap(gear)].filter(Boolean);
  _idCounter = Math.max(_idCounter, ...chars.map((ch) => num(ch.id) + 1));
  _itemUidCounter = Math.max(_itemUidCounter, ...items.map((it) => num(it.uid) + 1));

  let repaired = 0;
  const seenChars = new Set();
  for (const ch of chars) {
    if (seenChars.has(ch.id)) {
      ch.id = nextId();
      ch.seat = null; // the classroom seat still points at the other holder of the old id
      repaired++;
    }
    seenChars.add(ch.id);
  }
  const seenItems = new Set();
  for (const it of items) {
    if (seenItems.has(it.uid)) {
      it.uid = nextItemUid();
      repaired++;
    }
    seenItems.add(it.uid);
  }
  return repaired;
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

// A subject's grade plus any equipment bonus to its stat — used for combat/expedition math.
export function effectiveGrade(state, c, subject) {
  return c.grades[subject] + equipmentBonus(c, STAT_OF_SUBJECT[subject]);
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

// Keeps a character's name to "First Last", each at most NAME_PART_MAX letters (plus a teacher's
// honorific and a legendary's title). `reroll`: a part that's too long gets a fresh name from the
// pools (old saves) instead of being cut short (renames).
export function fitName(name, gender, role, { reroll = false } = {}) {
  const title = LEGENDARY_TITLES.find((t) => name.endsWith(` ${t}`));
  const words = stripHonorific(title ? name.slice(0, -title.length - 1) : name).split(/\s+/).filter(Boolean);
  const fit = (part, pool) => (!part ? pick(pool) : part.length <= NAME_PART_MAX ? part : reroll ? pick(pool) : part.slice(0, NAME_PART_MAX));
  const first = fit(words[0], gender === "M" ? MALE_NAMES : FEMALE_NAMES);
  const last = fit(words[1], LAST_NAMES);
  const full = `${first} ${last}${title ? ` ${title}` : ""}`;
  return role === "teacher" ? withTeacherHonorific(full, gender) : full;
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

// ---------- a student's grade caps ----------
// Nobody masters everything: every student has a favourite subject (the only one that can reach
// S), a second one (up to A), and the other four top out at B. They're picked when the student
// arrives — a talent's subject first, then whatever they're already best at — and their grades are
// held to them (classes, training and experience all stop there). Teachers aren't capped this way.
export const STUDENT_CAPS = { favorite: GRADE_RANGES.S[1], secondary: GRADE_RANGES.A[1], other: GRADE_RANGES.B[1] };
export function gradeCap(c, subject) {
  if (!c || c.role !== "student" || !c.favorite) return 100;
  return subject === c.favorite ? STUDENT_CAPS.favorite : subject === c.secondary ? STUDENT_CAPS.secondary : STUDENT_CAPS.other;
}
export const gradeCapLetter = (c, subject) => gradeLetter(gradeCap(c, subject));
export function assignStudentFocus(c) {
  if (!c || c.role !== "student") return;
  const talents = (c.traits || []).map((id) => TRAITS.find((t) => t.id === id)?.subject).filter(Boolean);
  const order = SUBJECTS.map((s) => [s, (talents.includes(s) ? 1000 : 0) + c.grades[s] + Math.random() * 0.5]).sort((a, b) => b[1] - a[1]).map(([s]) => s);
  c.favorite = order[0];
  c.secondary = order[1];
  for (const s of SUBJECTS) c.grades[s] = Math.min(c.grades[s], gradeCap(c, s));
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

// Teachers are built completely differently: one randomly chosen specialty subject rolls A rank
// (legendary teachers get bumped to S), and every other subject rolls D/C/B only, so a teacher is
// always the undisputed best at one specific thing (see capTeacherGrades).
export function randomTeacherGrades() {
  const specialty = pick(SUBJECTS);
  const grades = {};
  for (const s of SUBJECTS) {
    if (s === specialty) {
      const [lo, hi] = GRADE_RANGES.A;
      grades[s] = randInt(lo, hi);
    } else {
      const tier = TEACHER_SECONDARY_TIERS[weightedTierIndex(TEACHER_SECONDARY_WEIGHTS)];
      const [lo, hi] = GRADE_RANGES[tier];
      grades[s] = randInt(lo, hi);
    }
  }
  return { grades, specialty };
}

// A teacher's specialty is always their best grade: every other grade sits at least one rank
// below it (an A in Biology means nothing above B elsewhere). Grades over that are lowered to the
// top of the rank below. Only legendary teachers can be S rank — anyone else tops out at A.
export function capTeacherGrades(c) {
  if (c.role !== "teacher" || !c.teachSubject) return;
  if (!c.legendary) c.grades[c.teachSubject] = Math.min(c.grades[c.teachSubject], GRADE_RANGES.A[1]);
  const top = c.grades[c.teachSubject];
  const rank = GRADE_TIERS.indexOf(gradeLetter(top));
  const cap = rank > 0 ? GRADE_RANGES[GRADE_TIERS[rank - 1]][1] : top;
  for (const s of SUBJECTS) {
    if (s !== c.teachSubject && c.grades[s] > cap) c.grades[s] = cap;
  }
}

// The grade points a teacher adds to every student in their classroom each day, by their grade.
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

// Max stamina is built like max HP: mostly DEX, partly WIS (Gymnastics + History), plus Gym
// training — about 65 for a new student.
export function maxStaminaFor(c) {
  const fromStats = Math.round(c.grades.Gymnastics * STAT_TUNING.staminaPerDex + c.grades.History * STAT_TUNING.staminaPerWis);
  return Math.max(STAT_TUNING.staminaMin, fromStats) + (c.trainedStamina || 0);
}

// Max HP is mostly CON, partly STR (before any Gym training).
export function maxHpFor(grades) {
  return STAT_TUNING.hpBase + Math.round(conOf(grades) * STAT_TUNING.hpPerCon + grades.PE * STAT_TUNING.hpPerStr);
}

// How many skills a character has learned on one subject's path.
export function skillCount(c, subject) {
  return (c.skills || []).filter((key) => key.startsWith(`${subject}:`)).length;
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
  // Talents are a student thing — teachers don't train, so they get none.
  const traits = role === "teacher" ? [] : pickTraits();
  for (const t of traits) grades[t.subject] = bumpTier(grades[t.subject]);

  const id = nextId();
  const rawName = randomName(gender);
  const c = {
    id,
    name: role === "teacher" ? withTeacherHonorific(rawName, gender) : rawName,
    gender, // 'M' | 'F'
    role, // 'student' | 'teacher'
    grades,
    teachSubject, // teachers only: the subject they specialize in — always their best grade (capTeacherGrades)
    traits: traits.map((t) => t.id),
    equipment: emptyEquipment(),
    skills: [], // purchased skill keys, e.g. "PE:D" (students only)
    xp: emptyXp(),
    hp: maxHpFor(grades),
    maxHp: maxHpFor(grades),
    stamina: maxStaminaFor({ grades }),
    maxStamina: maxStaminaFor({ grades }),
    alive: true,
    injured: false,
    seat: null, // { subject, index } for floor2 classroom seating (students only, persistent "home")
    post: null, // teacher's job post: 'classroom:<subject>' | 'gym' | 'cafeteria' | 'research' | 'crafting' | 'radio' | null
    gymToday: false,
    radioToday: false, // on the air at the Radio Station today (students)
    researchToday: false, // assisting in the Research Room today (students)
    craftingToday: false, // helping in the Crafting Room today (students)
    level: 1, // students: 1 to STUDENT_MAX_LEVEL, from experience (see gainExp)
    exp: 0,
    infirmaryToday: false, // a patient in the Nurse's Office today: "heal" or false (students)
    restToday: false, // resting in the Cafeteria today (students)
    exploreTeam: null, // 0,1,2 or null - this turn's exploration assignment (students only)
    defending: false, // this turn's defense assignment (students only)
    log: [],
  };
  // a student's favourite and second subjects (their grade caps)
  assignStudentFocus(c);
  c.maxHp = c.hp = maxHpFor(c.grades);
  c.maxStamina = c.stamina = maxStaminaFor(c);
  return c;
}

// A named, rare survivor found by winning a Turn 3 Assault boss fight — every grade is a tier
// stronger than a normal roll, and they arrive already carrying one legendary item.
export function makeLegendaryItem(template = pick(LEGENDARY_ITEM_TEMPLATES)) {
  return { ...template, bonuses: { ...template.bonuses }, uid: nextItemUid() };
}

export function makeLegendaryCharacter(role, gender) {
  const c = makeCharacter(role, gender);
  for (const s of SUBJECTS) c.grades[s] = bumpTier(c.grades[s]);
  assignStudentFocus(c); // (the bump may have pushed a grade past its cap)
  c.legendary = true;
  if (role === "student") c.level = 5; // a legendary survivor arrives seasoned
  capTeacherGrades(c); // a legendary teacher's specialty is S, the rest A at most
  c.maxHp = maxHpFor(c.grades);
  c.hp = c.maxHp;
  c.maxStamina = maxStaminaFor(c);
  c.stamina = c.maxStamina;

  const title = pick(LEGENDARY_TITLES);
  const baseName = role === "teacher" ? stripHonorific(c.name) : c.name;
  c.name = role === "teacher" ? withTeacherHonorific(`${baseName} ${title}`, gender) : `${baseName} ${title}`;

  const item = makeLegendaryItem();
  if (item.slot === "weapon") c.equipment[item.category === "ranged" ? "rangedWeapon" : "meleeWeapon"] = item;
  else if (item.slot === "armor") c.equipment.armor = item;
  else c.equipment.accessories[0] = item;

  return c;
}

// A student's level, earned through experience (see gainExp in game.js).
export function overallLevel(c) {
  return c.level || 1;
}

// 1 skill point is earned per level; spending one on a skill node uses it up permanently.
export function availableSkillPoints(c) {
  return Math.max(0, overallLevel(c) - (c.skills ? c.skills.length : 0));
}

export function statLabelShort(c) {
  return `STR ${c.grades.PE} DEX ${c.grades.Gymnastics} CON ${c.grades.Biology} INT ${c.grades.Physics} WIS ${c.grades.History} CHA ${c.grades.SocialStudies}`;
}
