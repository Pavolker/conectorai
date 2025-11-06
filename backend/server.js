const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const OpenAI = require('openai');
const path = require('path');
// Carregar .env do diretório do backend e sobrescrever variáveis já definidas
require('dotenv').config({ path: path.join(__dirname, '.env'), override: true });

const app = express();
const PORT = process.env.PORT || 3000;

// Inicializar cliente OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Middleware de segurança
app.use(helmet());
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? [
        'https://stunning-fox-b1e4ea.netlify.app',
        'https://conectorai.netlify.app',
        'https://pavolker-conectorai.netlify.app',
        'https://escriba-capitulos.netlify.app',
        'https://seu-site.netlify.app', 
        'https://seu-dominio.com'
      ] 
    : [
        'http://localhost:3000', 
        'http://localhost:8080',
        'http://localhost:5500',
        'http://127.0.0.1:5500'
      ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Middleware para parsing JSON
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutos
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limite por IP
  message: {
    error: 'Muitas requisições. Tente novamente em alguns minutos.',
    retryAfter: '15 minutos'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', limiter);

// Servir arquivos estáticos
app.use(express.static(path.join(__dirname)));

// Rota principal - servir o frontend
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index-backend.html'));
});

// Rota de saúde
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Rota para chat com OpenAI
app.post('/api/chat', [
  body('message').isString().isLength({ min: 1, max: 10000 }).withMessage('Mensagem deve ter entre 1 e 10000 caracteres'),
  body('conversationHistory').optional().isArray().withMessage('Histórico deve ser um array')
], async (req, res) => {
  try {
    // Validar entrada
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Dados inválidos',
        details: errors.array()
      });
    }

    const { message, conversationHistory = [] } = req.body;

    // Verificar se a chave da API está configurada
    if (!process.env.OPENAI_API_KEY) {
      console.error('OPENAI_API_KEY não configurada');
      return res.status(500).json({
        error: 'Configuração do servidor incompleta'
      });
    }

    // Prompt do sistema para o Escriba de Capítulos
    const systemPrompt = `Você é o Escriba de Capítulos, um agente especializado em redigir capítulos técnicos de relatórios.

MISSÃO: Redigir capítulos técnicos com coerência textual, estrutura argumentativa completa (introdução, desenvolvimento e conclusão), e fundamentação com base em dados atualizados e fontes confiáveis.

INSTRUÇÕES ESTRUTURAIS:
1. Objetivo: Redigir um capítulo técnico completo, com até 2.000 palavras, tratando de forma aprofundada o tema solicitado.
2. Estrutura Obrigatória:
   • Introdução: contextualize o tema com base em dados disponíveis e justificativa de relevância.
   • Desenvolvimento: aprofunde a análise com base em evidências, dados, documentos, estudos ou benchmarks nacionais/internacionais.
   • Conclusão: sistematize os achados e prepare o terreno para o próximo capítulo (sem fechamento definitivo).
3. Linguagem: técnica, formal e precisa. Sem adjetivação subjetiva ou juízos de valor.
4. Referências: todas as fontes consultadas devem ser citadas conforme normas da ABNT (NBR 6023).

COMANDOS ESPECIAIS:
• "Tema: [título]" → define o conteúdo principal a ser desenvolvido
• "Base de dados: [documentos]" → orienta a fonte prioritária
• "Formato: Markdown | PDF | DOCX" → define o formato de entrega
• "Foco especial em: [benchmarking, dados quantitativos, legislação]" → define o eixo prioritário

COMPORTAMENTO DE BUSCA:
• Sempre que o tema exigir atualização, usar mecanismos de busca com foco em sites científicos, institucionais ou especializados
• Referenciar qualquer dado, citação ou estatística com indicação clara de fonte e ano
• Indicar claramente a origem de cada dado relevante

Responda sempre em português brasileiro, com linguagem técnica e formal.`;

    // Construir array de mensagens
    const messages = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory,
      { role: 'user', content: message }
    ];

    // Chamar API da OpenAI
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o',
      messages: messages,
      max_tokens: parseInt(process.env.OPENAI_MAX_TOKENS) || 4000,
      temperature: parseFloat(process.env.OPENAI_TEMPERATURE) || 0.3,
    });

    const response = completion.choices[0]?.message?.content || 'Resposta não encontrada';

    // Log da requisição (sem dados sensíveis)
    console.log(`[${new Date().toISOString()}] Chat request processed - IP: ${req.ip}`);

    res.json({
      success: true,
      response: response,
      usage: completion.usage,
      model: completion.model
    });

  } catch (error) {
    console.error('Erro na API OpenAI:', error);

    // Tratar diferentes tipos de erro
    let errorMessage = 'Erro interno do servidor';
    let statusCode = 500;

    if (error.code === 'insufficient_quota') {
      errorMessage = 'Limite de créditos da API excedido';
      statusCode = 402;
    } else if (error.code === 'invalid_api_key') {
      errorMessage = 'Chave da API inválida';
      statusCode = 401;
    } else if (error.code === 'rate_limit_exceeded') {
      errorMessage = 'Limite de requisições excedido. Tente novamente em alguns minutos.';
      statusCode = 429;
    } else if (error.type === 'server_error') {
      errorMessage = 'Erro temporário do servidor OpenAI. Tente novamente.';
      statusCode = 503;
    }

    res.status(statusCode).json({
      error: errorMessage,
      code: error.code || 'unknown_error'
    });
  }
});

// Rota para testar a API
app.post('/api/test', async (req, res) => {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({
        error: 'Chave da API não configurada'
      });
    }

    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o',
      messages: [
        { role: 'system', content: 'Você é um assistente de teste. Responda apenas "Teste funcionando!"' },
        { role: 'user', content: 'Teste de funcionamento' }
      ],
      max_tokens: 10,
      temperature: 0
    });

    res.json({
      success: true,
      message: 'API funcionando corretamente',
      response: completion.choices[0]?.message?.content
    });

  } catch (error) {
    console.error('Erro no teste da API:', error);
    res.status(500).json({
      error: 'Erro ao testar API',
      details: error.message
    });
  }
});

// Middleware de tratamento de erros
app.use((err, req, res, next) => {
  console.error('Erro não tratado:', err);
  res.status(500).json({
    error: 'Erro interno do servidor',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Algo deu errado'
  });
});

// Rota 404
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Rota não encontrada',
    path: req.originalUrl
  });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`📝 Escriba de Capítulos Backend v1.0.0`);
  console.log(`🌐 Acesse: http://localhost:${PORT}`);
  
  if (!process.env.OPENAI_API_KEY) {
    console.warn('⚠️  OPENAI_API_KEY não configurada! Configure no arquivo .env');
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 Recebido SIGTERM, encerrando servidor...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 Recebido SIGINT, encerrando servidor...');
  process.exit(0);
});
