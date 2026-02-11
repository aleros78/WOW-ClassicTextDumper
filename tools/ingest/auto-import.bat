@echo off
REM =====================================================
REM Auto-Import Script for WoW Classic Text Dumper
REM =====================================================
REM Questo script processa tutti i file .lua nella
REM cartella upload/, li importa nel database, e li
REM sposta in upload/done/ con prefisso data esteso.
REM Formato: YYYYMMDDHHMMSS-RRR-OriginalName.lua
REM =====================================================

setlocal enabledelayedexpansion

echo ========================================
echo Auto-Import WoW Classic Text Data
echo ========================================
echo.

REM Controlla se esiste il database
if not exist "classic_translations.db" (
    echo [ERROR] Database non trovato!
    echo Esegui prima: node dist/index.js init
    pause
    exit /b 1
)

REM Conta i file da processare
set fileCount=0
for %%f in (upload\*.lua) do (
    set /a fileCount+=1
)

if %fileCount%==0 (
    echo [INFO] Nessun file .lua trovato in upload/
    echo Inserisci i file SavedVariables.lua in upload/ e riesegui lo script.
    pause
    exit /b 0
)

echo [INFO] Trovati %fileCount% file da importare
echo.

REM Processa ogni file .lua
set successCount=0
set errorCount=0

for %%f in (upload\*.lua) do (
    echo ----------------------------------------
    echo Processando: %%~nxf
    echo ----------------------------------------
    
    REM Ottieni timestamp preciso YmdHis (locale independent)
    for /f "tokens=2 delims==" %%I in ('wmic os get localdatetime /value') do set datetime=%%I
    set "ts=!datetime:~0,14!"
    
    REM Genera 3 caratteri casuali
    set "chars=ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
    set "rand3="
    for /l %%i in (1,1,3) do (
        set /a "idx=!random! %% 36"
        for /f %%j in ("!idx!") do set "rand3=!rand3!!chars:~%%j,1!"
    )

    REM Esegue l'import
    node dist/index.js add --source "AutoImport" --flavor "ERA" "upload\%%~nxf"
    
    if !errorlevel! equ 0 (
        REM Import riuscito - sposta il file in done/
        set newName=!ts!-!rand3!-%%~nxf
        move "upload\%%~nxf" "upload\done\!newName!" >nul
        
        if !errorlevel! equ 0 (
            echo [OK] File importato e spostato: upload\done\!newName!
            set /a successCount+=1
        ) else (
            echo [WARNING] Import OK ma errore nello spostamento file
            set /a successCount+=1
        )
    ) else (
        echo [ERROR] Errore durante l'import di %%~nxf
        set /a errorCount+=1
    )
    echo.
)

echo.
echo ========================================
echo Riepilogo Importazione
echo ========================================
echo File processati: %fileCount%
echo Successi: %successCount%
echo Errori: %errorCount%
echo ========================================
echo.

if %errorCount% gtr 0 (
    echo [WARNING] Alcuni file non sono stati importati.
    echo Controlla gli errori sopra per i dettagli.
)

echo Premi un tasto per chiudere...
pause >nul
