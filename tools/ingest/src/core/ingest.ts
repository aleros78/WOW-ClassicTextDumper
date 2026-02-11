import { getDb, saveDb } from '../db/index.js';
import { loadLuaFile, LuaDB } from './loader.js';
import { normalizeObject } from './normalizer.js';
import { hashQuest, hashItem, hashSpell, hashGossip } from './fingerprint.js';

export interface IngestOptions {
  sourceName: string;
  clientFlavor: string;
  sourceLocale?: string;
  addonVersion?: string;
}

export async function ingestFile(filePath: string, options: IngestOptions) {
  const db = await getDb();

  // 1. Load and Normalize
  console.log(`Loading ${filePath}...`);
  const rawData = loadLuaFile(filePath);
  console.log(`Loaded ${filePath}. Categories:`, Object.keys(rawData).filter(k => (rawData as any)[k]));

  // Auto-fill options from meta if available
  const effectiveLocale = options.sourceLocale || (rawData.meta?.locale) || 'enUS';
  const effectiveVersion = options.addonVersion || (rawData.meta?.version) || null;

  // 2. Create Source entry
  const insertSourceStmt = db.prepare(`
    INSERT INTO sources (source_name, client_flavor, locale, addon_version)
    VALUES (?, ?, ?, ?)
  `);

  insertSourceStmt.run([
    options.sourceName,
    options.clientFlavor,
    effectiveLocale,
    effectiveVersion
  ]);
  insertSourceStmt.free();

  // Get the last inserted ID
  const sourceIdResult = db.exec('SELECT last_insert_rowid() as id');
  const sourceId = (sourceIdResult.length > 0 && sourceIdResult[0].values.length > 0)
    ? sourceIdResult[0].values[0][0] as number
    : null;

  // 3. Process each category
  if (rawData.quests) processQuests(db, rawData.quests, sourceId);
  if (rawData.items) processItems(db, rawData.items, sourceId);
  if (rawData.spells) processSpells(db, rawData.spells, sourceId);
  if (rawData.gossip) processGossip(db, rawData.gossip, sourceId);

  // Save database to disk
  saveDb();
}

function processQuests(db: any, quests: Record<string, any>, sourceId: number | null) {
  let count = 0;
  console.log(`Processing ${Object.keys(quests).length} quests...`);

  db.run('BEGIN TRANSACTION');
  try {
    for (const [idStr, rawQ] of Object.entries(quests)) {
      const id = Number(idStr);
      if (isNaN(id)) continue;

      const q = normalizeObject(rawQ);
      const hash = hashQuest(q);

      // Check if exists using prepared statement for safety with sql.js
      const checkStmt = db.prepare('SELECT content_hash FROM quests WHERE quest_id = ?');
      const existingRes = checkStmt.get([id]);
      const existing = existingRes ? existingRes : null;
      checkStmt.free();

      if (!existing) {
        const insertStmt = db.prepare(`
              INSERT INTO quests (quest_id, title_en, details_en, objectives_en, progress_en, completion_en, content_hash, last_source_id)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `);
        insertStmt.run([
          id,
          q.title || null,
          q.details || null,
          q.objectives || null,
          q.progress || null,
          q.completion || null,
          hash,
          sourceId
        ]);
        insertStmt.free();
      } else {
        if (existing.content_hash === hash) {
          const updateMetaStmt = db.prepare(`
                  UPDATE quests SET seen_count = seen_count + 1, last_seen_at = CURRENT_TIMESTAMP, last_source_id = ?
                  WHERE quest_id = ?
                `);
          updateMetaStmt.run([sourceId, id]);
          updateMetaStmt.free();
        } else {
          // Archive
          const archiveStmt = db.prepare(`
                  INSERT INTO quest_history (quest_id, title_en, details_en, objectives_en, progress_en, completion_en, content_hash, source_id)
                  SELECT quest_id, title_en, details_en, objectives_en, progress_en, completion_en, content_hash, last_source_id
                  FROM quests WHERE quest_id = ?
                `);
          archiveStmt.run([id]);
          archiveStmt.free();

          // Update
          const updateStmt = db.prepare(`
                  UPDATE quests SET 
                    title_en = ?, details_en = ?, objectives_en = ?, progress_en = ?, completion_en = ?, 
                    content_hash = ?, seen_count = 1, last_seen_at = CURRENT_TIMESTAMP, last_source_id = ?
                  WHERE quest_id = ?
                `);
          updateStmt.run([
            q.title || null,
            q.details || null,
            q.objectives || null,
            q.progress || null,
            q.completion || null,
            hash,
            sourceId,
            id
          ]);
          updateStmt.free();
        }
      }
      count++;
    }
    db.run('COMMIT');
  } catch (err) {
    db.run('ROLLBACK');
    throw err;
  }

  console.log(`Processed ${count} quests.`);
}

