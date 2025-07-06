@echo off
echo 🚀 Iniciando Servidor HTTP Local...
echo.
echo ✅ API testada - FUNCIONANDO!
echo ✅ Servidor HTTP iniciando...
echo.
cd /d "%~dp0"
echo Diretório: %CD%
echo.
echo 📱 Abra no navegador: http://localhost:8000
echo.
echo ⭐ URLs disponíveis:
echo    http://localhost:8000/index.html
echo    http://localhost:8000/frontend-correto.html  
echo    http://localhost:8000/teste-login-simples.html
echo.
echo 🔧 Login: admin@plataforma.app / admin123
echo.
echo Pressione Ctrl+C para parar o servidor
echo.
python -m http.server 8000
pause