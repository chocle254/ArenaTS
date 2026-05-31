-- Create a function to get a random breath-taking avatar
CREATE OR REPLACE FUNCTION public.get_random_breath_taking_avatar()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
    avatars text[] := ARRAY[
        'https://miaoda-site-img.s3cdn.medo.dev/images/KLing_26dad928-74a6-44f7-b8d4-e1cf0059b2e6.jpg',
        'https://miaoda-site-img.s3cdn.medo.dev/images/KLing_a2d80bca-adac-4a3a-9e0e-a9694bf32ba5.jpg',
        'https://miaoda-site-img.s3cdn.medo.dev/images/KLing_f1daa62c-38d1-48bf-a619-04f491ce2bf3.jpg',
        'https://miaoda-site-img.s3cdn.medo.dev/images/KLing_82912364-b864-4846-89b7-ecdc85dc1225.jpg',
        'https://miaoda-site-img.s3cdn.medo.dev/images/KLing_b5cfbf67-3067-46c6-b2cc-5c4fbea7d600.jpg',
        'https://miaoda-site-img.s3cdn.medo.dev/images/KLing_d1e487b5-bd84-4413-a5c3-598538f08712.jpg',
        'https://miaoda-site-img.s3cdn.medo.dev/images/KLing_a171edef-e734-4b43-b7cd-b0bb5f46c3fb.jpg',
        'https://miaoda-site-img.s3cdn.medo.dev/images/KLing_d258695d-e03f-48ee-bffe-769d2f2a08fc.jpg',
        'https://miaoda-site-img.s3cdn.medo.dev/images/KLing_27659b40-fd1e-4d05-915b-513498f65e6c.jpg',
        'https://miaoda-site-img.s3cdn.medo.dev/images/KLing_38f6059d-b78e-4cc6-9505-7e868e703866.jpg'
    ];
BEGIN
    RETURN avatars[floor(random() * array_length(avatars, 1) + 1)];
END;
$$;

-- Create a function to handle the trigger for new profiles
CREATE OR REPLACE FUNCTION public.handle_new_profile_avatar()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF NEW.avatar_url IS NULL OR NEW.avatar_url = '' THEN
        NEW.avatar_url := public.get_random_breath_taking_avatar();
    END IF;
    RETURN NEW;
END;
$$;

-- Create the trigger
DROP TRIGGER IF EXISTS tr_on_profile_avatar_insert ON public.profiles;
CREATE TRIGGER tr_on_profile_avatar_insert
    BEFORE INSERT ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_profile_avatar();

-- Update existing profiles that don't have an avatar
UPDATE public.profiles
SET avatar_url = public.get_random_breath_taking_avatar()
WHERE avatar_url IS NULL OR avatar_url = '';
