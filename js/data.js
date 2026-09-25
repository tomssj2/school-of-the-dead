// ===== Core constants =====

export const SUBJECTS = ["PE", "Gymnastics", "Biology", "Physics", "History", "SocialStudies"];

export const SUBJECT_LABEL = {
  PE: "Physical Education",
  Gymnastics: "Gymnastics",
  Biology: "Biology",
  Physics: "Physics",
  History: "History",
  SocialStudies: "Social Studies",
};

export const STAT_OF_SUBJECT = {
  PE: "STR",
  Gymnastics: "DEX",
  Biology: "CON",
  Physics: "INT",
  History: "WIS",
  SocialStudies: "CHA",
};

export const STAT_LABEL = {
  STR: "Strength",
  DEX: "Dexterity",
  CON: "Constitution",
  INT: "Intelligence",
  WIS: "Wisdom",
  CHA: "Charisma",
};

// Letter-grade tiers a numeric grade (0-100) falls into. F is the default/most common, S the
// rarest and best. Ranges are contiguous and cover the full 0-100 scale.
export const GRADE_TIERS = ["F", "D", "C", "B", "A", "S"];
export const GRADE_RANGES = {
  F: [0, 34],
  D: [35, 49],
  C: [50, 64],
  B: [65, 79],
  A: [80, 94],
  S: [95, 100],
};

// Spawn-roll weights for students, parallel to GRADE_TIERS (F..S).
export const STUDENT_TIER_WEIGHTS = [40, 28, 18, 9, 4, 1];

// Teachers are generated completely differently from students: they roll ONE specialty subject
// at S rank, and their other five subjects are randomized among these tiers only (never below C).
export const TEACHER_SECONDARY_TIERS = ["C", "B", "A"];
export const TEACHER_SECONDARY_WEIGHTS = [50, 33, 17];

// How much a teacher's grade in a subject boosts that subject for every student in the room
// while teaching it — keyed by the teacher's letter grade in that subject.
export const TEACH_BONUS_BY_TIER = { S: 20, A: 10, B: 5, C: 2, D: 0, F: 0 };

// Teachers stay at the school full-time (no exploring/defending) and are capped and rarer.
export const MAX_TEACHERS = 20;
export const TEACHER_RECRUIT_CHANCE = 0.08;

// Traits: each character spawns with 1-3 of these. A trait speeds up grade growth in its
// subject during training, and bumps that subject's starting letter grade up one tier.
export const TRAITS = [
  { id: "nerd", name: "Nerd", icon: "🤓", subject: "Physics", desc: "Learns Physics faster and starts with a stronger Intelligence grade." },
  { id: "flexible", name: "Flexible", icon: "🤸", subject: "Gymnastics", desc: "Learns Gymnastics faster and starts with a stronger Dexterity grade." },
  { id: "gym_member", name: "Gym Member", icon: "🏋", subject: "PE", desc: "Learns Physical Education faster and starts with a stronger Strength grade." },
  { id: "librarian", name: "Librarian", icon: "📚", subject: "History", desc: "Learns History faster and starts with a stronger Wisdom grade." },
  { id: "hot", name: "Hot", icon: "😎", subject: "SocialStudies", desc: "Learns Social Studies faster and starts with a stronger Charisma grade." },
  { id: "farmer", name: "Farmer", icon: "🌾", subject: "Biology", desc: "Learns Biology faster and starts with a stronger Constitution grade." },
];

