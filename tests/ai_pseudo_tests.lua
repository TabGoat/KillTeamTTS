-- ai_pseudo_tests.lua (pseudo-test harness)
local AI = require('ai')

math.randomseed(12345)

local function runScenario(name, game_state, difficulty)
  AI.initialize('blue')
  local decision = AI.decideTurn(game_state, difficulty)
  print('Scenario:', name)
  if decision then
    print('Decision: unit', decision.unit_id, '->', decision.action and decision.action.type or 'none')
  else
    print('Decision: nil')
  end
  return decision
end

local state1 = {
  units = {
    { id='a1', team='blue', zone=1, hp=10, max_hp=10, ap=2, range=3, accuracy=0.7 },
    { id='e1', team='red', zone=2, hp=5, max_hp=5, ap=2, range=2, accuracy=0.6 },
  }
}
runScenario('Easy single enemy in range', state1, 'Easy')

local state2 = {
  units = {
    { id='a1', team='blue', zone=5, hp=2, max_hp=10, ap=2, range=2, accuracy=0.6 },
    { id='e1', team='red', zone=1, hp=6, max_hp=6, ap=2, range=3, accuracy=0.7 },
  }
}
runScenario('Low HP far enemy', state2, 'Medium')

local state3 = {
  units = {
    { id='a1', team='blue', zone=2, hp=10, max_hp=10, ap=2, range=3, accuracy=0.9 },
    { id='e1', team='red', zone=3, hp=1, max_hp=5, ap=2, range=2, accuracy=0.5 },
    { id='e2', team='red', zone=6, hp=6, max_hp=6, ap=2, range=3, accuracy=0.6 },
  }
}
runScenario('Hard multiple enemies', state3, 'Hard')
