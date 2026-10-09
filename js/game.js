import {
  SUBJECTS, CLASSROOM_IDS, CLASSROOM_CAPACITY, CLASSROOM_MAX_TEACHERS,
  GYM_CAPACITY, GYM_MAX_TEACHERS, CAFETERIA_MAX_TEACHERS,
  RESEARCH_ROOM_TEACHERS, RESEARCH_ROOM_INT_PER_POINT, RESOURCE_NAME,
  FARM_CAPACITY, SCRAPYARD_CAPACITY,
  FARM_YIELD_FOOD, SCRAPYARD_YIELD_MATERIALS, FORTIFICATION_CAP, FORTIFICATION_PER_POINT,
  LOCATIONS, STAT_OF_SUBJECT, TRAITS,
  GRADE_TIERS, SKILL_TREE, SUBJECT_LABEL, GYM_SIDES, TEACHER_RECRUIT_CHANCE,
  ROOM_LEVELS, ROOM_MAX_LEVEL, OFFICE_PROMOTION_SLOTS, OFFICE_RECRUIT_SLOTS, ROOM_STAT_BONUS_BY_LEVEL, NO_TEACHER_CAP, ROOM_TEACHER_LEVELS, ROOM_REPAIR_COST, roomUpgradeCost,
  CAFETERIA_RATIONS_BY_LEVEL, RESEARCH_BONUS_BY_LEVEL, CRAFTING_BONUS_BY_LEVEL,
  STAMINA_COST_EXPLORE, EXPLORE_ROLES, EXPLORE_TEAM_COSTS, EXPLORE_TEAM_SLOTS, EXPLORE_TEAMWORK_BONUS, EXPEDITION_NEED, EXPEDITION_ODDS_AT_NEED, EXPEDITION_POWER_PER_PERCENT, EXPEDITION_ODDS_RANGE, EXPEDITION_LOOT, EXPEDITION_ENCOUNTERS, ENCOUNTER_CHANCE, ENCOUNTER_EFFECT, INFECTION_DAYS, INFECTION_CHANCE_DOWNED,
  HAPPINESS_START, HAPPINESS_MIN, HAPPINESS_MAX, HAPPINESS_GAIN_WIN, HAPPINESS_GAIN_RECRUIT,
  HAPPINESS_LOSS_MISSION_FAIL, HAPPINESS_LOSS_DEATH,
  FACILITY_RAID_CHANCE, ASSAULT_CHANCE, RAIDABLE_FACILITIES, LEGENDARY_CHANCE, LEGENDARY_TEACHER_CHANCE,
  EVENT_CHANCE, EVENTS, TECH_TREE,
  SCOUT_STAMINA_COST, SCOUT_ENCOUNTER_CHANCE_PER_HEX, SCOUT_ENCOUNTER_HP_LOSS,
  ENTRANCE_GRID_SIZE, ENTRANCE_ZONES, ENTRANCE_ROWS, DEFENSE_ROW0, STREET_ROW0, DEFENSE_STRUCTURES,
  NIGHT_ACTIONS, MOLOTOV_DAMAGE, BATTLE_CRIT, NIGHT_CLASSES, NIGHT_ABILITY2_SKILLS, NIGHT_ABILITY3_SKILLS, NIGHT_MORALE, THROWN_ROCKS, ZOMBIE_WALK_EVERY, NIGHT_CONDITIONS, NIGHT_STAR_REWARD,
  EXPEDITION_ROOM, EXPEDITION_NOISE, expeditionShare, ROOM_EVENTS, ROOM_EVENT_STARTS, ROOM_EVENT_CHANCE, ROOM_EVENT_ODDS, ZOMBIE_HIT_CHANCE, FIST_WEAPON, BATTLE_MAX_TICKS, DOWNED_DEATH_CHANCE, MEDICINE_PER_STABILIZE,
  zombieStatsForDay, zombieCountForDay, ZOMBIE_TYPES, ZOMBIE_SMASH, hordeComposition, isBossNight, bossNameForDay,
  RADIO_UPGRADES, RADIO_CHA_PER_PERCENT, STUDENT_MAX_LEVEL, xpToNextLevel, LEVEL_XP, CRAFT_HELP_WIS_PER_POINT, SITE_STAT, RESCUE_ARRIVAL_DAYS, RESCUE_DELAY_DAYS,
  EXPEDITION_ITEM_CHANCE, EXPEDITION_ITEM_CHANCE_FAILED,
  INFIRMARY_CAPACITY, INFIRMARY_MAX_TEACHERS, INFIRMARY_MEDICINE_PER_PATIENT, INFIRMARY_HEAL_BY_LEVEL, CAFETERIA_REST_BY_LEVEL,
  INFIRMARY_NURSE_HP_PER_RANK, INFIRMARY_BED_REST, INGREDIENTS, STARTING_PANTRY, DISHES, SCAVENGED_INGREDIENTS, PRODUCERS, FARM_CROPS, FARM_GROUPS, FARM_SLOTS_BY_LEVEL, FARM_WORKERS_BY_LEVEL, FARM_STAMINA_COST, PLOTS_PER_WORKER, STARTING_STOCK,
  YARD_JOBS, YARD_GROUPS, YARD_SLOTS_BY_LEVEL, YARD_STAMINA_COST, WORK_SITES,
  GREENHOUSE_JOBS, GREENHOUSE_GROUPS, GREENHOUSE_SLOTS_BY_LEVEL, GREENHOUSE_STAMINA_COST, GREENHOUSE_YIELD_MEDICINE,
  EXPEDITION_SEED_CHANCE, EXPEDITION_SEED_CHANCE_FAILED,
  EXPEDITION_INGREDIENT_CHANCE, EXPEDITION_INGREDIENT_CHANCE_FAILED,
  STAT_TUNING, SKILL_EFFECTS, BOARDED_ROOMS, ROOM_ZOMBIE, ROOM_FIGHT_SQUAD, ROOM_FIGHT_STAMINA, ROOM_FIGHT_MAX_ROUNDS,
  OBJECTIVES, HEX_FINDS, CACHE_RESOURCE, NEST_SCOUT_DANGER, NEST_EXPEDITION_PENALTY, NEST_CLEAR_STAMINA, NEST_CLEAR_MAX,
  MAP_DROPS, MAP_DROP_CHANCE, MAP_DROP_MAX, MAP_DROP_DAYS, HORDE_START_RING, LANDMARKS, RAID_MAX_TEAM, RAID_MAX_ROUNDS, RAID_BOSS_SCALING, ITEM_DROP_ODDS, RARITIES,
  LEGENDARY_TITLES, MAP_MILESTONES,
} from "./data.js";
import { hexTerrain, TERRAIN_NAMES, locationAt, isSchoolHex, SCHOOL_RADIUS, MAP_RADIUS } from "./map.js";
import {
  makeCharacter, makeLegendaryCharacter, capTeacherGrades, randInt, pick, maxHpFor, overallLevel, starterArmory, effectiveGrade,
  gradeLetter, availableSkillPoints, withTeacherHonorific, stripHonorific, fitName, teachingBonus,
  bestClassroomSubjectFor, emptyEquipment, makeLegendaryItem, rollItem, weaponCategory, maxStaminaFor, skillCount, gradeCap,
} from "./characters.js";

const clamp01 = (x) => Math.max(0, Math.min(1, x));
const TUNE = STAT_TUNING;

// The stacked bonus from every skill a character has learned on a subject's path.
export function skillBonus(c, subject) {
  return skillCount(c, subject) * SKILL_EFFECTS[subject].per;
}

// A squad's shared fight modifiers: the most aware member warns everyone (less damage taken), the
// most charismatic leads (more damage dealt), and their average smarts sharpen traps and walls.
export function squadModifiers(state, members) {
  const grade = (c, s) => effectiveGrade(state, c, s);
  const best = (s) => members.reduce((m, c) => Math.max(m, grade(c, s)), 0);
  const avgInt = members.length ? members.reduce((sum, c) => sum + grade(c, "Physics"), 0) / members.length : 0;
  return {
    damageTaken: 1 - Math.min(TUNE.awarenessCap, best("History") * TUNE.awarenessPerWis),
    damageDealt: 1 + best("SocialStudies") * TUNE.leadershipPerCha,
    trapMult: 1 + avgInt * TUNE.trapPerInt,
    wallMult: 1 + avgInt * TUNE.wallPerInt,
  };
}
const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));

export function adjustHappiness(state, amount) {
  const change = amount < 0 ? Math.round(amount * (1 - techPerk(state, "happinessLossReduction"))) : amount;
  state.happiness = clamp(state.happiness + change, HAPPINESS_MIN, HAPPINESS_MAX);
}

// A character dying affects happiness no matter which turn/system caused it, so every death
// goes through this instead of setting c.alive directly.
function killCharacter(state, c) {
  c.alive = false;
  c.hp = 0;
  c.diedOnDay = state.day;
  adjustHappiness(state, -HAPPINESS_LOSS_DEATH);
}

// ---------- infection ----------
// See INFECTION_DAYS in data.js. c.infection = { dueDay }: cured with a serum by the end of that
// day, or they die. The infected are quarantined in the Nurse's Office, out of every job and post.

export const isInfected = (c) => !!(c && c.alive && c.infection);
export const infectedChars = (state) => state.characters.filter(isInfected);

// Whole days an infected character has left after today; 0 means today is their last (they die tonight).
export const infectionDaysLeft = (state, c) => c.infection.dueDay - state.day;

export function infect(state, c, how) {
  if (!c || !c.alive || c.infection) return false;
  if (Math.random() < techPerk(state, "infectionResist")) return false; // Hygiene: shrugged it off
  if (c.role === "teacher" && c.post) setTeacherPost(state, c.id, null);
  c.infection = { dueDay: state.day + INFECTION_DAYS };
  Object.assign(c, { gymToday: false, radioToday: false, researchToday: false, craftingToday: false, infirmaryToday: false, restToday: false, farmToday: false, barnToday: false, scrapyardToday: false, greenhouseToday: false, exploreTeam: null, defending: false });
  clearEntranceCellForChar(state, c.id);
  state.raidDefenders = (state.raidDefenders || []).filter((id) => id !== c.id);
  addLog(state, `🦠 ${c.name} ${how} and is infected! Quarantined in the Nurse's Office — cure them with antiviral serum by the end of day ${c.infection.dueDay}, or they die.`);
  return true;
}

export function cureInfection(state, id) {
  const c = getChar(state, id);
  if (!isInfected(c) || state.resources.serum < 1) return false;
  state.resources.serum--;
  delete c.infection;
  addLog(state, `💉 ${c.name} was cured with a vial of antiviral serum and is back on their feet.`);
  return true;
}

// End of the day: anyone whose time ran out dies.
function resolveInfections(state) {
  for (const c of infectedChars(state)) {
    if (state.day < c.infection.dueDay) continue;
    killCharacter(state, c);
    addLog(state, `🦠 ${c.name} succumbed to the infection.`);
  }
}

// ---------- state creation ----------

export function createInitialState() {
  const state = {
    day: 1,
    turn: 1, // 1=training, 2=exploration, 3=defense
    resources: { food: 60, materials: 15, medicine: 20, research: 0, serum: 0 },
    fortification: 0,
    happiness: HAPPINESS_START,
    pendingRaid: null, // { facility } once a facility raid triggers post-battle, until resolved
    pendingAssault: false, // true once an Assault opportunity triggers post-battle, until resolved
    raidDefenders: [],
    eventLog: [], // most recent random events, newest first
    exploredHexes: [], // "q,r" keys the fog of war has been lifted from
    mapMilestones: [], // MAP_MILESTONES (percent of the map scouted) already paid out
    techUnlocked: [], // TECH_TREE ids purchased with banked Research
    entranceGrid: { size: ENTRANCE_GRID_SIZE, students: {}, defenses: {}, v2: true, stepsV2: true, rows10: true }, // "row,col" -> id
    rescue: null, // { day, evacuated, landed } once satellite communications reach the military
    victory: false,
    bossesSlain: [], // boss names, for the epilogue
    pantry: { ...STARTING_PANTRY }, // ingredient id -> count
    stock: { ...STARTING_STOCK }, // PRODUCERS id -> seeds / livestock waiting to be planted or penned
    plots: Object.fromEntries(Object.keys(PRODUCERS).map((kind) => [kind, [emptyPlot()]])), // the Farm's slots for each crop and animal
    dishesToday: [], // DISHES ids served today; their buffs last until the day rolls over
    gymSplit: true, // PE / Gymnastics train separately (see migrateState)
    roomLevels: true, // rooms have levels 1-5 (see migrateState)
    roomSizesV2: true, // rooms sized to the school's headcount (see migrateState)
    runId: newRunId(), // tells this run apart from others in the best-score record
    boardedRooms: Object.keys(BOARDED_ROOMS), // rooms still overrun — cleared by fighting, then scrap
    roomFightsDone: 0, // the first room-clearing fight shows tutorial tips
    objectivesDone: [], // OBJECTIVES ids finished (see checkObjectives)
    expeditionsSent: 0,
    nests: [], // "q,r" keys of zombie nests found while scouting
    horde: null, // { q, r } of the wandering horde, from day 2
    mapDrops: [], // { q, r, kind, expires } — crates, wrecks and survivors waiting on scouted blocks
    yard: Object.fromEntries(Object.keys(YARD_JOBS).map((kind) => [kind, [{ id: kind, growth: 0 }]])), // the Scrapyard's piles and benches
    defenseKits: {}, // DEFENSE_STRUCTURES id -> kits from the Scrapyard's trap bench (a free build each)
    greenhouseSlots: Object.fromEntries(Object.keys(GREENHOUSE_JOBS).map((kind) => [kind, [{ id: kind, growth: 0 }]])), // the Greenhouse's beds and racks
    raidTarget: null, // LANDMARKS id today's raid squad is going after
    raidCooldowns: {}, // landmark id -> day its boss is back after being killed
    raidKills: {}, // landmark id -> times its boss has been killed (each makes it tougher)
    characters: [],
    rooms: {
      classrooms: Object.fromEntries(CLASSROOM_IDS.map((id) => [id, { level: 1, subject: null, seats: [] }])),
      ...Object.fromEntries(ROOM_KEYS.filter((k) => !k.startsWith("classroom:")).map((k) => [k, { level: 1 }])),
    },
    recruitPool: [],
    log: [],
    gameOver: false,
    teamLocations: [null, null, null],
    teamSlots: 1, // expedition teams bought so far (buyTeamSlot)
    armory: starterArmory(),
  };

  for (let i = 0; i < 10; i++) {
    state.characters.push(makeCharacter("student", i % 2 === 0 ? "F" : "M"));
  }
  for (let i = 0; i < 3; i++) {
    state.characters.push(makeCharacter("teacher", i % 2 === 0 ? "M" : "F"));
  }

  for (const key of ROOM_KEYS) applyRoomLevel(state, key);
  addLog(state, `Day 1 begins. ${state.characters.length} souls are relying on you.`);
  beginDayRecord(state, 1);
  return state;
}

