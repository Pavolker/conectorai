# 🚀 Guia Completo: Integração de Agente IA com Página Pública

## 📋 Visão Geral

Este guia documenta o processo completo para criar uma aplicação web pública que integra um agente de IA (OpenAI) com frontend e backend separados, usando deploy automático.

## 🏗️ Arquitetura da Solução

```
Frontend (Netlify) ←→ Backend (Railway) ←→ OpenAI API
     ↓                    ↓                    ↓
  HTML/CSS/JS          Node.js/Express        GPT-4o
  Site Estático        Sua Chave API         Sua Conta
```

## 📁 Estrutura do Projeto (Monorepo)

```
projeto-ia/
├── backend/                 # Railway usa esta pasta
│   ├── server.js           # Servidor Express
│   ├── package.json        # Dependências Node.js
│   └── env.example         # Exemplo de variáveis
├── frontend/                # Netlify usa esta pasta
│   ├── index.html          # Interface do usuário
│   ├── package.json        # Mínimo (sem dependências)
│   └── _redirects          # Configuração de redirects
├── .netlifyignore          # Ignora backend
├── .railwayignore          # Ignora frontend
├── netlify.toml            # Configuração Netlify
└── README.md               # Documentação
```

## 🔧 Passo 1: Preparação do Código

### 1.1 Criar Backend (Node.js + Express)

**Arquivo: `backend/server.js`**
```javascript
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const OpenAI = require('openai');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Cliente OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Middleware de segurança
app.use(helmet());
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? [
        'https://seu-site.netlify.app',
        'https://outro-site.netlify.app'
      ] 
    : ['http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // limite por IP
  message: { error: 'Muitas requisições. Tente novamente.' }
});
app.use('/api/', limiter);

// Rota de saúde
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Rota principal da IA
app.post('/api/chat', async (req, res) => {
  try {
    const { message, conversationHistory = [] } = req.body;

    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ error: 'API Key não configurada' });
    }

    // Prompt do sistema
    const systemPrompt = `Você é um assistente especializado...`;

    const messages = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory,
      { role: 'user', content: message }
    ];

    // Chamar OpenAI
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o',
      messages: messages,
      max_tokens: parseInt(process.env.OPENAI_MAX_TOKENS) || 4000,
      temperature: parseFloat(process.env.OPENAI_TEMPERATURE) || 0.3,
    });

    const response = completion.choices[0]?.message?.content || 'Resposta não encontrada';

    res.json({
      success: true,
      response: response,
      usage: completion.usage,
      model: completion.model
    });

  } catch (error) {
    console.error('Erro na API OpenAI:', error);
    
    let errorMessage = 'Erro interno do servidor';
    let statusCode = 500;

    if (error.code === 'insufficient_quota') {
      errorMessage = 'Limite de créditos da API excedido';
      statusCode = 402;
    } else if (error.code === 'invalid_api_key') {
      errorMessage = 'Chave da API inválida';
      statusCode = 401;
    } else if (error.code === 'rate_limit_exceeded') {
      errorMessage = 'Limite de requisições excedido';
      statusCode = 429;
    }

    res.status(statusCode).json({
      error: errorMessage,
      code: error.code || 'unknown_error'
    });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`🌐 Acesse: http://localhost:${PORT}`);
});

module.exports = app;
```

**Arquivo: `backend/package.json`**
```json
{
  "name": "projeto-backend",
  "version": "1.0.0",
  "description": "Backend para integração com IA",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js"
  },
  "keywords": ["openai", "backend", "api"],
  "author": "Seu Nome",
  "license": "MIT",
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "helmet": "^7.1.0",
    "express-rate-limit": "^7.1.5",
    "dotenv": "^16.3.1",
    "openai": "^4.20.1",
    "express-validator": "^7.0.1"
  },
  "devDependencies": {
    "nodemon": "^3.0.2"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}
```

**Arquivo: `backend/env.example`**
```env
# Chave da API OpenAI (obrigatória)
OPENAI_API_KEY=sk-sua_chave_da_api_openai_aqui

