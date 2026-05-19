-- ai.lua
-- Prototype AI module for Kill Team-like TTS play.

local AI = {}

-- In-memory AI state
local state_internal = { team = nil }

local DIFFICULTY = {
  Easy = { reaction_time = 1.5, aggression = 0.35, accuracy = 0.7, lookahead = 0 },
  Medium = { reaction_time = 1.0, aggression = 0.6, accuracy = 0.85, lookahead = 1 },
  Hard = { reaction_time = 0.6, aggression = 0.85, accuracy = 0.95, lookahead = 2 },
}

local function safe_distance_fn(state)
  if state and state.zone_dist and type(state.zone_dist) == "function" then
    return state.zone_dist
  else
    return function(a,b) return math.abs(a-b) end
  end
end

local function shuffle(t)
  for i = #t, 2, -1 do
    local j = math.random(i)
    t[i], t[j] = t[j], t[i]
  end
  return t
end

local function scoreAction(unit, action, game_state, diff)
  local score = 0
  if action.type == "shoot" then
    local target = nil
    for _,u in ipairs(game_state.units) do if u.id == action.target_id then target = u; break end end
    if not target then return -1e6 end
    local dist = safe_distance_fn(game_state)(unit.zone, target.zone)
    local hit_prob = (unit.accuracy or 0.7) * diff.accuracy
    if dist > (unit.range or 3) then
      score = score - 50 - (dist - (unit.range or 3)) * 10
    else
      score = score + 30
    end
    local hp_factor = (target.hp or 1) / math.max(1, target.max_hp or 1)
    score = score + (1 - hp_factor) * 40
    local expected_damage = math.min(3, target.hp or 3)
    score = score + expected_damage * hit_prob * 20
    score = score + diff.aggression * 25
  elseif action.type == "move" then
    local enemies = {}
    for _,u in ipairs(game_state.units) do if u.team ~= unit.team then table.insert(enemies, u) end end
    if #enemies == 0 then return 0 end
    local dist_fn = safe_distance_fn(game_state)
    local avg_enemy_zone = 0
    for _,e in ipairs(enemies) do avg_enemy_zone = avg_enemy_zone + e.zone end
    avg_enemy_zone = avg_enemy_zone / #enemies
    local dist_before = dist_fn(unit.zone, avg_enemy_zone)
    local dist_after = dist_fn(action.to_zone, avg_enemy_zone)
    if diff.aggression > 0.5 then
      score = score + math.max(0, (dist_before - dist_after)) * 10
    else
      if (unit.hp or 0) / (unit.max_hp or 1) < 0.5 then
        score = score + 20
      else
        score = score + (dist_before - dist_after) * 5
      end
    end
  elseif action.type == "overwatch" then
    score = score + 10 + diff.lookahead * 10 + (diff.accuracy - 0.5) * 20
  elseif action.type == "use_ability" then
    score = score + 25
  else
    score = score - 10
  end
  local noise = (math.random() - 0.5) * 10 / math.max(0.1, diff.reaction_time)
  return score + noise
end

local function legalActions(unit, game_state)
  local actions = {}
  for _,u in ipairs(game_state.units) do
    if u.team ~= unit.team and u.hp > 0 then
      table.insert(actions, { type = "shoot", actor = unit.id, target_id = u.id })
    end
  end
  local zone = unit.zone or 1
  table.insert(actions, { type = "move", actor = unit.id, to_zone = zone })
  for d = -2, 2 do
    local tz = zone + d
    if tz >= 0 then table.insert(actions, { type = "move", actor = unit.id, to_zone = tz }) end
  end
  table.insert(actions, { type = "overwatch", actor = unit.id })
  table.insert(actions, { type = "use_ability", actor = unit.id, ability = "grenade" })
  return actions
end

local function decideForUnit(unit, game_state, diff)
  local actions = legalActions(unit, game_state)
  local best_action = nil
  local best_score = -1e9
  shuffle(actions)
  for _,act in ipairs(actions) do
    local s = scoreAction(unit, act, game_state, diff)
    if diff.lookahead and diff.lookahead > 0 then
      if act.type == "move" then
        local enemies = {}
        for _,u in ipairs(game_state.units) do if u.team ~= unit.team then table.insert(enemies, u) end end
        local dist_fn = safe_distance_fn(game_state)
        local exposure = 0
        for _,e in ipairs(enemies) do
          exposure = exposure + math.max(0, (3 - dist_fn(act.to_zone, e.zone)))
        end
        local hp_ratio = (unit.hp or 1) / (unit.max_hp or 1)
        s = s - exposure * (1 - hp_ratio) * 10
      end
    end
    if s > best_score then
      best_score = s
      best_action = act
    end
  end
  if not best_action and #actions > 0 then best_action = actions[1] end
  return { action = best_action, score = best_score }
end

function AI.initialize(team)
  state_internal.team = team
  math.randomseed(os.time())
  return true
end

function AI.decideTurn(game_state, difficulty)
  if type(difficulty) == "string" then difficulty = DIFFICULTY[difficulty] or DIFFICULTY.Medium end
  if not difficulty then difficulty = DIFFICULTY.Medium end
  local candidates = {}
  for _,u in ipairs(game_state.units or {}) do
    if u.team == state_internal.team and (u.ap or 0) > 0 and (u.hp or 0) > 0 then
      table.insert(candidates, u)
    end
  end
  if #candidates == 0 then return nil end
  local best_overall = nil
  for _,unit in ipairs(candidates) do
    local d = decideForUnit(unit, game_state, difficulty)
    if not best_overall or (d.score or -1e9) > (best_overall.score or -1e9) then
      best_overall = { unit_id = unit.id, action = d.action, score = d.score }
    end
  end
  if best_overall then best_overall.reaction_delay = difficulty.reaction_time or 0.8 end
  return best_overall
end

function AI.executeAction(action)
  if not action or not action.action then return { success=false, error="no action" } end
  local act = action.action
  local result = { success = true, executed = act, notes = {} }
  if act.type == "shoot" then
    local hitroll = math.random()
    result.hit_test = hitroll
  end
  return result
end

AI.DIFFICULTY = DIFFICULTY

return AI
