# Neural Feed Studio

AI-Powered Multi-Modal Content Pipeline for automated blog and podcast creation.

## Overview

Neural Feed Studio transforms RSS feeds into high-quality blog posts and podcast content using advanced AI orchestration. The system monitors trending topics, generates contextual content, and maintains consistent voice across multiple formats.

## Features

- **RSS Feed Monitoring**: Continuous semantic analysis of RSS feeds
- **AI Content Generation**: Multi-agent system for blog post and podcast creation
- **Local AI Integration**: Privacy-focused with Ollama and LangChain
- **Content Publishing**: Automated publishing to multiple platforms
- **Voice Consistency**: Fine-tuned AI models for personalized content style

## Tech Stack

- **Frontend**: Next.js 14, React 18, TypeScript
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **AI**: Ollama, LangChain.js
- **Database**: SQLite with Prisma
- **Testing**: Jest, React Testing Library

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Ollama (for local AI models)

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up Ollama and download models:
   ```bash
   # Install Ollama from https://ollama.ai
   ollama pull llama2:7b
   ollama pull codellama
   ```
4. Start Ollama service:
   ```bash
   ollama serve
   ```
5. Start the development server:
   ```bash
   npm run dev
   ```

### AI Integration Setup

The application uses local AI models through Ollama for content generation:

- **Ollama**: Local LLM server (runs on localhost:11434)
- **LangChain**: Framework for structured AI interactions
- **Models**: llama2:7b (general content), codellama (code-related tasks)

**API Endpoints:**
- `GET /api/ai/generate` - Check AI service status
- `POST /api/ai/generate` - Generate blog content

**Example API Usage:**
```bash
curl -X POST http://localhost:3000/api/ai/generate \
  -H "Content-Type: application/json" \
  -d '{"topic": "AI Content Generation", "style": "technical"}'
```

### Development

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run test` - Run tests
- `npm run lint` - Run ESLint

## Project Structure

```
├── app/                 # Next.js App Router
├── src/
│   ├── components/      # React components
│   ├── stores/         # Zustand state management
│   ├── services/       # Business logic services
│   └── lib/            # Utility libraries
├── docs/               # Project documentation
├── public/             # Static assets
└── tests/              # Test files
```

## Contributing

1. Follow the established coding standards
2. Write tests for new features
3. Update documentation as needed
4. Ensure all CI checks pass

## License

This project is licensed under the MIT License.