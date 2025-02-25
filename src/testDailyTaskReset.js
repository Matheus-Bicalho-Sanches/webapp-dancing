// Arquivo para testar o reset automático de tarefas diárias
// Este script simula uma mudança de data para testar a funcionalidade

// 1. Função para simular uma data anterior
function setYesterdayAsLastResetDate() {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const formattedDate = yesterday.toISOString().split('T')[0]; // Formato YYYY-MM-DD
  
  localStorage.setItem('lastDailyTasksResetDate', formattedDate);
  console.log(`Data de último reset definida para: ${formattedDate}`);
  console.log('Agora recarregue a página na aba "Diária" para ver o reset automático acontecer');
}

// 2. Função para verificar a data atual de reset
function checkCurrentResetDate() {
  const currentDate = localStorage.getItem('lastDailyTasksResetDate');
  console.log(`Data atual de último reset: ${currentDate || 'Não definida'}`);
  
  const today = new Date().toISOString().split('T')[0];
  console.log(`Data de hoje: ${today}`);
  
  if (currentDate === today) {
    console.log('O reset já foi executado hoje');
  } else {
    console.log('O reset ainda não foi executado hoje ou está com data incorreta');
  }
}

// 3. Função para limpar a data de reset (forçará um reset na próxima vez)
function clearResetDate() {
  localStorage.removeItem('lastDailyTasksResetDate');
  console.log('Data de último reset removida. O reset será executado na próxima vez que a página for carregada.');
}

// Instruções de uso:
console.log(`
INSTRUÇÕES DE TESTE:

1. Para simular que o último reset foi ontem (forçando um reset):
   setYesterdayAsLastResetDate()

2. Para verificar a data atual de reset:
   checkCurrentResetDate()

3. Para limpar a data de reset (forçará um reset na próxima vez):
   clearResetDate()

4. Após executar uma dessas funções, recarregue a página na aba "Diária"
   para ver o comportamento do reset automático.
`); 