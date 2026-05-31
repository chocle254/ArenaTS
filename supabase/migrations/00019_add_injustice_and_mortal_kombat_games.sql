-- Add new game types to the game_type enum
ALTER TYPE game_type ADD VALUE IF NOT EXISTS 'injustice';
ALTER TYPE game_type ADD VALUE IF NOT EXISTS 'mortal_kombat';