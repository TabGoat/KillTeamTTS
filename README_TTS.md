Kill Team TTS — Mod skeleton

Files added:
- Global.lua: main mod script (turn flow, AI hooks)
- board.lua: board object script (deployment, objectives)
- unit.lua: per-unit script (state, damage, death)
- mod_manifest.json: simple manifest listing files

How to test in Tabletop Simulator:
1. In TTS, create a new mod/table and open the Scripting Editor.
2. Paste Global.lua into the Global script slot, and paste board.lua/unit.lua into object scripts or attach objects and assign their scripts.
3. Include ai.lua in Global or load it as a module; ensure AI.initialize(team) is called on game start.
4. Click Start Game to spawn/setup prototype flow. This skeleton uses a simplified zone-based model and requires integration to move actual objects.

Next steps I can perform:
- Flesh out movement, pathing, and object translations for actual TTS object GUIDs.
- Wire AI decisions to object moves/attacks (translate AI.executeAction into TTS calls).
- Create sample models.json and mission files.

To commit and push these changes to the branch, run: git add -A && git commit -m "Add TTS script skeleton" && git push origin copilot/import-killteam
