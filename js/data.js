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

// What each stat does in play, shown when hovering a stat on a character card. Every stat has a
// job in a fight and one outside it; the numbers live in STAT_TUNING below.
export const STAT_EFFECTS = {
  STR: "Fights: melee damage, and the strength to hold melee weapons. Also: part of max HP, how much food and scrap an expedition can carry home, and more food from the Farm and the Barn. Half of a team's power.",
  DEX: "Fights: ranged damage, hit chance, dodging hits, and the dexterity to hold ranged weapons. Also: most of max stamina, and stealth — fewer zombies while scouting and fewer ambushes on expeditions. More scrap from the Scrapyard. Half of a team's power.",
  CON: "Fights: less damage taken, and a better chance to survive going down. Also: most of max HP, faster healing overnight, and more medicine from the Greenhouse. A nurse with a high CON heals more in the Nurse's Office.",
  INT: "Fights: the defenders' smarts make traps hit harder and walls hold longer. Also: faster learning (more XP from everything) and better odds of finding gear on expeditions. For teachers, research.",
  WIS: "Fights: the most aware defender warns everyone, so the whole team takes less damage. Also: part of max stamina, keeps expedition teams safe, finds more loot, and plans better fortifications in the Crafting Room.",
  CHA: "Fights: the most charismatic defender leads — the whole team hits harder. Also: finding survivors and a daily lift to the school's mood. For teachers, recruiting.",
};

// The same, as a breakdown for the rooms' info dots: [what it does, where]. Keep in step with
// STAT_EFFECTS and STAT_TUNING.
export const STAT_GUIDE = {
  STR: [["Melee damage", "⚔ Fights"], ["Holding melee weapons", "🗡 Gear"], ["Max HP", "+0.4 a point"], ["Team power (with DEX)", "🧭 Expeditions"], ["Food & scrap carried home", "🧭 Expeditions"], ["Farm & Barn output", "+1 🌾 per 25"]],
  DEX: [["Ranged damage & hit chance", "⚔ Fights"], ["Dodging hits", "⚔ Fights"], ["Holding ranged weapons", "🏹 Gear"], ["Max stamina", "+1.2 a point"], ["Stealth — fewer zombies & ambushes", "🧭 Scouting"], ["Team power (with STR)", "🧭 Expeditions"], ["Scrapyard output", "+1 🔩 per 25"]],
  CON: [["Less damage taken", "⚔ Fights"], ["Surviving going down", "⚔ Fights"], ["Max HP", "+0.8 a point"], ["Healing overnight", "🌙 Every night"], ["Fewer casualties", "🧭 Expeditions"], ["Greenhouse medicine", "+1 💊 per 25"], ["A nurse heals more", "🏥 Teachers"]],
  INT: [["Traps hit harder, walls hold longer", "⚔ Fights"], ["XP from everything", "+40% at 100"], ["Finding gear", "🧭 Expeditions"], ["Research", "🧠 Research Room"]],
  WIS: [["Whole team takes less damage", "⚔ Best in squad"], ["Max stamina", "+0.8 a point"], ["Keeping the team safe", "🧭 Expeditions"], ["More loot", "🧭 Expeditions"], ["Planning fortifications", "+1 🛡 per 25"]],
  CHA: [["Whole team hits harder", "⚔ Best in squad"], ["Finding survivors", "🧭 Expeditions"], ["Recruit chance", "📻 Radio Station"], ["School mood each morning", "😊 Best student"]],
};

// How much each stat point is worth. "best" = the squad's highest, "avg" = its average.
export const STAT_TUNING = {
  hpBase: 40,
  hpPerCon: 0.8, // max HP = 40 + CON × 0.8 + STR × 0.4 (+ Gym training)
  hpPerStr: 0.4,
  staminaPerDex: 1.2, // max stamina = DEX × 1.2 + WIS × 0.8 (+ Gym training): ~65 for a typical new
  staminaPerWis: 0.8, // student, 200 with both maxed
  staminaMin: 10,
  carryPerStr: 1 / 250, // expedition food & scrap × (0.8 + avg STR / 250): ×1.0 at 50, ×1.2 at 100
  yieldStatStep: 25, // +1 Farm food / Scrapyard scrap / Greenhouse medicine per worker for every 25 STR / DEX / CON (SITE_STAT)
  dodgePerDex: 1 / 500, // chance to dodge a hit: up to 20% at 100 DEX
  stealthPerDex: 1 / 250, // scouting encounter chance × (1 − DEX / 250): −40% at 100
  expeditionStealthPerDex: 1 / 400, // expedition casualties × (1 − avg DEX / 400): −25% at 100
  recoveryBase: 0.1, // overnight healing = 10% + CON / 500 of max HP (30% at 100)
  recoveryPerCon: 1 / 500,
  staminaRecoveryFlat: 5, // overnight stamina when fed = 5 + 10% of max (resting at the nurse's is the real refill)
  staminaRecoveryShare: 0.1,
  xpPerInt: 1 / 250, // all XP × (1 + INT / 250): +40% at 100
  trapPerInt: 1 / 150, // trap damage × (1 + avg INT / 150)
  wallPerInt: 1 / 300, // wall HP × (1 + avg INT / 300)
  itemChancePerInt: 1 / 400, // expedition gear chance + avg INT / 400: +25% at 100
  awarenessPerWis: 1 / 700, // whole squad takes (best WIS / 700) less damage, capped below
  awarenessCap: 0.15,
  leadershipPerCha: 1 / 800, // whole squad hits (best CHA / 800) harder: +12.5% at 100
  moralePerCha: 50, // each morning: +1 happiness per 50 CHA of the school's most charismatic student
};

// Every skill learned on a subject's path stacks this bonus (see skillBonus() in game.js).
export const SKILL_EFFECTS = {
  PE: { per: 0.08, what: "melee damage" },
  Gymnastics: { per: 0.03, what: "chance to dodge" },
  Biology: { per: 0.05, what: "less damage taken" },
  Physics: { per: 0.05, what: "XP from everything" },
  History: { per: 0.08, what: "expedition loot" },
  SocialStudies: { per: 0.1, what: "chance to find survivors" },
};

// Letter-grade tiers a numeric grade (0-100) falls into. F is the default/most common, S the
// rarest and best. F runs to 25, then every letter is 15 wide; contiguous over the full 0-100.
export const GRADE_TIERS = ["F", "D", "C", "B", "A", "S"];
export const GRADE_RANGES = {
  F: [0, 25],
  D: [26, 40],
  C: [41, 55],
  B: [56, 70],
  A: [71, 85],
  S: [86, 100],
};

// Spawn-roll weights for students, parallel to GRADE_TIERS (F..S): a new student is mostly F and D
// with some C — B and up only through a talent (which bumps its subject a tier). That's ~33 a
// stat on average, ~52 in their best, ~80 HP and ~65 stamina: weak at first, grown in class.
export const STUDENT_TIER_WEIGHTS = [40, 45, 15, 0, 0, 0];

// Teachers are generated completely differently from students: they roll ONE specialty subject
// at A rank (only legendary teachers reach S), and their other five subjects are randomized among
// these tiers only (never below D) — always at least one rank under the specialty.
export const TEACHER_SECONDARY_TIERS = ["D", "C", "B"];
export const TEACHER_SECONDARY_WEIGHTS = [50, 33, 17];

// How much a teacher's grade in a subject boosts that subject for every student in the room
// while teaching it — keyed by the teacher's letter grade in that subject.
export const TEACH_BONUS_BY_TIER = { S: 10, A: 7, B: 5, C: 3, D: 1, F: 0 }; // grade points a day, per teacher

// Teachers stay at the school full-time (no exploring/defending) and are capped and rarer.
export const TEACHER_RECRUIT_CHANCE = 0.12; // share of recruited survivors who turn out to be teachers

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
// The grid the player builds and fights on at the Main Entrance: ENTRANCE_GRID_SIZE columns — the
// lanes the horde walks up — and rows top to bottom in three zones: where students stand (the three
// front steps and the two rows of lawn), the pavement where walls and traps go, and the road the
// horde comes up from (traps can go there too). (state.entranceGrid.size is the column count.)
export const ENTRANCE_GRID_SIZE = 6;
export const ENTRANCE_ZONES = { students: 5, defenses: 1, street: 1 };
export const ENTRANCE_ROWS = ENTRANCE_ZONES.students + ENTRANCE_ZONES.defenses + ENTRANCE_ZONES.street;
// The row each zone starts on.
export const DEFENSE_ROW0 = ENTRANCE_ZONES.students;
export const STREET_ROW0 = ENTRANCE_ZONES.students + ENTRANCE_ZONES.defenses;

// `blocks` structures stop zombies until smashed (hp); destroyed ones are gone after the battle,
// damaged ones are patched back up. `enterDamage` hits a zombie stepping onto the cell;
// `slows` holds it there an extra tick.
export const DEFENSE_STRUCTURES = [
  { id: "sandbag_wall", name: "Sandbag Wall", icon: "🧱", cost: { materials: 15 }, blocks: true, hp: 80, desc: "Blocks a lane until the horde smashes through (80 HP)." },
  { id: "razor_wire", name: "Razor Wire", icon: "🔗", cost: { materials: 20 }, enterDamage: 6, slows: true, desc: "Cuts for 6 and snags zombies in place for an extra turn." },
  // upgrades, unlocked by research (`tech`): they replace the kind they upgrade, built ones too
  { id: "concrete_barricade", name: "Concrete Barricade", icon: "🚧", cost: { materials: 15 }, blocks: true, hp: 160, upgradeOf: "sandbag_wall", tech: "concrete_barricades", desc: "Blocks a lane and takes twice a sandbag wall's beating (160 HP)." },
  { id: "electric_fence", name: "Electric Fence", icon: "⚡", cost: { materials: 20 }, enterDamage: 18, slows: true, upgradeOf: "razor_wire", tech: "electric_fence", desc: "Shocks for 18 and holds zombies in place for an extra turn." },
];
// Defenses from before the upgrades existed, and what they became.
export const LEGACY_DEFENSE_IDS = { barricade: "sandbag_wall", spike_trap: "razor_wire" };

// ===== Night battle tuning =====
export const ZOMBIE_HIT_CHANCE = 0.65;
export const FIST_WEAPON = { name: "Fists", icon: "👊", damage: 4, range: 1, category: "melee" };
// A night goes on until every zombie is put down or gets in; this many turns of one wave only breaks a
// stalemate (nobody left who can hurt them) — whatever's still out there then walks in.
export const BATTLE_MAX_TICKS = 200;
export const DOWNED_DEATH_CHANCE = 0.2; // before the Biology modifier, when there's no medicine to spare
export const MEDICINE_PER_STABILIZE = 5; // spent automatically to save a downed defender outright
// Raised alongside the stat rework (dodging, leadership, awareness, smarter traps) to keep an
// engaged player at roughly a 90% survival rate over 30 days — re-run the balance harness if changed.
export function zombieCountForDay(day) {
  return 3 + Math.floor(day * 0.8);
}
export function zombieStatsForDay(day) {
  return { hp: 22 + Math.round(day * 1.4), damage: 5 + Math.floor(day / 2) };
}

