-- এই migration টা আপনার আগে থেকে চালু থাকা D1 ডাটাবেসে একবার চালাতে হবে
-- (আপনার orders টেবিল আগে থেকেই আছে, তাই CREATE TABLE orders এখানে নেই)
--
-- কীভাবে চালাবেন (টার্মিনালে, প্রজেক্ট ফোল্ডারে গিয়ে):
--   npx wrangler d1 execute <আপনার-D1-ডাটাবেসের-নাম> --remote --file=migrations/0001_add_customer_login.sql
--
-- <আপনার-D1-ডাটাবেসের-নাম> এর জায়গায় wrangler.toml বা Cloudflare Dashboard-এ
-- যে নাম দেওয়া আছে সেটা বসান।

ALTER TABLE orders ADD COLUMN user_id TEXT;

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  phone TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_phone ON orders(phone);
