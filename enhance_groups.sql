-- Add badge/icon column to groups for clan-style identity
ALTER TABLE public.groups ADD COLUMN IF NOT EXISTS badge TEXT DEFAULT '⚡';
ALTER TABLE public.groups ADD COLUMN IF NOT EXISTS motto TEXT;

-- Update seed groups with badges and mottos
UPDATE public.groups SET badge = '🔧', motto = 'Build fast, break barriers' WHERE name = 'Techno-Optimists';
UPDATE public.groups SET badge = '🌿', motto = 'Innovate sustainably' WHERE name = 'Green Guardians';
UPDATE public.groups SET badge = '🚀', motto = 'Ad astra per aspera' WHERE name = 'Cosmic Explorers';
UPDATE public.groups SET badge = '🏗️', motto = 'Cities of tomorrow, today' WHERE name = 'Urban Architects';
