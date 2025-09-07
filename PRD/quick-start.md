# 🚀 GPT Researcher - Quick Start Guide

Get GPT Researcher running in 5 minutes with this quick setup guide.

## Prerequisites

- **Python 3.11+** ([Download here](https://www.python.org/downloads/))
- **Git** for cloning the repository
- **API Keys** (OpenAI and Tavily minimum)

## 1. Get API Keys (2 minutes)

### Required API Keys

1. **OpenAI API Key**
   - Visit: https://platform.openai.com/api-keys
   - Create new secret key
   - Copy the key (starts with `sk-`)

2. **Tavily API Key**
   - Visit: https://app.tavily.com/
   - Sign up for free account
   - Get your API key from dashboard

### Optional API Keys (for enhanced functionality)

3. **Groq API Key** (High-speed inference)
   - Visit: https://console.groq.com/keys
   - Free tier available

4. **OpenRouter API Key** (Multi-model access)
   - Visit: https://openrouter.ai/
   - Access to 100+ models

## 2. Installation (2 minutes)

### Option A: Standard Installation

```bash
# Clone the repository
git clone https://github.com/assafelovic/gpt-researcher.git
cd gpt-researcher

# Install dependencies
pip install -r requirements.txt
```

### Option B: Quick PIP Installation

```bash
pip install gpt-researcher
```

## 3. Configuration (1 minute)

### Set Environment Variables

#### On Windows (PowerShell):
```powershell
$env:OPENAI_API_KEY="your-openai-key-here"
$env:TAVILY_API_KEY="your-tavily-key-here"
$env:GROQ_API_KEY="your-groq-key-here"
$env:OPENROUTER_API_KEY="your-openrouter-key-here"
```

#### On Linux/Mac:
```bash
export OPENAI_API_KEY="your-openai-key-here"
export TAVILY_API_KEY="your-tavily-key-here"
export GROQ_API_KEY="your-groq-key-here"
export OPENROUTER_API_KEY="your-openrouter-key-here"
```

#### Or Create .env File:
```env
OPENAI_API_KEY=your-openai-key-here
TAVILY_API_KEY=your-tavily-key-here
GROQ_API_KEY=your-groq-key-here
OPENROUTER_API_KEY=your-openrouter-key-here
OPENROUTER_LIMIT_RPS=1
```

## 4. Launch the Application

### Standard Installation:
```bash
python -m uvicorn main:app --reload
```

### PIP Installation:
```python
from gpt_researcher import GPTResearcher

# Create researcher instance
researcher = GPTResearcher(
    query="What are the latest developments in AI?",
    report_type="research_report"
)

# Run research
import asyncio
research_result = asyncio.run(researcher.conduct_research())
report = asyncio.run(researcher.write_report())
print(report)
```

## 5. Access the Interface

- **Web Interface**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs
- **WebSocket**: ws://localhost:8000/ws

## Quick Test

Try this research query: **"What is the current state of artificial intelligence in 2024?"**

Expected result: A comprehensive 1000+ word research report with citations from multiple sources.

## Configuration Options

### Using Different LLM Providers

#### Groq (High-speed, cost-effective):
```bash
export FAST_LLM="groq:mixtral-8x7b-32768"
export SMART_LLM="groq:mixtral-8x7b-32768"
```

#### OpenRouter (Multi-model access):
```bash
export FAST_LLM="openrouter:google/gemini-flash-1.5"
export SMART_LLM="openrouter:anthropic/claude-3.5-sonnet"
```

#### Mixed providers:
```bash
export FAST_LLM="groq:mixtral-8x7b-32768"
export SMART_LLM="openai:gpt-4"
```

### Search Engine Configuration

```bash
# Use multiple search engines
export RETRIEVER="tavily,duckduckgo,google"

# Local document research
export DOC_PATH="./my-documents"
export REPORT_SOURCE="local"
```

## Docker Quick Start

```bash
# Clone and navigate
git clone https://github.com/assafelovic/gpt-researcher.git
cd gpt-researcher

# Create .env file with your API keys
echo "OPENAI_API_KEY=your-key" > .env
echo "TAVILY_API_KEY=your-key" >> .env

# Launch with Docker
docker-compose up --build
```

Access at:
- Backend: http://localhost:8000
- Frontend: http://localhost:3000

## Troubleshooting

### Common Issues:

1. **"API key not found"**
   - Verify environment variables are set correctly
   - Check for typos in key names

2. **"ModuleNotFoundError"**
   - Run: `pip install -r requirements.txt`
   - Ensure Python 3.11+ is installed

3. **"Port already in use"**
   - Change port: `uvicorn main:app --port 8001`
   - Or kill existing process

4. **Rate limiting errors**
   - Reduce concurrent workers in config
   - Add delays between requests

### Get Help:

- **Documentation**: https://docs.gptr.dev
- **Discord**: https://discord.gg/QgZXvJAccX
- **GitHub Issues**: https://github.com/assafelovic/gpt-researcher/issues

## Next Steps

1. **Explore Advanced Features**:
   - Deep Research mode
   - Multi-agent workflows
   - Custom report types

2. **Integrate with Your Workflow**:
   - API integration
   - Custom scrapers
   - Enterprise deployment

3. **Customize Configuration**:
   - Custom LLM providers
   - Domain-specific retrievers
   - Report templates

---

**Need more detailed setup?** Check the complete [Deployment Guide](./deployment-guide.md)

**Ready to build?** See the [Technical Architecture](./technical-architecture.md)