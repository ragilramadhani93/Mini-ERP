-- Create avatar bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- RLS Policy to allow authenticated users to upload their own avatar
CREATE POLICY IF NOT EXISTS "Users can upload their own avatar"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'avatars' AND (LOWER(storage.foldername(name))) = 'avatars' AND (LOWER(storage.filename(name))) LIKE (auth.uid() || '%'));

-- RLS Policy to allow authenticated users to update their own avatar
CREATE POLICY IF NOT EXISTS "Users can update their own avatar"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'avatars' AND (LOWER(storage.foldername(name))) = 'avatars' AND (LOWER(storage.filename(name))) LIKE (auth.uid() || '%'));

-- RLS Policy to allow public access to read avatars
CREATE POLICY IF NOT EXISTS "Public can view avatars"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'avatars');
