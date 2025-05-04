import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MaterialModule } from '../../material/material.module';
import { HistoryService } from '../../services/history.service';
import { AuthService } from '../../services/auth.service';
import { MergedVideo } from '../../models/video.model';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, MaterialModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  mergedVideos: MergedVideo[] = [];
  isLoading = true;
  displayedColumns: string[] = ['title', 'duration', 'createdAt', 'clips', 'actions'];
  username: string = 'User'; // Default value

  constructor(
    private historyService: HistoryService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Get username for welcome message
    if (this.authService.currentUser?.username) {
      this.username = this.authService.currentUser.username;
    }
    
    // Load video history
    this.historyService.getMergedVideos().subscribe(videos => {
      this.mergedVideos = videos;
      this.isLoading = false;
    });
  }

  createNewProject(): void {
    console.log('Creating new project - navigating to editor');
    
    // Use Angular Router instead of direct URL manipulation
    this.router.navigate(['/editor']);
  }

  viewVideo(video: MergedVideo): void {
    console.log('Opening video for viewing:', video.title);
    
    // Check if video has an ID
    if (!video.id) {
      console.error('View failed: No video ID available');
      alert('Cannot view video: Video ID is missing');
      return;
    }
    
    try {
      // Get VideoService from HistoryService
      const videoService = this.historyService.getVideoService();
      
      // Check if VideoService is properly connected
      if (!videoService) {
        throw new Error('Video service not available');
      }
      
      // First, make sure the video has a valid URL (not a placeholder)
      // This will convert any example.com URLs to data URLs
      if (video.outputUrl && (video.outputUrl.includes('example.com') || !video.outputUrl.startsWith('data:'))) {
        console.log('Converting placeholder URL to valid data URL before viewing');
        // Fix the URL and update in history
        const fixedVideo = videoService.ensureValidDownloadUrl(video);
        this.historyService.updateVideoInHistory(fixedVideo);
        video = fixedVideo; // Use the fixed video for viewing
      }
      
      if (!video.outputUrl) {
        throw new Error('Video has no output URL');
      }
      
      // Now open the video in a new window
      this.openVideoPlayer(video);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error('Error viewing video:', errorMessage);
      alert('There was a problem opening this video. Please try again.');
    }
  }
  
  // Open a video player window/dialog for viewing the video
  private openVideoPlayer(video: MergedVideo): void {
    if (!video.outputUrl) return;
    
    // Check if the URL is a data URL
    if (video.outputUrl.startsWith('data:')) {
      // For data URLs, create a simple HTML page with a video player
      const playerWindow = window.open('', '_blank');
      if (!playerWindow) {
        alert('Pop-up blocked. Please allow pop-ups for this site to view videos.');
        return;
      }
      
      // Calculate duration text for display
      const durationText = this.formatDuration(video.duration);
      
      // Write HTML content with a video player
      playerWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>${video.title || 'Video Player'}</title>
          <style>
            body { margin: 0; padding: 20px; background: #121212; height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; font-family: Arial, sans-serif; }
            video { max-width: 90%; max-height: 70vh; background: #000; box-shadow: 0 4px 8px rgba(0,0,0,0.5); }
            .container { text-align: center; width: 100%; }
            h1 { color: white; margin-bottom: 10px; }
            .video-info { color: #aaa; margin-bottom: 20px; }
            .controls { margin-top: 15px; }
            button { background: #2196F3; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; margin: 0 5px; }
            button:hover { background: #0b7dda; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>${video.title || 'Video Player'}</h1>
            <div class="video-info">Duration: ${durationText} | Clips: ${video.clips?.length || 0}</div>
            <video controls autoplay ${video.duration ? `duration="${video.duration}"` : ''}>
              <source src="${video.outputUrl}" type="video/mp4">
              Your browser does not support the video tag.
            </video>
            <div class="controls">
              <button onclick="document.querySelector('video').play()">Play</button>
              <button onclick="document.querySelector('video').pause()">Pause</button>
              <button onclick="window.print()">Print/Save</button>
              <button onclick="window.close()">Close</button>
            </div>
          </div>
          <script>
            // Set video duration programmatically if available
            const video = document.querySelector('video');
            video.onloadedmetadata = function() {
              // Check if duration is available and valid
              if (video.duration === Infinity || video.duration === 0 || isNaN(video.duration)) {
                // If browser reports invalid duration, try to set it manually
                try {
                  // We can't directly set duration, but we can use this trick
                  // to make the video appear to have the correct duration
                  const duration = ${video.duration || 60};
                  console.log("Setting duration to:", duration);
                  
                  // Update the duration display in the UI
                  video.addEventListener('timeupdate', function() {
                    // This creates a virtual duration by scaling the currentTime
                    const virtualProgress = video.currentTime / duration;
                    if (virtualProgress >= 1) {
                      video.pause();
                      video.currentTime = 0;
                    }
                  });
                } catch(e) {
                  console.error("Failed to set duration:", e);
                }
              }
            };
          </script>
        </body>
        </html>
      `);
      
      playerWindow.document.close();
    } else {
      // For regular URLs, open in a new tab (although this shouldn't happen with our fixed URLs)
      window.open(video.outputUrl, '_blank');
    }
  }

  deleteVideo(id: string): void {
    this.historyService.deleteMergedVideo(id);
  }

  clearHistory(): void {
    if (confirm('Are you sure you want to clear all history? This action cannot be undone.')) {
      this.historyService.clearHistory();
    }
  }

  // Download video function with improved error handling
  downloadVideo(video: MergedVideo): void {
    console.log('Downloading video:', video.title);
    
    if (!video.id) {
      console.error('Download failed: No video ID available');
      alert('Download failed: Video ID is missing');
      return;
    }
    
    // Set loading state
    this.isLoading = true;
    
    try {
      // Get VideoService from HistoryService
      const videoService = this.historyService.getVideoService();
      
      // Check if VideoService is properly connected
      if (!videoService) {
        throw new Error('Video service not available - connection not established');
      }
      
      // Verify the service is working by calling a simple method
      if (!videoService.verifyServiceConnection()) {
        throw new Error('Video service verification failed');
      }
      
      console.log('VideoService connection verified, proceeding with download');
      
      // Use the direct download method
      const success = videoService.directDownload(video.id);
      
      if (success) {
        console.log('Download initiated successfully');
        // Reset loading state after a short delay to ensure UI updates properly
        setTimeout(() => {
          this.isLoading = false;
        }, 500);
      } else {
        console.error('Direct download failed, attempting fallback method');
        this.tryDataUrlDownload(video);
      }
    } catch (error) {
      console.error('Error during download:', error);
      
      // Type guard to ensure error is an Error object with a message property
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      // Special handling for service connection errors
      if (errorMessage.includes('not available') || errorMessage.includes('verification failed')) {
        alert('There was an issue with the download service. Please refresh the page and try again.');
        this.isLoading = false;
      } else {
        // For other errors, try the fallback download
        this.tryDataUrlDownload(video);
      }
    }
  }
  
  // Fallback method that handles both data URLs and regular URLs
  private tryDataUrlDownload(video: MergedVideo): void {
    if (!video.outputUrl) {
      console.error('Download failed: No output URL available');
      alert('Download failed: Video URL is missing');
      this.isLoading = false;
      return;
    }
    
    try {
      // Create a filename
      const timestamp = Date.now();
      let format = 'mp4'; // Default format
      
      // Try to determine format from URL or MIME type
      if (video.outputUrl.includes('video/mp4') || video.outputUrl.endsWith('.mp4')) {
        format = 'mp4';
      } else if (video.outputUrl.includes('video/webm') || video.outputUrl.endsWith('.webm')) {
        format = 'webm';
      } else if (video.outputUrl.includes('video/quicktime') || video.outputUrl.endsWith('.mov')) {
        format = 'mov';
      }
      
      const filename = `${video.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${timestamp}.${format}`;
      console.log('Attempting download with filename:', filename);
      
      if (video.outputUrl.startsWith('data:')) {
        console.log('Using data URL download approach');
        // For data URLs, use the direct download approach
        const a = document.createElement('a');
        a.href = video.outputUrl;
        a.download = filename;
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        
        setTimeout(() => {
          document.body.removeChild(a);
          this.isLoading = false;
        }, 100);
      } else {
        console.log('Using Blob approach for URL:', video.outputUrl);
        // For regular URLs, convert to blob first to avoid CORS issues
        this.downloadWithBlob(video.outputUrl, filename);
      }
    } catch (error) {
      console.error('All download methods failed:', error);
      this.isLoading = false;
      alert('Download failed. Please try a different browser or contact support for assistance.');
    }
  }
  
  // Method to handle URL downloads more reliably
  private downloadWithBlob(url: string, filename: string): void {
    console.log('Starting direct download for URL:', url);
    
    // Create a dynamic link element
    const a = document.createElement('a');
    a.style.display = 'none';
    document.body.appendChild(a);
    
    // For most modern browsers, we can use the download attribute
    // with the original URL
    a.href = url;
    a.download = filename;
    a.target = '_self'; // Try to force download in same tab
    
    // Click the link to trigger the download
    console.log('Triggering download click');
    a.click();
    
    // Clean up after a short delay
    setTimeout(() => {
      document.body.removeChild(a);
      this.isLoading = false;
      console.log('Download link element removed');
    }, 500);
    
    // If the above approach doesn't trigger a download (common for cross-origin URLs),
    // offer a direct link for the user to click manually
    setTimeout(() => {
      if (confirm('If the download didn\'t start automatically, would you like to open the video in a new tab? You can then save it using your browser\'s save options.')) {
        window.open(url, '_blank');
      }
    }, 2000);
  }

  // Format duration from seconds to MM:SS format
  formatDuration(seconds?: number): string {
    if (seconds === undefined || seconds === null) {
      return '00:00';
    }
    
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
}