// Multipliers are applied to zombieStatsForDay. `speed` = rows moved per turn, `wallMult` scales
// damage to walls, `spitRange` lets it attack a defender from that many squares away instead of
// closing in, `unsnaggable` ignores razor wire.
// How each fights back: `meleeEvade` (a share of melee blows it slips), `rangedMult` (how much
// ranged hits hurt it: under 1 armoured, over 1 a weak spot), `heavy` (winds up smashes — see
// ZOMBIE_SMASH), `enrages` (the boss's second phase).
export const ZOMBIE_TYPES = {
  walker: { name: "Walker", badge: "", hpMult: 1, dmgMult: 1, from: 1, desc: "Slow and relentless." },
  runner: { name: "Runner", badge: "💨", hpMult: 0.6, dmgMult: 0.8, speed: 2, meleeEvade: 0.3, from: 4, desc: "Covers two rows a turn and slips 30% of melee blows — shoot it." },
  brute: { name: "Brute", badge: "💪", hpMult: 2, dmgMult: 1.5, wallMult: 2, rangedMult: 0.6, heavy: true, from: 7, desc: "Armoured: ranged hits do 40% less — get up close. Winds up heavy smashes and breaks walls fast." },
  spitter: { name: "Spitter", badge: "🤮", hpMult: 0.8, dmgMult: 0.7, spitRange: 3, rangedMult: 1.5, from: 10, desc: "Spits acid up to 3 squares away as it comes, but ranged hits do 50% more." },
  screamer: { name: "Screamer", badge: "📢", hpMult: 0.7, dmgMult: 0.5, howl: { range: 2, mult: 1.3 }, from: 13, desc: "Its howl makes every zombie within 2 squares hit 30% harder — take it down first." },
  boss: { name: "Boss", badge: "👑", hpMult: 5, dmgMult: 2, wallMult: 3, unsnaggable: true, rangedMult: 0.8, heavy: true, enrages: true, from: 5, desc: "Leads the horde every 5th night. Winds up smashes; at half health goes berserk and calls for help." },
};
// A heavy zombie next to a defender may wind up (`chance` a turn): the square is marked, and next
// turn it smashes for `mult`× — unless an ability, a crit, a knockback or fire breaks it first.
// The boss at half health: `enrageDmg`× damage, and `summons` walkers at the back.
export const ZOMBIE_SMASH = { chance: 0.5, mult: 2.5, enrageDmg: 1.5, summons: 2 };

// ===== The Night Watch, fought live =====
// The horde comes in waves (1 up to 6 zombies, 2 up to 14, 3 beyond), with a break between them
// to move defenders. Night actions can be used any time during the fight, each for `morale`.
export const NIGHT_ACTIONS = {
  molotov: { name: "Molotov", icon: "🔥", morale: 40, target: "square", desc: "Sets a 3x3 patch alight — every zombie on it burns" },
  patch: { name: "Patch Up", icon: "🩹", morale: 25, target: "defender", desc: "Heals a defender by half their HP" },
  rally: { name: "Rally", icon: "🔔", morale: 50, target: null, desc: "Everyone hits 50% harder for 3 turns" },
};
export const MOLOTOV_DAMAGE = 0.8; // of a walker's HP tonight
// A defender's critical hit: `mult`× damage, `base` chance plus `perDex` for every DEX point.
export const BATTLE_CRIT = { base: 0.05, perDex: 0.001, mult: 2 };
// ===== The Night Watch's classes =====
// A defender's class is their ★ favourite subject. Each has one job, and its numbers grow with that stat
// (0–100): `range` is "front" (the square in front, towards the street), "lane" (anything further
// down their lane) or none, listed in the stats' order (STR … CHA). Their second ability (`ability2`)
// comes with learning the third talent on that subject's path (its B node: NIGHT_ABILITY2_SKILLS), their
// third (`ability3`) with the fifth (S).
export const NIGHT_CLASSES = {
  brawler: { subject: "PE", name: "Brawler", icon: "💪", range: "front", weapon: "melee", desc: "Hits the zombie in front of them with their melee weapon",
    ability2: { name: "Cleave", desc: "Also hits the zombies either side of their target" },
    ability3: { name: "Lunge", reach: 2, desc: "Hits the nearest zombie up to 2 squares in front" } },
  shooter: { subject: "Gymnastics", name: "Shooter", icon: "🏹", range: "lane", weapon: "ranged", desc: "Fires down the lane at the nearest zombie",
    ability2: { name: "Quick Draw", chance: 0.5, desc: "50% chance to fire twice a turn" },
    ability3: { name: "Double Shot", desc: "Always fires twice a turn" } },
  tank: { subject: "Biology", name: "Tank", icon: "🛡", range: "front", weapon: "melee", hpMult: 1.5, dmgMult: 0.5, desc: "+50% HP to hold the lane, and a weak hit on the square in front",
    ability2: { name: "Second Wind", revive: 0.5, desc: "Once a night, gets back up at 50% HP" },
    ability3: { name: "Colossus", hpBonus: 0.5, desc: "Another +50% HP: double in all" } },
  trapper: { subject: "Physics", name: "Trapper", icon: "🕸", range: "lane", weapon: "ranged", dmgMult: 0.5, slowTurns: 3, desc: "Fires down the lane for half a shot's damage and slows its target to half speed",
    ability2: { name: "Repair", repair: 0.1, desc: "Patches the wall in their lane by 10% a turn" },
    ability3: { name: "Wide Net", chance: 0.2, turns: 2, desc: "20% chance a hit nets every zombie in their lane for 2 turns" } },
  medic: { subject: "History", name: "Medic", icon: "🩹", range: "around", heal: 0.05, healPerGrade: 1 / 2000, desc: "Heals the most hurt student next to them every turn — only shoves a zombie right in front with their fists",
    ability2: { name: "Long Reach", reach: 2, desc: "Heals anyone up to 2 squares away" },
    ability3: { name: "Field Surgeon", desc: "Also heals anyone in their lane" } },
  rallier: { subject: "SocialStudies", name: "Rallier", icon: "📣", morale: 5, every: 2, desc: "Makes 5 morale every 2 turns — only shoves a zombie right in front with their fists",
    ability2: { name: "Rally Cry", buff: 0.2, hp: 0.2, desc: "Students in their lane deal 20% more damage and have 20% more HP" },
    ability3: { name: "Inspire", moraleMult: 2, desc: "Makes double morale" } },
};
export const NIGHT_ABILITY2_SKILLS = 3; // talents learned on the class's subject's path (D, C, then B)
export const NIGHT_ABILITY3_SKILLS = 5; // … and all five (A, then S: only a ★ favourite gets there)
// Morale, the night's currency: you start with the school's Morale, earn `perKill` for every
// zombie put down (and whatever Ralliers make), and spend `post` on every student you post.
// At dawn the school gains `perStar` Morale for each of the night's three stars.
export const NIGHT_MORALE = { post: 10, perKill: 5, perStar: 1 };
// What a Shooter or Trapper with no ranged weapon throws.
export const THROWN_ROCKS = { name: "Rocks", icon: "🪨", damage: 3, category: "ranged" };
// Zombies take a row every `walkEvery` turns (Runners every turn); a slowed one twice as long.
export const ZOMBIE_WALK_EVERY = 2;
// Tonight's weather: rolled at random each night (always clear on the first), by `weight`. Each
// kind of bad weather holds back one class (NIGHT_CLASSES, `role`): their damage (`dmg`) or a
// Medic's healing (`mend`).
export const NIGHT_CONDITIONS = {
  clear: { id: "clear", name: "Clear", icon: "🌙", weight: 70, desc: "Nothing out of the ordinary" },
  rain: { id: "rain", name: "Rain", icon: "🌧️", weight: 10, role: "brawler", dmg: 0.8, desc: "Brawlers deal 20% less damage" },
  fog: { id: "fog", name: "Fog", icon: "🌫️", weight: 10, role: "shooter", dmg: 0.8, desc: "Shooters deal 20% less damage" },
  snow: { id: "snow", name: "Snow", icon: "❄️", weight: 10, role: "medic", mend: 0.8, desc: "Medics heal 20% less" },
};
// Three stars for a perfect night: nobody got in, nobody went down, every zombie put down.
export const NIGHT_STAR_REWARD = { materials: 10 };

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
  const screamer = day >= ZOMBIE_TYPES.screamer.from ? Math.max(1, Math.floor(count * 0.08)) : 0;
  return { walker: count - runner - brute - spitter - screamer, runner, brute, spitter, screamer, boss: isBossNight(day) ? 1 : 0 };
}

// ===== The Radio Station and the rescue (the run's goal) =====
// The Radio Station (Floor 3) levels up like the other rooms, one upgrade per level: level 1 is the
// antenna, powered as soon as the room is cleared; levels 2-4 widen the range; level 5 is
// satellite communications, which reach the military — a helicopter lands RESCUE_ARRIVAL_DAYS
// later. Sent away, it comes back RESCUE_DELAY_DAYS later. Every day there's a chance a survivor
// hears the broadcast and asks to join: the level's base chance, plus each teacher posted there
// and each student on the air today adding their CHA / RADIO_CHA_PER_PERCENT percent.
export const RADIO_UPGRADES = [
  { id: "power", name: "Power the antenna", icon: "⚡", cost: null, desc: "On the air as soon as the room is cleared.", baseChance: 0.05 },
  { id: "range1", name: "Increase range I", icon: "📶", cost: { materials: 40 }, desc: "Reach further across the city.", baseChance: 0.07 },
  { id: "range2", name: "Increase range II", icon: "📶", cost: { materials: 40, research: 15 }, desc: "Reach the suburbs.", baseChance: 0.09 },
  { id: "range3", name: "Increase range III", icon: "📶", cost: { materials: 50, research: 25 }, desc: "Reach the whole region.", baseChance: 0.11 },
  { id: "satellite", name: "Satellite communications", icon: "🛰", cost: { materials: 60, research: 40 }, desc: "Reach the military — a helicopter comes to save the school.", baseChance: 0.11 },
];
export const RADIO_CHA_PER_PERCENT = 20; // CHA 100 on the air adds +5% a day

