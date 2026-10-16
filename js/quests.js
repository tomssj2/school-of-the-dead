// ===== Quests =====
// Albus Doubledoor's main line, and each room NPC's quests: their place on the City Map, and the
// item every upgrade of their room needs. All built from the tables below.
//
// A quest is a list of steps, each a check on the game (a room cleared, a place cleared 100%, an
// item found, a room upgraded, a raid won, another quest handed in). state.quests[id] is "active"
// once it's taken from its NPC and "done" once it's handed in; it's "ready" to hand in when every
// step checks out. What the game doesn't otherwise remember is kept in state.questFacts: the
// places a run got all the way through, and the quest items found.
import { BOARDED_ROOMS, LANDMARKS, LOCATIONS, ROOM_NPC, ROOM_MAX_LEVEL } from "./data.js";
import { NPCS, BANTER } from "./npcs.js";
import { isBoarded, roomLevel, postRoomKey, poiTier, roomMaxLevel, addLog } from "./game.js";

// Each NPC's own place, which Doubledoor sends you to clear a tier at a time.
export const NPC_PLACE = {
  grillsay: "diner", whiteboard: "pharmacy", seen: "neighborhood",
  mopovich: "sporting_goods", gyber: "hardware_store", plowson: "garden_center", scrapperson: "gas_station",
  quarkwell: "electronics_store", cowper: "farmstead", bickus: "church", frankenstitch: "vet_clinic",
  quinzwheel: "police_station", bulldog: "warehouse", brockbride: "fire_station",
};
// What they say when they send you there.
const PLACE_ASK = {
  grillsay: "That Diner stole my customers AND my ladle. Clear it out. Every. Single. Room.",
  whiteboard: "The Pharmacy has what I need. Clear it, and nobody gets hurt. Well. Fewer people.",
  seen: "There are families hiding in the houses down the street. Let's make it safe for them, sweetheart.",
  mopovich: "Sporting Goods Store… is very dirty. Many zombies. Can you clean, please?",
  gyber: "Everything I need is at the Hardware Store. And everything I don't, between me and it.",
  plowson: "The Garden Center. Seeds, compost, glory. How hard can it be?",
  scrapperson: "The Gas Station's got a garage full of junk. Clear it and I'll take a look. Best I can do.",
  quarkwell: "The Electronics Store. Clear it methodically. Left to right. I'll know if you don't.",
  cowper: "The old Farmstead's got animals left out there. Jezza would get it wrong. You won't.",
  bickus: "St. Mary's crypt holds relics of Rome. Probably. Secure it. 'Tis but a short walk.",
  frankenstitch: "The Vet Clinic! Specimens! Steve needs friends. Clear it — gently, if you can.",
  quinzwheel: "The Police Station's got my stuff in an evidence locker, puddin'. Let's go get it back!",
  bulldog: "My tour speakers are stuck in the Warehouse. Clear it out — DALE!",
  brockbride: "There's a paramedic at the Fire Station who looks just like me. Isn't that lovely? Please clear it!",
};

// The item each upgrade needs, by room and the level it upgrades to: [name, where to find it]
// (a place, or a raid for level 5). The item shows up in the room's banner at that level.
export const UPGRADE_ITEMS = {
  gym: { 2: ["Coach Anatolio's Cleaning Cart", "corner_store"], 3: ["Olympic Barbell Set", "sporting_goods"], 4: ["Medicine Balls", "urgent_care"], 5: ["Samantha", "mall"] },
  acrobatics: { 2: ["Harleen's Roller Skates", "diner"], 3: ["The Circus Trapeze", "sporting_goods"], 4: ["Bud & Lou", "petting_zoo"], 5: ["Harleen's Baseball Bat", "military_base"] },
  cafeteria: { 2: ["Gordana's Golden Ladle", "diner"], 3: ["The Big Fridge", "supermarket"], 4: ["The Spice Rack", "farmstead"], 5: ["Industrial Coffee Machine", "hospital"] },
  infirmary: { 2: ["The Red Cross Sign", "pharmacy"], 3: ["An IV Stand", "apartments"], 4: ["Her Sister's Medicine Cabinet", "urgent_care"], 5: ["The Recovery Machine", "hospital"] },
  "classroom:1": { 2: ["Specimen Jars", "pharmacy"], 3: ["A Venus Flytrap", "garden_center"], 4: ["The Skeleton", "vet_clinic"], 5: ["A Zombie in a Tank", "institute"] },
  "classroom:2": { 2: ["His Spot", "neighborhood"], 3: ["A Model Train Set", "apartments"], 4: ["Tesla Coil Parts", "electronics_store"], 5: ["A Real Rocket", "military_base"] },
  "classroom:3": { 2: ["The Centurion Statue", "neighborhood"], 3: ["The Road Atlas", "gas_station"], 4: ["A Roman Amphora", "church"], 5: ["The Bust of Caesar", "mall"] },
  "classroom:4": { 2: ["Thank-You Letters", "neighborhood"], 3: ["Birthday Bunting", "supermarket"], 4: ["The Library Lectern", "library"], 5: ["A Crate of Good Jeans", "mall"] },
  research: { 2: ["Lab Glassware", "pharmacy"], 3: ["A Pork-Pie Hat", "supermarket"], 4: ["Research Journals", "library"], 5: ["The Blue Reactor", "institute"] },
  crafting: { 2: ["Duct Tape", "corner_store"], 3: ["A Vise & Drill Press", "hardware_store"], 4: ["The Welding Rig", "marina"], 5: ["Razor Wire & Riot Shields", "military_base"] },
  radio: { 2: ["The Neon ON AIR Sign", "diner"], 3: ["A Ham Radio", "apartments"], 4: ["The Gold Mic", "electronics_store"], 5: ["The Satellite Uplink", "military_base"] },
  farm: { 2: ["Seed Packets", "corner_store"], 3: ["Greenhouse Glass", "garden_center"], 4: ["THE Tractor", "farmstead"], 5: ["Super-Seeds", "institute"] },
  barn: { 2: ["A Chicken Coop", "neighborhood"], 3: ["Hay & Feed", "hardware_store"], 4: ["A Pig & a Pony", "petting_zoo"], 5: ["Dolly the Sheep", "institute"] },
  scrapyard: { 2: ["A Cash Register", "corner_store"], 3: ["A Tow Truck", "gas_station"], 4: ["The Crane", "marina"], 5: ["The Car Crusher", "mall"] },
};

