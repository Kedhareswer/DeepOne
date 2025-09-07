# 📋 GPT Researcher - Configuration Reference

Complete reference for all configuration options, environment variables, and system settings.

## Environment Variables

### 🔑 Required API Keys

| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| `OPENAI_API_KEY` | OpenAI API key for LLM services | ✅ | `sk-proj-...` |
| `TAVILY_API_KEY` | Tavily search API key | ✅ | `tvly-...` |

### 🤖 LLM Provider Configuration

| Variable | Description | Default | Format |
|----------|-------------|---------|---------|
| `FAST_LLM` | Fast LLM for quick tasks | `openai:gpt-5-mini` | `provider:model` |
| `SMART_LLM` | Smart LLM for complex tasks | `openai:gpt-5` | `provider:model` |
| `STRATEGIC_LLM` | Strategic LLM for planning | `openai:o4-mini` | `provider:model` |
| `EMBEDDING` | Embedding model | `openai:text-embedding-3-small` | `provider:model` |

#### Supported LLM Providers

```yaml
OpenAI:
  - openai:gpt-4
  - openai:gpt-4-turbo
  - openai:gpt-3.5-turbo
  - openai:gpt-5 (when available)
  - openai:o1-mini
  - openai:o3-mini

Anthropic:
  - anthropic:claude-3-5-sonnet-20241022
  - anthropic:claude-3-haiku-20240307

Groq:
  - groq:mixtral-8x7b-32768
  - groq:llama2-70b-4096
  - groq:gemma-7b-it

OpenRouter:
  - openrouter:google/gemini-2.0-flash-lite-001
  - openrouter:anthropic/claude-3.5-sonnet
  - openrouter:meta-llama/llama-3.1-405b

Google:
  - google_genai:gemini-pro
  - google_vertexai:gemini-pro
```

### 🔍 Search Engine Configuration

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `RETRIEVER` | Comma-separated list of retrievers | `tavily` | `tavily,duckduckgo,google` |
| `GROQ_API_KEY` | Groq API key | - | `gsk_...` |
| `OPENROUTER_API_KEY` | OpenRouter API key | - | `sk-or-...` |
| `OPENROUTER_LIMIT_RPS` | OpenRouter rate limit | `1` | `2` |
| `GOOGLE_API_KEY` | Google Custom Search API key | - | `AIza...` |
| `GOOGLE_CX_KEY` | Google Custom Search Engine ID | - | `017576...` |
| `BING_API_KEY` | Bing Search API key | - | `abc123...` |
| `SERPAPI_API_KEY` | SerpAPI key | - | `abc123...` |
| `SERPER_API_KEY` | Serper API key | - | `abc123...` |
| `SEARCHAPI_API_KEY` | SearchAPI key | - | `abc123...` |

#### Available Retrievers

```yaml
Web Search:
  - tavily: AI-optimized web search
  - duckduckgo: Privacy-focused search
  - google: Google Custom Search
  - bing: Microsoft Bing Search
  - serpapi: Universal search API
  - serper: Real-time search API
  - searchapi: Alternative search API
  - searx: Self-hosted search engine

Academic:
  - arxiv: Academic papers
  - pubmed_central: Medical literature
  - semantic_scholar: Research papers

Specialized:
  - exa: AI-native search
  - mcp: Model Context Protocol sources
```

### 📊 Performance Configuration

| Variable | Description | Default | Range |
|----------|-------------|---------|-------|
| `MAX_SEARCH_RESULTS_PER_QUERY` | Max results per search | `5` | `1-20` |
| `MAX_SCRAPER_WORKERS` | Concurrent scraping workers | `15` | `1-50` |
| `TOTAL_WORDS` | Target report length | `1200` | `500-5000` |
| `TEMPERATURE` | LLM creativity level | `0.4` | `0.0-1.0` |
| `FAST_TOKEN_LIMIT` | Fast LLM token limit | `3000` | `1000-8000` |
| `SMART_TOKEN_LIMIT` | Smart LLM token limit | `6000` | `2000-32000` |
| `STRATEGIC_TOKEN_LIMIT` | Strategic LLM token limit | `4000` | `1000-32000` |

### 📁 File and Storage Configuration

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `DOC_PATH` | Local documents directory | `./my-docs` | `/path/to/docs` |
| `REPORT_SOURCE` | Research source type | `web` | `web`, `local`, `hybrid` |
| `MEMORY_BACKEND` | Vector storage backend | `local` | `local`, `redis` |
| `SIMILARITY_THRESHOLD` | Content similarity threshold | `0.42` | `0.0-1.0` |

### 🎯 Research Configuration

| Variable | Description | Default | Options |
|----------|-------------|---------|---------|
| `REPORT_FORMAT` | Citation format | `APA` | `APA`, `MLA`, `Chicago` |
| `LANGUAGE` | Output language | `english` | Any language |
| `AGENT_ROLE` | Custom agent role | `None` | Custom role description |
| `MAX_ITERATIONS` | Max research iterations | `3` | `1-10` |
| `MAX_SUBTOPICS` | Max subtopics to explore | `3` | `1-10` |
| `CURATE_SOURCES` | Enable source curation | `False` | `True`, `False` |

### 🕸️ Web Scraping Configuration

| Variable | Description | Default | Options |
|----------|-------------|---------|---------|
| `SCRAPER` | Default scraper engine | `bs` | `bs`, `browser`, `tavily` |
| `USER_AGENT` | HTTP User-Agent string | Browser string | Custom UA |
| `BROWSE_CHUNK_MAX_LENGTH` | Max content chunk size | `8192` | `1000-16384` |
| `SUMMARY_TOKEN_LIMIT` | Summary token limit | `700` | `100-2000` |

