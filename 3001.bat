@Echo off

:home
cls

c:
cd\
cd Program Files\fainess\server
@pm2 start server.js
goto End