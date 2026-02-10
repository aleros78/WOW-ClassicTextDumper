local addonName, CTD = ...

local frame = CreateFrame("Frame")
frame:RegisterEvent("GOSSIP_SHOW")

-- Simple hash function for text-based ID if CreatureID is unavailable
local function StringHash(text)
    local counter = 1
    local len = string.len(text)
    for i = 1, len, 3 do 
        counter = math.fmod(counter * 8161, 4294967279) +  -- 2^32 - 17: Prime!
            (string.byte(text, i) * 1677619)
    end
    return counter
end

frame:SetScript("OnEvent", function(self, event, ...)
    if event == "GOSSIP_SHOW" then
        if not CTD.DB then return end
        
        local text = GetGossipText()
        if not text or text == "" then return end
        
        -- Try to get NPC ID
        local guid = UnitGUID("npc")
        local key
        
        if guid then
            local type, _, server_id, instance_id, zone_uid, npc_id, spawn_uid = strsplit("-", guid)
            if npc_id then
                key = tonumber(npc_id)
            end
        end
        
        -- Fallback to hash if no NPC ID (e.g. some objects or special interactions) or simple name
        if not key then
            key = "HASH_" .. StringHash(text)
        end
        
        -- Get Options
        local options = {}
        -- GetGossipOptions returns a flat list: text1, type1, text2, type2... in Classic?
        -- API varies by client version. In newer Classic clients uses C_GossipInfo.GetOptions().
        -- For robust Classic Era/Wrath compatibility, we check for C_GossipInfo first, then fallback.
        
        if C_GossipInfo and C_GossipInfo.GetOptions then
            local gossipOptions = C_GossipInfo.GetOptions()
            for _, info in ipairs(gossipOptions) do
               table.insert(options, info.name) 
            end
        else
            -- Legacy API
            local available = { GetGossipOptions() } -- Returns text, icon, text, icon...
            -- Iterate by 2
            for i=1, #available, 2 do
                table.insert(options, available[i])
            end
        end

        -- Save
        if not CTD.DB.gossip[key] then
            CTD.DB.gossip[key] = {
                text = text,
                options = options,
                npc_name = UnitName("npc") -- Store usage context
            }
            CTD:Log("Saved Gossip: " .. key)
        else
            -- Deduplicate/Update if needed. For now assuming NPC ID is unique enough for the main text.
            -- If an NPC has multiple gossip states, we might need to hash the text as part of the key.
            -- To be safe and capture *all* variants, let's store by hash if the text is different.
            local existing = CTD.DB.gossip[key]
            if existing.text ~= text then
                -- Collision or same NPC different text.
                -- Create a composite key
                local subKey = key .. "_" .. StringHash(text)
                if not CTD.DB.gossip[subKey] then
                    CTD.DB.gossip[subKey] = {
                        text = text,
                        options = options,
                        npc_name = UnitName("npc"),
                        parent_id = key
                    }
                    CTD:Log("Saved Varient Gossip: " .. subKey)
                end
            end
        end
    end
end)
