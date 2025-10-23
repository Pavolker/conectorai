# Escriba de Capítulos - Monorepo

## 📁 Estrutura do Projeto

```
escriba-capítulos/
├── backend/                 # Railway vai usar esta pasta
│   ├── server.js
│   ├── package.json
│   ├── env.example
│   └── .gitignore
├── frontend/                # Netlify vai usar esta pasta
│   ├── index.html
│   ├── netlify.toml
│   └── .gitignore
├── package.json             # Root package.json
├── README.md
└── .gitignore
```

## 🚀 Deploy Automático

### Railway (Backend)
- **Root Directory**: `backend/`
- **Build Command**: `npm install`
- **Start Command**: `npm start`

### Netlify (Frontend)
- **Base Directory**: `frontend/`
- **Build Command**: `echo "Static site"`
- **Publish Directory**: `frontend/`

## 🔧 Configuração Local

```bash
# Instalar dependências
npm run install:all

# Desenvolvimento local
npm run dev

# Deploy manual
npm run deploy:railway
npm run deploy:netlify
```

## 📝 Workflow

1. **Desenvolvimento**: Faça alterações no código
2. **Commit**: `git add . && git commit -m "feat: nova funcionalidade"`
3. **Push**: `git push origin main`
4. **Deploy Automático**: 
   - Railway detecta mudanças em `backend/`
   - Netlify detecta mudanças em `frontend/`
   - Ambos fazem deploy automaticamente

## 🔗 URLs

- **Backend**: `https://escriba-backend.up.railway.app`
- **Frontend**: `https://escriba-capítulos.netlify.app`

## 🎯 Vantagens

- ✅ **Um único repositório** para gerenciar
- ✅ **Deploy automático** em ambos os serviços
- ✅ **Versionamento sincronizado** entre frontend e backend
- ✅ **Desenvolvimento local** integrado
- ✅ **CI/CD simplificado**

## 🔧 Configuração nos Serviços

### Railway
1. Conecte ao repositório GitHub
2. Configure **Root Directory** como `backend/`
3. Configure variáveis de ambiente
4. Deploy automático

### Netlify
1. Conecte ao mesmo repositório GitHub
2. Configure **Base Directory** como `frontend/`
3. Configure **Build Command** como `echo "Static site"`
4. Configure **Publish Directory** como `frontend/`
5. Deploy automático

## 📊 Monitoramento

- **Railway**: Logs do backend em tempo real
- **Netlify**: Analytics do frontend
- **GitHub**: Histórico de commits e releases
- **Integração**: Ambos serviços conectados ao mesmo repo

---

**🎉 Com esta estrutura, um único commit atualiza tanto o frontend quanto o backend!**