-- units_map.lua
-- Fill this mapping with real GUIDs from your TTS save. Example template.
return {
  units = {
    -- logical unit id -> TTS object GUID
    -- e.g. ['a1'] = 'abcd12', ['e1'] = 'efgh34'
  },
  zones = {
    -- zone id -> scripting zone GUID
    -- e.g. [1] = 'zoneguid1', [2] = 'zoneguid2'
  },
  tokens = {
    overwatch = nil,
    wound = nil,
    status = {},
  }
}