// ===== Equipment =====
// Templates for the shared school armory. Weapon/armor/accessory bonuses add directly to
// their stat during expeditions and defense (they don't touch academic grades).
//
// Weapons carry 3 extra things armor/accessories don't: `category` ("melee" or "ranged"),
// `damage` and `range` (in grid squares — melee tops out at 2, ranged runs 4-9), and `requires`,
// a minimum STR (melee) or DEX (ranged) the character's own grade must clear to equip it at all
// (checked against their raw PE/Gymnastics grade, not equipment-boosted, so gear can't bootstrap
// itself). Every student can hold one melee weapon and one ranged weapon at once.
export const ITEM_TEMPLATES = [
  // Melee weapons (17) — require STR (PE grade) to hold, range 1-2
  { id: "bat", name: "Baseball Bat", slot: "weapon", category: "melee", icon: "🏏", bonuses: { STR: 6 }, damage: 10, range: 2, requires: { STR: 25 } },
  { id: "knife", name: "Kitchen Knife", slot: "weapon", category: "melee", icon: "🔪", bonuses: { DEX: 6 }, damage: 9, range: 1, requires: { STR: 20 } },
  { id: "axe", name: "Fire Axe", slot: "weapon", category: "melee", icon: "🪓", bonuses: { STR: 5, DEX: 3 }, damage: 12, range: 2, requires: { STR: 35 } },
  { id: "crowbar", name: "Crowbar", slot: "weapon", category: "melee", icon: "🔧", bonuses: { STR: 4, DEX: 2 }, damage: 9, range: 1, requires: { STR: 22 } },
  { id: "hockey_stick", name: "Hockey Stick", slot: "weapon", category: "melee", icon: "🏒", bonuses: { DEX: 5 }, damage: 8, range: 2, requires: { STR: 20 } },
  { id: "cleaver", name: "Cafeteria Cleaver", slot: "weapon", category: "melee", icon: "🗡", bonuses: { STR: 5, DEX: 2 }, damage: 11, range: 1, requires: { STR: 30 } },
  { id: "broom_spear", name: "Broom Handle Spear", slot: "weapon", category: "melee", icon: "🧹", bonuses: { DEX: 4, STR: 2 }, damage: 8, range: 2, requires: { STR: 22 } },
  { id: "tennis_racket", name: "Tennis Racket", slot: "weapon", category: "melee", icon: "🎾", bonuses: { DEX: 3 }, damage: 6, range: 1, requires: { STR: 15 } },
  { id: "trophy", name: "Heavy Trophy", slot: "weapon", category: "melee", icon: "🏆", bonuses: { STR: 6 }, damage: 10, range: 1, requires: { STR: 28 } },
  { id: "wrench", name: "Pipe Wrench", slot: "weapon", category: "melee", icon: "🔩", bonuses: { STR: 5 }, damage: 9, range: 1, requires: { STR: 25 } },
  { id: "shovel", name: "Shovel", slot: "weapon", category: "melee", icon: "⛏", bonuses: { STR: 6, CON: 2 }, damage: 11, range: 2, requires: { STR: 32 } },
  { id: "nail_bat", name: "Nail-Studded Bat", slot: "weapon", category: "melee", icon: "🏏", bonuses: { STR: 7, DEX: 1 }, damage: 13, range: 2, requires: { STR: 38 } },
  { id: "machete", name: "Machete", slot: "weapon", category: "melee", icon: "⚔", bonuses: { DEX: 7 }, damage: 11, range: 1, requires: { STR: 30 } },
  { id: "sledgehammer", name: "Sledgehammer", slot: "weapon", category: "melee", icon: "🔨", bonuses: { STR: 9 }, damage: 15, range: 2, requires: { STR: 45 } },
  { id: "field_chainsaw", name: "Rusty Chainsaw", slot: "weapon", category: "melee", icon: "🪚", bonuses: { STR: 7, DEX: 2 }, damage: 14, range: 2, requires: { STR: 42 } },
  { id: "pool_cue", name: "Pool Cue", slot: "weapon", category: "melee", icon: "🎱", bonuses: { DEX: 4 }, damage: 7, range: 2, requires: { STR: 18 } },
  { id: "fire_poker", name: "Fire Poker", slot: "weapon", category: "melee", icon: "🔥", bonuses: { STR: 4, DEX: 2 }, damage: 9, range: 2, requires: { STR: 24 } },

  // Ranged weapons (17) — require DEX (Gymnastics grade) to hold, range 4-9
  { id: "slingshot", name: "Slingshot", slot: "weapon", category: "ranged", icon: "🎯", bonuses: { DEX: 5 }, damage: 7, range: 5, requires: { DEX: 18 } },
  { id: "recurve_bow", name: "Recurve Bow", slot: "weapon", category: "ranged", icon: "🏹", bonuses: { DEX: 7 }, damage: 10, range: 7, requires: { DEX: 28 } },
  { id: "compound_bow", name: "Compound Bow", slot: "weapon", category: "ranged", icon: "🏹", bonuses: { DEX: 8 }, damage: 12, range: 8, requires: { DEX: 35 } },
  { id: "crossbow", name: "Crossbow", slot: "weapon", category: "ranged", icon: "🎯", bonuses: { DEX: 7, STR: 2 }, damage: 13, range: 6, requires: { DEX: 38 } },
  { id: "nerf_blaster", name: "Nerf Blaster", slot: "weapon", category: "ranged", icon: "🔫", bonuses: { DEX: 4 }, damage: 5, range: 4, requires: { DEX: 12 } },
  { id: "dart_gun", name: "Tranq Dart Gun", slot: "weapon", category: "ranged", icon: "🔫", bonuses: { DEX: 5 }, damage: 8, range: 5, requires: { DEX: 22 } },
  { id: "paintball_marker", name: "Paintball Marker", slot: "weapon", category: "ranged", icon: "🔫", bonuses: { DEX: 6 }, damage: 8, range: 6, requires: { DEX: 24 } },
  { id: "potato_cannon", name: "Potato Cannon", slot: "weapon", category: "ranged", icon: "🥔", bonuses: { DEX: 5, STR: 2 }, damage: 11, range: 7, requires: { DEX: 30 } },
  { id: "water_balloon_launcher", name: "Water Balloon Launcher", slot: "weapon", category: "ranged", icon: "💧", bonuses: { DEX: 4 }, damage: 4, range: 4, requires: { DEX: 10 } },
  { id: "throwing_knives", name: "Throwing Knives", slot: "weapon", category: "ranged", icon: "🔪", bonuses: { DEX: 6 }, damage: 9, range: 5, requires: { DEX: 25 } },
  { id: "javelin", name: "Javelin", slot: "weapon", category: "ranged", icon: "🥍", bonuses: { DEX: 6, STR: 2 }, damage: 12, range: 6, requires: { DEX: 33 } },
  { id: "discus", name: "Discus", slot: "weapon", category: "ranged", icon: "🥏", bonuses: { DEX: 5, STR: 3 }, damage: 11, range: 5, requires: { DEX: 30 } },
  { id: "fire_extinguisher", name: "Fire Extinguisher", slot: "weapon", category: "ranged", icon: "🧯", bonuses: { DEX: 3, CON: 2 }, damage: 6, range: 4, requires: { DEX: 16 } },
  { id: "bottle_rocket", name: "Bottle Rocket", slot: "weapon", category: "ranged", icon: "🎆", bonuses: { DEX: 4 }, damage: 7, range: 6, requires: { DEX: 20 } },
  { id: "bb_gun", name: "BB Gun", slot: "weapon", category: "ranged", icon: "🔫", bonuses: { DEX: 6 }, damage: 8, range: 6, requires: { DEX: 22 } },
  { id: "baseball_pitch", name: "Pitching Arm", slot: "weapon", category: "ranged", icon: "⚾", bonuses: { DEX: 6 }, damage: 9, range: 6, requires: { DEX: 26 } },
  { id: "fishing_rod_hook", name: "Fishing Rod & Hook", slot: "weapon", category: "ranged", icon: "🎣", bonuses: { DEX: 4, WIS: 2 }, damage: 7, range: 9, requires: { DEX: 20 } },

  // Armor (17)
  { id: "jacket", name: "School Jacket", slot: "armor", icon: "🧥", bonuses: { CON: 4 } },
  { id: "vest", name: "Riot Vest", slot: "armor", icon: "🦺", bonuses: { CON: 9 } },
  { id: "pads", name: "Padded Gear", slot: "armor", icon: "🎽", bonuses: { CON: 5, DEX: 2 } },
  { id: "helmet", name: "Bike Helmet", slot: "armor", icon: "⛑", bonuses: { CON: 3, STR: 2 } },
  { id: "letterman_jacket", name: "Letterman Jacket", slot: "armor", icon: "🏅", bonuses: { CON: 4, CHA: 2 } },
  { id: "hoodie", name: "Hoodie", slot: "armor", icon: "🧣", bonuses: { CON: 3 } },
  { id: "backpack_plate", name: "Backpack Plate", slot: "armor", icon: "🎒", bonuses: { CON: 5 } },
  { id: "catchers_gear", name: "Catcher's Gear", slot: "armor", icon: "🥎", bonuses: { CON: 7 } },
  { id: "football_pads", name: "Football Pads", slot: "armor", icon: "🏈", bonuses: { CON: 6, STR: 2 } },
  { id: "trash_lid", name: "Trash Can Lid", slot: "armor", icon: "🛡", bonuses: { CON: 6 } },
  { id: "welding_mask", name: "Welding Mask", slot: "armor", icon: "😷", bonuses: { CON: 4, WIS: 2 } },
  { id: "motorcycle_jacket", name: "Motorcycle Jacket", slot: "armor", icon: "🏍", bonuses: { CON: 6, DEX: 2 } },
  { id: "kevlar_vest", name: "Improvised Kevlar", slot: "armor", icon: "🦺", bonuses: { CON: 9 } },
  { id: "lab_coat", name: "Lab Coat", slot: "armor", icon: "🥼", bonuses: { CON: 3, INT: 3 } },
  { id: "apron", name: "Cafeteria Apron", slot: "armor", icon: "🧑‍🍳", bonuses: { CON: 3 } },
  { id: "winter_coat", name: "Winter Coat", slot: "armor", icon: "🧥", bonuses: { CON: 5, STR: 1 } },
  { id: "riot_harness", name: "Riot Shield Harness", slot: "armor", icon: "🛡", bonuses: { CON: 6, STR: 2 } },

  // Accessories (17)
  { id: "charm", name: "Lucky Charm", slot: "accessory", icon: "🍀", bonuses: { CHA: 5 } },
  { id: "glasses", name: "Reading Glasses", slot: "accessory", icon: "👓", bonuses: { INT: 5 } },
  { id: "watch", name: "Pocket Watch", slot: "accessory", icon: "⌚", bonuses: { WIS: 5 } },
  { id: "energy_drink", name: "Energy Drink", slot: "accessory", icon: "🥤", bonuses: { STR: 2, DEX: 2 } },
  { id: "photo", name: "Family Photo", slot: "accessory", icon: "📷", bonuses: { CHA: 3, WIS: 2 } },
  { id: "gloves", name: "Fingerless Gloves", slot: "accessory", icon: "🧤", bonuses: { DEX: 3, STR: 2 } },
  { id: "bracelet", name: "Friendship Bracelet", slot: "accessory", icon: "📿", bonuses: { CHA: 4 } },
  { id: "class_ring", name: "Class Ring", slot: "accessory", icon: "💍", bonuses: { CHA: 3, WIS: 2 } },
  { id: "harmonica", name: "Harmonica", slot: "accessory", icon: "🎵", bonuses: { CHA: 4 } },
  { id: "walkie_talkie", name: "Walkie-Talkie", slot: "accessory", icon: "📻", bonuses: { WIS: 4 } },
  { id: "compass", name: "Compass", slot: "accessory", icon: "🧭", bonuses: { WIS: 5 } },
  { id: "notebook", name: "Notebook", slot: "accessory", icon: "📓", bonuses: { INT: 4 } },
  { id: "headband", name: "Headband", slot: "accessory", icon: "🎗", bonuses: { DEX: 3 } },
  { id: "whistle", name: "Whistle", slot: "accessory", icon: "📯", bonuses: { CHA: 3, STR: 1 } },
  { id: "sunglasses", name: "Sunglasses", slot: "accessory", icon: "🕶", bonuses: { CHA: 4 } },
  { id: "first_aid", name: "Worn First Aid Kit", slot: "accessory", icon: "🩹", bonuses: { CON: 3, WIS: 2 } },
  { id: "energy_stash", name: "Energy Bar Stash", slot: "accessory", icon: "🍫", bonuses: { STR: 2, CON: 2 } },
];

