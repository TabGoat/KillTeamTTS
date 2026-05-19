-- unit.lua
-- Per-unit script skeleton: attach to unit objects in TTS via Object scripting

UnitState = { id = nil, team = nil, hp = 1, max_hp = 1, ap = 1, zone = 0 }

function onLoad()
  -- read preset custom properties or use default
  if self.getTable("unitState") then
    UnitState = self.getTable("unitState")
  else
    self.setTable("unitState", UnitState)
  end
end

function applyDamage(amount)
  UnitState.hp = UnitState.hp - amount
  if UnitState.hp <= 0 then
    onDeath()
  else
    self.setTable("unitState", UnitState)
  end
end

function onDeath()
  broadcastToAll("Unit " .. (UnitState.id or "unknown") .. " died")
  self.destruct()
end

function getState()
  return UnitState
end
