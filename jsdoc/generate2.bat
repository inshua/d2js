cd /d %~dp0%
set jspath=..\WebContent\WEB-INF\jslib\
REM C:\Users\Inshua\node_modules\.bin\jsdoc %jspath% -r -d .\server-side\ -c .\jsdoc.conf
C:\Users\Inshua\node_modules\.bin\jsdoc -d .\client-side\ -c .\jsdoc-client.conf
pause