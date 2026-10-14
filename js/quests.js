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
import { NPCS } from "./npcs.js";
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

// Doubledoor's main line: take back the school, then a questline a tier, each ending in its raid.
const MAIN_LINE = [
  { id: "main:school", title: "Take Back the School", say: "Our school is still full of the dead, I'm afraid. Clear every boarded-up room — you'll find a few friends in there.", reward: { materials: 25 } },
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
    : Object.keys(BOARDED_ROOMS).map((room) => ({ kind: "room", room }));
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
