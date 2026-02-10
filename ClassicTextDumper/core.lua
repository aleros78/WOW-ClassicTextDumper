local addonName, CTD = ...

-- Global DB reference (populated on ADDON_LOADED)
CTD.DB = nil

-- Defaults
local defaults = {
    quests = {},
    gossip = {},
    items = {},
    spells = {},
    meta = {
        version = "1.0",
        last_update = time(),
        client_version = GetBuildInfo()
    }
}

-- Event Frame
local frame = CreateFrame("Frame")
frame:RegisterEvent("ADDON_LOADED")
frame:RegisterEvent("PLAYER_LOGOUT")

frame:SetScript("OnEvent", function(self, event, arg1)
    if event == "ADDON_LOADED" and arg1 == addonName then
        if not ClassicTextDumperDB then
            ClassicTextDumperDB = defaults
        end
        CTD.DB = ClassicTextDumperDB
        
        -- Ensure tables exist (in case of old DB version)
        CTD.DB.quests = CTD.DB.quests or {}
        CTD.DB.gossip = CTD.DB.gossip or {}
        CTD.DB.items = CTD.DB.items or {}
        CTD.DB.spells = CTD.DB.spells or {}

        print("|cff00ff00ClassicTextDumper|r loaded. Type /ctd for stats.")
        self:UnregisterEvent("ADDON_LOADED")
    
    elseif event == "PLAYER_LOGOUT" then
        if CTD.DB and CTD.DB.meta then
            CTD.DB.meta.last_update = time()
        end
    end
end)

-- Debug Print
function CTD:Log(msg)
    -- Uncomment for verbose debug
    -- print("|cffff0000[CTD]|r " .. tostring(msg))
end

-- Helper: Clean text (remove colors, etc if needed, but requested RAW)
-- Keeping it raw as per instructions "estrarre testo EN grezzo"
function CTD:CleanText(text)
    if not text then return "" end
    return text  -- Returning raw text
end

-- Slash Commands
SLASH_CLASSICTEXTDUMPER1 = "/ctd"
SlashCmdList["CLASSICTEXTDUMPER"] = function(msg)
    local cmd = msg:lower()
    if cmd == "stats" then
        local qCount = 0; for _ in pairs(CTD.DB.quests) do qCount = qCount + 1 end
        local gCount = 0; for _ in pairs(CTD.DB.gossip) do gCount = gCount + 1 end
        local iCount = 0; for _ in pairs(CTD.DB.items) do iCount = iCount + 1 end
        local sCount = 0; for _ in pairs(CTD.DB.spells) do sCount = sCount + 1 end
        
        print("|cff00ff00ClassicTextDumper Stats:|r")
        print("  Quests: " .. qCount)
        print("  Gossip: " .. gCount)
        print("  Items:  " .. iCount)
        print("  Spells: " .. sCount)
    else
        print("Usage: /ctd stats")
    end
end

-- Export CTD table for other modules
_G[addonName] = CTD
