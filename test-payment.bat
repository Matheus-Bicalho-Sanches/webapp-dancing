@echo off
echo Testando diferentes status de pagamento

set /p orderId=Digite o ID do pedido: 

:menu
echo.
echo Escolha o status do pagamento:
echo 1 - PAID (Pago)
echo 2 - DECLINED (Recusado)
echo 3 - CANCELLED (Cancelado)
echo 4 - Sair
echo.

set /p opcao=Digite a opcao desejada: 

if "%opcao%"=="1" (
    curl -X POST http://localhost:3001/api/pagbank/test-payment/%orderId% -H "Content-Type: application/json" -d "{\"status\":\"PAID\"}"
    goto menu
)
if "%opcao%"=="2" (
    curl -X POST http://localhost:3001/api/pagbank/test-payment/%orderId% -H "Content-Type: application/json" -d "{\"status\":\"DECLINED\"}"
    goto menu
)
if "%opcao%"=="3" (
    curl -X POST http://localhost:3001/api/pagbank/test-payment/%orderId% -H "Content-Type: application/json" -d "{\"status\":\"CANCELLED\"}"
    goto menu
)
if "%opcao%"=="4" (
    exit
)

goto menu 