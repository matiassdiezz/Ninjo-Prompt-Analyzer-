-- Ninjo Prompt Analyzer - Supabase Schema v3
-- Multi-agent architecture. Drops everything from v2.
-- Ejecutar en SQL Editor de Supabase

-- ============================================
-- FASE 1: LIMPIAR SCHEMA EXISTENTE
-- ============================================

-- Drop tables in dependency order (children first)
DROP TABLE IF EXISTS onboarding_progress CASCADE;
DROP TABLE IF EXISTS learning_votes CASCADE;
DROP TABLE IF EXISTS learning_comments CASCADE;
DROP TABLE IF EXISTS suggestion_decisions CASCADE;
DROP TABLE IF EXISTS knowledge_entries CASCADE;
DROP TABLE IF EXISTS prompt_versions CASCADE;
DROP TABLE IF EXISTS agents CASCADE;
DROP TABLE IF EXISTS projects CASCADE;
DROP TABLE IF EXISTS devices CASCADE;

-- Drop functions
DROP FUNCTION IF EXISTS update_updated_at() CASCADE;

-- Drop custom types
DROP TYPE IF EXISTS project_status CASCADE;

-- ============================================
-- FASE 2: TIPOS PERSONALIZADOS
-- ============================================

CREATE TYPE project_status AS ENUM (
  'en_proceso',
  'revision_cliente',
  'finalizado',
  'archivado'
);

-- ============================================
-- FASE 3: TABLAS
-- ============================================

-- Dispositivos (identifica cada instalación/browser)
CREATE TABLE devices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  device_fingerprint TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ DEFAULT NOW()
);

-- Proyectos (contenedor de agentes)
CREATE TABLE projects (
  id UUID PRIMARY KEY,
  device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  client_name TEXT,
  status project_status NOT NULL DEFAULT 'en_proceso',
  tags TEXT[] NOT NULL DEFAULT '{}',
  current_agent_id UUID,  -- FK agregada después de crear tabla agents
  shared_context TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Agentes (cada proyecto tiene N agentes)
CREATE TABLE agents (
  id UUID PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  channel_type TEXT NOT NULL DEFAULT 'instagram',
  description TEXT,
  current_prompt TEXT NOT NULL DEFAULT '',
  -- JSONB para datos que no necesitan modelado relacional
  annotations JSONB NOT NULL DEFAULT '[]',
  chat_messages JSONB NOT NULL DEFAULT '[]',
  flow_data JSONB,              -- { nodes: [], edges: [] } | null
  flow_source_origin JSONB,     -- { rawText, name, headerAnchor } | null
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- FK diferida: projects.current_agent_id -> agents.id
ALTER TABLE projects
  ADD CONSTRAINT fk_projects_current_agent
  FOREIGN KEY (current_agent_id) REFERENCES agents(id)
  ON DELETE SET NULL;

-- Versiones de prompts (por agente, no por proyecto)
CREATE TABLE prompt_versions (
  id UUID PRIMARY KEY,
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  label TEXT NOT NULL,
  parent_version_id UUID REFERENCES prompt_versions(id) ON DELETE SET NULL,
  changes JSONB NOT NULL DEFAULT '[]',
  change_type TEXT,       -- 'manual' | 'suggestion_applied' | 'auto_save'
  change_details JSONB,   -- { suggestionId?, category?, sectionTitle? }
  chat_history JSONB,     -- snapshot del chat al momento de la versión
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Entradas de conocimiento (memoria de Ninjo, scoped por device)
CREATE TABLE knowledge_entries (
  id UUID PRIMARY KEY,
  device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('pattern', 'anti_pattern')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  example TEXT,
  tags TEXT[] NOT NULL DEFAULT '{}',
  feedback_type TEXT,
  effectiveness TEXT NOT NULL DEFAULT 'medium'
    CHECK (effectiveness IN ('high', 'medium', 'low')),
  usage_count INTEGER NOT NULL DEFAULT 0,
  project_ids TEXT[] NOT NULL DEFAULT '{}',
  category TEXT,  -- KnowledgeCategory stored as text
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Decisiones de sugerencias (por proyecto)
CREATE TABLE suggestion_decisions (
  id UUID PRIMARY KEY,
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

-- ============================================
-- FASE 4: ÍNDICES
-- ============================================

CREATE INDEX idx_projects_device ON projects(device_id);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_agents_project ON agents(project_id);
CREATE INDEX idx_versions_agent ON prompt_versions(agent_id);
CREATE INDEX idx_versions_parent ON prompt_versions(parent_version_id);
CREATE INDEX idx_knowledge_device ON knowledge_entries(device_id);
CREATE INDEX idx_knowledge_tags ON knowledge_entries USING GIN(tags);
CREATE INDEX idx_knowledge_type ON knowledge_entries(type);
CREATE INDEX idx_knowledge_category ON knowledge_entries(category);
CREATE INDEX idx_decisions_device ON suggestion_decisions(device_id);
CREATE INDEX idx_decisions_project ON suggestion_decisions(project_id);

-- ============================================
-- FASE 5: ROW LEVEL SECURITY
-- ============================================

ALTER TABLE devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompt_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE suggestion_decisions ENABLE ROW LEVEL SECURITY;

-- Políticas permisivas (autenticación via device_id a nivel app)
CREATE POLICY "devices_all" ON devices FOR ALL USING (true);
CREATE POLICY "projects_all" ON projects FOR ALL USING (true);
CREATE POLICY "agents_all" ON agents FOR ALL USING (true);
CREATE POLICY "versions_all" ON prompt_versions FOR ALL USING (true);
CREATE POLICY "knowledge_all" ON knowledge_entries FOR ALL USING (true);
CREATE POLICY "decisions_all" ON suggestion_decisions FOR ALL USING (true);

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

CREATE TRIGGER agents_updated_at
  BEFORE UPDATE ON agents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER knowledge_updated_at
  BEFORE UPDATE ON knowledge_entries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
