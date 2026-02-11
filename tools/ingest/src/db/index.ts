import initSqlJs, { Database, SqlJsStatic } from 'sql.js';
import path from 'path';
import fs from 'fs';

let dbInstance: Database | null = null;
let SQL: SqlJsStatic | null = null;
const DB_FILENAME = 'classic_translations.db';

export function getDbPath(): string {
    return path.resolve(process.cwd(), DB_FILENAME);
}

export async function getDb(): Promise<Database> {
    if (!dbInstance) {
        if (!SQL) {
            SQL = await initSqlJs();
        }

        const dbPath = getDbPath();

        // Load existing database or create new one
        if (fs.existsSync(dbPath)) {
            const buffer = fs.readFileSync(dbPath);
            dbInstance = new SQL.Database(buffer);
        } else {
            dbInstance = new SQL.Database();
        }

        // Set pragmas
        dbInstance.run('PRAGMA journal_mode = WAL;');
        dbInstance.run('PRAGMA foreign_keys = ON;');
    }
    return dbInstance!; // Non-null assertion since we just created it above
}

export function saveDb(): void {
    if (dbInstance) {
        const data = dbInstance.export();
        const buffer = Buffer.from(data);
        fs.writeFileSync(getDbPath(), buffer);
    }
}

export function closeDb(): void {
    if (dbInstance) {
        saveDb();
        dbInstance.close();
        dbInstance = null;
    }
}

export function dbExists(): boolean {
    return fs.existsSync(getDbPath());
}