// Doubledoor's main line: take back the school a part at a time (the classrooms, the courtyard, the
// top floor last) — the tutorial — then a questline a tier, each ending in its raid.
export const SCHOOL_PARTS = [
  { id: "main:f1", title: "The First Floor", rooms: ["gym", "acrobatics", "cafeteria", "infirmary"], say: "We take the school back one floor at a time. The Lobby first: the Gymnasium, Acrobatics, the Cafeteria and the Nurse's Office. Report back to me down here when it's done.", reward: { materials: 10 } },
  { id: "main:f2", title: "The Classrooms", rooms: ["classroom:1", "classroom:2", "classroom:3", "classroom:4"], say: "Splendid! Now the classrooms upstairs — all four. Our teachers are trapped in there, and they are not patient people.", reward: { food: 20 } },
  { id: "main:yard", title: "The Courtyard", rooms: ["farm", "barn", "scrapyard"], say: "Now the courtyard: the Farm, the Barn and the Scrapyard. Food and scrap — we cannot hold out long without either.", reward: { materials: 25 } },
  { id: "main:f3", title: "The Facilities", rooms: ["research", "crafting", "radio"], say: "The top floor next: the Research Room, the Crafting Room and the Radio Station. Mind the wires.", reward: { materials: 15, research: 10 } },
  // the last: him (game.js startBossBattle)
  { id: "main:office", title: "The Headmaster's Office", rooms: ["headmaster"], boss: "grimwald", say: "One room is left. My office. When this began, I locked someone in there — Gellert Grimwald, headmaster before me, and once the dearest friend I had. Take every student we have. It is time.", reward: { materials: 30, research: 20 } },
];
const MAIN_LINE = [
  ...SCHOOL_PARTS,
  { id: "main:t1", tier: 1, title: "The Neighbourhood", say: "Some of our staff have errands close to home. Speak to them — then the City Mall awaits.", reward: { food: 30, materials: 30 } },
  { id: "main:t2", tier: 2, title: "Across Town", say: "Further out, then. Our friends need you across town — and the General Hospital needs emptying.", reward: { food: 40, materials: 40, medicine: 10 } },
  { id: "main:t3", tier: 3, title: "The Far Side", say: "The far side of the city. Help them there, and the Military Base will be within reach.", reward: { materials: 60, research: 20 } },
  { id: "main:t4", tier: 4, title: "The Edge of the City", say: "The edge of the city — and the Research Institute, where all of this began. Pick a card… any card.", reward: { materials: 80, research: 40 } },
];

export const placeName = (id) => (LOCATIONS.find((l) => l.id === id) || LANDMARKS.find((l) => l.id === id))?.name || id;
const tierOf = (placeId) => poiTier(LOCATIONS.find((l) => l.id === placeId));
// The NPC who runs a room, by its room key ("gym", "classroom:1", "farm"…).
export const ROOM_KEY_NPC = Object.fromEntries(Object.entries(ROOM_NPC).filter(([post]) => post !== "headmaster").map(([post, npc]) => [postRoomKey(post), npc]));
const upgradeQuestId = (key, level) => `up:${key}:${level}`;
const mainStarted = (state, id) => !!state.quests?.[id];

// ---------- the quests ----------
export const QUESTS = {};
MAIN_LINE.forEach((m, i) => {
  const steps = m.tier
    ? [...Object.keys(NPC_PLACE).filter((npc) => tierOf(NPC_PLACE[npc]) === m.tier).map((npc) => ({ kind: "quest", quest: `place:${npc}` })),
      { kind: "raid", raid: LANDMARKS.find((l) => l.tier === m.tier).id }]
    : m.boss ? [{ kind: "boss", boss: m.boss }] : m.rooms.map((room) => ({ kind: "room", room }));
  QUESTS[m.id] = { ...m, giver: "doubledoor", steps, needs: (state) => i === 0 || state.quests?.[MAIN_LINE[i - 1].id] === "done" };
});
for (const [npc, place] of Object.entries(NPC_PLACE)) {
  const tier = tierOf(place);
  QUESTS[`place:${npc}`] = {
    id: `place:${npc}`, giver: npc, tier, title: placeName(place), say: PLACE_ASK[npc],
    steps: [{ kind: "clear", place }], reward: { food: 10 * tier, materials: 10 * tier },
    needs: (state) => mainStarted(state, `main:t${tier}`),
  };
}
for (const [key, items] of Object.entries(UPGRADE_ITEMS)) {
  for (const [lv, [name, where]] of Object.entries(items)) {
    const level = Number(lv);
    QUESTS[upgradeQuestId(key, level)] = {
      id: upgradeQuestId(key, level), giver: ROOM_KEY_NPC[key], room: key, level, title: name,
      say: `Bring me ${name} from the ${placeName(where)}, and this room can be level ${level}.`,
      steps: [{ kind: "item", item: upgradeQuestId(key, level), place: where }, { kind: "upgrade", room: key, level }],
      upgrade: true, // done by the upgrade itself (no handing in)
      // offered once Doubledoor's questline for that tier has started, at the level before
      needs: (state) => mainStarted(state, `main:t${level - 1}`) && roomLevel(state, key) === level - 1 && !isBoarded(state, key),
    };
  }
}

