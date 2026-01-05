# Beacon - Global News Monitor

A modern global news monitoring web application featuring an interactive 3D globe visualization. Track real-time news events around the world with an immersive, fluid interface.

![Beacon Screenshot](screenshot.png)

## Features

- **Interactive 3D Globe**: Powered by react-globe.gl with smooth rotation, zoom, and drag controls
- **Real-time News Feed**: Live updates with animated notifications
- **Location-based Filtering**: Click on globe hotspots to filter news by region
- **Article Drawer**: Expand full articles in an elegant bottom drawer
- **Search Functionality**: Autocomplete search for locations and topics
- **Dark/Light Mode**: Toggle between themes with persistent preference
- **Glassmorphism UI**: Modern frosted glass design aesthetic
- **Category System**: Color-coded tags for Politics, Conflict, Natural Disaster, Economy, Technology, Health

## Tech Stack

- **Framework**: Next.js 16 with TypeScript
- **3D Visualization**: react-globe.gl (Three.js based)
- **Styling**: Tailwind CSS 4
- **UI Components**: shadcn/ui
- **Animations**: Framer Motion
- **State Management**: Zustand
- **Data Fetching**: TanStack Query

## Getting Started

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── layout.tsx         # Root layout with providers
│   ├── page.tsx           # Main dashboard page
│   └── globals.css        # Global styles
├── components/
│   ├── globe/             # Globe visualization
│   ├── news/              # News feed components
│   ├── search/            # Search functionality
│   └── ui/                # shadcn components
├── stores/                # Zustand state stores
├── hooks/                 # Custom React hooks
├── types/                 # TypeScript definitions
├── data/                  # Mock data
└── lib/                   # Utilities
```

## Design System

- **Background**: Near-black (#0A0A0F) in dark mode
- **Primary Accent**: Blue (#3B82F6)
- **Active/Alert**: Neon Orange (#FF6B35)
- **Typography**: Inter font family

## Future Enhancements

- Connect to real news APIs (GDELT, NewsAPI)
- Event clustering for nearby news
- Connection lines between related events
- Push notifications for breaking news
- User preferences and saved searches

## License

MIT
