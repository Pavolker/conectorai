# 🚀 Deploy do Escriba de Capítulos - Backend + Frontend

## 📋 Pré-requisitos

- Node.js 18+ instalado
- Conta OpenAI com créditos
- Conta no Netlify (para frontend)
- Conta no Railway/Render/Heroku (para backend)

## 🔧 Configuração Local

### 1. Instalar Dependências
```bash
npm install
```

### 2. Configurar Variáveis de Ambiente
```bash
# Copiar arquivo de exemplo
cp env.example .env

# Editar .env com suas configurações
nano .env
```

**Conteúdo do .env:**
```env
OPENAI_API_KEY=sk-sua_chave_da_api_openai_aqui
PORT=3000
NODE_ENV=production
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
OPENAI_MODEL=gpt-4o
OPENAI_MAX_TOKENS=4000
OPENAI_TEMPERATURE=0.3
```

### 3. Testar Localmente
```bash
# Modo desenvolvimento
npm run dev

# Modo produção
npm start
```

Acesse: `http://localhost:3000`

## 🌐 Deploy do Backend

### Opção 1: Railway (Recomendado)
1. Conecte seu repositório GitHub ao Railway
2. Configure as variáveis de ambiente no painel
3. Deploy automático

### Opção 2: Render
1. Conecte repositório ao Render
2. Configure variáveis de ambiente
3. Deploy automático

### Opção 3: Heroku
```bash
# Instalar Heroku CLI
heroku create escriba-capítulos-backend
heroku config:set OPENAI_API_KEY=sua_chave_aqui
git push heroku main
```

## 🎨 Deploy do Frontend (Netlify)

### 1. Preparar Arquivos
- Use `index-backend.html` como `index.html`
- Atualize URLs do backend no frontend

### 2. Deploy no Netlify
1. Arraste a pasta para netlify.com
2. Configure domínio personalizado (opcional)
3. Configure variáveis de ambiente se necessário

### 3. Configurar CORS
No backend, atualize as URLs permitidas:
```javascript
origin: [
  'https://seu-site.netlify.app',
  'https://seu-dominio.com'
]
```

## 🔒 Configurações de Segurança

### Rate Limiting
- 100 requisições por 15 minutos por IP
- Configurável via variáveis de ambiente

### CORS
- Apenas domínios específicos permitidos
- Credenciais habilitadas

### Helmet
- Headers de segurança configurados
- Proteção contra XSS e CSRF

## 📊 Monitoramento

### Logs
```bash
# Ver logs em produção
heroku logs --tail
# ou
railway logs
```

### Métricas
- Uso da API OpenAI
- Requisições por minuto
- Erros e exceções

## 🛠️ Manutenção

### Atualizar Dependências
```bash
npm update
npm audit fix
```

### Backup
- Configurações em variáveis de ambiente
- Código no GitHub
- Logs nos serviços de deploy

## 🚨 Troubleshooting

### Erro 401 - API Key
- Verificar se OPENAI_API_KEY está configurada
- Verificar se a chave é válida
- Verificar créditos na conta OpenAI

### Erro 429 - Rate Limit
- Aumentar limite nas variáveis de ambiente
- Implementar cache se necessário

### Erro CORS
- Verificar URLs permitidas no backend
- Verificar configuração do Netlify

### Erro 500 - Servidor
- Verificar logs do servidor
- Verificar configuração das variáveis
- Verificar conectividade com OpenAI

## 📈 Otimizações

### Performance
- Implementar cache de respostas
- Compressão gzip
- CDN para assets estáticos

### Escalabilidade
- Load balancer
- Múltiplas instâncias
- Database para histórico

### Custos
- Monitorar uso da API OpenAI
- Implementar limites por usuário
- Cache inteligente

## 🔄 Atualizações

### Deploy Automático
- GitHub Actions para CI/CD
- Testes automatizados
- Deploy em staging e produção

### Versionamento
- Semantic versioning
- Changelog detalhado
- Rollback rápido

---

**📞 Suporte:** Verifique logs e configurações antes de entrar em contato.
