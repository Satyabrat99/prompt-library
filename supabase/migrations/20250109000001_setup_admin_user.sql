-- Create a function to promote a user to admin
CREATE OR REPLACE FUNCTION public.promote_user_to_admin(user_email TEXT)
RETURNS void AS $$
BEGIN
  UPDATE public.user_profiles 
  SET role = 'admin'
  WHERE id = (
    SELECT id FROM auth.users 
    WHERE email = user_email
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Example: To promote a user to admin, run:
-- SELECT public.promote_user_to_admin('your-email@example.com');

-- You can also manually update a user's role:
-- UPDATE public.user_profiles SET role = 'admin' WHERE id = 'user-uuid-here';
