-- board.lua
-- Script intended for the board object: handles objectives, deployment, and simple helpers

function onLoad()
  -- Expose UI buttons for deployment and setup
  self.createButton({label="Deploy Sample Teams", click_function="deploySample", function_owner=self, position={0,0.2,0}, width=1600, height=400})
end

function deploySample()
  broadcastToAll("Deploying sample teams (prototype)")
  -- Example: spawn placeholders or position existing figurines
  -- Integrator: spawn prefabs or move objects by GUID
end

function getObjectives()
  -- Return list of objective objects (GUIDs or positions)
  return {}
end
