-- ai_tts_integration_test.lua (mocked tests)
-- This test mocks TTS getObjectFromGUID and objects to verify Global functions call expected hooks.

-- Mock environment
local mocked = { called = {} }
local function makeMockObject(name)
  return {
    name = name,
    setPositionSmooth = function(pos) mocked.called[#mocked.called+1] = { fn='setPositionSmooth', name=name, pos=pos } end,
    call = function(fnName, params) mocked.called[#mocked.called+1] = { fn=fnName, name=name, params=params } end,
    getPosition = function() return { x=0,y=1,z=0 } end,
  }
end

-- Inject mocks
local objects = {
  ['GUID_A1'] = makeMockObject('a1'),
  ['GUID_E1'] = makeMockObject('e1'),
  ['ZONE_1'] = { getPosition = function() return { x=2,y=1,z=0 } end }
}
function getObjectFromGUID(g) return objects[g] end

-- Provide a UnitsMap the Global integration expects
UnitsMap = { units = { a1 = 'GUID_A1', e1 = 'GUID_E1' }, zones = { [1] = 'ZONE_1' } }

-- Load Global integration (relative path)
local G = dofile('KillTeamTTS/Global.lua')

-- Test move
mocked.called = {}
G.handleAIActionResult({ action = { type='move', actor='a1', to_zone = 1 } })
print('After move mocks:', #mocked.called, mocked.called[1] and mocked.called[1].fn)

-- Test shoot -> simulate hit
mocked.called = {}
G.handleAIActionResult({ action = { type='shoot', actor='a1', target_id='e1' }, hit_test = 0.1, _hit_threshold = 0.5, _damage = 2 })
print('After shoot mocks:', #mocked.called)

-- Test overwatch
mocked.called = {}
G.handleAIActionResult({ action = { type='overwatch', actor='a1' } })
print('After overwatch mocks:', #mocked.called)

-- Print recorded calls
for i,c in ipairs(mocked.called) do print(i, c.fn, c.name, c.params and (c.params.amount or c.params.key) or '') end