// A handful of starter items to seed the shared armory with on a new game.
export const STARTER_ARMORY_IDS = ["bat", "jacket", "charm", "knife", "watch", "pads", "glasses", "slingshot"];

// Rare, much stronger items — never in the starter/shared armory pool. Only ever created
// pre-equipped on a legendary survivor (see makeLegendaryCharacter).
export const LEGENDARY_ITEM_TEMPLATES = [
  { id: "legendary_bat", name: "Home Run King", slot: "weapon", category: "melee", icon: "🏏", bonuses: { STR: 16 }, damage: 26, range: 2, requires: { STR: 70 }, legendary: true },
  { id: "legendary_axe", name: "Widow's Edge", slot: "weapon", category: "melee", icon: "🪓", bonuses: { STR: 12, DEX: 8 }, damage: 32, range: 2, requires: { STR: 78 }, legendary: true },
  { id: "legendary_chainsaw", name: "Groundskeeper's Fury", slot: "weapon", category: "melee", icon: "🪚", bonuses: { STR: 18, DEX: 4 }, damage: 36, range: 2, requires: { STR: 85 }, legendary: true },
  { id: "legendary_machete", name: "Principal's Wrath", slot: "weapon", category: "melee", icon: "⚔", bonuses: { DEX: 16, STR: 6 }, damage: 34, range: 1, requires: { STR: 80 }, legendary: true },
  { id: "legendary_recurve", name: "Robin's Last Arrow", slot: "weapon", category: "ranged", icon: "🏹", bonuses: { DEX: 18 }, damage: 30, range: 9, requires: { DEX: 75 }, legendary: true },
  { id: "legendary_crossbow", name: "Van Helsing's Crossbow", slot: "weapon", category: "ranged", icon: "🎯", bonuses: { DEX: 14, STR: 6 }, damage: 34, range: 8, requires: { DEX: 80 }, legendary: true },
  { id: "legendary_cannon", name: "Coach's Cannon", slot: "weapon", category: "ranged", icon: "🥔", bonuses: { DEX: 12, STR: 10 }, damage: 36, range: 7, requires: { DEX: 82 }, legendary: true },
  { id: "legendary_slingshot", name: "Giant's Fall", slot: "weapon", category: "ranged", icon: "🎯", bonuses: { DEX: 16, WIS: 6 }, damage: 28, range: 9, requires: { DEX: 72 }, legendary: true },
  { id: "legendary_vest", name: "Warden's Plate", slot: "armor", icon: "🦺", bonuses: { CON: 20 }, legendary: true },
  { id: "legendary_coat", name: "Survivor's Coat", slot: "armor", icon: "🧥", bonuses: { CON: 12, DEX: 6 }, legendary: true },
  { id: "legendary_riotgear", name: "Last Guardian's Plate", slot: "armor", icon: "🛡", bonuses: { CON: 22, STR: 4 }, legendary: true },
  { id: "legendary_labcoat", name: "Alchemist's Ward", slot: "armor", icon: "🥼", bonuses: { INT: 12, CON: 10 }, legendary: true },
  { id: "legendary_charm", name: "Four-Leaf Talisman", slot: "accessory", icon: "🍀", bonuses: { CHA: 14, WIS: 6 }, legendary: true },
  { id: "legendary_glasses", name: "Oracle's Lenses", slot: "accessory", icon: "👓", bonuses: { INT: 14, WIS: 6 }, legendary: true },
  { id: "legendary_compass", name: "Wayfinder's Compass", slot: "accessory", icon: "🧭", bonuses: { WIS: 16, INT: 6 }, legendary: true },
  { id: "legendary_ring", name: "Captain's Signet", slot: "accessory", icon: "💍", bonuses: { CHA: 16, WIS: 6 }, legendary: true },
];

