#!/usr/bin/env node
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { dbExists, getDbPath, closeDb, getDb } from './db/index.js';
import { initSchema } from './db/schema.js';
import { ingestFile } from './core/ingest.js';
import { loadLuaFile } from './core/loader.js';
import path from 'path';
import fs from 'fs';

// ensure DB is closed on exit
process.on('exit', () => closeDb());
process.on('SIGINT', () => { closeDb(); process.exit(0); });

yargs(hideBin(process.argv))
    .scriptName('ingest')
    .usage('$0 <cmd> [args]')
    .command('init', 'Initialize the database', {}, async () => {
        if (dbExists()) {
            console.log(`Database already exists at ${getDbPath()}`);
        } else {
            console.log(`Initializing database at ${getDbPath()}...`);
            try {
                await initSchema();
            } catch (err) {
                console.error('Failed to initialize database:', err);
                process.exit(1);
            }
        }
    })
    .command('stats', 'Show database statistics', {}, async () => {
        if (!dbExists()) {
            console.error('Database not found. Run `ingest init` first.');
            process.exit(1);
        }
        const db = await getDb();
        const tables = ['sources', 'quests', 'quest_history', 'items', 'spells', 'gossip'];
        console.log('--- Database Stats ---');
        for (const table of tables) {
            try {
                const result = db.exec(`SELECT COUNT(*) as count FROM ${table}`);
                const count = result.length > 0 && result[0].values.length > 0 ? result[0].values[0][0] : 0;
                console.log(`${table}: ${count} records`);
            } catch (e: any) {
                console.log(`${table}: Error or not exists (${e.message})`);
            }
        }
    })
    .command('add', 'Ingest Lua files', (yargs) => {
        return yargs
            .option('source', { type: 'string', describe: 'Source name', demandOption: true })
            .option('flavor', { type: 'string', describe: 'Client flavor (e.g. ERA)', demandOption: true })
            .option('locale', { type: 'string', describe: 'Locale (e.g. enUS)', default: 'enUS' })
            .option('addon-version', { type: 'string', describe: 'Addon version' });
    }, async (argv) => {
        if (!dbExists()) {
            console.error('Database not found. Run `ingest init` first.');
            process.exit(1);
        }

        // Get files from remaining arguments (after the command)
        const filesToIngest = argv._.slice(1) as string[];

        if (filesToIngest.length === 0) {
            console.error('No files specified.');
            process.exit(1);
        }

        console.log(`Ingesting ${filesToIngest.length} files from source "${argv.source}" (${argv.flavor})...`);

        for (const file of filesToIngest) {
            const absPath = path.resolve(file);
            if (!fs.existsSync(absPath)) {
                console.error(`File not found: ${file}`);
                continue;
            }
            try {
                await ingestFile(absPath, {
                    sourceName: argv.source as string,
                    clientFlavor: argv.flavor as string,
                    sourceLocale: argv.locale as string,
                    addonVersion: argv['addon-version'] as string
                });
            } catch (err: any) {
                console.error(`Failed to ingest ${file}:`, err);
            }
        }
        console.log('Ingestion complete.');
    })
    .command('validate', 'Validate Lua file structure', (yargs) => {
        return yargs;
    }, (argv) => {
        const files = argv._.slice(1) as string[];
        const file = files[0];
        if (!file) {
            console.error('Please specify a file.');
            process.exit(1);
        }

        const absPath = path.resolve(file);
        if (!fs.existsSync(absPath)) {
            console.error(`File not found: ${file}`);
            process.exit(1);
        }

        try {
            console.log(`Validating ${file}...`);
            const data = loadLuaFile(absPath);
            const stats = {
                quests: data.quests ? Object.keys(data.quests).length : 0,
                items: data.items ? Object.keys(data.items).length : 0,
                spells: data.spells ? Object.keys(data.spells).length : 0,
                gossip: data.gossip ? Object.keys(data.gossip).length : 0,
            };
            console.log('Validation successful.');
            console.log('Found structure:', stats);
        } catch (err: any) {
            console.error('Validation failed:', err.message);
            process.exit(1);
        }
    })
    .help()
    .argv;
