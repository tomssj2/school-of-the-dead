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
export const ITEM_TEMPLATES = [
  { id: "bat", name: "Baseball Bat", slot: "weapon", icon: "🏏", bonuses: { STR: 6 } },
  { id: "knife", name: "Kitchen Knife", slot: "weapon", icon: "🔪", bonuses: { DEX: 6 } },
  { id: "axe", name: "Fire Axe", slot: "weapon", icon: "🪓", bonuses: { STR: 5, DEX: 3 } },
  { id: "crowbar", name: "Crowbar", slot: "weapon", icon: "🔧", bonuses: { STR: 4, DEX: 2 } },
  { id: "jacket", name: "School Jacket", slot: "armor", icon: "🧥", bonuses: { CON: 4 } },
  { id: "vest", name: "Riot Vest", slot: "armor", icon: "🦺", bonuses: { CON: 9 } },
  { id: "pads", name: "Padded Gear", slot: "armor", icon: "🎽", bonuses: { CON: 5, DEX: 2 } },
  { id: "helmet", name: "Bike Helmet", slot: "armor", icon: "⛑", bonuses: { CON: 3, STR: 2 } },
  { id: "charm", name: "Lucky Charm", slot: "accessory", icon: "🍀", bonuses: { CHA: 5 } },
  { id: "glasses", name: "Reading Glasses", slot: "accessory", icon: "👓", bonuses: { INT: 5 } },
  { id: "watch", name: "Pocket Watch", slot: "accessory", icon: "⌚", bonuses: { WIS: 5 } },
  { id: "energy_drink", name: "Energy Drink", slot: "accessory", icon: "🥤", bonuses: { STR: 2, DEX: 2 } },
  { id: "photo", name: "Family Photo", slot: "accessory", icon: "📷", bonuses: { CHA: 3, WIS: 2 } },
  { id: "gloves", name: "Fingerless Gloves", slot: "accessory", icon: "🧤", bonuses: { DEX: 3, STR: 2 } },
];

// A handful of starter items to seed the shared armory with on a new game.
export const STARTER_ARMORY_IDS = ["bat", "jacket", "charm", "knife", "watch", "pads", "glasses"];

// Rare, much stronger items — never in the starter/shared armory pool. Only ever created
// pre-equipped on a legendary survivor (see makeLegendaryCharacter).
export const LEGENDARY_ITEM_TEMPLATES = [
  { id: "legendary_bat", name: "Home Run King", slot: "weapon", icon: "🏏", bonuses: { STR: 16 }, legendary: true },
  { id: "legendary_axe", name: "Widow's Edge", slot: "weapon", icon: "🪓", bonuses: { STR: 12, DEX: 8 }, legendary: true },
  { id: "legendary_vest", name: "Warden's Plate", slot: "armor", icon: "🦺", bonuses: { CON: 20 }, legendary: true },
  { id: "legendary_coat", name: "Survivor's Coat", slot: "armor", icon: "🧥", bonuses: { CON: 12, DEX: 6 }, legendary: true },
  { id: "legendary_charm", name: "Four-Leaf Talisman", slot: "accessory", icon: "🍀", bonuses: { CHA: 14, WIS: 6 }, legendary: true },
  { id: "legendary_glasses", name: "Oracle's Lenses", slot: "accessory", icon: "👓", bonuses: { INT: 14, WIS: 6 }, legendary: true },
];

export const LEGENDARY_TITLES = ["the Relentless", "the Unbroken", "the Last Stand", "the Ironclad", "the Undying", "the Reaper's Bane"];

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

export const CAFETERIA_CAPACITY = 10; // base student rest slots/day
export const CAFETERIA_MAX_TEACHERS = 3; // base teacher (cook) slots

// Outside facilities, worked during Turn 2 instead of exploring. No teacher slots — just passive
// per-student daily yield, split out so each facility can scale/upgrade independently.
export const FARM_CAPACITY = 10;
export const SCRAPYARD_CAPACITY = 10;
export const LAB_CAPACITY = 10;
export const FARM_YIELD_FOOD = 3; // food per assigned student/day
export const SCRAPYARD_YIELD_MATERIALS = 3; // materials per assigned student/day
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
// Materials cost to go from a given upgrade level to the next; capped at ROOM_UPGRADE_MAX_LEVEL.
export const ROOM_UPGRADE_MAX_LEVEL = 3;
export const roomUpgradeCost = (level) => 15 * (level + 1);
// How much capacity one upgrade level adds, per room/slot type.
export const ROOM_UPGRADE_INCREMENT = {
  classroomStudent: CLASSROOM_SEATS_PER_ROW, // +1 row
  gymStudent: 5,
  gymTeacher: 1,
  cafeteriaStudent: 5,
  cafeteriaTeacher: 1,
  farmStudent: 5,
  scrapyardStudent: 5,
  labStudent: 5,
};

export const BOND_COUPLE_THRESHOLD = 6;

