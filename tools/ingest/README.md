# WoW Classic Text Ingest Tool

**Tool A (INGEST)** per il progetto di traduzione community-driven di World of Warcraft Classic.

Questo tool CLI gestisce l'importazione di dati testuali da SavedVariables generati dall'addon dumper, normalizza i contenuti, li deduplica e li archivia in un database SQLite locale.

## 🚀 Installazione

```bash
cd tools/ingest
npm install
npm run build
```

## 📋 Requisiti

- Node.js v20+
- Windows (testato su Windows)
- Nessuna dipendenza nativa (usa sql.js - WASM)

## 🔧 Comandi

### `init` - Inizializza il Database

Crea il database SQLite con lo schema completo.

```bash
node dist/index.js init
```

**Output**: Crea `classic_translations.db` nella directory corrente.

---

### `add` - Ingesta File Lua

Importa uno o più file `SavedVariables.lua` nel database.

```bash
node dist/index.js add --source "NOME_SORGENTE" --flavor "FLAVOR" [files...]
```

**Opzioni**:
- `--source` (obbligatorio): Nome identificativo della sorgente (es. "MyAddon", "Player1")
- `--flavor` (obbligatorio): Client flavor (es. "ERA", "SOM", "CLASSIC")
- `--locale` (opzionale, default "enUS"): Locale dei dati
- `--addon-version` (opzionale): Versione dell'addon dumper

**Esempio**:
```bash
node dist/index.js add --source "CommunityDump" --flavor "ERA" SavedVariables1.lua SavedVariables2.lua
```

**Comportamento**:
- **Idempotente**: Eseguibile più volte sugli stessi file senza duplicare dati
- **Deduplicazione**: Incrementa `seen_count` per record identici
- **Versioning**: Archivia in `quest_history` quando il contenuto cambia

---

### `stats` - Statistiche Database

Mostra il numero di record per ogni categoria.

```bash
node dist/index.js stats
```

**Output Esempio**:
```
--- Database Stats ---
sources: 1 records
quests: 42 records
quest_history: 3 records
items: 156 records
spells: 89 records
gossip: 23 records
```

---

### `validate` - Valida File Lua

Controlla la struttura di un file Lua senza scrivere nel database.

```bash
node dist/index.js validate <file.lua>
```

**Output Esempio**:
```
Validating test/sample.lua...
Validation successful.
Found structure: { quests: 1, items: 1, spells: 1, gossip: 1 }
```

---

### 🤖 Auto-Import (Batch Script)

Per processare automaticamente più file in batch, usa lo script Windows:

```bash
auto-import.bat
```

**Workflow**:
1. Inserisci i file `.lua` in `upload/`
2. Esegui `auto-import.bat`
3. I file vengono importati e spostati in `upload/done/` con prefisso esteso (es: `20260210225500-A1B-SavedVariables.lua`)

**Parametri di default**:
- `--source "AutoImport"`
- `--flavor "ERA"`

Per personalizzare, modifica il batch o usa il comando `add` manualmente.

---

## 📂 Struttura Database

### Tabelle Principali

- **sources**: Metadati sulle sorgenti di ingestione
- **quests**: Quest testuali (title, details, objectives, progress, completion)
- **items**: Item (name, tooltip)
- **spells**: Spell (name, tooltip)
- **gossip**: Gossip NPC (text, options)

### Tabella Storico

- **quest_history**: Versioni precedenti di quest modificate

### Campi Chiave

Ogni record include:
- `content_hash`: SHA-256 per deduplicazione
- `seen_count`: Numero di volte visto
- `first_seen_at` / `last_seen_at`: Timestamp
- `last_source_id`: Riferimento alla sorgente

---

## 🛠 Architettura

### Componenti Core

1. **Loader** (`src/core/loader.ts`): Parsing sicuro di file Lua via AST (luaparse)
2. **Normalizer** (`src/core/normalizer.ts`): Normalizzazione line-endings e whitespace
3. **Fingerprint** (`src/core/fingerprint.ts`): Hashing SHA-256 per contenuti
4. **Ingest Engine** (`src/core/ingest.ts`): Logica INSERT/UPDATE/ARCHIVE con transazioni

### Database Layer

- **sql.js**: SQLite in WebAssembly (zero dipendenze native)
- **Persistenza**: Salvataggio esplicito su file
- **Transazioni**: BEGIN/COMMIT per integrità batch

---

## ✅ Filosofia

> *"Questo tool è la base dati di un progetto di traduzione community per WoW Classic.  
> Deve essere noioso, affidabile, ripetibile e robusto.  
> Ogni decisione favorisce qualità dei dati > velocità di sviluppo."*

### Principi Chiave

- ✅ **Idempotenza**: Rieseguibile senza effetti collaterali
- ✅ **Sicurezza**: Parsing Lua in sandbox (nessuna esecuzione di codice)
- ✅ **Tracciabilità**: Ogni ingestion registrata con metadati
- ✅ **Versioning**: Storico automatico per quest modificate
- ✅ **Deduplicazione**: Content-hash per rilevare duplicati

---

## 📝 Note Tecniche

- **Dipendenze Zero Native**: Usa `sql.js` (WASM) invece di `better-sqlite3` per evitare problemi di bindings nativi su Windows
- **ESM**: Moduli ES6 nativi (`"type": "module"`)
- **TypeScript**: Strict mode abilitato
- **Fingerprinting Robusto**: SHA-256 su concatenazione ordinata dei campi

---

## 🔍 Esempio Completo

```bash
# 1. Inizializza database
node dist/index.js init

# 2. Ingesta file di test
node dist/index.js add --source "TestDump" --flavor "ERA" test/sample.lua

# 3. Verifica statistiche
node dist/index.js stats

# 4. Valida un altro file prima di ingestare
node dist/index.js validate another_file.lua
```

---

## 🚨 Troubleshooting

### Errore "Database not found"
→ Esegui `node dist/index.js init` prima di usare `add` o `stats`

### "No files specified"
→ Assicurati di passare almeno un file: `node dist/index.js add --source "X" --flavor "Y" file.lua`

### Errori di parsing Lua
→ Usa `validate` per controllare la struttura prima di ingestare

---

## 📦 Output

Il database `classic_translations.db` viene creato nella directory di esecuzione e contiene tutti i dati normalizzati e deduplicati, pronti per alimentare gli altri tool del progetto (TOOL B, TOOL C...).
