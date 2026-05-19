-- Global.lua (TTS integration layer)
-- Place inside KillTeamTTS mod folder in Tabletop Simulator Global script.
-- This file maps AI decisions to TTS object actions (move, shoot->applyDamage, overwatch)

-- UnitsMap: try to load a mapping table from units_map.lua if available, otherwise use an empty template.
local UnitsMap = {}
local ok, m = pcall(dofile, 'KillTeamTTS/units_map.lua')
if ok and type(m) == 'table' then UnitsMap = m end

local function safeGetObject(guid)
  if not guid then return nil end
  local ok, obj = pcall(function() return getObjectFromGUID(guid) end)
  if ok then return obj end
  return nil
end

local function zonePosition(zone_id)
  if UnitsMap and UnitsMap.zones and UnitsMap.zones[zone_id] then
    local zoneGUID = UnitsMap.zones[zone_id]
    local z = safeGetObject(zoneGUID)
    if z and z.getPosition then return z.getPosition() end
  end
  -- fallback: map zone_id to a simple grid position
  return {x = zone_id * 2, y = 1, z = 0}
end

local function lookupUnitGUID(unit_id)
  if UnitsMap and UnitsMap.units and UnitsMap.units[unit_id] then return UnitsMap.units[unit_id] end
  return nil
end

local function applyDamageToUnit(unit_id, amount, source)
  local guid = lookupUnitGUID(unit_id)
  local obj = safeGetObject(guid)
  if not obj then
    print('applyDamage: object not found for unit ' .. tostring(unit_id))
    return false
  end
  if obj.call then
    pcall(function() obj.call('applyDamage', { amount = amount, source = source }) end)
    return true
  else
    print('applyDamage: object has no call() for ' .. tostring(unit_id))
    return false
  end
end

local function moveUnitToZone(unit_id, zone_id)
  local guid = lookupUnitGUID(unit_id)
  local obj = safeGetObject(guid)
  if not obj then
    print('moveUnit: object not found for unit ' .. tostring(unit_id))
    return false
  end
  local pos = zonePosition(zone_id)
  if obj.setPositionSmooth then
    pcall(function() obj.setPositionSmooth(pos) end)
    return true
  elseif obj.setPosition then
    pcall(function() obj.setPosition(pos) end)
    return true
  else
    print('moveUnit: object has no setPosition for ' .. tostring(unit_id))
    return false
  end
end

local function setOverwatch(unit_id, params)
  local guid = lookupUnitGUID(unit_id)
  local obj = safeGetObject(guid)
  if not obj then
    print('setOverwatch: object not found for unit ' .. tostring(unit_id))
    return false
  end
  if obj.call then
    pcall(function() obj.call('setStatus', { key = 'overwatch', value = true, duration = params and params.duration or 1 }) end)
    return true
  else
    print('setOverwatch: object has no call() for ' .. tostring(unit_id))
    return false
  end
end

-- Public: handle an AI result table returned by AI.decideTurn / AI.executeAction
-- Expected shape (prototype): { unit_id = 'u1', action = { type='shoot'|'move'|'overwatch', actor='u1', target_id='u2', to_zone=2 }, score=..., reaction_delay=..., hit_test=0.23 }
function handleAIActionResult(ai_result)
  if not ai_result then print('handleAIActionResult: nil result'); return end
  local act = ai_result.action or ai_result.executed or (ai_result and ai_result.action)
  if not act or not act.type then print('handleAIActionResult: no action info'); return end

  if act.type == 'move' then
    local ok = moveUnitToZone(act.actor or ai_result.unit_id, act.to_zone)
    print('AI move ->', ok and 'moved' or 'failed')

  elseif act.type == 'shoot' then
    -- Decide hit by consulting ai_result.hit_test (0..1) vs threshold in config or simple default
    local hit_prob = ai_result.hit_test or 0.5
    local threshold = (ai_result._hit_threshold or 0.5)
    if hit_prob <= threshold then
      local dmg = (ai_result._damage or 1)
      local applied = applyDamageToUnit(act.target_id, dmg, act.actor)
      print('AI shoot -> hit? ', applied)
    else
      print('AI shoot -> missed (hit_test=' .. tostring(hit_prob) .. ')')
    end

  elseif act.type == 'overwatch' then
    local ok = setOverwatch(act.actor or ai_result.unit_id, { duration = 1 })
    print('AI overwatch ->', ok and 'set' or 'failed')

  else
    print('AI action type not implemented: ' .. tostring(act.type))
  end
end

-- Expose utilities for manual testing
return {
  handleAIActionResult = handleAIActionResult,
  moveUnitToZone = moveUnitToZone,
  applyDamageToUnit = applyDamageToUnit,
  setOverwatch = setOverwatch,
  lookupUnitGUID = lookupUnitGUID,
  zonePosition = zonePosition,
}
