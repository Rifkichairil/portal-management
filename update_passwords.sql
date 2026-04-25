-- Update passwords to bcrypt hashes
-- Run this in your Supabase SQL Editor

UPDATE public.users
SET password = '$2b$12$Xdzm40jh9d8Tbhb6lKKRJuTRKY4Qp74QNYJTCfa1C1r/FcZTjA9iO',
    updated_at = NOW()
WHERE username = 'admin_portal';

UPDATE public.users
SET password = '$2b$12$0wKGbhtMLNoJCvxU0tcQEeiQQFcA183Mm4iM05SuvDJlqtsUjvwkm',
    updated_at = NOW()
WHERE role = 'manager';

UPDATE public.users
SET password = '$2b$12$frIP3u9Wc7/X1jDU07.md.EE1S.4TgUXw/.vfjs.gonB4.qQfDTrK',
    updated_at = NOW()
WHERE role = 'submitercase';

-- Verify update
SELECT username, role, LEFT(password, 7) AS password_prefix
FROM public.users
ORDER BY role, username;
