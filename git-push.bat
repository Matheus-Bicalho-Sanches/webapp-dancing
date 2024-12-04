@echo off
echo Atualizando repositorio Git...
echo.

echo Adicionando arquivos modificados...
git add .

echo.
echo Criando commit...
set /p commit_msg="Digite a mensagem do commit: "
git commit -m "%commit_msg%"

echo.
echo Enviando para o repositorio remoto...
git push origin main

echo.
echo Processo concluido!
echo.
pause 