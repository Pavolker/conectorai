# 🚀 Guia Completo: Integração Supabase + Railway + Netlify + IA

## 📋 Visão Geral

Este guia documenta a arquitetura completa para aplicações modernas com:
- **Supabase**: Banco de dados PostgreSQL + Auth + Storage
- **Railway**: Backend Node.js com APIs
- **Netlify**: Frontend estático
- **OpenAI**: Agentes de IA integrados

## 🏗️ Arquitetura da Solução

```
Frontend (Netlify) ←→ Backend (Railway) ←→ Supabase ←→ OpenAI API
     ↓                    ↓                    ↓           ↓
  HTML/CSS/JS          Node.js/Express      PostgreSQL    GPT-4o
  Site Estático        Sua Chave API       Auth/Storage  Sua Conta
```

## 📁 Estrutura do Projeto (Monorepo)

```
projeto-supabase/
├── backend/                 # Railway usa esta pasta
│   ├── server.js           # Servidor Express
│   ├── package.json        # Dependências Node.js
│   ├── supabase.js         # Cliente Supabase
│   └── env.example         # Exemplo de variáveis
├── frontend/                # Netlify usa esta pasta
│   ├── index.html          # Interface do usuário
│   ├── auth.js             # Autenticação Supabase
│   ├── supabase.js         # Cliente Supabase Frontend
│   └── package.json        # Mínimo (sem dependências)
├── supabase/                # Configuração Supabase
│   ├── migrations/         # Migrações do banco
│   ├── seed.sql           # Dados iniciais
│   └── config.toml        # Configuração local
├── .netlifyignore          # Ignora backend
├── .railwayignore          # Ignora frontend
├── netlify.toml            # Configuração Netlify
└── README.md               # Documentação
```

## 🔧 Passo 1: Configuração do Supabase

### 1.1 Criar Projeto Supabase

1. **Acesse**: [supabase.com](https://supabase.com)
2. **Login**: Com sua conta GitHub
3. **New Project**: Crie um novo projeto
4. **Configure**: Nome, senha do banco, região
5. **Aguarde**: Provisionamento (2-3 minutos)

### 1.2 Obter Credenciais

No painel do Supabase, vá em **Settings** → **API**:

```env
# Supabase Configuration
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 1.3 Configurar Banco de Dados

**Arquivo: `supabase/migrations/001_initial_schema.sql`**
```sql
-- Tabela de usuários (extensão do auth.users)
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de conversas
CREATE TABLE public.conversations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de mensagens
CREATE TABLE public.messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de configurações do agente
CREATE TABLE public.agent_configs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  system_prompt TEXT NOT NULL,
  model TEXT DEFAULT 'gpt-4o',
  max_tokens INTEGER DEFAULT 4000,
  temperature DECIMAL DEFAULT 0.3,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX idx_conversations_user_id ON public.conversations(user_id);
CREATE INDEX idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX idx_messages_created_at ON public.messages(created_at);
CREATE INDEX idx_agent_configs_user_id ON public.agent_configs(user_id);

-- RLS (Row Level Security)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_configs ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can view own conversations" ON public.conversations
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own conversations" ON public.conversations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own conversations" ON public.conversations
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own conversations" ON public.conversations
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view messages from own conversations" ON public.messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.conversations 
      WHERE id = messages.conversation_id 
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create messages in own conversations" ON public.messages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.conversations 
      WHERE id = messages.conversation_id 
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view own agent configs" ON public.agent_configs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own agent configs" ON public.agent_configs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own agent configs" ON public.agent_configs
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own agent configs" ON public.agent_configs
  FOR DELETE USING (auth.uid() = user_id);

-- Função para criar perfil automaticamente
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para criar perfil
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Função para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_conversations_updated_at
  BEFORE UPDATE ON public.conversations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_agent_configs_updated_at
  BEFORE UPDATE ON public.agent_configs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
```

## 🚀 Passo 2: Backend com Supabase (Railway)

### 2.1 Dependências do Backend

**Arquivo: `backend/package.json`**
```json
{
  "name": "projeto-supabase-backend",
  "version": "1.0.0",
  "description": "Backend com Supabase + OpenAI",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js"
  },
  "keywords": ["supabase", "openai", "backend", "api"],
  "author": "Seu Nome",
  "license": "MIT",
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "helmet": "^7.1.0",
    "express-rate-limit": "^7.1.5",
    "dotenv": "^16.3.1",
    "openai": "^4.20.1",
    "express-validator": "^7.0.1",
    "@supabase/supabase-js": "^2.38.0",
    "jsonwebtoken": "^9.0.2",
    "bcryptjs": "^2.4.3"
  },
  "devDependencies": {
    "nodemon": "^3.0.2"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}
