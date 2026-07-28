# CADRO MCP Server

> **Model Context Protocol (MCP)** sunucusu — CADRO İK platformu için AI ajan entegrasyonları. CV değerlendirme, OKR performans analizi ve İK süreçlerini AI asistanlara bağlar.

---

## 🎯 Amaç

Bu MCP sunucusu, Claude Desktop, ChatGPT, Cursor, Copilot gibi AI asistanların CADRO İK platformuyla doğrudan etkileşime geçmesini sağlar. İK profesyonelleri, AI asistanları aracılığıyla:

- 📄 CV'leri değerlendirebilir
- 🎯 OKR ve performans metriklerini analiz edebilir
- 📊 İK verilerini sorgulayabilir

## 🚀 Hızlı Başlangıç

### Gereksinimler
- Node.js >= 20.0.0
- Azure OpenAI erişimi (isteğe bağlı)

### Kurulum

```bash
cd mcp-server
npm install
npm run build
```

### Geliştirme Modu

```bash
npm run dev
```

### MCP Inspector ile Test

```bash
npm run inspector
```

## 🔧 Araçlar (Tools)

| Araç | Açıklama |
|------|----------|
| `cv-evaluate` | CV'leri AI ile değerlendir, pozisyona uygunluk skoru üret |
| `okr-analyze` | OKR hedeflerini analiz et, ilerleme raporu oluştur |
| `hr-metrics` | İK metriklerini sorgula (turnover, devamsızlık, vb.) |

## 📦 Teknolojiler

- **Runtime:** Node.js (TypeScript)
- **Protokol:** Model Context Protocol (MCP) SDK v1.20+
- **AI:** Azure OpenAI (GPT-4)
- **Validasyon:** Zod
- **Kimlik Doğrulama:** Azure Identity

## 🔗 Bağlantılar

- **Web:** https://www.cadro.io/
- **MCP Dokümantasyon:** https://modelcontextprotocol.io/
- **CADRO AI Citation Guide:** https://www.cadro.io/AI-CITATION-GUIDE.md

---

*CADRO © 2026 | MCP Server v1.0.0*