function processItems(db: any, items: Record<string, any>, sourceId: number | null) {
  let count = 0;
  console.log(`Processing ${Object.keys(items).length} items...`);

  db.run('BEGIN TRANSACTION');
  try {
    for (const [idStr, rawI] of Object.entries(items)) {
      const id = Number(idStr);
      if (isNaN(id)) continue;

      const i = normalizeObject(rawI);

      // Fallback for empty name
      if (!i.name && i.tooltip && i.tooltip.length > 0) {
        i.name = i.tooltip[0];
      }

      const hash = hashItem(i);
      const tooltipJson = JSON.stringify(i.tooltip || []);

      const checkStmt = db.prepare('SELECT content_hash FROM items WHERE item_id = ?');
      const existingRes = checkStmt.get([id]);
      const existing = existingRes ? existingRes : null;
      checkStmt.free();

      if (!existing) {
        const insertStmt = db.prepare(`
              INSERT INTO items (item_id, name_en, tooltip_en_json, content_hash, last_source_id)
              VALUES (?, ?, ?, ?, ?)
            `);
        insertStmt.run([id, i.name || null, tooltipJson || null, hash, sourceId]);
        insertStmt.free();
      } else {
        if (existing.content_hash === hash) {
          const updateMetaStmt = db.prepare(`
                  UPDATE items SET seen_count = seen_count + 1, last_seen_at = CURRENT_TIMESTAMP, last_source_id = ?
                  WHERE item_id = ?
                `);
          updateMetaStmt.run([sourceId, id]);
          updateMetaStmt.free();
        } else {
          const updateStmt = db.prepare(`
                  UPDATE items SET 
                    name_en = ?, tooltip_en_json = ?, content_hash = ?, 
                    seen_count = 1, last_seen_at = CURRENT_TIMESTAMP, last_source_id = ?
                  WHERE item_id = ?
                `);
          updateStmt.run([i.name || null, tooltipJson || null, hash, sourceId, id]);
          updateStmt.free();
        }
      }
      count++;
    }
    db.run('COMMIT');
  } catch (err) {
    db.run('ROLLBACK');
    throw err;
  }

  console.log(`Processed ${count} items.`);
}

function processSpells(db: any, spells: Record<string, any>, sourceId: number | null) {
  let count = 0;
  console.log(`Processing ${Object.keys(spells).length} spells...`);

  db.run('BEGIN TRANSACTION');
  try {
    for (const [idStr, rawS] of Object.entries(spells)) {
      const id = Number(idStr);
      if (isNaN(id)) continue;

      const s = normalizeObject(rawS);

      // Fallback for empty name
      if (!s.name && s.tooltip && s.tooltip.length > 0) {
        s.name = s.tooltip[0];
      }

      const hash = hashSpell(s);
      const tooltipJson = JSON.stringify(s.tooltip || []);

      const checkStmt = db.prepare('SELECT content_hash FROM spells WHERE spell_id = ?');
      const existingRes = checkStmt.get([id]);
      const existing = existingRes ? existingRes : null;
      checkStmt.free();

      if (!existing) {
        const insertStmt = db.prepare(`
              INSERT INTO spells (spell_id, name_en, tooltip_en_json, content_hash, last_source_id)
              VALUES (?, ?, ?, ?, ?)
            `);
        insertStmt.run([id, s.name || null, tooltipJson || null, hash, sourceId]);
        insertStmt.free();
      } else {
        if (existing.content_hash === hash) {
          const updateMetaStmt = db.prepare(`
                  UPDATE spells SET seen_count = seen_count + 1, last_seen_at = CURRENT_TIMESTAMP, last_source_id = ?
                  WHERE spell_id = ?
                `);
          updateMetaStmt.run([sourceId, id]);
          updateMetaStmt.free();
        } else {
          const updateStmt = db.prepare(`
                  UPDATE spells SET 
                    name_en = ?, tooltip_en_json = ?, content_hash = ?, 
                    seen_count = 1, last_seen_at = CURRENT_TIMESTAMP, last_source_id = ?
                  WHERE spell_id = ?
                `);
          updateStmt.run([s.name || null, tooltipJson || null, hash, sourceId, id]);
          updateStmt.free();
        }
      }
      count++;
    }
    db.run('COMMIT');
  } catch (err) {
    db.run('ROLLBACK');
    throw err;
  }

  console.log(`Processed ${count} spells.`);
}

function processGossip(db: any, gossip: Record<string, any>, sourceId: number | null) {
  let count = 0;
  console.log(`Processing ${Object.keys(gossip).length} gossip entries...`);

  db.run('BEGIN TRANSACTION');
  try {
    for (const [key, rawG] of Object.entries(gossip)) {
      const g = normalizeObject(rawG);
      const hash = hashGossip(g);
      const optionsJson = JSON.stringify(g.options || []);

      const checkStmt = db.prepare('SELECT content_hash FROM gossip WHERE gossip_key = ?');
      const existingRes = checkStmt.get([key]);
      const existing = existingRes ? existingRes : null;
      checkStmt.free();

      if (!existing) {
        const insertStmt = db.prepare(`
              INSERT INTO gossip (gossip_key, text_en, options_en_json, npc_hint, content_hash, last_source_id)
              VALUES (?, ?, ?, ?, ?, ?)
            `);
        insertStmt.run([key, g.text || null, optionsJson || null, g.npc_hint || null, hash, sourceId]);
        insertStmt.free();
      } else {
        if (existing.content_hash === hash) {
          const updateMetaStmt = db.prepare(`
                  UPDATE gossip SET seen_count = seen_count + 1, last_seen_at = CURRENT_TIMESTAMP, last_source_id = ?
                  WHERE gossip_key = ?
                `);
          updateMetaStmt.run([sourceId, key]);
          updateMetaStmt.free();
        } else {
          const updateStmt = db.prepare(`
                  UPDATE gossip SET 
                    text_en = ?, options_en_json = ?, npc_hint = ?, content_hash = ?, 
                    seen_count = 1, last_seen_at = CURRENT_TIMESTAMP, last_source_id = ?
                  WHERE gossip_key = ?
                `);
          updateStmt.run([g.text || null, optionsJson || null, g.npc_hint || null, hash, sourceId, key]);
          updateStmt.free();
        }
      }
      count++;
    }
    db.run('COMMIT');
  } catch (err) {
    db.run('ROLLBACK');
    throw err;
  }

  console.log(`Processed ${count} entries.`);
}
