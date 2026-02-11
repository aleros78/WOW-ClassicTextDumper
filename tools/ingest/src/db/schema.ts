import { getDb, saveDb } from './index.js';

export const SCHEMA_SQL = `
  CREATE TABLE IF NOT EXISTS sources (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source_name TEXT NOT NULL,
    client_flavor TEXT NOT NULL,
    locale TEXT NOT NULL DEFAULT 'enUS',
    addon_version TEXT,
    ingested_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS quests (
    quest_id INTEGER PRIMARY KEY,
    title_en TEXT,
    details_en TEXT,
    objectives_en TEXT,
    progress_en TEXT,
    completion_en TEXT,
    content_hash TEXT NOT NULL,
    seen_count INTEGER DEFAULT 1,
    first_seen_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_seen_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_source_id INTEGER,
    FOREIGN KEY(last_source_id) REFERENCES sources(id)
  );
  CREATE INDEX IF NOT EXISTS idx_quests_hash ON quests(content_hash);

  CREATE TABLE IF NOT EXISTS quest_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    quest_id INTEGER,
    title_en TEXT,
    details_en TEXT,
    objectives_en TEXT,
    progress_en TEXT,
    completion_en TEXT,
    content_hash TEXT,
    seen_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    source_id INTEGER,
    FOREIGN KEY(quest_id) REFERENCES quests(quest_id),
    FOREIGN KEY(source_id) REFERENCES sources(id)
  );

  CREATE TABLE IF NOT EXISTS items (
    item_id INTEGER PRIMARY KEY,
    name_en TEXT,
    tooltip_en_json TEXT,
    content_hash TEXT NOT NULL,
    seen_count INTEGER DEFAULT 1,
    first_seen_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_seen_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_source_id INTEGER,
    FOREIGN KEY(last_source_id) REFERENCES sources(id)
  );
  CREATE INDEX IF NOT EXISTS idx_items_hash ON items(content_hash);

  CREATE TABLE IF NOT EXISTS spells (
    spell_id INTEGER PRIMARY KEY,
    name_en TEXT,
    tooltip_en_json TEXT,
    content_hash TEXT NOT NULL,
    seen_count INTEGER DEFAULT 1,
    first_seen_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_seen_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_source_id INTEGER,
    FOREIGN KEY(last_source_id) REFERENCES sources(id)
  );
  CREATE INDEX IF NOT EXISTS idx_spells_hash ON spells(content_hash);

  CREATE TABLE IF NOT EXISTS gossip (
    gossip_key TEXT PRIMARY KEY,
    text_en TEXT,
    options_en_json TEXT,
    npc_hint TEXT,
    content_hash TEXT NOT NULL,
    seen_count INTEGER DEFAULT 1,
    first_seen_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_seen_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_source_id INTEGER,
    FOREIGN KEY(last_source_id) REFERENCES sources(id)
  );
  CREATE INDEX IF NOT EXISTS idx_gossip_hash ON gossip(content_hash);
`;

export async function initSchema(): Promise<void> {
  const db = await getDb();
  db.run(SCHEMA_SQL);
  saveDb();
  console.log('Database initialized successfully.');
}