# Porta do servidor (opcional, padrão: 3000)
PORT=3000

# Configurações de segurança
NODE_ENV=production

# Limite de requisições por IP (opcional)
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Configurações do modelo OpenAI
OPENAI_MODEL=gpt-4o
OPENAI_MAX_TOKENS=4000
OPENAI_TEMPERATURE=0.3
```

### 1.2 Criar Frontend (HTML/CSS/JS)

**Arquivo: `frontend/index.html`**
```html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Seu Agente IA</title>
    <style>
        /* Estilos modernos e responsivos */
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 20px;
        }

        .chat-container {
            width: 100%;
            max-width: 900px;
            height: 90vh;
            background: white;
            border-radius: 20px;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
            display: flex;
            flex-direction: column;
            overflow: hidden;
        }

        .chat-header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 20px;
            text-align: center;
            font-size: 1.5em;
            font-weight: bold;
        }

        .chat-messages {
            flex: 1;
            padding: 20px;
            overflow-y: auto;
            background: #f8f9fa;
        }

        .message {
            margin-bottom: 15px;
            display: flex;
            align-items: flex-start;
        }

        .message.user { justify-content: flex-end; }

        .message-content {
            max-width: 70%;
            padding: 12px 16px;
            border-radius: 18px;
            word-wrap: break-word;
            line-height: 1.5;
        }

        .message.user .message-content {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border-bottom-right-radius: 5px;
        }

        .message.bot .message-content {
            background: white;
            color: #333;
            border: 1px solid #e0e0e0;
            border-bottom-left-radius: 5px;
        }

        .message-avatar {
            width: 35px;
            height: 35px;
            border-radius: 50%;
            margin: 0 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            color: white;
            font-size: 14px;
        }

        .message.user .message-avatar {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            order: 2;
        }

        .message.bot .message-avatar {
            background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
        }

        .chat-input-container {
            padding: 20px;
            background: white;
            border-top: 1px solid #e0e0e0;
        }

        .input-row {
            display: flex;
            gap: 10px;
            align-items: center;
        }

        .chat-input {
            flex: 1;
            padding: 12px 16px;
            border: 2px solid #e0e0e0;
            border-radius: 25px;
            font-size: 16px;
            outline: none;
            transition: border-color 0.3s;
        }

        .chat-input:focus { border-color: #667eea; }

        .send-button {
            padding: 12px 24px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            border-radius: 25px;
            cursor: pointer;
            font-size: 16px;
            font-weight: bold;
            transition: transform 0.2s;
        }

        .send-button:hover { transform: translateY(-2px); }
        .send-button:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }

        .status-section {
            padding: 15px 20px;
            background: #e8f5e8;
            border-bottom: 1px solid #d4edda;
            text-align: center;
            font-size: 14px;
            color: #155724;
        }

        .status-section.error {
            background: #f8d7da;
            color: #721c24;
            border-color: #f5c6cb;
        }

        .status-section.warning {
            background: #fff3cd;
            color: #856404;
            border-color: #ffeaa7;
        }

        .loading {
            display: none;
            text-align: center;
            padding: 10px;
            color: #666;
        }

        .loading.show { display: block; }

        @media (max-width: 600px) {
            .chat-container { height: 95vh; }
            .message-content { max-width: 85%; }
        }
    </style>