export const LEGENDARY_TITLES = ["the Relentless", "the Unbroken", "the Last Stand", "the Ironclad", "the Undying", "the Reaper's Bane"];

// ===== Main Entrance battle grid =====
// The grid the player builds and fights on at the Main Entrance, split into 3 equal horizontal
// thirds: students are placed in the top rows, defenses are built in the middle rows, and the
// bottom rows are reserved for the horde. Starts at 6x6 — stored on state (not hardcoded) so a
// later "expand the entrance" upgrade can just grow state.entranceGrid.size.
export const ENTRANCE_GRID_SIZE = 6;

// `blocks` structures stop zombies until smashed (hp); destroyed ones are gone after the battle,
// damaged ones are patched back up. `enterDamage` hits a zombie stepping onto the cell;
// `slows` holds it there an extra tick.
export const DEFENSE_STRUCTURES = [
  { id: "barricade", name: "Barricade", icon: "🚧", cost: { materials: 12 }, blocks: true, hp: 40, desc: "Blocks a lane until the horde smashes through (40 HP)." },
  { id: "sandbag_wall", name: "Sandbag Wall", icon: "🧱", cost: { materials: 18 }, blocks: true, hp: 80, desc: "A heavier wall — takes twice the beating (80 HP)." },
  { id: "spike_trap", name: "Spike Trap", icon: "🔺", cost: { materials: 15 }, enterDamage: 14, desc: "Deals 14 damage to every zombie that steps on it." },
  { id: "razor_wire", name: "Razor Wire", icon: "🔗", cost: { materials: 20 }, enterDamage: 6, slows: true, desc: "Cuts for 6 and snags zombies in place for an extra turn." },
];

// ===== Night battle tuning =====
export const ZOMBIE_HIT_CHANCE = 0.65;
export const FIST_WEAPON = { name: "Fists", icon: "👊", damage: 4, range: 1, category: "melee" };
export const BATTLE_MAX_TICKS = 40;
export const DOWNED_DEATH_CHANCE = 0.2; // before the Biology modifier, when there's no medicine to spare
export const MEDICINE_PER_STABILIZE = 5; // spent automatically to save a downed defender outright
export function zombieCountForDay(day) {
  return 3 + Math.floor(day * 0.7);
}
export function zombieStatsForDay(day) {
  return { hp: 18 + Math.round(day * 1.2), damage: 4 + Math.floor(day / 2) };
}

// Multipliers are applied to zombieStatsForDay. `speed` = rows moved per turn, `wallMult` scales
// damage to walls, `spitRange` lets it attack a defender from that many squares away instead of
// closing in, `unsnaggable` ignores razor wire.
export const ZOMBIE_TYPES = {
  walker: { name: "Walker", badge: "", hpMult: 1, dmgMult: 1, from: 1, desc: "Slow and relentless." },
  runner: { name: "Runner", badge: "💨", hpMult: 0.6, dmgMult: 0.8, speed: 2, from: 4, desc: "Covers two rows a turn, but goes down easy." },
  brute: { name: "Brute", badge: "💪", hpMult: 2, dmgMult: 1.5, wallMult: 2, from: 7, desc: "Soaks up hits and smashes walls twice as fast." },
  spitter: { name: "Spitter", badge: "🤮", hpMult: 0.8, dmgMult: 0.7, spitRange: 3, from: 10, desc: "Spits acid at defenders up to 3 squares away." },
  boss: { name: "Boss", badge: "👑", hpMult: 5, dmgMult: 2, wallMult: 3, unsnaggable: true, from: 5, desc: "Leads the horde every 5th night. Brings a hoard worth taking." },
};

export const BOSS_EVERY = 5;
const BOSS_NAMES = ["The Janitor", "Coach Carrion", "The Lunch Lady", "Principal Rot", "The Superintendent"];
export function isBossNight(day) {
  return day % BOSS_EVERY === 0;
}
export function bossNameForDay(day) {
  return BOSS_NAMES[day / BOSS_EVERY - 1] || "The Horde King";
}

// Deterministic (only spawn spots are random), so the Night Watch forecast can list it exactly.
export function hordeComposition(day) {
  const count = zombieCountForDay(day);
  const runner = day >= ZOMBIE_TYPES.runner.from ? Math.floor(count * 0.25) : 0;
  const brute = day >= ZOMBIE_TYPES.brute.from ? Math.max(1, Math.floor(count * 0.15)) : 0;
  const spitter = day >= ZOMBIE_TYPES.spitter.from ? Math.max(1, Math.floor(count * 0.15)) : 0;
  return { walker: count - runner - brute - spitter, runner, brute, spitter, boss: isBossNight(day) ? 1 : 0 };
}

// ===== The rescue (the run's goal) =====
// At the end of day RESCUE_BROADCAST_DAY - 1 the radio announces an evacuation on RESCUE_DAY —
// if the rooftop antenna is repaired by then. If it isn't, the helicopters come back
// RESCUE_DELAY_DAYS later.
export const RESCUE_BROADCAST_DAY = 3;
export const RESCUE_DAY = 30;
export const RESCUE_DELAY_DAYS = 5;
export const ANTENNA_STAGES = [
  { name: "Salvage the wiring", icon: "🔌", cost: { materials: 30 } },
  { name: "Rebuild the mast", icon: "🗼", cost: { materials: 50 } },
  { name: "Rig a generator", icon: "🔋", cost: { materials: 40, research: 15 } },
  { name: "Fix the transmitter", icon: "📻", cost: { research: 35 } },
  { name: "Boost the signal", icon: "📡", cost: { materials: 50, research: 30 } },
];

