@echo off
REM Ruta a node.exe portable dentro de la carpeta actual
set NODE_PORTABLE=%~dp0node-portable\node.exe
set SERVER_JS=%~dp0server.js

REM Preguntar puerto (default 3000)
set /p PORT=Introduce el puerto (por defecto 3000): 
if "%PORT%"=="" set PORT=3000

REM Ejecutar servidor en primer plano, pasa el puerto como argumento
"%NODE_PORTABLE%" "%SERVER_JS%" %PORT%

REM Cuando cierres la ventana, el servidor se detiene automáticamente
echo Servidor detenido. Presiona una tecla para salir...
pause >nul