// ===== Student levels =====
// A student's level (1 to STUDENT_MAX_LEVEL) comes from experience earned doing things — not from
// their grades. Reaching the top level is what lets them be promoted to teacher. It takes
// xpToNextLevel(level) XP to go up a level (40, 60, 80 … 200: about 1,100 in all).
export const STUDENT_MAX_LEVEL = 10;
export const xpToNextLevel = (level) => 20 + 20 * level;
export const LEVEL_XP = {
  class: 10, // studying in a classroom that's teaching
  training: 10, // a Gymnasium / Acrobatics session
  work: 8, // the Farm, Scrapyard, Radio Station, Research Room or Crafting Room
  scout: 10, // scouting a hex
  expedition: 15, // going on an expedition
  expeditionWin: 10, // … and coming back successful
  defend: 15, // defending the entrance at night (or a facility raid)
  roomFight: 25, // clearing a boarded-up room
  nest: 25, // burning out a zombie nest
  raid: 40, // a landmark raid or chasing down the horde's leader
};
// A student helping in the Research Room adds their INT to the pool; one in the Crafting Room adds
// a point of fortification a day for every CRAFT_HELP_WIS_PER_POINT WIS (History: they've read up
// on castle defences).
export const CRAFT_HELP_WIS_PER_POINT = 25;
// The stat a work site's workers bring in more with: the Farm is heavy labour (STR), the
// Scrapyard's salvage and benches are handwork (DEX), the Greenhouse's herbs need a biologist (CON).
export const SITE_STAT = { farm: "PE", barn: "PE", scrapyard: "Gymnastics", greenhouse: "Biology" };
export const RESCUE_ARRIVAL_DAYS = 3;
export const RESCUE_DELAY_DAYS = 5;

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
    { tier: "B", name: "Juggernaut", desc: "Shrugs off hits others wouldn't. Night Watch: Brawlers cleave." },
    { tier: "A", name: "Warlord", desc: "Leads the charge on dangerous runs." },
    { tier: "S", name: "Titan", desc: "A one-person wrecking crew. Night Watch: Brawlers hit 2 squares deep." },
  ],
  Gymnastics: [
    { tier: "D", name: "Quick Step", desc: "Dodges the first swing." },
    { tier: "C", name: "Light Foot", desc: "Moves through danger almost unseen." },
    { tier: "B", name: "Acrobat", desc: "Turns tight spots into escape routes. Night Watch: Shooters may fire twice." },
    { tier: "A", name: "Ghost", desc: "Rarely where the horde expects." },
    { tier: "S", name: "Untouchable", desc: "The horde can't lay a hand on them. Night Watch: Shooters always fire twice." },
  ],
  Biology: [
    { tier: "D", name: "Tough Skin", desc: "Shrugs off minor scrapes." },
    { tier: "C", name: "Iron Stomach", desc: "Recovers faster from rough days." },
    { tier: "B", name: "Survivor", desc: "Walks away from what should've hurt. Night Watch: Tanks get a second wind." },
    { tier: "A", name: "Unbreakable", desc: "Bites and scratches barely slow them down." },
    { tier: "S", name: "Immune", desc: "The horde's bite is the least of their worries. Night Watch: Tanks get another +50% HP." },
  ],
  Physics: [
    { tier: "D", name: "Quick Thinker", desc: "Spots the danger a beat sooner." },
    { tier: "C", name: "Tactician", desc: "Plans a safer route through trouble." },
    { tier: "B", name: "Analyst", desc: "Reads a room before it turns deadly. Night Watch: Trappers repair walls." },
    { tier: "A", name: "Strategist", desc: "Keeps the whole team a step ahead." },
    { tier: "S", name: "Mastermind", desc: "Turns any expedition into a calculated win. Night Watch: Trappers may net the whole lane." },
  ],
  History: [
    { tier: "D", name: "Keen Eye", desc: "Spots loot others would walk past." },
    { tier: "C", name: "Scavenger", desc: "Knows where the good stuff hides." },
    { tier: "B", name: "Appraiser", desc: "Never leaves the valuable stuff behind. Night Watch: Medics heal 2 squares away." },
    { tier: "A", name: "Treasure Hunter", desc: "Finds more than anyone expects." },
    { tier: "S", name: "Archivist", desc: "Nothing worth taking gets missed. Night Watch: Medics heal their whole lane." },
  ],
  SocialStudies: [
    { tier: "D", name: "Friendly Face", desc: "Puts strangers at ease." },
    { tier: "C", name: "People Person", desc: "Talks their way past trouble." },
    { tier: "B", name: "Persuader", desc: "Convinces survivors the school is safe. Night Watch: Ralliers rally their lane." },
    { tier: "A", name: "Natural Leader", desc: "Others want to follow them home." },
    { tier: "S", name: "Icon", desc: "Word of them spreads through the whole city. Night Watch: Ralliers make double morale." },
  ],
};

// Floor 2 has 4 generic classroom rooms. Each starts unassigned ("Classroom 1" etc.) and takes
// on a subject — one of these four "sit-down" subjects; PE/Gymnastics only happen in the Gymnasium and Acrobatics —
// the moment its one teacher is assigned. It reverts to unassigned once that teacher leaves.
export const CLASSROOM_SUBJECTS = ["Biology", "Physics", "History", "SocialStudies"];
export const CLASSROOM_IDS = ["1", "2", "3", "4"];

// A new game opens with part of the school still overrun: these rooms (keyed like teacher posts)
// start boarded up, so there are fewer jobs than teachers early on. Clearing one means fighting
// the zombies still inside (see fightForRoom() in game.js) and then spending the scrap to board up
// the broken windows behind them. `look` picks the zombie sprite (zombies.js).
export const BOARDED_ROOMS = {
  "classroom:2": { name: "Classroom 2", cost: 10, zombies: [{ type: "walker", look: "walker" }, { type: "walker", look: "walker" }] },
  "classroom:3": { name: "Classroom 3", cost: 20, zombies: [{ type: "walker", look: "walker" }, { type: "walker", look: "walker" }, { type: "walker", look: "jersey" }] },
  "classroom:4": { name: "Classroom 4", cost: 30, zombies: [{ type: "walker", look: "walker" }, { type: "runner", look: "walker" }, { type: "walker", look: "jersey" }, { type: "walker", look: "walker" }] },
  research: { name: "Research Room", cost: 25, zombies: [{ type: "walker", look: "labcoat" }, { type: "walker", look: "labcoat" }] },
  crafting: { name: "Crafting Room", cost: 20, zombies: [{ type: "walker", look: "walker" }, { type: "brute", look: "soldier" }] },
  radio: { name: "Radio Station", cost: 20, zombies: [{ type: "walker", look: "jersey" }, { type: "runner", look: "walker" }, { type: "walker", look: "jersey" }] },
};
export const ROOM_ZOMBIE = { hp: 24, damage: 5 }; // before ZOMBIE_TYPES multipliers
export const ROOM_FIGHT_SQUAD = 4; // students per room-clearing squad
export const ROOM_FIGHT_STAMINA = 10; // each
export const ROOM_FIGHT_MAX_ROUNDS = 10;

// ===== Objectives =====
// A short chain of goals that doubles as the tutorial. Only the first unfinished one is active;
// finishing it pays its reward and moves on. Their checks live in OBJECTIVE_CHECKS in game.js.
export const OBJECTIVES = [
  { id: "clear_research", title: "Take back the Research Room", hint: "Gather 25 scrap — work the Scrapyard in the afternoon or bring some home from an expedition — then clear the zombies out of the Research Room on Floor 3.", reward: { research: 10 } },
  { id: "staff_research", title: "Put a scientist to work", hint: "Post a teacher in the Research Room. Their INT turns into research every day — you'll need it for the rescue antenna.", reward: { materials: 10 } },
  { id: "first_expedition", title: "Head out into the city", hint: "In the afternoon, scout the fog around the school and send a team to a location you find.", reward: { food: 15 } },
  { id: "first_tech", title: "Put the research to use", hint: "Buy your first project in the Research tab.", reward: { medicine: 10 } },
  { id: "second_classroom", title: "Make room for more students", hint: "Clear out a second classroom on Floor 2.", reward: { materials: 15 } },
  { id: "survive_week", title: "Hold out for a week", hint: "Keep the school standing until day 7.", reward: { materials: 20, food: 20 } },
];

// Seats come in desks of two, shown four desks to a row: level 1 is one full row,
// and each level adds a desk — 8, 10, 12, 14, 16.
export const CLASSROOM_CAPACITY = 8;
export const CLASSROOM_SEATS_PER_LEVEL = 2;
export const CLASSROOM_MAX_TEACHERS = 1; // at level 1; an assistant joins at room level 5, teaching the same subject

// Two training rooms, taught like the classrooms: the Gymnasium raises STR (PE) and Acrobatics
// DEX (Gymnastics) by the room's level bonus + each teacher's bonus a session, up to the best
// teacher's own grade, or NO_TEACHER_CAP with no teacher (see gymLesson). STR and DEX in turn raise max HP and max stamina.
// Students train in c.gymToday = "PE" | "Gymnastics"; teachers are posted to "gym:PE" / "gym:Gymnastics".
export const GYM_CAPACITY = 4; // student slots per room at level 1
export const GYM_MAX_TEACHERS = 1; // teacher slots at level 1
export const GYM_SIDES = {
  // `ref` is how a sentence names the room ("training in the Gymnasium", "training in Acrobatics").
  PE: { label: "PE", icon: "💪", gains: "STR", also: "max HP", room: "Gymnasium", ref: "the Gymnasium", roomKey: "gym" },
  Gymnastics: { label: "Gymnastics", icon: "🤸", gains: "DEX", also: "max stamina", room: "Acrobatics", ref: "Acrobatics", roomKey: "acrobatics" },
};

export const CAFETERIA_MAX_TEACHERS = 1; // cook slots at level 1 — each cook makes one dish a day
// The Cafeteria is also where students rest: each resting student gets stamina back, more as the
// room levels up.
export const CAFETERIA_CAPACITY = 4; // resting seats at level 1
export const CAFETERIA_REST_BY_LEVEL = [20, 35, 50, 65, 80]; // stamina a resting student gets back, by room level

// Research Room: teachers turn their combined INT (Physics grade) into research points each day.
export const RESEARCH_ROOM_TEACHERS = 1;
export const RESEARCH_ROOM_INT_PER_POINT = 10;

// Nurse's Office: nurses (teachers) and a few beds for healing and quarantine. Each patient is
// healed a flat amount of HP (growing with the room's level), plus INFIRMARY_NURSE_HP_PER_RANK for
// every rank of each nurse's CON grade, for some medicine — with none to spare, only bed rest.
// Resting for stamina happens in the Cafeteria (CAFETERIA_REST_BY_LEVEL).
export const INFIRMARY_CAPACITY = 4;
export const INFIRMARY_MAX_TEACHERS = 1;
export const INFIRMARY_MEDICINE_PER_PATIENT = 3;
export const INFIRMARY_HEAL_BY_LEVEL = [20, 40, 60, 80, 100]; // HP healed, by room level
export const INFIRMARY_NURSE_HP_PER_RANK = 5; // per nurse: F +0 · D +5 · C +10 · B +15 · A +20 · S +25
export const INFIRMARY_BED_REST = 10; // HP, when there's no medicine to spare

