export interface Video {
  id: string;
  youtubeId: string;
  title: string;
  thumbnailUrl?: string;
  duration?: number;
  timestamps?: string[];
  createdAt: Date;
  userId: string;
}

export interface VideoClip {
  id: string;
  originalVideoId: string;
  startTime: number;
  endTime: number;
  title: string;
}

export interface MergedVideo {
  id: string;
  title: string;
  clips: VideoClip[];
  outputUrl?: string;
  createdAt: Date;
  userId: string;
  duration?: number; // Total duration in seconds
}