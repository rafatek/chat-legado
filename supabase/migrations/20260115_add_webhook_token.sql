-- Add webhook_token column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS webhook_token TEXT UNIQUE;

-- Create index for faster lookup
CREATE INDEX IF NOT EXISTS idx_profiles_webhook_token ON public.profiles(webhook_token);
