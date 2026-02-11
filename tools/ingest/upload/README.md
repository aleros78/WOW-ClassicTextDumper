# Upload Directory

Questa cartella è utilizzata dallo script `auto-import.bat` per processare automaticamente i file SavedVariables.

## 📁 Utilizzo

1. **Inserisci** i tuoi file `SavedVariables.lua` in questa cartella
2. **Esegui** `auto-import.bat` dalla directory root di `tools/ingest`
3. I file vengono:
   - ✅ Importati nel database
   - 📦 Spostati in `done/` con prefisso data (es: `20260210-SavedVariables.lua`)

## 🗂 Sottocartelle

- **`done/`**: Archivio dei file già importati, con prefisso data in formato `YYYYMMDD-`

## ⚠️ Note

- Lo script usa `--source "AutoImport"` e `--flavor "ERA"` come default
- Se vuoi parametri diversi, modifica `auto-import.bat` o usa manualmente `node dist/index.js add`
