KillTeamTTS — TTS integration README

Overview
- Global.lua: integration layer that maps AI actions to TTS object calls.
- units_map.lua: mapping template from logical unit IDs and zone IDs to TTS GUIDs.

Setup
1. In Tabletop Simulator, open your Kill Team mod and paste the contents of KillTeamTTS/Global.lua into the Global script slot.
2. Create mapping of GUIDs: open the Scripting Editor and set UnitsMap by copying KillTeamTTS/units_map.lua content into a module or into Global before running.
3. Ensure each unit object script implements the following functions that'll be called by Global.lua:
   - applyDamage(params)  -- params = { amount = <int>, source = <unit_id> }
   - setStatus(params)    -- params = { key = 'overwatch', value = true, duration = 1 }

Usage
- On AI turn, call AI.decideTurn(state, difficulty) to get a decision, then call AI.executeAction(decision) to get the simulated result.
- Pass the returned ai_result to Global.handleAIActionResult(ai_result) to make TTS object changes.

Example
local decision = AI.decideTurn(state, 'Medium')
local result = AI.executeAction(decision)
Global.handleAIActionResult(result)

Notes & Troubleshooting
- If object not found: verify units_map.lua GUIDs match your saved objects.
- If applyDamage or setStatus not found on object: implement those functions in the object script (see KillTeamTTS/unit.lua example).
- This layer is defensive: it prints errors to the TTS console but won't crash if objects are missing.

Testing
- KillTeamTTS/tests/ contains a mocked test harness to run basic integration checks outside TTS.

