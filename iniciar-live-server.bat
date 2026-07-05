@echo off
chcp 65001 >nul
title Live Server - foto-trelew-flash
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo  [!] Node.js NO esta instalado.
  echo      Descargalo gratis en:  https://nodejs.org   ^(elige la version LTS^)
  echo      Instalalo, reinicia esta ventana y vuelve a ejecutar este archivo.
  echo.
  pause
  exit /b
)

echo ============================================================
echo    LIVE SERVER  -  foto-trelew-flash
echo ============================================================
echo.
echo  En ESTE PC abre en el navegador:
echo      http://localhost:5500/foto-trelew-flash-v4.2.html
echo.
echo  En tu CELULAR ^(conectado a la MISMA WiFi^) escribe:
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4"') do (
  set "ip=%%a"
  call :mostrarip
)
echo.
echo  La pagina se recarga sola cada vez que guardas el archivo.
echo  Deja esta ventana ABIERTA. Para detener: cierra la ventana o Ctrl+C.
echo ============================================================
echo.

npx --yes live-server --host=0.0.0.0 --port=5500 --open=foto-trelew-flash-v4.2.html

pause
exit /b

:mostrarip
set "ip=%ip: =%"
echo      http://%ip%:5500/foto-trelew-flash-v4.2.html
exit /b
