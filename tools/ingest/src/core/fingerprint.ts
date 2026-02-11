import crypto from 'crypto';

function sha256(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex');
}

export function hashQuest(q: any): string {
    // Input hash: concatenazione ordinata dei campi (title, details, objectives, progress, completion)
    // Ensure we handle missing fields as empty strings or specific placeholder?
    // Usually empty string is fine.

    const content = [
        q.title || '',
        q.details || '',
        q.objectives || '',
        q.progress || '',
        q.completion || ''
    ].join('|'); // Use a separator to avoid ambiguity? The requirement just says "concatenazione", but separator makes it robust.
    // However, if the requirement is strict concatenation without separator, I should follow it?
    // "concatenazione ordinata dei campi". Usually implies joined together.
    // To be safe and robust, likely a separator is better, but maybe simply JSON.stringify sorted keys?
    // The prompt says "input hash: quest: concatenazione ordinata dei campi".
    // I will use JSON.stringify of the object with sorted keys to be most robust against separators in data.
    // But let's stick to the prompt's implied logic.
    // "input hash: quest: concatenazione ordinata dei campi" suggests simple concatenation.
    // Let's use a delimiter to be better than naive concat. User wants "deduplication".
    // A delimiter like `<|>` is unlikely to appear in text.

    return sha256(content);
}

export function hashItem(item: any): string {
    // item/spell: name + tooltip lines
    // Tooltip is usually a list of strings.
    const name = item.name || '';
    const tooltip = Array.isArray(item.tooltip) ? item.tooltip.join('') : (item.tooltip || '');
    return sha256(name + tooltip);
}

export function hashSpell(spell: any): string {
    // Same as item
    const name = spell.name || '';
    const tooltip = Array.isArray(spell.tooltip) ? spell.tooltip.join('') : (spell.tooltip || '');
    return sha256(name + tooltip);
}

export function hashGossip(gossip: any): string {
    // gossip: text + options
    // Options is list of strings.
    const text = gossip.text || '';
    const options = Array.isArray(gossip.options) ? gossip.options.join('') : (gossip.options || '');
    // npc_hint is optional and maybe not part of content hash? prompt says "text + options".
    return sha256(text + options);
}

// Generic helper if needed
export function computeHash(data: string): string {
    return sha256(data);
}