// ===== Expedition loot =====
export const EXPEDITION_ITEM_CHANCE = 0.3; // + 0.08 per location difficulty, on a success
export const EXPEDITION_ITEM_CHANCE_FAILED = 0.1;

// ===== Skill tree =====
// One path per subject/grade, 5 nodes (D through S). A node unlocks automatically once the
// character's letter grade in that subject reaches its tier — no separate skill points.
export const SKILL_TREE = {
  PE: [
    { tier: "D", name: "Brawler", desc: "Throws a harder punch in a pinch." },
    { tier: "C", name: "Iron Grip", desc: "Holds the line better on defense." },
    { tier: "B", name: "Juggernaut", desc: "Shrugs off hits others wouldn't." },
    { tier: "A", name: "Warlord", desc: "Leads the charge on dangerous runs." },
    { tier: "S", name: "Titan", desc: "A one-person wrecking crew." },
  ],
  Gymnastics: [
    { tier: "D", name: "Quick Step", desc: "Dodges the first swing." },
    { tier: "C", name: "Light Foot", desc: "Moves through danger almost unseen." },
    { tier: "B", name: "Acrobat", desc: "Turns tight spots into escape routes." },
    { tier: "A", name: "Ghost", desc: "Rarely where the horde expects." },
    { tier: "S", name: "Untouchable", desc: "The horde can't lay a hand on them." },
  ],
  Biology: [
    { tier: "D", name: "Tough Skin", desc: "Shrugs off minor scrapes." },
    { tier: "C", name: "Iron Stomach", desc: "Recovers faster from rough days." },
    { tier: "B", name: "Survivor", desc: "Walks away from what should've hurt." },
    { tier: "A", name: "Unbreakable", desc: "Bites and scratches barely slow them down." },
    { tier: "S", name: "Immune", desc: "The horde's bite is the least of their worries." },
  ],
  Physics: [
    { tier: "D", name: "Quick Thinker", desc: "Spots the danger a beat sooner." },
    { tier: "C", name: "Tactician", desc: "Plans a safer route through trouble." },
    { tier: "B", name: "Analyst", desc: "Reads a room before it turns deadly." },
    { tier: "A", name: "Strategist", desc: "Keeps the whole team a step ahead." },
    { tier: "S", name: "Mastermind", desc: "Turns any expedition into a calculated win." },
  ],
  History: [
    { tier: "D", name: "Keen Eye", desc: "Spots loot others would walk past." },
    { tier: "C", name: "Scavenger", desc: "Knows where the good stuff hides." },
    { tier: "B", name: "Appraiser", desc: "Never leaves the valuable stuff behind." },
    { tier: "A", name: "Treasure Hunter", desc: "Finds more than anyone expects." },
    { tier: "S", name: "Archivist", desc: "Nothing worth taking gets missed." },
  ],
  SocialStudies: [
    { tier: "D", name: "Friendly Face", desc: "Puts strangers at ease." },
    { tier: "C", name: "People Person", desc: "Talks their way past trouble." },
    { tier: "B", name: "Persuader", desc: "Convinces survivors the school is safe." },
    { tier: "A", name: "Natural Leader", desc: "Others want to follow them home." },
    { tier: "S", name: "Icon", desc: "Word of them spreads through the whole city." },
  ],
};

// Floor 2 has 4 generic classroom rooms. Each starts unassigned ("Classroom 1" etc.) and takes
// on a subject — one of these four "sit-down" subjects; PE/Gymnastics only happen in the Gym —
// the moment its one teacher is assigned. It reverts to unassigned once that teacher leaves.
export const CLASSROOM_SUBJECTS = ["Biology", "Physics", "History", "SocialStudies"];
export const CLASSROOM_IDS = ["1", "2", "3", "4"];

export const CLASSROOM_DESKS_PER_ROW = 3;
export const CLASSROOM_SEATS_PER_ROW = CLASSROOM_DESKS_PER_ROW * 2; // 6
export const CLASSROOM_CAPACITY = 4 * CLASSROOM_SEATS_PER_ROW; // 24 (base: 4 rows)
export const CLASSROOM_MAX_TEACHERS = 1; // one teacher = one subject, kept simple and not upgradeable

export const GYM_CAPACITY = 10; // base student slots/day
export const GYM_MAX_TEACHERS = 3; // base teacher slots (gym works fine with none assigned)

export const CAFETERIA_MAX_TEACHERS = 3; // base teacher (cook) slots — each cook makes one dish a day

// Research Room: teachers turn their combined INT (Physics grade) into research points each day.
// Starts with one researcher slot; each upgrade level adds another.
export const RESEARCH_ROOM_TEACHERS = 1;
export const RESEARCH_ROOM_INT_PER_POINT = 20;

// Lounge: students rest here to recover stamina. Both the slots and the amount recovered upgrade.
export const LOUNGE_CAPACITY = 10;
export const LOUNGE_RECOVERY = 50; // stamina per student per day, before upgrades

// Nurse's Office: one nurse (a teacher) and a few beds. A patient heals INFIRMARY_HEAL_BASE of their
// max HP plus up to INFIRMARY_NURSE_BONUS more from the nurse's Biology, spending medicine; with
// none to spare they only get bed rest.
export const INFIRMARY_CAPACITY = 4;
export const INFIRMARY_MAX_TEACHERS = 1;
export const INFIRMARY_MEDICINE_PER_PATIENT = 3;
export const INFIRMARY_HEAL_BASE = 0.3;
export const INFIRMARY_NURSE_BONUS = 0.25; // at Biology 100
export const INFIRMARY_BED_REST = 0.1;

