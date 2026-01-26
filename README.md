# Ninjo Prompt Analyzer

An AI-powered web application for analyzing and improving prompts for the Ninjo self-serve platform. Built with Next.js 15, TypeScript, and Claude Sonnet 4.5.

## Features

- **Intelligent Prompt Analysis**: Uses Claude AI to identify issues, ambiguities, and inconsistencies
- **Multi-Modal Feedback**: Upload screenshots and add text feedback for comprehensive analysis
- **Interactive Diff Viewer**: See side-by-side comparisons of original vs. suggested improvements
- **Suggestion Management**: Accept, edit, or reject suggestions with a single click
- **Version History**: Track changes and restore previous versions
- **Real-Time Updates**: Instant prompt updates as you apply suggestions
- **Persistent Storage**: Your work is saved locally using browser storage

## Tech Stack

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **AI Provider**: Anthropic Claude Sonnet 4.5
- **Styling**: Tailwind CSS
- **State Management**: Zustand with persistence
- **UI Components**: Lucide React icons + react-diff-viewer
- **Validation**: Zod

## Prerequisites

- Node.js 18+
- npm or yarn
- Anthropic API key (get one at https://console.anthropic.com/)

## Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd Ninjo-Prompt-Analyzer-
```

2. Install dependencies:
```bash
npm install --legacy-peer-deps
```

3. Create `.env.local` file:
```bash
cp .env.local.example .env.local
```

4. Add your Anthropic API key to `.env.local`:
```
ANTHROPIC_API_KEY=your_api_key_here
```

## Development

Start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Building for Production

```bash
npm run build
npm start
```

## Usage

1. **Paste Your Prompt**: Enter your Ninjo self-serve prompt in the large textarea
2. **Add Feedback** (Optional):
   - Upload screenshots showing problematic outputs
   - Add text feedback from users or chat logs
3. **Analyze**: Click the "Analyze Prompt" button
4. **Review Results**:
   - View overall feedback and severity-sorted suggestions
   - Expand each suggestion to see the diff view
5. **Apply Changes**:
   - Click "Accept" to apply a suggestion
   - Click "Edit" to modify the suggestion before applying
   - Click "Reject" to dismiss a suggestion
6. **Track Versions**: View and restore previous versions in the Version History panel

## Project Structure

```
├── app/
│   ├── api/
│   │   └── analyze/route.ts      # Claude API integration
│   ├── layout.tsx                # Root layout
│   ├── page.tsx                  # Main page
│   └── globals.css               # Global styles
├── components/
│   ├── prompt/                   # Prompt input & history
│   ├── feedback/                 # Feedback collection
│   └── analysis/                 # Analysis results & suggestions
├── lib/
│   ├── anthropic/                # Claude client & prompts
│   └── utils/                    # Utilities & validation
├── store/
│   └── analysisStore.ts          # Zustand state management
└── types/                        # TypeScript definitions
```

## API Costs

Using Claude Sonnet 4.5:
- Input: ~$3 per 1M tokens
- Output: ~$15 per 1M tokens
- Typical analysis: $0.05 - $0.20 per request (depending on prompt size and feedback)

## Security Considerations

- API keys are stored in `.env.local` and never exposed to the client
- Image uploads are validated for type and size (max 5MB)
- All requests are validated with Zod schemas
- Images are compressed before sending to reduce costs

## Limitations

- Maximum 20 images per analysis (Claude API limit)
- Images must be under 5MB each
- Analysis can take 15-30 seconds depending on complexity
- Requires active internet connection for API calls

## Future Enhancements

- [ ] Batch analysis of multiple prompts
- [ ] Saved prompt templates
- [ ] Collaboration features
- [ ] A/B testing of prompt versions
- [ ] Export to PDF/Markdown
- [ ] Analytics and improvement tracking
- [ ] Direct integration with Ninjo API

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.

## License

ISC

## Support

For issues or questions, please open an issue on GitHub.
