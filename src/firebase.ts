import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  User
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  orderBy,
  limit,
  increment,
  onSnapshot,
  getDocFromServer
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import { ProjectItem } from './types';
import { PRESET_PROJECTS } from './presets';

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

// CRITICAL: Must pass firestoreDatabaseId from firebaseConfig
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export const isFirebaseConfigured = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);

// Test Firestore connection on app start as required by Firebase skill
export async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration or network connectivity.');
    }
  }
}
testConnection();

// Standardized Error Handler according to Firebase skill requirements
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Local Storage Fallback Keys
const LOCAL_PROJECTS_KEY = 'blockframe_local_projects';

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

// Auth Helpers
export async function signInWithGoogle(): Promise<User | null> {
  try {
    const res = await signInWithPopup(auth, googleProvider);
    return res.user;
  } catch (error) {
    console.error('Falha ao autenticar com Google:', error);
    throw error;
  }
}

export async function logOut(): Promise<void> {
  await signOut(auth);
}

// Fetch all public projects from Firestore
export async function fetchProjects(): Promise<ProjectItem[]> {
  const pathForGetDocs = 'projects';
  try {
    const q = query(
      collection(db, pathForGetDocs),
      where('visibility', '==', 'public'),
      limit(100)
    );
    const snap = await getDocs(q);
    if (!snap.empty) {
      const items: ProjectItem[] = [];
      snap.forEach(d => {
        items.push(d.data() as ProjectItem);
      });
      // Sort in memory by createdAt descending
      items.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      return items;
    }
  } catch (error) {
    console.warn('Erro ao buscar projetos no Firestore. Usando cache local:', error);
    // Don't crash UI, fall back to local projects
  }

  return getLocalProjects();
}

// Subscribe to real-time updates for public projects
export function subscribeProjects(
  onUpdate: (projects: ProjectItem[]) => void,
  onError?: (err: Error) => void
): () => void {
  const pathForOnSnapshot = 'projects';
  try {
    const q = query(
      collection(db, pathForOnSnapshot),
      where('visibility', '==', 'public'),
      limit(100)
    );

    return onSnapshot(
      q,
      (snapshot) => {
        const items: ProjectItem[] = [];
        snapshot.forEach(d => {
          items.push(d.data() as ProjectItem);
        });
        items.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
        onUpdate(items.length > 0 ? items : getLocalProjects());
      },
      (error) => {
        console.warn('Snapshot error on Firestore:', error);
        onError?.(error);
        handleFirestoreError(error, OperationType.GET, pathForOnSnapshot);
      }
    );
  } catch (error) {
    console.warn('Falha ao iniciar listener do Firestore:', error);
    onUpdate(getLocalProjects());
    return () => {};
  }
}

// Save or publish a project
export async function saveProject(
  project: Omit<ProjectItem, 'createdAt' | 'downloads' | 'likes'>,
  authorId?: string
): Promise<ProjectItem> {
  const now = new Date().toISOString();
  const newProject: ProjectItem = {
    ...project,
    authorId: authorId || auth.currentUser?.uid || undefined,
    createdAt: now,
    downloads: 0,
    likes: 0
  };

  const pathForWrite = 'projects';
  try {
    // Sanitize payload according to constraints in firebase-blueprint.json
    const payload: Record<string, any> = {
      id: newProject.id.slice(0, 128),
      title: newProject.title.slice(0, 100),
      author: newProject.author.slice(0, 64),
      visibility: newProject.visibility || 'public',
      blockCount: Math.max(0, Math.floor(newProject.blockCount || 0)),
      entitiesJson: newProject.entitiesJson.slice(0, 500000),
      likes: 0,
      downloads: 0,
      sizeX: Number(newProject.sizeX) || 1,
      sizeY: Number(newProject.sizeY) || 1,
      sizeZ: Number(newProject.sizeZ) || 1,
      createdAt: now,
      updatedAt: now
    };

    if (newProject.description) {
      payload.description = newProject.description.slice(0, 1000);
    }
    if (newProject.authorId) {
      payload.authorId = newProject.authorId;
    }
    if (newProject.tags && Array.isArray(newProject.tags)) {
      payload.tags = newProject.tags.slice(0, 15).map(t => String(t).slice(0, 30));
    }
    if (newProject.preview_url) {
      payload.preview_url = newProject.preview_url.slice(0, 5000);
    }
    if (newProject.json_url) {
      payload.json_url = newProject.json_url.slice(0, 1000);
    }

    await setDoc(doc(db, pathForWrite, newProject.id), payload);
  } catch (error) {
    console.warn('Erro ao salvar no Firestore. Salvando localmente:', error);
    try {
      handleFirestoreError(error, OperationType.CREATE, `${pathForWrite}/${newProject.id}`);
    } catch (_) {
      // Continue to local storage fallback
    }
  }

  // Update local storage backup
  const localList = getLocalProjects();
  const existingIdx = localList.findIndex(p => p.id === newProject.id);
  if (existingIdx >= 0) {
    localList[existingIdx] = { ...localList[existingIdx], ...newProject };
  } else {
    localList.unshift(newProject);
  }
  saveLocalProjects(localList);

  return newProject;
}

