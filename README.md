# WebApp Dancing

Aplicação web para gerenciamento de uma escola de esportes.

## Funcionalidades

- Agendamento de aulas
- Área administrativa
- Autenticação de usuários
- Integração com Firebase
- Proteção contra bots (reCAPTCHA)

## Tecnologias

- React
- Firebase
- Material-UI
- Google reCAPTCHA

## Configuração

1. Clone o repositório
2. Instale as dependências com `npm install`
3. Configure as variáveis de ambiente:
   - Copie `.env.example` para `.env.local`
   - Preencha as variáveis com suas credenciais

## Variáveis de Ambiente

```env
# Firebase
FIREBASE_API_KEY=
FIREBASE_AUTH_DOMAIN=
FIREBASE_PROJECT_ID=
FIREBASE_STORAGE_BUCKET=
FIREBASE_MESSAGING_SENDER_ID=
FIREBASE_APP_ID=

# reCAPTCHA
VITE_RECAPTCHA_SITE_KEY=
```

## Desenvolvimento

```bash
npm run dev
```

## Build

```bash
npm run build
```
