# PantryPulse - Food Resource Intelligence Platform

**Morgan Stanley Code to Give Hackathon | Team 7 | Track B**

An AI-powered analytics dashboard that helps government partners and food banks understand food access patterns across NYC neighborhoods.

## The Problem

Lemontree has rich data on 1,400+ food pantries, but partners like the NYC Mayor's Office can't easily explore it. Questions like *"Does the food in Jackson Heights match South Asian dietary preferences?"* take days to answer manually.

## Our Solution

A visual dashboard that transforms raw data into instant, actionable insights:

- **Interactive Map** - All NYC food resources with demographic overlays
- **AI Food Classification** - Automatically tags what food is available (halal, kosher, fresh produce, etc.)
- **Structured Feedback** - Collects and analyzes client reviews at scale
- **PDF Reports** - One-click export for stakeholder presentations

## Quick Start

### Frontend (Next.js Dashboard)
```bash
cd Pantry_Dashboard
npm install
npm run dev
# Open http://localhost:3000
```

### Backend (FastAPI)
```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload
# Runs on http://localhost:8000
```

## Project Structure

```
├── Pantry_Dashboard/    # Next.js frontend
│   ├── app/             # Pages & API routes
│   ├── components/      # React components
│   ├── lib/             # Utilities
│   └── src/data/        # Census & AI data
│
└── backend/             # FastAPI backend
    ├── app/             # Main application
    ├── feedback/        # Review collection API
    └── ingest/          # Data ingestion
```

## Tech Stack

- **Frontend**: Next.js 14, React, Tailwind CSS, Mapbox GL
- **Backend**: FastAPI, Python
- **AI**: Claude Vision for food classification
- **Data**: NYC Census (ACS), USDA Food Access Atlas

## Key Features

| Feature | Description |
|---------|-------------|
| Demographic Overlays | Poverty rate & SNAP enrollment visualization |
| Supply Breakdown | AI-detected food availability by category |
| Trend Analytics | Wait times, ratings, success rates over time |
| Structured Feedback | Categorized reasons for service issues |

## Team 7

Built for Morgan Stanley Code to Give 2024
