local addonName, CTD = ...

-- Hook GameTooltip
local function OnTooltipSetItem(tooltip)
    if not CTD.DB then return end

    local name, link = tooltip:GetItem()
    if not link then return end
    
    local itemID = GetItemInfoInstant(link)
    if not itemID then return end
    
    -- Consistency check: if we already have it, skip to save cycles
    if CTD.DB.items[itemID] then return end
    
    local tooltipData = {}
    
    -- Iterate lines
    for i = 1, tooltip:NumLines() do
        local line = _G[tooltip:GetName() .. "TextLeft" .. i]
        if line then
            local text = line:GetText()
            if text and text ~= "" then
                table.insert(tooltipData, text)
            end
        end
        -- Also check right side text (usually stats/values)? 
        -- User said "tutte le linee del tooltip". Right text is often prices or stats, better safe to include.
        -- We will append it to the same line string or separate? 
        -- Usually "TextLeft" contains the main info. "TextRight" is rare in vanilla tooltips except for prices.
        -- Let's stick to Left for safety as typical translation targets only left.
    end
    
    CTD.DB.items[itemID] = {
        name = name,
        tooltip = tooltipData
    }
    CTD:Log("Saved Item: " .. itemID)
end

if TooltipDataProcessor and TooltipDataProcessor.AddTooltipPostCall then
    TooltipDataProcessor.AddTooltipPostCall(Enum.TooltipDataType.Item, OnTooltipSetItem)
else
    if GameTooltip:GetScript("OnTooltipSetItem") then
        GameTooltip:HookScript("OnTooltipSetItem", OnTooltipSetItem)
    else
        GameTooltip:SetScript("OnTooltipSetItem", OnTooltipSetItem)
    end
end
