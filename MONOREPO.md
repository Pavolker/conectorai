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
│   ├── style.css
│   ├── script.js
│   └── netlify.toml
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
