# Supabase Row Level Security Policies (Updated)

To fix the "violates row-level security policy for table transcripts" error without adding a user_id column, we'll base permissions on recording ownership instead.

## What is Row Level Security?

RLS allows you to control which users can access which rows in a database table. By default, when you enable RLS on a table, all access is denied unless explicitly allowed by a policy.

## Simpler Solution: Using Recording Relationships

This approach uses the existing relationship between transcripts and recordings without adding a user_id column.

1. Log in to your Supabase dashboard
2. Go to the "Table Editor" in the left sidebar
3. Select the "transcripts" table
4. Go to the "Policies" tab
5. Click on "New Policy"

### Basic Policies Based on Recording Ownership

```sql
-- Enable RLS on the transcripts table if not already enabled
ALTER TABLE transcripts ENABLE ROW LEVEL SECURITY;

-- Policy for inserting new transcripts
CREATE POLICY "Users can insert transcripts for recordings they own" 
ON transcripts FOR INSERT 
TO authenticated 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM recordings 
    WHERE recordings.id = recording_id 
    AND recordings.user_id = auth.uid()
  )
);

-- Policy for selecting transcripts
CREATE POLICY "Users can view transcripts for recordings they own" 
ON transcripts FOR SELECT 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM recordings 
    WHERE recordings.id = recording_id 
    AND recordings.user_id = auth.uid()
  )
);

-- Policy for updating transcripts
CREATE POLICY "Users can update transcripts for recordings they own" 
ON transcripts FOR UPDATE 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM recordings 
    WHERE recordings.id = recording_id 
    AND recordings.user_id = auth.uid()
  )
);

-- Policy for deleting transcripts
CREATE POLICY "Users can delete transcripts for recordings they own" 
ON transcripts FOR DELETE 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM recordings 
    WHERE recordings.id = recording_id 
    AND recordings.user_id = auth.uid()
  )
);
```

## Temporary Workaround (If Still Having Issues)

If you're still experiencing problems, you can temporarily disable RLS for the transcripts table:

```sql
ALTER TABLE transcripts DISABLE ROW LEVEL SECURITY;
```

However, this is not recommended for production environments as it bypasses security.

## Testing

After implementing these changes:
1. Try processing a recording again
2. Check if transcript appears in the details page
3. Try downloading the transcript using the new download button

The updated system now allows viewing and downloading transcripts without requiring a user_id column while maintaining appropriate security through the recordings relationship. 