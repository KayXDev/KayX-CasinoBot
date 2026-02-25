-- Update users table to support hand and bank balances
ALTER TABLE users 
  ADD COLUMN hand BIGINT NOT NULL DEFAULT 0,
  ADD COLUMN bank BIGINT NOT NULL DEFAULT 0;

-- If old 'balance' column exists, migrate to 'hand' and drop it
UPDATE users SET hand = balance;
ALTER TABLE users DROP COLUMN balance;