```

### 2.2 Cliente Supabase

**Arquivo: `backend/supabase.js`**
```javascript
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Supabase URL e Service Key são obrigatórios');
}

// Cliente com service role para operações administrativas
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Cliente para operações do usuário (com anon key)
const supabaseAnon = createClient(supabaseUrl, process.env.SUPABASE_ANON_KEY);

module.exports = {
  supabase,
  supabaseAnon
};
```

### 2.3 Servidor Principal

**Arquivo: `backend/server.js`**
```javascript
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const OpenAI = require('openai');
const { supabase, supabaseAnon } = require('./supabase');
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

// Middleware para verificar autenticação
const authenticateUser = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token de acesso necessário' });
    }

    const token = authHeader.substring(7);
    
    // Verificar token com Supabase
    const { data: { user }, error } = await supabaseAnon.auth.getUser(token);
    
    if (error || !user) {
      return res.status(401).json({ error: 'Token inválido' });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Erro na autenticação:', error);
    res.status(401).json({ error: 'Erro na autenticação' });
  }
};

// Rota de saúde
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    services: {
      supabase: 'connected',
      openai: process.env.OPENAI_API_KEY ? 'configured' : 'not_configured'
    }
  });
});

// Rota para criar conversa
app.post('/api/conversations', authenticateUser, [
  body('title').isString().isLength({ min: 1, max: 200 }).withMessage('Título inválido')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { title } = req.body;
    const userId = req.user.id;

    const { data: conversation, error } = await supabase
      .from('conversations')
      .insert({
        user_id: userId,
        title: title
      })
      .select()
      .single();

    if (error) {
      console.error('Erro ao criar conversa:', error);
      return res.status(500).json({ error: 'Erro ao criar conversa' });
    }

    res.json({ success: true, conversation });
  } catch (error) {
    console.error('Erro na criação da conversa:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Rota para listar conversas do usuário
app.get('/api/conversations', authenticateUser, async (req, res) => {
  try {
    const userId = req.user.id;

    const { data: conversations, error } = await supabase
      .from('conversations')
      .select(`
        id,
        title,
        created_at,
        updated_at,
        messages (
          id,
          role,
          content,
          created_at
        )
      `)
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Erro ao buscar conversas:', error);
      return res.status(500).json({ error: 'Erro ao buscar conversas' });
    }

    res.json({ success: true, conversations });
  } catch (error) {
    console.error('Erro ao buscar conversas:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Rota para chat com IA
app.post('/api/chat', authenticateUser, [
  body('message').isString().isLength({ min: 1, max: 10000 }).withMessage('Mensagem inválida'),
  body('conversationId').optional().isUUID().withMessage('ID da conversa inválido'),
  body('agentConfigId').optional().isUUID().withMessage('ID da configuração inválido')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { message, conversationId, agentConfigId } = req.body;
    const userId = req.user.id;

    // Buscar configuração do agente
    let agentConfig = {
      system_prompt: "Você é um assistente útil e amigável.",
      model: "gpt-4o",
      max_tokens: 4000,
      temperature: 0.3
    };

    if (agentConfigId) {
      const { data: config, error: configError } = await supabase
        .from('agent_configs')
        .select('*')
        .eq('id', agentConfigId)
        .eq('user_id', userId)
        .single();

      if (!configError && config) {
        agentConfig = config;
      }
    }

    // Buscar histórico da conversa
    let conversationHistory = [];
    if (conversationId) {
      const { data: messages, error: messagesError } = await supabase
        .from('messages')
        .select('role, content')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })
        .limit(20); // Últimas 20 mensagens

      if (!messagesError && messages) {
        conversationHistory = messages;
      }
    }

    // Construir mensagens para OpenAI
    const messages = [
      { role: 'system', content: agentConfig.system_prompt },
      ...conversationHistory,
      { role: 'user', content: message }
    ];

    // Chamar OpenAI
    const completion = await openai.chat.completions.create({
      model: agentConfig.model,
      messages: messages,
      max_tokens: agentConfig.max_tokens,
      temperature: agentConfig.temperature,
    });

    const response = completion.choices[0]?.message?.content || 'Resposta não encontrada';

    // Salvar mensagens no banco
    if (conversationId) {
      // Salvar mensagem do usuário
      await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          role: 'user',
          content: message
        });

      // Salvar resposta da IA
      await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          role: 'assistant',
          content: response,
          metadata: {
            model: completion.model,
            usage: completion.usage,
            agent_config_id: agentConfigId
          }
        });

      // Atualizar timestamp da conversa
      await supabase
        .from('conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', conversationId);
    }

    res.json({
      success: true,
      response: response,
      usage: completion.usage,
      model: completion.model,
      conversationId: conversationId
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

// Rota para criar configuração de agente
app.post('/api/agent-configs', authenticateUser, [
  body('name').isString().isLength({ min: 1, max: 100 }).withMessage('Nome inválido'),
  body('system_prompt').isString().isLength({ min: 1, max: 10000 }).withMessage('Prompt inválido'),
  body('model').optional().isString().withMessage('Modelo inválido'),
  body('max_tokens').optional().isInt({ min: 1, max: 8000 }).withMessage('Tokens inválidos'),
  body('temperature').optional().isFloat({ min: 0, max: 2 }).withMessage('Temperatura inválida')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, system_prompt, model, max_tokens, temperature } = req.body;
    const userId = req.user.id;

    const { data: config, error } = await supabase
      .from('agent_configs')
      .insert({
        user_id: userId,
        name: name,
        system_prompt: system_prompt,
        model: model || 'gpt-4o',
        max_tokens: max_tokens || 4000,
        temperature: temperature || 0.3
      })
      .select()
      .single();

    if (error) {
      console.error('Erro ao criar configuração:', error);
      return res.status(500).json({ error: 'Erro ao criar configuração' });
    }

    res.json({ success: true, config });
  } catch (error) {
    console.error('Erro ao criar configuração:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Rota para listar configurações do usuário
app.get('/api/agent-configs', authenticateUser, async (req, res) => {
  try {
    const userId = req.user.id;

    const { data: configs, error } = await supabase
      .from('agent_configs')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erro ao buscar configurações:', error);
      return res.status(500).json({ error: 'Erro ao buscar configurações' });
    }

    res.json({ success: true, configs });
  } catch (error) {
    console.error('Erro ao buscar configurações:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`📊 Supabase conectado`);
  console.log(`🤖 OpenAI configurado`);
  console.log(`🌐 Acesse: http://localhost:${PORT}`);
});

module.exports = app;
```

### 2.4 Variáveis de Ambiente

**Arquivo: `backend/env.example`**
```env
# Supabase Configuration
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# OpenAI Configuration
OPENAI_API_KEY=sk-sua_chave_da_api_openai_aqui
OPENAI_MODEL=gpt-4o
OPENAI_MAX_TOKENS=4000
OPENAI_TEMPERATURE=0.3

# Server Configuration
PORT=3000
NODE_ENV=production

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

## 🎨 Passo 3: Frontend com Supabase (Netlify)

### 3.1 HTML Principal

**Arquivo: `frontend/index.html`**
```html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Agente IA com Supabase</title>
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

        .app-container {
            width: 100%;
            max-width: 1200px;
            height: 90vh;
            background: white;
            border-radius: 20px;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
            display: flex;
            overflow: hidden;
        }

        .sidebar {
            width: 300px;
            background: #f8f9fa;
            border-right: 1px solid #e0e0e0;
            display: flex;
            flex-direction: column;
        }

        .sidebar-header {
            padding: 20px;
            border-bottom: 1px solid #e0e0e0;
        }

        .user-info {
            display: flex;
            align-items: center;
            gap: 10px;
            margin-bottom: 15px;
        }

        .user-avatar {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: bold;
        }

        .user-name {
            font-weight: bold;
            color: #333;
        }

        .auth-buttons {
            display: flex;
            gap: 10px;
        }

        .btn {
            padding: 8px 16px;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-size: 14px;
            font-weight: bold;
            transition: all 0.2s;
        }

        .btn-primary {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
        }

        .btn-secondary {
            background: #6c757d;
            color: white;
        }

        .btn:hover {
            transform: translateY(-1px);
        }

        .conversations-list {
            flex: 1;
            overflow-y: auto;
            padding: 20px;
        }

        .conversation-item {
            padding: 12px;
            border-radius: 8px;
            cursor: pointer;
            margin-bottom: 8px;
            transition: background-color 0.2s;
        }

        .conversation-item:hover {
            background: #e9ecef;
        }

        .conversation-item.active {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
        }

        .conversation-title {
            font-weight: bold;
            margin-bottom: 4px;
        }

        .conversation-date {
            font-size: 12px;
            opacity: 0.7;
        }

        .main-content {
            flex: 1;
            display: flex;
            flex-direction: column;
        }

        .chat-header {
            padding: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            text-align: center;
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

        .login-form {
            padding: 20px;
            background: white;
            border-radius: 8px;
            margin: 20px;
        }

        .form-group {
            margin-bottom: 15px;
        }

        .form-group label {
            display: block;
            margin-bottom: 5px;
            font-weight: bold;
            color: #333;
        }

        .form-group input {
            width: 100%;
            padding: 10px;
            border: 1px solid #ddd;
            border-radius: 4px;
            font-size: 14px;
        }

        @media (max-width: 768px) {
            .app-container {
                flex-direction: column;
                height: 95vh;
            }
            
            .sidebar {
                width: 100%;
                height: 200px;
            }
            
            .message-content {
                max-width: 85%;
            }
        }
    </style>
</head>
<body>
    <div class="app-container">
        <div class="sidebar">
            <div class="sidebar-header">
                <div id="userInfo" class="user-info" style="display: none;">
                    <div class="user-avatar" id="userAvatar">👤</div>
                    <div class="user-name" id="userName">Usuário</div>
                </div>
                <div id="authButtons" class="auth-buttons">
                    <button id="loginBtn" class="btn btn-primary">Entrar</button>
                    <button id="signupBtn" class="btn btn-secondary">Cadastrar</button>
                </div>
            </div>
            <div class="conversations-list" id="conversationsList">
                <!-- Conversas serão carregadas aqui -->
            </div>
        </div>

        <div class="main-content">
            <div class="chat-header">
                <h1>🤖 Agente IA com Supabase</h1>
            </div>
            
            <div class="status-section" id="statusSection">
                ✅ Sistema funcionando - Faça login para começar!
            </div>

            <div class="chat-messages" id="chatMessages">
                <div class="message bot">
                    <div class="message-avatar">🤖</div>
                    <div class="message-content">
                        <strong>Olá! Bem-vindo ao Agente IA.</strong><br><br>
                        Faça login para começar a conversar e salvar suas conversas!
                    </div>
                </div>
            </div>

            <div class="loading" id="loading">
                <div>🤖 Agente está pensando...</div>
            </div>

            <div class="chat-input-container">
                <div class="input-row">
                    <input type="text" id="chatInput" class="chat-input" placeholder="Digite sua mensagem aqui..." disabled>
                    <button id="sendButton" class="send-button" disabled>Enviar</button>
                </div>
            </div>
        </div>
    </div>

    <!-- Modal de Login -->
    <div id="loginModal" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 1000;">
        <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); background: white; padding: 30px; border-radius: 10px; width: 90%; max-width: 400px;">
            <h2 style="margin-bottom: 20px; text-align: center;">Entrar</h2>
            <div class="form-group">
                <label for="loginEmail">Email:</label>
                <input type="email" id="loginEmail" placeholder="seu@email.com">
            </div>
            <div class="form-group">
                <label for="loginPassword">Senha:</label>
                <input type="password" id="loginPassword" placeholder="Sua senha">
            </div>
            <div style="display: flex; gap: 10px; margin-top: 20px;">
                <button id="loginSubmit" class="btn btn-primary" style="flex: 1;">Entrar</button>
                <button id="loginCancel" class="btn btn-secondary" style="flex: 1;">Cancelar</button>
            </div>
        </div>
    </div>

    <!-- Modal de Cadastro -->
    <div id="signupModal" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 1000;">
        <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); background: white; padding: 30px; border-radius: 10px; width: 90%; max-width: 400px;">
            <h2 style="margin-bottom: 20px; text-align: center;">Cadastrar</h2>
            <div class="form-group">
                <label for="signupEmail">Email:</label>
                <input type="email" id="signupEmail" placeholder="seu@email.com">
            </div>
            <div class="form-group">
                <label for="signupPassword">Senha:</label>
                <input type="password" id="signupPassword" placeholder="Mínimo 6 caracteres">
            </div>
            <div class="form-group">
                <label for="signupName">Nome:</label>
                <input type="text" id="signupName" placeholder="Seu nome completo">
            </div>
            <div style="display: flex; gap: 10px; margin-top: 20px;">
                <button id="signupSubmit" class="btn btn-primary" style="flex: 1;">Cadastrar</button>
                <button id="signupCancel" class="btn btn-secondary" style="flex: 1;">Cancelar</button>
            </div>
        </div>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
    <script src="auth.js"></script>
    <script src="app.js"></script>
</body>
</html>
```

### 3.2 Autenticação Supabase

**Arquivo: `frontend/auth.js`**
```javascript
// Configuração Supabase
const SUPABASE_URL = 'https://seu-projeto.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

class AuthManager {
    constructor() {
        this.user = null;
        this.session = null;
        this.initializeAuth();
    }

    async initializeAuth() {
        // Verificar sessão existente
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (session && !error) {
            this.session = session;
            this.user = session.user;
            this.onAuthStateChange(true);
        } else {
            this.onAuthStateChange(false);
        }

        // Escutar mudanças de autenticação
        supabase.auth.onAuthStateChange((event, session) => {
            this.session = session;
            this.user = session?.user || null;
            this.onAuthStateChange(!!session);
        });
    }

    onAuthStateChange(isAuthenticated) {
        const userInfo = document.getElementById('userInfo');
        const authButtons = document.getElementById('authButtons');
        const chatInput = document.getElementById('chatInput');
        const sendButton = document.getElementById('sendButton');

        if (isAuthenticated) {
            userInfo.style.display = 'flex';
            authButtons.style.display = 'none';
            chatInput.disabled = false;
            sendButton.disabled = false;

            // Atualizar informações do usuário
            const userName = document.getElementById('userName');
            const userAvatar = document.getElementById('userAvatar');
            
            userName.textContent = this.user.user_metadata?.full_name || this.user.email;
            userAvatar.textContent = (this.user.user_metadata?.full_name || this.user.email).charAt(0).toUpperCase();

            // Carregar conversas
            if (window.app) {
                window.app.loadConversations();
            }
        } else {
            userInfo.style.display = 'none';
            authButtons.style.display = 'flex';
            chatInput.disabled = true;
            sendButton.disabled = true;

            // Limpar conversas
            if (window.app) {
                window.app.clearConversations();
            }
        }
    }

    async signUp(email, password, fullName) {
        try {
            const { data, error } = await supabase.auth.signUp({
                email: email,
                password: password,
                options: {
                    data: {
                        full_name: fullName
                    }
                }
            });

            if (error) throw error;

            if (data.user && !data.user.email_confirmed_at) {
                alert('Verifique seu email para confirmar a conta!');
            }

            return { success: true, data };
        } catch (error) {
            console.error('Erro no cadastro:', error);
            return { success: false, error: error.message };
        }
    }

    async signIn(email, password) {
        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email: email,
                password: password
            });

            if (error) throw error;

            return { success: true, data };
        } catch (error) {
            console.error('Erro no login:', error);
            return { success: false, error: error.message };
        }
    }

    async signOut() {
        try {
            const { error } = await supabase.auth.signOut();
            if (error) throw error;
            return { success: true };
        } catch (error) {
            console.error('Erro no logout:', error);
            return { success: false, error: error.message };
        }
    }

    getAccessToken() {
        return this.session?.access_token || null;
    }
}

// Inicializar gerenciador de autenticação
window.authManager = new AuthManager();

// Event listeners para modais
document.addEventListener('DOMContentLoaded', () => {
    const loginBtn = document.getElementById('loginBtn');
    const signupBtn = document.getElementById('signupBtn');
    const loginModal = document.getElementById('loginModal');
    const signupModal = document.getElementById('signupModal');
    const loginCancel = document.getElementById('loginCancel');
    const signupCancel = document.getElementById('signupCancel');
    const loginSubmit = document.getElementById('loginSubmit');
    const signupSubmit = document.getElementById('signupSubmit');

    // Abrir modais
    loginBtn.addEventListener('click', () => {
        loginModal.style.display = 'block';
    });

    signupBtn.addEventListener('click', () => {
        signupModal.style.display = 'block';
    });

    // Fechar modais
    loginCancel.addEventListener('click', () => {
        loginModal.style.display = 'none';
    });

    signupCancel.addEventListener('click', () => {
        signupModal.style.display = 'none';
    });

    // Fechar clicando fora
    loginModal.addEventListener('click', (e) => {
        if (e.target === loginModal) {
            loginModal.style.display = 'none';
        }
    });

    signupModal.addEventListener('click', (e) => {
        if (e.target === signupModal) {
            signupModal.style.display = 'none';
        }
    });

    // Submit login
    loginSubmit.addEventListener('click', async () => {
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;

        if (!email || !password) {
            alert('Preencha todos os campos!');
            return;
        }

        const result = await window.authManager.signIn(email, password);
        
        if (result.success) {
            loginModal.style.display = 'none';
            document.getElementById('loginEmail').value = '';
            document.getElementById('loginPassword').value = '';
        } else {
            alert('Erro no login: ' + result.error);
        }
    });

    // Submit signup
    signupSubmit.addEventListener('click', async () => {
        const email = document.getElementById('signupEmail').value;
        const password = document.getElementById('signupPassword').value;
        const name = document.getElementById('signupName').value;

        if (!email || !password || !name) {
            alert('Preencha todos os campos!');
            return;
        }

        if (password.length < 6) {
            alert('A senha deve ter pelo menos 6 caracteres!');
            return;
        }

        const result = await window.authManager.signUp(email, password, name);
        
        if (result.success) {
            signupModal.style.display = 'none';
            document.getElementById('signupEmail').value = '';
            document.getElementById('signupPassword').value = '';
            document.getElementById('signupName').value = '';
        } else {
            alert('Erro no cadastro: ' + result.error);
        }
    });
});
```

### 3.3 Aplicação Principal

**Arquivo: `frontend/app.js`**
```javascript
class ChatApp {
    constructor() {
        this.conversationHistory = [];
        this.currentConversationId = null;
        this.isConnected = false;
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
        this.conversationsList = document.getElementById('conversationsList');
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
                this.updateStatus('✅ Sistema funcionando - Faça login para começar!', 'success');
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

    async loadConversations() {
        if (!window.authManager.user) return;

        try {
            const token = window.authManager.getAccessToken();
            const response = await fetch(`${this.backendUrl}/api/conversations`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`Erro ${response.status}`);
            }

            const data = await response.json();
            this.displayConversations(data.conversations || []);
        } catch (error) {
            console.error('Erro ao carregar conversas:', error);
        }
    }

    displayConversations(conversations) {
        this.conversationsList.innerHTML = '';

        conversations.forEach(conversation => {
            const conversationDiv = document.createElement('div');
            conversationDiv.className = 'conversation-item';
            conversationDiv.innerHTML = `
                <div class="conversation-title">${conversation.title}</div>
                <div class="conversation-date">${new Date(conversation.updated_at).toLocaleDateString()}</div>
            `;

            conversationDiv.addEventListener('click', () => {
                this.loadConversation(conversation);
            });

            this.conversationsList.appendChild(conversationDiv);
        });
    }

    loadConversation(conversation) {
        this.currentConversationId = conversation.id;
        this.conversationHistory = conversation.messages || [];

        // Atualizar UI
        document.querySelectorAll('.conversation-item').forEach(item => {
            item.classList.remove('active');
        });
        event.currentTarget.classList.add('active');

        // Limpar mensagens
        this.chatMessages.innerHTML = '';

        // Carregar mensagens
        this.conversationHistory.forEach(message => {
            this.addMessage(message.content, message.role);
        });

        this.scrollToBottom();
    }

    clearConversations() {
        this.conversationsList.innerHTML = '';
        this.currentConversationId = null;
        this.conversationHistory = [];
        this.chatMessages.innerHTML = `
            <div class="message bot">
                <div class="message-avatar">🤖</div>
                <div class="message-content">
                    <strong>Olá! Bem-vindo ao Agente IA.</strong><br><br>
                    Faça login para começar a conversar e salvar suas conversas!
                </div>
            </div>
        `;
    }

    async sendMessage() {
        const message = this.chatInput.value.trim();
        if (!message || !this.isConnected || !window.authManager.user) return;

        // Adicionar mensagem do usuário
        this.addMessage(message, 'user');
        this.chatInput.value = '';
        this.showLoading(true);

        try {
            const token = window.authManager.getAccessToken();
            const response = await this.callBackendAPI(message, token);
            this.addMessage(response, 'bot');
            this.updateStatus('✅ Sistema funcionando', 'success');
        } catch (error) {
            console.error('Erro ao chamar API:', error);
            let errorMessage = 'Desculpe, ocorreu um erro ao processar sua mensagem.';
            
            if (error.message.includes('429')) {
                errorMessage = '⚠️ Limite de requisições excedido. Tente novamente em alguns minutos.';
            } else if (error.message.includes('402')) {
                errorMessage = '💰 Limite de créditos da API excedido.';
            } else if (error.message.includes('401')) {
                errorMessage = '🔐 Sessão expirada. Faça login novamente.';
            }
            
            this.addMessage(errorMessage, 'bot');
        } finally {
            this.showLoading(false);
        }
    }

    async callBackendAPI(message, token) {
        const response = await fetch(`${this.backendUrl}/api/chat`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                message: message,
                conversationId: this.currentConversationId
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

        // Atualizar ID da conversa se foi criada uma nova
        if (data.conversationId && !this.currentConversationId) {
            this.currentConversationId = data.conversationId;
            // Recarregar conversas para mostrar a nova
            this.loadConversations();
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

// Inicializar aplicação
document.addEventListener('DOMContentLoaded', () => {
    window.app = new ChatApp();
});
```

## 🚀 Passo 4: Deploy e Configuração

### 4.1 Deploy no Railway (Backend)

1. **Configure variáveis de ambiente**:
   ```
   SUPABASE_URL=https://seu-projeto.supabase.co
   SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   OPENAI_API_KEY=sk-sua_chave_da_api_openai_aqui
   NODE_ENV=production
   ```

2. **Root Directory**: `backend`

### 4.2 Deploy no Netlify (Frontend)

1. **Configure URLs** no `frontend/auth.js` e `frontend/app.js`
2. **Base Directory**: `frontend`

### 4.3 Configurar CORS

Atualize as URLs permitidas no backend para incluir sua URL do Netlify.

## 🧪 Passo 5: Teste e Validação

### 5.1 Teste de Autenticação
1. **Cadastre** um usuário
2. **Faça login**
3. **Verifique** se o perfil foi criado no Supabase

### 5.2 Teste de Chat
1. **Envie** uma mensagem
2. **Verifique** se foi salva no banco
3. **Recarregue** a página e veja se as conversas persistem

### 5.3 Teste de Persistência
1. **Crie** várias conversas
2. **Navegue** entre elas
3. **Verifique** se o histórico é mantido

## 📊 Monitoramento e Custos

### Custos Estimados
- **Supabase**: Gratuito (até 500MB DB, 50k usuários)
- **Railway**: $5-20/mês
- **Netlify**: Gratuito
- **OpenAI API**: ~$0.01-0.03 por requisição

### Métricas Importantes
- **Usuários ativos**: Supabase Dashboard
- **Requisições**: Railway Logs
- **Conversas**: Supabase Database
- **Custos**: OpenAI Usage

## 🎯 Próximos Passos

### Melhorias Possíveis
1. **Configurações de Agente**: Interface para personalizar prompts
2. **Compartilhamento**: Compartilhar conversas
3. **Exportação**: Exportar conversas em PDF
4. **Notificações**: Push notifications
5. **Mobile App**: React Native com Supabase

### Escalabilidade
1. **CDN**: Para assets estáticos
2. **Load Balancer**: Múltiplas instâncias Railway
3. **Database**: Otimizações de query
4. **Caching**: Redis para sessões

---

**🎉 Parabéns! Você tem uma aplicação completa com Supabase + Railway + Netlify + IA!**

Este guia serve como template para todos os próximos projetos com esta arquitetura.
