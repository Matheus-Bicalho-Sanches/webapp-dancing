import React, { useEffect } from 'react';
import dayjs from 'dayjs';
import 'dayjs/locale/pt-br';

dayjs.locale('pt-br');

const IndividualLessonForm = ({ agendamentoData, onClose }) => {
  const printForm = () => {
    try {
      // Verificar se estamos no navegador e se os dados necessários existem
      if (typeof window === 'undefined' || !agendamentoData || !agendamentoData.horarios || agendamentoData.horarios.length === 0) {
        console.error('Dados de agendamento inválidos ou ambiente não suportado');
        if (onClose) onClose();
        return;
      }

      // Log dos dados recebidos para depuração
      console.log('Dados do agendamento para impressão:', agendamentoData);
      console.log('Matrícula:', agendamentoData.matricula);
      console.log('Responsável Financeiro:', agendamentoData.responsavelFinanceiro);

      const printWindow = window.open('', '_blank');
      
      // Verificar se a janela foi aberta com sucesso
      if (!printWindow) {
        console.error('Não foi possível abrir a janela de impressão. Verifique se o bloqueador de pop-ups está desativado.');
        if (onClose) onClose();
        return;
      }
      
      // Obter o primeiro horário (para exibição na ficha)
      const primeiraAula = agendamentoData.horarios[0];
      
      // Data de hoje como data da compra
      const dataCompra = dayjs().format('DD/MM/YYYY');
      
      // Criando a tabela de aulas
      let tabelaAulas = '';
      agendamentoData.horarios.forEach((horario, index) => {
        const numeroAula = index + 1;
        const dataAula = dayjs(horario.data).format('DD/MM/YYYY');
        // Extrair o dia da semana
        const diaSemana = dayjs(horario.data).format('dddd');
        // Formatar dia e horário
        const diaHorario = `${diaSemana}, ${horario.horario.replace(':00', 'h')}`;
        
        tabelaAulas += `
          <tr>
            <td>${numeroAula < 10 ? '0' + numeroAula : numeroAula}</td>
            <td>${dataAula}</td>
            <td>${diaHorario}</td>
            <td>${horario.professorNome}</td>
            <td class="foto"></td>
            <td class="assinatura"></td>
          </tr>
        `;
      });
      
      const styles = `
        <style>
          @page {
            size: A4;
            margin: 1cm;
          }
          body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 0;
          }
          .container {
            width: 100%;
            max-width: 21cm;
            margin: 0 auto;
          }
          .header {
            text-align: center;
            border-bottom: 1px solid #000;
            padding-bottom: 10px;
            margin-bottom: 20px;
          }
          .title {
            font-size: 18px;
            font-weight: bold;
          }
          .info-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 8px;
            margin-bottom: 20px;
          }
          .info-item {
            border: 1px solid #000;
            padding: 5px;
          }
          .info-label {
            font-weight: bold;
            margin-right: 5px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
            page-break-inside: auto;
          }
          table, th, td {
            border: 1px solid #000;
          }
          th, td {
            padding: 8px;
            text-align: left;
          }
          th {
            background-color: #f2f2f2;
          }
          .foto, .assinatura {
            height: 40px;
          }
          .observacoes {
            margin-top: 20px;
          }
          @media print {
            .no-print {
              display: none;
            }
            body {
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
          }
          .footer {
            margin-top: 20px;
            text-align: center;
            font-size: 12px;
            color: #666;
          }
          .action-buttons {
            display: flex;
            justify-content: center;
            margin-top: 20px;
            gap: 10px;
          }
          .btn {
            padding: 10px 15px;
            background-color: #4CAF50;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
          }
          .btn-secondary {
            background-color: #f44336;
          }
        </style>
      `;

      const content = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>AULA INDIVIDUAL FICHA - ${dayjs().format('YYYY')}</title>
            ${styles}
          </head>
          <body>
            <div class="container">
              <div class="header">
                <div class="title">
                  AULA INDIVIDUAL FICHA - ${dayjs().format('YYYY')}
                </div>
              </div>
              
              <div class="info-grid">
                <div class="info-item">
                  <span class="info-label">Nome:</span> ${agendamentoData.nomeAluno}
                </div>
                <div class="info-item">
                  <span class="info-label">Matrícula:</span> ${agendamentoData.matricula || '-'}
                </div>
                <div class="info-item">
                  <span class="info-label">Resp:</span> ${agendamentoData.responsavelFinanceiro?.nome || agendamentoData.nomeAluno}
                </div>
                <div class="info-item">
                  <span class="info-label">WPP:</span> ${agendamentoData.telefone}
                </div>
                <div class="info-item">
                  <span class="info-label">Data da compra:</span> ${dataCompra}
                </div>
                <div class="info-item">
                  <span class="info-label">Qte:</span> ${agendamentoData.horarios.length}
                </div>
                <div class="info-item">
                  <span class="info-label">Modelo patins:</span>
                </div>
                <div class="info-item">
                  <span class="info-label">Nível téc.:</span>
                </div>
              </div>
              
              <table>
                <thead>
                  <tr>
                    <th>Aula</th>
                    <th>Data</th>
                    <th>Dia e Horário</th>
                    <th>Professora</th>
                    <th>FOTO</th>
                    <th>Assinatura</th>
                  </tr>
                </thead>
                <tbody>
                  ${tabelaAulas}
                </tbody>
              </table>
              
              <div class="observacoes">
                <strong>Observações:</strong>
                <p>${agendamentoData.observacoes || ''}</p>
              </div>
              
              <div class="action-buttons no-print">
                <button class="btn" onclick="window.print()">Imprimir</button>
                <button class="btn btn-secondary" onclick="window.close()">Fechar</button>
              </div>
            </div>
          </body>
        </html>
      `;
      
      try {
        printWindow.document.write(content);
        printWindow.document.close();
        
        printWindow.onload = function() {
          // Automaticamente abre o diálogo de impressão
          printWindow.focus();
          setTimeout(() => {
            printWindow.print();
          }, 1000);
        };
      } catch (error) {
        console.error('Erro ao criar ficha de impressão:', error);
        if (onClose) onClose();
      }
    } catch (error) {
      console.error('Erro ao abrir janela de impressão:', error);
      if (onClose) onClose();
    }
  };

  // Executar a impressão quando o componente montar
  useEffect(() => {
    // Executar a impressão com um pequeno atraso para garantir que o componente esteja completamente montado
    const timer = setTimeout(() => {
      printForm();
    }, 100);
    
    // Limpar o temporizador quando o componente for desmontado
    return () => clearTimeout(timer);
  }, []);

  return null; // Este componente não renderiza nada na interface atual
};

export default IndividualLessonForm; 