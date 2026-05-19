-- Global.lua
-- TTS mod skeleton for Kill Team: turn flow, UI hooks, AI integration

function onLoad()
  self.createButton({label="Start Game", click_function="startGame", function_owner=self, position={0,0.2,0}, width=1500, height=400})
  self.createButton({label="End Turn", click_function="endTurn", function_owner=self, position={0,0.2,1}, width=1500, height=400})
  broadcastToAll("KillTeam TTS mod loaded. Use Start Game to begin.")
  -- require ai module if loaded as a Lua module in TTS
  if Global and Global.AI == nil and (ai ~= nil) then
    AI = ai -- if ai.lua is loaded into global environment
  end
end

-- Simple game state container
GameState = {
  turn_team = nil,
  round = 1,
  units = {}, -- list of unit tables {id, team, zone, hp, ap, ...}
  current_activation = nil,
}

function startGame(obj, player_clicker_color)
  broadcastToAll("Starting Kill Team game (prototype)")
  GameState.turn_team = "blue"
  GameState.round = 1
  -- load units from GUIDs/objects or spawn prototype tokens
  -- Integrator: populate GameState.units with objects' states
  updateUI()
  processAITurnIfNeeded()
end

function endTurn(obj, player_clicker_color)
  -- end the current player's activation/turn
  GameState.turn_team = (GameState.turn_team == "blue") and "red" or "blue"
  broadcastToAll("Turn passed to " .. GameState.turn_team)
  processAITurnIfNeeded()
end

function processAITurnIfNeeded()
  -- If it's an AI-controlled team, ask AI for decision and execute
  if GameState.turn_team == "red" then
    if AI == nil then broadcastToAll("AI module not available") return end
    local snapshot = buildStateSnapshot()
    local decision = AI.decideTurn(snapshot, "Medium")
    if decision and decision.action then
      broadcastToAll("AI decided: " .. (decision.action.type or "action"))
      local result = AI.executeAction(decision)
      -- Integrator should translate result.executed into object moves/attacks
      broadcastToAll("AI action executed (prototype)")
    else
      broadcastToAll("AI returned no action")
    end
  end
end

function buildStateSnapshot()
  -- Build a minimal snapshot for AI: units array and utility functions
  local snapshot = { turn_team = GameState.turn_team, units = {}, zone_dist = function(a,b) return math.abs(a-b) end }
  for i,u in ipairs(GameState.units) do
    table.insert(snapshot.units, { id=u.id, team=u.team, zone=u.zone, hp=u.hp, max_hp=u.max_hp, ap=u.ap, range=u.range, accuracy=u.accuracy })
  end
  return snapshot
end

function updateUI()
  -- update custom UI panels or scoreboard
end

-- Helper: register a unit into GameState (call from unit spawn scripts)
function registerUnit(unitTable)
  table.insert(GameState.units, unitTable)
  return #GameState.units
end

-- Helpers for saving/loading state
function onSave()
  return JSON.encode(GameState)
end

function onLoadSaved(state)
  if state ~= "" then
    local s = JSON.decode(state)
    if s then GameState = s end
  end
end