### 🚀 Deep Research Configuration

| Variable | Description | Default | Range |
|----------|-------------|---------|-------|
| `DEEP_RESEARCH_BREADTH` | Exploration breadth | `3` | `1-10` |
| `DEEP_RESEARCH_DEPTH` | Exploration depth | `2` | `1-5` |
| `DEEP_RESEARCH_CONCURRENCY` | Concurrent workers | `4` | `1-15` |

### 🔧 MCP Configuration

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `MCP_SERVERS` | MCP server configurations | `[]` | JSON array |
| `MCP_AUTO_TOOL_SELECTION` | Auto tool selection | `True` | `True`, `False` |
| `MCP_ALLOWED_ROOT_PATHS` | Allowed file paths | `[]` | JSON array |
| `MCP_STRATEGY` | MCP execution strategy | `fast` | `fast`, `deep`, `disabled` |

### 🔍 Monitoring and Debugging

| Variable | Description | Default | Options |
|----------|-------------|---------|---------|
| `VERBOSE` | Enable verbose logging | `False` | `True`, `False` |
| `LOGGING_LEVEL` | Log level | `INFO` | `DEBUG`, `INFO`, `WARNING`, `ERROR` |
| `LANGCHAIN_TRACING_V2` | LangChain tracing | `true` | `true`, `false` |
| `LANGCHAIN_API_KEY` | LangChain API key | - | `ls__...` |

## Configuration Files

### Environment File (.env)

```env
# Required API Keys
OPENAI_API_KEY=sk-proj-your-key-here
TAVILY_API_KEY=tvly-your-key-here

# Optional LLM Providers
GROQ_API_KEY=gsk_your-key-here
OPENROUTER_API_KEY=sk-or-your-key-here
ANTHROPIC_API_KEY=sk-ant-your-key-here

# LLM Configuration
FAST_LLM=groq:mixtral-8x7b-32768
SMART_LLM=openai:gpt-4
STRATEGIC_LLM=openai:o1-mini

# Search Configuration
RETRIEVER=tavily,duckduckgo,google
GOOGLE_API_KEY=your-google-key
GOOGLE_CX_KEY=your-search-engine-id

# Performance Tuning
MAX_SEARCH_RESULTS_PER_QUERY=7
MAX_SCRAPER_WORKERS=20
TOTAL_WORDS=2000

# Local Documents
DOC_PATH=./my-research-docs
REPORT_SOURCE=hybrid
```

### Custom Configuration JSON

```json
{
  "RETRIEVER": "tavily,google",
  "FAST_LLM": "groq:mixtral-8x7b-32768",
  "SMART_LLM": "openai:gpt-4",
  "EMBEDDING": "openai:text-embedding-3-large",
  "MAX_SEARCH_RESULTS_PER_QUERY": 10,
  "TOTAL_WORDS": 2500,
  "TEMPERATURE": 0.3,
  "REPORT_FORMAT": "APA",
  "LANGUAGE": "english",
  "MAX_SCRAPER_WORKERS": 25,
  "DEEP_RESEARCH_BREADTH": 5,
  "DEEP_RESEARCH_DEPTH": 3
}
```

## Runtime Configuration

### Python API Configuration

```python
from gpt_researcher import GPTResearcher
from gpt_researcher.config import Config

# Method 1: Direct configuration
researcher = GPTResearcher(
    query="Research topic",
    report_type="research_report",
    config_path="./custom_config.json"
)

# Method 2: Config object
config = Config()
config.fast_llm = "groq:mixtral-8x7b-32768"
config.smart_llm = "openai:gpt-4"
config.retrievers = ["tavily", "duckduckgo"]
config.max_search_results_per_query = 10

researcher = GPTResearcher(
    query="Research topic",
    config=config
)
```

### Advanced Configuration Examples

#### High-Performance Setup
```env
# Fast, cost-effective setup
FAST_LLM=groq:mixtral-8x7b-32768
SMART_LLM=groq:mixtral-8x7b-32768
RETRIEVER=tavily,duckduckgo
MAX_SCRAPER_WORKERS=25
TEMPERATURE=0.2
```

#### Quality-Focused Setup
```env
# High-quality, comprehensive research
FAST_LLM=openai:gpt-4-turbo
SMART_LLM=openai:gpt-4
STRATEGIC_LLM=openai:o1-mini
RETRIEVER=tavily,google,bing,serpapi
MAX_SEARCH_RESULTS_PER_QUERY=15
TOTAL_WORDS=3000
DEEP_RESEARCH_BREADTH=5
DEEP_RESEARCH_DEPTH=3
```

#### Enterprise Setup
```env
# Enterprise with multiple providers
FAST_LLM=anthropic:claude-3-haiku-20240307
SMART_LLM=anthropic:claude-3-5-sonnet-20241022
STRATEGIC_LLM=openai:o1-mini
RETRIEVER=tavily,google,bing
LANGCHAIN_TRACING_V2=true
VERBOSE=true
CURATE_SOURCES=true
```

## Validation and Testing

### Configuration Validation

```python
from gpt_researcher.config import Config

# Validate configuration
config = Config()
valid_providers = config.list_available_providers()
valid_retrievers = config.list_available_retrievers()

print(f"Available LLM providers: {valid_providers}")
print(f"Available retrievers: {valid_retrievers}")
```

### Testing Configuration

```bash
# Test API keys
python -c "
from gpt_researcher.config import Config
config = Config()
print('Configuration loaded successfully')
print(f'LLM Provider: {config.smart_llm_provider}')
print(f'Retrievers: {config.retrievers}')
"
```

---

**Document Version**: 1.0  
**Last Updated**: 2025-01-06  
**Configuration Schema**: See [system-schema.json](./system-schema.json)