# Edge of Knowledge

**Where your curiosity meets the frontier of science.**

Point your camera at anything curious and navigate the map of human knowledge - from established science to genuine mysteries that nobody has solved yet.

![Edge of Knowledge](https://edge-of-knowledge.vercel.app/opengraph-image)

## What is this?

Edge of Knowledge is an AI-powered exploration tool that transforms any image into a journey through scientific knowledge. Upload a photo of anything - a butterfly wing, a crystal, a strange cloud formation - and discover:

- **The Science** - How things work at a fundamental level, backed by real research papers
- **The Unknown** - Genuine mysteries and open questions at the frontier of human knowledge
- **Investigate** - Experiments you can try yourself to explore further

Unlike typical AI assistants that confidently answer everything, Edge of Knowledge honestly maps what humanity knows, debates, and has yet to discover.

## Features

- **Real Research Integration** - Pulls from Semantic Scholar's database of 200M+ academic papers
- **Knowledge Depth Indicators** - See whether something is well-established, actively debated, or genuinely unknown
- **Research Heat Tracking** - Know if a topic is hot (recent papers) or cold (understudied)
- **Branching Exploration** - Follow your curiosity down endless rabbit holes
- **Frontier Detection** - Get excited when you reach genuine edges of human knowledge
- **Mobile Friendly** - Works great on phones for in-the-field discoveries

## Tech Stack

- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS, Framer Motion
- **AI**: Google Gemini 3 Pro
- **Research**: Semantic Scholar API
- **State**: Zustand
- **Deployment**: Vercel

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Gemini API key (get one at [Google AI Studio](https://makersuite.google.com/app/apikey))

### Installation

```bash
# Clone the repository
git clone https://github.com/Forkei/Edge-of-Knowledge.git
cd Edge-of-Knowledge

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
```

Add your API key to `.env.local`:
```
GEMINI_API_KEY=your_gemini_api_key_here
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to start exploring.

### Production Build

```bash
npm run build
npm start
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GEMINI_API_KEY` | Yes | Google Gemini API key for AI analysis |
| `APP_PASSWORD` | No | If set, requires password to access the app |

## How It Works

1. **Image Analysis** - Gemini identifies what's in your image with scientific precision
2. **Paper Search** - Semantic Scholar finds relevant academic research
3. **Knowledge Mapping** - AI synthesizes papers to map known vs unknown territory
4. **Branch Generation** - Creates exploration paths based on real research gaps
5. **Frontier Detection** - Flags when you've reached genuine open questions

## The Philosophy

Most AI tools pretend to know everything. Edge of Knowledge embraces uncertainty:

- **Confidence scores** tell you how well-established something is
- **Research heat** shows if scientists are actively studying it
- **Frontier alerts** celebrate when you find genuine mysteries
- **Real citations** let you verify and dig deeper

The goal isn't answers - it's wonder.

## Project Structure

```
edge-of-knowledge/
├── app/                    # Next.js app router
│   ├── api/               # API routes (analyze, explore, auth)
│   ├── explore/[id]/      # Dynamic exploration pages
│   ├── login/             # Authentication page
│   └── page.tsx           # Home page
├── components/            # React components
│   ├── ImageUpload.tsx    # Image upload with compression
│   ├── EntryPoint.tsx     # Initial analysis display
│   ├── ExplorationTab.tsx # Branch exploration UI
│   └── TabBar.tsx         # Navigation tabs
├── lib/                   # Utilities
│   ├── prompts.ts         # AI prompt engineering
│   ├── papers.ts          # Semantic Scholar integration
│   ├── store.ts           # Zustand state management
│   ├── auth.ts            # Authentication logic
│   └── rate-limit.ts      # API rate limiting
└── public/                # Static assets
```

## Contributing

Contributions are welcome! Feel free to:

- Report bugs
- Suggest new features
- Submit pull requests
- Share interesting discoveries you've made

## Built For

This project was built for the [Kaggle Gemini Competition](https://www.kaggle.com/competitions/vibe-code-with-gemini-3) - a challenge to create innovative applications using Google's Gemini AI.

## License

MIT License - feel free to use, modify, and share.

## Acknowledgments

- **Google Gemini** - For the powerful multimodal AI capabilities
- **Semantic Scholar** - For providing free access to academic paper metadata
- **Vercel** - For seamless deployment
- **The curious** - For never stopping asking "why?"

---

**Start exploring**: [edge-of-knowledge.vercel.app](https://edge-of-knowledge.vercel.app)

*"The important thing is not to stop questioning. Curiosity has its own reason for existence."* - Albert Einstein
