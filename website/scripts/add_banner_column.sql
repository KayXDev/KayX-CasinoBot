-- Add banner_url column to user_profiles table
ALTER TABLE user_profiles 
ADD COLUMN banner_url TEXT NULL 
AFTER avatar_url;

-- Add comment for documentation
ALTER TABLE user_profiles 
MODIFY COLUMN banner_url TEXT NULL COMMENT 'URL for user profile banner image';