// ===== Cooking =====
// Staple crops come from the Farm's fields, animal products from its pens, and three extras only turn up
// on expeditions. Cooks turn them (plus some food to feed everyone) into a dish whose buff covers
// the whole school until the day ends. `effect` multipliers are read through dishMultiplier() in
// game.js.
export const INGREDIENTS = {
  potatoes: { name: "Potatoes", icon: "🥔", source: "farm" },
  tomatoes: { name: "Tomatoes", icon: "🍅", source: "farm" },
  wheat: { name: "Wheat Flour", icon: "🌾", source: "farm" },
  eggs: { name: "Eggs", icon: "🥚", source: "ranch" },
  milk: { name: "Milk", icon: "🥛", source: "ranch" },
  mutton: { name: "Mutton", icon: "🍖", source: "ranch" },
  canned_meat: { name: "Canned Meat", icon: "🥫", source: "scavenged" },
  spices: { name: "Chili Spices", icon: "🌶️", source: "scavenged" },
  coffee: { name: "Coffee", icon: "☕", source: "scavenged" },
};
export const SCAVENGED_INGREDIENTS = Object.keys(INGREDIENTS).filter((id) => INGREDIENTS[id].source === "scavenged");
export const STARTING_PANTRY = {
  potatoes: 2, tomatoes: 2, wheat: 2, eggs: 2, milk: 1, mutton: 1, canned_meat: 1, spices: 1, coffee: 1,
};

// ===== Farm fields & pens =====
// The Farm has a field for each crop and a pen for each animal (the Ranch was folded into it —
// `facility: "ranch"` means the pens), each with a few slots. Each slot holds one crop or animal
// from the stock of seeds and livestock, and grows a day at a time on its own. After `growDays`
// days it's ready, and waits for a Farm worker to collect `yield` of its `product` into the
// pantry. Crops and sheep are used up by that (a crop is
// harvested, a sheep butchered) with a `keepChance` of getting one back — a saved seed, a lamb —
// and the plot replants itself while stock lasts. Chickens and cows are `perennial`: they keep
// producing for as long as you keep them.
export const PRODUCERS = {
  potatoes: {
    facility: "farm", name: "Potatoes", icon: "🥔", product: "potatoes", growDays: 3, yield: 4,
    stockName: "Seed Potatoes", stockPlural: "Seed Potatoes", stockIcon: "🌱", keepChance: 0.5, keepNote: "a seed saved",
  },
  tomatoes: {
    facility: "farm", name: "Tomatoes", icon: "🍅", product: "tomatoes", growDays: 2, yield: 3,
    stockName: "Tomato Seeds", stockPlural: "Tomato Seeds", stockIcon: "🌱", keepChance: 0.5, keepNote: "a seed saved",
  },
  wheat: {
    facility: "farm", name: "Wheat", icon: "🌾", product: "wheat", growDays: 3, yield: 4,
    stockName: "Wheat Seeds", stockPlural: "Wheat Seeds", stockIcon: "🌱", keepChance: 0.5, keepNote: "a seed saved",
  },
  peppers: {
    facility: "farm", name: "Chili Peppers", icon: "🌶️", product: "spices", growDays: 3, yield: 2,
    stockName: "Chili Seeds", stockPlural: "Chili Seeds", stockIcon: "🌱", keepChance: 0.5, keepNote: "a seed saved",
  },
  chicken: {
    facility: "ranch", name: "Chickens", icon: "🐔", product: "eggs", growDays: 1, yield: 1, perennial: true,
    stockName: "Chicken", stockPlural: "Chickens", stockIcon: "🐔",
  },
  cow: {
    facility: "ranch", name: "Dairy Cow", icon: "🐄", product: "milk", growDays: 2, yield: 3, perennial: true,
    stockName: "Cow", stockPlural: "Cows", stockIcon: "🐄",
  },
  sheep: {
    facility: "ranch", name: "Sheep", icon: "🐑", product: "mutton", growDays: 4, yield: 4,
    stockName: "Sheep", stockPlural: "Sheep", stockIcon: "🐑", keepChance: 0.5, keepNote: "a lamb was born",
  },
  goat: {
    facility: "ranch", name: "Goats", icon: "🐐", product: "milk", growDays: 2, yield: 2, perennial: true,
    stockName: "Goat", stockPlural: "Goats", stockIcon: "🐐",
  },
};
export const FARM_CROPS = Object.keys(PRODUCERS).filter((id) => PRODUCERS[id].facility === "farm");
export const RANCH_ANIMALS = Object.keys(PRODUCERS).filter((id) => PRODUCERS[id].facility === "ranch");
// The Farm's six groups, top to bottom on each side of its page: a field for each crop on the
// left, a pen for each animal on the right. Every group has the same number of slots, by level.
export const FARM_GROUPS = { fields: ["wheat", "potatoes", "tomatoes", "peppers"], animals: ["chicken", "sheep", "cow", "goat"] };
export const FARM_SLOTS_BY_LEVEL = [1, 2, 3, 4]; // the Farm has 4 levels: each opens a slot in every group
export const FACILITY_PLOTS = { farm: 1, ranch: 1 }; // fields and pens at level 1 in older saves
export const PLOTS_PER_WORKER = 2; // ready slots one Farm worker harvests a day
// Crops grow and animals come round by themselves, a day at a time; once a slot is ready it waits
// for a worker. The Farm (fields) and the Barn (animals) each have their own crew, big enough to
// cover all their slots: 2, 4, 6, 8 workers by level.
export const FARM_WORKERS_BY_LEVEL = FARM_SLOTS_BY_LEVEL.map((n) => Math.ceil((n * 4) / PLOTS_PER_WORKER));
export const FARM_STAMINA_COST = 50; // a day's work at the Farm or the Barn (paid at the end of Turn 1) — to be balanced

// The Scrapyard works like the Farm, but nothing needs planting: its salvage piles refill themselves
// a day at a time, and a full one waits for a worker (2 each) to strip it.
export const YARD_JOBS = {
  cars: { name: "Car Wrecks", icon: "🚗", growDays: 3, scrap: 8, what: "8 🔩 scrap" },
  appliances: { name: "Appliances", icon: "🔌", growDays: 2, scrap: 4, research: [1, 2], researchChance: 0.5, what: "4 🔩 scrap, maybe 🧠 research" },
  machinery: { name: "Machinery", icon: "⚙️", growDays: 4, scrap: 10, gearChance: 0.2, what: "10 🔩 scrap, maybe gear" },
  vending: { name: "Vending Machines", icon: "🥫", growDays: 2, scrap: 3, ingredient: "canned_meat", ingredientChance: 0.5, what: "3 🔩 scrap, maybe 🥫 canned meat" },
};
export const YARD_GROUPS = { salvage: ["cars", "appliances", "machinery", "vending"] };
export const YARD_SLOTS_BY_LEVEL = [1, 2, 3, 4];
export const YARD_WORKERS_BY_LEVEL = YARD_SLOTS_BY_LEVEL.map((n) => Math.ceil((n * 4) / PLOTS_PER_WORKER));
export const YARD_STAMINA_COST = 50; // to be balanced

// The Greenhouse works like the Scrapyard: its herb beds grow back by themselves a day at a time and
// give medicine. Biology students (CON) work it best.
export const GREENHOUSE_JOBS = {
  aloe: { name: "Aloe Vera", icon: "🌵", growDays: 2, medicine: 1, what: "1 💊 medicine" },
  echinacea: { name: "Echinacea", icon: "🌸", growDays: 3, medicine: 2, what: "2 💊 medicine" },
  willow: { name: "Willow Bark", icon: "🌳", growDays: 4, medicine: 4, what: "4 💊 medicine" },
  coffee: { name: "Coffee Plant", icon: "☕", growDays: 3, ingredient: "coffee", what: "1 ☕ coffee" },
};
export const GREENHOUSE_GROUPS = { herbs: ["aloe", "echinacea", "willow", "coffee"] };
export const GREENHOUSE_SLOTS_BY_LEVEL = [1, 2, 3, 4];
export const GREENHOUSE_WORKERS_BY_LEVEL = GREENHOUSE_SLOTS_BY_LEVEL.map((n) => Math.ceil((n * 4) / PLOTS_PER_WORKER));
export const GREENHOUSE_STAMINA_COST = 50; // to be balanced
export const GREENHOUSE_YIELD_MEDICINE = 1; // medicine per worker a day, +1 per 25 CON

// The work sites built this way: each side (fields/animals, salvage/benches, herbs/still room) has
// its own crew, whose flag (c.farmToday / c.scrapyardToday / c.greenhouseToday) holds the side's name.
export const WORK_SITES = {
  // the old Farm is two rooms of the Courtyard now: the Farm's fields and the Barn's animals
  farm: { name: "Farm", flag: "farmToday", sides: { fields: FARM_GROUPS.fields }, slotsByLevel: FARM_SLOTS_BY_LEVEL, workersByLevel: FARM_WORKERS_BY_LEVEL, stamina: FARM_STAMINA_COST },
  barn: { name: "Barn", flag: "barnToday", sides: { animals: FARM_GROUPS.animals }, slotsByLevel: FARM_SLOTS_BY_LEVEL, workersByLevel: FARM_WORKERS_BY_LEVEL, stamina: FARM_STAMINA_COST },
  scrapyard: { name: "Scrapyard", flag: "scrapyardToday", sides: YARD_GROUPS, slotsByLevel: YARD_SLOTS_BY_LEVEL, workersByLevel: YARD_WORKERS_BY_LEVEL, stamina: YARD_STAMINA_COST },
  greenhouse: { name: "Greenhouse", flag: "greenhouseToday", sides: GREENHOUSE_GROUPS, slotsByLevel: GREENHOUSE_SLOTS_BY_LEVEL, workersByLevel: GREENHOUSE_WORKERS_BY_LEVEL, stamina: GREENHOUSE_STAMINA_COST },
};
export const STARTING_STOCK = { potatoes: 2, tomatoes: 2, wheat: 2, peppers: 1, chicken: 1, cow: 0, sheep: 1, goat: 0 };
// Expedition finds for the Farm (seeds, animals): a base chance on a success (lower on a failure) + a
// location's seedBonus. Locations with `animals` turn up one of them instead `animalChance` of
// the time.
export const EXPEDITION_SEED_CHANCE = 0.25;
export const EXPEDITION_SEED_CHANCE_FAILED = 0.08;
export const DISHES = [
  {
    id: "shepherds_stew", name: "Shepherd's Stew", icon: "🍲", ingredients: { mutton: 1, potatoes: 2 }, food: 6,
    effect: { expeditionMaterials: 1.5 },
    desc: "Mutton and potatoes stewed for hours — a heavy, slow-burning meal for a long day of hauling salvage. Expeditions bring back 50% more scrap today.",
  },
  {
    id: "fresh_bread", name: "Fresh Milk Bread", icon: "🍞", ingredients: { wheat: 2, milk: 1 }, food: 4,
    effect: { recruitChance: 2 },
    desc: "The smell drifts past the barricades and teams carry spare loaves to share. Expeditions are twice as likely to find survivors today.",
  },
  {
    id: "firehouse_chili", name: "Firehouse Chili", icon: "🥘", ingredients: { canned_meat: 1, tomatoes: 1, spices: 1 }, food: 6,
    effect: { battleDamage: 1.25 },
    desc: "A fiery bowl before the watch that keeps everyone hot-blooded and wide awake. Defenders deal 25% more damage in tonight's battle.",
  },
  {
    id: "scholars_breakfast", name: "Scholar's Breakfast", icon: "🍳", ingredients: { eggs: 1, wheat: 1, coffee: 1 }, food: 5,
    effect: { xp: 1.5 },
    desc: "Eggs on toast and a strong cup of coffee keep minds sharp all day. Every action earns 50% more XP today.",
  },
];
// Dish ids from older saves, for migrateState.
export const LEGACY_DISH_IDS = {
  scavenger_stew: "shepherds_stew", meat_stew: "shepherds_stew", bbq_beacon: "fresh_bread", battle_chili: "firehouse_chili",
  brain_brownies: "scholars_breakfast",
};
export const EXPEDITION_INGREDIENT_CHANCE = 0.5; // + a location's ingredientBonus, on a success
export const EXPEDITION_INGREDIENT_CHANCE_FAILED = 0.15;

