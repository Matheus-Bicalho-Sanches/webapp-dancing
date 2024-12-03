@echo off
setlocal enabledelayedexpansion

:: Mensagem de boas-vindas
echo ===================================
echo    Assistente de Commit do Git
echo ===================================
echo.

:: Verificar status do git
git status
echo.

:: Perguntar se quer adicionar todos os arquivos
set /p "add_all=Adicionar todos os arquivos modificados? (S/N): "
if /i "!add_all!"=="S" (
    git add .
) else (
    :: Adicionar arquivos específicos
    set /p "files=Digite os arquivos para adicionar (separados por espaço): "
    git add !files!
)

:: Mostrar status após adicionar
echo.
echo Status após adicionar arquivos:
git status
echo.

:: Solicitar mensagem do commit
set /p "msg=Digite a mensagem do commit: "

:: Fazer o commit
git commit -m "!msg!"

:: Perguntar se quer fazer push
set /p "push=Fazer push para o repositório remoto? (S/N): "
if /i "!push!"=="S" (
    git push
)

echo.
echo Processo concluído!
pause 