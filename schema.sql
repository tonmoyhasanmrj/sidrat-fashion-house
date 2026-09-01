CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  address TEXT NOT NULL,
  items TEXT NOT NULL,
  total INTEGER NOT NULL,
  via TEXT,
  payment_method TEXT,
  trx_id TEXT,
  status TEXT DEFAULT 'নতুন'
);
