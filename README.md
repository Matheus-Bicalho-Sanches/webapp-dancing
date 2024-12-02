# WebApp Dancing

Sistema de agendamento de aulas de patinação com pagamento integrado.

## Funcionalidades

- Agendamento de aulas individuais
- Gerenciamento de professores
- Gerenciamento de horários
- Pagamento via PIX (PagBank)
- Área administrativa
- Área pública para alunos

## Tecnologias

- React
- Firebase (Firestore)
- Material-UI
- PagBank API

## Configuração do Ambiente

1. Clone o repositório
```bash
git clone [URL_DO_REPOSITÓRIO]
```

2. Instale as dependências
```bash
npm install
```

3. Configure as variáveis de ambiente
Crie um arquivo `.env` na raiz do projeto com as seguintes variáveis:
```env
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
PAGBANK_ENV=sandbox
PAGBANK_TOKEN=
```

4. Inicie o servidor de desenvolvimento
```bash
npm run dev
```

## Scripts Disponíveis

- `npm run dev`: Inicia o servidor de desenvolvimento
- `npm run build`: Gera a versão de produção
- `npm run preview`: Visualiza a versão de produção localmente

## Estrutura do Projeto

```
src/
  ├── api/          # Endpoints da API
  ├── components/   # Componentes React
  ├── config/       # Configurações (Firebase, etc)
  ├── contexts/     # Contextos React
  ├── layouts/      # Layouts da aplicação
  └── pages/        # Páginas da aplicação
```

## Contribuição

1. Faça um Fork do projeto
2. Crie uma Branch para sua Feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a Branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## Licença

Este projeto está sob a licença MIT.
