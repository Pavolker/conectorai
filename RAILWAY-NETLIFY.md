# 🔗 Conectando Railway + Netlify - Guia Completo

## 📋 Visão Geral da Arquitetura

```
Frontend (Netlify) ←→ Backend (Railway) ←→ OpenAI API
     ↓                    ↓                    ↓
  index.html          server.js            GPT-4o
  CSS/JS              Express              Sua Chave
```

## 🚂 Passo 1: Deploy do Backend no Railway

### **1.1 Preparar o Código**
```bash
# Certifique-se de que tem estes arquivos:
# - server.js
# - package.json
# - env.example
# - .gitignore
```

### **1.2 Deploy via Interface Web (Recomendado)**
1. Acesse [railway.app](https://railway.app)
2. Clique em "Login" e conecte sua conta GitHub
3. Clique em "New Project" → "Deploy from GitHub repo"
4. Selecione seu repositório
5. Railway detectará automaticamente que é Node.js

### **1.3 Configurar Variáveis de Ambiente**
No painel do Railway:
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

### **1.4 Obter URL do Backend**
Após o deploy, você receberá uma URL como:
```
https://escriba-backend-production.up.railway.app
```

## 🎨 Passo 2: Deploy do Frontend no Netlify

### **2.1 Preparar Arquivos**
1. Renomeie `index-netlify.html` para `index.html`
2. Edite o arquivo e substitua a URL do backend:

```javascript
// No arquivo index.html, linha ~250:
this.backendUrl = 'https://SUA_URL_DO_RAILWAY.up.railway.app';
```

### **2.2 Deploy no Netlify**
1. Acesse [netlify.com](https://netlify.com)
2. Arraste a pasta com os arquivos para a área de deploy
3. Ou conecte seu repositório GitHub
4. Configure o domínio (opcional)

### **2.3 Obter URL do Frontend**
Após o deploy, você receberá uma URL como:
```
https://escriba-capítulos.netlify.app
```

## 🔧 Passo 3: Configurar CORS

### **3.1 Atualizar CORS no Backend**
No arquivo `server.js`, atualize as URLs permitidas:

```javascript
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? [
        'https://escriba-capítulos.netlify.app',  // ← Sua URL do Netlify
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
```

### **3.2 Fazer Novo Deploy**
Após alterar o CORS, faça um novo deploy no Railway.

## 🧪 Passo 4: Testar a Conexão

### **4.1 Teste do Backend**
```bash
# Teste se o backend está funcionando
curl https://sua-url-railway.up.railway.app/health

# Resposta esperada:
{"status":"OK","timestamp":"2024-01-01T00:00:00.000Z","version":"1.0.0"}
```

### **4.2 Teste do Frontend**
1. Acesse sua URL do Netlify
2. Verifique se aparece "✅ Sistema funcionando"
3. Teste enviando uma mensagem

### **4.3 Teste Completo**
```bash
# Teste da API de chat
curl -X POST https://sua-url-railway.up.railway.app/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"Tema: Teste de funcionamento"}'
```

## 🔍 Troubleshooting

### **Problema: CORS Error**
```
Access to fetch at 'https://backend.railway.app' from origin 'https://frontend.netlify.app' has been blocked by CORS policy
```

**Solução:**
1. Verificar se a URL do frontend está no CORS do backend
2. Fazer novo deploy do backend
3. Limpar cache do navegador

### **Problema: 404 Not Found**
```
GET https://backend.railway.app/api/chat 404 (Not Found)
```

**Solução:**
1. Verificar se a URL do backend está correta
2. Verificar se o endpoint `/api/chat` existe
3. Verificar logs do Railway

### **Problema: 500 Internal Server Error**
```
POST https://backend.railway.app/api/chat 500 (Internal Server Error)
```

**Solução:**
1. Verificar se `OPENAI_API_KEY` está configurada
2. Verificar logs do Railway
3. Testar a chave da API separadamente

## 📊 Monitoramento

### **Railway Dashboard**
- Acesse o painel do Railway
- Veja logs em tempo real
- Monitore uso de recursos
- Configure alertas

### **Netlify Dashboard**
- Acesse o painel do Netlify
- Veja analytics de uso
- Configure domínio personalizado
- Configure redirects

## 🔄 Workflow de Atualizações

### **Atualizar Backend:**
1. Faça alterações no código
2. Push para GitHub
3. Railway faz deploy automático
4. Teste a nova versão

### **Atualizar Frontend:**
1. Faça alterações no código
2. Push para GitHub (se conectado)
3. Ou faça novo deploy manual no Netlify
4. Teste a nova versão

## 💡 Dicas Importantes

### **URLs Dinâmicas:**
- Railway pode mudar a URL em alguns casos
- Configure um domínio personalizado se necessário
- Use variáveis de ambiente para URLs

### **Segurança:**
- Nunca exponha a chave da API no frontend
- Use HTTPS sempre
- Configure rate limiting adequadamente

### **Performance:**
- Monitore uso da API OpenAI
- Configure cache se necessário
- Use CDN para assets estáticos

## 🎯 Checklist Final

- [ ] Backend deployado no Railway
- [ ] Variáveis de ambiente configuradas
- [ ] Frontend deployado no Netlify
- [ ] URL do backend atualizada no frontend
- [ ] CORS configurado corretamente
- [ ] Teste de conexão funcionando
- [ ] Teste de chat funcionando
- [ ] Monitoramento configurado

---

**🎉 Parabéns! Seu Escriba de Capítulos está funcionando com Railway + Netlify!**