// ===== Cooking =====
// Four staple crops are grown at the Farm; three extras only turn up on expeditions. Cooks turn
// them (plus some food to feed everyone) into a dish whose buff covers the whole school until
// the day ends. `effect` multipliers are read through dishMultiplier() in game.js.
export const INGREDIENTS = {
  potatoes: { name: "Potatoes", icon: "🥔", source: "farm" },
  tomatoes: { name: "Tomatoes", icon: "🍅", source: "farm" },
  wheat: { name: "Wheat Flour", icon: "🌾", source: "farm" },
  eggs: { name: "Eggs", icon: "🥚", source: "farm" },
  canned_meat: { name: "Canned Meat", icon: "🥫", source: "scavenged" },
  spices: { name: "Chili Spices", icon: "🌶️", source: "scavenged" },
  coffee: { name: "Coffee", icon: "☕", source: "scavenged" },
};
export const FARM_INGREDIENTS = Object.keys(INGREDIENTS).filter((id) => INGREDIENTS[id].source === "farm");
export const SCAVENGED_INGREDIENTS = Object.keys(INGREDIENTS).filter((id) => INGREDIENTS[id].source === "scavenged");
export const STARTING_PANTRY = { potatoes: 2, tomatoes: 2, wheat: 2, eggs: 2, canned_meat: 1, spices: 1, coffee: 1 };

// ===== Farm plots =====
// Each plot grows one chosen crop. Planting uses up one seed of that crop (seeds come from
// expeditions and events), and a plot only grows on days a farm worker tends it. Annual crops are
// harvested into the pantry after `growDays` tended days and the plot needs a new seed — replanted
// automatically while seeds last. Hens are "perennial": once settled in they lay `yield` eggs
// every `growDays` tended days and never need replacing.
export const CROPS = {
  potatoes: { plotName: "Potatoes", seedName: "Seed Potatoes", seedIcon: "🌱", growDays: 3, yield: 4 },
  tomatoes: { plotName: "Tomatoes", seedName: "Tomato Seeds", seedIcon: "🌱", growDays: 2, yield: 3 },
  wheat: { plotName: "Wheat", seedName: "Wheat Seeds", seedIcon: "🌱", growDays: 3, yield: 4 },
  eggs: { plotName: "Hen Coop", seedName: "Hen", seedIcon: "🐔", growDays: 1, yield: 1, perennial: true },
};
export const PLANT_CROPS = Object.keys(CROPS).filter((id) => !CROPS[id].perennial); // what seed finds roll
export const FARM_PLOTS = 3; // plots before any upgrade (+2 per upgrade level)
export const FARM_PLOTS_PER_WORKER = 2; // plots one farm worker can tend a day
export const SEED_SAVE_CHANCE = 0.5; // chance an annual harvest saves one seed for replanting
export const STARTING_SEEDS = { potatoes: 2, tomatoes: 2, wheat: 2, eggs: 1 };
// Expedition seed finds: a base chance on a success (lower on a failure) + a location's
// seedBonus; locations with henChance sometimes turn up a live hen instead of seeds.
export const EXPEDITION_SEED_CHANCE = 0.25;
export const EXPEDITION_SEED_CHANCE_FAILED = 0.08;
export const DISHES = [
  {
    id: "meat_stew", name: "Meat & Potato Stew", icon: "🍲", ingredients: { canned_meat: 1, potatoes: 2 }, food: 6,
    effect: { expeditionMaterials: 1.5 },
    desc: "A heavy, slow-burning meal for a long day of hauling salvage — expeditions bring back 50% more scrap today.",
  },
  {
    id: "fresh_bread", name: "Fresh-Baked Bread", icon: "🍞", ingredients: { wheat: 2, eggs: 1 }, food: 4,
    effect: { recruitChance: 2 },
    desc: "The smell drifts past the barricades and teams carry spare loaves to share — expeditions are twice as likely to find survivors today.",
  },
  {
    id: "firehouse_chili", name: "Firehouse Chili", icon: "🥘", ingredients: { canned_meat: 1, tomatoes: 1, spices: 1 }, food: 6,
    effect: { battleDamage: 1.25 },
    desc: "A fiery bowl before the watch that keeps everyone hot-blooded and wide awake — defenders deal 25% more damage in tonight's battle.",
  },
  {
    id: "scholars_breakfast", name: "Scholar's Breakfast", icon: "🍳", ingredients: { eggs: 1, wheat: 1, coffee: 1 }, food: 5,
    effect: { xp: 1.5 },
    desc: "Eggs on toast and a strong cup of coffee keep minds sharp all day — every action earns 50% more XP today.",
  },
];
// Pre-farm dish ids from older saves, for migrateState.
export const LEGACY_DISH_IDS = {
  scavenger_stew: "meat_stew", bbq_beacon: "fresh_bread", battle_chili: "firehouse_chili", brain_brownies: "scholars_breakfast",
};
export const EXPEDITION_INGREDIENT_CHANCE = 0.5; // + a location's ingredientBonus, on a success
export const EXPEDITION_INGREDIENT_CHANCE_FAILED = 0.15;

// Outside facilities, worked during Turn 2 instead of exploring. No teacher slots — just passive
// per-student daily yield, split out so each facility can scale/upgrade independently.
export const FARM_CAPACITY = 10;
export const SCRAPYARD_CAPACITY = 10;
export const LAB_CAPACITY = 10;
export const FARM_YIELD_FOOD = 3; // food per assigned student/day
export const SCRAPYARD_YIELD_MATERIALS = 3; // scrap per assigned student/day

// The scrap resource is stored under the `materials` key (older saves use it); this is the name
// players see.
export const RESOURCE_NAME = { food: "food", materials: "scrap", medicine: "medicine", research: "research" };
export const LAB_YIELD_RESEARCH = 2; // research per assigned student/day
// Ceiling for state.fortification. Raised from 60 to 300 alongside the deeper Research tree so
// the tier 3-5 fortification techs (which sum to well over the old cap) aren't dead purchases.
export const FORTIFICATION_CAP = 300;

// ===== Scouting =====
export const SCOUT_STAMINA_COST = 5;
// Chance of a zombie encounter while scouting a new tile, growing +10% per hex of distance from
// the school (10% right next door, 50% at the edge of the radius-5 map). More encounter types
// will be added later — this is the first.
export const SCOUT_ENCOUNTER_CHANCE_PER_HEX = 0.1;
export const SCOUT_ENCOUNTER_HP_LOSS = 50; // taken (never lethal) when a scout loses their fight

// ===== Room upgrades =====
// Scrap cost to go from a given upgrade level to the next; capped at ROOM_UPGRADE_MAX_LEVEL.
export const ROOM_UPGRADE_MAX_LEVEL = 3;
export const roomUpgradeCost = (level) => 15 * (level + 1);
// How much capacity one upgrade level adds, per room/slot type.
export const ROOM_UPGRADE_INCREMENT = {
  classroomStudent: CLASSROOM_SEATS_PER_ROW, // +1 row
  gymStudent: 5,
  gymTeacher: 1,
  cafeteriaTeacher: 1,
  loungeStudent: 5,
  loungeRecovery: 15,
  researchTeacher: 1,
  infirmaryStudent: 2,
  farmStudent: 5,
  farmPlot: 2,
  scrapyardStudent: 5,
  labStudent: 5,
};

