-- SignBridge AI (TOUCH) Accessibility Platform
-- Supabase PostgreSQL Database Migration
-- Defines schemas for profiles, sign_dictionary, recognition_history, and saved_signs
-- Includes comprehensive Row Level Security (RLS) policies

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT,
    preferred_hand TEXT DEFAULT 'right' CHECK (preferred_hand IN ('right', 'left', 'both')),
    record_history BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 2. SIGN DICTIONARY TABLE (Publicly verified ISL references)
CREATE TABLE IF NOT EXISTS public.sign_dictionary (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    label TEXT NOT NULL UNIQUE,
    english_phrase TEXT NOT NULL,
    hindi_phrase TEXT,
    category TEXT NOT NULL CHECK (category IN ('Greetings', 'Essentials', 'Emergency', 'Numbers', 'Everyday', 'Feelings')),
    description TEXT NOT NULL,
    hand_shape TEXT NOT NULL,
    movement_description TEXT NOT NULL,
    two_handed BOOLEAN DEFAULT false,
    validation_status TEXT DEFAULT 'validated_islrtc' CHECK (validation_status IN ('validated_islrtc', 'verified', 'in_review')),
    source_provenance TEXT NOT NULL DEFAULT 'ISLRTC Indian Sign Language Standard Corpus',
    media_svg_path TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 3. RECOGNITION HISTORY TABLE
CREATE TABLE IF NOT EXISTS public.recognition_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    sign_label TEXT NOT NULL,
    confidence_score NUMERIC(5, 4) NOT NULL CHECK (confidence_score >= 0.0 AND confidence_score <= 1.0),
    hand_used TEXT DEFAULT 'right' CHECK (hand_used IN ('right', 'left')),
    recognized_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 4. SAVED SIGNS TABLE (Bookmarks)
CREATE TABLE IF NOT EXISTS public.saved_signs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    sign_id UUID NOT NULL REFERENCES public.sign_dictionary(id) ON DELETE CASCADE,
    notes TEXT,
    saved_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(user_id, sign_id)
);

-- 5. INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_recognition_history_user ON public.recognition_history(user_id, recognized_at DESC);
CREATE INDEX IF NOT EXISTS idx_saved_signs_user ON public.saved_signs(user_id);
CREATE INDEX IF NOT EXISTS idx_sign_dictionary_category ON public.sign_dictionary(category);
CREATE INDEX IF NOT EXISTS idx_sign_dictionary_label ON public.sign_dictionary(label);

-- 6. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sign_dictionary ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recognition_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_signs ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can view and update their own profile only
CREATE POLICY "Users can view their own profile" 
ON public.profiles FOR SELECT 
USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" 
ON public.profiles FOR UPDATE 
USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" 
ON public.profiles FOR INSERT 
WITH CHECK (auth.uid() = id);

-- Sign Dictionary: Publicly readable by everyone (authenticated and anonymous)
CREATE POLICY "Anyone can view verified sign dictionary entries" 
ON public.sign_dictionary FOR SELECT 
USING (true);

-- Sign Dictionary: Only service role / admin can insert, update, or delete
-- (No client insert/update/delete policy allows mutation)

-- Recognition History: Users can view, insert, and delete their own history only
CREATE POLICY "Users can view their own recognition history" 
ON public.recognition_history FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own recognition history" 
ON public.recognition_history FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own recognition history" 
ON public.recognition_history FOR DELETE 
USING (auth.uid() = user_id);

-- Saved Signs: Users can manage their own saved bookmarks only
CREATE POLICY "Users can view their own saved signs" 
ON public.saved_signs FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own saved signs" 
ON public.saved_signs FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own saved signs" 
ON public.saved_signs FOR DELETE 
USING (auth.uid() = user_id);

-- 7. TRIGGER: Automatically create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
