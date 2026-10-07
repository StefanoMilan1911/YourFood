@echo off
rem Copia index.html, style.css e app.js nel progetto Flutter.
rem Lascia questo file nella cartella YourFood, accanto ai tre file.
set "SRC=%~dp0"
set "PROJ=%~dp0APP_codice\yourfood"
set "DST=%~dp0APP_codice\yourfood\assets\web"

if not exist "%PROJ%\pubspec.yaml" (
  echo Non trovo il progetto Flutter in APP_codice\yourfood
  pause
  exit /b 1
)

if not exist "%DST%" mkdir "%DST%"

copy /Y "%SRC%index.html" "%DST%\" >nul || goto errore
copy /Y "%SRC%style.css" "%DST%\" >nul || goto errore
copy /Y "%SRC%app.js" "%DST%\" >nul || goto errore

echo Copiati index.html, style.css e app.js in assets\web.
pause
exit /b 0

:errore
echo Errore durante la copia. Controlla che i tre file siano accanto a questo script.
pause
exit /b 1
