CREATE TABLE market_candles (
  id BIGSERIAL PRIMARY KEY,
  symbol TEXT NOT NULL,
  date DATE NOT NULL,
  open NUMERIC(16,6),
  high NUMERIC(16,6),
  low NUMERIC(16,6),
  close NUMERIC(16,6) NOT NULL,
  volume BIGINT,
  UNIQUE(symbol, date)
);

CREATE INDEX idx_market_candles_symbol_date ON market_candles(symbol, date DESC);

ALTER TABLE market_candles ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE market_candles FROM anon, authenticated;
