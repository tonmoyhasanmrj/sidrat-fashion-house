-- সিদরাত ফ্যাশন হাউস — ডাটাবেস স্কিমা (নতুন D1 ডাটাবেসে প্রথমবার বসানোর জন্য)
-- আগে থেকে চালু থাকা ডাটাবেসের জন্য migrations/0001_add_customer_login.sql ব্যবহার করুন

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
  status TEXT DEFAULT 'নতুন',
  user_id TEXT
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  phone TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_phone ON orders(phone);
