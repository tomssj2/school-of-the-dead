// Test shortcuts for developing the game (main.js exposes them as window.schoolDev on localhost;
// the /max and /min project commands run them). Nothing here saves — the player's Save does.
import * as G from "./game.js";
import { makeCharacter } from "./characters.js";
import { CLASSROOM_IDS, PRODUCERS } from "./data.js";

// Every room and facility to the top level, and every slot filled: teachers in every post,
// every classroom seat, training, resting, beds, outside workers, plots and pens. Hires whoever is
// needed. Scrap is put back afterwards, so only the rooms change.
export function maxOutSchool(state) {
  const scrap = state.resources.materials;
  state.boardedRooms = [];
  state.resources.materials = 1e9;
  for (const key of G.ROOM_KEYS) while (G.upgradeRoom(state, key));
  state.resources.materials = scrap;

  const hired = { teachers: 0, students: 0 };
  const hire = (role) => {
    const c = makeCharacter(role, Math.random() < 0.5 ? "M" : "F");
    state.characters.push(c);
    hired[`${role}s`]++;
    return c;
  };
  const alive = (role) => state.characters.filter((c) => c.alive && c.role === role && !c.infection);

  // teachers: every post up to its slots
  const posts = [...CLASSROOM_IDS.map((id) => `classroom:${id}`), "gym:PE", "gym:Gymnastics", "cafeteria", "infirmary", "research", "crafting"];
  for (const post of posts) {
    const slots = G.roomState(state, G.postRoomKey(post)).teacherCapacity;
    while (alive("teacher").filter((t) => t.post === post).length < slots) {
      const t = alive("teacher").find((x) => !x.post) || hire("teacher");
      if (!G.setTeacherPost(state, t.id, post)) break;
    }
  }

  // students: enough to fill every classroom seat, all seated
  const seats = CLASSROOM_IDS.reduce((sum, id) => sum + state.rooms.classrooms[id].seats.length, 0);
  while (alive("student").length < seats) hire("student");
  for (const c of alive("student").filter((x) => !x.seat)) {
    for (const id of CLASSROOM_IDS) {
      const idx = state.rooms.classrooms[id].seats.findIndex((x) => !x);
      if (idx >= 0 && G.assignSeat(state, c.id, id, idx)) break;
    }
  }

  // daily jobs: fill each room's student slots from whoever is free
  const busy = (c) => c.gymToday || c.infirmaryToday || c.restToday || c.farmToday || c.ranchToday || c.scrapyardToday || c.exploreTeam !== null || c.defending;
  const fill = (count, assign) => {
    for (let i = 0; i < count; i++) {
      const c = alive("student").find((x) => !busy(x));
      if (!c || !assign(c)) break;
    }
  };
  const count = (flag, value = true) => state.characters.filter((c) => c.alive && (value === true ? c[flag] : c[flag] === value)).length;
  fill(state.rooms.gym.studentCapacity - count("gymToday", "PE"), (c) => G.setGymToday(state, c.id, "PE"));
  fill(state.rooms.acrobatics.studentCapacity - count("gymToday", "Gymnastics"), (c) => G.setGymToday(state, c.id, "Gymnastics"));
  fill(state.rooms.cafeteria.studentCapacity - count("restToday"), (c) => {
    c.stamina = Math.round(c.maxStamina * 0.25);
    return G.setRestToday(state, c.id, true);
  });
  fill(state.rooms.infirmary.studentCapacity - G.infirmaryBedsUsed(state), (c) => {
    c.hp = Math.round(c.maxHp * 0.5);
    return G.setInfirmaryToday(state, c.id, "heal");
  });
  fill(state.rooms.farm.studentCapacity - count("farmToday"), (c) => G.setFarmToday(state, c.id, true));
  fill(state.rooms.ranch.studentCapacity - count("ranchToday"), (c) => G.setRanchToday(state, c.id, true));
  fill(state.rooms.scrapyard.studentCapacity - count("scrapyardToday"), (c) => G.setScrapyardToday(state, c.id, true));

  // plots and pens: plant or pen something in every empty one
  for (const facility of ["farm", "ranch"]) {
    const kinds = Object.keys(PRODUCERS).filter((id) => PRODUCERS[id].facility === facility);
    state.plots[facility].forEach((plot, i) => {
      if (!plot.id) Object.assign(plot, { id: kinds[i % kinds.length], growth: 0 });
    });
  }

  return {
    levels: "all rooms at level 5",
    teachers: alive("teacher").length,
    students: alive("student").length,
    hired,
  };
}

// Quarantines `n` students (not already infected) with 1-5 days left, to test how it looks.
export function infectStudents(state, n = 3) {
  const picked = state.characters
    .filter((c) => c.role === "student" && c.alive && !c.infection && !c.infirmaryToday)
    .slice(0, n);
  picked.forEach((c, i) => {
    G.infect(state, c, "was bitten (test)");
    c.infection.dueDay = state.day + (i % 5);
  });
  return `${picked.length} student${picked.length === 1 ? "" : "s"} quarantined · ${G.infectedChars(state).length} in quarantine`;
}

// Clears the Radio Station's boards and builds its first `stage` upgrades for free (5 = satellite
// communications, which sends for the helicopter).
export function buildRadio(state, stage = 5) {
  state.boardedRooms = (state.boardedRooms || []).filter((k) => k !== "radio");
  const saved = { ...state.resources };
  state.resources.materials = state.resources.research = 1e6;
  while (G.radioStage(state) < stage && G.buildRadioUpgrade(state));
  state.resources.materials = saved.materials;
  state.resources.research = saved.research;
  return `Radio Station at ${G.radioStage(state)}/5${state.rescue ? ` · helicopter lands on day ${state.rescue.day}` : ""}`;
}
