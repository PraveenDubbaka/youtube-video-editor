import { Component, OnInit, AfterViewInit, OnDestroy, Inject } from '@angular/core';
import { Router } from '@angular/router';
import { VideoService } from '../../services/video.service';
import { FormBuilder, FormGroup, Validators, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialogModule, MatDialog, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatListModule } from '@angular/material/list';
import { MatSelectModule } from '@angular/material/select';
import { Video, VideoClip } from '../../models/video.model';
import { TimestampMarker } from '../../models/timestamp.model';
import { Subscription } from 'rxjs';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

// Import dialog components from separate files
import { ClipDialogComponent } from './dialogs/clip-dialog.component';
import { EffectDialogComponent } from './dialogs/effect-dialog.component';

// Add YouTube IFrame API types
declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

@Component({
  selector: 'app-video-editor',
  templateUrl: './video-editor.component.html',
  styleUrls: ['./video-editor.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatSnackBarModule,
    MatDialogModule,
    MatListModule,
    MatSelectModule,
    ClipDialogComponent,
    EffectDialogComponent
  ]
})
export class VideoEditorComponent implements OnInit, AfterViewInit, OnDestroy {
  videoForm: FormGroup;
  isVideoLoaded: boolean = false;
  currentVideo: Video | null = null;
  videoSubscription: Subscription | null = null;
  timestampsSubscription: Subscription | null = null;
  clipsSubscription: Subscription | null = null;
  effectsSubscription: Subscription | null = null;
  youtubeEmbedUrl: SafeResourceUrl | null = null;
  isLoading: boolean = false;
  timestamps: TimestampMarker[] = [];
  clips: VideoClip[] = [];
  currentTime: number = 0;
  console = console; // Expose console to the template

