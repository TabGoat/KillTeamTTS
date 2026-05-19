--

Title: Kill Team (Warhammer) — Tabletop Simulator Implementation (AI Opponent)
Version: 1.0
Author: (Design agent)
Date: 2026-05-19

1. Overview and Scope
- Goal: Provide a playable prototype of Warhammer Kill Team in Tabletop Simulator (TTS) that supports single-player vs AI.
- Scope (what will be simulated):
  - Individual models with stats (Move, WS/BS equivalents, Attack profiles, Wounds, Save, Skill/Abilities).
  - Movement, charge, shoot, fight (melee), overwatch/interrupts, reaction-like abilities.
  - Action economy per turn (activation per model or pooled activations depending on ruleset).
  - Dice resolution: D6 rolls for attacks, saves, special checks. Multiple-dice pools where original rules use automatic modifiers.
  - Morale checks aggregated per model or small squads.
  - Objective rules: deployment zones, objectives capture, scoring per round.
  - Damage, KO/wound tracking, criticals, and simple persistent injuries.
  - Abilities (profile-driven) with deterministic effects or resolved by dice when needed.
- Scope (what will be abstracted):
  - Complex LOS clip/geometry: LOS uses raycasts for prototype but will accept simplified LOS via token overlap or grid checks.
  - Detailed animation and complex physics: movement will snap along waypoints and use smooth translate; melee animations are abstracted into tokens and hit effects.
  - Continuous time, advanced morale cascades, and deep psychological effects are simplified: Morale is a single check per activation or after losses, not multi-step psychology.
  - Some rule exceptions and corner-case interactions will be resolved by deterministic precedence table rather than full rulebook text parsing.
- Deliverable minimal playable prototype: basic skirmish between two 5–10 model teams, AI capable of movement, targeting, attack resolution, simple ability use, objectives and win detection.

2. Simplified Rules Mapping (Simulate vs Abstract)
- Simulate:
  - Model stats: Move (inches), Range (inches), WS/BS as attack hit threshold, Strength/Skill as damage calculation, Wounds value, Save characteristic.
  - Activation: per model activation (activate model, move then act or act then move) with action choices: Move, Shoot, Melee (Charge then Fight), Overwatch (or Reaction).
  - Dice: Roll D6 for hits, wounds, saves; allow modifiers (+/-) as numbers.
  - Damage and wound tracking: tokens placed on model to represent wounds; removal at 0 = model removed.
  - Objectives: capture radius around objective token; control checks per turn.
  - Turn phases: Reinforce/discard not implemented initially. Start-of-turn, Activations, End-of-turn.
  - Simple abilities with explicit triggers (start/end of activation, on hit, on death).
- Abstract:
  - Complex multi-weapon firing sequences become per-weapon single resolution (e.g., combine into single shot pool).
  - Special terrain cover effects: use a simple cover token/flag that provides a fixed -1 to attack rather than spatial cover modifiers per angle.
  - Complex overlapping abilities resolved by explicit ordering rules: Active player's effect first, then passive effects; ties favor attacker.
  - Morale: single test triggered when X% of team lost in a round or when a key model dies. Roll D6 vs threshold derived from remaining models and leadership stat.
  - Charge/movement contest: distance-based check + D6 versus target threshold to determine successful charge; no complex facing rules.

3. Turn Sequence (simplified)
- Setup Phase:
  - Deployment (see section 7).
  - Place objectives.
  - Starting player determined by coin or preset.
- Round:
  1. Upkeep Phase: Resolve special start-of-round effects, status token refresh (cooldowns -1).
  2. Activations Phase:
     - Players alternate activating one model at a time (A then B, A then B...) until all activatable models used.
     - On activation, the model may:
       a) Move (up to Move distance; may end move in cover or objective zone).
       b) Take one Action (Shoot, Melee if in range, Interact with objective, Use a special ability).
       c) Optionally perform Overwatch instead of action (sets reaction state).
     - Charge mechanic: if moving into melee and ending within melee range, charge roll is required. If failed, may be pinned/lose action.
  3. Morale Check Phase:
     - After activations or when a trigger occurs, test squads/teams.
  4. End-of-Round Phase:
     - Score objectives, resolve end-of-round effects, remove temporary markers. Check victory conditions.
- Note: AI uses same activation sequence but decisions are made by AI flow.

4. Actions and Commands
- Move:
  - Move up to model's Move stat (inches). Movement is along chosen path; collisions cause stop ½ move remaining or standard push rule simplified to “cannot overlap models; must path around or stop.”
