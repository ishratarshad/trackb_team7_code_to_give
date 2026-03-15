# LemonLens

LemonLens is an operational intelligence platform built for **Lemontree** as part of the Morgan Stanley Code to Give Hackathon. It transforms raw pantry data, client feedback, and food photos into actionable insights to help nonprofit partners identify and address food access gaps across NYC.

---

## System Architecture

LemonLens follows a multi-layer data processing pipeline designed for high scalability and real-time insights.



### Layer 1: Image Classification
Food distribution photos are processed using the **Anthropic Claude Vision API** to extract structured tags (e.g., rice, protein, fresh produce) automatically.

### Layer 2: Supply Profiling
Extracted tags are normalized into five major groups: Grains, Protein, Dairy, Fresh Produce, and Canned Goods to build a comprehensive inventory profile for each pantry location.

### Layer 3: Insight Generation
By combining supply profiles with operational signals like wait times and unmet demand, the system calculates a **Needs Score** and **Gap Score** to highlight the most critical areas.

---

## Key Features

- **AI-Based Inventory Tracking**: Automatically detects food items from pantry photos to verify current stock levels.
- **Operational Priority Board**: A real-time leaderboard ranking the Top 5 pantries with the highest demand pressure and supply shortages.
- **Interactive Resource Map**: A Mapbox-powered visualization of 1,400+ NYC food locations with smart clustering and viewport-based insights.
- **Live Supply Breakdown**: Dynamic charts showing the city-wide distribution of key food groups based on current map filters.
- **Volunteer Feedback Loop**: A structured form that captures wait times, attendance, and inventory accuracy to enable automated trend detection.

---

## Tech Stack

**Frontend**
- Next.js (App Router)
- React
- Tailwind CSS

**Backend**
- Next.js API Routes
- Node.js

**Infrastructure**
- Mapbox GL JS (Mapping)
- Anthropic Claude Vision API (AI)
- Vercel (Deployment)

---

## Setup and Installation

1. **Clone the repository**
   git clone [https://github.com/your-repo/lemonlens.git](https://github.com/your-repo/lemonlens.git)
   cd lemonlens
   
2. **Install dependencies**
   npm install
   
4. **Configure Environment Variables**
   Create a .env.local file in the root directory:
   - ANTHROPIC_API_KEY=your_api_key
   - NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=your_mapbox_token
     
5. **Run the development server**
   npm run dev

**Team Members**:
- Ishrat Arshad
- Rohit Karnik
- Anish Yenduri
- Nirmit Bhoyar
- Philip Shaji Baby

