# Documentação do Projeto - Aplicação de Dança

## Visão Geral
Este projeto é uma aplicação web desenvolvida para gerenciamento de uma escola/academia de dança. A aplicação oferece funcionalidades para administração de alunos, aulas, turmas, pagamentos, tarefas, entre outros recursos.

## Tecnologias Principais
- **Frontend**: React.js com React Router para navegação
- **Biblioteca UI**: Material-UI (MUI)
- **Backend/Banco de Dados**: Firebase (Firestore)
- **Autenticação**: Firebase Authentication
- **Hospedagem**: Vercel

## Estrutura de Diretórios

### Raiz do Projeto
- `src/`: Contém todo o código-fonte da aplicação
- `public/`: Arquivos estáticos acessíveis publicamente
- `functions/`: Funções do Firebase (backend serverless)
- `scripts/`: Scripts utilitários para automação
- `data/`: Arquivos de dados utilizados pela aplicação
- `server/`: Código do servidor (possivelmente API)
- `api/`: Definições de API

### Diretório `src/`
- `components/`: Componentes reutilizáveis da aplicação
- `pages/`: Páginas da aplicação organizadas por tipo (admin, public, private)
- `services/`: Serviços para interação com APIs e backends
- `contexts/`: Contextos React para gerenciamento de estado global
- `hooks/`: Custom hooks React
- `utils/`: Funções utilitárias reutilizáveis
- `layouts/`: Layouts estruturais da aplicação
- `assets/`: Recursos estáticos (imagens, ícones, etc.)
- `config/`: Arquivos de configuração

## Principais Componentes e Funcionalidades

### Autenticação e Autorização
- **Login.jsx**: Componente de autenticação com email/senha
- **AuthContext.jsx**: Contexto de autenticação que gerencia o estado do usuário logado
- **PrivateRoute.jsx**: Componente para proteger rotas privadas, exigindo autenticação

### Estrutura de Navegação e Layout
- **App.jsx**: Componente principal que define toda a estrutura de rotas da aplicação
- **MainLayout.jsx**: Layout principal da aplicação com navegação e barra lateral
- **Sidebar.jsx**: Barra lateral de navegação com menus de acesso às diferentes áreas

### Módulos Administrativos
- **Dashboard.jsx**: Painel principal com visão geral da aplicação
- **Students.jsx**: Gerenciamento de alunos
- **StudentProfile.jsx**: Visualização e edição de perfil de alunos
- **Classes.jsx**: Gerenciamento de turmas
- **IndividualClasses.jsx**: Gerenciamento de aulas individuais
- **Tasks.jsx**: Sistema de gerenciamento de tarefas
- **CashControl.jsx**: Controle financeiro e de caixa
- **Reports.jsx**: Relatórios e análises
- **Users.jsx**: Gerenciamento de usuários do sistema
- **Products.jsx**: Gerenciamento de produtos (cantina)
- **Uniform.jsx**: Gerenciamento de uniformes
- **Notifications.jsx**: Sistema de notificações
- **AI.jsx**: Funcionalidades relacionadas a inteligência artificial
- **Oficina.jsx**: Gestão de oficinas

### Áreas Públicas
- **Schedule.jsx**: Agenda pública de aulas
- **AppointmentBooking.jsx**: Sistema de agendamento de aulas
- **PaymentSuccess.jsx**: Página de confirmação de pagamento

### Serviços de Integração
- **userService.js**: Serviço para gerenciamento de usuários
- **asaasService.js**: Integração com a plataforma de pagamentos Asaas
- **productService.js**: Serviço para gerenciamento de produtos

### Componentes de Pagamento e Assinaturas
- **CreditCardManager.jsx**: Gerenciamento de cartões de crédito
- **SubscriptionManager.jsx**: Gerenciamento de assinaturas
- **StripeElements.jsx**: Integração com Stripe para pagamentos

### CRM (Customer Relationship Management)
- **CRM.jsx**: Página de gerenciamento de relacionamento com clientes
- **CustomerManager.jsx**: Gerenciamento de clientes/leads

## Fluxos Principais
1. **Autenticação**: Usuários se autenticam via Login para acessar áreas protegidas
2. **Gestão de Alunos**: Cadastro, visualização e edição de informações de alunos
3. **Gestão de Aulas**: Agendamento e gerenciamento de aulas individuais e turmas
4. **Gestão Financeira**: Controle de pagamentos, assinaturas e relatórios financeiros
5. **Gestão de Tarefas**: Sistema para controle e acompanhamento de tarefas administrativas
6. **Área Pública**: Agendamento de aulas e pagamentos por clientes/alunos

## Configuração e Ambiente
- Arquivo `.env`: Contém variáveis de ambiente para configuração da aplicação
- **Firebase**: Configuração de conexão com o Firebase (autenticação, Firestore, etc.)
- **Vercel**: Configuração para deploy na plataforma Vercel

## Scripts de Utilidade
- **start-dev.bat**: Script para iniciar o ambiente de desenvolvimento no Windows
- **git-push.bat**: Script para automatizar comandos git push

## Arquivos de Configuração
- **eslint.config.js**: Configuração do linter ESLint
- **vite.config.js**: Configuração do bundler Vite
- **firebase.json**: Configuração do Firebase
- **firestore.rules**: Regras de segurança do Firestore
- **vercel.json**: Configuração do Vercel para deploy

## Regras de Firestore
O arquivo `firestore.rules` contém as regras de segurança que controlam o acesso aos dados no Firestore, definindo quem pode ler ou escrever em diferentes coleções com base em permissões específicas.

## Backup e Importação de Dados
O arquivo `IMPORTAR-DADOS.md` contém instruções para importação e backup de dados da aplicação.

## Arquivos de Teste
Existem vários arquivos de teste na aplicação, como:
- `testDailyTaskReset.js`: Teste de reset diário de tarefas
- `testWeeklyTaskReset.js`: Teste de reset semanal de tarefas
- `testMonthlyTaskReset.js`: Teste de reset mensal de tarefas

## Conclusão
Esta aplicação é um sistema complexo para gerenciamento de uma escola de dança, com funcionalidades abrangendo desde a gestão de alunos e aulas até o controle financeiro e CRM. A estrutura modular facilita a manutenção e expansão do sistema com novos recursos.