// The Courtyard's work sites, a student's Turn 1 job. No teacher slots — just passive
// per-student daily yield, split out so each facility can scale/upgrade independently.
export const FARM_CAPACITY = 4; // workers at level 1 (+3 a level: 16 at the top)
export const SCRAPYARD_CAPACITY = 3;
export const FARM_YIELD_FOOD = 3; // food per assigned student/day
export const SCRAPYARD_YIELD_MATERIALS = 3; // scrap per assigned student/day

// The scrap resource is stored under the `materials` key (older saves use it); this is the name
// players see.
export const RESOURCE_NAME = { food: "food", materials: "scrap", medicine: "medicine", research: "research", serum: "antiviral serum" };

// Infection: a zombie bite that festers. A student who goes down to a zombie in a fight and lives
// may be infected (INFECTION_CHANCE_DOWNED); a zombie that breaks into the school, or the "A Hidden
// Bite" event, can infect anyone, teachers included. The infected are quarantined in the Nurse's
// Office — each takes up a bed and can't do anything else — and die at the end of INFECTION_DAYS
// days unless cured with one Antiviral Serum, the only cure. Serum is rare: found now and then on a
// successful run to a medical location (a location's `serumChance`) and always on a raid boss kill
// (the landmark's `rewards.serum`).
export const INFECTION_DAYS = 5;
export const INFECTION_CHANCE_DOWNED = 0.06; // students go down often in the night battle, so this stays low
// Ceiling for state.fortification. Raised from 60 to 300 alongside the deeper Research tree so
// the tier 3-5 fortification techs (which sum to well over the old cap) aren't dead purchases.
export const FORTIFICATION_CAP = 300;
// Each point of it makes the Night Watch's walls 1% sturdier and its traps 1% sharper.
export const FORTIFICATION_PER_POINT = 0.01;

// ===== Scouting =====
// Stamina to scout the ring right outside the school fence; it doubles for every ring further out
// (5, 10, 20, 40, 80, 160 at the edge of the map) — see scoutCost() in game.js. The outer rings
// take a student whose max stamina has been raised in Acrobatics.
export const SCOUT_STAMINA_COST = 5;
// Chance of a zombie encounter while scouting a new tile, growing +10% per ring beyond the school
// grounds (10% right outside the fence, 60% at the edge of the radius-7 map). More encounter types
// will be added later — this is the first.
export const SCOUT_ENCOUNTER_CHANCE_PER_HEX = 0.1;
export const SCOUT_ENCOUNTER_HP_LOSS = 50; // taken (never lethal) when a scout loses their fight

// ===== Room levels =====
// Rooms start small (10 students at the start) and grow 2 slots a level, since a school that
// recruits well reaches ~30 students by day 30.
// Every room and facility starts at level 1 and is upgraded one level at a time, up to
// ROOM_MAX_LEVEL, for scrap. Each level adds student slots (and the Farm's fields and pens), the
// levels in ROOM_TEACHER_LEVELS add a teacher slot (every room starts with its teacher and gets a
// assistant at level 5, so 2 at most), and
// rooms without students grow a perk
// instead. Rooms are keyed "classroom:<id>", "gym", "acrobatics", "cafeteria", and so on.
export const ROOM_MAX_LEVEL = 5; // a room's ROOM_LEVELS entry can set a lower `maxLevel` (the Farm has 4)
// The stat a room itself gives each student, by its level: the base of every Gymnasium /
// Acrobatics session (teachers' ranks come on top) and a classroom's standing bonus to its subject.
export const ROOM_STAT_BONUS_BY_LEVEL = [1, 3, 5, 7, 10];
// With no teacher the Gymnasium and Acrobatics still train their level bonus, up to this grade (a
// classroom with no teacher teaches nothing). A teacher raises the limit to their own grade — it
// never drops below this.
export const NO_TEACHER_CAP = 50;
export const ROOM_TEACHER_LEVELS = [5];
export const roomUpgradeCost = (level) => 20 * level; // from `level` to the next: 20, 40, 60, 80
export const ROOM_REPAIR_COST = 10; // scrap per worker slot a facility raid broke
export const CAFETERIA_RATIONS_BY_LEVEL = [6, 8, 10, 12, 14]; // food the cooks stretch the rations by
export const RESEARCH_BONUS_BY_LEVEL = [3, 4, 5, 6, 8]; // research a day on top of INT, while anyone works there
// The Headmaster's Office (no levels): students it puts forward for promotion, and survivors who
// can wait there to join (a newcomer is turned away when it's full — legendary ones always fit).
export const OFFICE_PROMOTION_SLOTS = 8;
export const OFFICE_RECRUIT_SLOTS = 8;
export const CRAFTING_BONUS_BY_LEVEL = [0, 1, 2, 3, 4]; // extra fortification per crafter
// Slots: `base` at level 1 and `per` more each level — or, with `by`, exactly by[level - 1].
const roomSlots = (label, base, per = 0, by = null) => ({ label, base, per, by });
// The student slots of the Research Room, the Radio Station and the Crafting Room, by level.
export const HELPER_SLOTS_BY_LEVEL = [1, 2, 4, 6, 8];
const training = (name, ref) => ({
  name, ref, students: roomSlots("Student slots", GYM_CAPACITY, 3), teachers: roomSlots("Teacher slots", GYM_MAX_TEACHERS),
  perks: [{ label: "Room bonus", by: ROOM_STAT_BONUS_BY_LEVEL, fmt: (v) => `+${v} a session` }],
});
// `ref` is how a sentence names the room when "the <name>" doesn't read well.
export const ROOM_LEVELS = {
  classroom: {
    name: "Classroom", students: roomSlots("Seats", CLASSROOM_CAPACITY, CLASSROOM_SEATS_PER_LEVEL), teachers: roomSlots("Teachers", CLASSROOM_MAX_TEACHERS),
    perks: [{ label: "Room bonus", by: ROOM_STAT_BONUS_BY_LEVEL, fmt: (v) => `+${v} to the subject` }],
  },
  gym: training("Gymnasium"),
  acrobatics: training("Acrobatics", "the Acrobatics room"),
  cafeteria: {
    name: "Cafeteria", students: roomSlots("Resting seats", CAFETERIA_CAPACITY, 3), teachers: roomSlots("Cooks", CAFETERIA_MAX_TEACHERS),
    perks: [
      { label: "Rations", by: CAFETERIA_RATIONS_BY_LEVEL, fmt: (v) => `+${v} food a day` },
      { label: "Rest", by: CAFETERIA_REST_BY_LEVEL, fmt: (v) => `+${v} stamina` },
    ],
  },
  infirmary: {
    name: "Nurse's Office", students: roomSlots("Beds", INFIRMARY_CAPACITY, 3), teachers: roomSlots("Nurses", INFIRMARY_MAX_TEACHERS),
    perks: [
      { label: "Heal", by: INFIRMARY_HEAL_BY_LEVEL, fmt: (v) => `+${v} HP` },
    ],
  },
  research: {
    name: "Research Room", students: roomSlots("Assistants", 1, 1, HELPER_SLOTS_BY_LEVEL), teachers: roomSlots("Researchers", RESEARCH_ROOM_TEACHERS),
    perks: [{ label: "Bonus research", by: RESEARCH_BONUS_BY_LEVEL, fmt: (v) => `+${v} a day` }],
  },
  radio: {
    name: "Radio Station", students: roomSlots("On-air students", 1, 1, HELPER_SLOTS_BY_LEVEL), teachers: roomSlots("Teachers", 1),
  },
  crafting: {
    name: "Crafting Room", students: roomSlots("Helpers", 1, 1, HELPER_SLOTS_BY_LEVEL), teachers: roomSlots("Crafters", 1),
    perks: [{ label: "Bonus fortification", by: CRAFTING_BONUS_BY_LEVEL, fmt: (v) => `+${v} per crafter` }],
  },
  farm: {
    name: "Farm", maxLevel: FARM_SLOTS_BY_LEVEL.length,
    perks: [
      { label: "Workers", by: FARM_WORKERS_BY_LEVEL, fmt: (v) => `${v}` },
      { label: "Slots per crop", by: FARM_SLOTS_BY_LEVEL, fmt: (v) => `${v} each` },
    ],
  },
  barn: {
    name: "Barn", maxLevel: FARM_SLOTS_BY_LEVEL.length,
    perks: [
      { label: "Workers", by: FARM_WORKERS_BY_LEVEL, fmt: (v) => `${v}` },
      { label: "Slots per animal", by: FARM_SLOTS_BY_LEVEL, fmt: (v) => `${v} each` },
    ],
  },
  scrapyard: {
    name: "Scrapyard", maxLevel: YARD_SLOTS_BY_LEVEL.length,
    perks: [
      { label: "Workers", by: YARD_WORKERS_BY_LEVEL, fmt: (v) => `${v} salvage + ${v} benches` },
      { label: "Slots per pile & bench", by: YARD_SLOTS_BY_LEVEL, fmt: (v) => `${v} each` },
    ],
  },
  greenhouse: {
    name: "Greenhouse", maxLevel: GREENHOUSE_SLOTS_BY_LEVEL.length,
    perks: [
      { label: "Workers", by: GREENHOUSE_WORKERS_BY_LEVEL, fmt: (v) => `${v} herbs + ${v} still room` },
      { label: "Slots per bed & rack", by: GREENHOUSE_SLOTS_BY_LEVEL, fmt: (v) => `${v} each` },
    ],
  },
};


// ===== Stamina =====
// Only students use stamina; teachers never tire — they're a standing boost to the room they're
// posted to. Max stamina comes from DEX and WIS — see STAT_TUNING and maxStaminaFor() in characters.js.
export const STAMINA_COST_EXPLORE = 20; // per expedition

