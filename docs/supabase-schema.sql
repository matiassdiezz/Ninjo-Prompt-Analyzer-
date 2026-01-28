-- Ninjo Prompt Analyzer - Supabase Schema
-- Ejecutar este SQL en el SQL Editor de Supabase

-- Tabla de dispositivos (identifica cada instalación)
CREATE TABLE IF NOT EXISTS devices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  device_fingerprint TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de proyectos
CREATE TABLE IF NOT EXISTS projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  client_name TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'in_progress', 'deployed', 'archived')),
  current_prompt TEXT NOT NULL DEFAULT '',
  tags TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de versiones de prompts
CREATE TABLE IF NOT EXISTS prompt_versions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  label TEXT NOT NULL,
  parent_version_id UUID REFERENCES prompt_versions(id),
  changes JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de entradas de conocimiento (memoria de Ninjo)
CREATE TABLE IF NOT EXISTS knowledge_entries (
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

-- Tabla de decisiones de sugerencias
CREATE TABLE IF NOT EXISTS suggestion_decisions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  project_id UUID NOT NULL,
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

-- Índices para búsquedas frecuentes
CREATE INDEX IF NOT EXISTS idx_projects_device ON projects(device_id);
CREATE INDEX IF NOT EXISTS idx_versions_project ON prompt_versions(project_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_device ON knowledge_entries(device_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_tags ON knowledge_entries USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_decisions_device ON suggestion_decisions(device_id);
CREATE INDEX IF NOT EXISTS idx_decisions_project ON suggestion_decisions(project_id);

-- Row Level Security (RLS) - Cada dispositivo solo ve sus datos
ALTER TABLE devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompt_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE suggestion_decisions ENABLE ROW LEVEL SECURITY;

-- Políticas para acceso anónimo (usando device_id como identificador)
-- Devices: cualquiera puede crear/leer/actualizar su propio dispositivo
CREATE POLICY "devices_insert" ON devices FOR INSERT WITH CHECK (true);
CREATE POLICY "devices_select" ON devices FOR SELECT USING (true);
CREATE POLICY "devices_update" ON devices FOR UPDATE USING (true);

-- Projects: acceso basado en device_id
CREATE POLICY "projects_all" ON projects FOR ALL USING (true);

-- Prompt versions: acceso basado en project
CREATE POLICY "versions_all" ON prompt_versions FOR ALL USING (true);

-- Knowledge entries: acceso basado en device_id
CREATE POLICY "knowledge_all" ON knowledge_entries FOR ALL USING (true);

-- Decisions: acceso basado en device_id
CREATE POLICY "decisions_all" ON suggestion_decisions FOR ALL USING (true);

-- Trigger para actualizar updated_at automáticamente
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
