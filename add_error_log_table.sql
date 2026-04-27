-- Add error_log table
CREATE TABLE IF NOT EXISTS public.error_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  error_type TEXT NOT NULL,
  error_message TEXT NOT NULL,
  error_details TEXT,
  case_id UUID REFERENCES public.case(id) ON DELETE SET NULL,
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Apply trigger to error_log table
CREATE TRIGGER update_error_log_updated_at BEFORE UPDATE ON public.error_log FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
