export interface SessionData {
  id: string;
  title: string;
  started_at: number;
  ended_at: number;
  duration_sec: number;
  transcript: string;
  summary: string;       // JSON string: string[]
  action_items: string;  // JSON string: {task,owner,deadline}[]
  tags: string;          // JSON string: string[]
  created_at: number;
  audio_path?: string;   // path to {id}.webm
  utterances?: string;   // JSON: {speaker,text,start,end}[]
  speaker_map?: string;  // JSON: Record<string,string>
}

export interface Utterance {
  speaker: string;
  text: string;
  start: number; // ms
  end: number;   // ms
}

export interface DiarizationResult {
  transcript: string;
  utterances: Utterance[];
}

export interface ActionItem {
  task: string;
  owner: string;
  deadline: string;
}

export interface AISummaryResult {
  title: string;
  summary: string[];
  action_items: ActionItem[];
}

export interface LicenseStatus {
  type: 'trial' | 'licensed' | 'expired';
  sessionsUsed?: number;
  sessionsLimit?: number;
  daysLeft?: number;
}

declare global {
  interface Window {
    api: {
      // Database
      getSessions:    (limit?: number, offset?: number) => Promise<SessionData[]>;
      getSession:     (id: string) => Promise<SessionData | undefined>;
      searchSessions: (query: string) => Promise<SessionData[]>;
      deleteSession:  (id: string) => Promise<void>;
      saveSession:    (session: Omit<SessionData, 'id' | 'created_at'>) => Promise<SessionData>;
      updateSession:  (session: SessionData) => Promise<SessionData>;

      // Settings
      getSetting: (key: string) => Promise<string | null>;
      setSetting: (key: string, value: string) => Promise<void>;

      // AI
      generateSummary: (transcript: string, mode?: string) => Promise<AISummaryResult>;
      transcribeAudio: (audioData: ArrayBuffer, language: string) => Promise<DiarizationResult>;
      transcribeChunk: (audioData: ArrayBuffer, language: string) => Promise<string>;

      // Audio
      saveAudio: (sessionId: string, audioData: ArrayBuffer) => Promise<string>; // returns audio path

      // Files
      saveNote: (data: {
        title: string; date: number; duration_sec: number;
        summary: string[];
        action_items: { task: string; owner: string; deadline: string }[];
        transcript: string;
      }) => Promise<string>; // returns file path
      exportSession: (data: {
        title: string; date: number; duration_sec: number;
        summary: string[];
        action_items: { task: string; owner: string; deadline: string }[];
        transcript: string;
      }, format: 'txt' | 'md' | 'pdf' | 'docx') => Promise<string>; // returns file path

      // License
      getLicenseStatus: () => Promise<LicenseStatus>;
      activateLicense: (key: string) => Promise<{ success: boolean; error?: string }>;

      // Shell
      openExternal: (url: string) => Promise<void>;

      // Recording events
      onTranscriptChunk: (cb: (chunk: string) => void) => () => void;
    };
  }
}
