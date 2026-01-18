# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Tag Insight Crawler is a web application that crawls websites to detect and analyze tracking tags, analytics, and advertising technology (AdTech) implementations. It helps website owners understand data collection practices on their sites for privacy compliance (GDPR, CCPA) and performance monitoring.

## Architecture

This is a simple Node.js/Express application with a client-side frontend:

### Backend (Node.js/Express)
- **index.js**: Express server entry point. Serves static HTML files and handles `/crawl` POST endpoint
- **crawler.js**: Core crawling logic using Puppeteer Core connected to browserless.io API
  - Intercepts network requests using `page.setRequestInterception(true)`
  - Filters requests matching known tracking domains (analytics, AdTech, CMPs)
  - Captures request method, domain, payload, parameters, and response status

### Frontend (Vanilla HTML/JS)
- **index.html**: URL submission form that POSTs to `/crawl` endpoint
- **results.html**: Results table displaying captured tracking requests
- Data flow: Form submission → Server crawl → localStorage → Results page

### External Dependencies
- **browserless.io**: Provides managed headless Chrome instances via WebSocket connection
- Requires `BROWSERLESS_API_KEY` environment variable (stored in `.env`)

## Development Commands

### Start the server
```bash
npm start
# Server runs on http://localhost:3000
```

### Install dependencies
```bash
npm install
```

## Environment Configuration

Create a `.env` file in the project root with:
```
BROWSERLESS_API_KEY=your_api_key_here
```

The application will fail to start without this API key.

## Key Implementation Details

### Tracking Domain Detection
The crawler uses a hardcoded list of ~30 tracking domains in `crawler.js` (lines 10-39) including:
- Analytics: Google Analytics, Adobe Analytics, Yahoo Analytics
- AdTech: Google Ads, Facebook Pixel, Twitter Ads, LinkedIn Ads, TikTok Pixel
- CMPs: OneTrust, TrustArc, Quantcast

To add new tracking domains, update the `trackingDomains` array in `crawler.js`.

### Request Interception Flow
1. Connect to browserless.io via WebSocket
2. Enable request interception on Puppeteer page
3. Listen to 'request' events to capture domain, method, payload, params
4. Listen to 'response' events to capture HTTP status codes
5. Navigate to target URL with `networkidle0` wait condition
6. Return filtered tracking requests

### Known Limitations (from PRD)
- Single URL crawling only (no multi-page support)
- No simulation of user interactions (e.g., cookie consent)
- Basic filtering/searching capabilities
- Results stored in browser localStorage (not persisted server-side)

## Future Enhancement Areas (from prd.md)
- Multi-page crawling
- Cookie consent simulation
- Detailed data analysis and insights
- Scheduled crawls and reporting
- User accounts and project management
