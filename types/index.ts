export interface Profile {
  id: string; // This is the user UUID
  display_name: string;
  age: number;
  bio?: string;
  photos: string[];
  interests: string[];
  location?: string;
  gender?: string;
  looking_for?: string;
  max_distance?: number;
  age_range_min?: number;
  age_range_max?: number;
  is_online?: boolean;
  last_seen_at?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Swipe {
  id: string;
  swiper_id: string;
  swiped_id: string;
  liked: boolean;
  created_at: string;
}

export interface Match {
  id: string;
  user1_id: string;
  user2_id: string;
  created_at: string;
  profile?: Profile;
  lastMessage?: Message;
  unreadCount?: number;
}

export interface Message {
  id: string;
  match_id: string;
  sender_id: string;
  content?: string;
  type: 'text' | 'image' | 'video' | 'audio' | 'file' | 'sticker';
  media_url?: string;
  metadata?: {
    duration?: number;
    fileName?: string;
    fileSize?: number;
    mimeType?: string;
    [key: string]: any;
  };
  reactions?: { [emoji: string]: string[] };
  reply_to?: string;
  reply_to_message?: {
    content: string;
    type: Message['type'];
    sender_id: string;
  };
  status: 'sent' | 'delivered' | 'read';
  created_at: string;
}

export interface Call {
  id: string;
  match_id: string;
  caller_id: string;
  receiver_id: string;
  call_type: 'voice' | 'video';
  status: 'calling' | 'active' | 'ended' | 'missed' | 'rejected';
  duration?: number;
  created_at: string;
  ended_at?: string;
  caller?: Profile;
  receiver?: Profile;
}
