-- Blog Posts Table for Casino Bot Website
-- This table stores user-submitted blog posts

CREATE TABLE IF NOT EXISTS blog_posts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    excerpt VARCHAR(500) NOT NULL,
    category VARCHAR(100) NOT NULL DEFAULT 'General',
    author_id VARCHAR(32) NOT NULL,
    author_name VARCHAR(100) NOT NULL,
    author_avatar VARCHAR(255),
    status ENUM('draft', 'published', 'archived') DEFAULT 'draft',
    featured BOOLEAN DEFAULT FALSE,
    tags JSON,
    views INT DEFAULT 0,
    likes INT DEFAULT 0,
    comments_count INT DEFAULT 0,
    read_time VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    published_at TIMESTAMP NULL,
    INDEX idx_author (author_id),
    INDEX idx_status (status),
    INDEX idx_category (category),
    INDEX idx_featured (featured),
    INDEX idx_published_at (published_at),
    FOREIGN KEY (author_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Blog Comments Table
CREATE TABLE IF NOT EXISTS blog_comments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    post_id INT NOT NULL,
    author_id VARCHAR(32) NOT NULL,
    author_name VARCHAR(100) NOT NULL,
    author_avatar VARCHAR(255),
    content TEXT NOT NULL,
    parent_id INT NULL, -- For nested comments
    likes INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_post (post_id),
    INDEX idx_author (author_id),
    INDEX idx_parent (parent_id),
    FOREIGN KEY (post_id) REFERENCES blog_posts(id) ON DELETE CASCADE,
    FOREIGN KEY (author_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (parent_id) REFERENCES blog_comments(id) ON DELETE CASCADE
);

-- Blog Likes Table (for tracking who liked what)
CREATE TABLE IF NOT EXISTS blog_likes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    post_id INT NOT NULL,
    user_id VARCHAR(32) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_like (post_id, user_id),
    INDEX idx_post (post_id),
    INDEX idx_user (user_id),
    FOREIGN KEY (post_id) REFERENCES blog_posts(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Blog Comment Likes Table
CREATE TABLE IF NOT EXISTS blog_comment_likes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    comment_id INT NOT NULL,
    user_id VARCHAR(32) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_comment_like (comment_id, user_id),
    INDEX idx_comment (comment_id),
    INDEX idx_user (user_id),
    FOREIGN KEY (comment_id) REFERENCES blog_comments(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Insert some sample categories (optional)
INSERT IGNORE INTO blog_posts (id, title, content, excerpt, category, author_id, author_name, status, featured, tags, views, likes, comments_count, read_time, published_at) VALUES
(1, 'Welcome to Our Blog!', 'This is the first post on our Casino Bot blog. We''ll be sharing insights, updates, and tips for getting the most out of your Discord casino experience.', 'Welcome to our new blog where we share insights and updates about Casino Bot.', 'Announcements', 'system', 'Casino Bot Team', 'published', TRUE, '["welcome", "announcement", "blog"]', 150, 25, 5, '3 min read', NOW());