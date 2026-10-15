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

// Doubledoor's main line: take back the school a floor at a time (the courtyard last) — the
// tutorial — then a questline a tier, each ending in its raid.
export const SCHOOL_PARTS = [
  { id: "main:f1", title: "The First Floor", rooms: ["gym", "acrobatics", "cafeteria", "infirmary"], say: "We take the school back one floor at a time. The Lobby first: the Gymnasium, Acrobatics, the Cafeteria and the Nurse's Office. Report back to me down here when it's done.", reward: { materials: 10 } },
  { id: "main:f2", title: "The Classrooms", rooms: ["classroom:1", "classroom:2", "classroom:3", "classroom:4"], say: "Splendid! Now the classrooms upstairs — all four. Our teachers are trapped in there, and they are not patient people.", reward: { food: 20 } },
  { id: "main:f3", title: "The Facilities", rooms: ["research", "crafting", "radio"], say: "The top floor next: the Research Room, the Crafting Room and the Radio Station. Mind the wires.", reward: { materials: 15, research: 10 } },
  { id: "main:yard", title: "The Courtyard", rooms: ["farm", "barn", "scrapyard"], say: "Last, the courtyard: the Farm, the Barn and the Scrapyard. Then the school is ours again.", reward: { materials: 25 } },
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
    : m.rooms.map((room) => ({ kind: "room", room }));
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
