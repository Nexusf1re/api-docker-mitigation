const express = require('express');
const app = express();

const PORT = process.env.PORT || 3000;
const INSTANCE_NAME = process.env.INSTANCE_NAME || 'unknown';

// Middleware
app.use(express.json());

// Simula processamento de requisição
let requestCount = 0;

// Endpoint de Health Check (obrigatório para Docker)
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    instance: INSTANCE_NAME,
    uptime: process.uptime()
  });
});

// Endpoint raiz
app.get('/', (req, res) => {
  res.json({
    message: 'API funcionando!',
    processedBy: INSTANCE_NAME,
    timestamp: new Date().toISOString()
  });
});

// Endpoint de dados
app.get('/api/data', (req, res) => {
  requestCount++;
  res.json({
    data: {
      id: Math.random().toString(36).substr(2, 9),
      message: 'Dados da API',
      requestNumber: requestCount
    },
    processedBy: INSTANCE_NAME,
    timestamp: new Date().toISOString()
  });
});

// Endpoint para simular operação pesada
app.get('/api/process', (req, res) => {
  const startTime = Date.now();
  
  // Simula processamento (1 segundo)
  setTimeout(() => {
    const processingTime = Date.now() - startTime;
    res.json({
      result: 'Processamento concluído',
      processingTimeMs: processingTime,
      processedBy: INSTANCE_NAME,
      timestamp: new Date().toISOString()
    });
  }, 1000);
});

// Endpoint POST para teste
app.post('/api/echo', (req, res) => {
  res.json({
    received: req.body,
    echoedBy: INSTANCE_NAME,
    timestamp: new Date().toISOString()
  });
});

// Inicia o servidor
app.listen(PORT, () => {
  console.log(`Instância ${INSTANCE_NAME} rodando na porta ${PORT}`);
  console.log(`Health check disponível em http://localhost:${PORT}/health`);
});