- Shoot:
  - Select a target within weapon range and LOS. Roll to-hit: roll D6, success if roll + modifiers >= hit_threshold (derived from BS/weapon profile).
  - Roll to-wound if hit requires it: compare attack Strength vs target Toughness equivalent or use fixed damage profile.
  - Defender performs saving roll: D6 + armor modifiers >= save threshold to negate.
  - Apply damage; reduce wounds or remove model.
- Melee (Charge then Fight):
  - Charge: moving model rolls D6 + mover modifiers vs target threshold (target stat + possible modifiers). Failure means model cannot fight or suffers penalty.
  - Fight: resolve melee attacks per attack profile; alternating attack order determined by Initiative stat (or attacker first).
- Overwatch:
  - Spend activation to set a reaction; when enemy moves into OW range and LOS, OW fires with reduced accuracy (e.g., -1), costing the reaction token.
- Interact (objective):
  - If within objective radius and meets preconditions, model performs interaction action to capture/score. May require an action and potentially a check.
- Use Special Ability:
  - Abilities are triggers or one-time use: can occur on activation, reaction, on kill, or passive. Abilities may have cooldowns or limited use per game.

5. Stats and Profiles
- Each model has a stat block (stored in JSON):
  - id (unique), name
  - Move (in inches, integer)
  - Range (in inches for primary weapon)
  - Accuracy (equiv to BS; base hit threshold e.g. 4 meaning 4+ on D6)
  - Damage Profile: {attacks: int, strength: int, damage_per_hit: int}
  - Wounds: int (current and max)
  - Save: D6 threshold (e.g., 5+)
  - Initiative (for melee order)
  - Abilities: array of named ability objects (see ability schema)
  - Point cost (for team-building)
- Ability schema:
  - id, name, type (passive/active/reaction/on-hit/on-death/start-of-turn/end-of-turn), effect (structured object), cost, cooldown, duration, target_scope (self/friend/enemy/area), trigger conditions.
- Example: "Suppressive Fire": reaction, triggers on enemy move within 6", inflicts -1 to move for next activation. Implementation: set 'suppressed' token with duration 1.

6. Abilities and Resolution Engine
- Abilities are resolved through a prioritized engine:
  - Each in-game event emits an event object (e.g., OnActivationStart, OnMoveEnterZone).
  - Abilities subscribe to events; when an event occurs, gather abilities that trigger and sort by priority:
    1. Active player abilities (player whose activation) with explicit "interrupt" flag.
    2. Passive abilities of units directly involved.
    3. Opponent passive abilities.
    4. Global abilities.
  - Ties resolved by deterministic rule: active player wins, else higher Initiative, else random small roll.
- Cooldowns and uses tracked as tokens/fields on model record.

