export interface Project {
  id: string;
  name: string;
  description: string;
  tags: string[];
  liveUrl?: string;
  sourceUrl?: string;
}

export interface ExperienceEntry {
  id: string;
  dateRange: string;
  role: string;
  org: string;
  description: string;
}

export interface ProfileAssets {
  photoUrl?: string;
  resumeUrl?: string;
}

export interface ContactPayload {
  name: string;
  email: string;
  message: string;
}

export interface ContactMessage extends ContactPayload {
  id: string;
  receivedAt: string;
  isRead: boolean;
  handled: boolean;
}

export interface ContactResult {
  success: boolean;
  errors?: Partial<Record<keyof ContactPayload, string>>;
}