export const BOND_COUPLE_THRESHOLD = 6;

// ===== Stamina =====
export const MAX_STAMINA = 100;
export const STAMINA_COST_GYM = 20; // students, per day trained
export const STAMINA_COST_EXPLORE = 20; // students, per expedition
export const STAMINA_COST_TEACH = 20; // teachers, per day assigned to a classroom
export const STAMINA_RECHARGE_CAFETERIA = 50; // per day a teacher spends cooking (how teachers recover)

// ===== Happiness =====
// A school-wide mood meter that reacts to wins/losses/recruits/deaths and, in turn, skews
// whether random events lean good or bad.
export const HAPPINESS_START = 50;
export const HAPPINESS_MIN = 0;
export const HAPPINESS_MAX = 100;
export const HAPPINESS_GAIN_WIN = 5; // won the night's main battle
export const HAPPINESS_GAIN_RECRUIT = 3; // accepted a new student/teacher
export const HAPPINESS_LOSS_MISSION_FAIL = 3; // a team's expedition failed
export const HAPPINESS_LOSS_DEATH = 8; // a character died

// ===== Night-phase follow-ups (Turn 3) =====
// Rolled once, in this order, only after a WON main battle (defense power >= wave strength) —
// at most one of the two can happen on a given night.
export const FACILITY_RAID_CHANCE = 0.1;
export const ASSAULT_CHANCE = 0.2;
export const RAIDABLE_FACILITIES = ["farm", "scrapyard", "lab"];
export const LEGENDARY_CHANCE = 0.15; // chance a won Assault turns up a legendary survivor

// ===== Random events =====
// Rolled once per day (at the Turn 3 -> Turn 1 rollover). `effect` is interpreted generically
// by applyEvent() in game.js so this file stays data-only.
export const EVENT_CHANCE = 0.25;
export const EVENTS = [
  { id: "donation", kind: "good", title: "A Generous Donation", desc: "A passing convoy leaves food and supplies at the gate.", effect: { food: 20, materials: 10 } },
  { id: "good_news", kind: "good", title: "Good News on the Radio", desc: "A broadcast says the military is pushing the horde back elsewhere. Spirits lift.", effect: { happiness: 12 } },
  { id: "wanderer", kind: "good", title: "A Wanderer Arrives", desc: "A survivor asks to join the school.", effect: { recruit: "student" } },
  { id: "medic", kind: "good", title: "A Medic Passes Through", desc: "A traveling medic shares supplies before moving on.", effect: { medicine: 15 } },
  { id: "research_breakthrough", kind: "good", title: "A Breakthrough", desc: "Notes left behind by a university team advance your research.", effect: { research: 10 } },
  { id: "gardener", kind: "good", title: "A Gardener's Gift", desc: "An old gardener trades a pouch of saved seeds for news from the city.", effect: { seeds: 4 } },
  { id: "stray_hen", kind: "good", title: "A Stray Hen", desc: "A hen wanders up to the gate, clucking. Someone builds her a coop.", effect: { seed: { eggs: 1 } } },
  { id: "blight", kind: "bad", title: "Crop Blight", desc: "Pests get into the farm overnight.", effect: { blight: true } },
  { id: "theft", kind: "bad", title: "Supplies Go Missing", desc: "Someone was careless — or someone stole from the stores overnight.", effect: { materials: -15 } },
  { id: "spoiled_food", kind: "bad", title: "Spoiled Rations", desc: "A batch of food spoils before anyone notices.", effect: { food: -15 } },
  { id: "bad_news", kind: "bad", title: "Bad News on the Radio", desc: "A broadcast describes a nearby town overrun. The school grows anxious.", effect: { happiness: -12 } },
  { id: "accident", kind: "bad", title: "An Accident", desc: "A careless moment during chores turns into a real injury.", effect: { injure: true } },
  { id: "sickness", kind: "bad", title: "A Sickness Spreads", desc: "Something is going around the dorms. One student doesn't pull through.", effect: { kill: true } },
];

