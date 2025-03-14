# Integração com ZapSign API

Este documento contém todas as informações necessárias para integrar o ZapSign (plataforma de assinaturas eletrônicas) ao nosso sistema.

## Índice

1. [Introdução](#introdução)
2. [Ambientes](#ambientes)
3. [Autenticação](#autenticação)
4. [Principais Endpoints](#principais-endpoints)
5. [Fluxo de Integração](#fluxo-de-integração)
6. [Exemplos de Código](#exemplos-de-código)
7. [Webhooks](#webhooks)
8. [Considerações Importantes](#considerações-importantes)
9. [Referências](#referências)

## Introdução

A ZapSign é uma plataforma de assinatura eletrônica de documentos que garante autenticidade, integridade e não repúdio. Todas as assinaturas realizadas através da ZapSign possuem validade jurídica, atendendo aos requisitos da MP 2.200-2/2001 no Brasil e outras legislações internacionais.

A API do ZapSign utiliza padrões REST, aceitando e retornando dados em formato JSON. Os métodos HTTP utilizados são principalmente GET e POST.

## Ambientes

### Ambiente de Testes (Sandbox)

É recomendado iniciar o desenvolvimento usando o ambiente de testes para evitar cobranças:
- **URL Base**: `https://api-sandbox.zapsign.com.br/api/v1/`
- **URL Interface**: `https://app-sandbox.zapsign.com.br/`

### Ambiente de Produção

Após os testes, a integração deve ser migrada para o ambiente de produção:
- **URL Base**: `https://api.zapsign.com.br/api/v1/`
- **URL Interface**: `https://app.zapsign.com.br/`

## Autenticação

A API ZapSign suporta dois métodos de autenticação:

### 1. Token Estático (API Token)

O método mais simples, onde um token fixo é usado para todas as requisições.

1. **Como obter**: Navegue até "Configurações > Integrações > API ZAPSIGN" na interface ZapSign
2. **Como usar**: Adicione o header `Authorization: Bearer {seu_token}` em todas as requisições

Exemplo:
```javascript
fetch('https://api.zapsign.com.br/api/v1/docs/', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer c7f35c84-7893-4087-b4fb-d1f06c23'
  },
  body: JSON.stringify({
    // dados do documento
  })
})
```

### 2. JWT (Recomendado para maior segurança)

Para aplicações que necessitam de maior segurança, a ZapSign oferece autenticação JWT. Este método envolve:

1. Obter um token de acesso temporário
2. Usar este token para requisições subsequentes
3. Renovar o token quando necessário

## Principais Endpoints

### Documentos

#### Criar Documento via Upload
- **Endpoint**: `POST /docs/`
- **Descrição**: Cria um novo documento para assinatura a partir de um PDF ou DOCX
- **Parâmetros Principais**:
  - `name` (string): Título do documento
  - `url_pdf` ou `base64_pdf` ou `url_docx` ou `base64_docx`: Fonte do documento
  - `signers` (array): Lista de signatários

#### Listar Documentos
- **Endpoint**: `GET /docs/`
- **Descrição**: Lista todos os documentos da conta

#### Detalhar Documento
- **Endpoint**: `GET /docs/{token}/`
- **Descrição**: Obtém informações detalhadas de um documento específico

#### Excluir Documento
- **Endpoint**: `DELETE /docs/{token}/`
- **Descrição**: Remove um documento

### Signatários

#### Adicionar Signatário
- **Endpoint**: `POST /docs/{token}/add-signer/`
- **Descrição**: Adiciona um signatário a um documento existente

#### Atualizar Signatário
- **Endpoint**: `POST /signers/{token}/`
- **Descrição**: Atualiza informações de um signatário

#### Excluir Signatário
- **Endpoint**: `DELETE /signers/{token}/`
- **Descrição**: Remove um signatário de um documento

### Modelos

#### Listar Modelos
- **Endpoint**: `GET /templates/`
- **Descrição**: Lista todos os modelos disponíveis

#### Criar Documento via Modelo
- **Endpoint**: `POST /templates/{token}/doc/`
- **Descrição**: Cria um documento a partir de um modelo existente

## Fluxo de Integração

Um fluxo típico de integração envolve:

1. **Autenticação**: Obtenha e configure seu token de autenticação
2. **Criação de Documento**: Envie seu PDF/DOCX para a API
3. **Configuração de Signatários**: Defina quem irá assinar o documento
4. **Distribuição de Links**: Envie os links de assinatura para os signatários
5. **Monitoramento**: Acompanhe o status das assinaturas via API ou webhooks
6. **Finalização**: Baixe o documento assinado após a conclusão do processo

## Exemplos de Código

### Criar Documento com Signatários

```javascript
// Usando Node.js com fetch
const fetch = require('node-fetch');

async function criarDocumento() {
  const apiToken = 'seu_token_aqui';
  
  const dados = {
    name: 'Contrato de Serviço',
    url_pdf: 'https://seusite.com/contrato.pdf', // URL pública do seu PDF
    signers: [
      {
        name: 'Cliente',
        email: 'cliente@email.com',
        phone_country: '55',
        phone_number: '11998765432',
        auth_mode: 'assinaturaTela-tokenEmail', // Assinatura na tela + token por email
        send_automatic_email: true // ZapSign enviará email com link de assinatura
      },
      {
        name: 'Empresa',
        email: 'empresa@email.com',
        auth_mode: 'assinaturaTela'
      }
    ],
    lang: 'pt-br', // Idioma do documento: pt-br, en, es, fr
    external_id: 'CONTRATO-123' // ID do contrato em seu sistema
  };
  
  try {
    const response = await fetch('https://api.zapsign.com.br/api/v1/docs/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiToken}`
      },
      body: JSON.stringify(dados)
    });
    
    const resultado = await response.json();
    console.log('Documento criado:', resultado);
    
    // Os links de assinatura estão disponíveis em:
    resultado.signers.forEach(signer => {
      console.log(`Link para ${signer.name}: ${signer.sign_url}`);
    });
    
    return resultado;
  } catch (erro) {
    console.error('Erro ao criar documento:', erro);
    throw erro;
  }
}
```

### Verificar Status de um Documento

```javascript
async function verificarDocumento(tokenDocumento) {
  const apiToken = 'seu_token_aqui';
  
  try {
    const response = await fetch(`https://api.zapsign.com.br/api/v1/docs/${tokenDocumento}/`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiToken}`
      }
    });
    
    const documento = await response.json();
    console.log('Status do documento:', documento.status);
    
    // Verificando status de cada signatário
    documento.signers.forEach(signer => {
      console.log(`${signer.name}: ${signer.status}`);
    });
    
    return documento;
  } catch (erro) {
    console.error('Erro ao verificar documento:', erro);
    throw erro;
  }
}
```

### Upload de Documento em Base64

```javascript
const fs = require('fs');

async function criarDocumentoBase64() {
  const apiToken = 'seu_token_aqui';
  
  // Ler o arquivo e converter para base64
  const pdfPath = './contrato.pdf';
  const pdfBuffer = fs.readFileSync(pdfPath);
  const base64Pdf = pdfBuffer.toString('base64');
  
  const dados = {
    name: 'Contrato via Base64',
    base64_pdf: base64Pdf,
    signers: [
      {
        name: 'Cliente',
        email: 'cliente@email.com'
      }
    ]
  };
  
  // Resto do código similar ao exemplo anterior
  // ...
}
```

## Webhooks

Os webhooks permitem que você receba notificações em tempo real sobre eventos relacionados aos seus documentos.

### Configurar Webhook

- **Endpoint**: `POST /webhooks/`
- **Parâmetros**:
  - `url` (string): URL que receberá as notificações
  - `event` (string): Tipo de evento (doc_created, doc_signed, etc.)

### Eventos Disponíveis

1. **Documentos**
   - `doc_created`: Documento criado
   - `doc_deleted`: Documento excluído
   - `created_signer`: Signatário criado

2. **Signatários**
   - `signature_request_sent`: Pedido de assinatura enviado
   - `doc_viewed`: Documento visualizado
   - `reading_confirmation`: Confirmação de leitura
   - `doc_signed`: Documento assinado
   - `doc_refused`: Documento recusado
   - `email_bounce`: Email com erro de entrega

### Exemplo de Código para Receber Webhooks

```javascript
// Usando Express.js
const express = require('express');
const app = express();
app.use(express.json());

app.post('/webhook-zapsign', (req, res) => {
  const event = req.body;
  
  console.log('Evento recebido:', event.type);
  
  switch(event.type) {
    case 'doc_signed':
      console.log(`Documento ${event.doc.token} assinado por ${event.signer.name}`);
      // Atualizar seu sistema, enviar notificação, etc.
      break;
      
    case 'doc_refused':
      console.log(`Documento ${event.doc.token} recusado por ${event.signer.name}`);
      // Tratar recusa
      break;
      
    // outros casos...
  }
  
  res.status(200).send('Evento recebido');
});

app.listen(3000, () => {
  console.log('Servidor de webhook rodando na porta 3000');
});
```

## Considerações Importantes

### Gerenciamento de Horários
- A API ZapSign armazena datas e horários no fuso UTC+0
- O Brasil está no fuso UTC-3
- A maioria dos frameworks converte automaticamente

### Dados e Tipos
- Não envie strings como `null`; use string vazia (`""`) ou omita o campo
- Booleanos devem ser enviados como `true`/`false`, não como strings `"true"`/`"false"`
- Os links para os arquivos originais e assinados expiram em 60 minutos

### Cobranças e Limites
- Algumas funcionalidades como envio automático de WhatsApp têm custo adicional
- Existe limite de requisições (rate limit) - consulte a documentação atualizada

## Referências

- [Documentação Oficial ZapSign API](https://docs.zapsign.com.br/)
- [Ambiente de Testes](https://app-sandbox.zapsign.com.br/)
- [Suporte ZapSign](mailto:support@zapsign.com.br) 