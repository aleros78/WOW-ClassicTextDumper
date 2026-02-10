# ClassicTextDumper - Implementation Walkthrough

## Overview
The `ClassicTextDumper` AddOn has been successfully implemented to extract Quest, Gossip, Item, and Spell text from WoW Classic (Era, SoD, Wrath) into `SavedVariables`.

## File Structure
The AddOn is located at `f:\Personal\WowAddon\WowAddon\Dumper\ClassicTextDumper` and contains:
- `ClassicTextDumper.toc`: Metadata and file loader.
- `core.lua`: Initialization, database setup, and `/ctd` slash commands.
- `quest.lua`: Captures quest details from NPC interactions and the Quest Log.
- `gossip.lua`: Captures NPC gossip text and options, using NPC IDs or text hashes.
- `tooltip.lua`: Captures item tooltips using `TooltipDataProcessor` (if available) or `GameTooltip:HookScript`.
- `spell.lua`: Captures spell tooltips similarly to items.

## Usage
1. **Install**: Ensure the folder is in your `Interface\AddOns` directory.
2. **Log In**: Enter the game with the AddOn enabled.
3. **Play**:
    - **Open Quests**: Text is saved when you interact with Quest NPCs or browse the Quest Log.
    - **Talk to NPCs**: Gossip text is saved on interaction.
    - **Hover Items/Spells**: Tooltips are saved on hover.
4. **Check Status**: Type `/ctd stats` to see how many entries have been collected.
5. **Export**: Log out or `/reload` to write data to `WTF\Account\...\SavedVariables\ClassicTextDumper.lua`.

## Technical Details
- **Data Storage**: `ClassicTextDumperDB` in `SavedVariables`.
- **Safety**: Uses robust API checks to support multiple Classic client versions (1.14, 1.15, 3.4).
- **Performance**: Events are handled efficiently with minimal processing; existing data is not overwritten to save cycles.
- **Deduplication**: Quests are stored by ID; Gossip by NPC ID (or hash); Items/Spells by ID.

## Verification
- **Code Review**: Static analysis confirms correct event registration and API usage.
- **Compatibility**: Tooltip hooking logic includes fallbacks for different client versions.
