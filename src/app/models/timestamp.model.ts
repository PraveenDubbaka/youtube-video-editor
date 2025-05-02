export interface Timestamp {
  id: string;
  videoId: string;
  startTime: number;
  endTime: number;
  label: string;
  createdAt: Date;
}

export interface TimestampMarker {
  id: string;
  time: number;
  label: string;
}