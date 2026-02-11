import fs from 'fs';
import luaparse from 'luaparse';

// Type definitions for the extracted data structure
export interface LuaDB {
    quests?: Record<string, any>;
    items?: Record<string, any>;
    spells?: Record<string, any>;
    gossip?: Record<string, any>;
    meta?: Record<string, any>;
}

export function loadLuaFile(filePath: string): LuaDB {
    const content = fs.readFileSync(filePath, 'utf8');

    // Parse with scope to handle local variables if needed, though we expect a global assignment
    const ast = luaparse.parse(content, { comments: false, scope: true }) as luaparse.Chunk;

    const db: LuaDB = {};

    // We expect an assignment to 'ClassicTextDumperDB'
    // Or just a table constructor if it's a return statement?
    // SavedVariables usually look like: 'ClassicTextDumperDB = { ... }'

    for (const statement of ast.body) {
        if (statement.type === 'AssignmentStatement') {
            for (let i = 0; i < statement.variables.length; i++) {
                const variable = statement.variables[i];
                const init = statement.init[i];

                if (variable.type === 'Identifier' && variable.name === 'ClassicTextDumperDB') {
                    if (init.type === 'TableConstructorExpression') {
                        const extracted = parseTable(init);
                        if (extracted) {
                            Object.assign(db, extracted);
                        }
                    }
                }
            }
        }
    }

    return db;
}

function parseTable(node: luaparse.TableConstructorExpression): any {
    const result: any = {};

    // If it's an array-like table (implicit keys), we might want to handle it as array?
    // But Lua tables are mixed.
    // We'll treat everything as object, unless keys are sequential integers starting from 1?
    // The input data has [123] = { ... } which are integer keys but not necessarily sequential array.

    let isArray = true;
    let index = 1;

    for (const field of node.fields) {
        if (field.type === 'TableKeyString') {
            isArray = false;
            result[field.key.name] = parseValue(field.value);
        } else if (field.type === 'TableKey') {
            // Key is an expression, usually a literal
            const key = parseValue(field.key);
            if (typeof key !== 'number' || key !== index) {
                // If key is number but not sequential, or string
                isArray = false; // It's a map
            } else {
                index++;
            }
            result[key] = parseValue(field.value);
        } else if (field.type === 'TableValue') {
            // Implicit key
            result[index++] = parseValue(field.value);
        }
    }

    // If we want to return array for lists like tooltip lines?
    // User input example: tooltip = { "...", "..." } -> this is array-like.
    // But items = { [6948] = ... } -> this is map-like.
    // We should probably just return object/map for root keys, and array for pure lists.
    // Simple heuristic: if all keys are sequential integers 1..N, return array.

    if (isArray && Object.keys(result).length > 0) {
        // Check if keys are 1..N
        const keys = Object.keys(result).map(Number).sort((a, b) => a - b);
        if (keys.length > 0 && keys[0] === 1 && keys[keys.length - 1] === keys.length) {
            return Object.values(result);
        }
    }

    return result;
}

function parseValue(node: luaparse.Expression): any {
    switch (node.type) {
        case 'StringLiteral':
            if (node.value !== null) return node.value;
            // Fallback to raw and strip quotes if value is null
            const raw = (node as any).raw;
            if (raw && (raw.startsWith('"') || raw.startsWith("'"))) {
                return raw.substring(1, raw.length - 1);
            }
            return raw;
        case 'NumericLiteral':
            return node.value;
        case 'BooleanLiteral':
            return node.value;
        case 'NilLiteral':
            return null;
        case 'TableConstructorExpression':
            return parseTable(node);
        case 'UnaryExpression':
            if (node.operator === '-' && node.argument.type === 'NumericLiteral') {
                return -node.argument.value;
            }
            return null; // Ignore other expressions
        default:
            return null; // Ignore functions, etc.
    }
}