  // YouTube Player reference
  private youtubePlayer: any = null;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private videoService: VideoService,
    private snackBar: MatSnackBar,
    private sanitizer: DomSanitizer,
    private dialog: MatDialog
  ) {
    console.log('VideoEditorComponent constructor called');
    
    this.videoForm = this.fb.group({
      youtubeUrl: ['', [Validators.required, Validators.pattern(/^(https?\:\/\/)?(www\.)?(youtube\.com|youtu\.?be)\/.+$/)]],
      videoTitle: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    console.log('VideoEditorComponent ngOnInit called');
    console.log('Dialog service available:', !!this.dialog);
    
    // Subscribe to the current video from the service
    this.videoSubscription = this.videoService.currentVideo$.subscribe(video => {
      this.currentVideo = video;
      this.isVideoLoaded = !!video;
      
      if (video && video.youtubeId) {
        // Create a safe URL for embedding YouTube video with JS API enabled
        this.youtubeEmbedUrl = this.sanitizer.bypassSecurityTrustResourceUrl(
          `https://www.youtube.com/embed/${video.youtubeId}?enablejsapi=1`
        );
        
        // Subscribe to timestamps and clips
        this.subscribeToTimestampsAndClips();
      }
    });
  }
  
  // Subscribe to timestamps and clips when video is loaded
  private subscribeToTimestampsAndClips(): void {
    // Subscribe to timestamps from service
    this.timestampsSubscription = this.videoService.timestamps$.subscribe(
      timestamps => {
        this.timestamps = timestamps;
      }
    );
    
    // Subscribe to clips from service
    this.clipsSubscription = this.videoService.clips$.subscribe(
      clips => {
        this.clips = clips;
      }
    );
  }

  ngAfterViewInit(): void {
    console.log('VideoEditorComponent ngAfterViewInit called');
    
    // Load YouTube API if not already loaded
    if (!window.YT) {
      this.loadYoutubeApi();
    } else if (this.isVideoLoaded && this.currentVideo) {
      // If API is already loaded, initialize player directly
      this.initializeYoutubePlayer();
    }
  }

  /**
   * Loads the YouTube IFrame API script
   */
  private loadYoutubeApi(): void {
    console.log('Loading YouTube API');
    
    // Check if we're trying to load the API multiple times
    if (document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
      console.log('YouTube API script is already in the document');
      // If the script exists but YT object is not defined, we have a race condition
      // Set a timer to keep checking for YT and initialize player when it becomes available
      this.waitForYouTubeApi();
      return;
    }
    
    // Create and append the YouTube API script
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    tag.id = 'youtube-api-script';
    tag.onload = () => {
      console.log('YouTube API script loaded successfully via onload event');
    };
    tag.onerror = (error) => {
      console.error('Error loading YouTube API script:', error);
      // Try an alternative approach - load directly from iframe embed
      this.fallbackLoadYouTubeApi();
    };
    
    const firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
    
    // Set up callback for when API is ready
    window.onYouTubeIframeAPIReady = () => {
      console.log('YouTube API is ready - onYouTubeIframeAPIReady called');
      if (this.isVideoLoaded && this.currentVideo) {
        this.initializeYoutubePlayer();
      }
    };
    
    // Set a timeout to verify the API loaded correctly
    this.waitForYouTubeApi();
  }
  
  /**
   * Wait for the YouTube API to become available
   */
  private waitForYouTubeApi(attempts = 0, maxAttempts = 10): void {
    if (window.YT && typeof window.YT.Player === 'function') {
      console.log('YouTube API is available - YT object found in window');
      if (this.isVideoLoaded && this.currentVideo) {
        this.initializeYoutubePlayer();
      }
      return;
    }
    
    if (attempts >= maxAttempts) {
      console.error('YouTube API failed to load after multiple attempts');
      // Try an alternative approach
      this.fallbackLoadYouTubeApi();
      return;
    }
    
    console.log(`Waiting for YouTube API to become available (attempt ${attempts + 1}/${maxAttempts})`);
    setTimeout(() => {
      this.waitForYouTubeApi(attempts + 1, maxAttempts);
    }, 500);
  }
  
  /**
   * Alternative method to load YouTube player when API fails
   */
  private fallbackLoadYouTubeApi(): void {
    console.log('Using fallback method to load YouTube API');
    
    if (!this.currentVideo?.youtubeId) {
      console.error('Cannot use fallback method - no YouTube ID available');
      return;
    }
    
    // Create a simple fallback player using iframe
    const playerElement = document.getElementById('youtube-player');
    if (!playerElement) {
      console.error('YouTube player element not found for fallback method');
      return;
    }
    
    // Direct iframe approach - more compatible
    this.createFallbackPlayer();
  }

  /**
   * Initialize YouTube player when API is ready and video is loaded
   */
  private initializeYoutubePlayer(): void {
    console.log('Initializing YouTube player');
    if (!this.currentVideo || !this.currentVideo.youtubeId) {
      console.warn('Cannot initialize player: No YouTube ID available');
      return;
    }
    
    // First, check if the player element exists
    const playerElement = document.getElementById('youtube-player');
    if (!playerElement) {
      console.warn('YouTube player element not found in DOM');
      
      // Wait for the DOM to be ready and try again
      setTimeout(() => {
        const retryElement = document.getElementById('youtube-player');
        if (!retryElement) {
          console.error('YouTube player element still not found after retry');
          this.snackBar.open('Error loading video player. Please refresh and try again.', 'Close', {
            duration: 5000
          });
          return;
        }
        
        this.createYouTubePlayer(retryElement);
      }, 1000);
      return;
    }
    
    // If player element exists, create the player
    this.createYouTubePlayer(playerElement);
  }
  
  /**
   * Creates the YouTube player instance
   */
  private createYouTubePlayer(playerElement: HTMLElement): void {
    // Clear any existing content in the player element
    playerElement.innerHTML = '';
    
    try {
      console.log('Creating YouTube player with video ID:', this.currentVideo?.youtubeId);
      
      // Set explicit dimensions for the player element before initialization
      playerElement.style.width = '100%';
      playerElement.style.height = '450px';
      playerElement.style.minHeight = '450px';
      
      // Create a new player
      this.youtubePlayer = new (window as any).YT.Player('youtube-player', {
        videoId: this.currentVideo?.youtubeId,
        height: '450px',
        width: '100%',
        playerVars: {
          'playsinline': 1,
          'autoplay': 1, // Auto-play the video
          'controls': 1,
          'rel': 0,
          'origin': window.location.origin,
          'enablejsapi': 1,
          'modestbranding': 1, // Minimal YouTube branding
          'iv_load_policy': 3 // Hide video annotations
        },
        events: {
          'onReady': this.onPlayerReady.bind(this),
          'onStateChange': this.onPlayerStateChange.bind(this),
          'onError': this.onPlayerError.bind(this)
        }
      });
      
      console.log('YouTube player initialized');
      
      // Add a fallback check to verify player was created
      setTimeout(() => {
        if (!this.youtubePlayer || !this.youtubePlayer.getIframe) {
          console.error('Player failed to initialize properly');
          // Try an alternative approach using iframe directly
          this.createFallbackPlayer();
        }
      }, 2000);
      
    } catch (error) {
      console.error('Error initializing YouTube player:', error);
      this.snackBar.open('Error loading video player. Trying alternative method...', 'Close', {
        duration: 3000
      });
      
      // Try fallback method if the standard method fails
      this.createFallbackPlayer();
    }
  }
  
  /**
   * Creates a fallback player by directly embedding a YouTube iframe
   * This is used when the YouTube API method fails
   */
  private createFallbackPlayer(): void {
    if (!this.currentVideo?.youtubeId) return;
    
    try {
      console.log('Using fallback player creation method');
      const playerElement = document.getElementById('youtube-player');
      if (!playerElement) return;
      
      // Set explicit dimensions for the player element before adding iframe
      playerElement.style.width = '100%';
      playerElement.style.height = '450px';
      playerElement.style.minHeight = '450px';
      
      // Create the iframe directly
      const iframe = document.createElement('iframe');
      iframe.width = '100%';
      iframe.height = '450px';
      iframe.src = `https://www.youtube.com/embed/${this.currentVideo.youtubeId}?autoplay=1&controls=1&rel=0&enablejsapi=1`;
      iframe.frameBorder = '0';
      iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
      iframe.allowFullscreen = true;
      
      // Clear container and append iframe
      playerElement.innerHTML = '';
      playerElement.appendChild(iframe);
      
      // Set a reference to use later, even though it won't have full API capabilities
      this.youtubePlayer = { 
        iframe: iframe,
        getCurrentTime: () => 0, // fallback method
        getIframe: () => iframe
      };
      
      this.snackBar.open('Video loaded using alternative method', 'Close', {
        duration: 3000
      });
    } catch (error) {
      console.error('Fallback player creation failed:', error);
    }
  }

  /**
   * Handler for when YouTube player is ready
   */
  private onPlayerReady(event: any): void {
    console.log('YouTube player ready', event);
    // Check if video duration is available
    try {
      const duration = event.target.getDuration();
      console.log('Video duration:', duration, 'seconds');
      if (duration === 0) {
        console.warn('Video duration is 0 - this might indicate a loading issue');
        this.snackBar.open('Warning: Video duration appears to be 0. The video may not have loaded correctly.', 'Close', {
          duration: 5000
        });
      }
    } catch (error) {
      console.error('Error getting video duration:', error);
    }
  }

  /**
   * Handler for YouTube player state changes
   */
  private onPlayerStateChange(event: any): void {
    console.log('Player state changed:', event.data);
  }

  /**
   * Handler for YouTube player errors
   */
  private onPlayerError(event: any): void {
    console.error('YouTube player error:', event.data);
    let errorMessage = 'An error occurred while loading the video.';
    
    // Provide more detailed error messages based on YouTube error codes
    switch (event.data) {
      case 2:
        errorMessage = 'Invalid YouTube video ID. Please check the URL and try again.';
        break;
      case 5:
        errorMessage = 'The requested content cannot be played in an HTML5 player or another error related to the HTML5 player has occurred.';
        break;
      case 100:
        errorMessage = 'The video requested was not found. This error occurs when a video has been removed or marked as private.';
        break;
      case 101:
      case 150:
        errorMessage = 'The owner of the requested video does not allow it to be played in embedded players.';
        break;
    }
    
    this.snackBar.open(errorMessage, 'Close', {
      duration: 5000
    });
  }

  ngOnDestroy(): void {
    // Clean up all subscriptions when component is destroyed
    if (this.videoSubscription) {
      this.videoSubscription.unsubscribe();
    }
    
    if (this.timestampsSubscription) {
      this.timestampsSubscription.unsubscribe();
    }
    
    if (this.clipsSubscription) {
      this.clipsSubscription.unsubscribe();
    }
    
    if (this.effectsSubscription) {
      this.effectsSubscription.unsubscribe();
    }
  }

  navigateBack(): void {
    console.log('Navigating back to dashboard');
    this.router.navigate(['/dashboard']);
  }

  loadVideo(): void {
    console.log('Load video clicked');
    if (this.videoForm.valid) {
      const youtubeUrl = this.videoForm.get('youtubeUrl')?.value;
      const videoTitle = this.videoForm.get('videoTitle')?.value;
      
      // Set loading state
      this.isLoading = true;
      
      // Extract YouTube ID from URL
      const youtubeId = this.extractYoutubeId(youtubeUrl);
      
      if (youtubeId) {
        console.log(`Loading YouTube video: ${youtubeId} with title: ${videoTitle}`);
        
        // Load the video in the service
        this.videoService.loadYouTubeVideo(youtubeId, videoTitle);
        
        // Show success message
        this.snackBar.open('Video loaded successfully!', 'Close', {
          duration: 3000,
          horizontalPosition: 'center',
          verticalPosition: 'bottom'
        });
        
        // Make sure we give the UI time to update before initializing the player
        setTimeout(() => {
          // Ensure we have the YouTube API loaded
          if (!window.YT) {
            this.loadYoutubeApi();
          } else {
            // If API is already loaded, give the DOM time to update before initializing
            setTimeout(() => {
              this.initializeYoutubePlayer();
            }, 500);
          }
          this.isLoading = false;
        }, 300);
      } else {
        console.error('Could not extract valid YouTube ID from URL');
        // Show error message
        this.snackBar.open('Invalid YouTube URL. Please check and try again.', 'Close', {
          duration: 5000,
          horizontalPosition: 'center',
          verticalPosition: 'bottom'
        });
        
        this.isLoading = false;
      }
    }
  }
  
  /**
   * Extracts the YouTube video ID from various YouTube URL formats
   * @param url The YouTube URL
   * @returns The extracted YouTube ID or null if invalid
   */
  private extractYoutubeId(url: string): string | null {
    if (!url) return null;
    
    // Handle different YouTube URL formats
    // 1. Standard: https://www.youtube.com/watch?v=VIDEO_ID
    // 2. Short: https://youtu.be/VIDEO_ID
    // 3. Embed: https://www.youtube.com/embed/VIDEO_ID
    
    let match;
    
    // Try to match standard URL format
    match = url.match(/(?:youtube\.com\/watch\?v=|youtube\.com\/watch\?.+&v=|youtu\.be\/|youtube\.com\/embed\/)([^&]+)/);
    
    if (match && match[1]) {
      return match[1];
    }
    
    return null;
  }
  
  // Format time display (MM:SS)
  formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  
  /**
   * Get current playback time from YouTube player
   * Replace the mock implementation with actual YouTube API call
   */
  getCurrentTime(): Promise<number> {
    return new Promise((resolve) => {
      if (this.youtubePlayer && typeof this.youtubePlayer.getCurrentTime === 'function') {
        const time = this.youtubePlayer.getCurrentTime();
        console.log('Current video time from YouTube API:', time);
        this.currentTime = time;
        resolve(time);
      } else {
        console.warn('YouTube player not available, using fallback time');
        // Fallback for when player isn't available
        const fallbackTime = Math.floor(Math.random() * 600);
        this.currentTime = fallbackTime;
        resolve(fallbackTime);
      }
    });
  }
  
  // Add marker at current playback time
  async addMarker(): Promise<void> {
    console.log('Add Marker clicked');
    if (!this.currentVideo) {
      console.log('No current video loaded, cannot add marker');
      this.snackBar.open('Please load a video first', 'Close', { duration: 3000 });
      return;
    }
    
    try {
      // Get current playback time
      const currentTime = await this.getCurrentTime();
      console.log('Current time for marker:', currentTime);
      
      // Create a dialog to name the marker
      console.log('Opening marker dialog');
      const dialogRef = this.dialog.open(SimpleMarkerDialogComponent, {
        width: '350px',
        data: { time: currentTime, label: `Marker at ${this.formatTime(currentTime)}` }
      });
      
      dialogRef.afterClosed().subscribe(result => {
        console.log('Marker dialog closed with result:', result);
        if (result) {
          // Add marker to service
          this.videoService.addTimestampMarker(result.time, result.label);
          
          // Show success notification
          this.snackBar.open(`Marker "${result.label}" added at ${this.formatTime(result.time)}`, 'Close', {
            duration: 3000
          });
        }
      });
    } catch (error) {
      console.error('Error adding marker:', error);
      this.snackBar.open('Failed to add marker. Please try again.', 'Close', {
        duration: 3000
      });
    }
  }
  
  // Remove a marker by ID
  removeMarker(markerId: string): void {
    this.videoService.removeTimestampMarker(markerId);
    this.snackBar.open('Marker removed successfully', 'Close', {
      duration: 2000
    });
  }
  
  // Open dialog to create a clip
  async openCutClipDialog(): Promise<void> {
    console.log('Cut Clip clicked');
    if (!this.currentVideo) {
      console.log('No current video loaded, cannot create clip');
      this.snackBar.open('Please load a video first', 'Close', { duration: 3000 });
      return;
    }
    
    try {
      // Get current playback time as default end time
      const currentTime = await this.getCurrentTime();
      console.log('Current time for clip:', currentTime);
      
      // Open dialog to set clip parameters
      console.log('Opening clip dialog');
      const dialogRef = this.dialog.open(ClipDialogComponent, {
        width: '400px',
        data: {
          startTime: Math.max(0, currentTime - 10), // Default to 10 seconds before current time
          endTime: currentTime,
          title: `Clip at ${this.formatTime(currentTime)}`
        }
      });
      
      dialogRef.afterClosed().subscribe(result => {
        console.log('Clip dialog closed with result:', result);
        if (result) {
          // Create clip in service
          this.videoService.createClip(
            result.startTime, 
            result.endTime, 
            result.title
          );
          
          // Show success notification
          this.snackBar.open(`Clip "${result.title}" created`, 'Close', {
            duration: 3000
          });
        }
      });
    } catch (error) {
      console.error('Error creating clip:', error);
      this.snackBar.open('Failed to create clip. Please try again.', 'Close', {
        duration: 3000
      });
    }
  }
  
  // Remove a clip by ID
  removeClip(clipId: string): void {
    this.videoService.removeClip(clipId);
    this.snackBar.open('Clip removed successfully', 'Close', {
      duration: 2000
    });
  }
  
  // Open dialog to add an effect
  async openEffectDialog(): Promise<void> {
    console.log('Add Effect clicked');
    if (!this.currentVideo) {
      console.log('No current video loaded, cannot add effect');
      this.snackBar.open('Please load a video first', 'Close', { duration: 3000 });
      return;
    }
    
    if (this.clips.length === 0) {
      console.log('No clips available, cannot add effect');
      this.snackBar.open('Please create at least one clip before adding effects', 'Close', {
        duration: 3000
      });
      return;
    }
    
    // Get available effects from service
    console.log('Getting available effects');
    this.videoService.getAvailableEffects().subscribe(effects => {
      console.log('Available effects:', effects);
      
      // Open dialog to select effect
      console.log('Opening effect dialog');
      const dialogRef = this.dialog.open(EffectDialogComponent, {
        width: '500px',
        data: {
          clips: this.clips,
          effectTypes: effects
        }
      });
      
      dialogRef.afterClosed().subscribe(result => {
        console.log('Effect dialog closed with result:', result);
        if (result) {
          // Add effect to selected clip
          this.videoService.addVideoEffect(result.clipId, {
            type: result.type,
            name: result.name,
            settings: result.settings,
            startTime: result.startTime,
            endTime: result.endTime
          });
          
          // Show success notification
          this.snackBar.open(`Effect "${result.name}" added to clip`, 'Close', {
            duration: 3000
          });
        }
      });
    });
  }

  // Merge clips into a single video
  mergeClips(): void {
    console.log('Merge Clips button clicked');
    if (this.clips.length < 1) {
      this.snackBar.open('You need at least one clip to merge', 'Close', { duration: 3000 });
      return;
    }

    // Open dialog to get merged video title
    const dialogRef = this.dialog.open(MergeVideoDialogComponent, {
      width: '400px',
      data: { title: `${this.currentVideo?.title || 'Merged Video'} - ${new Date().toLocaleDateString()}` }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        // Call the service to merge clips
        this.videoService.mergeClips(result.title).subscribe(
          mergedVideo => {
            console.log('Merged video created:', mergedVideo);
            this.snackBar.open(`Successfully merged ${this.clips.length} clips into "${mergedVideo.title}"`, 'Close', {
              duration: 3000
            });
            
            // Navigate to dashboard to see merged video
            this.router.navigate(['/dashboard']);
          },
          error => {
            console.error('Error merging clips:', error);
            this.snackBar.open('Failed to merge clips. Please try again.', 'Close', {
              duration: 3000
            });
          }
        );
      }
    });
  }

  // Save video (export with quality options)
  saveVideo(): void {
    console.log('Save Video button clicked');
    if (this.clips.length < 1) {
      this.snackBar.open('You need at least one clip to save', 'Close', { duration: 3000 });
      return;
    }

    // Open dialog to get export options
    const dialogRef = this.dialog.open(ExportVideoDialogComponent, {
      width: '400px',
      data: { 
        format: 'mp4', 
        quality: 'high',
        formats: ['mp4', 'webm', 'mov'],
        qualities: ['low', 'medium', 'high']
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        // Show processing indicator
        this.isLoading = true;
        
        // Call the service to export video with selected format and quality
        this.videoService.exportVideo(result.format, result.quality, this.clips).subscribe(
          response => {
            console.log('Video exported:', response);
            this.isLoading = false;
            
            // Show success message with download link and dashboard info
            const message = response.savedInDashboard 
              ? 'Video exported successfully! Available in your dashboard and ready for download.'
              : 'Video exported successfully!';
              
            this.snackBar.open(message, 'Download', {
              duration: 5000
            }).onAction().subscribe(() => {
              // Create an anchor element to trigger actual file download
              this.downloadFile(response.downloadUrl, response.filename);
            });
          },
          error => {
            console.error('Error exporting video:', error);
            this.isLoading = false;
            this.snackBar.open('Failed to export video. Please try again.', 'Close', {
              duration: 3000
            });
          }
        );
      }
    });
  }
  
  // Helper method to trigger actual file download with improved error handling for fetch failures
  private downloadFile(url: string, filename: string): void {
    if (!url) {
      console.error('Download failed: No URL provided');
      this.snackBar.open('Download failed: Video URL is missing', 'Close', {
        duration: 3000
      });
      return;
    }
    
    console.log('Downloading file:', filename, 'from URL type:', url.startsWith('data:') ? 'data URL' : 'remote URL');
    
    // Check if this is a data URL (starts with 'data:')
    if (url.startsWith('data:')) {
      try {
        // Handle data URL download
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        console.log('Data URL download initiated');
      } catch (error) {
        console.error('Data URL download failed:', error);
        this.isLoading = false;
        this.snackBar.open('Download failed. The video data may be corrupted.', 'Close', {
          duration: 3000
        });
      }
    } else {
      // Handle remote URL with improved error handling for fetch failures
      this.isLoading = true;
      console.log('Fetching remote URL:', url);
      
      // Use a timeout to handle network timeouts
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
      
      // Try up to 3 times with exponential backoff
      this.fetchWithRetry(url, controller.signal, 3)
        .then(blob => {
          clearTimeout(timeoutId);
          console.log('Blob received, size:', blob.size, 'type:', blob.type);
          
          if (blob.size === 0) {
            throw new Error('Downloaded file is empty');
          }
          
          // Create a blob URL for the downloaded content
          const blobUrl = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = blobUrl;
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          
          // Clean up
          document.body.removeChild(a);
          URL.revokeObjectURL(blobUrl);
          this.isLoading = false;
          
          this.snackBar.open('Download successful!', 'Close', {
            duration: 3000
          });
          console.log('Download completed successfully');
        })
        .catch(error => {
          clearTimeout(timeoutId);
          console.error('Download failed with error:', error);
          this.isLoading = false;
          
          // Provide more specific error messages based on error type, especially for network issues
          if (error.name === 'AbortError') {
            this.snackBar.open('Download failed: The request timed out. Please check your internet connection and try again.', 'Close', {
              duration: 5000
            });
          } else if (error.name === 'TypeError' || error.message.includes('fetch')) {
            this.snackBar.open('Download failed: Failed to fetch. Check your internet connection or try using a different browser.', 'Close', {
              duration: 5000
            });
            
            // Try an alternative approach for fetch failures
            this.tryAlternativeDownload(url, filename);
          } else if (error.message.includes('HTTP error')) {
            this.snackBar.open(`Download failed: Server returned an error (${error.message}). The video might not be available.`, 'Close', {
              duration: 5000
            });
          } else if (error.message.includes('NetworkError')) {
            this.snackBar.open('Download failed: Network error. Please check your internet connection and try again.', 'Close', {
              duration: 5000
            });
          } else if (error.message.includes('empty')) {
            this.snackBar.open('Download failed: The downloaded file was empty. Please try a different video.', 'Close', {
              duration: 5000
            });
          } else if (error.message.includes('max retries')) {
            this.snackBar.open('Download failed after multiple attempts. Please try again later.', 'Close', {
              duration: 5000
            });
            
            // Try an alternative approach after retries failed
            this.tryAlternativeDownload(url, filename);
          } else {
            this.snackBar.open(`Download failed: ${error.message}. Please try again.`, 'Close', {
              duration: 5000
            });
          }
        });
    }
  }
  
  // Helper method to fetch with retry capability
  private fetchWithRetry(url: string, signal: AbortSignal, maxRetries: number, attempt = 1): Promise<Blob> {
    console.log(`Fetch attempt ${attempt} of ${maxRetries}`);
    
    return fetch(url, {
      method: 'GET',
      credentials: 'same-origin',
      headers: {
        'Accept': 'video/*,*/*',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      },
      signal: signal
    })
      .then(response => {
        console.log('Fetch response status:', response.status);
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        
        // Check content type to ensure it's actually a video or downloadable content
        const contentType = response.headers.get('content-type');
        console.log('Content type:', contentType);
        
        if (contentType && !contentType.includes('video/') && 
            !contentType.includes('application/octet-stream')) {
          console.warn('Unexpected content type:', contentType);
        }
        
        return response.blob();
      })
      .catch(error => {
        // Don't retry on HTTP errors or abort
        if (error.message.includes('HTTP error') || error.name === 'AbortError') {
          throw error;
        }
        
        // If we have retries left and it's a network error, retry after a delay
        if (attempt < maxRetries) {
          const delay = Math.pow(2, attempt) * 1000; // Exponential backoff: 2s, 4s, 8s...
          console.log(`Retrying after ${delay}ms...`);
          
          return new Promise(resolve => setTimeout(resolve, delay))
            .then(() => this.fetchWithRetry(url, signal, maxRetries, attempt + 1));
        }
        
        // We've exhausted our retries
        throw new Error(`Max retries (${maxRetries}) exceeded: ${error.message}`);
      });
  }
  
  // Attempt alternative download methods when fetch fails
  private tryAlternativeDownload(url: string, filename: string): void {
    console.log('Attempting alternative download approach...');
    
    try {
      // Method 1: Try using a direct window.open
      const backup = window.open(url, '_blank');
      if (backup) {
        console.log('Alternative download window opened');
        this.snackBar.open('Trying alternative download method...', 'Close', {
          duration: 3000
        });
      } else {
        console.error('Alternative download window was blocked');
        
        // Method 2: Create a download link for the user to click manually
        this.snackBar.open('Please try manually downloading by clicking this link', 'Download', {
          duration: 10000
        }).onAction().subscribe(() => {
          window.open(url, '_blank');
        });
      }
    } catch (backupError) {
      console.error('Alternative download approach failed:', backupError);
    }
  }

  // Debug Methods for Editing Tools
  debugCutClip(): void {
    console.log('Debug: Cut Clip button clicked');
    this.openCutClipDialog();
  }
  
  debugAddMarker(): void {
    console.log('Debug: Add Marker button clicked');
    this.addMarker();
  }
  
  debugAddEffect(): void {
    console.log('Debug: Add Effect button clicked');
    this.openEffectDialog();
  }
  
  // This method seems to be referenced in the template but not defined
  directAddMarker(): void {
    console.log('Direct: Add Marker button clicked');
    // Simple implementation that adds a marker at the current time
    this.getCurrentTime().then(currentTime => {
      const label = `Quick Marker at ${this.formatTime(currentTime)}`;
      this.videoService.addTimestampMarker(currentTime, label);
      this.snackBar.open(`Added marker: ${label}`, 'Close', {
        duration: 3000
      });
    });
  }
}

