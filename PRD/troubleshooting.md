# 🆘 GPT Researcher - Troubleshooting Guide

Common issues and solutions for GPT Researcher deployment and operation.

## Quick Diagnostics

### System Health Check
```bash
# Test server startup
python -c "
from gpt_researcher.config import Config
config = Config()
print('✅ Configuration loaded successfully')
print(f'LLM Provider: {config.smart_llm_provider}:{config.smart_llm_model}')
print(f'Retrievers: {config.retrievers}')
"
```

### API Key Validation
```bash
# Test API connections
python -c "
import os
from gpt_researcher.llm_provider.generic.base import GenericLLMProvider

# Test OpenAI
if os.getenv('OPENAI_API_KEY'):
    print('✅ OpenAI API key found')
else:
    print('❌ OpenAI API key missing')

# Test Tavily
if os.getenv('TAVILY_API_KEY'):
    print('✅ Tavily API key found')
else:
    print('❌ Tavily API key missing')

# Test Groq
if os.getenv('GROQ_API_KEY'):
    print('✅ Groq API key found')
else:
    print('⚠️ Groq API key missing (optional)')
"
```

## Common Issues & Solutions

### 1. Installation Issues

#### Problem: ModuleNotFoundError
```bash
ModuleNotFoundError: No module named 'gpt_researcher'
```

**Solutions:**
1. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

2. **Check Python version:**
   ```bash
   python --version  # Should be 3.11+
   ```

3. **Use virtual environment:**
   ```bash
   python -m venv venv
   source venv/bin/activate  # Linux/Mac
   # or
   venv\Scripts\activate  # Windows
   pip install -r requirements.txt
   ```

#### Problem: Permission denied
```bash
PermissionError: [Errno 13] Permission denied
```

**Solutions:**
1. **Use --user flag:**
   ```bash
   pip install --user -r requirements.txt
   ```

2. **Fix permissions:**
   ```bash
   sudo chown -R $USER:$USER ~/.local/
   ```

### 2. API Key Issues

#### Problem: "API key not found" errors
```bash
Exception: OpenAI API key not found
```

**Solutions:**
1. **Check environment variables:**
   ```bash
   echo $OPENAI_API_KEY
   echo $TAVILY_API_KEY
   ```

2. **Create .env file:**
   ```env
   OPENAI_API_KEY=your-openai-key-here
   TAVILY_API_KEY=your-tavily-key-here
   GROQ_API_KEY=your-groq-key-here
   ```

3. **Set in shell session:**
   ```bash
   export OPENAI_API_KEY="your-key-here"
   export TAVILY_API_KEY="your-key-here"
   ```

#### Problem: "Invalid API key" errors
```bash
AuthenticationError: Invalid API key
```

**Solutions:**
1. **Verify key format:**
   - OpenAI: starts with `sk-`
   - Tavily: starts with `tvly-`
   - Groq: starts with `gsk_`

2. **Test key validity:**
   ```bash
   curl -H "Authorization: Bearer $OPENAI_API_KEY" \
        https://api.openai.com/v1/models
   ```

### 3. Network and Connectivity Issues

#### Problem: Connection timeouts
```bash
TimeoutError: Request timed out
```

**Solutions:**
1. **Check internet connection:**
   ```bash
   ping google.com
   ```

2. **Configure timeouts:**
   ```env
   REQUEST_TIMEOUT=120
   ```

3. **Use proxy if required:**
   ```env
   HTTP_PROXY=http://proxy.company.com:8080
   HTTPS_PROXY=http://proxy.company.com:8080
   ```

#### Problem: Rate limiting
```bash
RateLimitError: Rate limit exceeded
```

**Solutions:**
1. **Add delays:**
   ```env
   MAX_SCRAPER_WORKERS=5
   ```

2. **Use multiple API keys:**
   ```env
   OPENAI_API_KEY=key1,key2,key3
   ```

3. **Configure rate limits:**
   ```env
   OPENROUTER_LIMIT_RPS=0.5
   ```

### 4. Server Issues

#### Problem: Port already in use
```bash
OSError: [Errno 98] Address already in use
```

**Solutions:**
1. **Use different port:**
   ```bash
   uvicorn main:app --port 8001
   ```

2. **Kill existing process:**
   ```bash
   lsof -ti:8000 | xargs kill -9
   ```

3. **Find and stop process:**
   ```bash
   ps aux | grep uvicorn
   kill <process_id>
   ```

#### Problem: Memory issues
```bash
MemoryError: Unable to allocate array
```

**Solutions:**
1. **Reduce workers:**
   ```env
   MAX_SCRAPER_WORKERS=5
   MAX_SEARCH_RESULTS_PER_QUERY=3
   ```

2. **Increase system memory:**
   ```bash
   # Check current memory
   free -h
   ```

3. **Use swap file:**
   ```bash
   sudo fallocate -l 2G /swapfile
   sudo mkswap /swapfile
   sudo swapon /swapfile
   ```

### 5. Research Quality Issues

#### Problem: Poor research results
```bash
Report too short or low quality
```

**Solutions:**
1. **Increase search results:**
   ```env
   MAX_SEARCH_RESULTS_PER_QUERY=10
   TOTAL_WORDS=2000
   ```

