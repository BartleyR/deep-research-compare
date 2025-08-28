# Deep Research Compare

A majority voting system for comparing responses from multiple AI research assistants (ChatGPT, Claude, Perplexity, and Gemini).

## AI Note
This code was created completely with a coding agent.

## Features

- Submit research prompts to multiple AI providers simultaneously
- Upload context files for enhanced research
- Provide custom evaluation instructions to guide comparison
- Side-by-side comparison of responses
- Automated analysis and recommendations
- History of previous comparisons

## Setup

### Prerequisites
- **Node.js** (v16 or higher) - [Download from nodejs.org](https://nodejs.org/)
- **npm** (comes with Node.js) or **yarn** - [Install yarn](https://yarnpkg.com/getting-started/install)
- At least one API key from the supported providers (see below)

### Installation

1. **Clone the repository and install dependencies:**
```bash
git clone <repository-url>
cd deep-research-compare
npm install
```

2. **Configure API Keys:**

Create a `.env` file in the project root:
```bash
cp .env.example .env
```

Or create it manually:
```bash
touch .env
```

3. **Add your API keys to the `.env` file:**
```bash
# At least one API key is required
OPENAI_API_KEY=your-openai-api-key-here
ANTHROPIC_API_KEY=your-anthropic-api-key-here
GOOGLE_AI_API_KEY=your-google-ai-api-key-here
PERPLEXITY_API_KEY=your-perplexity-api-key-here

# Optional: Configure the server port (default is 3000)
PORT=3000
```

### Where to Get API Keys

- **OpenAI (ChatGPT)**: [OpenAI Platform](https://platform.openai.com/api-keys)
- **Anthropic (Claude)**: [Anthropic Console](https://console.anthropic.com/)
- **Google (Gemini)**: [Google AI Studio](https://aistudio.google.com/app/apikey)
- **Perplexity**: [Perplexity Settings](https://www.perplexity.ai/settings/api)

**Note**: You only need to configure API keys for the providers you want to use. The application will automatically detect and use only the configured providers.

## Running the Application

Development mode:
```bash
npm run dev
```

Production build:
```bash
npm run build
npm start
```

## Usage

1. **Start the application** and open your browser to `http://localhost:3000`

2. **Configuration Check**: The Configuration tab shows which API providers are available based on your `.env` file. You can test each connection individually.

3. **Submit Research**:
   - Enter your research prompt in the text area
   - (Optional) Upload context files (text files, code, documentation, etc.)
   - Select which providers to query
   - Click "Submit to All Researchers"

4. **Review Results**:
   - **Side-by-side view**: Compare all responses at once
   - **Individual view**: Focus on one provider's response
   - **Evaluation tab**: 
     - Add custom evaluation instructions to guide the analysis
     - Get automated analysis and recommendations based on your criteria

5. **History**: Access previous research comparisons from the History tab

## API Endpoints

- `POST /api/research` - Submit a new research request
- `GET /api/research/:id` - Get a specific comparison
- `GET /api/research` - Get all comparisons
- `POST /api/research/:id/evaluate` - Add evaluation scores
- `POST /api/research/:id/preference` - Set preferred response

## Architecture

- **API Providers**: Individual implementations for each AI service
- **Research Service**: Manages request distribution and response collection
- **Express Server**: RESTful API for client interaction
- **Web UI**: Interactive interface for submission and comparison

## Available Models (as of August 2025)

The system includes the following models for each provider:

### ChatGPT (OpenAI)
- gpt-4-turbo-preview (default)
- gpt-4
- gpt-4-32k
- gpt-3.5-turbo
- gpt-3.5-turbo-16k

### Claude (Anthropic)
- claude-3-5-sonnet-20241022 (default)
- claude-3-opus-20240229
- claude-3-sonnet-20240229
- claude-3-haiku-20240307

### Perplexity
- sonar-pro (default) - Advanced search with complex query support
- sonar - Lightweight, cost-effective search model
- sonar-deep-research - Expert-level research model
- sonar-reasoning-pro - Premier reasoning model with Chain of Thought
- sonar-reasoning - Fast, real-time reasoning model
- r1-1776 - DeepSeek R1 post-trained model (offline)

### Gemini (Google)
- gemini-2.5-pro (default) - Latest and most capable model
- gemini-2.5-flash - Fast, lightweight version of 2.5-pro
- gemini-2.0-flash - Previous generation flash model
- gemini-2.0-flash-lite - Lightweight version of 2.0-flash
- gemini-1.5-pro - Stable previous generation pro model
- gemini-1.5-flash - Stable previous generation flash model
- gemini-1.5-flash-8b - Smaller, faster flash model

## Note

The system will only use providers for which you have configured API keys. Make sure to add valid API keys for the providers you want to use.