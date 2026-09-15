# School of the Dead — Web Build

A browser-based management sim: you run a school through a zombie apocalypse. Vanilla HTML/CSS/JS,
no build step, no dependencies beyond Node for the local static server.

Note: there is also a separate **Godot** build of this same concept at `Desktop/school_project` —
these are two independent implementations, not synced with each other.

## Running it

```
node server.js
```

Then open http://localhost:8080.

Or use `.claude/launch.json` with a Claude Code preview pane (`preview_start` with name
`school-of-the-dead`).

## What's working

- **Roster**: starts with 10 students + 3 teachers. Grades are now letter tiers (F/D/C/B/A/S, F
  common, S rare) with an underlying 0-100 number; each of the 6 subjects doubles as a stat:
  PE→STR, Gymnastics→DEX, Biology→CON, Physics→INT, History→WIS, Social Studies→CHA.
- **Students vs. teachers are different unit types now**:
  - Students roll grades on a low-weighted table, gain XP through classes/Gym/exploring, spend
    skill points (1/level) on a per-subject skill tree (6 paths × 5 nodes, grade-gated and
    strictly sequential — only reachable nodes are shown, the rest collapse into a "🔒 +N" chip),
    and can equip gear (weapon/armor/3 accessories) from a shared school armory for a combat
    stat bonus. They're the only ones who explore or defend.
  - Teachers roll one specialty subject at S rank and C-A on the rest (never lower), never
    explore/defend/level up, are capped at 20 in the school, and are rarer recruits (8%). Their
    card shows grades → teaching bonus (S=+20, A=+10, B=+5, C=+2) instead of raw stats/skills.
    Names always carry a gender honorific (Mr./Mrs.) that can't be stripped when renaming.
  - Every character has 1-3 random **traits** (Nerd, Flexible, Gym Member, Librarian, Hot,
    Farmer) that bump their starting grade in a matching subject and speed up XP gain there.
  - A pixel-art portrait is procedurally generated per character (deterministic from an id/seed);
    it can be re-rolled and the name can be edited (teachers keep their honorific; 20-char cap).
- **3 floors**:
  - Floor 1: main entrance (Turn 3 defense), **Gym** (10 student/3 teacher slots, no teacher
    required — one just adds a training-speed bonus), **Cafeteria** (10 student/3 teacher slots;
    everyone assigned recharges 50 stamina/day, cooks also heal HP and stretch food).
  - Floor 2: 4 generic classrooms ("Classroom 1"..."4"). Each is unassigned until its one teacher
    (max 1, not upgradeable) is posted, then takes on whichever of the 4 sit-down subjects that
    teacher is best qualified for, and reverts to unassigned if they leave. A staffed classroom
    gives every seated student a standing effective-grade bonus to that subject (not extra XP).
    Seat capacity (base 24, +1 row per upgrade) and Gym/Cafeteria slots are all upgradeable with
    materials, capped at 3 levels each.
  - Floor 3: Headmaster's Office (promote Level 6+ students to teachers if under the 20 cap, or
    expel anyone), Research/Crafting/Student Council (single-teacher utility posts).
- **Stamina**: everyone has 100. Students spend 20 on a Gym day or an expedition and are blocked
  at 0; teachers spend 20/day teaching a classroom and auto step-down (room reverts to
  unassigned) if they hit 0. Resting in the Cafeteria is the only way to recharge, always allowed.
- **3-turn days**: Classes (XP from home classroom, teacher-independent; optional Gym session for
  PE/Gymnastics XP), Exploration (up to 3 teams of 5 students raiding 8 city locations — no
  teachers, they stay home — STR/DEX drive success, CON/INT reduce casualties, WIS boosts loot,
  CHA finds recruits), Defense (assign student defenders against a nightly zombie wave that scales
  with day count; Crafting-room fortification adds a flat bonus).
- **Deskmates**: sitting together (and later fighting together) builds a bond; opposite-gender
  deskmates can become a couple at bond 6+, granting both a small stat buff.
- **Character card**: 4 tabs for students (Stats, Inventory, Skills, Social), 2 for teachers
  (Stats, Social — no gear/leveling for them). Stats tab shows grades as fixed-width columns
  (`Subject | Letter | Stat: value | bar`); a stat highlights (hover for a breakdown) when gear
  or a classroom bonus is boosting it. Social tab shows homeroom teacher/class, love interest, and
  top bonds — click any name to jump straight to their card.
- **Roster**: filterable (All/Students/Teachers), mini portraits instead of emoji, HP + Stamina
  columns.
- **Save/load** via localStorage; full event log.

## File map

```
index.html       page shell
style.css        all styling (dark theme, responsive-ish)
js/data.js       constants: subjects/stats/grade tiers, traits, items, skill tree, rooms, locations
js/characters.js character/item factories, grade/stamina/equipment/skill helpers
js/sprite.js     procedural pixel-art portrait generator (deterministic per seed)
js/game.js       game state + all turn resolution logic, room/seat/post/upgrade actions,
                 promote/expel/recruit, equip/skill purchase
js/ui.js         renders every view as HTML strings (topbar, 3 floors, turn panels, roster,
                 character card + its 4 tabs, log)
js/main.js       event delegation wiring UI actions to game.js, save/load + save migration, render loop
server.js        tiny dependency-free static file server (ES modules need http://, not file://)
```

## Known first-pass balancing (easy to retune — just constants in game.js/data.js)

- XP thresholds: `20 + grade * 1.5`
- Class XP gain: `4 + rand(0-2)` per student per day (classroom teacher gives a stat bonus
  instead of an XP boost; Gym teacher still gives an XP boost)
- Exploration success chance: `0.3 + (power - difficulty*15) / 100`
- Zombie wave strength: `22 + day*6 + rand(-5,5)`
- Promotion threshold: average grade ≥ 60 (level 6), and under the 20-teacher cap
- Teaching bonus by tier: S=+20, A=+10, B=+5, C=+2
- Room upgrade cost: `15 * (level+1)` materials, 3 levels max per capacity type

## Not built yet / ideas for next steps

- Room upgrades for Research/Crafting/Student Council (currently fixed at 1 teacher, no upgrade)
- More granular couple mechanics (shared buffs, breakup on death, jealousy, etc.)
- Tying exploration loot to armory items (gear is currently a fixed starter set only)
- Sound/animation polish
- Export/import save files (currently localStorage only, tied to one browser)
