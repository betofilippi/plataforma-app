@echo off
echo 🔄 Iniciando Proxy Server para resolver CORS...
echo.
echo ✅ Este proxy vai resolver o erro "Failed to fetch"
echo ✅ Ele cria um servidor local que faz proxy para a API
echo.
cd /d "%~dp0"
echo 📍 Diretório: %CD%
echo.
echo 🚀 Iniciando proxy na porta 3001...
echo 🎯 Proxy para: https://erp-api-clean-r88y1fdz9-nxt-9032fd74.vercel.app
echo.
echo 📝 Depois acesse: http://localhost:8000/TESTE-COM-PROXY.html
echo.
echo Pressione Ctrl+C para parar o proxy
echo.
node proxy-server.js
pause