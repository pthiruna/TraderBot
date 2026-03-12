# TraderBot

An interactive web app for visualizing historical ETF price data with support for moving average overlays, rate-of-return calculations, and custom date range selection.

## Quick Start

```bash
bash scripts/run.sh
```

Opens the app at `http://localhost:8080/web/index.html` automatically.

## Overview

TraderBot fetches and displays historical OHLCV data for ETFs and indexes (QQQ, SPY, NDX, or any ticker supported by Yahoo Finance). The chart is interactive — you can zoom into specific date ranges by dragging, and the app will instantly compute the rate of return and CAGR for the selected period.

### Features

- **Multi-ticker support** — dropdown populated automatically from available CSV files in `data/ticker/`
- **Interactive chart** — drag to zoom, scroll to pan; Y-axis auto-fits to the visible price range
- **Rate-of-return bar** — shows start/end price, total return %, CAGR, and duration for any selected range
- **Moving average overlays** — toggle 50-day and 200-day SMA overlays independently
- **Quick range buttons** — 1W, 1M, 3M, 6M, YTD, 1Y, 3Y, 5Y, 10Y, Max
- **Calendar date pickers** — bidirectionally synced with the chart zoom level

## Requirements

- Python 3 (standard library only — no pip installs needed to run the web app)
- `yfinance` (only needed to download new ticker data)

## Adding a New Ticker

Edit `scripts/get_ticker_dump.py` and set the `TICKER` variable, then run:

```bash
python3 scripts/get_ticker_dump.py
```

The CSV is saved to `data/ticker/{TICKER}_historical.csv` and will appear in the dropdown automatically on next page load. The script determines the ticker's inception date automatically from Yahoo Finance metadata.

## Project Structure

```
TraderBot/
├── data/
│   └── ticker/                  # Historical OHLCV CSVs (one per ticker)
├── scripts/
│   ├── run.sh                   # Start the local server
│   └── get_ticker_dump.py       # Download historical data for a ticker
└── web/
    ├── index.html               # Main app page
    ├── app.js                   # Chart logic, MA computation, range selection
    └── styles.css               # Dark theme styles
```