// Atomically increment likes
export async function likeProject(projectId: string): Promise<number> {
  const pathForWrite = `projects/${projectId}`;
  let updatedLikes = 0;

  try {
    const docRef = doc(db, 'projects', projectId);
    await updateDoc(docRef, {
      likes: increment(1)
    });

    const snap = await getDoc(docRef);
    if (snap.exists()) {
      updatedLikes = snap.data().likes || 0;
    }
  } catch (error) {
    console.warn('Erro ao curtir no Firestore:', error);
  }

  // Local fallback/sync
  const localList = getLocalProjects();
  const idx = localList.findIndex(p => p.id === projectId);
  if (idx >= 0) {
    localList[idx].likes = (localList[idx].likes || 0) + 1;
    saveLocalProjects(localList);
    return updatedLikes || localList[idx].likes;
  }

  return updatedLikes || 1;
}

// Atomically increment downloads
export async function downloadProject(projectId: string): Promise<number> {
  const pathForWrite = `projects/${projectId}`;
  let updatedDownloads = 0;

  try {
    const docRef = doc(db, 'projects', projectId);
    await updateDoc(docRef, {
      downloads: increment(1)
    });

    const snap = await getDoc(docRef);
    if (snap.exists()) {
      updatedDownloads = snap.data().downloads || 0;
    }
  } catch (error) {
    console.warn('Erro ao registrar download no Firestore:', error);
  }

  // Local fallback/sync
  const localList = getLocalProjects();
  const idx = localList.findIndex(p => p.id === projectId);
  if (idx >= 0) {
    localList[idx].downloads = (localList[idx].downloads || 0) + 1;
    saveLocalProjects(localList);
    return updatedDownloads || localList[idx].downloads;
  }

  return updatedDownloads || 1;
}

// Delete project
export async function deleteProject(projectId: string): Promise<boolean> {
  try {
    await deleteDoc(doc(db, 'projects', projectId));
  } catch (error) {
    console.warn('Erro ao deletar no Firestore:', error);
  }

  const localList = getLocalProjects();
  const filtered = localList.filter(p => p.id !== projectId);
  saveLocalProjects(filtered);
  return true;
}

// ==========================================
// Admin & Item Defaults Configuration System
// ==========================================

export const PRIMARY_OWNER_EMAIL = 'jeanpierreowner@gmail.com';

const LOCAL_ADMINS_KEY = 'blockframe_admin_list_v1';
const LOCAL_ITEM_DEFAULTS_KEY = 'blockframe_item_defaults_v1';

import { ItemDefaultConfig, AdminUser } from './types';

export function getLocalAdmins(): AdminUser[] {
  const stored = localStorage.getItem(LOCAL_ADMINS_KEY);
  if (!stored) {
    const initial: AdminUser[] = [
      {
        id: PRIMARY_OWNER_EMAIL,
        email: PRIMARY_OWNER_EMAIL,
        role: 'owner',
        createdAt: new Date().toISOString()
      }
    ];
    localStorage.setItem(LOCAL_ADMINS_KEY, JSON.stringify(initial));
    return initial;
  }
  try {
    const parsed: AdminUser[] = JSON.parse(stored);
    if (!parsed.some(a => a.email.toLowerCase() === PRIMARY_OWNER_EMAIL.toLowerCase())) {
      parsed.unshift({
        id: PRIMARY_OWNER_EMAIL,
        email: PRIMARY_OWNER_EMAIL,
        role: 'owner',
        createdAt: new Date().toISOString()
      });
      localStorage.setItem(LOCAL_ADMINS_KEY, JSON.stringify(parsed));
    }
    return parsed;
  } catch (e) {
    return [{ id: PRIMARY_OWNER_EMAIL, email: PRIMARY_OWNER_EMAIL, role: 'owner' }];
  }
}