// ===== Stamina =====
export const MAX_STAMINA = 100;
export const STAMINA_COST_GYM = 20; // students, per day trained
export const STAMINA_COST_EXPLORE = 20; // students, per expedition
export const STAMINA_COST_TEACH = 20; // teachers, per day assigned to a classroom
export const STAMINA_RECHARGE_CAFETERIA = 50; // per day resting/working in the cafeteria

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
  { id: "theft", kind: "bad", title: "Supplies Go Missing", desc: "Someone was careless — or someone stole from the stores overnight.", effect: { materials: -15 } },
  { id: "spoiled_food", kind: "bad", title: "Spoiled Rations", desc: "A batch of food spoils before anyone notices.", effect: { food: -15 } },
  { id: "bad_news", kind: "bad", title: "Bad News on the Radio", desc: "A broadcast describes a nearby town overrun. The school grows anxious.", effect: { happiness: -12 } },
  { id: "accident", kind: "bad", title: "An Accident", desc: "A careless moment during chores turns into a real injury.", effect: { injure: true } },
  { id: "sickness", kind: "bad", title: "A Sickness Spreads", desc: "Something is going around the dorms. One student doesn't pull through.", effect: { kill: true } },
];

// ===== Research tech tree =====
// One-time purchases spending banked Research (from staffing the Lab) on an instant, permanent
// effect — interpreted the same generic way as EVENTS' `effect` (applyEffect() in game.js), so
// this stays data-only. Two loose tiers: `requires` gates a node behind owning another one first.
export const TECH_TREE = [
  { id: "fortify_walls", name: "Fortify Walls", icon: "🧱", desc: "Reinforce the main entrance.", cost: 15, requires: null, effect: { fortification: 15 } },
  { id: "stockpile", name: "Stockpile", icon: "📦", desc: "Organize the storerooms.", cost: 15, requires: null, effect: { materials: 30 } },
  { id: "field_rations", name: "Field Rations", icon: "🍱", desc: "Better food preservation.", cost: 15, requires: null, effect: { food: 40 } },
  { id: "reinforced_gates", name: "Reinforced Gates", icon: "🚪", desc: "A second line of defense at the entrance.", cost: 30, requires: "fortify_walls", effect: { fortification: 25 } },
  { id: "grain_silos", name: "Grain Silos", icon: "🌾", desc: "Bulk food storage.", cost: 30, requires: "field_rations", effect: { food: 60 } },
  { id: "surplus_trade", name: "Surplus Trade", icon: "💰", desc: "Trade excess supplies with other survivors.", cost: 30, requires: "stockpile", effect: { materials: 50, medicine: 15 } },
  // Tier 3
  { id: "watchtowers", name: "Watchtowers", icon: "🗼", desc: "Spot trouble before it reaches the gates.", cost: 50, requires: "reinforced_gates", effect: { fortification: 40 } },
  { id: "greenhouse", name: "Greenhouse", icon: "🌱", desc: "Grow food indoors, safe from raids.", cost: 50, requires: "grain_silos", effect: { food: 90 } },
  { id: "scrap_refinery", name: "Scrap Refinery", icon: "⚙️", desc: "Turn junk into usable parts.", cost: 50, requires: "surplus_trade", effect: { materials: 70 } },
  // Tier 4
  { id: "barricade_network", name: "Barricade Network", icon: "🚧", desc: "Choke points funnel attackers into kill zones.", cost: 75, requires: "watchtowers", effect: { fortification: 60 } },
  { id: "livestock_pens", name: "Livestock Pens", icon: "🐄", desc: "A steady supply of meat and milk.", cost: 75, requires: "greenhouse", effect: { food: 120 } },
  { id: "trade_caravan", name: "Trade Caravan", icon: "🐎", desc: "Run supply routes to nearby survivor camps.", cost: 75, requires: "scrap_refinery", effect: { materials: 90, medicine: 20 } },
  // Tier 5
  { id: "bastion_walls", name: "Bastion Walls", icon: "🏯", desc: "The school becomes a fortress.", cost: 110, requires: "barricade_network", effect: { fortification: 100 } },
  { id: "cold_storage", name: "Cold Storage", icon: "🧊", desc: "Nothing spoils, nothing goes to waste.", cost: 110, requires: "livestock_pens", effect: { food: 160 } },
  { id: "black_market", name: "Black Market Contacts", icon: "🕶️", desc: "Discreet dealers who can get almost anything.", cost: 110, requires: "trade_caravan", effect: { materials: 130, medicine: 40 } },
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
    hex: { q: 0, r: 3 }, // distance 3
  },
  {
    id: "hardware_store",
    name: "Hardware Store",
    desc: "Tools and lumber for fortifying the school.",
    difficulty: 3,
    danger: 2,
    rewards: { food: 2, materials: 24, medicine: 1 },
    hex: { q: -3, r: 1 }, // distance 3
  },
  {
    id: "hospital",
    name: "General Hospital",
    desc: "The mother lode of medicine, but also the mother lode of the infected.",
    difficulty: 5,
    danger: 5,
    rewards: { food: 4, materials: 8, medicine: 30 },
    hex: { q: -2, r: -3 }, // distance 5 — clear across town
  },
  {
    id: "police_station",
    name: "Police Station",
    desc: "Weapons and armor behind a wall of undead officers.",
    difficulty: 5,
    danger: 5,
    rewards: { food: 2, materials: 30, medicine: 4 },
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