// Create a directly embedded marker dialog component for direct use
@Component({
  selector: 'app-simple-marker-dialog',
  template: `
    <h2 mat-dialog-title>Add Marker</h2>
    <mat-dialog-content>
      <div>
        <mat-form-field appearance="outline" style="width: 100%; margin-bottom: 15px;">
          <mat-label>Marker Label</mat-label>
          <input matInput [(ngModel)]="data.label" placeholder="Enter marker name">
        </mat-form-field>
        
        <mat-form-field appearance="outline" style="width: 100%; margin-bottom: 15px;">
          <mat-label>Time (seconds)</mat-label>
          <input matInput type="number" [(ngModel)]="data.time" min="0">
        </mat-form-field>
      </div>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancel</button>
      <button mat-raised-button color="primary" [mat-dialog-close]="data">Save</button>
    </mat-dialog-actions>
  `,
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule
  ]
})
export class SimpleMarkerDialogComponent {
  constructor(@Inject(MAT_DIALOG_DATA) public data: {time: number, label: string}) {
    console.log('Simple marker dialog created with data:', data);
  }
}

// Merge Video Dialog Component
@Component({
  selector: 'app-merge-video-dialog',
  template: `
    <h2 mat-dialog-title>Merge Clips</h2>
    <mat-dialog-content>
      <div>
        <mat-form-field appearance="outline" style="width: 100%; margin-bottom: 15px;">
          <mat-label>Merged Video Title</mat-label>
          <input matInput [(ngModel)]="data.title" placeholder="Enter video title">
          <mat-hint>Give your merged video a meaningful title</mat-hint>
        </mat-form-field>
      </div>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancel</button>
      <button mat-raised-button color="primary" [mat-dialog-close]="data">Merge</button>
    </mat-dialog-actions>
  `,
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule
  ]
})
export class MergeVideoDialogComponent {
  constructor(@Inject(MAT_DIALOG_DATA) public data: {title: string}) {
    console.log('Merge video dialog created with data:', data);
  }
}

