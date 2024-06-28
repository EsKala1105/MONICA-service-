@Echo off

:home
cls

c:
cd\
cd Eskala\service
@pm2 start server.js
goto End