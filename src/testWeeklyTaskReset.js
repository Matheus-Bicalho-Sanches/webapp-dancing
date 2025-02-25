// Script para testar o reset automático de tarefas semanais
// Copie e cole estas funções no console do navegador enquanto estiver na página de tarefas

// Função para simular um dia da semana específico
function simulateDayOfWeek(dayNumber) {
  if (dayNumber < 1 || dayNumber > 7) {
    console.error('O dia da semana deve estar entre 1 (Segunda) e 7 (Domingo)');
    return;
  }
  
  // Armazenar o dia simulado no localStorage
  localStorage.setItem('simulatedDayOfWeek', dayNumber);
  
  const diasSemana = [
    'Segunda-feira',
    'Terça-feira',
    'Quarta-feira',
    'Quinta-feira',
    'Sexta-feira',
    'Sábado',
    'Domingo'
  ];
  
  console.log(`%c[TESTE] Dia da semana simulado: ${diasSemana[dayNumber - 1]} (${dayNumber})`, 'color: blue; font-weight: bold');
  console.log('%c[TESTE] Agora você pode testar a atualização automática de tarefas para este dia', 'color: blue');
}

// Função para remover a simulação do dia da semana
function resetDayOfWeekSimulation() {
  localStorage.removeItem('simulatedDayOfWeek');
  console.log('%c[TESTE] Simulação de dia da semana removida. Usando dia da semana real.', 'color: red; font-weight: bold');
}

// Função para testar o reset manual das tarefas semanais
function testWeeklyReset(tasks) {
  if (!tasks) {
    console.error('%c[TESTE] Erro: Você precisa fornecer as tarefas semanais como parâmetro', 'color: red');
    console.log('%c[TESTE] Exemplo de uso: testWeeklyReset(weeklyTasks)', 'color: blue');
    return;
  }
  
  console.log('%c[TESTE] Iniciando teste manual da função checkWeeklyTasksReset...', 'color: purple; font-weight: bold');
  
  if (typeof checkWeeklyTasksReset === 'function') {
    checkWeeklyTasksReset(tasks);
    console.log('%c[TESTE] Função checkWeeklyTasksReset executada com sucesso', 'color: green');
  } else {
    console.error('%c[TESTE] Erro: A função checkWeeklyTasksReset não está disponível no escopo atual', 'color: red');
  }
}

// Função para sobrescrever a função que obtém o dia da semana
function overrideGetDayOfWeek() {
  // Salvar a função Date.prototype.getDay original
  const originalGetDay = Date.prototype.getDay;
  
  // Sobrescrever a função getDay para usar o dia simulado, se existir
  Date.prototype.getDay = function() {
    const simulatedDay = localStorage.getItem('simulatedDayOfWeek');
    if (simulatedDay !== null) {
      const day = parseInt(simulatedDay, 10);
      return day === 7 ? 0 : day; // Converte de volta para o padrão do JS (0 = Domingo)
    }
    
    // Se não houver simulação, usar o comportamento original
    return originalGetDay.call(this);
  };
  
  console.log('%c[TESTE] Função Date.getDay() sobrescrita com sucesso', 'color: green; font-weight: bold');
  console.log('%c[TESTE] Agora você pode simular diferentes dias da semana', 'color: green');
}

// Função para mostrar as tarefas para o dia atual
function showTasksForToday(tasks) {
  if (!tasks) {
    console.error('%c[TESTE] Erro: Você precisa fornecer as tarefas semanais como parâmetro', 'color: red');
    console.log('%c[TESTE] Exemplo de uso: showTasksForToday(weeklyTasks)', 'color: blue');
    return;
  }
  
  const hoje = new Date();
  const diaDaSemana = hoje.getDay() === 0 ? 7 : hoje.getDay(); // Converter para 1-7
  
  const diasSemana = [
    'Segunda-feira',
    'Terça-feira',
    'Quarta-feira',
    'Quinta-feira',
    'Sexta-feira',
    'Sábado',
    'Domingo'
  ];
  
  console.log(`%c[TESTE] Dia da semana atual: ${diasSemana[diaDaSemana - 1]} (${diaDaSemana})`, 'color: blue; font-weight: bold');
  
  // Filtrar tarefas para o dia atual
  const tasksForToday = tasks.filter(task => task.diaDaSemana === diaDaSemana);
  
  if (tasksForToday.length === 0) {
    console.log('%c[TESTE] Não há tarefas programadas para hoje', 'color: orange');
  } else {
    console.log(`%c[TESTE] Tarefas para hoje (${tasksForToday.length}):`, 'color: green; font-weight: bold');
    
    tasksForToday.forEach((task, index) => {
      console.log(`%c[TESTE] ${index + 1}. ${task.descricao} - Status: ${task.status}`, 
        task.status === 'Finalizada' ? 'color: gray' : 'color: green');
    });
  }
}

// Instruções de uso
console.log(`
%c=== INSTRUÇÕES DE TESTE DO RESET DE TAREFAS SEMANAIS ===

Para testar o reset automático de tarefas semanais, você pode usar as seguintes funções:

1. %coverrideGetDayOfWeek()%c - Sobrescreve a função getDay para permitir simular diferentes dias da semana

2. %csimulateDayOfWeek(dayNumber)%c - Simula um dia da semana específico (1-7)
   Exemplo: simulateDayOfWeek(1) para simular segunda-feira

3. %cresetDayOfWeekSimulation()%c - Remove a simulação e volta a usar o dia real

4. %cshowTasksForToday(weeklyTasks)%c - Mostra as tarefas programadas para o dia atual

5. %ctestWeeklyReset(weeklyTasks)%c - Testa a função de reset manual
   (use na aba "Semanais")

Após usar estas funções, recarregue a página na aba "Semanais" 
para ver o comportamento do reset automático.
`, 
'color: blue; font-weight: bold', 
'color: green; font-weight: bold', 'color: black',
'color: green; font-weight: bold', 'color: black',
'color: green; font-weight: bold', 'color: black',
'color: green; font-weight: bold', 'color: black',
'color: green; font-weight: bold', 'color: black'
); 