</head>
<body>
    <div class="chat-container">
        <div class="chat-header">
            🤖 Seu Agente IA
        </div>
        
        <div class="status-section" id="statusSection">
            ✅ Sistema funcionando - Pronto para usar!
        </div>

        <div class="chat-messages" id="chatMessages">
            <div class="message bot">
                <div class="message-avatar">🤖</div>
                <div class="message-content">
                    <strong>Olá! Sou seu assistente de IA.</strong><br><br>
                    Como posso ajudá-lo hoje?
                </div>
            </div>
        </div>

        <div class="loading" id="loading">
            <div>🤖 Agente está pensando...</div>
        </div>

        <div class="chat-input-container">
            <div class="input-row">
                <input type="text" id="chatInput" class="chat-input" placeholder="Digite sua mensagem aqui...">
                <button id="sendButton" class="send-button">Enviar</button>
            </div>
        </div>
    </div>

    <script>
        class ChatApp {
            constructor() {
                this.conversationHistory = [];
                this.isConnected = false;
                
                // URL do backend Railway - SUBSTITUA pela sua URL
                this.backendUrl = 'https://seu-backend.up.railway.app';
                
                this.initializeElements();
                this.setupEventListeners();
                this.checkConnection();
            }

            initializeElements() {
                this.statusSection = document.getElementById('statusSection');
                this.chatMessages = document.getElementById('chatMessages');
                this.chatInput = document.getElementById('chatInput');
                this.sendButton = document.getElementById('sendButton');
                this.loading = document.getElementById('loading');
            }

            setupEventListeners() {
                this.chatInput.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        this.sendMessage();
                    }
                });

                this.sendButton.addEventListener('click', () => {
                    this.sendMessage();
                });
            }

            async checkConnection() {
                try {
                    const response = await fetch(`${this.backendUrl}/health`);
                    if (response.ok) {
                        this.updateStatus('✅ Sistema funcionando - Pronto para usar!', 'success');
                        this.isConnected = true;
                    } else {
                        throw new Error('Servidor não respondeu');
                    }
                } catch (error) {
                    this.updateStatus('❌ Erro de conexão com o servidor', 'error');
                    this.isConnected = false;
                }
            }

            updateStatus(message, type = 'success') {
                this.statusSection.textContent = message;
                this.statusSection.className = `status-section ${type === 'error' ? 'error' : type === 'warning' ? 'warning' : ''}`;
            }

            async sendMessage() {
                const message = this.chatInput.value.trim();
                if (!message) return;

                if (!this.isConnected) {
                    this.updateStatus('❌ Sem conexão com o servidor', 'error');
                    return;
                }

                this.addMessage(message, 'user');
                this.chatInput.value = '';
                this.showLoading(true);

                try {
                    const response = await this.callBackendAPI(message);
                    this.addMessage(response, 'bot');
                    this.updateStatus('✅ Sistema funcionando - Pronto para usar!', 'success');
                } catch (error) {
                    console.error('Erro ao chamar API:', error);
                    let errorMessage = 'Desculpe, ocorreu um erro ao processar sua mensagem.';
                    
                    if (error.message.includes('429')) {
                        errorMessage = '⚠️ Limite de requisições excedido. Tente novamente em alguns minutos.';
                        this.updateStatus('⚠️ Limite de requisições atingido', 'error');
                    } else if (error.message.includes('402')) {
                        errorMessage = '💰 Limite de créditos da API excedido. Entre em contato com o administrador.';
                        this.updateStatus('💰 Limite de créditos excedido', 'error');
                    } else if (error.message.includes('503')) {
                        errorMessage = '🔧 Serviço temporariamente indisponível. Tente novamente em alguns minutos.';
                        this.updateStatus('🔧 Serviço temporariamente indisponível', 'error');
                    } else {
                        errorMessage = `❌ Erro: ${error.message}`;
                        this.updateStatus('❌ Erro de comunicação', 'error');
                    }
                    
                    this.addMessage(errorMessage, 'bot');
                } finally {
                    this.showLoading(false);
                }
            }

            async callBackendAPI(message) {
                const response = await fetch(`${this.backendUrl}/api/chat`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        message: message,
                        conversationHistory: this.conversationHistory
                    })
                });

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(`Erro ${response.status}: ${errorData.error || response.statusText}`);
                }

                const data = await response.json();
                
                if (!data.success) {
                    throw new Error(data.error || 'Erro desconhecido');
                }

                // Atualizar histórico da conversa
                this.conversationHistory.push(
                    { role: "user", content: message },
                    { role: "assistant", content: data.response }
                );
                
                // Manter apenas os últimos 10 pares de mensagens
                if (this.conversationHistory.length > 20) {
                    this.conversationHistory = this.conversationHistory.slice(-20);
                }
                
                return data.response;
            }

            addMessage(content, sender) {
                const messageDiv = document.createElement('div');
                messageDiv.className = `message ${sender}`;
                
                const avatar = document.createElement('div');
                avatar.className = 'message-avatar';
                avatar.textContent = sender === 'user' ? '👤' : '🤖';
                
                const messageContent = document.createElement('div');
                messageContent.className = 'message-content';
                messageContent.innerHTML = content.replace(/\n/g, '<br>');
                
                messageDiv.appendChild(avatar);
                messageDiv.appendChild(messageContent);
                
                this.chatMessages.appendChild(messageDiv);
                this.scrollToBottom();
            }

            showLoading(show) {
                this.loading.classList.toggle('show', show);
                this.sendButton.disabled = show;
            }

            scrollToBottom() {
                this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
            }
        }

        // Inicializar o aplicativo quando a página carregar
        document.addEventListener('DOMContentLoaded', () => {
            new ChatApp();
        });
    </script>
