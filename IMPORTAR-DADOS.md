# Guia de Importação de Dados do Google Sheets para o Firebase

Este guia descreve como importar dados de planilhas do Google para o Firebase usando o script de importação fornecido.

## Pré-requisitos

Antes de começar, certifique-se de que você possui:

1. Node.js instalado (versão 14 ou superior)
2. Acesso ao projeto Firebase
3. Acesso às planilhas do Google que contêm os dados
4. Permissões para criar credenciais de serviço no Google Cloud e Firebase

## Passo 1: Preparar as planilhas do Google

1. Certifique-se de que cada planilha tenha uma linha de cabeçalho na primeira linha.
2. Os nomes dos cabeçalhos devem corresponder aos nomes dos campos no Firebase.
3. Para campos de data, use o formato DD/MM/YYYY ou YYYY-MM-DD.
4. Recomendamos organizar os dados em abas separadas por tipo (leads, tarefas, etc.)

### Campos importantes para cada coleção

#### Leads (CRM)
- `nome` - Nome do lead
- `status` - Status do lead (Lead, AE Agend, AE Feita, Barra, Matrícula, Inativo)
- `whatsapp` - Número de WhatsApp
- `ultimoContato` - Data do último contato
- `proximoContato` - Data do próximo contato
- `dataAE` - Data da aula experimental
- `turmaAE` - Turma da aula experimental
- `observacoes` - Observações
- `origemLead` - Origem do lead

#### Tarefas
- `descricao` - Descrição da tarefa
- `responsavel` - Responsável pela tarefa
- `prazoLimite` - Data limite para conclusão
- `observacoes` - Observações
- `status` - Status da tarefa (Pendente, Em andamento, Finalizada, etc.)

#### Tarefas Técnicas
- Mesmos campos das tarefas regulares

#### Tarefas Diárias
- `descricao` - Descrição da tarefa
- `status` - Status da tarefa
- `proximaExecucao` - Data da próxima execução

#### Tarefas Semanais
- `descricao` - Descrição da tarefa
- `status` - Status da tarefa
- `diaSemana` - Dia da semana para execução (0-6, sendo 0=Domingo)
- `ultimaExecucao` - Data da última execução
- `proximaExecucao` - Data da próxima execução

#### Tarefas Mensais
- `descricao` - Descrição da tarefa
- `status` - Status da tarefa
- `diaMes` - Dia do mês para execução (1-31)
- `ultimaExecucao` - Data da última execução
- `proximaExecucao` - Data da próxima execução

#### Tarefas por Horário
- `descricao` - Descrição da tarefa
- `diasDaSemana` - Array com os dias da semana (ex: ["Segunda", "Quarta", "Sexta"])
- `horario` - Horário da tarefa (formato: "HH:MM")
- `status` - Status da tarefa

## Passo 2: Configurar credenciais do Firebase

1. Acesse o [Console do Firebase](https://console.firebase.google.com/)
2. Selecione seu projeto
3. Vá para "Configurações do projeto" -> "Contas de serviço"
4. Clique em "Gerar nova chave privada"
5. Salve o arquivo JSON baixado como `serviceAccountKey.json` na raiz do projeto

## Passo 3: Configurar credenciais do Google Sheets API

1. Acesse o [Console do Google Cloud](https://console.cloud.google.com/)
2. Selecione seu projeto (ou crie um novo)
3. Vá para "APIs e Serviços" -> "Biblioteca"
4. Pesquise e ative a "Google Sheets API"
5. Vá para "APIs e Serviços" -> "Credenciais"
6. Clique em "Criar credenciais" -> "Conta de serviço"
7. Preencha os detalhes necessários e crie a conta de serviço
8. Crie uma chave para esta conta de serviço (tipo JSON)
9. Salve o arquivo JSON baixado como `googleCredentials.json` na raiz do projeto
10. **Importante:** Compartilhe suas planilhas do Google com o email da conta de serviço

## Passo 4: Instalar dependências

Execute o seguinte comando no terminal na pasta raiz do projeto:

```bash
npm install firebase-admin googleapis fs path readline
```

## Passo 5: Executar o script de importação

Execute o script usando o Node.js:

```bash
node scripts/import-spreadsheet-to-firebase.js
```

O script guiará você através dos seguintes passos:

1. Solicitar o ID da planilha do Google (encontrado na URL da planilha)
2. Mostrar uma lista de abas disponíveis para você escolher
3. Exibir os campos encontrados na planilha
4. Solicitar a coleção do Firebase para a qual deseja importar os dados
5. Solicitar confirmação antes de iniciar a importação
6. Realizar a importação e exibir o progresso

## Informações importantes

### ID da planilha

O ID da planilha pode ser encontrado na URL do Google Sheets:
```
https://docs.google.com/spreadsheets/d/[ID_DA_PLANILHA]/edit
```

### Formatos de data

O script tenta converter automaticamente os seguintes formatos de data:
- DD/MM/YYYY
- YYYY-MM-DD

### Campos que serão adicionados automaticamente

Além dos campos da planilha, o script adiciona automaticamente:
- `createdAt` - Timestamp de criação
- `updatedAt` - Timestamp de atualização

### Valores padrão

- Para tarefas, se o campo `status` não estiver preenchido, será definido como "Pendente"
- Para leads (CRM), se o campo `status` não estiver preenchido, será definido como "Lead"

## Solução de problemas

### Erro: Arquivo de credenciais não encontrado

Certifique-se de que os arquivos `serviceAccountKey.json` e `googleCredentials.json` estão presentes na raiz do projeto.

### Erro ao acessar a planilha

Verifique se:
1. O ID da planilha está correto
2. A planilha está compartilhada com o email da conta de serviço
3. As credenciais do Google têm permissão para acessar a API do Google Sheets

### Erro ao escrever no Firebase

Verifique se:
1. As credenciais do Firebase estão corretas
2. A conta de serviço tem permissões adequadas no Firestore
3. As regras de segurança do Firestore permitem escrita nas coleções especificadas

## Exemplo de fluxo completo

1. Organize seus dados em uma planilha do Google
2. Configure as credenciais do Firebase e Google Sheets
3. Execute o script
4. Forneça o ID da planilha
5. Selecione a aba que contém os dados
6. Verifique se os campos foram detectados corretamente
7. Selecione a coleção de destino no Firebase
8. Confirme a importação
9. Verifique no console do Firebase se os dados foram importados corretamente 