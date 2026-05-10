# 🚀 API REST - FUTSAL UNIVERSE BACKEND

## ✅ SERVIDOR RODANDO!

O backend Node.js com SQLite está **funcionando perfeitamente**!

```
📡 Backend:  http://localhost:3001
🎨 Frontend: http://localhost:3000
💾 Banco:    backend/futsal.db
📊 Schema:   Versão 2 (migrations aplicadas)
```

---

## 🧪 TESTAR A API

### 1. Health Check
```bash
curl http://localhost:3001/api/health
```

**Resposta esperada:**
```json
{
  "status": "ok",
  "database": "connected",
  "version": 2,
  "timestamp": "2026-01-21T11:17:00.000Z"
}
```

### 2. Versão do Schema
```bash
curl http://localhost:3001/api/schema/version
```

### 3. Estatísticas do Banco
```bash
curl http://localhost:3001/api/stats
```

### 4. Listar Snapshots
```bash
curl http://localhost:3001/api/snapshots
```

### 5. Dados Base
```bash
curl http://localhost:3001/api/base-data
```

---

## 📊 ARQUITETURA ATUAL

```
┌─────────────────────────────────────────────────────────┐
│                    SEU SISTEMA AGORA                    │
└─────────────────────────────────────────────────────────┘

Backend (Node.js + Express)     Frontend (Angular)
┌──────────────────────┐        ┌──────────────────┐
│  Port 3001           │        │  Port 3000       │
│  ├─ API REST ✅      │◄──HTTP─┤  Angular App ✅  │
│  ├─ SQLite ✅        │        │  UI Visual ✅    │
│  ├─ Migrations ✅    │        └──────────────────┘
│  └─ Snapshots ✅     │
└──────────────────────┘
```

---

## 🎯 PRÓXIMOS PASSOS

### 1. Testar API no Browser
Abra no navegador:
- http://localhost:3001/api/health
- http://localhost:3001/api/stats
- http://localhost:3001/api/snapshots

### 2. Conectar Frontend ao Backend
Você precisa atualizar o Angular para chamar a API:

```typescript
// Exemplo de chamada HTTP
this.http.get('http://localhost:3001/api/stats').subscribe(data => {
  console.log('Estatísticas:', data);
});
```

### 3. Criar Service HTTP no Angular
Vou criar um service para você conectar o frontend ao backend.

---

## 📝 ENDPOINTS DISPONÍVEIS

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/health` | Health check do servidor |
| GET | `/api/schema/version` | Versão do schema e migrations |
| GET | `/api/stats` | Estatísticas do banco de dados |
| GET | `/api/base-data` | Países, times e jogadores |
| GET | `/api/snapshots` | Lista todos os snapshots |
| POST | `/api/snapshots` | Cria novo snapshot |
| GET | `/api/season/:season` | Carrega temporada específica |
| POST | `/api/season/save` | Salva estado da temporada |

---

## 🔧 COMANDOS ÚTEIS

### Iniciar Backend
```bash
cd backend
npm start
```

### Iniciar Frontend
```bash
npm run dev
```

### Testar API
```bash
# Health check
curl http://localhost:3001/api/health

# Estatísticas
curl http://localhost:3001/api/stats

# Snapshots
curl http://localhost:3001/api/snapshots
```

---

## ✅ O QUE ESTÁ FUNCIONANDO

- ✅ Backend Node.js rodando na porta 3001
- ✅ SQLite conectado e funcionando
- ✅ Migrations aplicadas automaticamente (versão 2)
- ✅ API REST com 8 endpoints
- ✅ CORS habilitado para frontend
- ✅ Frontend Angular rodando na porta 3000

---

## 🎉 SUCESSO!

Agora você tem:
1. ✅ **Backend Node.js** com SQLite funcionando
2. ✅ **API REST** completa
3. ✅ **Frontend Angular** rodando
4. ✅ **Migrations** aplicadas automaticamente

**Próximo passo:** Conectar o frontend ao backend via HTTP!

Quer que eu crie o service HTTP no Angular para conectar os dois?
