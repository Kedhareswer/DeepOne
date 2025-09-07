# ❓ GPT Researcher - Frequently Asked Questions

Quick answers to common questions about GPT Researcher.

## General Questions

### What is GPT Researcher?
GPT Researcher is an autonomous AI agent that conducts comprehensive research on any topic. It aggregates information from 20+ sources, generates detailed reports with citations, and outputs results in multiple formats (PDF, Word, Markdown).

### How is it different from ChatGPT or other AI tools?
- **Multi-source aggregation**: Pulls from 20+ web sources vs single responses
- **Citation management**: Proper academic-style citations
- **Comprehensive reports**: 2000+ word detailed analysis
- **Unbiased approach**: Objective analysis from diverse sources
- **Autonomous operation**: Minimal human intervention required

### Is it free to use?
The software is open-source and free. However, you need API keys for:
- **Required**: OpenAI (~$0.10 per research) + Tavily (free tier available)
- **Optional**: Groq (free tier), OpenRouter, Google, etc.

## Setup and Installation

### What are the minimum requirements?
- **Python**: 3.11 or higher
- **Memory**: 2GB RAM minimum, 4GB recommended
- **Storage**: 1GB free space
- **Internet**: Stable connection for API calls
- **API Keys**: OpenAI and Tavily (minimum)

### How do I get started quickly?
1. **Get API keys**: OpenAI + Tavily
2. **Clone repo**: `git clone https://github.com/assafelovic/gpt-researcher.git`
3. **Install**: `pip install -r requirements.txt`
4. **Configure**: Set environment variables
5. **Run**: `python -m uvicorn main:app --reload`

See our [Quick Start Guide](./quick-start.md) for detailed instructions.

### Can I run it without Docker?
Yes! Docker is optional. You can run it directly with Python:
```bash
pip install -r requirements.txt
python -m uvicorn main:app --reload
```

### What if I don't have an OpenAI API key?
You can use alternative LLM providers:
- **Groq**: Free tier available, fast inference
- **OpenRouter**: Access to multiple models
- **Anthropic**: Claude models
- **Local models**: Via Ollama

Example configuration:
```env
FAST_LLM=groq:mixtral-8x7b-32768
SMART_LLM=groq:mixtral-8x7b-32768
```

## Features and Capabilities

### What types of research can it perform?
- **Market research**: Industry analysis, competitor research
- **Academic research**: Literature reviews, topic exploration
- **News analysis**: Current events, trend analysis
- **Technical research**: Technology comparisons, best practices
- **Due diligence**: Company research, risk assessment

### How long does a research take?
- **Standard research**: 2-5 minutes
- **Deep research**: 5-10 minutes
- **Complex topics**: Up to 15 minutes

Time varies based on:
- Query complexity
- Number of sources
- LLM provider speed
- Network conditions

### How many sources does it use?
- **Default**: 5 sources per query
- **Configurable**: Up to 20+ sources
- **Multiple engines**: Tavily, Google, Bing, DuckDuckGo, etc.
- **Quality filtering**: Relevance and credibility checks

### What output formats are supported?
- **Markdown**: Primary format with citations
- **PDF**: Professional report layout
- **Word**: Editable document format
- **JSON**: Structured data format
- **HTML**: Web-friendly format

### Can it research local documents?
Yes! It supports:
- **PDF files**: Academic papers, reports
- **Word documents**: .docx files
- **Excel files**: Data analysis
- **PowerPoint**: Presentation content
- **Text files**: Plain text, CSV, Markdown

Configuration:
```env
DOC_PATH=./my-documents
REPORT_SOURCE=local
```

## Configuration and Customization

### How do I use multiple LLM providers?
Mix and match providers for optimal cost/performance:
```env
FAST_LLM=groq:mixtral-8x7b-32768  # Cost-effective for simple tasks
SMART_LLM=openai:gpt-4            # High-quality for complex analysis
STRATEGIC_LLM=anthropic:claude-3-5-sonnet  # Strategic planning
```

### Can I add custom search engines?
Yes! The system supports:
- **Built-in**: Tavily, Google, Bing, DuckDuckGo, SerpAPI
- **Academic**: ArXiv, PubMed, Semantic Scholar
- **Custom**: Via MCP (Model Context Protocol)
- **APIs**: Any REST API can be integrated

### How do I improve research quality?
1. **Use multiple retrievers**:
   ```env
   RETRIEVER=tavily,google,bing,duckduckgo
   ```

2. **Increase search results**:
   ```env
   MAX_SEARCH_RESULTS_PER_QUERY=10
   ```

3. **Enable source curation**:
   ```env
   CURATE_SOURCES=true
   ```

4. **Use high-quality LLMs**:
   ```env
   SMART_LLM=openai:gpt-4
   ```

### Can I customize the report format?
Yes! You can customize:
- **Citation style**: APA, MLA, Chicago
- **Report length**: 500-5000 words
- **Language**: Any language supported by LLM
- **Tone**: Objective, formal, analytical
- **Structure**: Custom templates

## Technical Questions

### What programming languages are supported?
- **Primary**: Python 3.11+
- **Frontend**: HTML/CSS/JS or Next.js/TypeScript
- **APIs**: RESTful APIs, WebSocket
- **Integration**: Any language that can make HTTP requests

