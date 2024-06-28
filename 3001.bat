@Echo off

:home
cls

c:
cd\
cd Eskala\MONICA-service-
@pm2 start server.js
goto End