// ---------- where they stand ----------
const facts = (state) => (state.questFacts ||= { cleared: {}, items: {} });

export function stepDone(state, step) {
  switch (step.kind) {
    case "room": return !isBoarded(state, step.room);
    case "quest": return state.quests?.[step.quest] === "done";
    case "clear": return !!facts(state).cleared[step.place];
    case "raid": return (state.raidKills?.[step.raid] || 0) > 0;
    case "item": return !!facts(state).items[step.item];
    case "upgrade": return roomLevel(state, step.room) >= step.level;
    case "boss": return !!facts(state).bosses?.[step.boss];
    default: return false;
  }
}
// "locked" (not offered yet), "available" (its NPC has it: ❗), "active", "ready" (to hand in: ❓)
// or "done".
export function questStatus(state, id) {
  const q = QUESTS[id];
  const s = state.quests?.[id];
  if (s === "done" || (q.upgrade && roomLevel(state, q.room) >= q.level)) return "done";
  if (s === "active") return q.steps.every((step) => stepDone(state, step)) ? "ready" : "active";
  return q.needs(state) ? "available" : "locked";
}
// An NPC's quests that aren't locked or done, the ones to hand in first.
const ORDER = { ready: 0, available: 1, active: 2 };
export function npcQuests(state, npc) {
  return Object.values(QUESTS).filter((q) => q.giver === npc)
    .map((q) => ({ q, status: questStatus(state, q.id) }))
    .filter((x) => x.status in ORDER)
    .sort((a, b) => ORDER[a.status] - ORDER[b.status]);
}
// The mark over an NPC's head: "ready" (❓) beats "available" (❗).
export function npcMark(state, npc) {
  const statuses = npcQuests(state, npc).map((x) => x.status);
  return statuses.includes("ready") ? "ready" : statuses.includes("available") ? "available" : null;
}
// Every quest you've taken and not handed in yet.
export const activeQuests = (state) => Object.keys(state.quests || {}).filter((id) => QUESTS[id] && ["active", "ready"].includes(questStatus(state, id)));

// ---------- doing them ----------
export function acceptQuest(state, id) {
  if (questStatus(state, id) !== "available") return false;
  (state.quests ||= {})[id] = "active";
  addLog(state, `📜 New quest from ${NPCS[QUESTS[id].giver].name}: ${QUESTS[id].title}.`);
  return true;
}
export function handInQuest(state, id) {
  if (questStatus(state, id) !== "ready") return false;
  state.quests[id] = "done";
  const reward = QUESTS[id].reward || {};
  for (const [res, n] of Object.entries(reward)) state.resources[res] = (state.resources[res] || 0) + n;
  addLog(state, `✅ Quest done for ${NPCS[QUESTS[id].giver].name}: ${QUESTS[id].title}.`);
  return true;
}

// A room can only go up a level with that level's item found (its NPC's quest).
export function upgradeItemFound(state, key) {
  const level = roomLevel(state, key) + 1;
  return level <= roomMaxLevel(key) && !!facts(state).items[upgradeQuestId(key, level)];
}
// The quest an upgrade is waiting on (for the Upgrade popup), or null at the top level.
export function upgradeQuest(state, key) {
  const level = roomLevel(state, key) + 1;
  return level <= ROOM_MAX_LEVEL ? QUESTS[upgradeQuestId(key, level)] || null : null;
}
// What the room's banner shows for the items found so far (levels 2…its level).
export const roomItems = (state, key) => Object.entries(UPGRADE_ITEMS[key] || {}).filter(([lv]) => roomLevel(state, key) >= Number(lv)).map(([, [name]]) => name);

// A run at a place (or a raid) went well: the items quests are looking for there are found, and a
// run that got through every room clears the place. Returns the names of the items found.
export function questFinds(state, placeId, { won, clearedAll }) {
  if (clearedAll) facts(state).cleared[placeId] = true;
  if (!won) return [];
  const found = [];
  for (const id of activeQuests(state)) {
    const step = QUESTS[id].steps.find((s) => s.kind === "item" && s.place === placeId);
    if (!step || facts(state).items[step.item]) continue;
    facts(state).items[step.item] = true;
    found.push(QUESTS[id].title);
    addLog(state, `📦 Found ${QUESTS[id].title} — ${NPCS[QUESTS[id].giver].name} needs it to upgrade the room.`);
  }
  return found;
}

// The places on the City Map a quest you've taken points to (marker only — you still scout there).
export function questTargets(state) {
  const out = [];
  for (const id of activeQuests(state)) {
    for (const step of QUESTS[id].steps) {
      if (stepDone(state, step) || !["clear", "item"].includes(step.kind)) continue;
      out.push({ place: step.place, quest: QUESTS[id], step });
    }
  }
  return out;
}