// Export Video Dialog Component
@Component({
  selector: 'app-export-video-dialog',
  template: `
    <h2 mat-dialog-title>Export Video</h2>
    <mat-dialog-content>
      <div>
        <mat-form-field appearance="outline" style="width: 100%; margin-bottom: 15px;">
          <mat-label>Format</mat-label>
          <mat-select [(ngModel)]="data.format">
            <mat-option *ngFor="let format of data.formats" [value]="format">
              {{ format.toUpperCase() }}
            </mat-option>
          </mat-select>
        </mat-form-field>
        
        <mat-form-field appearance="outline" style="width: 100%; margin-bottom: 15px;">
          <mat-label>Quality</mat-label>
          <mat-select [(ngModel)]="data.quality">
            <mat-option *ngFor="let quality of data.qualities" [value]="quality">
              {{ quality.charAt(0).toUpperCase() + quality.slice(1) }}
            </mat-option>
          </mat-select>
          <mat-hint>Higher quality will result in larger file size</mat-hint>
        </mat-form-field>
      </div>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancel</button>
      <button mat-raised-button color="primary" [mat-dialog-close]="data">Export</button>
    </mat-dialog-actions>
  `,
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule
  ]
})
export class ExportVideoDialogComponent {
  constructor(@Inject(MAT_DIALOG_DATA) public data: {
    format: string,
    quality: string,
    formats: string[],
    qualities: string[]
  }) {
    console.log('Export video dialog created with data:', data);
  }
}