2. **Use multiple retrievers:**
   ```env
   RETRIEVER=tavily,google,bing,duckduckgo
   ```

3. **Enable source curation:**
   ```env
   CURATE_SOURCES=true
   ```

#### Problem: No sources found
```bash
Warning: No valid sources retrieved
```

**Solutions:**
1. **Check query phrasing:**
   - Use specific, clear queries
   - Include relevant keywords
   - Avoid overly broad topics

2. **Test retrievers individually:**
   ```env
   RETRIEVER=tavily
   # Test each one separately
   ```

3. **Check API quotas:**
   - Verify API usage limits
   - Ensure API keys are active

### 6. Docker Issues

#### Problem: Docker build fails
```bash
failed to solve with frontend dockerfile.v0
```

**Solutions:**
1. **Clean Docker cache:**
   ```bash
   docker system prune -a
   ```

2. **Build with no cache:**
   ```bash
   docker-compose build --no-cache
   ```

3. **Check Dockerfile syntax:**
   ```bash
   docker build -t gpt-researcher .
   ```

#### Problem: Container startup issues
```bash
Container exits immediately
```

**Solutions:**
1. **Check logs:**
   ```bash
   docker-compose logs gpt-researcher
   ```

2. **Run interactively:**
   ```bash
   docker run -it gptresearcher/gpt-researcher bash
   ```

3. **Verify environment variables:**
   ```bash
   docker-compose config
   ```

### 7. Frontend Issues

#### Problem: WebSocket connection failed
```bash
WebSocket connection to 'ws://localhost:8000/ws' failed
```

**Solutions:**
1. **Check server status:**
   ```bash
   curl http://localhost:8000/health
   ```

2. **Verify CORS settings:**
   ```python
   # In server.py
   app.add_middleware(
       CORSMiddleware,
       allow_origins=["*"],  # Allow all origins
       allow_credentials=True,
       allow_methods=["*"],
       allow_headers=["*"],
   )
   ```

3. **Test WebSocket manually:**
   ```javascript
   const ws = new WebSocket('ws://localhost:8000/ws');
   ws.onopen = () => console.log('Connected');
   ws.onerror = (error) => console.error('Error:', error);
   ```

### 8. Performance Issues

#### Problem: Slow research times
```bash
Research taking > 5 minutes
```

**Solutions:**
1. **Use faster LLM:**
   ```env
   FAST_LLM=groq:mixtral-8x7b-32768
   SMART_LLM=groq:mixtral-8x7b-32768
   ```

2. **Reduce scope:**
   ```env
   MAX_SEARCH_RESULTS_PER_QUERY=5
   TOTAL_WORDS=1000
   MAX_ITERATIONS=2
   ```

3. **Optimize workers:**
   ```env
   MAX_SCRAPER_WORKERS=10
   ```

#### Problem: High API costs
```bash
Monthly API costs too high
```

**Solutions:**
1. **Use cost-effective models:**
   ```env
   FAST_LLM=groq:mixtral-8x7b-32768
   SMART_LLM=openrouter:google/gemini-flash-1.5
   ```

2. **Enable cost tracking:**
   ```env
   TRACK_COSTS=true
   VERBOSE=true
   ```

3. **Set usage limits:**
   ```env
   MAX_DAILY_REQUESTS=100
   ```

## Debugging Tools

### 1. Verbose Logging
```env
VERBOSE=true
LOGGING_LEVEL=DEBUG
```

### 2. Component Testing
```python
# Test individual components
from gpt_researcher.retrievers.tavily import TavilySearch

searcher = TavilySearch("test query")
results = searcher.search()
print(f"Retrieved {len(results)} results")
```

### 3. Health Check Endpoint
```bash
curl http://localhost:8000/health
```

### 4. Configuration Validation
```python
from gpt_researcher.config import Config

config = Config()
print("Configuration valid:", config.validate())
```

## Getting Help

### 1. Community Support
- **Discord**: https://discord.gg/QgZXvJAccX
- **GitHub Issues**: https://github.com/assafelovic/gpt-researcher/issues
- **Documentation**: https://docs.gptr.dev

### 2. Error Reporting
When reporting issues, include:
- Error message and stack trace
- Environment details (OS, Python version)
- Configuration (without API keys)
- Steps to reproduce

### 3. Performance Monitoring
```python
import time
import psutil

def monitor_performance():
    start_time = time.time()
    memory_before = psutil.virtual_memory().used
    
    # Your research code here
    
    memory_after = psutil.virtual_memory().used
    duration = time.time() - start_time
    
    print(f"Duration: {duration:.2f}s")
    print(f"Memory used: {(memory_after - memory_before) / 1024 / 1024:.2f} MB")
```

### 4. Log Analysis
```bash
# Find error patterns
grep -i error logs/app.log | tail -20

# Monitor API calls
grep -i "api_call" logs/app.log | wc -l

# Check performance
grep -i "duration" logs/app.log | tail -10
```

---

**Still having issues?** 
1. Check the [FAQ](./faq.md)
2. Join our [Discord community](https://discord.gg/QgZXvJAccX)
3. Open a [GitHub issue](https://github.com/assafelovic/gpt-researcher/issues)