7. Deployment and Objectives
- Deployment:
  - Two deployment modes supported initially: Standard opposing edge deployment or custom zones.
  - Each player alternately places models in deployment zone until all placed.
  - Deployment distances must obey minimum separation rules (e.g., 1").
- Objectives:
  - Objective tokens are circular markers with capture radius (e.g., 2").
  - Controlling rules: a model controls an objective if any portion of its base is within radius and no enemy model is also present. Contested objectives are neutral (no points).
  - Scoring: at End-of-Round, award points per objective controlled (configurable).
  - Special actions (interact) may be required to hack or claim powered objectives (trigger a 1-action check).

8. Damage, Wounds, and Morale
- Damage:
  - When hit and not saved, damage_per_hit is applied to target wounds. Overkill removed.
  - Critical hits: if ability or roll yields critical, damage may be multiplied or apply status effects.
- Wounds & Removal:
  - Wounds tracked numerically; when wounds <= 0 model removed and OnDeath triggers resolved.
- Morale:
  - Trigger conditions: team loses more than X% models in a round, or named leader dies.
  - Morale test: roll D6 + modifiers vs threshold equal to 4 + (models_lost/2) or custom formula.
  - Fail results: pinned (skip next activation), retreat move (automated move away), or casualty based on severity.
- Simplification note: Morale uses a single aggregated threshold to avoid repeated checks.

9. Victory Conditions
- Standard victory modes supported in prototype:
  - Primary: Most objective points after N rounds (configurable, default 6).
  - Secondary: Eliminate opposing team (instant win).
  - Tertiary: Mission-based (kill key target).
- Tie-breaking:
  1. Compare objective points.
  2. Remaining models' point value.
  3. Random coin-flip.

10. Edge Cases, Rules Interaction, and Arbitration
- No hit/No target: if action target is removed before resolution, AI/player gets refunded action? (Design choice): Action consumes activation but allows immediate free re-target if within reaction rules.
- Simultaneous kills: both models die in same resolution — process OnDeath for both, then evaluate objectives/kill triggers.
- Infinite loops: abilities with mutual triggers are capped to one cascade depth or use cooldowns to prevent loops.
- Out-of-bounds movement: forbid moving models off-board; AI chooses alternative path or stops.
- Missing references: if ability references unknown stat or undefined string, engine logs error and treats ability as inert.

11. UI & UX Considerations (TTS)
- Custom UI panel to show model stats on selection (name, wounds, abilities, tokens).
- Floating tooltips for objectives, countdown of rounds, and turn indicator.
- Buttons/controls:
  - End Activation, Overwatch, Interact, Use Ability (for abilities needing player input).
  - Dice roller integrated: roll button shows result and message in chat.
- Chat logs should show event timeline for debugging and player clarity.

12. Data Storage & Format
- Model and ability data in JSON:
  - /data/models/*.json
  - /data/abilities/*.json
  - Decks/mission definitions in /data/missions/*.json
- Save states: JSON snapshot of board objects and token states.
- Asset locations:
  - /assets/models/*.fbx/.obj
  - /assets/textures/*.png
  - /assets/ui/*.png
- All assets must be named and versioned for prototyping.

13. Test Plan (basic)
- Unit tests for dice engine, damage application, ability triggers (scripted tests).
- Playtests: five scripted mission tests: basic ambush, objective hold, assassination, last man standing, contested capture.

14. Known Limitations
- No multi-level vertical terrain in prototype.
- LOS uses raycasts; complex partial-cover may be inaccurate.
- Abilities with complex chains might need manual arbitration.

--- AI Design Overview ---

1. Goals
- Provide three difficulty levels: Easy, Medium, Hard.
- AI must be deterministic enough for reproducible behavior on same seed, with configurable randomness.

2. High-level architecture
- AI runs per-activation decision flow. Components:
  - World State Evaluator: assesses map, threats, objectives, friendly and enemy model states.
  - Decision Engine: selects best action using heuristics and scoring function.
  - Action Planner: produces concrete action (path, target, ability usage).
  - Reaction Handler: resolves overwatch and reactions.
- Data structures:
  - Unit state cache with distance maps to all objectives and threats.
  - Threat map: aggregated attack potential grid.
  - Utility function returns numeric score for actions.

3. Difficulty Levels & Parameters
- Easy:
  - Aggression: low (0.3), prefers cover, targets nearest enemy or random within range.
  - Lookahead depth: 0 (greedy).
  - Accuracy perception: uses true hit probabilities but undervalues combos (-10% weight).
  - Randomness: high (coins flips in tie).
- Medium:
  - Aggression: medium (0.6), considers objectives moderately, will trade shots if favorable.
  - Lookahead depth: 1 (evaluate immediate opponent response heuristically).
  - Uses ability heuristics with moderate priority.
  - Randomness: moderate.
- Hard:
  - Aggression: adaptive (0.5–0.8 based on win probability), actively fights for objectives.
  - Lookahead depth: 2 (simulate own action and likely opponent responses).
  - Prioritization uses weighted utility for kills, objective control, and survival.
  - Randomness: low; uses stochastic tie-breakers only.
- Tunable parameters (in AI config):
  - aggression, risk_tolerance, objective_weight, kill_value_weight, preserve_leader_weight, move_cost_weight, cover_value, overwatch_value, randomness_scale.

4. Decision-making flow (per activation)
- Input: active_model_id
- Steps:
  1. Build candidate actions:
     - Moves: sample n reachable endpoints (e.g., 8 cardinal + objectives + cover + high-threat escape).
     - For each endpoint, generate possible Actions: Shoot targets in range, Overwatch, Interact Objective, Use Ability, Charge if in range.
  2. For each candidate, evaluate utility:
     - Utility = objective_value + kill_value + survival_value + ability_value - risk_penalty - move_cost
     - objective_value: points gained by moving/controlling objective
     - kill_value: estimated expected value of damage leading to kill (probability * point value)
     - survival_value: reduction in incoming threat after move (lower threat increases survival)
     - ability_value: special effects like stun or debuff are valued per config
     - risk_penalty: estimate of exposure to enemy OW or high-threat enemy (using threat map)
     - move_cost: movement distance * move_penalty
  3. For Medium/Hard: simulate opponent reaction heuristically for top-k candidate actions (k small e.g., 3). Compute expected utility after opponent reaction.
  4. Choose best action using softmax on utilities multiplied by randomness_scale (higher randomness => more exploration).
  5. Execute action: path find to endpoint using simple A* on navigation grid or direct straight-line movement subject to collisions.
  6. If action is multi-stage (e.g., move + shoot), after movement update world state and re-evaluate target (retarget if previous target removed).
- For abilities that require target choice or timing, include a sub-heuristic:
  - Prioritize using damaging finishers on targets with low Wounds that can be eliminated.
  - Use buff/debuff abilities when multiple friendly units will benefit within next 2 rounds (predict via lookahead).

5. Targeting heuristics
- Priority order (weighted):
  1. High-threat enemy (highest expected damage to us next turn).
  2. High-value enemy (leader, special weapon).
  3. Lowest-wounds target that can be eliminated (finishers).
  4. Objective blockers (enemy currently controlling objectives).
  5. Closest enemy if equal weight.
- When shooting: select target maximizing expected damage minus risk increase (if shooting out of cover increases risk dramatically, prefer safer target).
- Melee/Charge: attempt charge if kill probability >= charge_threshold or objective contesting required.

6. Ability use heuristics
- Offensive: use on targets where expected damage or debuff yields immediate increase in kill_value.
- Defensive: use to protect leader or high-value models when survive_probability drops below threshold.
- Utility: use to secure objectives when objective_weight high.
- Cooldown-aware: consider saving expensive abilities if predicted better situational use within next two turns.

7. Reaction and Overwatch
- AI sets overwatch when:
  - Opportunity to interrupt high-value enemy movement into objective zone, AND
  - survival_value of setting OW > survival_value of moving for action this activation.
- When handling enemy movement, AI resolves OW by chance to hit but uses full engine to apply damage.

8. Randomness & Tuning
- Randomness implemented via temperature parameter in softmax selection. Easy -> high temperature, Hard -> low temperature.
- Tuning parameters exposed in JSON config for live tweaking:
  - { aggression, risk_tolerance, objective_weight, kill_weight, leader_preservation, randomness_scale, lookahead_depth, candidate_move_count }
- Logging mode for debug: AI prints rationale for decisions (top 3 candidate scores) in chat.

9. Performance and Complexity
- To maintain performance in TTS (Lua environment has limits), use:
  - Small candidate sets (8–12).
  - Shallow lookahead (0–2).
  - Precomputed maps for distances and threat (recomputed on relevant changes only).
  - Use coroutines to spread heavy compute across frames if needed.

--- Asset List (Exact assets for prototype) ---

Directory layout (relative to project root):
- assets/models/
  - human_infantry_01.fbx (FBX recommended) — placeholder: human_infantry_01.obj acceptable
  - ork_grot_01.fbx
  - leader_commander_01.fbx
  - objective_marker.fbx (simple cylinder)
  - rubble_small.fbx (terrain)
  - cover_crate.fbx
  - NOTE: FBX preferred for TTS custom models; OBJ acceptable as fallback.
- assets/textures/
  - human_infantry_01_diffuse.png (2048x2048 PNG)
  - ork_grot_01_diffuse.png
  - objective_marker_diffuse.png (512x512)
  - token_wound.png (128x128)
  - token_overwatch.png (128x128)
  - token_status_suppressed.png
- assets/tokens/
  - wound_token.gltf or wound_token.obj (if 3D tokens preferred)
  - status_tokens.png (sprite sheet with states)
- assets/ui/
  - ui_panel_bg.png (1024x256)
  - button_end_activation.png (256x64)
  - icon_move.png, icon_shoot.png, icon_melee.png
  - dice_button.png
- assets/data/
  - models.json (JSON list of models and stat blocks)
  - abilities.json (definitions)
  - missions.json (mission templates)
- assets/sounds/ (optional)
  - sfx_shot.wav (mono 16-bit)
  - sfx_melee.wav
  - sfx_objective_claim.wav
- Packaging:
  - All assets should be under /assets; must be referenced by exact filenames in JSON.

Minimal placeholders to ship playable prototype
- One human model OBJ (human_infantry_01.obj) + 1 texture.
- One ork model OBJ + 1 texture.
- objective_marker.obj (simple cylinder) + 1 texture.
- token_wound.png, token_status.png
- UI images: ui_panel_bg.png, buttons.
- models.json and mission.json containing minimal team configurations.
- Total: ~10 files; formats: FBX/OBJ for models, PNG for textures/tokens, WAV for sounds (optional), JSON for data.

--- Implementation Plan & Milestones ---

Assumptions: Team of 1–2 developers / scripters familiar with TTS Lua modding and JSON. Estimates in developer-hours (DH) and calendar days (1 dev, 8hr/day baseline). All tasks include basic QA/playtest times.

Milestone 0 — Setup & Scaffolding (8 DH, 1.5 days)
- Initialize repository, folder structure.
- Add sample assets (placeholders).
- Add model/ability JSON schema and sample data.
- Setup TTS mod scaffold: Global script, UI panel placeholders.

Milestone 1 — Core Engine: Models, Stats, Dice Engine (20 DH, 3 days)
- Implement model data loading, selection, and UI stat display (6 DH).
- Implement dice engine and chat logging for rolls (4 DH).
- Implement wounds tracking and model removal (4 DH).
- Implement basic ability engine skeleton with event dispatch (6 DH).

Milestone 2 — Movement & Pathing + Action Resolution (24 DH, 4 days)
- Implement Move action and pathing (A* or straight-line with collision checks) (10 DH).
- Implement Shoot action & resolution pipeline (hit->wound->save->apply) (8 DH).
- Implement Melee/Charge simplified resolution (6 DH).

Milestone 3 — Objectives, Deployment, and Turn Flow (16 DH, 3 days)
- Implement deployment UI and placement rules (6 DH).
- Implement objective tokens, capture mechanics, and scoring (6 DH).
- Implement full round/turn flow and end-of-round scoring (4 DH).

Milestone 4 — Abilities & Morale (18 DH, 3.5 days)
- Flesh out ability types (passive, active, reaction) and sample abilities (12 DH).
- Implement morale checks and simplified results (6 DH).

Milestone 5 — AI (core) — Easy/Medium/Hard (30 DH, 5 days)
- Implement world state evaluator and threat map (6 DH).
- Implement candidate generation and evaluator (10 DH).
- Implement lookahead simulation (Medium/Hard) and action planner (8 DH).
- Integrate AI config parameters and debug logging (6 DH).

Milestone 6 — UI polish, tokens, and UX (12 DH, 2 days)
- Implement UI panels: model tooltip, turn tracker, buttons (8 DH).
- Integrate tokens and status icons, animations for hits (4 DH).

Milestone 7 — Asset polish & packaging (8 DH, 1.5 days)
- Replace placeholders if artists available; prepare asset bundles for TTS.
- Ensure model scale and colliders consistent.

Milestone 8 — Testing & Balancing (20 DH, 4 days)
- Playtest mission scenarios, tune AI parameters, balance stats.
- Fix edge case bugs, state recovery tests (save/load).
- Create recommended tuning presets for each difficulty.

Milestone 9 — Documentation & Release Prep (8 DH, 1.5 days)
- User instructions for installing mod, mission selection, and known issues.
- Developer notes on extension points for new abilities.

Total estimated effort: ~164 DH (approx 21 working days for 1 dev). With 2 developers, timeline ~10–12 working days.

Task breakdown with priorities:
- High priority: Core engine, movement, shooting, turn flow, AI base (Easy).
- Medium priority: Abilities, morale, UI polish.
- Low priority: Advanced AI lookahead/HARD tuning, complex abilities, art polish.

Integration & QA notes:
- Use in-game logging and "debug" mode to trace AI choices and abilities.
- Save game state for reproduceable bug reports and test cases.

--- Example Data Snippets (for implementers) ---
1) Model JSON (sample)
{
  "id":"human_gunner_01",
  "name":"Gunner",
  "move":6,
  "range":18,
  "accuracy":4,
  "attacks":1,
  "strength":3,
  "damage":1,
  "wounds":2,
  "save":5,
  "initiative":4,
  "abilities":["suppressive_fire"]
}

2) Ability JSON (sample)
{
  "id":"suppressive_fire",
  "name":"Suppressive Fire",
  "type":"reaction",
  "trigger":"OnEnemyMoveIntoRange",
  "effect":{"type":"apply_status","status":"suppressed","duration":1,"modifier":{"move":-1}},
  "cooldown":0
}

--- Operational Notes (DB updates and session files) ---
- The spec generation process attempted to mark the todo as in_progress via SQL:
  UPDATE todos SET status = 'in_progress' WHERE id = 'design-game-spec';
  (No local DB found; please run the SQL against your todos DB to mark progress.)

- On completion, run:
  UPDATE todos SET status = 'done' WHERE id = 'design-game-spec';
  (No local DB found; please run the above SQL against your todos DB to mark completion.)

- The spec.md content above should be inserted into session files or your tracking storage as required.