// Expedition roles (the Exploration tab's three windows). A student's score in a role is the
// average of its two stats; they're put in the role they score best in (ties: fighter, then scout,
// then support) unless the player drags them somewhere else (c.exploreRole).
export const EXPLORE_ROLES = {
  fighter: { name: "Fighters", icon: "⚔️", stats: ["PE", "Biology"], blurb: "Front line — they take the hits and hit back" },
  scout: { name: "Scouts", icon: "🏃", stats: ["Gymnastics", "SocialStudies"], blurb: "Quick and quiet — they find the way and talk to survivors" },
  support: { name: "Supports", icon: "🧠", stats: ["Physics", "History"], blurb: "The brains — they keep the team safe and spot the loot" },
};
// Expedition teams: the school starts with one and buys the next with scrap (EXPLORE_TEAM_COSTS[i]
// unlocks team i + 1), up to three. Every team has these five slots.
export const EXPLORE_TEAM_COSTS = [0, 40, 80];
export const EXPLORE_TEAM_SLOTS = ["fighter", "fighter", "scout", "support", "support"];
// Teamwork: a team's power grows this much for every member past the first (+20% for a full five).
export const EXPLORE_TEAMWORK_BONUS = 0.05;
// How hard a place is: the team power it needs grows with every block from the school (the
// nearest places are 3 out), give or take its own difficulty (1-5, around 3). A team with exactly
// that power succeeds EXPEDITION_ODDS_AT_NEED of the time, ±1% per EXPEDITION_POWER_PER_PERCENT.
// A new school's best five come to ~570 power with teamwork: about 46% / 19% / 5% / 5% at 3 / 4 /
// 5 / 6 blocks out, so the town opens up as students grow in class (a trained ~780 team: 88% / 63%
// / 30% / 9%); a maxed team (~1200) takes the far side of town at ~85%.
export const EXPEDITION_NEED = { base: 630, perBlock: 120, perDifficulty: 30, nearest: 3 };
export const EXPEDITION_ODDS_AT_NEED = 0.55;
export const EXPEDITION_POWER_PER_PERCENT = 5;
export const EXPEDITION_ODDS_RANGE = [0.05, 0.95];
// On the way in, every team meets one of these, and the player picks who handles it — the team's
// best of that role. `good` / `bad` finish "<name> …".
export const EXPEDITION_ENCOUNTERS = [
  { id: "shutter", icon: "🚪", text: "A metal shutter is down over the way in.", options: {
    fighter: { verb: "Force it up", good: "wrenched the shutter up — the team is in", bad: "made a racket forcing it — the dead heard" },
    scout: { verb: "Find another way in", good: "found an open window round the back", bad: "got lost in the alleys and wasted time" },
    support: { verb: "Pick the lock", good: "had the lock open in a minute", bad: "snapped the pick in the lock" } } },
  { id: "pack", icon: "🧟", text: "A pack of zombies is milling in the street outside.", options: {
    fighter: { verb: "Charge through", good: "cut a path straight through them", bad: "got bogged down in the pack" },
    scout: { verb: "Sneak around", good: "led everyone round them unseen", bad: "stepped on glass — they turned" },
    support: { verb: "Set a distraction", good: "set off a car alarm a block away — they wandered off", bad: "threw the bottle short — they came straight at us" } } },
  { id: "dark", icon: "🌑", text: "The power's out inside — it's pitch black.", options: {
    fighter: { verb: "Push on anyway", good: "shouldered on through the dark", bad: "walked straight into something that bit" },
    scout: { verb: "Feel the way", good: "found the way by the draughts and echoes", bad: "took a wrong turn in the dark" },
    support: { verb: "Rig a light", good: "rigged a torch from a battery and a bulb", bad: "couldn't get the light to work" } } },
  { id: "trap", icon: "🪤", text: "The doorway's booby-trapped — someone got here first.", options: {
    fighter: { verb: "Smash through the wall", good: "knocked a hole right through the plasterboard", bad: "brought half the ceiling down" },
    scout: { verb: "Spot the tripwire", good: "spotted the tripwire and stepped over it", bad: "missed the wire — it went off" },
    support: { verb: "Disarm it", good: "took the trap apart — and kept the parts", bad: "set it off disarming it" } } },
  { id: "rooftop", icon: "🙋", text: "Someone's shouting for help from a rooftop across the way.", options: {
    fighter: { verb: "Fight through to them", good: "cleared the way and brought them down", bad: "couldn't get through the crowd around them" },
    scout: { verb: "Climb up to them", good: "scaled the fire escape and brought them round", bad: "slipped on the fire escape" },
    support: { verb: "Talk them down", good: "calmed them down — they showed us a way in", bad: "couldn't calm them — the shouting drew more dead" } } },
  { id: "barricade", icon: "🚧", text: "A barricade of wrecked cars blocks the road.", options: {
    fighter: { verb: "Shove a car aside", good: "shoved a car out of the way", bad: "put their back out on the bumper" },
    scout: { verb: "Scout a way round", good: "found a gap through a backyard", bad: "found only dead ends" },
    support: { verb: "Roll one clear", good: "let the handbrake off and rolled one clear", bad: "set a car alarm off" } } },
];
// A pick's chance: `base` plus `perPower` for each point of the handler's power in their role
// (0-200), at most `max`; `noOne` when the team has nobody of that role. Its effect on the
// expedition's odds: `good` when it works, `bad` when it doesn't.
export const ENCOUNTER_CHANCE = { base: 0.25, perPower: 0.0035, max: 0.95, noOne: 0.15 };
export const ENCOUNTER_EFFECT = { good: 0.15, bad: -0.1 };
// Harder places pay better: supplies × (1 + every `perPower` needed over the nearest places'
// base), never under `min` — ×1.25 / ×1.5 / ×1.75 at 4 / 5 / 6 blocks out. Gear: a place's gear
// level (1-5) rises every `gearStep` power needed past `gearFrom`, raising the chance of gear
// (+8% a level) and the best tier it can be.
export const EXPEDITION_LOOT = { perPower: 480, min: 0.75, gearFrom: 480, gearStep: 108 };

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
export const RAIDABLE_FACILITIES = ["farm", "barn", "scrapyard", "greenhouse"];
export const LEGENDARY_CHANCE = 0.15; // chance a won Assault turns up a legendary survivor
export const LEGENDARY_TEACHER_CHANCE = 0.1; // chance a legendary survivor is a teacher (if there's room for one)

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
  { id: "stray_hen", kind: "good", title: "A Stray Hen", desc: "A hen wanders up to the gate, clucking. Someone builds her a coop.", effect: { stock: { chicken: 1 } } },
  { id: "lost_cow", kind: "good", title: "A Lost Cow", desc: "A dairy cow wanders out of the fog, lowing. The students lead her into a pen at the farm.", effect: { stock: { cow: 1 } } },
  { id: "blight", kind: "bad", title: "Crop Blight", desc: "Pests get into the farm overnight.", effect: { blight: true } },
  { id: "theft", kind: "bad", title: "Supplies Go Missing", desc: "Someone was careless — or someone stole from the stores overnight.", effect: { materials: -15 } },
  { id: "spoiled_food", kind: "bad", title: "Spoiled Rations", desc: "A batch of food spoils before anyone notices.", effect: { food: -15 } },
  { id: "bad_news", kind: "bad", title: "Bad News on the Radio", desc: "A broadcast describes a nearby town overrun. The school grows anxious.", effect: { happiness: -12 } },
  { id: "accident", kind: "bad", title: "An Accident", desc: "A careless moment during chores turns into a real injury.", effect: { injure: true } },
  { id: "sickness", kind: "bad", title: "A Hidden Bite", desc: "Someone was bitten at the fence and hid it. Now they're running a fever.", effect: { infect: true } },
];

