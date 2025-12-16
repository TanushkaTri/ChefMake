const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export type VideoMode = "stream" | "link";

export interface MasterClass {
  id: number;
  title: string;
  description?: string;
  ingredients: string[];
  start_time: string;
  duration_minutes: number;
  video_mode: VideoMode;
  conference_url?: string;
  stream_call_id?: string;
  stream_call_template?: string;
  status: string;
  created_by: number;
  host_name?: string;
  host_email?: string;
}

interface CreateMasterClassPayload {
  title: string;
  description?: string;
  startTime: string;
  durationMinutes: number;
  ingredients: string[];
  videoMode: VideoMode;
  conferenceUrl?: string;
}

interface StreamJoinResponse {
  masterClass: MasterClass;
  videoMode: VideoMode;
  apiKey?: string;
  token?: string;
  callId?: string;
  callTemplate?: string;
  streamUser?: {
    id: string;
    name: string;
  };
  conferenceUrl?: string;
}

const request = async <T>(
  path: string,
  options: RequestInit,
  token: string
): Promise<T> => {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.message || "Не удалось выполнить запрос");
  }

  return response.json();
};

export interface MasterClassMessage {
  id: number;
  master_class_id: number;
  user_id: number;
  author_name?: string;
  message: string;
  created_at: string;
}

export const masterClassService = {
  async list(token: string, filter?: string): Promise<MasterClass[]> {
    const query = filter ? `?filter=${filter}` : "";
    const data = await request<{ items: MasterClass[] }>(
      `/api/master-classes${query}`,
      { method: "GET" },
      token
    );
    return data.items;
  },

  async create(payload: CreateMasterClassPayload, token: string) {
    return request<{ masterClass: MasterClass } & Partial<StreamJoinResponse>>(
      "/api/master-classes",
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
      token
    );
  },

  async join(masterClassId: number, token: string): Promise<StreamJoinResponse> {
    return request<StreamJoinResponse>(
      `/api/master-classes/${masterClassId}/token`,
      { method: "POST" },
      token
    );
  },

  async remove(masterClassId: number, token: string) {
    return request<{ message: string }>(
      `/api/master-classes/${masterClassId}`,
      { method: "DELETE" },
      token
    );
  },

  async getMessages(masterClassId: number, token: string) {
    const data = await request<{ items: MasterClassMessage[] }>(
      `/api/master-classes/${masterClassId}/messages`,
      { method: "GET" },
      token
    );
    return data.items;
  },

  async sendMessage(masterClassId: number, message: string, token: string) {
    return request<{ message: MasterClassMessage }>(
      `/api/master-classes/${masterClassId}/messages`,
      {
        method: "POST",
        body: JSON.stringify({ message }),
      },
      token
    );
  },
};

