local addonName, CTD = ...

local frame = CreateFrame("Frame")
frame:RegisterEvent("QUEST_DETAIL")
frame:RegisterEvent("QUEST_PROGRESS")
frame:RegisterEvent("QUEST_COMPLETE")
frame:RegisterEvent("QUEST_LOG_UPDATE")

-- Helper to save quest data safely
local function SaveQuest(questID, data)
    if not questID or questID == 0 then return end
    if not CTD.DB then return end
    
    if not CTD.DB.quests[questID] then
        CTD.DB.quests[questID] = {}
    end
    
    local entry = CTD.DB.quests[questID]
    local changed = false
    
    for k, v in pairs(data) do
        if v and v ~= "" and entry[k] ~= v then
            entry[k] = v
            changed = true
        end
    end
    
    if changed then
        CTD:Log("Saved Quest: " .. questID)
    end
end

frame:SetScript("OnEvent", function(self, event, ...)
    -- Handle Quest Window Events
    if event == "QUEST_DETAIL" then
        local questID = GetQuestID()
        local title = GetTitleText()
        local details = GetQuestText()
        local objectives = GetObjectiveText()
        
        SaveQuest(questID, {
            title = title,
            details = details,
            objectives = objectives
        })
        
    elseif event == "QUEST_PROGRESS" then
        local questID = GetQuestID()
        local title = GetTitleText()
        local progress = GetProgressText()
        
        SaveQuest(questID, {
            title = title,
            progress = progress
        })
        
    elseif event == "QUEST_COMPLETE" then
        local questID = GetQuestID()
        local title = GetTitleText()
        local completion = GetRewardText()
        
        SaveQuest(questID, {
            title = title,
            completion = completion
        })
        
    elseif event == "QUEST_LOG_UPDATE" then
        -- Optional: Scan currently selected quest in log
        -- This helps capture quests without needing to visit the NPC again if they are in the log
        local selectionIndex = GetQuestLogSelection()
        if selectionIndex and selectionIndex > 0 then
            local title, _, _, _, _, _, _, questID = GetQuestLogTitle(selectionIndex)
            if questID and questID > 0 then
                local details, objectives = GetQuestLogQuestText(selectionIndex)
                SaveQuest(questID, {
                    title = title,
                    details = details, -- Note: Log text might differ slightly from NPC text in some versions, but usually it's the 'Description'
                    objectives = objectives
                })
            end
        end
    end
end)
