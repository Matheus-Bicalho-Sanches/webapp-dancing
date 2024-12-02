import express from 'express';
import cors from 'cors';
import checkoutRouter from './checkout.js';
import * as dotenv from 'dotenv';

// Carregar variáveis de ambiente
dotenv.config();

const app = express();
const port = 3001;

// Verificar variáveis de ambiente no início
console.log('Verificando variáveis de ambiente:');
console.log('PAGBANK_ENV:', process.env.PAGBANK_ENV);
console.log('PAGBANK_TOKEN exists:', !!process.env.PAGBANK_TOKEN);

app.use(cors());
app.use(express.json());

// Middleware para logar todas as requisições
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

app.use('/api/pagbank', checkoutRouter);

app.listen(port, () => {
  console.log(`API server running on port ${port}`);
}); 