// ===== Research tech tree =====
// Permanent buffs bought with banked research, as a talent tree: one path per turn of the day
// (TECH_PATHS, left to right), each a short trunk that splits into two branches. A node `requires`
// the one above it. Each node's `perk` holds numbers that stack across owned nodes and are read
// through techPerk() in game.js where they apply. `short` is the one-line effect on the tree.
export const TECH_PATHS = [
  { id: "school", name: "School Life", turn: 1, icon: "sun", desc: "Classes, rooms and the students in them", branches: { a: ["lobby", "Rooms"], b: ["student", "Students"] } },
  { id: "explore", name: "Exploration", turn: 2, icon: "dusk", desc: "Expeditions, and the Courtyard's farm and yards", branches: { a: ["population", "Teams"], b: ["pin", "Places & Yards"] } },
  { id: "night", name: "Night Watch", turn: 3, icon: "moon", desc: "Holding the entrance", branches: { a: ["assault", "The Watch"], b: ["shield", "Defenses"] } },
];
export const TECH_TREE = [
  // 🏫 School Life — trunk
  { id: "study_groups", path: "school", branch: "trunk", tier: 1, cost: 10, requires: null, icon: "📚", name: "Study Groups", short: "+25% class gains", perk: { classXp: 0.25 }, desc: "Classes teach 25% more a day." },
  { id: "school_spirit", path: "school", branch: "trunk", tier: 2, cost: 20, requires: "study_groups", icon: "🎉", name: "School Spirit", short: "½ morale losses", perk: { happinessLossReduction: 0.5 }, desc: "Happiness losses are halved." },
  // 🏫 → Rooms
  { id: "power_naps", path: "school", branch: "a", tier: 3, cost: 30, requires: "school_spirit", icon: "😴", name: "Power Naps", short: "+20 rest stamina", perk: { restRecovery: 20 }, desc: "Resting in the Cafeteria recovers 20 more stamina." },
  { id: "nurse_training", path: "school", branch: "a", tier: 4, cost: 45, requires: "power_naps", icon: "🩺", name: "Nurse Training", short: "+15 HP healed", perk: { healBonus: 15 }, desc: "The Nurse's Office heals every patient 15 HP more." },
  { id: "home_economics", path: "school", branch: "a", tier: 5, cost: 60, requires: "nurse_training", icon: "🍳", name: "Home Economics", short: "2 dishes a cook", perk: { extraDishesPerCook: 1 }, desc: "Each cook can serve two dishes a day instead of one." },
  { id: "lab_equipment", path: "school", branch: "a", tier: 6, cost: 80, requires: "home_economics", icon: "🥼", name: "Lab Equipment", short: "+25% research", perk: { researchYield: 0.25 }, desc: "The Research Room makes 25% more research." },
  { id: "master_builders", path: "school", branch: "a", tier: 7, cost: 100, requires: "lab_equipment", icon: "🛠", name: "Master Builders", short: "Cheaper upgrades", perk: { upgradeDiscount: 0.25 }, desc: "Room upgrades cost 25% less scrap." },
  // 🏫 → Students
  { id: "coaching", path: "school", branch: "b", tier: 3, cost: 30, requires: "school_spirit", icon: "📯", name: "Coaching", short: "+2 training a day", perk: { gymGain: 2 }, desc: "The Gymnasium and Acrobatics teach 2 more a session." },
  { id: "honor_roll", path: "school", branch: "b", tier: 4, cost: 45, requires: "coaching", icon: "🏅", name: "Honor Roll", short: "+25% XP", perk: { xp: 0.25 }, desc: "Every action earns 25% more XP." },
  { id: "hygiene", path: "school", branch: "b", tier: 5, cost: 60, requires: "honor_roll", icon: "🧼", name: "Hygiene", short: "Half the infections", perk: { infectionResist: 0.5 }, desc: "Half the bites that would infect someone don't." },
  { id: "pep_rallies", path: "school", branch: "b", tier: 6, cost: 80, requires: "hygiene", icon: "🎺", name: "Pep Rallies", short: "+2 morale a day", perk: { dailyHappiness: 2 }, desc: "Morale rises by 2 every morning." },
  { id: "prodigies", path: "school", branch: "b", tier: 7, cost: 100, requires: "pep_rallies", icon: "🎓", name: "Prodigies", short: "+10 grade cap", perk: { gradeCap: 10 }, desc: "Students can learn 10 past their teacher's grade (and past the 50 cap with no teacher)." },
  // 🧭 Exploration — trunk
  { id: "scouts_eye", path: "explore", branch: "trunk", tier: 1, cost: 10, requires: null, icon: "👁", name: "Scout's Eye", short: "+10% success", perk: { expeditionSuccess: 0.1 }, desc: "Expeditions are 10% more likely to succeed." },
  { id: "trail_maps", path: "explore", branch: "trunk", tier: 2, cost: 20, requires: "scouts_eye", icon: "🧭", name: "Trail Maps", short: "Cheaper scouting", perk: { scoutCost: 0.25 }, desc: "Scouting a block costs 25% less stamina." },
  // 🧭 → Teams
  { id: "sparring", path: "explore", branch: "a", tier: 3, cost: 30, requires: "trail_maps", icon: "⚔️", name: "Sparring", short: "Fighters +15%", perk: { fighterPower: 0.15 }, desc: "Fighters count 15% more power on expeditions." },
  { id: "pathfinding", path: "explore", branch: "a", tier: 4, cost: 45, requires: "sparring", icon: "🏃", name: "Pathfinding", short: "Scouts +15%", perk: { scoutPower: 0.15 }, desc: "Scouts count 15% more power on expeditions." },
  { id: "field_kits", path: "explore", branch: "a", tier: 5, cost: 60, requires: "pathfinding", icon: "🧠", name: "Field Kits", short: "Supports +15%", perk: { supportPower: 0.15 }, desc: "Supports count 15% more power on expeditions." },
  { id: "teamwork", path: "explore", branch: "a", tier: 6, cost: 80, requires: "field_kits", icon: "🤝", name: "Teamwork", short: "Double teamwork", perk: { teamwork: 0.05 }, desc: "Every team member past the first adds 10% power instead of 5%." },
  { id: "ghost_walkers", path: "explore", branch: "a", tier: 7, cost: 100, requires: "teamwork", icon: "👣", name: "Ghost Walkers", short: "Safer expeditions", perk: { casualtyReduction: 0.5, exploreStaminaReduction: 0.5 }, desc: "Expedition casualties are halved, and expeditions cost half the stamina." },
  // 🧭 → Places & Yards
  { id: "deep_pockets", path: "explore", branch: "b", tier: 3, cost: 30, requires: "trail_maps", icon: "🎒", name: "Deep Pockets", short: "+25% loot", perk: { expeditionLoot: 0.25 }, desc: "Expeditions bring back 25% more food, scrap and medicine." },
  { id: "green_thumbs", path: "explore", branch: "b", tier: 4, cost: 45, requires: "deep_pockets", icon: "🌱", name: "Green Thumbs", short: "+25% harvests", perk: { farmYield: 0.25 }, desc: "Farm harvests bring in 25% more." },
  { id: "scrap_sorting", path: "explore", branch: "b", tier: 5, cost: 60, requires: "green_thumbs", icon: "🧰", name: "Scrap Sorting", short: "+25% salvage", perk: { salvageYield: 0.25 }, desc: "Scrapyard salvage brings in 25% more scrap." },
  { id: "treasure_hunters", path: "explore", branch: "b", tier: 6, cost: 80, requires: "scrap_sorting", icon: "🗺", name: "Treasure Hunters", short: "+20% gear finds", perk: { itemChance: 0.2, ingredientChance: 0.2 }, desc: "+20% chance to find gear and cooking ingredients on every expedition." },
  { id: "word_of_mouth", path: "explore", branch: "b", tier: 7, cost: 100, requires: "treasure_hunters", icon: "🗣", name: "Word of Mouth", short: "+50% recruits", perk: { recruitChance: 0.5 }, desc: "Expeditions are 50% more likely to find survivors who want to join." },
  // 🌙 Night Watch — trunk
  { id: "whetstones", path: "night", branch: "trunk", tier: 1, cost: 10, requires: null, icon: "🗡", name: "Whetstones", short: "+15% melee", perk: { meleeDamage: 0.15 }, desc: "+15% melee damage in the night battle." },
  { id: "archery_club", path: "night", branch: "trunk", tier: 2, cost: 20, requires: "whetstones", icon: "🏹", name: "Archery Club", short: "+1 ranged reach", perk: { rangedRange: 1, rangedDamage: 0.1 }, desc: "Ranged weapons reach 1 square further and deal +10% damage." },
  // 🌙 → The Watch
  { id: "field_medics", path: "night", branch: "a", tier: 3, cost: 30, requires: "archery_club", icon: "⛑", name: "Field Medics", short: "Cheaper saves", perk: { stabilizeDiscount: 2, untreatedDeathReduction: 0.5 }, desc: "Saving a downed defender costs 3 medicine instead of 5, and without medicine their death chance is halved." },
  { id: "quick_reflexes", path: "night", branch: "a", tier: 4, cost: 45, requires: "field_medics", icon: "⏱", name: "Quick Reflexes", short: "+25% ability charge", perk: { abilityCharge: 0.25 }, desc: "Abilities charge 25% faster in the night battle." },
  { id: "rally_drills", path: "night", branch: "a", tier: 5, cost: 60, requires: "quick_reflexes", icon: "📣", name: "Rally Drills", short: "Rally −20 morale", perk: { rallyUses: 1 }, desc: "Rally costs 20 less morale." },
  { id: "lookouts", path: "night", branch: "a", tier: 6, cost: 80, requires: "rally_drills", icon: "👁", name: "Lookouts", short: "+10% hit chance", perk: { watchHit: 0.1 }, desc: "The whole watch hits 10% more often." },
  { id: "last_stand", path: "night", branch: "a", tier: 7, cost: 100, requires: "lookouts", icon: "🔥", name: "Last Stand", short: "2× dmg when hurt", perk: { lastStand: 1 }, desc: "Defenders below 25% HP deal double damage." },
  // 🌙 → Defenses (the upgrades replace sandbag walls and razor wire — see DEFENSE_STRUCTURES)
  { id: "concrete_barricades", path: "night", branch: "b", tier: 3, cost: 30, requires: "archery_club", icon: "🚧", name: "Concrete Barricades", short: "Concrete walls", perk: {}, desc: "Sandbag walls become concrete barricades (160 HP), the ones already built too." },
  { id: "trap_engineering", path: "night", branch: "b", tier: 4, cost: 45, requires: "concrete_barricades", icon: "🔧", name: "Trap Engineering", short: "+25% traps & walls", perk: { trapDamage: 0.25, wallHp: 0.25 }, desc: "Traps hit 25% harder and walls hold 25% more." },
  { id: "electric_fence", path: "night", branch: "b", tier: 5, cost: 60, requires: "trap_engineering", icon: "⚡", name: "Electric Fence", short: "Electric fences", perk: {}, desc: "Razor wire becomes an electric fence (shocks for 18), what's already built too." },
  { id: "fortified_works", path: "night", branch: "b", tier: 6, cost: 80, requires: "electric_fence", icon: "🧱", name: "Fortified Works", short: "+50% walls", perk: { wallHp: 0.5 }, desc: "Walls hold 50% more HP." },
  { id: "barbed_walls", path: "night", branch: "b", tier: 7, cost: 100, requires: "fortified_works", icon: "🔺", name: "Barbed Walls", short: "Walls bite back", perk: { wallThorns: 6 }, desc: "A zombie that smashes a wall takes 6 damage every time." },
];

