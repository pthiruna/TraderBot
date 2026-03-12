import os
import datetime
import yfinance as yf

#TICKER = 'QQQ'

TICKER = 'SPY'

OUTPUT_DIR = os.path.join(os.path.dirname(__file__), '..', 'data', 'ticker')
os.makedirs(OUTPUT_DIR, exist_ok=True)

ticker = yf.Ticker(TICKER)
info = ticker.info

# Determine inception date from ticker metadata; fall back to a broad start
inception_date = None
for field in ('fundInceptionDate', 'ipoExpectedDate', 'firstTradeDateEpochUtc'):
    val = info.get(field)
    if val:
        if isinstance(val, int):
            inception_date = datetime.datetime.utcfromtimestamp(val).strftime('%Y-%m-%d')
        else:
            inception_date = str(val)[:10]
        break

if not inception_date:
    print(f"Warning: Could not determine inception date for '{TICKER}'. Defaulting to 1900-01-01.")
    inception_date = '1900-01-01'

start = inception_date
print(f"Ticker: {TICKER}")
print(f"Inception date: {start}")

data = yf.download(TICKER, start=start, auto_adjust=True)
output_file = os.path.join(OUTPUT_DIR, f'{TICKER}_historical.csv')
data.to_csv(output_file)

print(f"Saved {len(data)} rows to {output_file}")
print(f"Date range: {data.index[0]} to {data.index[-1]}")
