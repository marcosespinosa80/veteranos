
-- Add username field to profiles for DNI-based login
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS username text;

-- Create user_module_permissions table
CREATE TABLE public.user_module_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  module_key text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, module_key)
);

ALTER TABLE public.user_module_permissions ENABLE ROW LEVEL SECURITY;

-- SELECT: own or admin_general
CREATE POLICY "Users can view own permissions"
ON public.user_module_permissions
FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin_general'));

-- INSERT: admin_general only
CREATE POLICY "Admin general can insert permissions"
ON public.user_module_permissions
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin_general'));

-- UPDATE: admin_general only
CREATE POLICY "Admin general can update permissions"
ON public.user_module_permissions
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin_general'));

-- DELETE: admin_general only
CREATE POLICY "Admin general can delete permissions"
ON public.user_module_permissions
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin_general'));
