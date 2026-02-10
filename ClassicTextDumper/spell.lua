local addonName, CTD = ...

-- Hook GameTooltip for Spells
local function OnTooltipSetSpell(self)
    if not CTD.DB then return end

    local name, spellID = self:GetSpell()
    if not spellID then return end
    
    -- Consistency check
    if CTD.DB.spells[spellID] then return end
    
    local tooltipData = {}
    
    for i = 1, self:NumLines() do
        local line = _G[self:GetName() .. "TextLeft" .. i]
        if line then
            local text = line:GetText()
            if text and text ~= "" then
                table.insert(tooltipData, text)
            end
        end
    end
    
    CTD.DB.spells[spellID] = {
        name = name,
        tooltip = tooltipData
    }
    -- CTD:Log("Saved Spell: " .. spellID)
end

if TooltipDataProcessor and TooltipDataProcessor.AddTooltipPostCall then
    TooltipDataProcessor.AddTooltipPostCall(Enum.TooltipDataType.Spell, OnTooltipSetSpell)
else
    if GameTooltip:GetScript("OnTooltipSetSpell") then
        GameTooltip:HookScript("OnTooltipSetSpell", OnTooltipSetSpell)
    else
        GameTooltip:SetScript("OnTooltipSetSpell", OnTooltipSetSpell)
    end
end
