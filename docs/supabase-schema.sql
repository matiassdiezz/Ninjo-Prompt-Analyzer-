-- Ninjo Prompt Analyzer - Supabase Schema v2
-- IMPORTANTE: Este script hace DROP de todas las tablas existentes
-- Ejecutar en SQL Editor de Supabase

-- ============================================
-- FASE 1: LIMPIAR SCHEMA EXISTENTE
-- ============================================

-- Drop tables in dependency order (children first)
-- CASCADE will automatically drop triggers, indexes, and policies
DROP TABLE IF EXISTS onboarding_progress CASCADE;
DROP TABLE IF EXISTS learning_votes CASCADE;
DROP TABLE IF EXISTS learning_comments CASCADE;
DROP TABLE IF EXISTS suggestion_decisions CASCADE;
DROP TABLE IF EXISTS knowledge_entries CASCADE;
DROP TABLE IF EXISTS prompt_versions CASCADE;
DROP TABLE IF EXISTS projects CASCADE;
DROP TABLE IF EXISTS devices CASCADE;

-- Drop functions (after tables since triggers reference them)
DROP FUNCTION IF EXISTS update_updated_at() CASCADE;

-- Drop custom types if they exist
DROP TYPE IF EXISTS project_status CASCADE;

-- ============================================
-- FASE 2: CREAR TIPOS PERSONALIZADOS
-- ============================================

-- Enum nativo para status de proyectos (español, sin pérdida de información)
CREATE TYPE project_status AS ENUM (
  'en_proceso',
  'revision_cliente',
  'finalizado',
  'archivado'
);

-- ============================================
-- FASE 3: CREAR TABLAS
-- ============================================

-- Tabla de dispositivos (identifica cada instalación)
CREATE TABLE devices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  device_fingerprint TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de proyectos (usando enum nativo para status)
CREATE TABLE projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  client_name TEXT,
  status project_status NOT NULL DEFAULT 'en_proceso',
  current_prompt TEXT NOT NULL DEFAULT '',
  tags TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de versiones de prompts (con ON DELETE SET NULL para parent)
CREATE TABLE prompt_versions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  label TEXT NOT NULL,
  parent_version_id UUID REFERENCES prompt_versions(id) ON DELETE SET NULL,
  changes JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de entradas de conocimiento (memoria de Ninjo)
CREATE TABLE knowledge_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('pattern', 'anti_pattern')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  example TEXT,
  tags TEXT[] NOT NULL DEFAULT '{}',
  feedback_type TEXT,
  effectiveness TEXT NOT NULL DEFAULT 'medium' CHECK (effectiveness IN ('high', 'medium', 'low')),
  usage_count INTEGER NOT NULL DEFAULT 0,
  project_ids TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de decisiones de sugerencias (FK corregida a projects)
CREATE TABLE suggestion_decisions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  section_id TEXT NOT NULL,
  decision TEXT NOT NULL CHECK (decision IN ('accepted', 'rejected', 'modified')),
  justification TEXT NOT NULL,
  original_text TEXT NOT NULL,
  suggested_text TEXT NOT NULL,
  final_text TEXT,
  category TEXT NOT NULL,
  severity TEXT NOT NULL,
  saved_to_knowledge BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de comentarios en learnings (Fase 4: Colaboración)
CREATE TABLE learning_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  learning_id UUID NOT NULL REFERENCES knowledge_entries(id) ON DELETE CASCADE,
  device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  author_name TEXT,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de votos de efectividad (Fase 4: Colaboración)
CREATE TABLE learning_votes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  learning_id UUID NOT NULL REFERENCES knowledge_entries(id) ON DELETE CASCADE,
  device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  vote INTEGER NOT NULL CHECK (vote IN (-1, 1)),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(learning_id, device_id)
);

-- Tabla de progreso de onboarding (Fase 4: Colaboración)
CREATE TABLE onboarding_progress (
  device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  learning_id UUID NOT NULL REFERENCES knowledge_entries(id) ON DELETE CASCADE,
  marked_read BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMPTZ,
  PRIMARY KEY(device_id, learning_id)
);

-- ============================================
-- FASE 4: CREAR ÍNDICES
-- ============================================

CREATE INDEX idx_projects_device ON projects(device_id);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_versions_project ON prompt_versions(project_id);
CREATE INDEX idx_versions_parent ON prompt_versions(parent_version_id);
CREATE INDEX idx_knowledge_device ON knowledge_entries(device_id);
CREATE INDEX idx_knowledge_tags ON knowledge_entries USING GIN(tags);
CREATE INDEX idx_knowledge_type ON knowledge_entries(type);
CREATE INDEX idx_decisions_device ON suggestion_decisions(device_id);
CREATE INDEX idx_decisions_project ON suggestion_decisions(project_id);
CREATE INDEX idx_comments_learning ON learning_comments(learning_id);
CREATE INDEX idx_comments_device ON learning_comments(device_id);
CREATE INDEX idx_votes_learning ON learning_votes(learning_id);
CREATE INDEX idx_votes_device ON learning_votes(device_id);
CREATE INDEX idx_onboarding_device ON onboarding_progress(device_id);

-- ============================================
-- FASE 5: ROW LEVEL SECURITY
-- ============================================

ALTER TABLE devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompt_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE suggestion_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_progress ENABLE ROW LEVEL SECURITY;

-- Políticas permisivas para acceso anónimo (autenticación via device_id)
CREATE POLICY "devices_insert" ON devices FOR INSERT WITH CHECK (true);
CREATE POLICY "devices_select" ON devices FOR SELECT USING (true);
CREATE POLICY "devices_update" ON devices FOR UPDATE USING (true);

CREATE POLICY "projects_all" ON projects FOR ALL USING (true);
CREATE POLICY "versions_all" ON prompt_versions FOR ALL USING (true);
CREATE POLICY "knowledge_all" ON knowledge_entries FOR ALL USING (true);
CREATE POLICY "decisions_all" ON suggestion_decisions FOR ALL USING (true);
CREATE POLICY "comments_all" ON learning_comments FOR ALL USING (true);
CREATE POLICY "votes_all" ON learning_votes FOR ALL USING (true);
CREATE POLICY "onboarding_all" ON onboarding_progress FOR ALL USING (true);

-- ============================================
-- FASE 6: TRIGGERS
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER knowledge_updated_at
  BEFORE UPDATE ON knowledge_entries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER comments_updated_at
  BEFORE UPDATE ON learning_comments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
