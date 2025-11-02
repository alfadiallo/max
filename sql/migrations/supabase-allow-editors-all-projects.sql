-- =====================================================
-- Allow Editors to View All Projects
-- =====================================================
-- Editors should be able to see and work on all projects,
-- not just the ones they created
-- =====================================================

-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Users can view their own projects" ON max_projects;

-- Create new policy that allows:
-- 1. Users to view their own projects
-- 2. Editors to view ALL projects
CREATE POLICY "Users can view their own projects or Editors can view all" 
ON max_projects 
FOR SELECT 
USING (
  auth.uid() = created_by 
  OR 
  (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) IN ('Editor', 'editor', 'Admin', 'admin')
);

-- Also allow Editors to update projects (they need to edit transcriptions)
DROP POLICY IF EXISTS "Users can update their own projects" ON max_projects;

CREATE POLICY "Users can update their own projects or Editors can update all" 
ON max_projects 
FOR UPDATE 
USING (
  auth.uid() = created_by 
  OR 
  (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) IN ('Editor', 'editor', 'Admin', 'admin')
);

-- Verify the policies
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  permissive, 
  roles, 
  cmd, 
  qual 
FROM pg_policies 
WHERE tablename = 'max_projects'
ORDER BY policyname;

