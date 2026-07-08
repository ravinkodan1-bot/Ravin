-- Users and Roles
CREATE TYPE user_role AS ENUM ('SUPER_ADMIN', 'ADMIN', 'SALES', 'VIEWER');

CREATE TABLE users (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  role user_role DEFAULT 'VIEWER' NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Services
CREATE TABLE services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT NOT NULL,
  icon TEXT,
  banner_image TEXT,
  seo_title TEXT,
  seo_description TEXT,
  cta_text TEXT,
  is_published BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

-- Blogs
CREATE TABLE blogs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  content TEXT NOT NULL,
  excerpt TEXT,
  cover_image TEXT,
  category TEXT,
  tags TEXT[],
  seo_title TEXT,
  seo_description TEXT,
  is_published BOOLEAN DEFAULT false,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  author_id UUID REFERENCES users(id)
);

-- Case Studies
CREATE TABLE case_studies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  client_name TEXT NOT NULL,
  industry TEXT,
  client_logo TEXT,
  cover_image TEXT,
  gallery_images TEXT[],
  challenge TEXT,
  solution TEXT,
  technologies_used TEXT[],
  duration TEXT,
  before_state TEXT,
  after_state TEXT,
  results TEXT,
  roi TEXT,
  testimonial_text TEXT,
  tags TEXT[],
  seo_title TEXT,
  seo_description TEXT,
  is_published BOOLEAN DEFAULT false,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

-- Testimonials & Client Reviews
CREATE TABLE testimonials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_name TEXT NOT NULL,
  company TEXT,
  designation TEXT,
  photo TEXT,
  company_logo TEXT,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  review TEXT NOT NULL,
  video_url TEXT,
  status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
  source TEXT DEFAULT 'MANUAL' CHECK (source IN ('MANUAL', 'WEBSITE')),
  is_published BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  approved_by UUID REFERENCES users(id)
);

-- FAQs
CREATE TABLE faqs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  display_order INTEGER DEFAULT 0,
  category TEXT,
  is_published BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pricing
CREATE TABLE pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tier_name TEXT NOT NULL,
  price TEXT NOT NULL,
  description TEXT,
  features TEXT[],
  cta_text TEXT,
  cta_link TEXT,
  is_popular BOOLEAN DEFAULT false,
  display_order INTEGER DEFAULT 0,
  is_published BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Media Library (References to storage objects)
CREATE TABLE media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER,
  uploaded_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Settings
CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES users(id)
);

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE blogs ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_studies ENABLE ROW LEVEL SECURITY;
ALTER TABLE testimonials ENABLE ROW LEVEL SECURITY;
ALTER TABLE faqs ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE media ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Basic Policies (To be refined later based on auth implementation)
CREATE POLICY "Public Read Access" ON services FOR SELECT USING (is_published = true);
CREATE POLICY "Public Read Access" ON blogs FOR SELECT USING (is_published = true);
CREATE POLICY "Public Read Access" ON case_studies FOR SELECT USING (is_published = true);
CREATE POLICY "Public Read Access" ON testimonials FOR SELECT USING (is_published = true AND status = 'APPROVED');
CREATE POLICY "Public Read Access" ON faqs FOR SELECT USING (is_published = true);
CREATE POLICY "Public Read Access" ON pricing FOR SELECT USING (is_published = true);
CREATE POLICY "Public Read Access" ON media FOR SELECT USING (true);
CREATE POLICY "Public Read Access" ON settings FOR SELECT USING (true);

-- Functions and Triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_modtime BEFORE UPDATE ON users FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_services_modtime BEFORE UPDATE ON services FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_blogs_modtime BEFORE UPDATE ON blogs FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_case_studies_modtime BEFORE UPDATE ON case_studies FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_testimonials_modtime BEFORE UPDATE ON testimonials FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_faqs_modtime BEFORE UPDATE ON faqs FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_pricing_modtime BEFORE UPDATE ON pricing FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_settings_modtime BEFORE UPDATE ON settings FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();