// ===== Research tech tree =====
// Permanent buffs bought with banked research. Each node's `perk` holds numbers that stack
// across owned nodes and are read through techPerk() in game.js at the point in the game they
// affect (battle damage, expedition odds, XP, ...). Nodes in a branch unlock in order: each
// `requires` the one before it.
export const TECH_BRANCHES = [
  { id: "combat", name: "⚔ Night Watch", desc: "Hold the entrance." },
  { id: "scavenging", name: "🧭 Scavenging", desc: "Bring more home, lose fewer people." },
  { id: "school", name: "🏫 School Life", desc: "Grow faster, recover better." },
];
export const TECH_TREE = [
  // ⚔ Night Watch
  { id: "whetstones", branch: "combat", name: "Whetstones", icon: "🗡", cost: 15, requires: null, perk: { meleeDamage: 0.15 }, desc: "+15% melee damage in the night battle." },
  { id: "archery_club", branch: "combat", name: "Archery Club", icon: "🏹", cost: 30, requires: "whetstones", perk: { rangedRange: 1, rangedDamage: 0.1 }, desc: "Ranged weapons reach 1 square further and deal +10% damage." },
  { id: "fortified_works", branch: "combat", name: "Fortified Works", icon: "🧱", cost: 50, requires: "archery_club", perk: { wallHp: 0.5, gateHp: 0.5 }, desc: "Walls and the gate hold 50% more HP." },
  { id: "field_medics", branch: "combat", name: "Field Medics", icon: "⛑", cost: 75, requires: "fortified_works", perk: { stabilizeDiscount: 2, untreatedDeathReduction: 0.5 }, desc: "Saving a downed defender costs 3 medicine instead of 5, and without medicine their death chance is halved." },
  { id: "last_stand", branch: "combat", name: "Last Stand", icon: "🔥", cost: 110, requires: "field_medics", perk: { lastStand: 1 }, desc: "Defenders below 25% HP deal double damage." },
  // 🧭 Scavenging
  { id: "scouts_eye", branch: "scavenging", name: "Scout's Eye", icon: "👁", cost: 15, requires: null, perk: { expeditionSuccess: 0.1 }, desc: "Expeditions are 10% more likely to succeed." },
  { id: "deep_pockets", branch: "scavenging", name: "Deep Pockets", icon: "🎒", cost: 30, requires: "scouts_eye", perk: { expeditionLoot: 0.25 }, desc: "Expeditions bring back 25% more food, scrap and medicine." },
  { id: "treasure_hunters", branch: "scavenging", name: "Treasure Hunters", icon: "🗺", cost: 50, requires: "deep_pockets", perk: { itemChance: 0.2, ingredientChance: 0.2 }, desc: "+20% chance to find gear and cooking ingredients on every expedition." },
  { id: "word_of_mouth", branch: "scavenging", name: "Word of Mouth", icon: "🗣", cost: 75, requires: "treasure_hunters", perk: { recruitChance: 0.5 }, desc: "Expeditions are 50% more likely to find survivors who want to join." },
  { id: "ghost_walkers", branch: "scavenging", name: "Ghost Walkers", icon: "👣", cost: 110, requires: "word_of_mouth", perk: { casualtyReduction: 0.5, exploreStaminaReduction: 0.5 }, desc: "Expedition casualties are halved, and expeditions cost half the stamina." },
  // 🏫 School Life
  { id: "study_groups", branch: "school", name: "Study Groups", icon: "📚", cost: 15, requires: null, perk: { classXp: 0.25 }, desc: "Classes grant 25% more XP." },
  { id: "power_naps", branch: "school", name: "Power Naps", icon: "😴", cost: 30, requires: "study_groups", perk: { loungeRecovery: 20 }, desc: "Resting in the Lounge recovers 20 more stamina." },
  { id: "school_spirit", branch: "school", name: "School Spirit", icon: "🎉", cost: 50, requires: "power_naps", perk: { happinessLossReduction: 0.5 }, desc: "Happiness losses are halved." },
  { id: "home_economics", branch: "school", name: "Home Economics", icon: "🍳", cost: 75, requires: "school_spirit", perk: { extraDishesPerCook: 1 }, desc: "Each cook can serve two dishes a day instead of one." },
  { id: "honor_roll", branch: "school", name: "Honor Roll", icon: "🏅", cost: 110, requires: "home_economics", perk: { xp: 0.25 }, desc: "Every action earns 25% more XP." },
];

// ===== Exploration locations =====
export const LOCATIONS = [
  {
    id: "corner_store",
    name: "Corner Store",
    desc: "A small shop just down the street. Low risk, low reward.",
    difficulty: 1,
    danger: 1,
    rewards: { food: 12, materials: 4, medicine: 2 },
    ingredientBonus: 0.15,
    seedBonus: 0.1,
    hex: { q: 1, r: 0 }, // distance 1 — right next door
  },
  {
    id: "pharmacy",
    name: "Pharmacy",
    desc: "Shelves of medicine, if the shambling customers haven't gotten to it first.",
    difficulty: 2,
    danger: 2,
    rewards: { food: 2, materials: 2, medicine: 14 },
    hex: { q: 2, r: 0 }, // distance 2
  },
  {
    id: "supermarket",
    name: "Supermarket",
    desc: "Big box grocery store. Great food, but wide open and exposed.",
    difficulty: 3,
    danger: 3,
    rewards: { food: 28, materials: 6, medicine: 4 },
    ingredientBonus: 0.35,
    seedBonus: 0.15,
    hex: { q: 0, r: 3 }, // distance 3
  },
  {
    id: "hardware_store",
    name: "Hardware Store",
    desc: "Tools and lumber for fortifying the school.",
    difficulty: 3,
    danger: 2,
    rewards: { food: 2, materials: 24, medicine: 1 },
    lootBias: "weapon",
    seedBonus: 0.25, // the garden aisle
    hex: { q: -3, r: 1 }, // distance 3
  },
  {
    id: "hospital",
    name: "General Hospital",
    desc: "The mother lode of medicine, but also the mother lode of the infected.",
    difficulty: 5,
    danger: 5,
    rewards: { food: 4, materials: 8, medicine: 30 },
    lootBias: "armor",
    hex: { q: -2, r: -3 }, // distance 5 — clear across town
  },
  {
    id: "police_station",
    name: "Police Station",
    desc: "Weapons and armor behind a wall of undead officers.",
    difficulty: 5,
    danger: 5,
    rewards: { food: 2, materials: 30, medicine: 4 },
    lootBias: "weapon",
    hex: { q: 5, r: 0 }, // distance 5 — clear across town
  },
  {
    id: "mall",
    name: "Shopping Mall",
    desc: "Sprawling and dangerous, but rich with survivors to recruit.",
    difficulty: 4,
    danger: 4,
    rewards: { food: 14, materials: 10, medicine: 6 },
    recruitBonus: 2,
    lootBias: "accessory",
    hex: { q: 4, r: -1 }, // distance 4
  },
  {
    id: "neighborhood",
    name: "Suburban Neighborhood",
    desc: "House to house searching. Slow, but people sometimes hide here.",
    difficulty: 2,
    danger: 3,
    rewards: { food: 10, materials: 6, medicine: 4 },
    recruitBonus: 1.5,
    ingredientBonus: 0.15,
    seedBonus: 0.3, // backyard vegetable patches
    henChance: 0.15, // ...and backyard coops
    hex: { q: -1, r: -1 }, // distance 2
  },
];

// ===== Name pools =====
export const MALE_NAMES = [
  "James","John","Robert","Michael","David","Daniel","Matthew","Andrew","Joshua","Ryan",
  "Ethan","Noah","Lucas","Mason","Logan","Jack","Owen","Caleb","Dylan","Nathan",
];
export const FEMALE_NAMES = [
  "Mary","Emma","Olivia","Sophia","Isabella","Ava","Mia","Emily","Grace","Chloe",
  "Ella","Lily","Zoe","Hannah","Natalie","Victoria","Abigail","Samantha","Layla","Audrey",
];
export const LAST_NAMES = [
  "Smith","Johnson","Williams","Brown","Jones","Garcia","Miller","Davis","Rodriguez","Martinez",
  "Hernandez","Lopez","Gonzalez","Wilson","Anderson","Thomas","Taylor","Moore","Jackson","Martin",
  "Lee","Perez","Thompson","White","Harris","Sanchez","Clark","Ramirez","Lewis","Robinson",
];