</body>
</html>
```

**Arquivo: `frontend/package.json`**
```json
{
  "name": "frontend-static",
  "version": "1.0.0",
  "description": "Static frontend",
  "private": true
}
```

**Arquivo: `frontend/_redirects`**
```
/*    /index.html   200
```

### 1.3 Arquivos de Configuração

**Arquivo: `.netlifyignore`**
```
# Ignorar pasta backend completamente
backend/
backend/**

# Ignorar arquivos de configuração do backend
env.example
*.env
.env*

# Ignorar logs e cache
*.log
node_modules/
npm-debug.log*

# Ignorar arquivos temporários
.DS_Store
Thumbs.db

# Ignorar arquivos de configuração do backend
server.js
*.js
!frontend/*.js
!frontend/*.html
!frontend/*.css

# Ignorar arquivos do Railway
.railwayignore
```

**Arquivo: `.railwayignore`**
```
# Ignorar tudo exceto a pasta backend
frontend/
frontend/**
netlify.toml
.netlifyignore
README.md
DEPLOY*.md
MONOREPO.md
RAILWAY-NETLIFY.md
env.example
*.txt
*.md
!backend/**
```

**Arquivo: `netlify.toml`**
```
[build]
  publish = "frontend"
  command = ""

[build.environment]
  NODE_VERSION = ""

[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-XSS-Protection = "1; mode=block"
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "strict-origin-when-cross-origin"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

## 🚀 Passo 2: Deploy no Railway (Backend)

### 2.1 Preparação
1. **Acesse**: [railway.app](https://railway.app)
2. **Login**: Com sua conta GitHub
3. **New Project**: "Deploy from GitHub repo"

### 2.2 Configuração
1. **Selecione**: Seu repositório
2. **Root Directory**: `backend`
3. **Variáveis de Ambiente**:
   ```
   OPENAI_API_KEY = sk-sua_chave_da_api_openai_aqui
   NODE_ENV = production
   PORT = 3000
   RATE_LIMIT_WINDOW_MS = 900000
   RATE_LIMIT_MAX_REQUESTS = 100
   OPENAI_MODEL = gpt-4o
   OPENAI_MAX_TOKENS = 4000
   OPENAI_TEMPERATURE = 0.3
   ```

### 2.3 Deploy
- **Build Command**: `npm install` (automático)
- **Start Command**: `npm start` (automático)
- **Aguarde**: Deploy automático

### 2.4 Obter URL
Após deploy, você receberá uma URL como:
```
https://seu-projeto-production.up.railway.app
```

## 🎨 Passo 3: Deploy no Netlify (Frontend)

### 3.1 Preparação
1. **Acesse**: [netlify.com](https://netlify.com)
2. **Login**: Com sua conta GitHub
3. **New site**: "Import an existing project"

### 3.2 Configuração
1. **Selecione**: Seu repositório
2. **Base Directory**: `frontend`
3. **Build Command**: (deixe vazio)
4. **Publish Directory**: `frontend`

### 3.3 Deploy
- **Deploy**: Automático
- **Aguarde**: Site ficar disponível

### 3.4 Obter URL
Após deploy, você receberá uma URL como:
```
https://seu-site.netlify.app
```

## 🔗 Passo 4: Conectar Frontend e Backend

### 4.1 Atualizar CORS no Backend
No arquivo `backend/server.js`, atualize as URLs permitidas:
```javascript
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? [
        'https://sua-url.netlify.app',  // ← Sua URL do Netlify
        'https://outro-site.netlify.app'
      ] 
    : ['http://localhost:3000'],
  // ... resto da configuração
}));
```

### 4.2 Atualizar URL no Frontend
No arquivo `frontend/index.html`, atualize a URL do backend:
```javascript
this.backendUrl = 'https://sua-url-railway.up.railway.app';
```

### 4.3 Deploy das Atualizações
```bash
git add .
git commit -m "feat: Conectar frontend com backend"
git push
```

## 🧪 Passo 5: Teste e Validação

### 5.1 Teste do Backend
```bash
curl https://sua-url-railway.up.railway.app/health
```
**Resposta esperada:**
```json
{"status":"OK","timestamp":"2024-01-01T00:00:00.000Z","version":"1.0.0"}
```

### 5.2 Teste do Frontend
1. **Acesse**: Sua URL do Netlify
2. **Verifique**: Se aparece "✅ Sistema funcionando"
3. **Teste**: Envie uma mensagem
4. **Verifique**: Se recebe resposta da IA

### 5.3 Teste Completo
```bash
curl -X POST https://sua-url-railway.up.railway.app/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"Olá, como você está?"}'
```

## 🔄 Passo 6: Deploy Automático

### 6.1 Workflow
```bash
# 1. Fazer alterações no código
# 2. Commit único
git add .
git commit -m "nova funcionalidade"
git push

# 3. Deploy automático em ambos os serviços!
```

### 6.2 Monitoramento
- **Railway**: Logs do backend em tempo real
- **Netlify**: Analytics do frontend
- **GitHub**: Histórico de commits

## 🛠️ Troubleshooting Comum

### Problema: CORS Error
**Sintoma**: `Origin not allowed by Access-Control-Allow-Origin`
**Solução**: Adicionar URL do Netlify no CORS do backend

### Problema: 401 Unauthorized
**Sintoma**: `Chave da API inválida`
**Solução**: Verificar se `OPENAI_API_KEY` está configurada no Railway

### Problema: 429 Too Many Requests
**Sintoma**: `Limite de requisições excedido`
**Solução**: Aumentar limite nas variáveis de ambiente

### Problema: 402 Payment Required
**Sintoma**: `Limite de créditos excedido`
**Solução**: Adicionar créditos na conta OpenAI

## 📊 Monitoramento e Custos

### Custos Estimados
- **Netlify**: Gratuito (até 100GB/mês)
- **Railway**: $5-20/mês (dependendo do uso)
- **OpenAI API**: ~$0.01-0.03 por requisição

### Métricas Importantes
- **Requisições/minuto**: Monitorar uso
- **Tempo de resposta**: Otimizar performance
- **Erros**: Identificar problemas
- **Custos**: Controlar gastos

## 🎯 Próximos Passos

### Melhorias Possíveis
1. **Autenticação**: Sistema de login
2. **Cache**: Reduzir custos da API
3. **Analytics**: Métricas detalhadas
4. **Domínio**: Personalizado
5. **CDN**: Melhor performance

### Escalabilidade
1. **Load Balancer**: Múltiplas instâncias
2. **Database**: Armazenar conversas
3. **Queue**: Processar requisições
4. **Monitoring**: Alertas automáticos

## 📝 Checklist Final

- [ ] Backend deployado no Railway
- [ ] Frontend deployado no Netlify
- [ ] CORS configurado corretamente
- [ ] URLs atualizadas
- [ ] Teste de conexão funcionando
- [ ] Teste de chat funcionando
- [ ] Deploy automático configurado
- [ ] Monitoramento ativo

---

**🎉 Parabéns! Você tem uma aplicação de IA totalmente funcional e pública!**

Este guia serve como template para todos os próximos projetos de integração com IA.
