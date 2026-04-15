<div align="center">
<img width="1200" height="475" alt="GenX Trading Dashboard" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# GenX Trading Dashboard

A sophisticated automated trading dashboard for Deriv.com, featuring Advanced Price Action (APA) analysis, real-time market data, and intelligent trade execution.

**Note:** This project is for **educational purposes only**. Automated trading involves significant risk of financial loss.

## Features

### Trading Engine
- **APA Analysis** - Advanced Price Action with BOS/ChoCh detection
- **Order Block Identification** - Institutional level detection
- **Structure Break Monitoring** - Real-time market structure analysis
- **Crash/Boom Mode** - Specialized spike filtering for volatile indices

### Statistical Models
- Linear Regression analysis
- GARCH volatility forecasting
- Kalman Filter for price smoothing
- Monte Carlo simulations
- Hidden Markov Model state detection
- Neural Network ensemble bias

### Risk Management
- Dynamic lot sizing with spread protection
- Configurable stop loss and take profit
- Daily drawdown tracking and auto-halt
- Per-instrument risk profiles

### Dashboard
- Real-time price charts
- Active trade monitoring
- Trade history with AI-generated summaries
- Strategy configuration panel
- Log viewer with trade diagnostics

## Supported Instruments

| Symbol | Type | Default SL | Default TP |
|--------|------|-----------|------------|
| Volatility 75 Index | Regular | 500 pips | 1000 pips |
| Crash 1000 Index | Crash/Boom | 300 pips | 600 pips |
| XAUUSD | Forex | 50 pips | 150 pips |

## Setup

### Prerequisites
- Node.js 18+
- npm or yarn
- Deriv.com account (for live trading)

### Installation

```bash
# Clone the repository
git clone https://github.com/Houdinnie/GenX.git
cd GenX

# Install dependencies
npm install

# Copy environment template
cp .env.example .env.local
```

### Configuration

Edit `.env.local`:
```env
GEMINI_API_KEY=your_gemini_api_key_here
```

### Running

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Broker Connection

1. Go to **Settings** → **Broker**
2. Enter your Deriv App ID (default: `31063` for Deriv)
3. Enter your API token from [Deriv](https://app.deriv.com)
4. Click **Connect to Deriv**

## Project Structure

```
src/
├── components/         # React UI components
├── hooks/              # Custom React hooks
├── lib/                # Utility functions
├── services/           # Business logic
│   ├── apaEngine.ts    # APA trading engine
│   └── derivService.ts # Deriv API integration
├── types.ts            # TypeScript definitions
├── App.tsx             # Main application
└── main.tsx            # Entry point

.env.local              # Environment variables (not committed)
```

## API Keys

### Gemini API
Required for AI-powered trade summaries. Get a key at [Google AI Studio](https://aistudio.google.com/).

### Deriv API
Required for live trading. Get your API token from [Deriv > Settings > API](https://app.deriv.com).

**Security Note:** API tokens are stored in localStorage. Use a dedicated account with limited permissions for trading bots.

## Trading Risks

⚠️ **Important Disclaimers:**

- Forex and CFD trading involves substantial risk of loss
- Past performance does not guarantee future results
- Never trade with money you cannot afford to lose
- Always test on a demo account first

## Development

### Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |

### Tech Stack

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Fast build tool
- **Tailwind CSS** - Styling
- **Recharts** - Charting library
- **Motion** - Animations
- **Lucide** - Icons

## License

Apache-2.0

---

Built with ❤️ for educational purposes.