export interface Board {
  id: string;
  title: string;
  facilitator_id: string;
  is_blurred: boolean;
  timer_ends_at: string | null;
  created_at: string;
  description?: string;
}

export interface Column {
  id: string;
  board_id: string;
  title: string;
  position: number;
  color_hex: string;
  created_at: string;
}

export interface Card {
  id: string;
  column_id: string;
  board_id: string;
  author_id: string;
  author_name?: string;
  content: string;
  position: number;
  created_at: string;
  votes_count?: number;
  has_voted?: boolean;
}

export interface CursorState {
  user_id: string;
  user_name: string;
  avatar_url?: string;
  x: number;
  y: number;
  color: string;
  last_active: number;
}

