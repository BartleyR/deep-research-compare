# Deep Research Compare

A majority voting system for comparing responses from multiple AI research assistants (ChatGPT, Claude, Perplexity, and Gemini).

## AI Note
This code was created completely with a coding agent.

## Features

- Submit research prompts to multiple AI providers simultaneously
- Upload context files for enhanced research
- Side-by-side comparison of responses
- Evaluation system with scoring capabilities
- Preference tracking for responses
- History of previous comparisons

## Configuring the .env File
The application requires a `.env` file to store your API keys and configuration settings. Follow these steps:

1. Create a new `.env` file in the project root directory:
```bash
cp .env.example .env
```

Or manually create the file:
```bash
touch .env
```

2. Add your API keys to the `.env` file with the following format:
```bash
# Required: At least one API key must be provided
OPENAI_API_KEY=your-openai-api-key-here
ANTHROPIC_API_KEY=your-anthropic-api-key-here
GOOGLE_AI_API_KEY=your-google-ai-api-key-here
PERPLEXITY_API_KEY=your-perplexity-api-key-here

# Optional: Configure the server port (default is 3000)
PORT=3000
```

3. Replace the placeholder values with your actual API keys:
   - **OPENAI_API_KEY**: Get from [OpenAI Platform](https://platform.openai.com/api-keys)
   - **ANTHROPIC_API_KEY**: Get from [Anthropic Console](https://console.anthropic.com/)
   - **GOOGLE_AI_API_KEY**: Get from [Google AI Studio](https://aistudio.google.com/app/apikey)
   - **PERPLEXITY_API_KEY**: Get from [Perplexity Settings](https://www.perplexity.ai/settings/api)

**Note**: You don't need all API keys - only configure the ones for providers you want to use. The application will automatically skip providers without configured API keys.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file based on `.env.example`:
```bash
cp .env.example .env
```

3. Add your API keys to the `.env` file:
- `OPENAI_API_KEY` - For ChatGPT
- `ANTHROPIC_API_KEY` - For Claude
- `GOOGLE_AI_API_KEY` - For Gemini
- `PERPLEXITY_API_KEY` - For Perplexity

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

1. Open your browser to `http://localhost:3000`
2. Enter your research prompt in the text area
3. Optionally upload context files
4. Click "Submit to All Researchers"
5. Wait for responses from all providers
6. Compare responses using:
   - Side-by-side view
   - Individual provider view
   - Evaluation tab for scoring and preferences

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