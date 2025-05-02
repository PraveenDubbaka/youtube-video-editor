import { Injectable, PLATFORM_ID, Inject } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { MergedVideo } from '../models/video.model';
import { v4 as uuidv4 } from 'uuid';
import { isPlatformBrowser } from '@angular/common';

@Injectable({
  providedIn: 'root'
})
export class HistoryService {
  private mergedVideosSubject = new BehaviorSubject<MergedVideo[]>([]);
  public mergedVideos$ = this.mergedVideosSubject.asObservable();
  private isBrowser: boolean;

  // Reference to VideoService
  private videoService: any;

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {
    this.isBrowser = isPlatformBrowser(this.platformId);
    
    // Load history from localStorage (only in browser)
    if (this.isBrowser) {
      const storedHistory = localStorage.getItem('videoHistory');
      if (storedHistory) {
        this.mergedVideosSubject.next(JSON.parse(storedHistory));
      }
    }
  }

  // Method to set the VideoService instance (avoids circular dependency)
  setVideoService(service: any): void {
    this.videoService = service;
  }

  // Method to get the VideoService instance
  getVideoService(): any {
    return this.videoService;
  }

  saveToHistory(mergedVideo: MergedVideo): void {
    const history = this.mergedVideosSubject.value;
    const updatedHistory = [...history, mergedVideo];
    
    // Save to localStorage (only in browser)
    if (this.isBrowser) {
      localStorage.setItem('videoHistory', JSON.stringify(updatedHistory));
    }
    this.mergedVideosSubject.next(updatedHistory);
  }

  getMergedVideos(): Observable<MergedVideo[]> {
    return this.mergedVideosSubject.asObservable();
  }

  // Get merged videos synchronously (for direct download)
  getMergedVideosSync(): MergedVideo[] {
    return this.mergedVideosSubject.value;
  }

  getMergedVideoById(id: string): Observable<MergedVideo | undefined> {
    const videos = this.mergedVideosSubject.value;
    const video = videos.find(v => v.id === id);
    return of(video);
  }

  deleteMergedVideo(id: string): void {
    const videos = this.mergedVideosSubject.value;
    const updatedVideos = videos.filter(v => v.id !== id);
    
    // Update localStorage (only in browser)
    if (this.isBrowser) {
      localStorage.setItem('videoHistory', JSON.stringify(updatedVideos));
    }
    this.mergedVideosSubject.next(updatedVideos);
  }

  clearHistory(): void {
    if (this.isBrowser) {
      localStorage.removeItem('videoHistory');
    }
    this.mergedVideosSubject.next([]);
  }

  // Update an existing video in history
  updateVideoInHistory(updatedVideo: MergedVideo): void {
    const videos = this.mergedVideosSubject.value;
    const updatedVideos = videos.map(video => 
      video.id === updatedVideo.id ? updatedVideo : video
    );
    
    // Save to localStorage (only in browser)
    if (this.isBrowser) {
      localStorage.setItem('videoHistory', JSON.stringify(updatedVideos));
    }
    this.mergedVideosSubject.next(updatedVideos);
    console.log('Updated video in history with ID:', updatedVideo.id);
  }
}