// What a day brought, for its Day Summary (the Turn 3 centre screen): the supplies, morale and the
// living as they were last night, then what the classes, the expeditions and the morning's event
// did — `day` is the day it's for (the overnight upkeep counts towards the new day).
export function beginDayRecord(state, day) {
  state.today = {
    day,
    start: { resources: { ...state.resources }, happiness: state.happiness, fortification: state.fortification, ids: aliveChars(state).map((c) => c.id) },
    classes: null,
    exploration: null,
    event: null,
  };
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
  // First + last name, 6 letters each (fitName); teachers keep their honorific whatever was
  // typed, and a legendary keeps their title.
  const bare = stripHonorific(raw);
  if (!bare) return false;
  const title = LEGENDARY_TITLES.find((t) => c.name.endsWith(` ${t}`));
  c.name = fitName(title ? `${bare} ${title}` : bare, c.gender, c.role);
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

// Teachers are rare finds.
function rollRecruitRole(state) {
  if (Math.random() < TEACHER_RECRUIT_CHANCE) return "teacher";
  return "student";
}

export function availableChars(state) {
  // alive, not currently on an exploration team or defending
  return aliveChars(state).filter((c) => c.exploreTeam === null && !c.defending);
}

// ---------- room / seat assignment ----------

export function isBoarded(state, roomKey) {
  return (state.boardedRooms || []).includes(roomKey);
}

// ---------- clearing boarded-up rooms ----------
// A squad fights whatever's still inside, round by round, with the same stats as every other fight.
// Win and the scrap goes into boarding the broken windows back up — the room is open for good.
// Lose and they fall back with nothing spent. Nobody dies clearing a room: anyone who goes down
// is dragged back out.

// "the Research Room" but just "Classroom 2".
export function roomLabel(roomKey) {
  const name = BOARDED_ROOMS[roomKey].name;
  return roomKey.startsWith("classroom:") ? name : `the ${name}`;
}

function roomZombies(roomKey) {
  return BOARDED_ROOMS[roomKey].zombies.map((z) => {
    const T = ZOMBIE_TYPES[z.type];
    const hp = Math.round(ROOM_ZOMBIE.hp * T.hpMult);
    return { ...z, hp, maxHp: hp, dmg: Math.max(1, Math.round(ROOM_ZOMBIE.damage * T.dmgMult)) };
  });
}

// A pack out on the streets (a nest, the zombies raiding a facility): `types` from ZOMBIE_TYPES,
// a little tougher every day (PACK_ZOMBIE).
export function dayZombies(state, types) {
  return types.map((type) => {
    const T = ZOMBIE_TYPES[type];
    const hp = Math.round((PACK_ZOMBIE.hp + state.day * PACK_ZOMBIE.hpPerDay) * T.hpMult);
    return { type, look: type === "brute" ? "jersey" : "walker", hp, maxHp: hp, dmg: Math.max(1, Math.round((PACK_ZOMBIE.damage + state.day * PACK_ZOMBIE.damagePerDay) * T.dmgMult)) };
  });
}
const PACK_ZOMBIE = { hp: 16, hpPerDay: 0.35, damage: 5, damagePerDay: 0.12 };
export const nestZombies = (state) => dayZombies(state, ["walker", "walker", "walker"]);
export const facilityRaiders = (state) => dayZombies(state, ["walker", "runner", "walker", "walker", "walker"]);

// Pure: plays a fight out without touching the state (used for the odds, and for the real thing).
// `zombies` is a room's (roomZombies) or a pack's (dayZombies).
function simulateRoomFight(state, squad, roomKey, zombieList = null) {
  const mods = squadModifiers(state, squad);
  const fighters = squad.map((c) => ({ id: c.id, hp: c.hp, down: false, ...raidAttack(state, c) }));
  const zombies = (zombieList || roomZombies(roomKey)).map((z) => ({ ...z }));
  const snapshot = (extra) => ({ zHp: zombies.map((z) => Math.max(0, z.hp)), hp: fighters.map((f) => f.hp), hits: [], zHits: [], ...extra });
  const frames = [snapshot({ text: `The squad pushes the door open. ${zombies.length} zombies turn toward them.` })];
  for (let round = 1; round <= ROOM_FIGHT_MAX_ROUNDS; round++) {
    const zHits = [];
    const hits = [];
    let dealt = 0;
    for (const f of fighters) {
      const target = zombies.find((z) => z.hp > 0);
      if (!target || f.down) continue;
      const zi = zombies.indexOf(target);
      if (Math.random() > f.hitChance) {
        zHits.push({ zi, dmg: 0 });
        continue;
      }
      const dmg = Math.max(1, Math.round(f.damage * mods.damageDealt * (0.85 + Math.random() * 0.3)));
      target.hp -= dmg;
      dealt += dmg;
      zHits.push({ zi, dmg });
    }
    for (const z of zombies.filter((x) => x.hp > 0)) {
      const standing = fighters.filter((f) => !f.down);
      if (!standing.length) break;
      const f = pick(standing);
      if (Math.random() > ZOMBIE_HIT_CHANCE) {
        hits.push({ id: f.id, dmg: 0 });
        continue;
      }
      if (Math.random() < f.dodge) {
        hits.push({ id: f.id, dmg: 0, dodged: true });
        continue;
      }
      const dmg = Math.max(1, Math.round(z.dmg * f.armorMult * mods.damageTaken * (0.85 + Math.random() * 0.3)));
      f.hp = Math.max(0, f.hp - dmg);
      if (f.hp === 0) f.down = true;
      hits.push({ id: f.id, dmg, down: f.down });
    }
    const left = zombies.filter((z) => z.hp > 0).length;
    const text = left === 0
      ? `Round ${round}: the squad deals ${dealt} damage — the last one goes down. The room is clear!`
      : `Round ${round}: the squad deals ${dealt} damage; ${left} zombie${left === 1 ? "" : "s"} still standing.`;
    frames.push(snapshot({ hits, zHits, text }));
    if (!left || fighters.every((f) => f.down)) break;
  }
  return { won: zombies.every((z) => z.hp <= 0), fighters, frames };
}

export function packFightOdds(state, zombies, squad, trials = 120) {
  if (!squad.length) return 0;
  let wins = 0;
  for (let i = 0; i < trials; i++) if (simulateRoomFight(state, squad, null, zombies).won) wins++;
  return wins / trials;
}
export const roomFightZombies = (roomKey) => roomZombies(roomKey);

// ---------- fight power ----------
// How strong someone is in a squad fight, as one number: what they deal a round (damage × the
// chance to hit) against what it takes to put them down (HP through their armour and dodging) —
// the square root of the two multiplied, so doubling either counts the same and two equal fighters
// are twice one. The other side is measured the same way, so the two can be set side by side.
export function fightPower(state, c) {
  const a = raidAttack(state, c);
  const perRound = a.damage * a.hitChance;
  const toughness = Math.max(1, c.hp) / Math.max(0.2, a.armorMult) / Math.max(0.2, 1 - a.dodge);
  return { ...a, perRound, toughness, power: Math.round(Math.sqrt(perRound * toughness)) };
}
// `against` (a packFight or bossFight) measures the squad against that enemy: a fight has a time
// limit (`rounds`), so toughness beyond what it takes to last that long doesn't count.
export function squadFight(state, squad, against = null, rounds = ROOM_FIGHT_MAX_ROUNDS) {
  if (!squad.length) return { perRound: 0, toughness: 0, power: 0, mods: null };
  const mods = squadModifiers(state, squad);
  let perRound = 0;
  let toughness = 0;
  for (const c of squad) {
    const f = fightPower(state, c);
    perRound += f.perRound;
    toughness += f.toughness;
  }
  perRound *= mods.damageDealt;
  toughness /= mods.damageTaken;
  const counted = against ? Math.min(toughness, against.perRound * rounds) : toughness;
  return { perRound, toughness, counted, power: Math.round(Math.sqrt(perRound * counted)), mods };
}
// A pack of zombies ({ hp, dmg } each, hitting ZOMBIE_HIT_CHANCE of the time), or one big one
// ({ hp, damage, attacks } — a raid boss or the horde's leader, a little worse once it's berserk).
export function packFight(zombies) {
  const perRound = zombies.reduce((s, z) => s + z.dmg * ZOMBIE_HIT_CHANCE, 0);
  const hp = zombies.reduce((s, z) => s + z.hp, 0);
  return { perRound, hp, power: Math.round(Math.sqrt(perRound * hp)) };
}
export function bossFight(boss) {
  const perRound = boss.damage * boss.attacks * 1.15;
  return { perRound, hp: boss.hp, power: Math.round(Math.sqrt(perRound * boss.hp)) };
}
export function bossFightOdds(state, boss, squad, trials = 120) {
  if (!squad.length) return 0;
  let wins = 0;
  for (let i = 0; i < trials; i++) if (simulateBossFight(state, boss, squad).won) wins++;
  return wins / trials;
}

export function canFightForRoom(c) {
  return c && c.alive && !c.infection && c.role === "student" && c.stamina >= ROOM_FIGHT_STAMINA && c.hp > 1;
}

export const boardedRoomCost = (roomKey) => BOARDED_ROOMS[roomKey]?.cost ?? Infinity;
// Clearing a boarded-up room: the same fight as an expedition's, on the same board — the squad at the
// door, the room's own zombies (BOARDED_ROOMS, at ROOM_ZOMBIE strength) coming at them. Nobody dies
// in here: anyone who goes down is dragged out.
export function startClearBattle(state, roomKey, ids) {
  const room = BOARDED_ROOMS[roomKey];
  const squad = ids.map((id) => getChar(state, id)).filter(canFightForRoom).slice(0, ROOM_FIGHT_SQUAD);
  if (!room || !isBoarded(state, roomKey) || !squad.length) return null;
  const b = roomBattle(state, squad, room.zombies.map((z) => z.type), ROOM_ZOMBIE, {
    clear: roomKey, place: { name: room.name, ground: "school", difficulty: 1 }, tutorial: !state.roomFightsDone,
  });
  b.frames.push(battleSnapshot(b, []));
  return b;
}
// The squad's chance, from the fight itself: `trials` of it played out in the background.
export function clearOdds(state, roomKey, ids, trials = 60) {
  let wins = 0;
  for (let i = 0; i < trials; i++) {
    const b = startClearBattle(state, roomKey, ids);
    if (!b) return 0;
    runNightBattle(state, b);
    if (b.students.some((s) => !s.downed) && b.killed >= b.spawned) wins++;
  }
  return wins / trials;
}
// The fight's over: anyone still standing has cleared it (paid for in scrap, boarded back up). Their
// HP as it ended (the downed dragged out at 10%), stamina spent, XP.
export function finishClearBattle(state, roomKey, b) {
  const room = BOARDED_ROOMS[roomKey];
  const tutorial = b.tutorial;
  state.roomFightsDone = (state.roomFightsDone || 0) + 1;
  const won = b.students.some((s) => !s.downed) && b.killed >= b.spawned && state.resources.materials >= room.cost;
  const hurt = [];
  for (const s of b.students) {
    const c = getChar(state, s.id);
    if (!c) continue;
    c.stamina = Math.max(0, c.stamina - ROOM_FIGHT_STAMINA);
    c.hp = s.downed ? Math.max(1, Math.round(c.maxHp * 0.1)) : Math.max(1, Math.min(c.maxHp, s.hp - (s.bonusHp || 0)));
    c.injured = c.hp < c.maxHp * 0.5;
    if (s.downed) {
      const bitten = !tutorial && Math.random() < INFECTION_CHANCE_DOWNED && infect(state, c, "was bitten before they were dragged out");
      hurt.push(`${c.name} was dragged out${bitten ? " — 🦠 infected" : ""}`);
    }
    grantXp(state, c.id, "PE", 2 + randInt(0, 2));
    grantXp(state, c.id, "Gymnastics", 2 + randInt(0, 2));
    gainExp(state, c, LEVEL_XP.roomFight);
  }
  if (won) {
    state.resources.materials -= room.cost;
    state.boardedRooms = state.boardedRooms.filter((k) => k !== roomKey);
    addLog(state, `The squad cleared the zombies out of ${roomLabel(roomKey)} and boarded the windows back up (-${room.cost} scrap). It's ready to use.`);
  } else {
    addLog(state, `The squad couldn't clear ${roomLabel(roomKey)} and fell back.`);
  }
  return { won, fallen: [], hurt, downedCount: hurt.length, cost: room.cost };
}

// ---------- the Headmaster's missions (work in progress) ----------
// What the Headmaster has for the player, shown as the glow around him: "complete" (a mission is
// done — come and collect, green), "available" (one to take on, blue), or null (nothing, no glow).
// Missions aren't in yet, so for now he always has one on offer.
export function missionStatus(state) {
  return "available";
}

// ---------- objectives ----------
// Switched off (nothing shows or checks them since 2026-10-01): the Headmaster will hand out
// missions instead. Kept as a starting point for those.
const OBJECTIVE_CHECKS = {
  clear_research: (state) => !isBoarded(state, "research"),
  staff_research: (state) => state.characters.some((c) => c.alive && c.role === "teacher" && c.post === "research"),
  first_expedition: (state) => (state.expeditionsSent || 0) > 0,
  first_tech: (state) => state.techUnlocked.length > 0,
  second_classroom: (state) => CLASSROOM_IDS.filter((id) => !isBoarded(state, `classroom:${id}`)).length >= 2,
  survive_week: (state) => state.day >= 7,
};

export function currentObjective(state) {
  return OBJECTIVES.find((o) => !(state.objectivesDone || []).includes(o.id)) || null;
}

// A short progress line for the active objective, where there's something to count.
export function objectiveProgress(state, objective) {
  if (objective.id === "clear_research" && isBoarded(state, "research")) {
    const cost = BOARDED_ROOMS.research.cost;
    const have = state.resources.materials;
    return have >= cost ? `Scrap: ${cost}/${cost} ✓ — now clear the room on Floor 3` : `Scrap: ${have}/${cost}`;
  }
  if (objective.id === "survive_week") return `Day ${state.day} of 7`;
  return "";
}

// Finishes (and pays out) the active objective whenever it's been met — and the next, and so on.
// Returns the objectives just finished, for a message.
export function checkObjectives(state) {
  const done = [];
  let objective = currentObjective(state);
  while (objective && OBJECTIVE_CHECKS[objective.id](state)) {
    state.objectivesDone.push(objective.id);
    for (const [key, amt] of Object.entries(objective.reward)) state.resources[key] += amt;
    addLog(state, `✅ Objective complete: ${objective.title} (${Object.entries(objective.reward).map(([k, v]) => `+${v} ${RESOURCE_NAME[k]}`).join(", ")}).`);
    done.push(objective);
    objective = currentObjective(state);
  }
  return done;
}

// ---------- one Turn 1 job each ----------
// In Turn 1 a student does one thing: a classroom seat, the Gymnasium or Acrobatics, the Research
// or Crafting Room, the Radio, rest in the Cafeteria, the Nurse's Office, or a Courtyard room (the
// Farm, the Barn, the Scrapyard or the Greenhouse). Taking a new one
// leaves the old (`keep` is the one being taken: "seat" or its flag).
export const TURN_ONE_FLAGS = ["gymToday", "researchToday", "craftingToday", "radioToday", "restToday", "infirmaryToday", "farmToday", "barnToday", "scrapyardToday", "greenhouseToday"];
// Doing anything in Turn 1 already (a seat or any of the jobs above).
export const hasTurnOneJob = (c) => !!c.seat || TURN_ONE_FLAGS.some((flag) => c[flag]);
function leaveTurnOneJobs(state, c, keep) {
  if (keep !== "seat" && c.seat) unseat(state, c.id);
  for (const flag of TURN_ONE_FLAGS) if (flag !== keep) c[flag] = false;
}
// Off whatever they were doing today (their seat or job) — dropped back on the Turn 1 roster.
export function clearTurnOneJobs(state, studentId) {
  const c = getChar(state, studentId);
  if (c) leaveTurnOneJobs(state, c);
}

export function assignSeat(state, studentId, roomId, index) {
  const c = getChar(state, studentId);
  if (!c || c.role !== "student") return false;
  if (isBoarded(state, `classroom:${roomId}`)) return false;
  const room = state.rooms.classrooms[roomId];
  if (!room || room.seats[index]) return false;
  leaveTurnOneJobs(state, c, "seat");
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

// teacher posts: 'classroom:<roomId>', 'gym:PE', 'gym:Gymnastics', 'cafeteria', 'infirmary', 'research',
// 'crafting', or null. Each room holds as many teachers as its level allows.
// A classroom room has no subject ("Classroom N") until its first teacher is assigned, at which
// point it takes on whichever classroom subject that teacher is best qualified to teach. It
// reverts to unassigned the moment its last teacher leaves, so rooms can be freely repurposed.
export function setTeacherPost(state, teacherId, post) {
  const t = getChar(state, teacherId);
  if (!t || t.role !== "teacher") return false;
  if (post && (isBoarded(state, post) || t.infection)) return false;
  const oldPost = t.post;

  // capacity checks
  if (post) {
    const room = roomState(state, postRoomKey(post));
    if (!room) return false;
    const count = state.characters.filter((c) => c.role === "teacher" && c.post === post).length;
    if (count >= room.teacherCapacity) return false;
  }

  t.post = post;

  // Leaving a classroom: if no teacher is left there, the room goes back to unassigned.
  if (oldPost && oldPost.startsWith("classroom:") && oldPost !== post) {
    const oldRoom = state.rooms.classrooms[oldPost.split(":")[1]];
    const stillStaffed = state.characters.some((c) => c.role === "teacher" && c.alive && c.post === oldPost);
    if (oldRoom && !stillStaffed) oldRoom.subject = null;
  }

  // Joining an unassigned classroom: it takes on this teacher's best classroom subject.
  if (post && post.startsWith("classroom:")) {
    const room = state.rooms.classrooms[post.split(":")[1]];
    if (room && !room.subject) room.subject = bestClassroomSubjectFor(t);
  }

  return true;
}

// `side` is "PE" (the Gymnasium) or "Gymnastics" (Acrobatics) — one a day — or false to leave.
export function setGymToday(state, studentId, side) {
  const c = getChar(state, studentId);
  if (!c || c.role !== "student") return false;
  if (side) {
    if (c.infection) return false; // in quarantine
    const count = state.characters.filter((x) => x.gymToday === side && x.id !== c.id).length;
    if (count >= gymRoom(state, side).studentCapacity) return false;
    leaveTurnOneJobs(state, c, "gymToday");
  }
  c.gymToday = side || false;
  return true;
}

// The room a training subject happens in: PE → the Gymnasium, Gymnastics → Acrobatics.
export const gymRoom = (state, side) => state.rooms[GYM_SIDES[side].roomKey];

export function gymTeachers(state, side) {
  return state.characters.filter((c) => c.role === "teacher" && c.post === `gym:${side}` && c.alive);
}

// A teacher's rank in a subject: F=0, D=1, C=2, B=3, A=4, S=5.
export const teacherRank = (t, subject) => GRADE_TIERS.indexOf(gradeLetter(t.grades[subject]));

// A Gymnasium (STR) / Acrobatics (DEX) session, taught exactly like a class (see lessonFrom).
export function gymLesson(state, side) {
  const lesson = lessonFrom(side, gymTeachers(state, side), roomLevel(state, GYM_SIDES[side].roomKey), 0, techPerk(state, "gradeCap"));
  lesson.gain += techPerk(state, "gymGain");
  return lesson;
}

// What one session adds to a student's STR (PE) or DEX (Gymnastics): 0 once they've caught up
// with the teacher.
export function trainingGain(state, c, side) {
  const lesson = gymLesson(state, side);
  if (!c || !lesson.subject) return 0;
  return Math.max(0, Math.min(lesson.gain, lesson.ceiling - c.grades[side], gradeCap(c, side) - c.grades[side]));
}

// What one outside worker brings in today: the facility's base yield, plus 1 for every
// TUNE.yieldStatStep of the site's stat (SITE_STAT: STR at the Farm, DEX at the Scrapyard).
export function workerYield(facility, c) {
  const base = facility === "farm" || facility === "barn" ? FARM_YIELD_FOOD : facility === "greenhouse" ? GREENHOUSE_YIELD_MEDICINE : SCRAPYARD_YIELD_MATERIALS;
  return base + Math.floor(c.grades[SITE_STAT[facility]] / TUNE.yieldStatStep);
}

// Fortification one crafter adds from `scrap` scrap (they use up to 4 a day) and their WIS (the
// History teacher knows how castles were held), plus the room's level bonus.
export function crafterGain(state, crafter, scrap) {
  return Math.round((scrap + crafter.grades.History / 20) * 0.8) + CRAFTING_BONUS_BY_LEVEL[roomLevel(state, "crafting") - 1];
}

// The Radio Station's recruiters: teachers posted there and students on the air today.
export const radioCrew = (state) => state.characters.filter((c) => c.alive && !c.infection && (c.post === "radio" || c.radioToday));
// What one recruiter adds to the daily recruit chance, by their CHA.
export const radioCrewBonus = (c) => c.grades.SocialStudies / RADIO_CHA_PER_PERCENT / 100;
// The Radio Station's daily chance that a survivor hears the broadcast and asks to join: the
// level's base chance plus every recruiter's CHA bonus (then meals and research on top).
export function radioRecruitChance(state) {
  if (isBoarded(state, "radio")) return 0;
  const base = RADIO_UPGRADES[radioStage(state) - 1].baseChance + radioCrew(state).reduce((sum, c) => sum + radioCrewBonus(c), 0);
  return Math.min(1, base * dishMultiplier(state, "recruitChance") * (1 + techPerk(state, "recruitChance")));
}
export const radioStage = (state) => roomLevel(state, "radio");
export const satelliteReady = (state) => radioStage(state) >= RADIO_UPGRADES.length;

// Puts a student on the air at the Radio Station today (or takes them off).
export function setRadioToday(state, studentId, value) {
  const c = getChar(state, studentId);
  if (!c || c.role !== "student") return false;
  if (value) {
    if (c.infection || isBoarded(state, "radio")) return false;
    const count = state.characters.filter((x) => x.alive && x.radioToday && x.id !== c.id).length;
    if (count >= state.rooms.radio.studentCapacity) return false;
    leaveTurnOneJobs(state, c, "radioToday");
  }
  c.radioToday = !!value;
  return true;
}

// HP a patient gets back tonight: a treatment when there's medicine for them, bed rest otherwise.
export function healAmount(state, c, treated) {
  const hp = treated ? infirmaryHeal(state) + infirmaryNurseBonus(state) : INFIRMARY_BED_REST;
  return Math.min(c.maxHp - c.hp, hp);
}

// The healing patients tonight's medicine covers, in the order the turn treats them.
export function treatedPatientIds(state) {
  const healing = state.characters.filter((c) => c.alive && c.infirmaryToday);
  const covered = Math.floor(state.resources.medicine / INFIRMARY_MEDICINE_PER_PATIENT);
  return new Set(healing.slice(0, covered).map((c) => c.id));
}

// Max HP and max stamina come from the grades, plus whatever was built up in the Gym. Raising a
// max doesn't refill the bar — the new headroom fills with rest like the rest of it.
function refreshMaxStats(c) {
  c.maxHp = maxHpFor(c.grades) + (c.trainedHp || 0);
  c.maxStamina = maxStaminaFor(c);
}


// Beds taken in the Nurse's Office: today's patients plus everyone in quarantine.
// Beds are for healing only — the infected are kept apart in quarantine and don't take one.
export function infirmaryBedsUsed(state, exceptId = null) {
  return state.characters.filter((x) => x.alive && x.id !== exceptId && x.infirmaryToday).length;
}

// Sends a student to rest in the Cafeteria today (stamina back at the end of Turn 1), or back out.
export function setRestToday(state, studentId, value) {
  const c = getChar(state, studentId);
  if (!c || c.role !== "student") return false;
  if (value) {
    if (c.infection) return false; // in quarantine
    if (c.stamina >= c.maxStamina) return false; // already fully rested
    const count = state.characters.filter((x) => x.alive && x.restToday && x.id !== c.id).length;
    if (count >= state.rooms.cafeteria.studentCapacity) return false;
    leaveTurnOneJobs(state, c, "restToday");
  }
  c.restToday = !!value;
  return true;
}

// Admits a student to the Nurse's Office to be healed (any truthy `mode`), or sends them back out.
export function setInfirmaryToday(state, studentId, mode) {
  const c = getChar(state, studentId);
  if (!c || c.role !== "student") return false;
  if (mode === true) mode = "heal";
  if (mode) {
    if (c.infection) return false; // already there in quarantine
    if (c.hp >= c.maxHp) return false; // nothing to heal — don't spend a bed or medicine on them
    if (infirmaryBedsUsed(state, c.id) >= state.rooms.infirmary.studentCapacity) return false;
    leaveTurnOneJobs(state, c, "infirmaryToday");
  }
  c.infirmaryToday = mode ? "heal" : false;
  return true;
}

// ---------- staying in a room day after day ----------
// A student keeps their Turn 1 room from one day to the next (each room's "📌 Stay" toggle, on by
// default) until it has nothing left to give them: the stat it trains maxed out, stamina full in
// the Cafeteria, HP full in the Nurse's Office. Research, Crafting and the Radio keep them until
// they're moved. Every turn clears the day's jobs, so Turn 1's are remembered as it ends
// (c.keepJobs) and handed back at dawn; whoever's done is listed in state.finishedJobs.
export const staysInRoom = (state, roomKey) => !state.stayOff?.[roomKey];
export function toggleStay(state, roomKey) {
  state.stayOff = state.stayOff || {};
  if (staysInRoom(state, roomKey)) state.stayOff[roomKey] = true;
  else delete state.stayOff[roomKey];
}
// Each Turn 1 job: its room, how to put a student back, and why they'd be done (null: not yet).
const STAY_JOBS = {
  gymToday: { room: (side) => GYM_SIDES[side].roomKey, set: setGymToday,
    done: (state, c, side) => (trainingGain(state, c, side) ? null : `${GYM_SIDES[side].gains} maxed`) },
  restToday: { room: () => "cafeteria", set: setRestToday, done: (state, c) => (c.stamina >= c.maxStamina ? "stamina full" : null) },
  infirmaryToday: { room: () => "infirmary", set: setInfirmaryToday, done: (state, c) => (c.hp >= c.maxHp ? "HP full" : null) },
  researchToday: { room: () => "research", set: (...a) => setResearchToday(...a) }, // (declared further down)
  craftingToday: { room: () => "crafting", set: (...a) => setCraftingToday(...a) },
  radioToday: { room: () => "radio", set: setRadioToday },
  // the Courtyard's rooms: back at dawn while there's something ready for them and the stamina for it
  // (checked at dawn only — a night's sleep gives some stamina back)
  ...Object.fromEntries(Object.entries(WORK_SITES).map(([site, def]) => [def.flag, {
    room: () => site, set: (state, id, side) => setSiteToday(state, site, id, side), atDawn: true,
    done: (state, c, side) => (c.stamina < def.stamina ? "too tired" : siteCrew(state, side).length >= workersNeeded(state, side) ? "nothing more ready" : null),
  }])),
};
// Called as Turn 1 ends (after the day's lessons, rest and healing).
function keepTurnOneJobs(state) {
  state.finishedJobs = [];
  for (const c of state.characters) {
    delete c.keepJobs;
    if (c.role !== "student" || !c.alive) continue;
    const keep = {};
    for (const [flag, job] of Object.entries(STAY_JOBS)) {
      const value = c[flag];
      if (!value || !staysInRoom(state, job.room(value))) continue;
      const why = job.atDawn ? null : job.done?.(state, c, value);
      if (why) state.finishedJobs.push({ id: c.id, room: job.room(value), why });
      else keep[flag] = value;
    }
    if (Object.keys(keep).length) c.keepJobs = keep;
    // Classroom seats aren't cleared by the turn, so they only need letting go of.
    if (c.seat) {
      const room = `classroom:${c.seat.room}`;
      const lesson = classroomLesson(state, c.seat.room);
      if (!staysInRoom(state, room)) unseat(state, c.id);
      else if (lesson.subject && !classGain(state, c)) {
        state.finishedJobs.push({ id: c.id, room, why: `${STAT_OF_SUBJECT[lesson.subject]} maxed` });
        unseat(state, c.id);
      }
    }
  }
}
// Called at dawn: everyone goes back to the room they were kept in, unless the night finished
// the job (a night's rest can fill a stamina bar) or they can't (hurt into quarantine, room full).
function restoreTurnOneJobs(state) {
  state.finishedJobs = state.finishedJobs || [];
  for (const c of state.characters) {
    const keep = c.keepJobs;
    delete c.keepJobs;
    if (!keep || !c.alive || c.infection) continue;
    for (const [flag, value] of Object.entries(keep)) {
      const job = STAY_JOBS[flag];
      const why = job.done?.(state, c, value);
      if (why) state.finishedJobs.push({ id: c.id, room: job.room(value), why });
      else job.set(state, c.id, value);
    }
  }
  const done = state.finishedJobs.filter((f) => getChar(state, f.id)?.alive);
  if (done.length) addLog(state, `📌 Done in their rooms and free for something new: ${done.map((f) => `${getChar(state, f.id).name} (${f.why})`).join(", ")}.`);
}


// What a treatment gives at the Nurse's Office's current care level.
// HP a treated patient gets back from the room itself, by its level.
export function infirmaryHeal(state) {
  return INFIRMARY_HEAL_BY_LEVEL[roomLevel(state, "infirmary") - 1] + techPerk(state, "healBonus");
}
// HP one nurse adds to every treatment: INFIRMARY_NURSE_HP_PER_RANK per rank of their CON grade.
export const nurseHpBonus = (n) => teacherRank(n, "Biology") * INFIRMARY_NURSE_HP_PER_RANK;
export function infirmaryNurseBonus(state) {
  return state.characters
    .filter((c) => c.role === "teacher" && c.post === "infirmary" && c.alive)
    .reduce((sum, n) => sum + nurseHpBonus(n), 0);
}

// Stamina a student resting in the Cafeteria gets back today.
export function cafeteriaRest(state) {
  return CAFETERIA_REST_BY_LEVEL[roomLevel(state, "cafeteria") - 1] + techPerk(state, "restRecovery");
}

// ---------- work sites: the Courtyard's Farm, Barn, Scrapyard and Greenhouse ----------
// Worked in Turn 1, as a student's one job of the day (see WORK_SITES in data.js). Each site's crew
// works its one side: a student's c.farmToday / c.barnToday / ... holds that side's name, or false.
// Side names are unique across sites, so a side is enough to find its site.

const SIDE_SITE = Object.fromEntries(Object.entries(WORK_SITES).flatMap(([site, s]) => Object.keys(s.sides).map((side) => [side, site])));
export const siteOfSide = (side) => SIDE_SITE[side];
// What's in a slot: a crop or animal (PRODUCERS), a Scrapyard pile or bench (YARD_JOBS) or a
// Greenhouse bed or rack (GREENHOUSE_JOBS).
export const slotDef = (kind) => PRODUCERS[kind] || YARD_JOBS[kind] || GREENHOUSE_JOBS[kind];
export const siteSlots = (state, site) => (site === "farm" || site === "barn" ? state.plots : site === "greenhouse" ? state.greenhouseSlots : state.yard);
export const siteWorkerSlots = (state, site) => WORK_SITES[site].workersByLevel[roomLevel(state, site) - 1];
export const siteCrew = (state, side) => {
  const flag = WORK_SITES[SIDE_SITE[side]].flag;
  return state.characters.filter((c) => c[flag] === side && c.alive);
};

// Able to do a day at a site: a student out of quarantine with the stamina the work takes. (Any
// other Turn 1 job they have is left when they're put on the crew.)
export function canWorkSite(c, site) {
  if (c.role !== "student" || !c.alive || c.infection || c.exploreTeam !== null) return false;
  return c.stamina >= WORK_SITES[site].stamina;
}

// Puts a student on a side's crew (false takes them off the site). A crew only takes as many as
// its ready slots need.
export function setSiteToday(state, site, studentId, side) {
  const c = getChar(state, studentId);
  const flag = WORK_SITES[site].flag;
  if (!c || c.role !== "student") return false;
  if (side) {
    if (SIDE_SITE[side] !== site || !canWorkSite(c, site)) return false;
    const crew = siteCrew(state, side).filter((x) => x !== c).length;
    if (crew >= Math.min(siteWorkerSlots(state, site), workersNeeded(state, side))) return false;
    if (state.characters.filter((x) => x[flag] && x !== c).length >= state.rooms[site].studentCapacity) return false;
    leaveTurnOneJobs(state, c, flag);
  }
  c[flag] = side || false;
  return true;
}

// Fills the crew up to what its ready slots need, lowest-level free students first (only students
// with no Turn 1 job yet).
// Returns how many were assigned.
export function autoAssignSite(state, site) {
  const flag = WORK_SITES[site].flag;
  let assigned = 0;
  for (const side of Object.keys(WORK_SITES[site].sides)) {
    const free = state.characters
      .filter((c) => !hasTurnOneJob(c) && canWorkSite(c, site))
      .sort((a, b) => overallLevel(a) - overallLevel(b) || b.stamina - a.stamina);
    for (const c of free) {
      if (!setSiteToday(state, site, c.id, side)) break;
      assigned++;
    }
  }
  return assigned;
}

// The Farm's own names for these.
export const setFarmToday = (state, studentId, side) => setSiteToday(state, "farm", studentId, side);
export const setBarnToday = (state, studentId, side) => setSiteToday(state, "barn", studentId, side);
export const setScrapyardToday = (state, studentId, side) => setSiteToday(state, "scrapyard", studentId, side);
export const setGreenhouseToday = (state, studentId, side) => setSiteToday(state, "greenhouse", studentId, side);
export const canWorkFarm = (c) => canWorkSite(c, "farm");
export const autoAssignFarm = (state) => autoAssignSite(state, "farm");
export const farmWorkerSlots = (state) => siteWorkerSlots(state, "farm");
export const farmCrew = siteCrew;
// ---------- room levels ----------
// Every room and facility has a level from 1 to ROOM_MAX_LEVEL (see ROOM_LEVELS). Its slots are
// worked out from the level and stored on the room (studentCapacity / teacherCapacity / plots, a
// classroom's seats), so everything else just reads those.

export const ROOM_KEYS = [
  ...CLASSROOM_IDS.map((id) => `classroom:${id}`),
  "gym", "acrobatics", "cafeteria", "infirmary", "research", "crafting", "radio", "farm", "barn", "scrapyard", "greenhouse",
];
// The Headmaster's Office's two sides.
export const promotionSlots = () => OFFICE_PROMOTION_SLOTS;
export const recruitSlots = () => OFFICE_RECRUIT_SLOTS;
// A survivor asks to join: they wait in the Headmaster's Office — or, when every recruit slot is
// taken, they're turned away (a legendary survivor always finds room). Returns whether they stayed.
export function addRecruit(state, recruit) {
  if (!recruit.legendary && state.recruitPool.length >= recruitSlots(state)) {
    addLog(state, `${recruit.name} wanted to join, but the Headmaster's Office had no room (${recruitSlots(state)} waiting) — they moved on.`);
    return false;
  }
  state.recruitPool.push(recruit);
  return true;
}
const roomType = (key) => key.split(":")[0];

export function roomState(state, key) {
  const [type, id] = key.split(":");
  return type === "classroom" ? state.rooms.classrooms[id] : state.rooms[type];
}
export const roomLevel = (state, key) => roomState(state, key)?.level || 1;
// The top level a room can reach: ROOM_MAX_LEVEL, or less where its ROOM_LEVELS entry says so.
export const roomMaxLevel = (key) => ROOM_LEVELS[roomType(key)]?.maxLevel || ROOM_MAX_LEVEL;

// The room a teacher post belongs to: "gym:PE" → "gym", "gym:Gymnastics" → "acrobatics".
export function postRoomKey(post) {
  return post.startsWith("gym:") ? GYM_SIDES[post.split(":")[1]].roomKey : post;
}

// "the Gymnasium", "the Acrobatics room", "Biology" (a classroom goes by its subject).
export function roomName(state, key) {
  if (roomType(key) === "classroom") {
    const room = roomState(state, key);
    return room?.subject ? SUBJECT_LABEL[room.subject] : `Classroom ${key.split(":")[1]}`;
  }
  const def = ROOM_LEVELS[roomType(key)];
  return def.ref || `the ${def.name}`;
}

// What a room offers at a level, in display order: its slots, then any perks.
export function roomLevelStats(key, level) {
  const def = ROOM_LEVELS[roomType(key)];
  const rows = [];
  const slot = (id, s, value) => rows.push({ id, label: s.label, value, text: String(value) });
  const at = (s) => (s.by ? s.by[level - 1] : s.base + s.per * (level - 1));
  if (def.students) slot("students", def.students, at(def.students));
  if (def.teachers) slot("teachers", def.teachers, def.teachers.base + ROOM_TEACHER_LEVELS.filter((l) => level >= l).length);
  if (def.plots) slot("plots", def.plots, at(def.plots));
  if (def.pens) slot("pens", def.pens, at(def.pens));
  for (const p of def.perks || []) {
    const value = p.by[level - 1];
    rows.push({ id: p.label, label: p.label, value, text: p.fmt(value) });
  }
  return rows;
}

// Sets a room's slots from its level (less any raid damage to a facility).
export function applyRoomLevel(state, key) {
  const room = roomState(state, key);
  if (!room) return;
  if (!room.level) room.level = 1;
  room.level = Math.min(room.level, roomMaxLevel(key)); // a level-5 Farm from before it had 4 levels is a maxed one
  const stats = Object.fromEntries(roomLevelStats(key, room.level).map((r) => [r.id, r.value]));
  if (stats.teachers !== undefined) room.teacherCapacity = stats.teachers;
  if (roomType(key) === "classroom") {
    while (room.seats.length < stats.students) room.seats.push(null);
    // A room smaller than its seat list (rooms were made smaller) sends the extra students off
    // their seats — they can be seated again wherever there's room.
    for (const id of room.seats.splice(stats.students)) {
      const c = id && getChar(state, id);
      if (c) c.seat = null;
    }
    return;
  }
  if (stats.students !== undefined) room.studentCapacity = Math.max(1, stats.students - (room.damage || 0));
  if (WORK_SITES[key]) {
    // the crew's slots, less any a raid broke
    room.studentCapacity = Math.max(1, Object.keys(WORK_SITES[key].sides).length * siteWorkerSlots(state, key) - (room.damage || 0));
    if (key === "farm" || key === "barn") syncPlots(state);
    else if (key === "greenhouse") syncGreenhouse(state);
    else syncYard(state);
  }
}

export function roomUpgradeCostFor(state, key) {
  const level = roomLevel(state, key);
  return level >= roomMaxLevel(key) ? null : Math.round(roomUpgradeCost(level) * (1 - techPerk(state, "upgradeDiscount")));
}

export function upgradeRoom(state, key) {
  if (key === "radio") return buildRadioUpgrade(state); // paid for in scrap and research, its own way
  const room = roomState(state, key);
  const cost = roomUpgradeCostFor(state, key);
  if (!room || cost === null || isBoarded(state, key)) return false;
  if (state.resources.materials < cost) return false;
  state.resources.materials -= cost;
  room.level = (room.level || 1) + 1;
  applyRoomLevel(state, key);
  addLog(state, `Upgraded ${roomName(state, key)} to level ${room.level} (-${cost} scrap).`);
  return true;
}

// A facility raid that gets through breaks a worker slot until it's repaired.
export const roomRepairCost = (state, key) => (roomState(state, key)?.damage || 0) * ROOM_REPAIR_COST;

export function repairRoom(state, key) {
  const room = roomState(state, key);
  const cost = roomRepairCost(state, key);
  if (!cost || state.resources.materials < cost) return false;
  state.resources.materials -= cost;
  room.damage = 0;
  applyRoomLevel(state, key);
  addLog(state, `Repaired ${roomName(state, key)} (-${cost} scrap).`);
  return true;
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

// ---------- the Farm's fields & pens ----------
// See PRODUCERS and FARM_GROUPS in data.js. state.plots has a list of slots for each crop and
// animal (state.plots.wheat, state.plots.chicken...), each slot { id, growth } — id is that crop or
// animal while something's in it, null when empty. state.stock holds the seeds and livestock not
// yet placed. The Farm's level sets how many slots every group has (FARM_SLOTS_BY_LEVEL).

export function emptyPlot() {
  return { id: null, growth: 0 };
}

// The Farm's level sets how many slots each crop has, the Barn's each animal.
export const farmSlots = (state, site = "farm") => FARM_SLOTS_BY_LEVEL[roomLevel(state, site) - 1];
const plotSite = (kind) => (FARM_GROUPS.animals.includes(kind) ? "barn" : "farm");

export function syncPlots(state) {
  for (const kind of Object.keys(PRODUCERS)) {
    const list = (state.plots[kind] = state.plots[kind] || []);
    while (list.length < farmSlots(state, plotSite(kind))) list.push(emptyPlot());
  }
}

export function addStock(state, id, qty) {
  state.stock[id] = (state.stock[id] || 0) + qty;
}

export function stockLabel(id, qty) {
  const p = PRODUCERS[id];
  return `${p.stockIcon} ${qty === 1 ? p.stockName : p.stockPlural} ×${qty}`;
}

// Plants a seed / pens an animal in an empty slot of its group — only with one in stock.
export function plantPlot(state, kind, index) {
  const plot = state.plots[kind]?.[index];
  if (!plot || plot.id || !PRODUCERS[kind] || !(state.stock[kind] > 0)) return false;
  state.stock[kind] -= 1;
  plot.id = kind;
  plot.growth = 0;
  return true;
}

// Empties a slot. A growing crop is lost along with its seed; an animal goes back into stock.
export function clearPlot(state, kind, index) {
  const plot = state.plots[kind]?.[index];
  if (!plot || !plot.id) return false;
  if (PRODUCERS[kind].facility === "ranch") state.stock[kind] += 1;
  Object.assign(plot, emptyPlot());
  return true;
}

export function facilityWorkers(state, facility) {
  return state.characters.filter((c) => c[`${facility}Today`] && c.alive).length;
}

// A slot whose crop, animal, pile or bench has had its days and is waiting for a worker.
export const isReady = (plot) => !!plot?.id && plot.growth >= slotDef(plot.id).growDays;

// A side's ready slots as [kind, index], top group first (at the Farm or the Scrapyard).
export function readySlots(state, side) {
  const site = SIDE_SITE[side];
  const slots = siteSlots(state, site);
  return WORK_SITES[site].sides[side].flatMap((kind) => slots[kind].map((plot, i) => (isReady(plot) ? [kind, i] : null)).filter(Boolean));
}

// The ready slots that side's crew collects today — PLOTS_PER_WORKER each, top group first.
export function harvestPlan(state, side, crew = siteCrew(state, side).length) {
  return readySlots(state, side).slice(0, crew * PLOTS_PER_WORKER);
}

// Workers a side needs to collect everything that's ready.
export const workersNeeded = (state, side) => Math.ceil(readySlots(state, side).length / PLOTS_PER_WORKER);

// Collects a ready slot into the pantry: a crop is harvested (and replanted while there's seed),
// a sheep butchered (maybe leaving a lamb), a hen's eggs or a cow's milk taken.
function harvestSlot(state, kind, i, out) {
  const plot = state.plots[kind][i];
  const p = PRODUCERS[kind];
  const boosted = p.yield * (1 + techPerk(state, "farmYield")); // a fraction left over is a chance at one more
  const amount = Math.floor(boosted) + (Math.random() < boosted % 1 ? 1 : 0);
  out.produced[p.product] = (out.produced[p.product] || 0) + amount;
  state.pantry[p.product] = (state.pantry[p.product] || 0) + amount;
  plot.growth = 0;
  if (p.perennial) return;
  plot.id = null;
  if (Math.random() < p.keepChance) {
    addStock(state, kind, 1);
    out.kept.push(p.keepNote);
  }
  plantPlot(state, kind, i); // replant the same thing while stock lasts
}

// The Farm's and the Barn's day: each crew collects what's ready (up to 2 slots a worker), then
// every crop and animal grows a day — a ready one that wasn't collected just waits.
function resolveFarm(state) {
  const out = { produced: {}, kept: [] };
  for (const side of Object.keys(FARM_GROUPS)) for (const [kind, i] of harvestPlan(state, side)) harvestSlot(state, kind, i, out);
  for (const kind of Object.keys(PRODUCERS)) {
    for (const plot of state.plots[kind]) if (plot.id) plot.growth = Math.min(PRODUCERS[kind].growDays, plot.growth + 1);
  }
  return out;
}

// ---------- the Scrapyard's piles & benches ----------
// state.yard has a slot list per salvage pile (YARD_JOBS), each slot { id, growth } — always in use:
// a pile builds back up as soon as it's stripped. Vending machines may still hold canned food.

export const yardSlots = (state) => YARD_SLOTS_BY_LEVEL[roomLevel(state, "scrapyard") - 1];

export function syncYard(state) {
  state.yard = state.yard || {};
  for (const kind of Object.keys(YARD_JOBS)) {
    const list = (state.yard[kind] = state.yard[kind] || []);
    while (list.length < yardSlots(state)) list.push({ id: kind, growth: 0 });
  }
}

// An item as a log or a find names it: its icon, its name and (past Common) its rarity.
export const itemLabel = (it) => `${it.icon} ${it.name}${it.rarity && it.rarity !== "common" ? ` (${RARITIES[it.rarity].name})` : ""}`;
// Something the yards turn up, of a slot type if given ("weapon", "armor") — as a tier 1 place's finds.
const yardItem = (slot) => rollItem(ITEM_DROP_ODDS[1], slot);

// The Scrapyard's day: the crew strips what's ready, then every pile builds up a day.
function resolveYard(state) {
  const out = { scrap: 0, research: 0, items: [], pantry: {} };
  for (const side of Object.keys(YARD_GROUPS)) {
    for (const [kind, i] of harvestPlan(state, side)) {
      const job = YARD_JOBS[kind];
      if (job.scrap) {
        const scrap = Math.round(job.scrap * (1 + techPerk(state, "salvageYield")));
        state.resources.materials += scrap;
        out.scrap += scrap;
      }
      if (job.research && Math.random() < job.researchChance) {
        const n = randInt(job.research[0], job.research[1]);
        state.resources.research += n;
        out.research += n;
      }
      if (job.gearChance && Math.random() < job.gearChance) out.items.push(yardItem(null));
      if (job.ingredient && Math.random() < job.ingredientChance) {
        state.pantry[job.ingredient] = (state.pantry[job.ingredient] || 0) + 1;
        out.pantry[job.ingredient] = (out.pantry[job.ingredient] || 0) + 1;
      }
      state.yard[kind][i].growth = 0;
    }
  }
  for (const item of out.items) state.armory.push(item);
  for (const kind of Object.keys(YARD_JOBS)) {
    for (const slot of state.yard[kind]) slot.growth = Math.min(YARD_JOBS[kind].growDays, slot.growth + 1);
  }
  return out;
}

// ---------- a day in the Courtyard ----------
// At the end of Turn 1: each worker's own yield (the site's base, +1 per 25 of its stat), then the
// crew collects what's ready, and every crop, animal, pile and bed comes along a day.
function resolveCourtyard(state) {
  const pantryText = (got) => Object.entries(got).map(([id, n]) => `${INGREDIENTS[id].emoji ?? INGREDIENTS[id].icon} ${INGREDIENTS[id].name} ×${n}`);
  const crew = (flag) => state.characters.filter((c) => c[flag] && c.alive);
  const own = (site, list) => list.reduce((sum, c) => sum + workerYield(site, c), 0);
  const tire = (list, cost) => list.forEach((c) => (c.stamina = Math.max(0, c.stamina - cost)));
  const fieldHands = crew("farmToday");
  const barnHands = crew("barnToday");
  const yardHands = crew("scrapyardToday");
  const herbHands = crew("greenhouseToday");
  gainExpAll(state, [...fieldHands, ...barnHands, ...yardHands, ...herbHands], LEVEL_XP.work);
  const food = { farm: own("farm", fieldHands), barn: own("barn", barnHands) };
  state.resources.food += food.farm + food.barn;
  tire([...fieldHands, ...barnHands], FARM_STAMINA_COST);
  const { produced, kept } = resolveFarm(state);
  const goods = (kinds) => Object.entries(produced).filter(([id]) => kinds.some((k) => PRODUCERS[k].product === id))
    .map(([id, n]) => `${INGREDIENTS[id].emoji ?? INGREDIENTS[id].icon} ${INGREDIENTS[id].name} ×${n}`).join(", ");
  for (const [site, hands, kinds] of [["farm", fieldHands, FARM_GROUPS.fields], ["barn", barnHands, FARM_GROUPS.animals]]) {
    if (!hands.length) continue;
    const got = goods(kinds);
    addLog(state, `The ${WORK_SITES[site].name} brings in ${food[site]} food${got ? ` and ${got}` : ""} from ${hands.length} student(s).`);
  }
  if (kept.length) addLog(state, `At the Farm: ${kept.join(", ")}.`);
  const haul = own("scrapyard", yardHands);
  state.resources.materials += haul;
  tire(yardHands, YARD_STAMINA_COST);
  const yard = resolveYard(state);
  if (yardHands.length) {
    const made = [`${haul + yard.scrap} scrap`, ...(yard.research ? [`${yard.research} research`] : []), ...yard.items.map(itemLabel), ...pantryText(yard.pantry)];
    addLog(state, `The Scrapyard brings in ${made.join(", ")} from ${yardHands.length} student(s).`);
  }
  const herbs = own("greenhouse", herbHands);
  state.resources.medicine += herbs;
  tire(herbHands, GREENHOUSE_STAMINA_COST);
  const green = resolveGreenhouse(state);
  if (herbHands.length) addLog(state, `The Greenhouse brings in ${[`${herbs + green.medicine} medicine`, ...pantryText(green.pantry)].join(", ")} from ${herbHands.length} student(s).`);
  if (state.today) state.today.courtyard = { food: food.farm + food.barn, scrap: haul + yard.scrap, medicine: herbs + green.medicine };
}

// ---------- the Greenhouse's beds ----------
// state.greenhouseSlots has a slot list per herb bed (GREENHOUSE_JOBS), each { id, growth } — always
// in use, like the Scrapyard's piles: a bed grows back once it's picked.

export const greenhouseSlots = (state) => GREENHOUSE_SLOTS_BY_LEVEL[roomLevel(state, "greenhouse") - 1];

export function syncGreenhouse(state) {
  state.greenhouseSlots = state.greenhouseSlots || {};
  for (const kind of Object.keys(GREENHOUSE_JOBS)) {
    const list = (state.greenhouseSlots[kind] = state.greenhouseSlots[kind] || []);
    while (list.length < greenhouseSlots(state)) list.push({ id: kind, growth: 0 });
  }
}

// The Greenhouse's day: the crew picks what's ready (medicine, or coffee for the pantry), then every
// bed grows a day.
function resolveGreenhouse(state) {
  const out = { medicine: 0, pantry: {} };
  for (const side of Object.keys(GREENHOUSE_GROUPS)) {
    for (const [kind, i] of harvestPlan(state, side)) {
      const job = GREENHOUSE_JOBS[kind];
      if (job.medicine) {
        state.resources.medicine += job.medicine;
        out.medicine += job.medicine;
      }
      if (job.ingredient) {
        state.pantry[job.ingredient] = (state.pantry[job.ingredient] || 0) + 1;
        out.pantry[job.ingredient] = (out.pantry[job.ingredient] || 0) + 1;
      }
      state.greenhouseSlots[kind][i].growth = 0;
    }
  }
  for (const kind of Object.keys(GREENHOUSE_JOBS)) {
    for (const slot of state.greenhouseSlots[kind]) slot.growth = Math.min(GREENHOUSE_JOBS[kind].growDays, slot.growth + 1);
  }
  return out;
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
  if (state.dishesToday.length >= dishCapacity(state)) return false;
  if (state.resources.food < dish.food) return false;
  return Object.entries(dish.ingredients).every(([id, n]) => (state.pantry[id] || 0) >= n);
}

export function cookDish(state, dishId) {
  const dish = DISHES.find((d) => d.id === dishId);
  if (!dish || !canCookDish(state, dish)) return false;
  for (const [id, n] of Object.entries(dish.ingredients)) state.pantry[id] -= n;
  state.resources.food -= dish.food;
  state.dishesToday.push(dish.id);
  addLog(state, `The cafeteria serves ${dish.emoji ?? dish.icon} ${dish.name} — ${dish.desc}`);
  return true;
}

// ---------- student levels ----------
// Experience from what a student does (LEVEL_XP) raises their level, up to STUDENT_MAX_LEVEL —
// where they can be promoted to teacher.
export function gainExp(state, c, amount) {
  if (!c || !c.alive || c.role !== "student" || amount <= 0) return;
  c.level = c.level || 1;
  if (c.level >= STUDENT_MAX_LEVEL) return;
  c.exp = (c.exp || 0) + amount;
  while (c.level < STUDENT_MAX_LEVEL && c.exp >= xpToNextLevel(c.level)) {
    c.exp -= xpToNextLevel(c.level);
    c.level++;
    addLog(state, c.level >= STUDENT_MAX_LEVEL ? `⭐ ${c.name} reached level ${c.level} — ready to be promoted to teacher!` : `⭐ ${c.name} reached level ${c.level}.`);
  }
  if (c.level >= STUDENT_MAX_LEVEL) c.exp = 0;
}
const gainExpAll = (state, list, amount) => list.forEach((c) => gainExp(state, c, amount));

function grantXp(state, charId, subject, amount) {
  const c = getChar(state, charId);
  if (!c || !c.alive) return;
  const cap = gradeCap(c, subject);
  if (c.grades[subject] >= cap) return;
  const learning = 1 + c.grades.Physics * TUNE.xpPerInt + skillBonus(c, "Physics");
  c.xp[subject] += amount * traitGrowthMultiplier(c, subject) * dishMultiplier(state, "xp") * (1 + techPerk(state, "xp")) * learning;
  let guard = 0;
  while (c.xp[subject] >= xpThreshold(c.grades[subject]) && c.grades[subject] < cap && guard < 50) {
    c.xp[subject] -= xpThreshold(c.grades[subject]);
    c.grades[subject] = Math.min(cap, c.grades[subject] + 1);
    guard++;
  }
  refreshMaxStats(c);
}

// Sum of a perk across every owned research node (0 if none give it) — see TECH_TREE in data.js.
export function techPerk(state, key) {
  return state.techUnlocked.reduce((sum, id) => sum + (TECH_TREE.find((t) => t.id === id)?.perk[key] || 0), 0);
}

// Fortification (the Crafting Room) at the Night Watch: walls' HP and traps' damage, ×.
export const fortifyMult = (state) => 1 + state.fortification * FORTIFICATION_PER_POINT;



export function dishCapacity(state) {
  return cooksOnDuty(state).length * (1 + techPerk(state, "extraDishesPerCook"));
}

export function exploreStaminaCost(state) {
  return Math.round(STAMINA_COST_EXPLORE * (1 - techPerk(state, "exploreStaminaReduction")));
}

// ---------- expedition roles (EXPLORE_ROLES) ----------
// A student's score in each role: the average of the role's two stats (their own grades, not gear).
export function roleScores(c) {
  return Object.fromEntries(Object.entries(EXPLORE_ROLES).map(([role, r]) => [role, Math.round((c.grades[r.stats[0]] + c.grades[r.stats[1]]) / 2)]));
}
// The role their stats point to: the best score (ties go to the earlier role).
export function autoRole(c) {
  const scores = roleScores(c);
  return Object.keys(EXPLORE_ROLES).reduce((best, role) => (scores[role] > scores[best] ? role : best));
}
// Their role: where the player put them, or else where their stats point.
export const exploreRole = (c) => (c.exploreRole && EXPLORE_ROLES[c.exploreRole] ? c.exploreRole : autoRole(c));
// Moves a student to a role; moving them back to their stats' role clears the override. On a team
// with no free slot for the new role, they leave it.
export function setExploreRole(state, studentId, role) {
  const c = getChar(state, studentId);
  if (!c || c.role !== "student" || !EXPLORE_ROLES[role]) return false;
  c.exploreRole = role === autoRole(c) ? null : role;
  if (isExpeditionTeam(c.exploreTeam) && !teamHasRoom(state, c.exploreTeam, role, c.id)) c.exploreTeam = null;
  return true;
}
// Everyone back in the role their stats point to (leaving their team if its slots don't fit).
export function resetExploreRoles(state) {
  for (const c of state.characters) {
    if (!c.exploreRole) continue;
    c.exploreRole = null;
    if (isExpeditionTeam(c.exploreTeam) && !teamHasRoom(state, c.exploreTeam, autoRole(c), c.id)) c.exploreTeam = null;
  }
}

// ---------- expedition teams: bought with scrap, five slots each by role ----------
const isExpeditionTeam = (i) => i !== null && i !== undefined && i >= 0 && i < EXPLORE_TEAM_COSTS.length;
export const teamCount = (state) => Math.min(EXPLORE_TEAM_COSTS.length, state.teamSlots || 1);
export const teamRoleSlots = (role) => EXPLORE_TEAM_SLOTS.filter((r) => r === role).length;
export const teamMembers = (state, i) => state.characters.filter((c) => c.exploreTeam === i && c.alive);
// A free slot for `role` on team `i` (not counting `exceptId`, who may be moving within it).
export function teamHasRoom(state, i, role, exceptId = null) {
  return teamMembers(state, i).filter((c) => c.id !== exceptId && exploreRole(c) === role).length < teamRoleSlots(role);
}
// What the next team costs, or null once all are bought.
export const nextTeamCost = (state) => (teamCount(state) < EXPLORE_TEAM_COSTS.length ? EXPLORE_TEAM_COSTS[teamCount(state)] : null);
export function buyTeamSlot(state) {
  const cost = nextTeamCost(state);
  if (cost === null || state.resources.materials < cost) return false;
  state.resources.materials -= cost;
  state.teamSlots = teamCount(state) + 1;
  addLog(state, `🧭 A new expedition team is ready — Team ${state.teamSlots} (−${cost} scrap).`);
  return true;
}
// What one member adds to their team's power: the two stats of their role (fighters STR + CON,
// scouts DEX + CHA, supports INT + WIS), gear included.
export function memberPower(state, c) {
  const role = exploreRole(c);
  const base = EXPLORE_ROLES[role].stats.reduce((sum, s) => sum + effectiveGrade(state, c, s), 0);
  return Math.round(base * (1 + techPerk(state, `${role}Power`)));
}
// A team's power: its members' added up (`base`), plus teamwork — EXPLORE_TEAMWORK_BONUS for every
// member past the first (`bonus`, +20% for a full team). Its rank is that as a grade (an empty slot
// counts 0).
export function teamPower(state, i) {
  const members = teamMembers(state, i);
  const base = members.reduce((sum, c) => sum + memberPower(state, c), 0);
  const bonus = Math.max(0, members.length - 1) * (EXPLORE_TEAMWORK_BONUS + techPerk(state, "teamwork"));
  const power = Math.round(base * (1 + bonus));
  return { power, base, bonus, rank: gradeLetter(Math.min(100, Math.round(power / (EXPLORE_TEAM_SLOTS.length * 2)))) };
}
// The team power a place needs: more for every block further from the school, give or take its
// own difficulty.
export function expeditionNeed(location) {
  const blocks = hexDistance(location.hex.q, location.hex.r);
  return EXPEDITION_NEED.base + (blocks - EXPEDITION_NEED.nearest) * EXPEDITION_NEED.perBlock + (location.difficulty - 3) * EXPEDITION_NEED.perDifficulty;
}
export const expeditionBlocks = (location) => hexDistance(location.hex.q, location.hex.r);
// Harder places pay better (EXPEDITION_LOOT): what their supplies are multiplied by...
export function expeditionLootScale(location) {
  return Math.max(EXPEDITION_LOOT.min, 1 + (expeditionNeed(location) - EXPEDITION_NEED.base) / EXPEDITION_LOOT.perPower);
}
// ...and their gear level (1-5): the chance of finding gear and the best tier it can be.
export function expeditionGearLevel(location) {
  return Math.max(1, Math.min(5, Math.round((expeditionNeed(location) - EXPEDITION_LOOT.gearFrom) / EXPEDITION_LOOT.gearStep)));
}
export const expeditionGearChance = (location) => EXPEDITION_ITEM_CHANCE + expeditionGearLevel(location) * 0.08;
// A place's tier (1-4, by its difficulty: the rings out from the school) — or "raid" — for what its
// finds turn out to be (ITEM_DROP_ODDS).
export const poiTier = (location) => (location.raid ? "raid" : location.difficulty <= 2 ? location.difficulty : location.difficulty <= 4 ? 3 : 4);
// A team's odds at a place: EXPEDITION_ODDS_AT_NEED with exactly the power it needs, ±1% per
// EXPEDITION_POWER_PER_PERCENT over or under, plus research, minus a nest or the horde next door.
export function expeditionOdds(state, teamIndex, location) {
  const { power } = teamPower(state, teamIndex);
  const nearNest = nextToNest(state, location.hex.q, location.hex.r);
  const [lo, hi] = EXPEDITION_ODDS_RANGE;
  const raw = EXPEDITION_ODDS_AT_NEED + (power - expeditionNeed(location)) / EXPEDITION_POWER_PER_PERCENT / 100
    + techPerk(state, "expeditionSuccess") - (nearNest ? NEST_EXPEDITION_PENALTY : 0);
  return Math.max(lo, Math.min(hi, raw));
}
// Puts a student in one of a team's `role` slots (their role changes to it if needed).
export function assignTeamSlot(state, studentId, teamIndex, role) {
  const c = getChar(state, studentId);
  if (!c || !EXPLORE_ROLES[role]) return false;
  if (exploreRole(c) !== role) setExploreRole(state, studentId, role);
  return setExploreTeam(state, studentId, teamIndex);
}

// One research point per RESEARCH_ROOM_INT_PER_POINT of the combined INT of the teachers posted there
// and the students assisting today, plus the room's level bonus while anyone is working there.
export const researchCrew = (state) => state.characters.filter((c) => c.alive && !c.infection && ((c.role === "teacher" && c.post === "research") || c.researchToday));
// Fortification a student helping in the Crafting Room adds today.
export const craftHelpGain = (c) => Math.floor(c.grades.History / CRAFT_HELP_WIS_PER_POINT);

// A student's job in the Research or Crafting Room today (`flag` researchToday / craftingToday).
function setRoomJob(state, studentId, flag, roomKey, value) {
  const c = getChar(state, studentId);
  if (!c || c.role !== "student") return false;
  if (value) {
    if (c.infection || isBoarded(state, roomKey)) return false;
    const count = state.characters.filter((x) => x.alive && x[flag] && x.id !== c.id).length;
    if (count >= state.rooms[roomKey].studentCapacity) return false;
    leaveTurnOneJobs(state, c, flag);
  }
  c[flag] = !!value;
  return true;
}
export const setResearchToday = (state, id, value) => setRoomJob(state, id, "researchToday", "research", value);
export const setCraftingToday = (state, id, value) => setRoomJob(state, id, "craftingToday", "crafting", value);
export function researchRoomYield(state) {
  const researchers = researchCrew(state);
  if (!researchers.length) return 0;
  const totalInt = researchers.reduce((sum, c) => sum + c.grades.Physics, 0);
  return Math.floor((Math.floor(totalInt / RESEARCH_ROOM_INT_PER_POINT) + RESEARCH_BONUS_BY_LEVEL[roomLevel(state, "research") - 1]) * (1 + techPerk(state, "researchYield")));
}

// A classroom's lesson today, in grade points for every seated student: the room's level bonus
// plus each teacher's bonus for their grade in the subject. A student can't learn past the best
// teacher's own grade, so a class stops growing once it has caught up with its teacher.
export function classroomLesson(state, roomId) {
  const room = state.rooms.classrooms[roomId];
  const subject = room?.subject;
  const teachers = subject ? state.characters.filter((t) => t.role === "teacher" && t.alive && t.post === `classroom:${roomId}`) : [];
  // Unlike the training rooms, a classroom with no teacher teaches nothing.
  return lessonFrom(teachers.length ? subject : null, teachers, room?.level || 1, techPerk(state, "classXp"), techPerk(state, "gradeCap"));
}
// A day's teaching in `subject` from these teachers in a room of this level: its gain in grade
// points (the level bonus + each teacher's, times 1 + `boost`) and the ceiling nobody learns past
// — the best teacher's grade, or NO_TEACHER_CAP without one (and never below it), plus `capBonus`.
function lessonFrom(subject, teachers, level, boost, capBonus = 0) {
  if (!subject) return { subject: null, gain: 0, ceiling: 0, levelBonus: 0, teachers };
  const levelBonus = ROOM_STAT_BONUS_BY_LEVEL[level - 1];
  const base = levelBonus + teachers.reduce((sum, t) => sum + teachingBonus(t.grades[subject]), 0);
  return {
    subject,
    gain: Math.round(base * (1 + boost)),
    ceiling: Math.min(100, Math.max(NO_TEACHER_CAP, ...teachers.map((t) => t.grades[subject])) + capBonus),
    levelBonus,
    teachers,
  };
}
// What one seated student learns today (0 once they've reached the lesson's ceiling).
export function classGain(state, c) {
  if (!c || !c.seat || !c.alive || c.infection) return 0;
  const lesson = classroomLesson(state, c.seat.room);
  if (!lesson.subject) return 0;
  return Math.max(0, Math.min(lesson.gain, lesson.ceiling - c.grades[lesson.subject], gradeCap(c, lesson.subject) - c.grades[lesson.subject]));
}

// ---------- TURN 1: training ----------

export function resolveTraining(state) {
  const record = { learned: 0, taught: 0, trained: 0, rested: 0, healed: 0, research: 0, fortification: 0 };
  // classrooms — every seated student's grade in the room's subject rises by the day's lesson
  // (see classroomLesson), up to the teacher's own grade.
  for (const roomId of CLASSROOM_IDS) {
    const lesson = classroomLesson(state, roomId);
    if (!lesson.subject) continue; // no teacher here — nothing is taught
    let taught = 0;
    for (const sid of state.rooms.classrooms[roomId].seats.filter(Boolean)) {
      const c = getChar(state, sid);
      if (c && !c.infection) gainExp(state, c, LEVEL_XP.class);
      const add = classGain(state, c);
      if (!add) continue;
      c.grades[lesson.subject] += add;
      refreshMaxStats(c);
      taught++;
      record.learned += add;
      record.taught++;
    }
    if (taught) addLog(state, `${SUBJECT_LABEL[lesson.subject]} class: ${taught} student${taught === 1 ? "" : "s"} learned (up to +${lesson.gain} ${STAT_OF_SUBJECT[lesson.subject]}).`);

  }

  // training — the Gymnasium raises STR and Acrobatics DEX, taught like a class (gymLesson): the
  // room's level bonus + each teacher's, up to the teacher's own grade (NO_TEACHER_CAP without one).
  // A higher STR / DEX raises max HP / max stamina too (refreshMaxStats).
  for (const side of ["PE", "Gymnastics"]) {
    const students = state.characters.filter((c) => c.gymToday === side && c.alive);
    if (!students.length) continue;
    const lesson = gymLesson(state, side);
    for (const c of students) {
      gainExp(state, c, LEVEL_XP.training);
      const add = trainingGain(state, c, side);
      record.trained++;
      record.learned += add;
      if (add) {
        const before = c.maxHp;
        c.grades[side] += add;
        refreshMaxStats(c);
        c.hp = Math.min(c.maxHp, c.hp + Math.max(0, c.maxHp - before));
      }
    }
    addLog(state, `${GYM_SIDES[side].room}: ${students.length} student(s) trained, up to +${lesson.gain} ${GYM_SIDES[side].gains} each.`);
  }

  // cafeteria — cooks stretch the rations (their dishes are served on demand, see cookDish).
  const cooks = cooksOnDuty(state);
  if (cooks.length) {
    const rations = CAFETERIA_RATIONS_BY_LEVEL[roomLevel(state, "cafeteria") - 1];
    state.resources.food += rations;
    addLog(state, `${cooks.map((c) => c.name).join(" & ")} stretch${cooks.length === 1 ? "es" : ""} the rations (+${rations} food).`);
  }

  // nurse's office — each patient is either healed (HP, for medicine; a nurse's Biology adds on top,
  // and with no medicine to spare they only get bed rest) or rests (stamina, free).
  const resting = state.characters.filter((c) => c.restToday && c.alive);
  const rest = cafeteriaRest(state);
  for (const c of resting) c.stamina = Math.min(c.maxStamina, c.stamina + rest);
  if (resting.length) addLog(state, `${resting.length} student(s) rested in the Cafeteria (+${rest} stamina).`);
  record.rested = resting.length;
  record.healed = state.characters.filter((c) => c.infirmaryToday && c.alive).length;
  const patients = state.characters.filter((c) => c.infirmaryToday && c.alive);
  for (const c of patients) {
    const treated = state.resources.medicine >= INFIRMARY_MEDICINE_PER_PATIENT;
    if (treated) state.resources.medicine -= INFIRMARY_MEDICINE_PER_PATIENT;
    const healed = healAmount(state, c, treated);
    c.hp += healed;
    c.injured = c.hp < c.maxHp * 0.5;
    addLog(state, `${c.name} ${treated ? "was treated" : "got bed rest (no medicine to spare)"} in the Nurse's Office (+${healed} HP).`);
  }

  // research room
  const researchGain = researchRoomYield(state);
  record.research = Math.max(0, researchGain);
  if (researchGain > 0) {
    state.resources.research += researchGain;
    addLog(state, `The Research Room produces ${researchGain} research.`);
  }
  gainExpAll(state, state.characters.filter((c) => c.researchToday && c.alive), LEVEL_XP.work);

  // crafting
  for (const crafter of state.characters.filter((c) => c.role === "teacher" && c.post === "crafting" && c.alive)) {
    if (state.resources.materials <= 0) break;
    const use = Math.min(state.resources.materials, 4);
    state.resources.materials -= use;
    const gain = crafterGain(state, crafter, use);
    state.fortification = Math.min(FORTIFICATION_CAP, state.fortification + gain);
    record.fortification += gain;
    addLog(state, `${crafter.name} reinforces the school defenses (+${gain} fortification).`);
  }
  const helpers = state.characters.filter((c) => c.craftingToday && c.alive && !c.infection);
  const helped = helpers.reduce((sum, c) => sum + craftHelpGain(c), 0);
  if (helped) {
    record.fortification += helped;
    state.fortification = Math.min(FORTIFICATION_CAP, state.fortification + helped);
    addLog(state, `${helpers.length} student${helpers.length === 1 ? "" : "s"} helped in the Crafting Room (+${helped} fortification).`);
  }
  gainExpAll(state, helpers, LEVEL_XP.work);

  // the Radio Station: a survivor may hear the school's broadcast
  if (!isBoarded(state, "radio") && Math.random() < radioRecruitChance(state)) {
    const recruit = makeCharacter(rollRecruitRole(state), Math.random() < 0.5 ? "M" : "F");
    if (addRecruit(state, recruit)) addLog(state, `📻 ${recruit.name} heard the school's broadcast and wants to join.`);
  }

  gainExpAll(state, state.characters.filter((c) => c.radioToday && c.alive), LEVEL_XP.work);

  if (state.today) state.today.classes = record;
  resolveCourtyard(state);
  addLog(state, `Turn 1 (Classes) resolved.`);
}

// ---------- TURN 2: exploration ----------

// Harder places find gear more often (expeditionGearLevel), and of a better rarity (their tier's
// ITEM_DROP_ODDS); a place that leans toward a kind of gear (lootBias) turns it up half the time.
function rollExpeditionItem(state, location, success, bonus = 0) {
  const chance = (success ? expeditionGearChance(location) + (location.gearBonus || 0) : EXPEDITION_ITEM_CHANCE_FAILED) + techPerk(state, "itemChance") + bonus;
  if (Math.random() >= chance) return null;
  const item = rollItem(ITEM_DROP_ODDS[poiTier(location)], location.lootBias && Math.random() < 0.5 ? location.lootBias : null);
  state.armory.push(item);
  return item;
}

function rollExpeditionIngredient(state, location, success) {
  const chance =
    (success ? EXPEDITION_INGREDIENT_CHANCE + (location.ingredientBonus || 0) : EXPEDITION_INGREDIENT_CHANCE_FAILED) +
    techPerk(state, "ingredientChance");
  if (Math.random() >= chance) return null;
  const id = pick(SCAVENGED_INGREDIENTS); // staple crops only come from the Farm
  const qty = randInt(1, 3);
  state.pantry[id] = (state.pantry[id] || 0) + qty;
  return { id, qty };
}

// Seeds for the Farm's fields or, where a location has them, livestock for its pens.
function rollExpeditionStock(state, location, success) {
  const chance = success ? EXPEDITION_SEED_CHANCE + (location.seedBonus || 0) : EXPEDITION_SEED_CHANCE_FAILED;
  if (Math.random() >= chance) return null;
  const found = location.animals && Math.random() < location.animalChance
    ? { id: pick(location.animals), qty: 1 }
    : { id: pick(FARM_CROPS), qty: randInt(1, 2) };
  addStock(state, found.id, found.qty);
  return found;
}

// ---------- expedition encounters ----------
// On the way in, each team meets a situation (EXPEDITION_ENCOUNTERS) and the player picks who
// handles it: the team's best of that role, with a chance from their role's stats (memberPower,
// 0-200 → ENCOUNTER_CHANCE). It swings the expedition's odds (ENCOUNTER_EFFECT); the result is
// kept in state.encounters until the teams go in.
export const sentTeams = (state) => [0, 1, 2].filter((i) => state.teamLocations[i] && teamMembers(state, i).length);
export const pickEncounter = () => pick(EXPEDITION_ENCOUNTERS).id;
export function encounterOption(state, teamIndex, role) {
  const who = teamMembers(state, teamIndex).filter((c) => exploreRole(c) === role).sort((a, b) => memberPower(state, b) - memberPower(state, a))[0] || null;
  const { base, perPower, noOne, max } = ENCOUNTER_CHANCE;
  return { who, chance: who ? Math.min(max, base + memberPower(state, who) * perPower) : noOne };
}
export function resolveEncounter(state, teamIndex, encounterId, role) {
  const enc = EXPEDITION_ENCOUNTERS.find((e) => e.id === encounterId);
  const { who, chance } = encounterOption(state, teamIndex, role);
  const ok = Math.random() < chance;
  const opt = enc.options[role];
  const result = { id: encounterId, role, ok, whoId: who?.id || null, text: `${who ? who.name : "The team"} ${ok ? opt.good : opt.bad}` };
  state.encounters = { ...(state.encounters || {}), [teamIndex]: result };
  addLog(state, `${teamLabelFor(teamIndex)} on the way in: ${result.text}.`);
  return result;
}
const teamLabelFor = (i) => `Team ${i + 1}`;

// `fights`: each team's run through its place (startExpeditionRun), by team — a team without one
// rolls its odds.
export function resolveExploration(state, fights = {}) {
  let teamsSent = 0;
  let successes = 0;
  const itemsFound = [];
  const ingredientsFound = [];
  const stockFound = [];
  const teams = []; // one report per team, for the expedition report screen
  for (let teamIndex = 0; teamIndex < 3; teamIndex++) {
    const locationId = state.teamLocations[teamIndex];
    const location = LOCATIONS.find((l) => l.id === locationId);
    const members = state.characters.filter((c) => c.exploreTeam === teamIndex && c.alive);
    if (!location || !members.length) continue;
    teamsSent++;
    const nearNest = nextToNest(state, location.hex.q, location.hex.r);
    const report = {
      teamIndex, locationId: location.id, memberIds: members.map((c) => c.id), nearNest,
      success: false, loot: {}, finds: [], hurt: [], lost: [], recruit: null,
      hurtIds: {}, lostIds: [], encounter: (state.encounters || {})[teamIndex] || null, // for the report
    };
    teams.push(report);

    const avg = (statKey) => members.reduce((sum, c) => sum + effectiveGrade(state, c, statKey), 0) / members.length;
    const safety = (avg("Biology") + avg("History")) / 2; // CON and WIS keep a team safe
    const bestSkill = (subject) => members.reduce((m, c) => Math.max(m, skillBonus(c, subject)), 0);
    const cha = avg("SocialStudies");

    // the team's power against what the place needs (expeditionNeed: further out needs more)
    // ...and how its encounter on the way in went (+ or − on the odds)
    const encounterBonus = report.encounter ? (report.encounter.ok ? ENCOUNTER_EFFECT.good : ENCOUNTER_EFFECT.bad) : 0;
    const successChance = clamp01(expeditionOdds(state, teamIndex, location) + encounterBonus);
    const fight = fights[teamIndex];
    const success = fight ? fight.won : Math.random() < successChance;
    report.success = success;
    if (fight) {
      Object.assign(report, { rooms: [fight.room, fight.rooms], noise: fight.noise, horde: fight.horde, recruit: fight.recruit });
      report.finds.push(...fight.finds);
    }

    // WIS finds more, and harder places have more to find; a run brings home its share (by the rooms cleared)
    const haul = expeditionHaul(state, members, location, fight ? runShare(fight) : success ? 1 : 0.35);
    const dangerReq = location.danger * 15;
    const baseCasualty =
      clamp01(0.05 + (dangerReq - safety) / 150 + (nearNest ? NEST_EXPEDITION_PENALTY : 0)) * (success ? 0.5 : 1.2) * (1 - techPerk(state, "casualtyReduction")) *
      (1 - avg("Gymnastics") * TUNE.expeditionStealthPerDex); // a stealthy team gets jumped less

    if (success) {
      successes++;
      for (const key of Object.keys(location.rewards)) {
        const amt = Math.round(haul[key] * (0.8 + Math.random() * 0.4));
        state.resources[key] += amt;
        report.loot[key] = amt;
      }
      addLog(state, `${location.name}: expedition succeeded! Loot brought home.`);
      if (location.serumChance && Math.random() < location.serumChance) {
        state.resources.serum++;
        report.loot.serum = 1;
        addLog(state, `💉 The team found a vial of antiviral serum at the ${location.name}.`);
      }
    } else {
      for (const key of Object.keys(location.rewards)) {
        const amt = Math.round(haul[key] * (fight ? 0.8 + Math.random() * 0.4 : 0.5 + Math.random() * 0.5)); // (a run's share is already halved)
        state.resources[key] += amt;
        report.loot[key] = amt;
      }
      addLog(state, `${location.name}: expedition struggled and barely scraped by.`);
      adjustHappiness(state, -HAPPINESS_LOSS_MISSION_FAIL);
    }

    const found = rollExpeditionItem(state, location, success, avg("Physics") * TUNE.itemChancePerInt + (fight && fight.room >= fight.rooms ? EXPEDITION_ROOM.clearGear : 0));
    if (found) {
      itemsFound.push(found);
      report.finds.push(itemLabel(found));
      addLog(state, `The team brought back ${itemLabel(found)} from the ${location.name} — it's in the armory.`);
    }
    const ingredient = rollExpeditionIngredient(state, location, success);
    if (ingredient) {
      ingredientsFound.push(ingredient);
      const info = INGREDIENTS[ingredient.id];
      report.finds.push(`${info.emoji ?? info.icon} ${info.name} ×${ingredient.qty}`);
      addLog(state, `The team brought back ${info.emoji ?? info.icon} ${info.name} ×${ingredient.qty} from the ${location.name} for the pantry.`);
    }
    const stock = rollExpeditionStock(state, location, success);
    if (stock) {
      stockFound.push(stock);
      report.finds.push(stockLabel(stock.id, stock.qty));
      addLog(state, `The team brought back ${stockLabel(stock.id, stock.qty)} from the ${location.name} for the ${PRODUCERS[stock.id].facility}.`);
    }

    const staminaCost = exploreStaminaCost(state);
    gainExpAll(state, members, LEVEL_XP.expedition + (success ? LEVEL_XP.expeditionWin : 0));
    const dead = fight ? settleFallen(state, fight.fallen, `at the ${location.name}`) : [];
    for (const c of members) {
      c.stamina = Math.max(0, c.stamina - staminaCost);
      if (fight) {
        if (dead.includes(c.id)) {
          report.lost.push(c.name);
          report.lostIds.push(c.id);
        } else if (fight.hurt[c.id]) {
          report.hurt.push(`${c.name} (-${fight.hurt[c.id]} HP)`);
          report.hurtIds[c.id] = fight.hurt[c.id];
        }
        if (!fight.fallen.some((f) => f.id === c.id)) {
          grantXp(state, c.id, "PE", 2 + randInt(0, 2));
          grantXp(state, c.id, "Gymnastics", 2 + randInt(0, 2));
        }
        continue;
      }
      const roll = Math.random();
      const personalCasualty = clamp01(baseCasualty - (effectiveGrade(state, c, "Biology") - 40) / 400);
      if (roll < personalCasualty) {
        if (Math.random() < 0.25) {
          killCharacter(state, c);
          report.lost.push(c.name);
          report.lostIds.push(c.id);
          addLog(state, `${c.name} was lost during the ${location.name} run.`);
        } else {
          const dmg = randInt(15, 40);
          c.hp = Math.max(1, c.hp - dmg);
          c.injured = c.hp < c.maxHp * 0.5;
          report.hurt.push(`${c.name} (-${dmg} HP)`);
          report.hurtIds[c.id] = dmg;
          addLog(state, `${c.name} was injured at ${location.name} (-${dmg} HP).`);
        }
      } else {
        grantXp(state, c.id, "PE", 2 + randInt(0, 2));
        grantXp(state, c.id, "Gymnastics", 2 + randInt(0, 2));
      }
    }

    const recruitBonus = location.recruitBonus || 1;
    const recruitChance = clamp01(
      ((cha - 20) / 150) * recruitBonus * (success ? 1 : 0.4) * dishMultiplier(state, "recruitChance") * (1 + techPerk(state, "recruitChance")) *
        (1 + bestSkill("SocialStudies"))
    );
    if (Math.random() < recruitChance) {
      const role = rollRecruitRole(state);
      const recruit = makeCharacter(role, Math.random() < 0.5 ? "M" : "F");
      if (addRecruit(state, recruit)) {
        report.recruit = recruit.name;
        addLog(state, `Your team found a survivor at ${location.name}: ${recruit.name} wants to join.`);
      }
    }

  }

  const raid = resolveRaid(state, fights[RAID_TEAM]);

  state.expeditionsSent = (state.expeditionsSent || 0) + teamsSent;
  if (state.today) {
    const loot = {};
    for (const t of teams) for (const [k, v] of Object.entries(t.loot)) loot[k] = (loot[k] || 0) + v;
    state.today.exploration = {
      sent: teamsSent, successes, loot,
      places: teams.map((t) => ({ id: t.locationId, success: t.success })),
      finds: teams.reduce((s, t) => s + t.finds.length, 0),
      hurt: teams.reduce((s, t) => s + t.hurt.length, 0) + (raid?.hurt?.length || 0),
      lost: [...teams.flatMap((t) => t.lost), ...(raid?.lost || [])],
      recruits: teams.filter((t) => t.recruit).length + (raid?.recruit ? 1 : 0),
      raid: raid && !raid.calledOff ? { bossName: raid.bossName, won: raid.won } : null,
    };
  }
  state.encounters = {}; // today's encounters are spent
  addLog(state, `Turn 2 (Exploration) resolved.`);
  return { teamsSent, successes, teams, raid, itemsFound, ingredientsFound, stockFound };
}

// ---------- TURN 3: defense (entrance grid battle) ----------
// The whole fight is simulated up front, tick by tick, on the entrance grid: zombies spawn in the
// bottom rows and shamble one row up per tick; each defender hits the most advanced zombie within
// reach (melee weapon or fists first if anything's that close, otherwise their ranged weapon);
// walls block a lane until smashed, traps hurt whatever walks over them. A zombie that walks off
// the top row breaks into the school.
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
  const third = ENTRANCE_ZONES.students;
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
  const ranged = eq.rangedWeapon ? { ...eq.rangedWeapon, range: eq.rangedWeapon.range + techPerk(state, "rangedRange") } : null;
  return {
    melee: eq.meleeWeapon || FIST_WEAPON,
    ranged,
    meleeMult: (0.5 + effectiveGrade(state, c, "PE") / 100) * chili * (1 + techPerk(state, "meleeDamage")) * (1 + skillBonus(c, "PE")),
    rangedMult: (0.5 + effectiveGrade(state, c, "Gymnastics") / 100) * chili * (1 + techPerk(state, "rangedDamage")),
    hitChance: Math.min(0.95, 0.7 + effectiveGrade(state, c, "Gymnastics") / 500),
    armorMult: Math.max(0.3, (1 - effectiveGrade(state, c, "Biology") / 250) * (1 - skillBonus(c, "Biology"))),
    dodge: Math.min(0.5, effectiveGrade(state, c, "Gymnastics") * TUNE.dodgePerDex + skillBonus(c, "Gymnastics")),
  };
}

// ---------- the night battle, fought live ----------
// startNightBattle sets the night up; battleTick plays one turn (the UI calls it on a timer, and
// the player can step in between turns with night actions); between waves the battle pauses
// ("break") so defenders can be moved; finishNightBattle applies the outcome to the school.
// resolveDefense runs a whole night at once.

// ----- the defenders' classes (NIGHT_CLASSES) -----
// A student's best subject: their highest grade (the first, on a tie).
export const bestSubject = (c) => SUBJECTS.reduce((best, s) => (c.grades[s] > c.grades[best] ? s : best), SUBJECTS[0]);
// Their ★ favourite subject (their best grade if they have none).
export const favoriteSubject = (c) => (SUBJECTS.includes(c.favorite) ? c.favorite : bestSubject(c));
// Their class on the Night Watch, by that favourite.
export const nightClass = (c) => Object.keys(NIGHT_CLASSES).find((k) => NIGHT_CLASSES[k].subject === favoriteSubject(c));
// Whether they have their class's second ability: the third skill of its subject's talent tree.
export const nightAbility2 = (c) => skillCount(c, NIGHT_CLASSES[nightClass(c)].subject) >= NIGHT_ABILITY2_SKILLS;
// … and their third: the fifth (S) skill.
export const nightAbility3 = (c) => skillCount(c, NIGHT_CLASSES[nightClass(c)].subject) >= NIGHT_ABILITY3_SKILLS;
// Their HP on watch, ×: a Tank's 1.5 (2 with Colossus).
export function nightHpMult(c) {
  const C = NIGHT_CLASSES[nightClass(c)];
  return (C.hpMult || 1) + (C.ability3.hpBonus && nightAbility3(c) ? C.ability3.hpBonus : 0);
}
// The morale a night starts with: the school's Morale.
export const nightStartMorale = (state) => Math.max(0, Math.floor(state.happiness || 0));
// What tonight's line-up costs to post, in the order it was placed (the order it's paid for).
export function nightPosting(state) {
  const placed = Object.entries(state.entranceGrid.students)
    .map(([key, id]) => ({ key, c: getChar(state, id) }))
    .filter(({ c }) => c && c.alive && !c.infection);
  let left = nightStartMorale(state);
  return placed.map(({ key, c }) => {
    const cost = NIGHT_MORALE.post;
    const posted = left >= cost;
    if (posted) left -= cost;
    return { key, c, cost, posted };
  });
}

// Tonight's weather: rolled at random the first time the night is looked at, then kept in the save
// (state.weather) so it doesn't change on a reload. The first night is always clear.
export function nightCondition(state) {
  if (state.day <= 1) return NIGHT_CONDITIONS.clear;
  if (state.weather?.day !== state.day || !NIGHT_CONDITIONS[state.weather.id]) {
    const pool = Object.values(NIGHT_CONDITIONS);
    let roll = Math.random() * pool.reduce((sum, c) => sum + c.weight, 0);
    const pick = pool.find((c) => (roll -= c.weight) < 0) || NIGHT_CONDITIONS.clear;
    state.weather = { day: state.day, id: pick.id };
  }
  return NIGHT_CONDITIONS[state.weather.id];
}

// The lanes the first zombies appear in on the fight's first turn: rolled the first time the night
// is looked at and kept in the save (state.opening), so the planning board can mark them.
export function nightOpening(state) {
  const size = state.entranceGrid.size;
  if (state.opening?.day !== state.day || state.opening.size !== size) {
    const first = Math.min(Math.ceil(size / 2), zombieCountForDay(state.day));
    state.opening = { day: state.day, size, cols: shuffled([...Array(size).keys()]).slice(0, first) };
  }
  return state.opening.cols;
}

// The horde comes in 1 wave up to 6 zombies, 2 up to 14, 3 beyond.
export const nightWaveCount = (zombies) => (zombies <= 6 ? 1 : zombies <= 14 ? 2 : 3);

// What each night action costs in morale tonight (Rally Drills research makes Rally cheaper).
export function nightActionCost(state) {
  return Object.fromEntries(Object.entries(NIGHT_ACTIONS).map(([id, a]) => [id, Math.max(10, a.morale - (id === "rally" ? 20 * techPerk(state, "rallyUses") : 0))]));
}

// A screamer's howl: a zombie within range of one (not itself) hits harder.
function howlMult(b, z) {
  let m = 1;
  for (const o of b.zombies) {
    const H = ZOMBIE_TYPES[o.type].howl;
    if (H && o.alive && o !== z && chebyshev(o, z) <= H.range) m = Math.max(m, H.mult);
  }
  return m;
}

function battleSnapshot(b, events) {
  return {
    tick: b.tick,
    events,
    zombies: b.zombies.filter((z) => z.alive).map((z) => ({ id: z.id, type: z.type, row: z.row, col: z.col, hp: z.hp, maxHp: z.maxHp, windup: z.windup ? { ...z.windup } : null, enraged: !!z.enraged, howled: howlMult(b, z) > 1 })),
    students: b.students.map((s) => ({ id: s.id, row: s.row, col: s.col, hp: Math.max(0, s.hp), maxHp: s.maxHp, downed: s.downed, cls: s.cls, ability2: s.ability2, ability3: s.ability3 })),
    structures: Object.values(b.structures).map((st) => ({ key: st.key, id: st.def.id, hp: st.hp, maxHp: st.maxHp, destroyed: st.destroyed })),
    killed: b.killed,
    breached: b.breached,
    spawned: b.spawned,
    wave: b.wave,
    morale: Math.floor(b.morale),
  };
}

// One student as a fighter tonight, on (row, col): their class's weapon and stat, HP (a Tank's
// extra on top), the weather's effect on their class, and what posting them cost.
function nightFighter(state, c, row, col, cost, condition, chili) {
  const cls = nightClass(c);
  const C = NIGHT_CLASSES[cls];
  const grade = effectiveGrade(state, c, C.subject);
  const base = battleStats(state, c);
  const eq = c.equipment || {};
  // (Medics and Ralliers carry no weapon: they only shove a zombie in front of them, with their fists)
  const weapon = C.weapon === "ranged" ? eq.rangedWeapon || THROWN_ROCKS : C.weapon === "melee" ? eq.meleeWeapon || FIST_WEAPON : FIST_WEAPON;
  const kindMult = C.weapon === "melee" ? (1 + techPerk(state, "meleeDamage")) * (1 + skillBonus(c, "PE")) : C.weapon === "ranged" ? 1 + techPerk(state, "rangedDamage") : 1;
  const s = {
    id: c.id, cls, row, col, hp: c.hp, maxHp: c.maxHp, bonusHp: 0, downed: false, kills: 0, usedMelee: false, usedRanged: false,
    // what they did tonight, for the meters after the fight
    stats: { dmg: 0, taken: 0, healed: 0, morale: 0, buffed: 0, slowed: 0, repaired: 0 },
    hitChance: Math.min(0.95, base.hitChance + techPerk(state, "watchHit")), armorMult: base.armorMult, dodge: base.dodge,
    // a critical hit (double damage): 5%, plus 1% for every 10 DEX
    critChance: BATTLE_CRIT.base + effectiveGrade(state, c, "Gymnastics") * BATTLE_CRIT.perDex,
    // their class's stat makes them better at their job: ×(1 + stat/100)
    weapon, grade, dmgMult: (1 + grade / 100) * (C.dmgMult || 1) * chili * kindMult, mendMult: 1, timer: 0, cost,
    ability2: nightAbility2(c), ability3: nightAbility3(c), cheered: 0,
  };
  s.secondWind = cls === "tank" && s.ability2; // Second Wind, once a night
  if (nightHpMult(c) > 1) { // a Tank's extra HP, lost first
    s.bonusHp = Math.round(c.maxHp * (nightHpMult(c) - 1));
    s.hp += s.bonusHp;
    s.maxHp += s.bonusHp;
  }
  if (condition.role === cls) { // tonight's weather holds one class back
    s.dmgMult *= condition.dmg ?? 1;
    s.mendMult = condition.mend ?? 1;
  }
  return s;
}

export function startNightBattle(state) {
  // Anyone flagged as defending without a spot on the grid (e.g. an older save) takes the next one.
  for (const c of state.characters.filter((c) => c.defending && c.alive)) {
    if (Object.values(state.entranceGrid.students).includes(c.id)) continue;
    const cell = firstFreeEntranceCell(state);
    if (cell) state.entranceGrid.students[cell] = c.id;
    else c.defending = false;
  }
  const grid = state.entranceGrid;
  const size = grid.size;
  const comp = hordeComposition(state.day);
  const queue = shuffled(["walker", "runner", "brute", "spitter", "screamer"].flatMap((t) => Array(comp[t]).fill(t)));
  if (comp.boss) queue.push("boss"); // the boss brings up the rear
  const waveCount = nightWaveCount(queue.length);
  const perWave = Math.ceil(queue.length / waveCount);
  const condition = nightCondition(state);

  // posting the line-up costs morale, in the order it was placed; whoever can't be paid for yet
  // waits in reserve and joins once kills and Ralliers raise the morale (battleTick)
  const posting = nightPosting(state);
  const chili = dishMultiplier(state, "battleDamage");
  const lineup = posting.map(({ key, c, cost }) => {
    const [row, col] = key.split(",").map(Number);
    return nightFighter(state, c, row, col, cost, condition, chili);
  });
  const students = lineup.filter((s, i) => posting[i].posted);
  const spent = students.reduce((sum, s) => sum + s.cost, 0);
  const squad = squadModifiers(state, lineup.map((s) => getChar(state, s.id)));
  squad.trapMult *= (1 + techPerk(state, "trapDamage")) * fortifyMult(state);

  const structures = {};
  for (const [key, structureId] of Object.entries(grid.defenses)) {
    const def = DEFENSE_STRUCTURES.find((d) => d.id === structureId);
    if (!def) continue;
    const [row, col] = key.split(",").map(Number);
    const maxHp = Math.round((def.hp || 0) * (1 + techPerk(state, "wallHp")) * fortifyMult(state) * squad.wallMult);
    structures[key] = { key, row, col, def, hp: maxHp, maxHp, destroyed: false };
  }

  const b = {
    size, rows: ENTRANCE_ROWS, condition, thorns: techPerk(state, "wallThorns"),
    zStats: zombieStatsForDay(state.day),
    waves: Array.from({ length: waveCount }, (_, i) => queue.slice(i * perWave, (i + 1) * perWave)),
    wave: 0, waveSpawned: 0, waveTick: 0,
    toSpawn: queue.length, spawned: 0, killed: 0, breached: 0,
    zombies: [], students, structures, squad,
    morale: nightStartMorale(state) - spent,
    opening: [...nightOpening(state)], // the first turn's lanes, as marked while planning
    reserve: lineup.filter((s, i) => !posting[i].posted),
    lastStand: techPerk(state, "lastStand") > 0,
    bossName: isBossNight(state.day) ? bossNameForDay(state.day) : null,
    chili, rally: 0,
    tick: 0, frames: [], phase: "fight",
  };
  b.frames.push(battleSnapshot(b, []));
  return b;
}

const zombieAt = (b, row, col) => b.zombies.find((z) => z.alive && z.row === row && z.col === col);
const studentAt = (b, row, col) => b.students.find((s) => !s.downed && s.row === row && s.col === col);
const wallAt = (b, row, col) => {
  const st = b.structures[`${row},${col}`];
  return st && st.def.blocks && !st.destroyed ? st : null;
};
// A zombie put down: it's counted, and the defenders' morale rises.
function killZombie(b, z, events) {
  z.alive = false;
  z.killed = true;
  b.killed++;
  b.morale += NIGHT_MORALE.perKill;
  events.push({ type: "kill", at: [z.row, z.col], boss: z.type === "boss", ztype: z.type });
}
// A zombie stepping onto a trap (or appearing on one): it's cut, and may be snagged in place.
// Returns false if that killed it.
function springTrap(b, z, events) {
  const trap = b.structures[`${z.row},${z.col}`];
  if (!trap || trap.def.blocks || !trap.def.enterDamage) return true;
  const dmg = Math.round(trap.def.enterDamage * b.squad.trapMult);
  z.hp -= dmg;
  events.push({ type: "trap", at: [z.row, z.col], dmg });
  if (trap.def.slows && !ZOMBIE_TYPES[z.type].unsnaggable) z.snagged = true;
  if (z.hp <= 0) {
    killZombie(b, z, events);
    return false;
  }
  return true;
}

// The wave's next zombie appears on (row, col).
function spawnZombie(b, type, row, col) {
  const T = ZOMBIE_TYPES[type];
  const raidBoss = type === "boss" && b.bossStats; // (a raid's boss brings its own)
  const hp = raidBoss ? raidBoss.hp : Math.round(b.zStats.hp * T.hpMult);
  const z = { id: b.spawned + 1, type, row, col, hp, maxHp: hp, dmg: raidBoss ? raidBoss.dmg : Math.max(1, Math.round(b.zStats.damage * T.dmgMult)), alive: true, snagged: false, walk: 0, slow: 0 };
  b.zombies.push(z);
  b.spawned++;
  b.waveSpawned++;
  return z;
}

// One turn of the night: the next zombies of this wave appear on the road, the defenders do their
// class's job, the horde moves up its lanes. Then: a break before the next wave once this one's
// all spawned and gone, or the end of the night after the last.
export function battleTick(state, b) {
  if (b.phase !== "fight") return null;
  const events = [];
  const size = b.size;
  b.tick++;
  b.waveTick++;
  const wave = b.waves[b.wave];

  if (b.waveTick === 1) events.push({ type: "waveStart", wave: b.wave });
  // 1. the next few zombies appear on the road, each in a free lane
  const road = b.rows - 1;
  for (let n = 0; n < Math.ceil(size / 2) && b.waveSpawned < wave.length; n++) {
    const free = [];
    for (let col = 0; col < size; col++) if (!zombieAt(b, road, col)) free.push(col);
    if (!free.length) break;
    // the opening zombies take the lanes the planning board marked
    const planned = b.tick === 1 ? b.opening.shift() : undefined;
    const col = planned !== undefined && free.includes(planned) ? planned : pick(free);
    const z = spawnZombie(b, wave[b.waveSpawned], road, col);
    if (z.type === "boss") events.push({ type: "bossArrives", at: [road, col] });
    springTrap(b, z, events); // (a trap under it gets it as it arrives)
  }

  // reinforcements: whoever the line-up couldn't pay for joins, in order, as soon as morale allows
  // (and their square's clear)
  while (b.reserve.length && b.morale >= b.reserve[0].cost) {
    const s = b.reserve[0];
    if (studentAt(b, s.row, s.col) || zombieAt(b, s.row, s.col)) break;
    b.reserve.shift();
    b.morale -= s.cost;
    b.students.push(s);
    events.push({ type: "posted", at: [s.row, s.col], id: s.id });
  }

  // 2. the defenders, each doing their class's job
  // Rally Cry: everyone in a lane with a Rallier who has it gets +20% HP (extra HP, lost first) for
  // as long as the Rallier stands — and +20% damage (strike, below)
  const cry = NIGHT_CLASSES.rallier.ability2;
  for (const s of b.students) {
    const cheered = !s.downed && b.students.some((r) => !r.downed && r.cls === "rallier" && r.ability2 && r.col === s.col);
    if (cheered && !s.cheered) {
      s.cheered = Math.round(s.maxHp * cry.hp);
      s.maxHp += s.cheered;
      s.hp += s.cheered;
      s.bonusHp += s.cheered;
    } else if (!cheered && s.cheered) {
      s.maxHp -= s.cheered;
      s.bonusHp -= s.cheered;
      s.hp = Math.min(s.hp, s.maxHp);
      s.cheered = 0;
    }
  }
  const rallied = b.rally > 0 ? 1.5 : 1;
  // one attack from `s` on zombie `z` (a cleave's side blows can't crit or break a wind-up)
  const strike = (s, z, side = false) => {
    const C = NIGHT_CLASSES[s.cls];
    const melee = C.weapon !== "ranged";
    if (melee) s.usedMelee = true;
    else s.usedRanged = true;
    // its type fights back: a runner slips melee blows, armour shrugs off shots, a weak spot doesn't
    const T = ZOMBIE_TYPES[z.type];
    const evaded = melee && T.meleeEvade && Math.random() < T.meleeEvade;
    const hit = !evaded && Math.random() < s.hitChance;
    const crit = !side && hit && Math.random() < s.critChance;
    const typeMult = melee ? 1 : T.rangedMult || 1;
    const desperate = b.lastStand && s.hp < s.maxHp * 0.25 ? 2 : 1;
    const boosted = s.cheered ? 1 + cry.buff : 1; // Rally Cry
    const dmg = hit
      ? Math.max(1, Math.round(s.weapon.damage * s.dmgMult * typeMult * desperate * rallied * boosted * b.squad.damageDealt * (0.85 + Math.random() * 0.3) * (crit ? BATTLE_CRIT.mult : 1)))
      : 0;
    const dealt = Math.min(dmg, Math.max(0, z.hp)); // (overkill doesn't count)
    z.hp -= dmg;
    s.stats.dmg += dealt;
    // what Rally Cry added goes to the Rallier who called it
    const caller = boosted > 1 && b.students.find((r) => !r.downed && r.cls === "rallier" && r.ability2 && r.col === s.col);
    if (caller) caller.stats.buffed += Math.round(dealt - dealt / boosted);
    events.push({ type: "attack", from: [s.row, s.col], to: [z.row, z.col], zid: z.id, dmg, hit, crit, evaded, weak: hit && typeMult > 1, resist: hit && typeMult < 1, kind: melee ? "melee" : "ranged", icon: s.weapon.icon, side });
    // a Trapper's shot slows what it hits — and Wide Net may catch the whole lane: every zombie in
    // it stands stuck, doing nothing, for a couple of turns (a boss tears through)
    if (hit && C.slowTurns && z.hp > 0) {
      z.slow = C.slowTurns;
      s.stats.slowed++;
      events.push({ type: "slowed", at: [z.row, z.col] });
    }
    if (hit && s.ability3 && C.ability3.turns && Math.random() < C.ability3.chance) {
      for (const t of b.zombies.filter((o) => o.alive && o.hp > 0 && o.col === z.col && !ZOMBIE_TYPES[o.type].unsnaggable)) {
        t.netted = C.ability3.turns;
        s.stats.slowed++;
        events.push({ type: "netted", at: [t.row, t.col] });
      }
    }
    // a critical hit breaks a wind-up
    if (crit && z.windup && z.hp > 0) {
      z.windup = null;
      events.push({ type: "interrupt", at: [z.row, z.col] });
    }
    if (z.hp <= 0) {
      s.kills++;
      killZombie(b, z, events);
    }
  };
  // a Rallier hits the zombie right in front of them (with their melee weapon, or fists); a Medic with
  // nobody to heal fires at the nearest one down their lane (their ranged weapon, or rocks)
  const swing = (s) => {
    const z = zombieAt(b, s.row + 1, s.col);
    if (z) strike(s, z);
  };
  const shoot = (s) => {
    const z = b.zombies.filter((x) => x.alive && x.col === s.col && x.row > s.row).sort((a, c) => a.row - c.row)[0];
    if (z) strike(s, z);
  };
  for (const s of b.students) {
    if (s.downed) continue;
    const C = NIGHT_CLASSES[s.cls];
    if (s.cls === "rallier") {
      // morale every few turns, more the higher their CHA
      if (++s.timer % C.every === 0 && !b.room) {
        const gain = C.morale * (s.ability3 ? C.ability3.moraleMult : 1); // Inspire: double
        b.morale += gain;
        s.stats.morale += gain;
        events.push({ type: "morale", at: [s.row, s.col], amount: gain });
      }
      swing(s);
      continue;
    }
    if (s.cls === "medic") {
      // heals the most hurt student next to them (Long Reach: up to 2 squares away; Field Surgeon:
      // anyone in their lane too)
      const reach = s.ability2 ? C.ability2.reach : 1;
      const p = b.students
        .filter((x) => x !== s && !x.downed && x.hp < x.maxHp && (chebyshev(s, x) <= reach || (s.ability3 && x.col === s.col)))
        .sort((a, c) => a.hp / a.maxHp - c.hp / c.maxHp)[0];
      if (p) {
        const heal = Math.min(p.maxHp - p.hp, Math.max(1, Math.round(p.maxHp * (C.heal + s.grade * C.healPerGrade) * s.mendMult)));
        p.hp += heal;
        s.stats.healed += heal;
        events.push({ type: "mend", at: [p.row, p.col], from: [s.row, s.col], amount: heal });
      } else shoot(s);
      continue;
    }
    // Repair: a Trapper patches the wall in their lane
    if (s.cls === "trapper" && s.ability2) {
      const wall = Object.values(b.structures).find((st) => st.col === s.col && st.def.blocks && !st.destroyed && st.hp < st.maxHp);
      if (wall) {
        const fix = Math.min(wall.maxHp - wall.hp, Math.max(1, Math.round(wall.maxHp * C.ability2.repair)));
        wall.hp += fix;
        s.stats.repaired += fix;
        events.push({ type: "repair", at: [wall.row, wall.col], amount: fix });
      }
    }
    // the rest attack: the square in front (Brawler, Tank), or the nearest zombie down their lane
    // (Shooter, Trapper). A Shooter may fire twice (Quick Draw), or always does (Double Shot).
    const shots = s.cls === "shooter" && (s.ability3 || (s.ability2 && Math.random() < C.ability2.chance)) ? 2 : 1;
    for (let shot = 0; shot < shots; shot++) {
      let target;
      if (C.range === "front") {
        // the nearest zombie within reach in front (Lunge: 2 squares)
        const reach = s.cls === "brawler" && s.ability3 ? C.ability3.reach : 1;
        for (let d = 1; d <= reach && !target; d++) target = zombieAt(b, s.row + d, s.col);
      } else {
        const inLane = b.zombies.filter((z) => z.alive && z.col === s.col && z.row > s.row);
        target = inLane.sort((a, c) => a.row - c.row)[0];
      }
      if (!target) break;
      const row = target.row;
      strike(s, target);
      // Cleave: a Brawler's swing carries on into the zombies either side
      if (s.cls === "brawler" && s.ability2) {
        for (const col of [s.col - 1, s.col + 1]) {
          const z = zombieAt(b, row, col);
          if (z) strike(s, z, true);
        }
      }
    }
  }
  checkEnrage(b, events);

  // 3. the horde, each zombie in its own lane, front-most first so the ones behind can step up
  const hurtStudent = (z, s, dmgBase, type) => {
    const connects = Math.random() < ZOMBIE_HIT_CHANCE;
    const dodged = connects && Math.random() < s.dodge; // a nimble (high-DEX) defender slips it
    const hit = connects && !dodged;
    const dmg = hit ? Math.max(1, Math.round(dmgBase * howlMult(b, z) * s.armorMult * b.squad.damageTaken * (0.85 + Math.random() * 0.3))) : 0;
    s.hp -= dmg;
    s.stats.taken += dmg;
    events.push({ type, from: [z.row, z.col], to: [s.row, s.col], dmg, hit, dodged });
    if (s.hp <= 0 && s.secondWind) {
      // Second Wind: a Tank gets back up, once a night
      s.secondWind = false;
      s.hp = Math.round(s.maxHp * NIGHT_CLASSES.tank.ability2.revive);
      events.push({ type: "secondWind", at: [s.row, s.col], id: s.id });
    } else if (s.hp <= 0) {
      s.downed = true;
      events.push({ type: "downed", at: [s.row, s.col], id: s.id });
    }
  };
  // One row up its lane, or whatever's in the way: a wall to smash, or someone to wait behind — or,
  // off the top row, into the school. Returns true only on a move.
  const advance = (z, T) => {
    const ahead = z.row - 1;
    if (ahead < 0) {
      // (in a room a boss never leaves — nor does anything in the school's own rooms, with nowhere to
      // go: it lunges in front of the nearest of them still standing)
      const spot = b.room && (z.type === "boss" || b.clear) && b.students
        .filter((s) => !s.downed && s.row + 1 < b.rows && !zombieAt(b, s.row + 1, s.col))
        .sort((s1, s2) => Math.abs(s1.col - z.col) - Math.abs(s2.col - z.col))[0];
      if (spot) {
        [z.row, z.col] = [spot.row + 1, spot.col];
        hurtStudent(z, spot, z.dmg, "bite");
        return false;
      }
      if (b.room && (z.type === "boss" || b.clear) && b.students.some((s) => !s.downed)) return false; // (it waits for a way in)
      z.alive = false;
      b.breached++;
      events.push({ type: "breach", at: [z.row, z.col] });
      // (in a room it's got behind the team: it bites someone on its way past)
      const victim = b.room && pick(b.students.filter((s) => !s.downed));
      if (victim) hurtStudent(z, victim, z.dmg, "bite");
      return false;
    }
    const wall = wallAt(b, ahead, z.col);
    if (wall) {
      const dmg = Math.round(z.dmg * (T.wallMult || 1) * howlMult(b, z));
      wall.hp -= dmg;
      events.push({ type: "smash", at: [ahead, z.col], dmg });
      if (wall.hp <= 0) {
        wall.hp = 0;
        wall.destroyed = true;
        events.push({ type: "destroyed", at: [ahead, z.col] });
      }
      if (b.thorns) {
        // Barbed Walls: the wall bites back
        z.hp -= b.thorns;
        events.push({ type: "trap", at: [z.row, z.col], dmg: b.thorns });
        if (z.hp <= 0) killZombie(b, z, events);
      }
      return false;
    }
    if (zombieAt(b, ahead, z.col) || studentAt(b, ahead, z.col)) return false;
    z.row = ahead;
    return springTrap(b, z, events) && !z.snagged;
  };
  for (const z of b.zombies.filter((z) => z.alive).sort((a, c) => a.row - c.row)) {
    const T = ZOMBIE_TYPES[z.type];
    if (z.slow > 0) z.slow--;
    if (z.netted > 0) { // caught in a Trapper's Wide Net
      z.netted--;
      continue;
    }
    if (z.snagged) {
      z.snagged = false;
      continue;
    }
    // a wound-up heavy brings its smash down on the marked square — whoever's still standing there
    if (z.windup) {
      const w = z.windup;
      z.windup = null;
      events.push({ type: "slam", at: [w.row, w.col], from: [z.row, z.col] });
      const victim = studentAt(b, w.row, w.col);
      if (victim) hurtStudent(z, victim, z.dmg * ZOMBIE_SMASH.mult, "crush"); // ("smash" is a zombie hitting a wall)
      continue;
    }
    // someone right in front of it: it bites (a heavy may wind up a smash instead)
    const front = studentAt(b, z.row - 1, z.col);
    if (front) {
      if (T.heavy && Math.random() < ZOMBIE_SMASH.chance) {
        z.windup = { row: front.row, col: front.col };
        events.push({ type: "telegraph", at: [front.row, front.col], from: [z.row, z.col] });
        continue;
      }
      hurtStudent(z, front, z.dmg, "bite");
      continue;
    }
    // a spitter spits at the nearest student up its lane, if one's in range — and keeps coming
    if (T.spitRange) {
      const target = b.students.filter((s) => !s.downed && s.col === z.col && s.row < z.row && z.row - s.row <= T.spitRange).sort((a, c) => c.row - a.row)[0];
      if (target) hurtStudent(z, target, z.dmg, "spit");
    }
    // on the top row it gets in, at a wall it attacks every turn; otherwise it walks a row every few turns
    // (Runners every turn), half as often while slowed
    if (z.row === 0 || wallAt(b, z.row - 1, z.col)) {
      advance(z, T);
      continue;
    }
    const every = (T.speed > 1 ? 1 : ZOMBIE_WALK_EVERY) * (z.slow > 0 ? 2 : 1);
    if (++z.walk < every) continue;
    z.walk = 0;
    advance(z, T);
  }

  if (b.rally > 0) b.rally--;

  // 4. is this wave over? (all of it spawned, and every zombie put down or in the school) The night
  // only ends early with nobody left standing (once the whole horde's here) or in a stalemate
  // (BATTLE_MAX_TICKS) — and then whatever's still out there walks in.
  const cleared = b.waveSpawned >= wave.length && !b.zombies.some((z) => z.alive);
  const everyoneDown = !b.students.some((s) => !s.downed) && b.spawned >= b.toSpawn;
  const endsEarly = everyoneDown || b.waveTick >= BATTLE_MAX_TICKS;
  if (cleared && b.breached < b.spawned) events.push({ type: "cleared", wave: b.wave, last: b.wave >= b.waves.length - 1 });
  if (endsEarly) {
    for (const z of b.zombies.filter((z) => z.alive)) {
      z.alive = false;
      b.breached++;
      events.push({ type: "breach", at: [z.row, z.col] });
    }
  }
  if (cleared || endsEarly) {
    if (b.wave < b.waves.length - 1 && !endsEarly) {
      b.wave++;
      b.waveSpawned = 0;
      b.waveTick = 0;
      b.phase = b.zombies.some((z) => z.alive) ? "fight" : "break";
      if (b.phase === "break") events.push({ type: "wave", wave: b.wave });
    } else b.phase = "done";
  }
  const frame = battleSnapshot(b, events);
  b.frames.push(frame);
  return frame;
}

// The boss at half health goes berserk: it hits harder and calls walkers in behind it.
function checkEnrage(b, events) {
  for (const z of b.zombies) {
    if (!z.alive || z.enraged || !ZOMBIE_TYPES[z.type].enrages || z.hp > z.maxHp / 2) continue;
    z.enraged = true;
    z.dmg = Math.round(z.dmg * ZOMBIE_SMASH.enrageDmg);
    events.push({ type: "enrage", at: [z.row, z.col] });
    for (let n = 0; n < ZOMBIE_SMASH.summons; n++) {
      const free = [];
      for (let col = 0; col < b.size; col++) if (!zombieAt(b, b.rows - 1, col)) free.push(col);
      if (!free.length) break;
      const col = pick(free);
      const hp = Math.round(b.zStats.hp);
      b.zombies.push({ id: b.spawned + 1, type: "walker", row: b.rows - 1, col, hp, maxHp: hp, dmg: Math.max(1, Math.round(b.zStats.damage)), alive: true, snagged: false });
      b.spawned++;
      b.toSpawn++;
      events.push({ type: "summon", at: [b.rows - 1, col] });
    }
  }
}

// Mid-fight: post a student who isn't fighting onto a free square of the steps or the lawn, paying
// their class's morale. They stay there for tomorrow too (the line-up).
export function battlePost(state, b, studentId, row, col) {
  if (b.room || b.phase === "done" || row < 0 || row >= ENTRANCE_ZONES.students || col < 0 || col >= b.size) return false;
  if (studentAt(b, row, col) || zombieAt(b, row, col) || b.students.some((s) => s.id === studentId)) return false;
  const c = getChar(state, studentId);
  if (!c || c.role !== "student" || !c.alive || c.infection || c.exploreTeam !== null) return false;
  const cost = NIGHT_MORALE.post;
  if (b.morale < cost) return false;
  b.morale -= cost;
  b.reserve = b.reserve.filter((s) => s.id !== studentId);
  const s = nightFighter(state, c, row, col, cost, b.condition, b.chili);
  b.students.push(s);
  moveEntranceStudent(state, `${row},${col}`, studentId);
  b.frames.push(battleSnapshot(b, [{ type: "posted", at: [row, col], id: studentId }]));
  return true;
}
// Who could still be posted tonight: on the school's side, not fighting yet.
export function battleBench(state, b) {
  const fighting = new Set(b.students.map((s) => s.id));
  return state.characters.filter((c) => c.role === "student" && c.alive && !c.infection && c.exploreTeam === null && !fighting.has(c.id));
}

// The break's over: send in the next wave.
export function startNextWave(b) {
  if (b.phase === "break") b.phase = "fight";
}

// Between waves: move a defender to another square of the steps (swapping with whoever's there).
export function battleMoveDefender(state, b, studentId, row, col) {
  if (b.phase !== "break" || row >= (b.studentRows ?? ENTRANCE_ZONES.students) || col >= b.size) return false;
  const s = b.students.find((x) => x.id === studentId && !x.downed);
  if (!s) return false;
  const other = b.students.find((x) => x !== s && x.row === row && x.col === col);
  if (other) [other.row, other.col] = [s.row, s.col];
  [s.row, s.col] = [row, col];
  if (!b.room) moveEntranceStudent(state, `${row},${col}`, studentId); // keep them there for tomorrow too
  b.frames.push(battleSnapshot(b, []));
  return true;
}

// A night action (NIGHT_ACTIONS), aimed at a square: a Molotov burns the 3x3 around it, Patch Up
// heals the defender on it; Rally needs no aim.
export function battleAction(state, b, actionId, row, col) {
  const a = NIGHT_ACTIONS[actionId];
  const cost = nightActionCost(state)[actionId];
  if (!a || b.phase === "done" || b.morale < cost) return false;
  const events = [];
  if (actionId === "molotov") {
    const dmg = Math.round(b.zStats.hp * MOLOTOV_DAMAGE);
    for (let r = row - 1; r <= row + 1; r++) for (let c = col - 1; c <= col + 1; c++) if (r >= 0 && c >= 0 && r < b.rows && c < b.size) events.push({ type: "fire", at: [r, c] });
    for (const z of b.zombies.filter((z) => z.alive && chebyshev(z, { row, col }) <= 1)) {
      z.hp -= dmg;
      events.push({ type: "burn", at: [z.row, z.col], dmg });
      if (z.windup && z.hp > 0) events.push({ type: "interrupt", at: [z.row, z.col] });
      z.windup = null; // fire breaks a wind-up
      if (z.hp <= 0) killZombie(b, z, events);
    }
    checkEnrage(b, events);
  } else if (actionId === "patch") {
    const s = studentAt(b, row, col);
    if (!s || s.hp >= s.maxHp) return false;
    const heal = Math.min(s.maxHp - s.hp, Math.round(s.maxHp / 2));
    s.hp += heal;
    events.push({ type: "heal", at: [row, col], amount: heal });
  } else if (actionId === "rally") {
    b.rally = 3;
    events.push({ type: "rally" });
  }
  b.morale -= cost;
  b.frames.push(battleSnapshot(b, events));
  return true;
}

// ---------- Turn 2: a team fights its way through its place, room by room ----------
// A run (startExpeditionRun) keeps what's happened so far: the rooms cleared, who went down (out of
// the rest of it, carried), the fallen to settle and the HP lost. Each room is the same fight as the
// night's, on a small board (EXPEDITION_ROOM): the team stands where they came in — the Tanks and
// Brawlers in front, the rest behind, the Medic in the middle — and the zombies come out of the dark.
// It starts paused ("break") so the player can move them about first — unless it's an ambush.
// The place a run is in: a City Map place — or, for a raid, its landmark, harder by tier (and,
// for the gear it might turn up, as far out as the map goes).
export function expeditionPlace(id) {
  const lm = LANDMARKS.find((l) => l.id === id);
  return lm ? { ...lm, raid: true, difficulty: 1 + (lm.tier - 1) * EXPEDITION_ROOM.raidPerTier, ground: "", hex: { q: MAP_RADIUS, r: 0 } } : LOCATIONS.find((l) => l.id === id);
}
// Whether today's raid goes ahead: a target, the raids open, and a big enough squad.
export function raidReady(state) {
  const lm = LANDMARKS.find((l) => l.id === state.raidTarget);
  return !!lm && raidUnlocked(state) && teamMembers(state, RAID_TEAM).length >= lm.minTeam;
}
export function startExpeditionRun(state, teamIndex) {
  const location = expeditionPlace(teamIndex === RAID_TEAM ? state.raidTarget : state.teamLocations[teamIndex]);
  const hpBefore = Object.fromEntries(teamMembers(state, teamIndex).map((c) => [c.id, c.hp]));
  return { teamIndex, locationId: location.id, rooms: expeditionRooms(location), room: 0, won: true, out: [], fallen: [], hurt: {}, hpBefore, noise: 0, horde: false, next: null, notice: null, bonus: 0, event: null, finds: [], recruit: null };
}
// How many rooms a place has, and how many zombies wait in each (before the nest, the noise and so on).
export const expeditionRooms = (location) => (location.raid ? EXPEDITION_ROOM.raidRooms : 2 + Math.ceil(location.difficulty / 2));
export function expeditionRoomZombies(state, location, room) {
  const R = EXPEDITION_ROOM;
  return R.base + Math.floor(location.difficulty * R.perDifficulty) + Math.floor(state.day / R.perDays) + room + (room === expeditionRooms(location) - 1 ? 1 : 0);
}
// The odds for a team at a place, from the fight itself: `trials` runs played out in the background,
// fighting every room (no sneaking, nothing turning up between rooms) — how often they clear the
// first room, how often every room, and how many on average. Kept until anything it depends on
// changes (the team, their HP, the place, the day).
const forecastCache = new Map();
export function expeditionForecast(state, teamIndex, location, trials = 24) {
  const members = teamMembers(state, teamIndex);
  if (!members.length) return null;
  const key = [teamIndex, location.id, state.day, state.horde?.q, state.horde?.r, (state.encounters || {})[teamIndex]?.ok, ...members.map((c) => `${c.id}:${c.hp}:${c.level}`)].join("|");
  if (forecastCache.has(key)) return forecastCache.get(key);
  const hp = new Map(members.map((c) => [c.id, c.hp]));
  const raid = teamIndex === RAID_TEAM; // (a raid's target is state.raidTarget already)
  const was = state.teamLocations[teamIndex];
  if (!raid) state.teamLocations[teamIndex] = location.id;
  let first = 0;
  let all = 0;
  let rooms = 0;
  for (let t = 0; t < trials; t++) {
    const run = startExpeditionRun(state, teamIndex);
    while (run.won && run.room < run.rooms) {
      const b = startExpeditionBattle(state, run);
      runNightBattle(state, b);
      for (const s of b.students) {
        const c = getChar(state, s.id);
        c.hp = s.downed ? 1 : Math.max(1, Math.min(c.maxHp, s.hp - (s.bonusHp || 0)));
        if (s.downed) run.out.push(c.id);
      }
      run.noise = Math.min(EXPEDITION_NOISE.max, run.noise + battleNoise(b));
      run.horde = run.noise >= EXPEDITION_NOISE.horde;
      if (b.students.some((s) => !s.downed)) run.room++;
      else run.won = false;
    }
    if (run.room >= 1) first++;
    if (run.room >= run.rooms) all++;
    rooms += run.room;
    for (const c of members) c.hp = hp.get(c.id);
  }
  if (!raid) state.teamLocations[teamIndex] = was;
  const out = { first: first / trials, all: all / trials, rooms: rooms / trials, total: expeditionRooms(location) };
  if (forecastCache.size > 200) forecastCache.clear();
  forecastCache.set(key, out);
  return out;
}
// The share of the place's supplies a run's bringing home so far (with what turned up between rooms).
export const runShare = (run) => expeditionShare(run.room, run.rooms, run.won) + run.bonus * (run.won ? 1 : 0.5);
const standing = (state, run) => teamMembers(state, run.teamIndex).filter((c) => !run.out.includes(c.id));
const trackHurt = (run, c) => {
  const lost = run.hpBefore[c.id] - c.hp;
  if (lost > 0) run.hurt[c.id] = lost;
  else delete run.hurt[c.id];
};

// ----- between rooms: something turns up (ROOM_EVENTS) -----
// Who'd try an event's option, and their chance (sure, for one with no stat).
export function roomEventOdds(state, run, option) {
  if (!option.stat) return { who: null, chance: 1 };
  const O = ROOM_EVENT_ODDS;
  const who = standing(state, run).sort((a, c) => effectiveGrade(state, c, option.stat) - effectiveGrade(state, a, option.stat))[0] || null;
  return { who, chance: who ? Math.min(O.max, O.base + effectiveGrade(state, who, option.stat) * O.perGrade) : 0 };
}
// The player picks option `index` of the run's event: tried, and whatever comes of it — or the next
// event it leads to. Returns what happened.
export function resolveRoomEvent(state, run, index) {
  const opt = run.event && !run.event.done && ROOM_EVENTS[run.event.id].options[index];
  if (!opt) return null;
  const { who, chance } = roomEventOdds(state, run, opt);
  if (opt.stat && !who) return null;
  const ok = Math.random() < chance;
  const fx = (ok ? opt.ok : opt.bad) || {};
  const loc = expeditionPlace(run.locationId);
  if (fx.loot) run.bonus += fx.loot;
  if (fx.noise) addNoise(state, run, fx.noise);
  if (fx.zombies) run.next = { ...run.next, fewer: (run.next?.fewer || 0) - fx.zombies };
  if (fx.ambush) run.next = { ...run.next, ambush: true };
  if (fx.hurt && who) {
    who.hp = Math.max(1, who.hp - fx.hurt);
    trackHurt(run, who);
  }
  if (fx.heal) for (const c of standing(state, run)) {
    c.hp = Math.min(c.maxHp, c.hp + Math.round(c.maxHp * fx.heal));
    c.injured = c.hp < c.maxHp * 0.5;
    trackHurt(run, c);
  }
  if (fx.medicine) {
    state.resources.medicine += fx.medicine;
    run.finds.push(`🩹 Medicine ×${fx.medicine}`);
  }
  if (fx.item) {
    const item = rollExpeditionItem(state, loc, true, 1);
    if (item) run.finds.push(itemLabel(item));
  }
  if (fx.recruit) {
    const recruit = makeCharacter(rollRecruitRole(state), Math.random() < 0.5 ? "M" : "F");
    if (addRecruit(state, recruit)) {
      run.recruit = recruit.name;
      addLog(state, `A survivor found at the ${loc.name}, ${recruit.name}, wants to join.`);
    }
  }
  const text = who ? `${who.name.split(" ")[0]} ${fx.text}` : fx.text;
  run.event.log.push({ ok: ok || !opt.stat, label: opt.label, text });
  if (fx.next) run.event.id = fx.next;
  else run.event.done = true;
  return { ok, text };
}
// The noise a room's fight has made so far (EXPEDITION_NOISE), from its turns.
export function battleNoise(b) {
  const N = EXPEDITION_NOISE;
  let noise = 0;
  for (const f of b.frames) for (const e of f.events) {
    if (e.type === "attack" && e.kind === "ranged") noise += N.shot;
    else if (e.type === "kill") noise += N.kill;
    else if (e.type === "breach") noise += N.past;
    else if (e.type === "downed") noise += N.down;
  }
  return noise;
}
// Noise added to (or taken off) a run; the first time it reaches the horde's mark, the map's horde
// comes to a block next to the place.
function addNoise(state, run, n) {
  const N = EXPEDITION_NOISE;
  run.noise = Math.max(0, Math.min(N.max, run.noise + n));
  if (run.noise < N.horde || run.horde) return;
  run.horde = true;
  const loc = expeditionPlace(run.locationId);
  if (loc.raid) return; // (the landmarks are off the map's blocks)
  const spots = HEX_NEIGHBOR_OFFSETS.map(([dq, dr]) => ({ q: loc.hex.q + dq, r: loc.hex.r + dr }))
    .filter((h) => hexDistance(h.q, h.r) >= SCHOOL_RADIUS + 2 && hexDistance(h.q, h.r) <= MAP_RADIUS && !locationAt(h.q, h.r));
  if (spots.length) state.horde = pick(spots);
  addLog(state, `🧟 The noise at the ${loc.name} drew the horde — it's right next door now.`);
}
// Who'd try to sneak the team past the next room ("sneak", DEX) or pick a side door ("lock", INT):
// the best at it still standing, and their chance.
export function expeditionSneakOdds(state, run, kind) {
  const K = EXPEDITION_NOISE[kind];
  const who = teamMembers(state, run.teamIndex).filter((c) => !run.out.includes(c.id))
    .sort((a, c) => effectiveGrade(state, c, K.stat) - effectiveGrade(state, a, K.stat))[0] || null;
  return { who, chance: who ? Math.min(K.max, K.base + effectiveGrade(state, who, K.stat) * K.perGrade) : 0 };
}
// …and they try: sneaking by counts the room as cleared, a side door means fewer zombies in it — or
// they're spotted (an ambush) or the lock snaps. Either way the noise moves. Returns what happened.
export function expeditionSneak(state, run, kind) {
  const K = EXPEDITION_NOISE[kind];
  const { who, chance } = expeditionSneakOdds(state, run, kind);
  if (!who) return null;
  const ok = Math.random() < chance;
  const name = who.name.split(" ")[0];
  addNoise(state, run, ok ? -K.quiet : K.loud);
  if (kind === "sneak" && ok) run.room++;
  run.next = ok ? (kind === "lock" ? { fewer: K.fewer } : null) : kind === "sneak" ? { ambush: true } : null;
  run.notice = {
    ok,
    text: kind === "sneak"
      ? (ok ? `🤫 ${name} got them past room ${run.room} unseen` : `🤫 ${name} was spotted — they're on you!`)
      : (ok ? `🔓 ${name} picked a side door — a quieter way in` : `🔓 The lock snapped under ${name}'s pick — loud`),
  };
  return { ok, who };
}
// What the team would carry home with `share` of the place's supplies (expeditionShare), before luck:
// more with WIS (and its tree, research), the bulky stuff with STR, the scrap with the Stew.
export function expeditionHaul(state, members, location, share) {
  const avg = (statKey) => members.reduce((sum, c) => sum + effectiveGrade(state, c, statKey), 0) / Math.max(1, members.length);
  const avgSkill = (subject) => members.reduce((sum, c) => sum + skillBonus(c, subject), 0) / Math.max(1, members.length);
  const mult = (0.5 + avg("History") / 100) * share * (1 + techPerk(state, "expeditionLoot")) * (1 + avgSkill("History")) * expeditionLootScale(location);
  const carry = (key) => (key === "food" || key === "materials" ? 0.8 + avg("PE") * TUNE.carryPerStr : 1);
  const stew = (key) => (key === "materials" ? dishMultiplier(state, "expeditionMaterials") : 1);
  return Object.fromEntries(Object.keys(location.rewards).map((key) => [key, location.rewards[key] * mult * stew(key) * carry(key)]));
}
const ROOM_FRONT_ORDER = { tank: 0, brawler: 1, rallier: 2, trapper: 3, shooter: 4, medic: 5 };
export function startExpeditionBattle(state, run) {
  const R = EXPEDITION_ROOM;
  const location = expeditionPlace(run.locationId);
  const members = teamMembers(state, run.teamIndex).filter((c) => !run.out.includes(c.id));
  // a breather before every room after the first: whoever's standing gets a little HP back
  if (run.room > 0 && !run.rested?.includes(run.room)) {
    (run.rested ||= []).push(run.room);
    for (const c of members) {
      c.hp = Math.min(c.maxHp, c.hp + Math.round(c.maxHp * R.breather));
      c.injured = c.hp < c.maxHp * 0.5;
      trackHurt(run, c);
    }
  }
  const encounter = run.room === 0 && (state.encounters || {})[run.teamIndex];
  const last = run.room === run.rooms - 1;
  const N = EXPEDITION_NOISE;
  const count = Math.max(1, expeditionRoomZombies(state, location, run.room)
    + (!location.raid && nextToNest(state, location.hex.q, location.hex.r) ? R.nest : 0) + (encounter ? (encounter.ok ? -1 : 1) : 0)
    + (run.noise >= N.horde ? N.hordeZombies : run.noise >= N.loud ? N.loudZombies : 0) - (run.next?.fewer || 0));
  // the kinds, as a night that many days on would bring them (its shares, rounded down)
  const day = Math.round(state.day * R.dayShare) + R.daysPerDifficulty * (location.difficulty - 1 + (last ? 1 : 0));
  const share = { runner: 0.25, brute: 0.15, spitter: 0.15, screamer: 0.08 };
  const kinds = Object.keys(share).flatMap((t) => Array(day >= ZOMBIE_TYPES[t].from ? Math.floor(count * share[t]) : 0).fill(t));
  const boss = location.raid && last ? raidBoss(state, location) : null; // (a raid's boss, in the last room)
  const queue = shuffled([...kinds, ...Array(count - kinds.length).fill("walker")]).slice(boss ? R.raidBossRoomFewer : 0);
  if (boss) queue.push("boss");
  const ambush = !!run.next?.ambush || (run.room > 0 && Math.random() < R.ambush * run.room + (run.horde ? N.hordeAmbush : 0));
  const notice = run.notice;
  run.next = null;
  run.notice = null;
  run.event = null;
  const b = roomBattle(state, members, queue, zombieStatsForDay(day), { // (as strong as that later night's)
    run, noise0: run.noise, notice,
    teamIndex: run.teamIndex, locationId: location.id, difficulty: location.difficulty, roomNo: run.room, rooms: run.rooms, last, ambush,
    bossName: boss?.name || null, bossStats: boss && { hp: Math.round(boss.hp * R.raidBossHp), dmg: Math.round(boss.damage * R.raidBossDmg) },
    phase: ambush ? "fight" : "break",
  });
  // an ambush: the first of them are already right in front of the team
  if (ambush) for (const col of shuffled([...Array(b.size).keys()]).slice(0, Math.min(queue.length - (boss ? 1 : 0), Math.ceil(b.size / 2)))) spawnZombie(b, queue[b.waveSpawned], R.teamRows, col);
  b.frames.push(battleSnapshot(b, ambush ? [{ type: "ambush" }] : []));
  return b;
}
// A fight in a room, on the small board (EXPEDITION_ROOM): `members` stand where they came in — the
// Tanks and Brawlers in front, the rest behind, the Medic in the middle (4 lanes for more than 6) —
// and `queue` comes out of the dark at `zStats` strength. `fields` say what kind of room it is.
// It starts paused ("break") so the player can move them about first.
function roomBattle(state, members, queue, zStats, fields) {
  const R = EXPEDITION_ROOM;
  const sorted = [...members].sort((a, c) => ROOM_FRONT_ORDER[nightClass(a)] - ROOM_FRONT_ORDER[nightClass(c)]);
  const size = members.length > 6 ? 4 : R.cols;
  const cols = size === 4 ? [1, 2, 0, 3] : [1, 0, 2]; // the middle first
  const chili = dishMultiplier(state, "battleDamage");
  const condition = NIGHT_CONDITIONS.clear;
  const students = [
    ...sorted.slice(0, size).map((c, i) => nightFighter(state, c, R.teamRows - 1, cols[i], 0, condition, chili)),
    ...sorted.slice(size).reverse().map((c, i) => nightFighter(state, c, R.teamRows - 2, cols[i], 0, condition, chili)),
  ];
  return {
    room: true, size, rows: R.rows, studentRows: R.teamRows, condition, thorns: 0, zStats,
    waves: [queue], wave: 0, waveSpawned: 0, waveTick: 0,
    toSpawn: queue.length, spawned: 0, killed: 0, breached: 0,
    zombies: [], students, structures: {}, squad: squadModifiers(state, members),
    morale: 0, opening: [], reserve: [], lastStand: techPerk(state, "lastStand") > 0, bossName: null,
    chili, rally: 0, tick: 0, frames: [], phase: "break",
    ...fields,
  };
}
// A room's over: the team's HP as it ended (the downed at 10%, out of the rest of the run, to be saved
// or not), and whether they made it — anyone still standing. Nothing else changes until
// resolveExploration.
export function finishExpeditionBattle(state, run, b) {
  const fallen = [];
  for (const s of b.students) {
    const c = getChar(state, s.id);
    if (!c) continue;
    const before = c.hp;
    if (s.downed) {
      c.hp = Math.max(1, Math.round(c.maxHp * 0.1));
      fallen.push({ id: c.id, deathChance: downedDeathChance(state, c), saved: false });
    } else c.hp = Math.max(1, Math.min(c.maxHp, s.hp - (s.bonusHp || 0)));
    c.injured = c.hp < c.maxHp * 0.5;
    if (c.hp < run.hpBefore[c.id]) run.hurt[c.id] = run.hpBefore[c.id] - c.hp;
  }
  const bossKilled = !b.bossName || b.zombies.some((z) => z.type === "boss" && z.killed);
  const won = b.students.some((s) => !s.downed) && bossKilled;
  run.out.push(...fallen.map((f) => f.id));
  run.fallen.push(...fallen);
  addNoise(state, run, battleNoise(b));
  if (won) run.room++;
  else run.won = false;
  // half the time, something turns up before the next room
  run.event = won && run.room < run.rooms && Math.random() < ROOM_EVENT_CHANCE ? { id: pick(ROOM_EVENT_STARTS), log: [], done: false } : null;
  return { won, fallen, downedCount: fallen.length, cleared: run.room, rooms: run.rooms, bossKilled };
}

// Plays the rest of the night straight through (waves start on their own).
export function runNightBattle(state, b) {
  while (b.phase !== "done") {
    if (b.phase === "break") startNextWave(b);
    battleTick(state, b);
  }
}

// What saving one of the night's fallen costs in medicine.
export const stabilizeCost = (state) => MEDICINE_PER_STABILIZE - techPerk(state, "stabilizeDiscount");
// After the fight: spend medicine on one of the fallen (finishNightBattle's `fallen`) — they'll
// pull through for sure.
export function saveFallen(state, fallen, id) {
  const f = fallen.find((x) => x.id === id);
  if (!f || f.saved || state.resources.medicine < stabilizeCost(state)) return false;
  state.resources.medicine -= stabilizeCost(state);
  f.saved = true;
  return true;
}
// The chance someone who went down in a fight doesn't get back up: less the higher their CON.
const downedDeathChance = (state, c) =>
  clamp01(DOWNED_DEATH_CHANCE - (effectiveGrade(state, c, "Biology") - 40) / 200) * (1 - techPerk(state, "untreatedDeathReduction"));
// …and once the fight's done: anyone not saved may not get back up (their deathChance); whoever
// does might have been bitten while they were down. Returns the ids of those who died.
export function settleFallen(state, fallen = [], where = "defending the entrance") {
  const dead = [];
  for (const f of fallen) {
    const c = getChar(state, f.id);
    if (!c?.alive) continue;
    if (!f.saved && Math.random() < f.deathChance) {
      killCharacter(state, c);
      dead.push(c.id);
      addLog(state, `${c.name} fell ${where}.`);
      continue;
    }
    addLog(state, f.saved ? `${c.name} went down ${where} — patched up with medicine.` : `${c.name} went down ${where} but was dragged to safety.`);
    if (Math.random() < INFECTION_CHANCE_DOWNED) infect(state, c, "was bitten while they were down");
  }
  return dead;
}

// The night's over: what it did to the defenders, the defenses and the school.
export function finishNightBattle(state, b) {
  const defenders = b.students;
  const { spawned, killed, breached, bossName } = b;
  const bossKilled = b.zombies.some((z) => z.type === "boss" && z.killed);
  addLog(state, `The horde attacks the entrance — ${spawned} zombies shamble out of the dark${bossName ? `, led by ${bossName}` : ""}.`);
  if (!defenders.length) addLog(state, `No one was defending the entrance!`);

  if (bossName && bossKilled) {
    state.bossesSlain.push(bossName);
    state.resources.materials += 25;
    state.resources.food += 15;
    const item = rollItem(ITEM_DROP_ODDS[3]);
    state.armory.push(item);
    adjustHappiness(state, HAPPINESS_GAIN_WIN);
    addLog(state, `${bossName} is down! Its hoard: +25 scrap, +15 food and ${itemLabel(item)}.`);
  } else if (bossName) {
    addLog(state, `${bossName} survived the night and slunk back into the dark.`);
  }

  let downedCount = 0;
  // the fallen: down at 10% HP; whether they make it is settled after the fight (settleFallen), once
  // the player has chosen whom to spend medicine on (saveFallen)
  const fallen = [];
  for (const s of b.students) {
    const c = getChar(state, s.id);
    if (!c) continue;
    if (s.downed) {
      downedCount++;
      c.defending = false; // too hurt to join any chase afterwards
      clearEntranceCellForChar(state, c.id);
      c.hp = Math.max(1, Math.round(c.maxHp * 0.1));
      c.injured = true;
      fallen.push({ id: c.id, deathChance: downedDeathChance(state, c), saved: false });
      continue;
    }
    c.hp = Math.max(1, Math.min(c.maxHp, s.hp - (s.bonusHp || 0))); // a fighter's extra HP goes first
    c.injured = c.hp < c.maxHp * 0.5;
    gainExp(state, c, LEVEL_XP.defend);
    const killBonus = Math.min(3, s.kills);
    grantXp(state, c.id, "PE", 2 + randInt(0, 2) + (s.usedMelee ? killBonus : 0));
    grantXp(state, c.id, "Gymnastics", 2 + randInt(0, 2) + (s.usedRanged ? killBonus : 0));
    if (s.kills >= 3) addLog(state, `${c.name} cut down ${s.kills} zombies at the entrance.`);
  }

  for (const st of Object.values(b.structures).filter((x) => x.destroyed)) {
    delete state.entranceGrid.defenses[st.key];
    addLog(state, `The horde smashed a ${st.def.name} at the entrance to pieces.`);
  }

  if (breached > 0) {
    let hurt = 0;
    for (let i = 0; i < breached; i++) {
      const inside = aliveChars(state).filter((c) => !c.defending);
      const victim = pick(inside.length ? inside : aliveChars(state));
      if (!victim) break;
      if (Math.random() < 0.08 && !victim.infection) {
        infect(state, victim, "was bitten by a zombie that broke into the school");
      } else if (victim.role === "student") {
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

  // three stars for a perfect night
  const stars = [
    { label: "Nobody got in", got: breached === 0 },
    { label: "Nobody went down", got: downedCount === 0 },
    { label: "Every zombie put down", got: killed >= spawned && spawned > 0 },
  ];
  const perfect = stars.every((s) => s.got);
  if (perfect) {
    state.resources.materials += NIGHT_STAR_REWARD.materials;
    addLog(state, `★★★ A perfect night! +${NIGHT_STAR_REWARD.materials} scrap.`);
  }
  // the school's Morale: +1 for each star
  const moraleLift = stars.filter((s) => s.got).length * NIGHT_MORALE.perStar;
  if (moraleLift) {
    adjustHappiness(state, moraleLift);
    addLog(state, `The night's ${"★".repeat(moraleLift / NIGHT_MORALE.perStar)} lift the school's spirits (+${moraleLift} Morale).`);
  }

  // A won battle can lead into one (never both) follow-up: a facility raid demanding an
  // immediate response, or a chance to chase the horde down for a bigger prize.
  if (won) {
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
    moraleLift, fallen,
    won, routed, spawned, killed, breached, downedCount, defenderCount: defenders.length,
    bossName, bossKilled, stars, perfect, size: b.size, frames: b.frames,
  };
}

// A whole night at once (no one steps in).
export function resolveDefense(state) {
  const b = startNightBattle(state);
  runNightBattle(state, b);
  return finishNightBattle(state, b);
}

// ---------- facility raid ----------

export function setRaidDefender(state, charId, value) {
  const c = getChar(state, charId);
  if (!c || c.role !== "student" || !c.alive) return false;
  if (value) {
    if (c.infection) return false;
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
  const success = defenders.length > 0 && simulateRoomFight(state, defenders, null, facilityRaiders(state)).won;
  const room = state.rooms[raid.facility];

  if (success) {
    addLog(state, `The team beat back the raid on the ${raid.facility}.`);
    for (const c of defenders) grantXp(state, c.id, "PE", 2 + randInt(0, 2));
    gainExpAll(state, defenders, LEVEL_XP.defend);
  } else {
    adjustHappiness(state, -HAPPINESS_LOSS_MISSION_FAIL);
    if (room && room.studentCapacity > 1) {
      room.damage = (room.damage || 0) + 1;
      applyRoomLevel(state, raid.facility);
    }
    addLog(state, `The raid on the ${raid.facility} got through — a worker slot is broken until it's repaired (see its Upgrade button).`);
    if (raid.facility === "farm" || raid.facility === "barn") {
      for (const kind of FARM_GROUPS[raid.facility === "farm" ? "fields" : "animals"]) for (const plot of state.plots[kind]) plot.growth = 0;
      addLog(state, raid.facility === "farm" ? "The horde trampled the crops — every field starts over." : "The horde scattered the animals — every pen starts over.");
    }
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

// A legendary survivor for the recruit pool. Teachers never fight and have no Inventory tab to
// manage gear from, so a legendary teacher's item goes to the shared armory instead of sitting
// on their sheet, unusable.
function addLegendaryRecruit(state) {
  const role = Math.random() < LEGENDARY_TEACHER_CHANCE ? "teacher" : "student";
  const recruit = makeLegendaryCharacter(role, pick(["M", "F"]));
  if (role === "teacher") {
    const { meleeWeapon, rangedWeapon, armor, accessories } = recruit.equipment;
    for (const item of [meleeWeapon, rangedWeapon, armor, ...accessories]) {
      if (item) state.armory.push(item);
    }
    recruit.equipment = emptyEquipment();
  }
  addRecruit(state, recruit); // legendary: always finds room
  return recruit;
}

// The horde's leader, run down when the squad chases the retreating horde: a big zombie that
// grows with the nights (a different one each night).
const PACK_LEADERS = [
  { name: "The Pack Leader", look: "jersey" },
  { name: "The Howler", look: "walker" },
  { name: "Old Stitches", look: "labcoat" },
  { name: "The Sergeant", look: "soldier" },
];
export function assaultLeader(state) {
  const z = zombieStatsForDay(state.day);
  const who = PACK_LEADERS[state.day % PACK_LEADERS.length];
  return { ...who, hp: Math.round(z.hp * 5), damage: Math.round(z.damage * 1.4), attacks: 2 };
}
export const ASSAULT_LOOT = [15, 35]; // food, scrap and medicine each, from the horde's trail

// Who can go: tonight's defenders still on their feet.
export const assaultCandidates = (state) => state.characters.filter((c) => c.defending && c.alive && !c.infection && c.role === "student");

// Roughly how the chase would go with this squad (the raid screen's estimate, against the leader).
export function assaultEstimate(state, squad) {
  const leader = assaultLeader(state);
  const lead = squad.length ? squadModifiers(state, squad).damageDealt : 1;
  const perRound = squad.reduce((sum, c) => {
    const a = raidAttack(state, c);
    return sum + a.damage * a.hitChance * 1.12 * lead;
  }, 0);
  return { leader, perRound: Math.round(perRound), rounds: perRound ? Math.ceil(leader.hp / perRound) : Infinity };
}

// Chase the retreating horde (or let it go). The squad fights the pack leader round by round;
// bring it down for a haul from the horde's trail and maybe a legendary survivor. Anyone who goes
// down is dragged back by the others — hurt, but alive. Returns the fight to replay.
export function resolveAssault(state, chase, squadIds = null) {
  if (!state.pendingAssault) return null;
  state.pendingAssault = false;
  const candidates = assaultCandidates(state);
  const squad = squadIds ? candidates.filter((c) => squadIds.includes(c.id)) : candidates;
  if (!chase || !squad.length) {
    addLog(state, `You let the horde go and secured the school for the night.`);
    advanceTurn(state);
    return { chased: false, won: null };
  }

  const leader = assaultLeader(state);
  const sim = simulateBossFight(state, leader, squad);
  const report = {
    kind: "chase", title: `⚔ The chase — ${leader.name}`, bossName: leader.name, look: leader.look, bossMaxHp: leader.hp,
    won: sim.won, frames: sim.frames, memberIds: squad.map((c) => c.id), loot: {}, items: [], recruit: null, hurt: [], lost: [],
  };
  for (const f of sim.fighters) {
    const c = getChar(state, f.id);
    if (f.down) {
      c.hp = Math.max(1, Math.round(c.maxHp * 0.1));
      c.injured = true;
      report.hurt.push(`${c.name} went down and was dragged back`);
    } else {
      c.hp = Math.max(1, f.hp);
      c.injured = c.hp < c.maxHp * 0.5;
    }
    grantXp(state, c.id, "PE", 4 + randInt(0, 3));
    gainExp(state, c, LEVEL_XP.raid);
  }
  if (sim.won) {
    for (const key of ["food", "materials", "medicine"]) {
      const amt = randInt(ASSAULT_LOOT[0], ASSAULT_LOOT[1]);
      state.resources[key] += amt;
      report.loot[key] = amt;
    }
    addLog(state, `The squad ran down ${leader.name} and looted the horde's trail — a big haul.`);
    if (Math.random() < LEGENDARY_CHANCE) {
      const recruit = addLegendaryRecruit(state);
      report.recruit = recruit.name;
      addLog(state, `Among the dead, a survivor: ${recruit.name} wants to join the school.`);
    }
  } else {
    addLog(state, `${leader.name} was too much — the squad pulled back empty-handed.`);
  }
  advanceTurn(state);
  return report;
}

// A facility raid's odds with these defenders (see resolveFacilityRaid): fought out like a room
// against the raiders (facilityRaiders); with nobody sent, they walk in.
export function facilityRaidChance(state, defenders) {
  return defenders.length ? packFightOdds(state, facilityRaiders(state), defenders) : 0;
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
// Overnight healing when fed: 10% of max HP plus more for a high CON (see STAT_TUNING).
// A fed school sleeps it off: some HP (more with a high CON) and a little stamina back for everyone.
function resolveOvernightRecovery(state) {
  for (const c of aliveChars(state)) {
    c.hp = Math.min(c.maxHp, c.hp + Math.round(c.maxHp * (TUNE.recoveryBase + c.grades.Biology * TUNE.recoveryPerCon)));
    c.injured = c.hp < c.maxHp * 0.5;
    c.stamina = Math.min(c.maxStamina, c.stamina + TUNE.staminaRecoveryFlat + Math.round(c.maxStamina * TUNE.staminaRecoveryShare));
  }
}

// ---------- the rescue ----------

// Levels the Radio Station up with its next upgrade (RADIO_UPGRADES, in order, paid in scrap and
// research). The last one, satellite communications, reaches the military: a helicopter will land
// RESCUE_ARRIVAL_DAYS later.
export function buildRadioUpgrade(state) {
  if (isBoarded(state, "radio")) return false;
  const level = radioStage(state);
  const up = RADIO_UPGRADES[level];
  if (!up) return false;
  const cost = Object.entries(up.cost || {});
  if (cost.some(([res, amt]) => (state.resources[res] || 0) < amt)) return false;
  for (const [res, amt] of cost) state.resources[res] -= amt;
  state.rooms.radio.level = level + 1;
  applyRoomLevel(state, "radio");
  if (satelliteReady(state)) {
    state.rescue = { day: state.day + RESCUE_ARRIVAL_DAYS, evacuated: false, landed: false };
    addLog(state, `🛰 Contact! The satellite link reaches the military — a helicopter will land on the roof on day ${state.rescue.day}. Hold out until then.`);
  } else {
    addLog(state, `📶 ${up.name}: the broadcast reaches further.`);
  }
  return true;
}

export const newRunId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

// When the helicopter lands (after satellite communications reach the military) the player chooses:
// fly everyone out now, ending the run, or send them away and hold out — they come back
// RESCUE_DELAY_DAYS later. The score is the last day the school stands either way.
export function evacuate(state) {
  if (!state.rescue?.landed) return false;
  state.rescue.landed = false;
  state.rescue.evacuated = true;
  state.victory = true;
  addLog(state, `🚁 Everyone left alive climbs aboard and the helicopters lift off from the roof.`);
  return true;
}

export function delayEvacuation(state) {
  if (!state.rescue?.landed) return false;
  state.rescue.landed = false;
  state.rescue.day = state.day + RESCUE_DELAY_DAYS;
  addLog(state, `🏫 The school sends the helicopters away to hold out a little longer. They'll be back on day ${state.rescue.day}.`);
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
  if (state.rescue && !state.rescue.evacuated && !state.rescue.landed && nextDay >= state.rescue.day && aliveChars(state).length > 0) {
    state.rescue.landed = true;
    addLog(state, `🚁 Rotor blades over the school! The helicopter followed the satellite signal and has landed on the roof.`);
  }
  if (isBossNight(nextDay + 1)) {
    addLog(state, `☠ Scouts report something huge moving with the horde — ${bossNameForDay(nextDay + 1)} will lead the attack on night ${nextDay + 1}.`);
  } else if (isBossNight(nextDay)) {
    addLog(state, `☠ ${bossNameForDay(nextDay)} leads the horde on night ${nextDay}. Build up the entrance while there's still daylight.`);
  }
}

export function advanceTurn(state) {
  state.turn++;
  if (state.turn === 2) keepTurnOneJobs(state);
  if (state.turn > 3) {
    beginDayRecord(state, state.day + 1);
    if (resolveDailyFoodUpkeep(state)) resolveOvernightRecovery(state); // end of the day that just finished
    resolveInfections(state);
    resolveDayMilestones(state, state.day + 1);
    state.dishesToday = []; // the day's meals wear off overnight
    state.turn = 1;
    state.day++;
    addLog(state, `Day ${state.day} begins.`);
    // The school's most charismatic student keeps spirits up.
    const bestCha = aliveChars(state).filter((c) => c.role === "student").reduce((m, c) => Math.max(m, c.grades.SocialStudies), 0);
    if (bestCha >= TUNE.moralePerCha) adjustHappiness(state, Math.floor(bestCha / TUNE.moralePerCha));
    if (techPerk(state, "dailyHappiness")) adjustHappiness(state, techPerk(state, "dailyHappiness"));
    rollRandomEvent(state);
    moveHorde(state);
    rollMapDrop(state);
  }
  // the watch's 📌 Stay: as the night ends, remember who stood on which square
  if (state.turn === 1) state.keptWatch = { ...state.entranceGrid.students };
  for (const c of state.characters) {
    c.gymToday = false;
    c.radioToday = false;
    c.researchToday = false;
    c.craftingToday = false;
    c.infirmaryToday = false;
    c.restToday = false;
    c.farmToday = false;
    c.barnToday = false;
    c.scrapyardToday = false;
    c.greenhouseToday = false;
    c.exploreTeam = null;
    c.defending = false;
  }
  if (state.turn === 1) restoreTurnOneJobs(state);
  state.entranceGrid.students = {}; // built defenses persist; daily placements don't
  if (state.turn === 3) restoreWatch(state);
  state.teamLocations = [null, null, null];
  state.raidTarget = null;
  checkGameOver(state);
}

// ---------- random events ----------
// Rolled once per day at the night->morning rollover. Happiness skews good vs bad, but never
// removes the chance of either outright.

function rollRandomEvent(state) {
  if (state.victory) return; // already evacuated this morning — nothing left to happen to them
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
  if (e.seeds) {
    const got = {};
    for (let i = 0; i < e.seeds; i++) {
      const id = pick(FARM_CROPS);
      got[id] = (got[id] || 0) + 1;
    }
    for (const [id, n] of Object.entries(got)) addStock(state, id, n);
    addLog(state, `Received ${Object.entries(got).map(([id, n]) => stockLabel(id, n)).join(", ")} for the farm.`);
  }
  if (e.stock) for (const [id, n] of Object.entries(e.stock)) addStock(state, id, n);
  if (e.blight) {
    const growing = FARM_GROUPS.fields.flatMap((crop) => state.plots[crop]).filter((p) => p.id);
    if (growing.length) {
      const plot = pick(growing);
      addLog(state, `A plot of ${PRODUCERS[plot.id].name.toLowerCase()} is lost to the blight.`);
      Object.assign(plot, emptyPlot());
    } else {
      addLog(state, "Luckily nothing was growing in the farm's plots.");
    }
  }

  if (e.recruit) {
    const recruit = makeCharacter(e.recruit, pick(["M", "F"]));
    if (addRecruit(state, recruit)) addLog(state, `${recruit.name} wants to join the school.`);
  }
  if (e.kill) {
    const victims = aliveChars(state);
    if (victims.length) {
      const victim = pick(victims);
      killCharacter(state, victim);
      addLog(state, `${victim.name} did not make it.`);
    }
  }
  if (e.infect) {
    const victims = aliveChars(state).filter((c) => !c.infection);
    if (victims.length) infect(state, pick(victims), "was bitten at the fence and hid it");
  }
  if (e.injure) {
    const candidates = aliveChars(state).filter((c) => c.role === "student"); // teachers have no HP
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
  if (state.today?.day === state.day) state.today.event = { kind: event.kind, title: event.title, desc: event.desc };
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
  addLog(state, `Research complete: ${node.name} — ${node.desc} (-${node.cost} research).`);
  // a defense upgrade replaces what's already built (and any kits for it)
  for (const up of DEFENSE_STRUCTURES.filter((d) => d.tech === techId)) {
    const grid = state.entranceGrid;
    for (const [key, id] of Object.entries(grid.defenses)) if (id === up.upgradeOf) grid.defenses[key] = up.id;
    const kits = state.defenseKits?.[up.upgradeOf];
    if (kits) {
      state.defenseKits[up.id] = (state.defenseKits[up.id] || 0) + kits;
      delete state.defenseKits[up.upgradeOf];
    }
  }
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

export const PROMOTE_LEVEL_THRESHOLD = STUDENT_MAX_LEVEL; // only students at the top level can become teachers

// A top-level student the Headmaster's Office puts forward — unless they've been marked to stay a student.
export const promotable = (c) => c.role === "student" && c.alive && overallLevel(c) >= PROMOTE_LEVEL_THRESHOLD && !c.neverPromote;
// Keep a student a student for good (they leave the promotion list), or put them back on it.
export function setNeverPromote(state, id, value) {
  const c = getChar(state, id);
  if (!c || c.role !== "student") return false;
  c.neverPromote = !!value;
  addLog(state, value ? `${c.name} will stay a student — they won't be put forward for promotion.` : `${c.name} can be put forward for promotion again.`);
  return true;
}

export function expelCharacter(state, id) {
  const idx = state.characters.findIndex((c) => c.id === id);
  if (idx === -1) return false;
  const c = state.characters[idx];
  unseat(state, id);
  state.characters.splice(idx, 1);
  addLog(state, `${c.name} was expelled from the school.`);
  return true;
}

export function promoteToTeacher(state, id) {
  const c = getChar(state, id);
  if (!c || c.role !== "student") return false;
  if (overallLevel(c) < PROMOTE_LEVEL_THRESHOLD) return false;
  unseat(state, id);
  c.role = "teacher";
  c.post = null;
  c.exploreTeam = null;
  c.defending = false;
  clearEntranceCellForChar(state, id);
  // Their teaching specialty becomes whatever subject they excelled in as a student.
  c.teachSubject = SUBJECTS.reduce((best, s) => (c.grades[s] > c.grades[best] ? s : best), SUBJECTS[0]);
  capTeacherGrades(c);
  c.traits = [];
  c.name = withTeacherHonorific(c.name, c.gender);
  addLog(state, `${c.name} has been promoted to teacher!`);
  return true;
}

export function acceptRecruit(state, index) {
  const recruit = state.recruitPool[index];
  if (!recruit) return false;
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

// Auto-equip: for each slot, the item from the Armory that does the most for them — weapons and
// armour by their fight power (then the item's own damage and bonuses), accessories by their
// bonuses — swapped in only when it beats what they have (an empty slot takes anything usable).
// Returns how many slots changed.
export function autoEquip(state, charId) {
  const c = getChar(state, charId);
  if (!c || c.role !== "student" || !c.alive) return 0;
  c.equipment = c.equipment || { meleeWeapon: null, rangedWeapon: null, armor: null, accessories: [null, null, null] };
  const bonusSum = (it) => (it ? Object.values(it.bonuses || {}).reduce((s, v) => s + v, 0) : -1);
  let changes = 0;
  const weaponSlot = weaponCategory(c) === "ranged" ? ["rangedWeapon", "weapon", "ranged"] : ["meleeWeapon", "weapon", "melee"];
  for (const [slot, type, category] of [weaponSlot, ["armor", "armor", null]]) {
    const current = c.equipment[slot];
    const score = (it) => {
      c.equipment[slot] = it;
      const s = fightPower(state, c).power * 1000 + (it?.damage || 0) * 10 + bonusSum(it);
      c.equipment[slot] = current;
      return s;
    };
    let best = null;
    let bestScore = current ? score(current) : -Infinity;
    for (const it of state.armory) {
      if (it.slot !== type || (category && it.category !== category) || !meetsItemRequirement(c, it)) continue;
      const s = score(it);
      if (s > bestScore) [best, bestScore] = [it, s];
    }
    if (best && equipItem(state, c.id, slot, best.uid)) changes++;
  }
  for (let i = 0; i < 3; i++) {
    const worst = [0, 1, 2].sort((a, b) => bonusSum(c.equipment.accessories[a]) - bonusSum(c.equipment.accessories[b]))[0];
    const current = c.equipment.accessories[worst];
    const best = state.armory.filter((it) => it.slot === "accessory" && meetsItemRequirement(c, it)).sort((a, b) => bonusSum(b) - bonusSum(a))[0];
    if (!best || bonusSum(best) <= bonusSum(current)) break;
    if (equipItem(state, c.id, `accessory${worst}`, best.uid)) changes++;
    else break;
  }
  return changes;
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
  if (item.slot === "weapon" && item.category !== weaponCategory(c)) return false; // (their class's kind only)
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
  if (c.role !== "student" || c.infection) return false; // teachers stay at the school, never explore; the infected are in quarantine
  if (c.stamina <= 0) return false; // too exhausted to go out
  if (c.farmToday || c.scrapyardToday || c.greenhouseToday) return false; // already working an outside facility today
  if (teamIndex === RAID_TEAM) {
    const landmark = LANDMARKS.find((l) => l.id === state.raidTarget);
    if (!landmark || overallLevel(c) < landmark.minLevel) return false;
    const squad = state.characters.filter((x) => x.exploreTeam === RAID_TEAM && x.id !== c.id).length;
    if (squad >= RAID_MAX_TEAM) return false;
    c.exploreTeam = RAID_TEAM;
    return true;
  }
  if (teamIndex < 0 || teamIndex >= teamCount(state)) return false; // not bought yet
  if (!teamHasRoom(state, teamIndex, exploreRole(c), c.id)) return false; // their role's slots are full
  c.exploreTeam = teamIndex;
  return true;
}

export function setTeamLocation(state, teamIndex, locationId) {
  if (teamIndex < 0 || teamIndex >= teamCount(state)) return false;
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
  if (isSchoolHex(q, r) || hexDistance(q, r) > MAP_RADIUS || isHexExplored(state, q, r)) return false;
  return HEX_NEIGHBOR_OFFSETS.some(([dq, dr]) => {
    const nq = q + dq, nr = r + dr;
    return isSchoolHex(nq, nr) || isHexExplored(state, nq, nr);
  });
}

// A cheap, instant scouting errand — separate from committing a full team to loot a location.
// Reveals whatever's on a fogged hex; only a discovered LOCATIONS hex becomes lootable via the
// normal setTeamLocation/setExploreTeam flow afterward. Every new tile risks a zombie encounter
// that grows more likely the farther it is from the school (more encounter types come later).
// Scouting costs double for every ring further from the school fence (see SCOUT_STAMINA_COST).
export function scoutCost(q, r, state = null) {
  const base = SCOUT_STAMINA_COST * 2 ** (hexDistance(q, r) - SCHOOL_RADIUS - 1);
  return state ? Math.max(1, Math.round(base * (1 - techPerk(state, "scoutCost")))) : base;
}

// Chance a scout runs into a zombie: +10% per ring out, more next to a nest, less for a sneaky
// (high-DEX) scout.
export function scoutEncounterChance(state, q, r, scout = null) {
  const ringsOut = hexDistance(q, r) - SCHOOL_RADIUS; // 1 right outside the school fence
  const stealth = scout ? 1 - effectiveGrade(state, scout, "Gymnastics") * TUNE.stealthPerDex : 1;
  return clamp01((ringsOut * SCOUT_ENCOUNTER_CHANCE_PER_HEX + (nextToNest(state, q, r) ? NEST_SCOUT_DANGER : 0)) * stealth);
}

// A student's odds heading out to a block: running into a zombie (DEX sneaks past), beating it
// (STR + DEX), and so getting ambushed — sent home with SCOUT_ENCOUNTER_HP_LOSS less HP.
export function scoutOdds(state, c, q, r) {
  const encounter = scoutEncounterChance(state, q, r, c);
  const win = clamp01(0.5 + ((effectiveGrade(state, c, "PE") + effectiveGrade(state, c, "Gymnastics")) / 2 - 40) / 100);
  return { encounter, win, ambush: encounter * (1 - win) };
}

// A student heads out to a block (to scout it, or to grab something there): pays the stamina, and
// may run into a zombie on the way — beat it for a little loot, or get ambushed and flee home.
function runOut(state, c, q, r, cost) {
  c.stamina -= cost;
  gainExp(state, c, LEVEL_XP.scout);
  const { encounter, win } = scoutOdds(state, c, q, r);
  const encountered = Math.random() < encounter;
  if (!encountered) return { ambushed: false, encountered: false };
  if (Math.random() >= win) {
    c.hp = Math.max(1, c.hp - SCOUT_ENCOUNTER_HP_LOSS);
    c.injured = c.hp < c.maxHp * 0.5;
    addLog(state, `${c.name} was ambushed by a zombie out in the city and fled back to the school (-${SCOUT_ENCOUNTER_HP_LOSS} HP).`);
    return { ambushed: true, encountered: true };
  }
  const lootKey = pick(["food", "materials", "medicine"]);
  const amt = randInt(5, 15);
  state.resources[lootKey] += amt;
  grantXp(state, c.id, "PE", 3 + randInt(0, 2));
  grantXp(state, c.id, "Gymnastics", 3 + randInt(0, 2));
  addLog(state, `${c.name} fought off a zombie out in the city and salvaged ${amt} ${RESOURCE_NAME[lootKey]}.`);
  return { ambushed: false, encountered: true };
}

export function scoutHex(state, studentId, q, r) {
  const c = getChar(state, studentId);
  if (!c || c.role !== "student" || !c.alive || c.infection) return null;
  const cost = scoutCost(q, r, state);
  if (c.stamina < cost) return null;
  if (!canScoutHex(state, q, r)) return null;

  const { ambushed, encountered } = runOut(state, c, q, r, cost);
  if (ambushed) return { ambushed: true, encountered: true, location: null };

  state.exploredHexes.push(hexKey(q, r));
  const milestones = checkMapMilestones(state);
  const location = locationAt(q, r);
  let find = null;
  if (location) {
    addLog(state, `${c.name} discovered ${location.name} while scouting.`);
  } else {
    find = rollHexFind(state, c, q, r);
  }
  return { ambushed: false, encountered, location, find, milestones };
}

// ---------- the wider map: hex finds, zombie nests, raids ----------

export const RAID_TEAM = 3; // exploreTeam index of the raid squad (0-2 are the expedition teams)

function weightedPick(table) {
  const entries = Object.entries(table);
  let roll = Math.random() * entries.reduce((sum, [, w]) => sum + w, 0);
  for (const [key, weight] of entries) {
    if (roll < weight) return key;
    roll -= weight;
  }
  return entries[0][0];
}

// Every hex has something in it — what, depends on the terrain (see HEX_FINDS in data.js).
function rollHexFind(state, scout, q, r) {
  const terrain = hexTerrain(q, r);
  const type = weightedPick(HEX_FINDS[terrain]);
  let text;
  if (type === "cache") {
    const key = CACHE_RESOURCE[terrain];
    const amt = randInt(6, 14);
    state.resources[key] += amt;
    text = `a stash of supplies: +${amt} ${RESOURCE_NAME[key]}`;
  } else if (type === "gear") {
    const item = rollItem(ITEM_DROP_ODDS[1]);
    state.armory.push(item);
    text = `${itemLabel(item)} — it's in the armory`;
  } else if (type === "ingredient") {
    const id = pick(SCAVENGED_INGREDIENTS);
    const n = randInt(1, 2);
    state.pantry[id] = (state.pantry[id] || 0) + n;
    text = `${INGREDIENTS[id].emoji ?? INGREDIENTS[id].icon} ${INGREDIENTS[id].name} ×${n} for the pantry`;
  } else if (type === "seeds") {
    const id = pick(FARM_CROPS);
    const n = randInt(1, 2);
    addStock(state, id, n);
    text = `${stockLabel(id, n)} for the farm`;
  } else if (type === "animal") {
    const id = pick(["chicken", "chicken", "sheep"]);
    addStock(state, id, 1);
    text = `a stray ${PRODUCERS[id].stockName.toLowerCase()} — led back to the farm`;
  } else if (type === "notes") {
    // notebooks, textbooks, a doctor's files — research for the tree
    const amt = randInt(5, 12);
    state.resources.research += amt;
    text = `notes and textbooks worth studying: +${amt} research`;
  } else if (type === "survivor") {
    const recruit = makeCharacter(rollRecruitRole(state), pick(["M", "F"]));
    text = addRecruit(state, recruit)
      ? `a survivor hiding out — ${recruit.name} wants to join`
      : `a survivor hiding out — but the Headmaster's Office had no room for ${recruit.name}`;
  } else {
    state.nests.push(hexKey(q, r));
    text = "a zombie nest! Everything around it is more dangerous until a squad clears it out";
  }
  addLog(state, `${scout.name} scouted the ${TERRAIN_NAMES[terrain].toLowerCase()} and found ${text}.`);
  return { type, terrain, text };
}

export function isNest(state, q, r) {
  return state.nests.includes(hexKey(q, r));
}

// Danger from a nest next door — or from the wandering horde on or next to the block.
export function nextToNest(state, q, r) {
  return HEX_NEIGHBOR_OFFSETS.some(([dq, dr]) => isNest(state, q + dq, r + dr)) || nearHorde(state, q, r);
}

// ---------- things that turn up on the map: the wandering horde, supply drops ----------

export function nearHorde(state, q, r) {
  const h = state.horde;
  return !!h && hexDistance(q - h.q, r - h.r) <= 1;
}

// Day 2 it turns up out in the suburbs; after that it shambles one block a day, never onto the
// school grounds or the ring right outside the fence.
export function moveHorde(state) {
  const onMap = (q, r) => hexDistance(q, r) >= SCHOOL_RADIUS + 2 && hexDistance(q, r) <= MAP_RADIUS;
  if (!state.horde) {
    const ring = [];
    for (let q = -HORDE_START_RING; q <= HORDE_START_RING; q++)
      for (let r = -HORDE_START_RING; r <= HORDE_START_RING; r++) if (hexDistance(q, r) === HORDE_START_RING) ring.push({ q, r });
    state.horde = pick(ring);
    addLog(state, "🧟 A horde has been spotted wandering the city. Keep an eye on the map.");
    return;
  }
  const { q, r } = state.horde;
  const steps = HEX_NEIGHBOR_OFFSETS.map(([dq, dr]) => ({ q: q + dq, r: r + dr })).filter((h) => onMap(h.q, h.r));
  if (steps.length) state.horde = pick(steps);
}

export function dropAt(state, q, r) {
  return (state.mapDrops || []).find((d) => d.q === q && d.r === r) || null;
}

// Each morning something may turn up on a scouted block (not a place, a nest or the horde's).
// `force` skips the roll (for testing).
export function rollMapDrop(state, force = false) {
  state.mapDrops = (state.mapDrops || []).filter((d) => d.expires >= state.day);
  if (state.mapDrops.length >= MAP_DROP_MAX || (!force && Math.random() >= MAP_DROP_CHANCE)) return;
  const spots = state.exploredHexes
    .map((k) => k.split(",").map(Number))
    .filter(([q, r]) => !locationAt(q, r) && !isNest(state, q, r) && !nearHorde(state, q, r) && !dropAt(state, q, r));
  if (!spots.length) return;
  const [q, r] = pick(spots);
  const kind = weightedPick(Object.fromEntries(Object.entries(MAP_DROPS).map(([k, d]) => [k, d.weight])));
  state.mapDrops.push({ q, r, kind, expires: state.day + MAP_DROP_DAYS - 1 });
  addLog(state, `${MAP_DROPS[kind].emoji ?? MAP_DROPS[kind].icon} A ${MAP_DROPS[kind].name.toLowerCase()} turned up on the map — it won't be there for long.`);
}

// A runner goes to grab a drop: the same stamina and zombie risk as scouting that block.
export function collectDrop(state, studentId, q, r) {
  const c = getChar(state, studentId);
  const drop = dropAt(state, q, r);
  if (!c || !drop || c.role !== "student" || !c.alive || c.infection) return null;
  const cost = scoutCost(q, r, state);
  if (c.stamina < cost) return null;
  const { ambushed, encountered } = runOut(state, c, q, r, cost);
  if (ambushed) return { ambushed: true, encountered: true };
  state.mapDrops = state.mapDrops.filter((d) => d !== drop);
  let text;
  if (drop.kind === "crate") {
    const [a, b] = [pick(["food", "medicine"]), pick(["materials", "food"])];
    const amtA = randInt(8, 16);
    const amtB = randInt(5, 10);
    state.resources[a] += amtA;
    state.resources[b] += amtB;
    text = `+${amtA} ${RESOURCE_NAME[a]} and +${amtB} ${RESOURCE_NAME[b]}`;
  } else if (drop.kind === "wreck") {
    const amt = randInt(12, 22);
    state.resources.materials += amt;
    const item = Math.random() < 0.3 ? rollItem(ITEM_DROP_ODDS[1]) : null;
    if (item) state.armory.push(item);
    text = `+${amt} scrap${item ? ` and ${itemLabel(item)}` : ""}`;
  } else {
    const recruit = makeCharacter(rollRecruitRole(state), pick(["M", "F"]));
    text = addRecruit(state, recruit)
      ? `${recruit.name}, who wants to join`
      : `${recruit.name} — but the Headmaster's Office had no room for them`;
  }
  addLog(state, `${c.name} reached the ${MAP_DROPS[drop.kind].name.toLowerCase()}: ${text}.`);
  return { ambushed: false, encountered, drop: { ...drop, text } };
}

// A nest is fought out like a room (nestZombies, as strong as tonight's horde).
export function nestClearChance(state, squad) {
  return packFightOdds(state, nestZombies(state), squad);
}

// A small squad (up to NEST_CLEAR_MAX) burns out a nest on the spot. Win: the nest is gone, with
// scrap and maybe some gear from the pile; lose: the squad takes a beating and the nest stays.
export function clearNest(state, q, r, ids) {
  if (!isNest(state, q, r)) return null;
  const squad = ids
    .map((id) => getChar(state, id))
    .filter((c) => c && c.alive && !c.infection && c.role === "student" && c.stamina >= NEST_CLEAR_STAMINA)
    .slice(0, NEST_CLEAR_MAX);
  if (!squad.length) return null;
  const won = simulateRoomFight(state, squad, null, nestZombies(state)).won;
  for (const c of squad) c.stamina -= NEST_CLEAR_STAMINA;
  const names = squad.map((c) => c.name.split(" ")[0]).join(", ");
  if (won) {
    state.nests = state.nests.filter((k) => k !== hexKey(q, r));
    const amt = randInt(8, 16);
    state.resources.materials += amt;
    const item = Math.random() < 0.4 ? rollItem(ITEM_DROP_ODDS[2]) : null;
    if (item) state.armory.push(item);
    for (const c of squad) {
      grantXp(state, c.id, "PE", 3 + randInt(0, 2));
      grantXp(state, c.id, "Gymnastics", 3 + randInt(0, 2));
      gainExp(state, c, LEVEL_XP.nest);
    }
    const loot = `+${amt} scrap${item ? ` and ${itemLabel(item)}` : ""}`;
    addLog(state, `${names} burned out a zombie nest: ${loot}.`);
    return { won: true, loot, hurt: [] };
  }
  const hurt = [];
  for (const c of squad) {
    if (Math.random() < 0.6) {
      const dmg = randInt(15, 35);
      c.hp = Math.max(1, c.hp - dmg);
      c.injured = c.hp < c.maxHp * 0.5;
      hurt.push(`${c.name} (-${dmg} HP)`);
    }
  }
  addLog(state, `${names} couldn't clear the zombie nest and fell back${hurt.length ? ` — ${hurt.join(", ")}` : ""}.`);
  return { won: false, loot: null, hurt };
}

// ---------- mapping the town ----------
// How much of the map has been scouted (the school grounds don't count), as blocks and a percent
// (100 only once every block is done).
export function mapProgress(state) {
  let total = 0;
  let explored = 0;
  const seen = new Set(state.exploredHexes);
  for (let q = -MAP_RADIUS; q <= MAP_RADIUS; q++) {
    for (let r = -MAP_RADIUS; r <= MAP_RADIUS; r++) {
      if (hexDistance(q, r) > MAP_RADIUS || isSchoolHex(q, r)) continue;
      total++;
      if (seen.has(hexKey(q, r))) explored++;
    }
  }
  const pct = explored >= total ? 100 : Math.floor((explored / total) * 100);
  return { explored, total, pct };
}
export const mapComplete = (state) => mapProgress(state).pct === 100;
// Pays out every milestone the map has just passed (a legendary item each); returns them as
// [{ pct, item }]. The 100% one opens the raids.
export function checkMapMilestones(state) {
  state.mapMilestones = state.mapMilestones || [];
  const { pct } = mapProgress(state);
  const reached = [];
  for (const m of MAP_MILESTONES) {
    if (pct < m || state.mapMilestones.includes(m)) continue;
    state.mapMilestones.push(m);
    const item = makeLegendaryItem();
    state.armory.push(item);
    reached.push({ pct: m, item });
    addLog(state, `🗺 ${m}% of the town mapped — the scouts turned up ${itemLabel(item)} on the way. It's in the armory.`);
    if (m === 100) addLog(state, `🗺 Every block is mapped. Out past the edge of town the four raids are open: the City Mall, the General Hospital, the Military Base and the Research Institute.`);
  }
  return reached;
}
// The raids are the endgame: they open once the whole map has been scouted.
export const raidUnlocked = (state) => mapComplete(state);

export function raidCooldownLeft(state, landmarkId) {
  return Math.max(0, (state.raidCooldowns[landmarkId] || 0) - state.day);
}

// The boss as it stands today: tougher for every time it's been killed before.
export function raidBoss(state, landmark) {
  const kills = state.raidKills[landmark.id] || 0;
  return { ...landmark.boss, hp: Math.round(landmark.boss.hp * (1 + RAID_BOSS_SCALING * kills)), kills };
}

// Picks (or with null, calls off) today's raid. Switching targets sends the old squad home.
export function setRaidTarget(state, landmarkId) {
  const landmark = landmarkId && LANDMARKS.find((l) => l.id === landmarkId);
  if (landmarkId && (!landmark || !raidUnlocked(state) || raidCooldownLeft(state, landmarkId) > 0)) return false;
  if (landmarkId !== state.raidTarget) {
    for (const c of state.characters) if (c.exploreTeam === RAID_TEAM) c.exploreTeam = null;
  }
  state.raidTarget = landmarkId || null;
  return true;
}

// What one squad member hits the boss for each round, before hit/crit rolls — the better of
// their melee and ranged weapon, same as in the night battle.
export function raidAttack(state, c) {
  const s = battleStats(state, c);
  const melee = s.melee.damage * s.meleeMult;
  const ranged = s.ranged ? s.ranged.damage * s.rangedMult : 0;
  return { damage: Math.max(melee, ranged), hitChance: s.hitChance, armorMult: s.armorMult, dodge: s.dodge };
}

// Rough rounds-to-kill for the raid screen's estimate (expected damage per round vs boss HP).
export function raidEstimate(state, landmark, squad) {
  const boss = raidBoss(state, landmark);
  const lead = squadModifiers(state, squad).damageDealt;
  const perRound = squad.reduce((sum, c) => {
    const a = raidAttack(state, c);
    return sum + a.damage * a.hitChance * 1.12 * lead;
  }, 0);
  return { boss, perRound: Math.round(perRound), rounds: perRound ? Math.ceil(boss.hp / perRound) : Infinity };
}

// A squad against one big zombie, round by round (up to RAID_MAX_ROUNDS): a raid boss, or the
// pack leader the squad runs down when chasing the horde. Half-dead, it goes berserk.
function simulateBossFight(state, boss, squad) {
  let bossHp = boss.hp;
  let enraged = false;
  const fighters = squad.map((c) => ({ id: c.id, hp: c.hp, maxHp: c.maxHp, down: false, ...raidAttack(state, c) }));
  const mods = squadModifiers(state, squad);
  const frames = [{ bossHp, hp: fighters.map((f) => f.hp), hits: [], dealt: 0, text: `${boss.name} lurches out to meet the squad.` }];
  for (let round = 1; round <= RAID_MAX_ROUNDS && bossHp > 0 && fighters.some((f) => !f.down); round++) {
    let dealt = 0;
    let crits = 0;
    for (const f of fighters) {
      if (f.down || Math.random() > f.hitChance) continue;
      const crit = Math.random() < 0.12;
      if (crit) crits++;
      dealt += Math.round(f.damage * mods.damageDealt * (0.85 + Math.random() * 0.3) * (crit ? 2 : 1));
    }
    bossHp = Math.max(0, bossHp - dealt);
    let text = `Round ${round}: the squad deals ${dealt} damage${crits ? ` (${crits} critical hit${crits > 1 ? "s" : ""})` : ""}.`;
    const hits = [];
    if (bossHp > 0) {
      if (!enraged && bossHp <= boss.hp / 2) {
        enraged = true;
        text += ` ${boss.name} goes berserk!`;
      }
      for (const f of shuffled(fighters.filter((x) => !x.down)).slice(0, boss.attacks)) {
        if (Math.random() < f.dodge) {
          hits.push({ id: f.id, dmg: 0, dodged: true, down: false });
          continue;
        }
        const dmg = Math.round(boss.damage * (enraged ? 1.3 : 1) * (0.8 + Math.random() * 0.4) * f.armorMult * mods.damageTaken);
        f.hp = Math.max(0, f.hp - dmg);
        if (f.hp === 0) f.down = true;
        hits.push({ id: f.id, dmg, down: f.down });
      }
    } else {
      text += ` ${boss.name} falls!`;
    }
    frames.push({ bossHp, hp: fighters.map((f) => f.hp), hits, dealt, crits, text, enraged });
  }
  return { boss, won: bossHp <= 0, fighters, frames };
}

// Today's raid, settled from its run (startExpeditionRun) — or called off, if the squad's too small.
// Returns its report.
function resolveRaid(state, run) {
  const landmark = LANDMARKS.find((l) => l.id === state.raidTarget);
  if (!landmark || !raidUnlocked(state)) return null; // (the map isn't fully scouted yet)
  const squad = state.characters.filter((c) => c.exploreTeam === RAID_TEAM && c.alive);
  if (squad.length < landmark.minTeam) {
    if (!squad.length) return null;
    addLog(state, `The raid on the ${landmark.name} was called off — it needs at least ${landmark.minTeam} students.`);
    return { calledOff: true, landmarkId: landmark.id, squadSize: squad.length, minTeam: landmark.minTeam };
  }
  if (!run) return null;
  const boss = raidBoss(state, landmark);
  const won = run.won && run.room >= run.rooms;
  const report = {
    landmarkId: landmark.id, bossName: boss.name, won, rooms: [run.room, run.rooms], finds: run.finds, noise: run.noise,
    memberIds: squad.map((c) => c.id), loot: {}, items: [], recruit: run.recruit, hurt: [], lost: [],
  };
  const staminaCost = exploreStaminaCost(state);
  const dead = settleFallen(state, run.fallen, `fighting their way to ${boss.name}`);
  for (const c of squad) {
    c.stamina = Math.max(0, c.stamina - staminaCost);
    if (dead.includes(c.id)) {
      report.lost.push(c.name);
      continue;
    }
    if (run.hurt[c.id]) report.hurt.push(`${c.name} (-${run.hurt[c.id]} HP)`);
    grantXp(state, c.id, "PE", 5 + randInt(0, 3));
    grantXp(state, c.id, "Gymnastics", 5 + randInt(0, 3));
    gainExp(state, c, LEVEL_XP.raid);
  }
  if (won) {
    for (const [key, base] of Object.entries(landmark.rewards)) {
      const amt = Math.round(base * (1 + run.bonus)); // (and whatever turned up on the way)
      state.resources[key] += amt;
      report.loot[key] = amt;
    }
    for (let i = 0; i < landmark.drops; i++) {
      const item = rollItem(ITEM_DROP_ODDS.raid, landmark.dropSlots.length ? pick(landmark.dropSlots) : null);
      state.armory.push(item);
      report.items.push(item);
    }
    if (Math.random() < landmark.legendaryRecruitChance) report.recruit = addLegendaryRecruit(state).name;
    state.raidKills[landmark.id] = (state.raidKills[landmark.id] || 0) + 1;
    state.raidCooldowns[landmark.id] = state.day + landmark.respawnDays;
    adjustHappiness(state, HAPPINESS_GAIN_WIN * 2);
    addLog(state, `☠ Raid on the ${landmark.name}: ${boss.name} is dead! Loot: ${report.items.map(itemLabel).join(", ")}.${report.recruit ? ` ${report.recruit} was freed and wants to join.` : ""}`);
  } else {
    adjustHappiness(state, -HAPPINESS_LOSS_MISSION_FAIL * 2);
    addLog(state, `☠ Raid on the ${landmark.name}: the squad couldn't bring ${boss.name} down and fell back.`);
  }
  return report;
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
  if (value && (c.role !== "student" || c.infection)) return false; // teachers never defend either; the infected are in quarantine
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

// The night begins: last night's defenders take their squares again. Anyone who can't stand watch
// now (fallen, infected) leaves their square empty.
function restoreWatch(state) {
  const kept = state.keptWatch;
  delete state.keptWatch;
  if (!kept) return;
  for (const [key, id] of Object.entries(kept)) {
    if (Number(key.split(",")[1]) < state.entranceGrid.size) moveEntranceStudent(state, key, id);
  }
}

// Where a defense can go: walls and traps on the pavement's rows (the road's only for the horde).
export function canBuildAt(cellKey) {
  const [row] = cellKey.split(",").map(Number);
  return row >= DEFENSE_ROW0 && row < STREET_ROW0;
}

export function placeEntranceStudent(state, cellKey, studentId) {
  const c = getChar(state, studentId);
  if (!c || c.role !== "student" || !c.alive) return false;
  clearEntranceCellForChar(state, studentId);
  state.entranceGrid.students[cellKey] = studentId;
  c.defending = true;
  return true;
}

// Drag and drop on the Night Watch board: puts a student on a square of the defenders' rows. If
// someone's already there, they swap places (or step off, if the newcomer wasn't on the board).
export function moveEntranceStudent(state, cellKey, studentId) {
  const c = getChar(state, studentId);
  if (!c || c.role !== "student" || !c.alive || c.infection || c.exploreTeam !== null) return false;
  const [row] = cellKey.split(",").map(Number);
  if (row >= ENTRANCE_ZONES.students) return false; // only the defenders' rows
  const grid = state.entranceGrid.students;
  const from = Object.keys(grid).find((k) => grid[k] === studentId) || null;
  const other = grid[cellKey];
  if (other === studentId) return true;
  if (from) delete grid[from];
  grid[cellKey] = studentId;
  c.defending = true;
  if (other) {
    if (from) grid[from] = other;
    else {
      const o = getChar(state, other);
      if (o) o.defending = false;
    }
  }
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

// What can be built at the entrance now: each kind, or its upgrade once it's been researched.
export function buildableDefenses(state) {
  return DEFENSE_STRUCTURES.filter((d) => !d.upgradeOf).map((d) => DEFENSE_STRUCTURES.find((u) => u.upgradeOf === d.id && state.techUnlocked.includes(u.tech)) || d);
}

export function buildDefense(state, cellKey, structureId) {
  if (state.entranceGrid.defenses[cellKey]) return false;
  const def = buildableDefenses(state).find((d) => d.id === structureId);
  if (!def || !canBuildAt(cellKey, def)) return false;
  // a kit from the Scrapyard's trap bench builds one for free
  if (state.defenseKits?.[structureId] > 0) {
    state.defenseKits[structureId] -= 1;
    state.entranceGrid.defenses[cellKey] = structureId;
    addLog(state, `Built a ${def.name} at the entrance from a Scrapyard kit.`);
    return true;
  }
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
