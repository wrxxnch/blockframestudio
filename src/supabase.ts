import { createClient } from '@supabase/supabase-js';
import { ProjectItem, BlockFrameEntity } from './types';
import { PRESET_PROJECTS } from './presets';

// Read Supabase credentials dynamically
const SUPABASE_URL = (import.meta as any).env?.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '';

// Initialize client if credentials exist, otherwise log warning and run offline fallback
export const isSupabaseConfigured = SUPABASE_URL.length > 0 && SUPABASE_ANON_KEY.length > 0;

export const supabase = isSupabaseConfigured
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

// Local storage keys
const LOCAL_PROJECTS_KEY = 'blockframe_local_projects';

// Initialize local projects with defaults if empty
export function getLocalProjects(): ProjectItem[] {
  const stored = localStorage.getItem(LOCAL_PROJECTS_KEY);
  if (!stored) {
    localStorage.setItem(LOCAL_PROJECTS_KEY, JSON.stringify(PRESET_PROJECTS));
    return PRESET_PROJECTS;
  }
  try {
    return JSON.parse(stored);
  } catch (e) {
    return PRESET_PROJECTS;
  }
}

export function saveLocalProjects(projects: ProjectItem[]): void {
  localStorage.setItem(LOCAL_PROJECTS_KEY, JSON.stringify(projects));
}

// Fetch all public projects
export async function fetchProjects(): Promise<ProjectItem[]> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (data && data.length > 0) {
        return data as ProjectItem[];
      }
    } catch (e) {
      console.warn('Erro ao conectar ao Supabase. Usando armazenamento local:', e);
    }
  }

  // Fallback to local storage
  return getLocalProjects();
}

// Create or save a new project
export async function saveProject(project: Omit<ProjectItem, 'createdAt' | 'downloads' | 'likes'>): Promise<ProjectItem> {
  const newProject: ProjectItem = {
    ...project,
    createdAt: new Date().toISOString(),
    downloads: 0,
    likes: 0
  };

  if (isSupabaseConfigured && supabase) {
    try {
      // 1. Upload JSON representation to blockframe-json bucket
      const jsonBlob = new Blob([project.entitiesJson], { type: 'application/json' });
      const jsonFileName = `project_${project.id}.json`;
      
      const { error: uploadError } = await supabase.storage
        .from('blockframe-json')
        .upload(jsonFileName, jsonBlob, { upsert: true });

      let jsonUrl = '';
      if (!uploadError) {
        const { data: publicUrlData } = supabase.storage
          .from('blockframe-json')
          .getPublicUrl(jsonFileName);
        jsonUrl = publicUrlData?.publicUrl || '';
      }

      // 2. Insert metadata into database
      const { data, error } = await supabase
        .from('projects')
        .insert([
          {
            id: project.id,
            title: project.title,
            description: project.description,
            author: project.author,
            tags: project.tags,
            visibility: project.visibility,
            preview_url: project.preview_url,
            json_url: jsonUrl || project.json_url,
            block_count: project.blockCount,
            size_x: project.sizeX,
            size_y: project.sizeY,
            size_z: project.sizeZ,
            entities_json: project.entitiesJson,
          }
        ])
        .select();

      if (error) throw error;
      if (data && data[0]) {
        return data[0] as ProjectItem;
      }
    } catch (e) {
      console.warn('Erro ao salvar no Supabase. Salvando localmente:', e);
    }
  }

  // Fallback / Local Storage
  const localList = getLocalProjects();
  const existingIndex = localList.findIndex(p => p.id === project.id);
  
  if (existingIndex >= 0) {
    localList[existingIndex] = {
      ...localList[existingIndex],
      ...project,
      entitiesJson: project.entitiesJson,
    };
  } else {
    localList.unshift(newProject);
  }
  
  saveLocalProjects(localList);
  return newProject;
}

// Increment likes
export async function likeProject(projectId: string): Promise<number> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase.rpc('increment_likes', { project_id: projectId });
      if (!error && data) return Number(data);
    } catch (e) {
      console.warn('Erro ao curtir no Supabase:', e);
    }
  }

  // Local state update
  const localList = getLocalProjects();
  const index = localList.findIndex(p => p.id === projectId);
  if (index >= 0) {
    localList[index].likes = (localList[index].likes || 0) + 1;
    saveLocalProjects(localList);
    return localList[index].likes;
  }
  return 0;
}

// Increment downloads
export async function downloadProject(projectId: string): Promise<number> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase.rpc('increment_downloads', { project_id: projectId });
      if (!error && data) return Number(data);
    } catch (e) {
      console.warn('Erro ao registrar download no Supabase:', e);
    }
  }

  // Local state update
  const localList = getLocalProjects();
  const index = localList.findIndex(p => p.id === projectId);
  if (index >= 0) {
    localList[index].downloads = (localList[index].downloads || 0) + 1;
    saveLocalProjects(localList);
    return localList[index].downloads;
  }
  return 0;
}

// Delete project
export async function deleteProject(projectId: string): Promise<boolean> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', projectId);
      
      if (!error) return true;
    } catch (e) {
      console.warn('Erro ao deletar no Supabase:', e);
    }
  }

  // Local state
  const localList = getLocalProjects();
  const filtered = localList.filter(p => p.id !== projectId);
  saveLocalProjects(filtered);
  return true;
}

/**
 * SQL DDL Schema for reference and onboarding
 */
export const SUPABASE_SQL_SCHEMA = `
-- 1. Criação da Tabela de Projetos
CREATE TABLE IF NOT EXISTS public.projects (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    author TEXT DEFAULT 'Anonimo',
    tags TEXT[] DEFAULT '{}',
    visibility TEXT DEFAULT 'public',
    preview_url TEXT,
    json_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    downloads INTEGER DEFAULT 0 NOT NULL,
    likes INTEGER DEFAULT 0 NOT NULL,
    block_count INTEGER DEFAULT 0 NOT NULL,
    size_x INTEGER DEFAULT 1 NOT NULL,
    size_y INTEGER DEFAULT 1 NOT NULL,
    size_z INTEGER DEFAULT 1 NOT NULL,
    entities_json TEXT NOT NULL
);

-- 2. Habilitar políticas de acesso públicas (Rls - Row Level Security)
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Acesso de leitura público" ON public.projects
    FOR SELECT USING (true);

CREATE POLICY "Qualquer um pode postar novo projeto" ON public.projects
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Dono pode deletar ou modificar" ON public.projects
    FOR ALL USING (true);

-- 3. Funções para Incrementar Curtidas/Downloads de forma atômica
CREATE OR REPLACE FUNCTION public.increment_likes(project_id TEXT)
RETURNS integer AS $$
DECLARE
  new_likes integer;
BEGIN
  UPDATE public.projects
  SET likes = likes + 1
  WHERE id = project_id
  RETURNING likes INTO new_likes;
  
  RETURN new_likes;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.increment_downloads(project_id TEXT)
RETURNS integer AS $$
DECLARE
  new_downloads integer;
BEGIN
  UPDATE public.projects
  SET downloads = downloads + 1
  WHERE id = project_id
  RETURNING downloads INTO new_downloads;
  
  RETURN new_downloads;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
`;