// ===== Exploration locations =====
// Map rule: no two points of interest (locations, raid landmarks, the school) may touch — there's
// always at least one plain hex between them. map.js warns in the console if one breaks it.
// Every earlier spot of a location that has moved (the no-touching rule, the bigger school grounds
// and the bigger map), so saves that had explored one of them still know where it is.
// Locations that were replaced by another in the same spot, for teams already sent there.
// (The General Hospital and the Shopping Mall became raids; a clinic and an electronics store took
// their blocks.)
export const LEGACY_LOCATION_IDS = { radio_station: "library", hospital: "urgent_care", mall: "electronics_store" };
export const LEGACY_POI_HEXES = {
  corner_store: ["1,0", "1,1"], pharmacy: ["2,0", "2,-2"], neighborhood: ["-1,-1"],
};
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
    hex: { q: 2, r: 1 }, // distance 3 — the closest a location can be without touching the school grounds
  },
  {
    id: "pharmacy",
    name: "Pharmacy",
    desc: "Shelves of medicine, if the shambling customers haven't gotten to it first.",
    difficulty: 2,
    danger: 2,
    rewards: { food: 2, materials: 2, medicine: 14, research: 8 },
    serumChance: 0.1,
    hex: { q: 3, r: -2 }, // distance 3
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
    id: "urgent_care",
    name: "Urgent Care Clinic",
    desc: "A walk-in clinic with its ambulance still in the bay. A taste of what the General Hospital holds.",
    difficulty: 4,
    danger: 3,
    rewards: { food: 2, materials: 6, medicine: 20, research: 14 },
    serumChance: 0.12,
    lootBias: "armor",
    hex: { q: -2, r: -3 }, // distance 5
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
    id: "electronics_store",
    name: "Electronics Store",
    desc: "Smashed screens up front, but the stockroom is full of parts, gadgets and manuals.",
    difficulty: 3,
    danger: 3,
    rewards: { food: 2, materials: 16, medicine: 2, research: 10 },
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
    animals: ["chicken"], // ...and backyard coops
    animalChance: 0.15,
    hex: { q: -2, r: -1 }, // distance 3
  },
  {
    id: "farmstead",
    name: "Abandoned Farmstead",
    desc: "Fields gone to seed on the edge of town, and livestock left to fend for itself.",
    difficulty: 3,
    danger: 3,
    rewards: { food: 16, materials: 6, medicine: 1 },
    seedBonus: 0.35,
    animals: ["chicken", "sheep", "cow"],
    animalChance: 0.5,
    hex: { q: -3, r: 3 }, // distance 3
  },
  // --- further out: rings 4-6 ---
  {
    id: "gas_station",
    name: "Gas Station",
    desc: "Pumps long since dry, but the shop shelves and the garage out back still hold plenty.",
    difficulty: 3,
    danger: 3,
    rewards: { food: 10, materials: 18, medicine: 2 },
    ingredientBonus: 0.25, // snack aisle
    hex: { q: -2, r: 4 }, // distance 4
  },
  {
    id: "garden_center",
    name: "Garden Center",
    desc: "Greenhouses full of overgrown plants and racks of seed packets nobody came back for.",
    difficulty: 2,
    danger: 2,
    rewards: { food: 14, materials: 6, medicine: 2 },
    seedBonus: 0.6,
    hex: { q: -4, r: 0 }, // distance 4
  },
  {
    id: "fire_station",
    name: "Fire Station",
    desc: "The crews left in a hurry. Their turnout gear and medical kits are still on the hooks.",
    difficulty: 4,
    danger: 3,
    rewards: { food: 4, materials: 16, medicine: 14, research: 10 },
    serumChance: 0.1,
    lootBias: "armor",
    hex: { q: 3, r: -5 }, // distance 5
  },
  {
    id: "church",
    name: "St. Mary's Church",
    desc: "The bells stopped ringing weeks ago, but people still hide in the crypt. Mind the congregation upstairs.",
    difficulty: 3,
    danger: 4,
    rewards: { food: 12, materials: 4, medicine: 10 },
    recruitBonus: 2,
    hex: { q: -5, r: 5 }, // distance 5
  },
  {
    id: "marina",
    name: "Riverside Marina",
    desc: "Boats bobbing at the docks, a bait shop and a lot of fish nobody's been catching.",
    difficulty: 4,
    danger: 4,
    rewards: { food: 24, materials: 12, medicine: 2 },
    ingredientBonus: 0.2,
    hex: { q: 5, r: -4 }, // distance 5, on the riverbank
  },
  {
    id: "warehouse",
    name: "Distribution Warehouse",
    desc: "Aisle after aisle of pallets for the whole city's stores. Big, dark and very, very crowded.",
    difficulty: 5,
    danger: 5,
    rewards: { food: 32, materials: 26, medicine: 4, research: 16 },
    ingredientBonus: 0.4,
    hex: { q: 4, r: 2 }, // distance 6
  },
  {
    id: "library",
    name: "Public Library",
    desc: "Quiet stacks of textbooks, journals and technical manuals — everything a research team could want. Keep your voice down.",
    difficulty: 4,
    danger: 3,
    rewards: { food: 2, materials: 6, medicine: 4, research: 18 },
    hex: { q: -5, r: -1 }, // distance 6
  },
  {
    id: "petting_zoo",
    name: "Petting Zoo",
    desc: "The keepers are gone, but some of the animals are still wandering the pens.",
    difficulty: 4,
    danger: 3,
    rewards: { food: 14, materials: 4, medicine: 2 },
    seedBonus: 0.2,
    animals: ["chicken", "sheep", "cow"],
    animalChance: 0.8,
    hex: { q: -2, r: 6 }, // distance 6
  },
  {
    id: "army_surplus",
    name: "Army Surplus Store",
    desc: "Racks of real gear behind a steel shutter someone already tried to pry open.",
    difficulty: 5,
    danger: 5,
    rewards: { food: 6, materials: 22, medicine: 6 },
    lootBias: "weapon",
    hex: { q: 5, r: -6 }, // distance 6
  },
];

// ===== Exploring the map =====
// Every hex that isn't a location has a terrain (worked out from its position by map.js), and
// scouting it always turns something up — weighted by terrain below. "cache" is a small stash of
// the terrain's CACHE_RESOURCE; "notes" are worth a little research; "nest" is a zombie nest that makes the hexes around it more
// dangerous until a squad clears it out.
export const HEX_FINDS = {
  street: { cache: 40, gear: 25, survivor: 10, nest: 20, ingredient: 5, notes: 15 },
  apartments: { cache: 30, ingredient: 20, survivor: 20, gear: 10, nest: 20, notes: 25 },
  shops: { cache: 40, ingredient: 30, gear: 15, nest: 15, notes: 15 },
  parking: { cache: 35, gear: 30, survivor: 10, nest: 25, notes: 10 },
  houses: { cache: 25, seeds: 25, ingredient: 15, animal: 10, survivor: 15, nest: 10, notes: 15 },
  park: { seeds: 35, animal: 20, cache: 15, survivor: 10, nest: 20 },
  ruins: { gear: 30, cache: 25, survivor: 10, nest: 35, notes: 25 },
  woods: { animal: 30, seeds: 20, cache: 15, nest: 35 },
  field: { seeds: 40, animal: 30, cache: 20, nest: 10 },
  river: { cache: 45, gear: 25, ingredient: 10, nest: 20 },
};
export const CACHE_RESOURCE = {
  street: "materials", parking: "materials", ruins: "materials", apartments: "medicine",
  shops: "food", houses: "food", park: "food", woods: "food", field: "food", river: "food",
};
export const NEST_SCOUT_DANGER = 0.25; // extra encounter chance scouting next to a nest
export const NEST_EXPEDITION_PENALTY = 0.1; // less success / more casualties at a location next to one
export const NEST_CLEAR_STAMINA = 15;
export const NEST_CLEAR_MAX = 3; // students per nest-clearing squad

// Things that turn up on scouted blocks for a few days, for a runner to grab (same stamina and
// zombie risk as scouting there). One may appear each morning, up to MAP_DROP_MAX at once.
export const MAP_DROPS = {
  crate: { icon: "📦", name: "Supply Crate", weight: 5 },
  wreck: { icon: "🚗", name: "Wrecked Car", weight: 3 },
  survivor: { icon: "🙋", name: "Stranded Survivor", weight: 2 },
};
export const MAP_DROP_CHANCE = 0.6;
export const MAP_DROP_MAX = 3;
export const MAP_DROP_DAYS = 3;
// The wandering horde turns up this many rings out on day 2, then drifts a block a day. Being
// next to it is as dangerous as being next to a nest.
export const HORDE_START_RING = 5;

// ===== Raids =====
// Four big places in the corners of the map, past its edge — the endgame, each the best source of
// its own resources. They stay under the fog with the rest of the outskirts until every block of
// the map has been scouted (MAP_MILESTONES' 100%). Each holds a raid boss that needs a
// bigger, higher-level squad (up to RAID_MAX_TEAM, launched with the day's expeditions). Beating it
// pays its `rewards`, `legendaryItems` from its `legendarySlot` (any slot if null), `extraGear`
// common items from `gearSlots`, and can free a legendary survivor; it comes back `respawnDays`
// later, 25% tougher for every time it's been killed. `at` is where it's drawn (world pixels).
// Mapping the town: every 25% of the map's blocks scouted pays out a legendary item; 100% also
// opens the raids and the outskirts.
export const MAP_MILESTONES = [25, 50, 75, 100];
export const RAID_MAX_TEAM = 8;
export const RAID_MAX_ROUNDS = 15;
export const RAID_BOSS_SCALING = 0.25;
export const LANDMARKS = [
  {
    id: "mall", name: "City Mall", tier: 1, corner: "nw", at: { x: 72, y: 62 },
    focus: "Food, scrap and accessories",
    desc: "Three floors of shops and a food court the dead never left. Mall security still walks the rounds.",
    boss: { name: "The Security Chief", look: "guard", hp: 520, damage: 18, attacks: 2 },
    minTeam: 5, minLevel: 3, legendaryItems: 1, legendarySlot: "accessory", extraGear: 2, gearSlots: ["accessory"], legendaryRecruitChance: 0.5,
    rewards: { food: 60, materials: 25, medicine: 5 }, respawnDays: 4,
  },
  {
    id: "hospital", name: "General Hospital", tier: 2, corner: "ne", at: { x: 344, y: 62 },
    focus: "Medicine and serum",
    desc: "The mother lode of medicine — and of the infected. The head surgeon is still on call.",
    boss: { name: "The Head Surgeon", look: "surgeon", hp: 760, damage: 22, attacks: 2 },
    minTeam: 6, minLevel: 4, legendaryItems: 1, legendarySlot: "armor", extraGear: 1, gearSlots: ["armor"], legendaryRecruitChance: 0.4,
    rewards: { food: 5, materials: 10, medicine: 60, serum: 2 }, respawnDays: 5,
  },
  {
    id: "military_base", name: "Military Base", tier: 3, corner: "se", at: { x: 344, y: 402 },
    focus: "Scrap, weapons and armour",
    desc: "The army's staging base, overrun on the first night. Something in there still wears the sergeant's stripes.",
    boss: { name: "Sergeant Rot", look: "soldier", hp: 1080, damage: 24, attacks: 3 },
    minTeam: 7, minLevel: 5, legendaryItems: 1, legendarySlot: "weapon", extraGear: 3, gearSlots: ["weapon", "armor"], legendaryRecruitChance: 0.4,
    rewards: { food: 15, materials: 70, medicine: 10 }, respawnDays: 5,
  },
  {
    id: "institute", name: "Research Institute", tier: 4, corner: "sw", at: { x: 72, y: 402 },
    focus: "Research and serum",
    desc: "Where the outbreak started. Patient zero never left the building.",
    boss: { name: "Subject Zero", look: "labcoat", hp: 1520, damage: 28, attacks: 3 },
    minTeam: 8, minLevel: 6, legendaryItems: 2, legendarySlot: null, extraGear: 0, gearSlots: [], legendaryRecruitChance: 0.7,
    rewards: { food: 10, materials: 15, medicine: 20, research: 60, serum: 3 }, respawnDays: 6,
  },
];
// Raids that were renamed (the Military Checkpoint is the Military Base now; the City Stadium is gone).
export const LEGACY_RAID_IDS = { checkpoint: "military_base", stadium: null };

// ===== Name pools =====
// Rule: first names and surnames are at most NAME_PART_MAX letters each (characters.js fitName).
export const NAME_PART_MAX = 6;
export const MALE_NAMES = [
  "James","John","Robert","Mike","David","Daniel","Matt","Andrew","Josh","Ryan",
  "Ethan","Noah","Lucas","Mason","Logan","Jack","Owen","Caleb","Dylan","Nathan",
];
export const FEMALE_NAMES = [
  "Mary","Emma","Olivia","Sophia","Bella","Ava","Mia","Emily","Grace","Chloe",
  "Ella","Lily","Zoe","Hannah","Nora","Ruby","Abby","Sadie","Layla","Audrey",
];
export const LAST_NAMES = [
  "Smith","Jones","Brown","Garcia","Miller","Davis","Wilson","Moore","Taylor","Thomas",
  "Martin","Lee","Perez","White","Harris","Clark","Lewis","Hall","Young","King",
  "Wright","Lopez","Hill","Scott","Green","Adams","Baker","Nelson","Carter","Reed",
];