### Can I integrate it into my application?
Yes! Multiple integration options:
- **Python package**: `pip install gpt-researcher`
- **REST API**: HTTP endpoints for all functions
- **WebSocket**: Real-time streaming
- **Docker**: Containerized deployment

Example API usage:
```python
from gpt_researcher import GPTResearcher

researcher = GPTResearcher(query="AI trends 2024")
report = await researcher.conduct_research()
```

### How do I deploy it in production?
Multiple deployment options:
- **Docker Compose**: Easy containerized deployment
- **Kubernetes**: Scalable orchestration
- **Cloud platforms**: AWS ECS, Google Cloud Run, Azure Container Instances
- **Traditional servers**: systemd service

See our [Deployment Guide](./deployment-guide.md) for details.

### Is it secure for enterprise use?
Security features:
- **No data persistence**: Research content not stored
- **API key encryption**: Secure credential management
- **Input validation**: Prevents injection attacks
- **Rate limiting**: Prevents abuse
- **Audit logging**: Compliance tracking

## Performance and Costs

### How much does it cost to run?
Typical costs per research:
- **Budget setup**: $0.05-0.10 (using Groq + Tavily free tier)
- **Standard setup**: $0.10-0.20 (OpenAI + Tavily)
- **Premium setup**: $0.20-0.50 (GPT-4 + multiple APIs)

Cost factors:
- LLM provider and model choice
- Number of sources searched
- Report length and complexity
- API rate limits and quotas

### How can I reduce costs?
1. **Use cost-effective LLMs**:
   ```env
   FAST_LLM=groq:mixtral-8x7b-32768
   SMART_LLM=openrouter:google/gemini-flash-1.5
   ```

2. **Optimize search parameters**:
   ```env
   MAX_SEARCH_RESULTS_PER_QUERY=5
   TOTAL_WORDS=1000
   ```

3. **Use free search engines**:
   ```env
   RETRIEVER=duckduckgo,tavily
   ```

### How do I improve performance?
1. **Use fast LLM providers**:
   ```env
   FAST_LLM=groq:mixtral-8x7b-32768
   ```

2. **Optimize concurrent workers**:
   ```env
   MAX_SCRAPER_WORKERS=15
   ```

3. **Configure timeouts**:
   ```env
   REQUEST_TIMEOUT=60
   ```

## Troubleshooting

### Why is my research failing?
Common causes and solutions:
1. **API key issues**: Verify keys are correct and active
2. **Network problems**: Check internet connection
3. **Rate limits**: Reduce concurrent requests
4. **Invalid queries**: Use specific, clear research topics

### The reports are too short or low quality
Solutions:
1. **Increase word count**: `TOTAL_WORDS=2000`
2. **Use more sources**: `MAX_SEARCH_RESULTS_PER_QUERY=10`
3. **Enable multiple retrievers**: `RETRIEVER=tavily,google,bing`
4. **Use better LLMs**: `SMART_LLM=openai:gpt-4`

### How do I get help?
1. **Documentation**: https://docs.gptr.dev
2. **Discord community**: https://discord.gg/QgZXvJAccX
3. **GitHub issues**: https://github.com/assafelovic/gpt-researcher/issues
4. **Troubleshooting guide**: [troubleshooting.md](./troubleshooting.md)

## Advanced Usage

### Can I use it for academic research?
Yes! Features for academic use:
- **Academic search engines**: ArXiv, PubMed, Semantic Scholar
- **Citation formats**: APA, MLA, Chicago
- **Quality filtering**: Peer-reviewed sources
- **Local document analysis**: PDF research papers

### How do I set up multi-agent workflows?
GPT Researcher includes multi-agent capabilities:
```bash
cd multi_agents
python main.py
```

Features:
- **Specialized agents**: Researcher, Writer, Editor, Reviewer
- **Collaborative workflow**: Agents work together
- **Quality assurance**: Multiple review stages

### Can I customize the AI agents?
Yes! You can:
- **Custom prompts**: Modify agent behavior
- **Specialized roles**: Domain-specific agents
- **Custom workflows**: Define agent interactions
- **Plugin system**: Add custom capabilities

### How do I integrate with external data sources?
Use MCP (Model Context Protocol):
```env
RETRIEVER=tavily,mcp
```

Supported integrations:
- **GitHub repositories**: Code analysis
- **Databases**: Direct data queries
- **APIs**: Custom data sources
- **File systems**: Local data access

## Licensing and Legal

### What's the license?
GPT Researcher is open-source under the MIT License. You can:
- Use commercially
- Modify the code
- Distribute copies
- Use privately

### Can I use it for commercial purposes?
Yes! The MIT license allows commercial use. However:
- **API costs**: You pay for LLM and search API usage
- **Compliance**: Ensure your use complies with API providers' terms
- **Attribution**: Follow MIT license requirements

### Are there usage restrictions?
Restrictions come from API providers:
- **OpenAI**: Usage policies for AI models
- **Search APIs**: Rate limits and quotas
- **Data sources**: Respect robots.txt and terms of service

---

**Have more questions?**
- Check our [comprehensive documentation](https://docs.gptr.dev)
- Join our [Discord community](https://discord.gg/QgZXvJAccX)
- Browse [GitHub discussions](https://github.com/assafelovic/gpt-researcher/discussions)