// A raid opens when its questline gets to it (every other step done) — or once the whole map is
// scouted, as before.
export function raidOpenByQuest(state, landmarkId) {
  const tier = LANDMARKS.find((l) => l.id === landmarkId)?.tier;
  const main = QUESTS[`main:t${tier}`];
  if (!main || !mainStarted(state, main.id)) return false;
  return main.steps.every((step) => step.kind === "raid" || stepDone(state, step));
}

// ---------- renown ----------
// What helping an NPC earns them: 2 for clearing their place, 1 for each upgrade of their room — 6
// in all. It's counted from the quests done, so there's nothing extra to keep. Each rank shows one
// more line of their lore; Friend gives a gift box, Trusted opens their apprentice slot, and Legend
// buffs their room (LEGEND_BUFF, applied in game.js).
export const RENOWN_RANKS = [
  { name: "Stranger", at: 0, unlock: "" },
  { name: "Friend", at: 2, unlock: "🎁 a gift box and a new lore line" },
  { name: "Trusted", at: 4, unlock: "their apprentice slot opens" },
  { name: "Legend", at: 6, unlock: "a big buff to their room and their secret" },
];
export const RENOWN_MAX = RENOWN_RANKS[RENOWN_RANKS.length - 1].at;
export const LEGEND_BUFF = {
  mopovich: "Gym training +50%", quinzwheel: "Acrobatics training +50%",
  frankenstitch: "Biology class +50%", quarkwell: "Physics class +50%", bickus: "History class +50%", seen: "Social Studies class +50%",
  grillsay: "+1 dish a day", brockbride: "Treatments heal +50%", whiteboard: "Research +25%", gyber: "Crafting fortification +50%",
  bulldog: "Recruit chance +5%", plowson: "Farm's own food +50%", cowper: "Barn's own goods +50%", scrapperson: "Scrapyard's own scrap +50%",
};
export const questRenown = (q) => (q.giver === "doubledoor" ? 0 : q.upgrade ? 1 : 2);
export const renownPoints = (state, npc) => Object.values(QUESTS)
  .filter((q) => q.giver === npc && questStatus(state, q.id) === "done").reduce((sum, q) => sum + questRenown(q), 0);
// 0 Stranger … 3 Legend (Doubledoor needs no winning over).
export function renownRank(state, npc) {
  if (!NPC_PLACE[npc]) return RENOWN_RANKS.length - 1;
  const points = renownPoints(state, npc);
  return RENOWN_RANKS.reduce((rank, r, i) => (points >= r.at ? i : rank), 0);
}
export const isLegend = (state, npc) => !!NPC_PLACE[npc] && renownRank(state, npc) === RENOWN_RANKS.length - 1;
// A room's apprentice slot opens once its NPC trusts you.
export const apprenticeOpen = (state, post) => renownRank(state, ROOM_NPC[post]) >= 2;
// The ranks reached since the last check (after a hand-in or an upgrade): logged, a gift box for
// each new Friend. Returns what to announce.
export function checkRenown(state) {
  const seen = (state.renownSeen ||= {});
  const news = [];
  for (const npc of Object.keys(NPC_PLACE)) {
    const rank = renownRank(state, npc);
    for (let k = (seen[npc] || 0) + 1; k <= rank; k++) {
      if (k === 1) (state.giftBoxes ||= []).push({ from: npc, day: state.day });
      const msg = `⭐ ${NPCS[npc].name} — ${RENOWN_RANKS[k].name}! ${k === 3 ? LEGEND_BUFF[npc] : RENOWN_RANKS[k].unlock}`;
      addLog(state, msg);
      news.push(msg);
    }
    seen[npc] = Math.max(seen[npc] || 0, rank);
  }
  return news;
}

// ---------- banter ----------
// An NPC is about once their room is open (Doubledoor always is).
export const npcPresent = (state, npc) => Object.entries(ROOM_NPC).some(([post, id]) => id === npc && !isBoarded(state, postRoomKey(post)));
// The next conversation an NPC has waiting: one they're in, not heard yet, with everyone in it about.
export function banterFor(state, npc) {
  const heard = state.banterSeen || [];
  return BANTER.find((b) => !heard.includes(b.id) && b.lines.some(([who]) => who === npc)
    && [...new Set(b.lines.map(([who]) => who))].every((who) => npcPresent(state, who))) || null;
}

