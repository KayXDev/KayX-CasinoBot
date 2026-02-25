-- SQL script to create the required database and table for the casino bot
CREATE DATABASE IF NOT EXISTS casino_bot;
USE casino_bot;

CREATE TABLE IF NOT EXISTS users (
  user_id VARCHAR(32) PRIMARY KEY,
  balance BIGINT NOT NULL DEFAULT 1000
);