export function saveLocalAdmins(admins: AdminUser[]): void {
  localStorage.setItem(LOCAL_ADMINS_KEY, JSON.stringify(admins));
}

export function getLocalItemDefaults(): Record<string, ItemDefaultConfig> {
  const stored = localStorage.getItem(LOCAL_ITEM_DEFAULTS_KEY);
  if (!stored) return {};
  try {
    return JSON.parse(stored);
  } catch (e) {
    return {};
  }
}

export function saveLocalItemDefaults(defaults: Record<string, ItemDefaultConfig>): void {
  localStorage.setItem(LOCAL_ITEM_DEFAULTS_KEY, JSON.stringify(defaults));
}

// Sanitize itemId for Firestore doc path
export function sanitizeItemId(itemId: string): string {
  return itemId.replace(/\//g, '__').replace(/\s+/g, '_');
}

// Fetch Admin users list
export async function fetchAdmins(): Promise<AdminUser[]> {
  const pathForGetDocs = 'admins';
  try {
    const snap = await getDocs(collection(db, pathForGetDocs));
    if (!snap.empty) {
      const items: AdminUser[] = [];
      snap.forEach(d => {
        items.push(d.data() as AdminUser);
      });
      // Ensure primary owner is always present
      if (!items.some(a => a.email.toLowerCase() === PRIMARY_OWNER_EMAIL.toLowerCase())) {
        items.unshift({
          id: PRIMARY_OWNER_EMAIL,
          email: PRIMARY_OWNER_EMAIL,
          role: 'owner',
          createdAt: new Date().toISOString()
        });
      }
      saveLocalAdmins(items);
      return items;
    }
  } catch (err) {
    console.warn('Usando lista local de administradores:', err);
  }
  return getLocalAdmins();
}

// Real-time listener for admins
export function subscribeAdmins(onUpdate: (admins: AdminUser[]) => void): () => void {
  const pathForOnSnapshot = 'admins';
  try {
    return onSnapshot(
      collection(db, pathForOnSnapshot),
      (snap) => {
        const items: AdminUser[] = [];
        snap.forEach(d => {
          items.push(d.data() as AdminUser);
        });
        if (!items.some(a => a.email.toLowerCase() === PRIMARY_OWNER_EMAIL.toLowerCase())) {
          items.unshift({
            id: PRIMARY_OWNER_EMAIL,
            email: PRIMARY_OWNER_EMAIL,
            role: 'owner',
            createdAt: new Date().toISOString()
          });
        }
        saveLocalAdmins(items);
        onUpdate(items);
      },
      (error) => {
        console.warn('Snapshot error on admins, falling back to local storage:', error);
        onUpdate(getLocalAdmins());
      }
    );
  } catch (err) {
    onUpdate(getLocalAdmins());
    return () => {};
  }
}

// Add an admin
export async function addAdminUser(email: string, addedBy: string): Promise<AdminUser> {
  const normalizedEmail = email.trim().toLowerCase();
  if (!auth.currentUser) {
    throw new Error('Você precisa fazer login com sua conta Google de administrador para adicionar novos admins.');
  }

  const newAdmin: AdminUser = {
    id: normalizedEmail,
    email: normalizedEmail,
    role: 'admin',
    addedBy: addedBy || auth.currentUser?.email || 'admin',
    createdAt: new Date().toISOString()
  };

  const pathForWrite = 'admins';
  try {
    await setDoc(doc(db, pathForWrite, normalizedEmail), newAdmin);
  } catch (err: any) {
    console.error('Erro ao salvar admin no Firestore:', err);
    throw new Error(err.message || 'Permissão negada ao cadastrar administrador no Firestore.');
  }

  const local = getLocalAdmins();
  if (!local.some(a => a.email.toLowerCase() === normalizedEmail)) {
    local.push(newAdmin);
    saveLocalAdmins(local);
  }
  return newAdmin;
}

// Remove an admin
export async function removeAdminUser(email: string): Promise<boolean> {
  const normalizedEmail = email.trim().toLowerCase();
  if (normalizedEmail === PRIMARY_OWNER_EMAIL.toLowerCase()) {
    throw new Error('O proprietário principal (jeanpierreowner@gmail.com) não pode ser removido.');
  }
  if (!auth.currentUser) {
    throw new Error('Você precisa fazer login com sua conta Google de administrador para remover admins.');
  }

  const pathForWrite = 'admins';
  try {
    await deleteDoc(doc(db, pathForWrite, normalizedEmail));
  } catch (err: any) {
    console.error('Erro ao remover admin no Firestore:', err);
    throw new Error(err.message || 'Permissão negada ao remover administrador no Firestore.');
  }

  const local = getLocalAdmins().filter(a => a.email.toLowerCase() !== normalizedEmail);
  saveLocalAdmins(local);
  return true;
}

// Fetch all item defaults
export async function fetchItemDefaults(): Promise<Record<string, ItemDefaultConfig>> {
  const pathForGetDocs = 'item_defaults';
  try {
    const snap = await getDocs(collection(db, pathForGetDocs));
    if (!snap.empty) {
      const result: Record<string, ItemDefaultConfig> = {};
      snap.forEach(d => {
        const data = d.data() as ItemDefaultConfig;
        if (data && data.itemId) {
          result[data.itemId] = data;
        }
      });
      saveLocalItemDefaults(result);
      return result;
    }
  } catch (err) {
    console.warn('Usando padrões de itens locais:', err);
  }
  return getLocalItemDefaults();
}

// Real-time subscribe to item defaults
export function subscribeItemDefaults(
  onUpdate: (defaults: Record<string, ItemDefaultConfig>) => void
): () => void {
  const pathForOnSnapshot = 'item_defaults';
  try {
    return onSnapshot(
      collection(db, pathForOnSnapshot),
      (snap) => {
        const result: Record<string, ItemDefaultConfig> = {};
        snap.forEach(d => {
          const data = d.data() as ItemDefaultConfig;
          if (data && data.itemId) {
            result[data.itemId] = data;
          }
        });
        saveLocalItemDefaults(result);
        onUpdate(result);
      },
      (error) => {
        console.warn('Snapshot error on item_defaults, using local storage:', error);
        onUpdate(getLocalItemDefaults());
      }
    );
  } catch (err) {
    onUpdate(getLocalItemDefaults());
    return () => {};
  }
}

// Save or update an item default property
export async function saveItemDefaultProperty(
  config: Omit<ItemDefaultConfig, 'updatedAt'>,
  updatedBy: string
): Promise<ItemDefaultConfig> {
  if (!auth.currentUser) {
    throw new Error('Você precisa fazer login com sua conta Google (jeanpierreowner@gmail.com) para salvar.');
  }

  const docId = sanitizeItemId(config.itemId);
  const now = new Date().toISOString();
  
  // Clean payload: Firestore strictly forbids `undefined` values!
  const payload: Record<string, any> = {
    id: docId,
    itemId: config.itemId,
    isNode: Boolean(config.isNode),
    scale: Number(config.scale) || 1.0,
    updatedBy: updatedBy || auth.currentUser?.email || PRIMARY_OWNER_EMAIL,
    updatedAt: now
  };

  if (config.image && typeof config.image === 'string' && config.image.trim()) {
    payload.image = config.image.trim();
  }
  if (config.label && typeof config.label === 'string' && config.label.trim()) {
    payload.label = config.label.trim();
  }

  const pathForWrite = 'item_defaults';
  try {
    await setDoc(doc(db, pathForWrite, docId), payload);
  } catch (err: any) {
    console.error('Erro ao salvar padrão de item no Firestore:', err);
    throw new Error(err.message || 'Permissão negada ao salvar configuração de item no Firestore.');
  }

  const result: ItemDefaultConfig = {
    id: docId,
    itemId: config.itemId,
    isNode: Boolean(config.isNode),
    scale: payload.scale,
    updatedBy: payload.updatedBy,
    updatedAt: now
  };
  if (payload.image) result.image = payload.image;
  if (payload.label) result.label = payload.label;

  const local = getLocalItemDefaults();
  local[config.itemId] = result;
  saveLocalItemDefaults(local);
  return result;
}

// Delete / reset an item default property
export async function deleteItemDefaultProperty(itemId: string): Promise<boolean> {
  if (!auth.currentUser) {
    throw new Error('Você precisa fazer login com sua conta Google (jeanpierreowner@gmail.com) para resetar o padrão.');
  }

  const docId = sanitizeItemId(itemId);
  const pathForWrite = 'item_defaults';
  try {
    await deleteDoc(doc(db, pathForWrite, docId));
  } catch (err: any) {
    console.error('Erro ao remover padrão no Firestore:', err);
    throw new Error(err.message || 'Permissão negada ao remover padrão do item no Firestore.');
  }

  const local = getLocalItemDefaults();
  delete local[itemId];
  saveLocalItemDefaults(local);
  return true;
}