// ---------- meeting the staff ----------
// What each NPC says the first time you talk to them (main.js plays it once), and their room in
// short — what it does, the stat it trains and the students it suits (ui.js roomGuide).
export const NPC_INTRO = {
  mopovich: ["Thank you. Is very messy in here.", "This is gym. Students lift, students get strong — STR.", "Strong students hit hard and carry much. Brawlers love it here."],
  quinzwheel: ["Ta-daaa! Finally, an audience!", "This is Acrobatics, puddin' — flips, dodges, DEX!", "Quick hands make the best Shooters. Hee hee!"],
  grillsay: ["About bloody time! Look at the state of this kitchen!", "Tired students rest here, and I cook ONE dish a day — it feeds the whole school's spirit.", "Bring me ingredients and nobody eats raw zombie. Probably."],
  brockbride: ["♪ Ding-ding! ♪ I'm so glad you're all right!", "Hurt students heal here — medicine makes it so much faster.", "Anyone bitten comes straight to me for quarantine. Antiviral serum cures them!"],
  frankenstitch: ["You saved my lab! And my specimens! Mostly.", "Biology builds CON: tougher bodies, more HP, faster healing.", "Tough students make splendid Tanks. Very hard to kill. I've checked."],
  quarkwell: ["Finally. You're 47 seconds late.", "Physics trains INT. Clever students make traps hit harder and find better gear.", "The smartest become Trappers. Obviously."],
  bickus: ["Ave! The legion is restored!", "History teaches WIS: a wise squad gets hurt less and brings home more loot.", "The wise become Medics. Even Rome needed doctors."],
  seen: ["Oh, sweethearts, thank you!", "Social Studies builds CHA — a charming leader makes the whole squad fight harder.", "My best talkers become Ralliers, and they find the most survivors."],
  whiteboard: ["Good. Now we can work.", "Students with INT turn their time in this lab into research.", "Research buys the tech tree and the radio's upgrades. Respect the chemistry."],
  gyber: ["Nice work. I'd have used a paperclip.", "Give me scrap and I'll turn it into fortification — walls that hold at night.", "Students with WIS help me plan. No guns needed."],
  bulldog: ["DALE! We're back on the air!", "Every day the radio might bring a survivor to our door.", "Upgrade it all the way and the military sends a helicopter. Mr. Townwide, baby!"],
  plowson: ["Right. The farm. How hard can it be?", "It grows food on its own — more with workers. Strong students dig best.", "Seeds from the city mean new crops. Don't tell Kaleb I said that."],
  cowper: ["Told you it'd be overrun.", "The animals give eggs, milk and mutton every day. More animals, more goods.", "Bring animals back from the city. And keep Jezza away from them."],
  scrapperson: ["Alright. Let's see what we've got.", "The yard turns up scrap every day, more with workers. Nimble hands find more.", "Scrap builds everything. I'll give you a fair price. Best I can do."],
};
// Each NPC's room: [what it's for, the subject it trains (or null)].
export const ROOM_GUIDE = {
  mopovich: ["Training STR", "PE"], quinzwheel: ["Training DEX", "Gymnastics"],
  grillsay: ["Resting stamina · a dish a day · stretching food", null], brockbride: ["Healing HP · quarantine for the infected", null],
  frankenstitch: ["Classes in CON", "Biology"], quarkwell: ["Classes in INT", "Physics"], bickus: ["Classes in WIS", "History"], seen: ["Classes in CHA", "SocialStudies"],
  whiteboard: ["Research for the tech tree", null], gyber: ["Fortification from scrap", null], bulldog: ["Recruits, then the rescue helicopter", null],
  plowson: ["Food and crops", null], cowper: ["Eggs, milk and mutton from the herd", null], scrapperson: ["Scrap every day", null],
};

// ---------- the first floor's cutscenes ----------
// Before each first-floor room in the tutorial: the students outside, hearing it; one of the class
// that room suits (`cls`) knows the place and goes in alone — a 1v1 that shows how their class
// fights (main.js) — then calls the rest in, and someone's still alive in there (the NPC reveal).
// Lines are [who, text]: "hero" (the volunteer) or "a" / "b" (two of the others). A team (`cls` a
// list) goes in together, lined up in one lane in that order — "hero2" is the second — against
// `zombie` (a walker if not said) at `strength`, with its own `lesson` instead of the class's.
// `scene`: the room's banner when it isn't named like the room. `cols`: each hero's lane (0-2, left
// to right; otherwise they line up in the middle one), `rows` their row (0 the front, 1 behind). `lanes`: the lane each zombie comes down, and
// `spawnAt` the turn it comes in ("call": once the reinforcement's in), `toughness` its HP ×. `reinforce`: only the first
// `go` heroes go in (at `hp` of their health); the rest wait at the door until `after` zombies are
// down — or there's `morale` to spend on them — then run in to their lane, with their own popup
// (`title`, `lines`, `points`); `lessonFirst`: the first ones' lesson pops up before the fight
// anyway. Lines say "hero", "hero2", "hero3"… in the order of `cls` ("any": any other student).
// `check`: before any fight, one hero (`who`) tries something — a `lock` (INT) or a `sneak` (DEX), at
// the expeditions' odds (EXPEDITION_NOISE); done, there's no fight and `afterQuiet` plays; failed, the
// fight's on (`alarm`: every zombie in it howled); `lurker`: the zombie in there, `asleep` or not. `reward`: resources for clearing it either way.
// `defenses`: found in there and placed on the board before the fight. `drag`: the lane the zombie's
// coming down — the player drags the hero into it before the fight can start. `assist`: the room's
// NPC (not met yet) joins in once a zombie's within `near` rows of the hero — a hit for `dmg` of its HP
// that holds it a turn, and a `shout`.
export const ROOM_CUTSCENES = {
  gym: {
    cls: "brawler", where: "Outside the Gymnasium", sound: ["*CLANG*", "*thud*", "grrrh…"],
    before: [["a", "Something's in there. I'm not going in."], ["hero", "I lifted in that gym every morning — I know it inside out."],
      ["hero", "Stay behind me. I'll check it out."]],
    after: [["hero", "It's clear! Come on in."], ["a", "Wait — listen… Someone is still alive in here!"]],
  },
  acrobatics: {
    cls: "shooter", lanes: [0], drag: 0, where: "Outside the Acrobatics Hall", sound: ["*creak*", "*rattle*", "hhhhh…"],
    before: [["a", "Something dead is swinging on the trapeze…"], ["hero", "I know where to stand in that hall for a clean shot."],
      ["hero", "Wait by the door. I'll take it from a distance."]],
    after: [["hero", "Got it! It's clear — come in."], ["a", "Did anyone else hear giggling? Someone is still alive in here!"]],
  },
  cafeteria: {
    cls: "tank", assist: { near: 1, dmg: 0.6, shout: "OI! NOT IN MY KITCHEN!" }, where: "Outside the Cafeteria", sound: ["*CRASH*", "*clatter*", "uuurgh…"],
    before: [["a", "Something's smashing up the kitchen…"], ["hero", "I worked the lunch line. Nothing hits harder than the lunch rush."],
      ["hero", "I'll go in first and take the hits."]],
    after: [["hero", "Clear! Barely a scratch on me."], ["a", "Who threw that pan?! Someone is still alive in here!"]],
  },
  infirmary: {
    cls: "medic", where: "Outside the Infirmary", sound: ["*crash*", "mmmrrh…", "*clink*"],
    before: [["a", "Something's moaning in the infirmary…"], ["hero", "I helped the nurse last term — I know my way around in there."],
      ["hero", "If I get scratched, at least I'm in the right room."]],
    after: [["hero", "It's clear — and the medicine cabinet's still full."], ["a", "Do you hear a little bell? Someone is still alive in here!"]],
  },
  "classroom:1": {
    cls: ["tank", "shooter"], zombie: "brute", strength: { hp: 90, damage: 8 }, scene: "classroom_Biology",
    where: "Outside Classroom 1", sound: ["*BOOM*", "*crunch*", "GRAAAH!"],
    before: [["a", "OMG, look at the size of that zombie!"], ["hero", "Nobody takes that thing on alone. We team up!"],
      ["hero2", "You hold the front — I'll shoot from right behind you."]],
    after: [["hero2", "It's down! Good thing you were in front."], ["a", "Shh — something moved under the desk… Someone is still alive in here!"]],
    lesson: {
      title: "🤝 Fighting as a team",
      points: ["A lane is one column: whoever stands in front takes the hits — whoever's behind is safe",
        "🛡 The Tank holds the front, 🏹 the Shooter fires over their shoulder",
        "💪 Brutes shrug off 40% of ranged damage — it takes both of them"],
    },
  },
  "classroom:2": {
    cls: "trapper", zombie: "runner", strength: { hp: 55, damage: 6 }, scene: "classroom_Physics",
    where: "Outside Classroom 2", sound: ["*skitter*", "*BANG*", "*skitter*"],
    before: [["a", "Something's darting around in there — it's so fast!"], ["hero", "Slow it down, and it's just a walker."],
      ["hero", "I'll net it from the doorway. Velocity: zero. Basic physics."]],
    after: [["hero", "Netted! Told you — it's all physics."], ["a", "Three knocks, then a name… from the cupboard? Someone is still alive in here!"]],
  },
  "classroom:3": {
    cls: ["brawler", "tank", "medic"], cols: [0, 2, 1], zombie: ["walker", "walker", "walker", "walker"], lanes: [0, 2, 0, 2], spawnAt: [1, 1, "call", "call"],
    strength: { hp: 30, damage: 7 }, scene: "classroom_History",
    where: "Outside Classroom 3", sound: ["*shuffle*", "grrh…", "*shuffle*"],
    before: [["hero", "Two of them? One each. Easy."], ["hero3", "You're both still hurt! You can barely stand."],
      ["hero2", "'Tis but a scratch. We've got this."]],
    reinforce: {
      go: 2, hp: 0.4, after: 2, title: "🩹 More of them!",
      lines: [["hero", "Got mine — but there's more coming!"], ["hero3", "Hold on — I'm coming in!"]],
      points: ["Stands in the middle lane, between the two of them", "Every turn, heals the most hurt student next to them — on either side", "Nobody to heal? Shoots down the middle lane for half a shot's damage"],
    },
    after: [["hero3", "Hold still, both of you. And next time, listen."], ["a", "Did the cupboard just say “Ave”? Someone is still alive in here!"]],
  },
  "classroom:4": {
    cls: ["rallier", "any"], cols: [1, 0], zombie: ["walker", "walker", "walker", "walker"], lanes: [1, 1, 0, 1], spawnAt: [1, 6, "call", "call"],
    strength: { hp: 26, damage: 5 }, scene: "classroom_SocialStudies", lessonFirst: true,
    where: "Outside Classroom 4", sound: ["*thump*", "uuhhh…"],
    before: [["hero2", "I can't go in there. I'm too scared."], ["hero", "Then I'll go first. Join me when you're ready."],
      ["hero", "Nobody has to be brave alone."]],
    lesson: {
      title: "📣 How Ralliers fight",
      points: ["📣 Makes 5 morale every 2 turns — and every kill adds 5",
        "Throws at the nearest zombie up to 3 squares in front",
        "Watch the Morale counter on the right"],
    },
    reinforce: {
      go: 1, morale: 20, title: "📣 Inspired!",
      lines: [["hero", "Come on — we're stronger together! You can do this!"], ["hero2", "…Okay. Okay! I'm coming!"]],
      points: ["20 morale — enough courage for someone to join the fight", "At the Night Watch, morale posts more defenders (10 each) and pays for night actions", "No Rallier? Only kills make morale — slowly"],
    },
    after: [["hero2", "We did it! I actually did it!"], ["a", "Listen… someone's clapping. Someone is still alive in here!"]],
  },
  // the courtyard: a new kind of zombie in each, and the pair that handles it
  farm: {
    cls: ["shooter", "medic"], zombie: ["spitter", "spitter", "walker", "spitter"], lanes: [1, 1, 1, 1], spawnAt: [1, 3, 5, 7], strength: { hp: 60, damage: 12 },
    where: "At the edge of the cornfield", sound: ["*hiss*", "hkkk-PTOO!", "*sizzle*"],
    before: [["a", "Something out there is spitting acid on the crops!"], ["hero", "It spits three squares. I shoot six. Do the maths."],
      ["hero2", "And whatever hits you, I'll fix. Stay in front."]],
    lesson: {
      title: "🤮 New zombie: the Spitter",
      points: ["🤮 Spits acid from up to 3 squares away — it can't be blocked",
        "But it's soft: ranged hits do 50% more — and 🏹 the Shooter reaches 6 squares",
        "🩹 The Medic behind patches up any acid that gets through"],
    },
    after: [["hero2", "Hold still — you're still fizzing."], ["a", "Who's that grumbling about the weather? Someone is still alive in here!"]],
  },
  barn: {
    cls: ["tank", "shooter"], cols: [1, 0], zombie: ["walker", "walker", "screamer", "walker"], lanes: [1, 1, 0, 1], spawnAt: [1, 3, 5, 14], toughness: [1, 1, 4, 1],
    strength: { hp: 30, damage: 7 },
    where: "Outside the Barn", sound: ["AAAIIIEEE!", "*thud*", "AAAIIIEEE!"],
    before: [["a", "Something's screaming in the barn — and the others are going wild."], ["hero", "I'll keep the big ones busy. You find the screamer."],
      ["hero2", "One shot. That's all it'll take."]],
    lesson: {
      title: "📢 New zombie: the Screamer",
      points: ["📢 Its howl makes every zombie within 2 squares hit 30% harder",
        "🏹 The Shooter in the next lane takes it out first",
        "🛡 The Tank holds the howling walkers until it's quiet"],
    },
    after: [["hero2", "Got the screamer! Did you feel them go soft?"], ["a", "Is someone in the stalls… naming the chickens? Someone is still alive in here!"]],
  },
  scrapyard: {
    cls: ["brawler", "medic"], zombie: ["brute", "brute"], lanes: [1, 1], spawnAt: [1, 11], strength: { hp: 40, damage: 6 },
    where: "The Scrapyard gate", sound: ["*THOOM*", "*CRUNCH*", "GRRAAH!"],
    before: [["a", "That's a Brute in there. Arrows bounce right off those."], ["hero", "Good thing I don't use arrows."],
      ["hero2", "When it winds up, it hits like a truck. I'm right behind you."]],
    lesson: {
      title: "💪 New zombie: the Brute",
      points: ["💪 Twice the HP, and ranged hits do 40% less — get up close",
        "It winds up a ⚠ Smash that lands next turn for 2.5× — a crit breaks it",
        "🩹 The Medic behind heals the 💪 Brawler through it"],
    },
    after: [["hero", "Two Brutes down — the whole courtyard's ours!"], ["a", "Someone's trying to sell me a hubcap… Someone is still alive in here!"]],
  },
  // the top floor: something new in each — a lock and the research tree, defenses, noise
  research: {
    cls: ["trapper", "brawler"], cols: [1, 1], rows: [1, 0], zombie: ["walker", "walker"], lanes: [1, 1], spawnAt: [1, 3], strength: { hp: 30, damage: 6 },
    reward: { research: 10 },
    where: "Outside the Research Room", sound: ["*snore*", "*blub*", "*snore*"],
    before: [["a", "One's asleep over the bench — next to his cabinet. “DO NOT TOUCH.”"], ["hero", "That's where he keeps his research. I can pick that lock."],
      ["hero2", "And if it wakes up, I'm right behind you."]],
    check: {
      kind: "lock", who: 0, title: "🔓 Whiteboard's cabinet", go: "🔓 Pick the lock", lurker: "walker", asleep: true,
      lines: ["A zombie snores over the bench, an arm's length from the cabinet.", "Pick the lock without a sound, and nobody has to fight."],
      points: ["🧠 INT picks locks: the better their Physics, the better the chance", "On expeditions it's the same — pick a side door for fewer zombies and less noise"],
      ok: [["hero", "Click. …Got it. Not a sound."], ["hero2", "Then let's finish that one before it wakes up."]],
      fail: [["hero", "*SNAP* — oh no."], ["hero2", "It's awake! And it brought a friend!"]],
    },
    lesson: {
      title: "🔊 The lock snapped",
      points: ["The noise woke two of them — so it's a fight after all", "💪 The Brawler holds the front, 🕸 the Trapper slows them from behind", "The research is still in the cabinet when it's over"],
    },
    afterQuiet: [["hero", "Research notes — a whole folder of them!"], ["a", "Someone in the supply closet just said “Say my name.” Someone is still alive in here!"]],
    after: [["hero", "The cabinet's open — the research is ours."], ["a", "Someone in the supply closet just said “Say my name.” Someone is still alive in here!"]],
  },
  crafting: {
    cls: ["shooter", "brawler"], cols: [1, 0], zombie: ["walker", "walker", "walker", "walker", "walker"], lanes: [1, 0, 1, 0, 1], spawnAt: [1, 2, 5, 6, 9], strength: { hp: 40, damage: 10 },
    defenses: ["sandbag_wall", "razor_wire"],
    where: "Outside the Crafting Room", sound: ["*clank*", "*bzzzt*", "*clank*"],
    before: [["a", "Look — sandbags, coils of wire…"], ["hero", "Mr. Gyber was building defenses before it all went wrong."],
      ["hero2", "Then we use them. Build first, fight second."]],
    lesson: {
      title: "🔨 Defenses",
      points: ["🧱 A Sandbag Wall blocks its lane — put it in front of the 🏹 Shooter, who shoots over it",
        "🔗 Razor Wire cuts and holds zombies still — put it in front of the 💪 Brawler",
        "Pick one, then a square on the board"],
    },
    after: [["hero", "The wall held — they never laid a finger on me."], ["a", "Someone in the storeroom said “I'd have used a paperclip.” Someone is still alive in here!"]],
  },
  radio: {
    cls: ["shooter", "brawler"], cols: [0, 1], zombie: ["screamer", "walker", "walker", "walker"], lanes: [0, 1, 1, 0], spawnAt: [1, 2, 4, 6], strength: { hp: 30, damage: 6 },
    where: "Outside the Radio Station", sound: ["*crackle*", "hhhhh…", "*crackle*"],
    before: [["a", "A Screamer — right next to the live microphone!"], ["hero", "If it screams into that mic, the whole school hears it. So it won't."],
      ["hero2", "You sneak. If it goes wrong, I'm coming in."]],
    check: {
      kind: "sneak", who: 0, alarm: true, title: "🤫 Sneak up on the Screamer", go: "🤫 Sneak up on it", lurker: "screamer",
      lines: ["The Screamer sways by the live microphone, its back to the door.", "Creep up and take it out silently — one wrong step and it screams to the whole school."],
      points: ["🔊 Noise: screams, shots and kills all carry — the louder it gets, the more zombies come", "🤫 DEX sneaks: the better their Gymnastics, the better the chance", "On expeditions, sneaking past a room keeps the noise down"],
      ok: [["hero", "…Got it. Not a peep."], ["hero2", "And the ON AIR light's still on. The whole school just heard… nothing. Nice."]],
      fail: [["hero", "*creak* — it turned around!"], ["hero2", "AAAIIIEEE — into the mic! Every zombie in the school heard that!"]],
    },
    lesson: {
      title: "📢 The whole school heard it",
      points: ["Its scream went out over every speaker: the zombies in here hit 30% harder for the whole fight", "And the noise brought more of them running",
        "🏹 Shoot the Screamer first — 💪 the Brawler holds the rest"],
    },
    afterQuiet: [["hero2", "The whole school just heard… nothing. Nice."], ["a", "Did someone in the booth just whisper “Dale”? Someone is still alive in here!"]],
    after: [["hero2", "Loud, but we won. Turn that microphone off!"], ["a", "Someone in the booth's yelling “DALE!” Someone is still alive in here!"]],
  },
};
// (the last: at his door with Doubledoor — "dd" in the lines — and then everyone, against him)
ROOM_CUTSCENES.headmaster = {
  boss: true, cls: ["tank", "rallier", "medic"], scene: "headmaster", where: "Outside the Headmaster's Office", title: "The Headmaster's Office", sound: ["*THOOM*", "hhhhh…", "*crackle*"],
  before: [["dd", "Behind that door is Gellert Grimwald — headmaster before me, and my dearest friend. When he turned, I locked him in."], ["hero", "Then we'll finish it for you. All of us — together."],
      ["dd", "Take the school's spirit with you. When morale runs high, spend it: fire, a medic's kit, a rallying cry."]],
  lesson: {
    title: "🧙 Gellert Grimwald, the Dark Headmaster",
    points: ["Place your 🧱 walls and 🔗 wire, and drag students where you want them",
        "⚡ He hexes a lane — next turn a bolt hits the first thing in it (a wall takes it for you)",
        "😊 Spend morale on 🔥 Molotov, 🩹 Patch Up and 🔔 Rally — the buttons on the right"],
  },
  after: [["dd", "Goodbye, old friend. Rest now."], ["dd", "The school is ours again — every room of it. I could not be prouder of you all."]],
};
// How each class fights, in short — the popup before a cutscene's 1v1.
export const CLASS_LESSON = {
  brawler: ["Stands in the front row and hits the zombie on the square in front", "Hits hardest up close — STR puts weight behind every swing", "Heavy armour soaks up the bites"],
  shooter: ["Fires at the nearest zombie in their lane, up to 6 squares away", "Kills them before they get close — DEX means more hits and more dodges", "Light armour: keep them behind the front row"],
  tank: ["+50% HP: holds the lane so nothing gets past", "Only a weak hit on the square in front — the wall, not the sword", "CON makes them tougher still"],
  medic: ["Heals the most hurt student next to them every turn", "Nobody to heal? Fires down the lane for half a shot's damage", "WIS makes the healing stronger — keep them in the middle"],
  trapper: ["Fires at the nearest zombie in their lane, up to 5 squares away, for half a shot's damage", "Every hit slows it to half speed for 3 turns — even a 💨 Runner", "Light armour: keep them behind the front row — INT makes their traps hit harder"],
  rallier: ["Makes morale every 2 turns for the squad's night actions", "Throws at the nearest zombie up to 3 squares in front", "CHA makes the whole squad fight harder"],
};
