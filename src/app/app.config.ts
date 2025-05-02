import { ApplicationConfig, importProvidersFrom } from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { provideClientHydration } from '@angular/platform-browser';
import { provideAnimations } from '@angular/platform-browser/animations';
import { MatDialogModule } from '@angular/material/dialog';
import { provideHttpClient } from '@angular/common/http';
import { VideoService } from './services/video.service';
import { HistoryService } from './services/history.service';
import { APP_INITIALIZER } from '@angular/core';

// App initializer factory to set up service connections
function initializeApp(videoService: VideoService, historyService: HistoryService) {
  return () => {
    // Set VideoService in HistoryService
    historyService.setVideoService(videoService);
    console.log('Services initialized successfully');
    
    // Fix any placeholder URLs in history
    setTimeout(() => {
      videoService.fixPlaceholderUrlsInHistory();
    }, 100);
    
    return Promise.resolve();
  };
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideClientHydration(),
    provideAnimations(),
    provideHttpClient(),
    importProvidersFrom(MatDialogModule), // Use importProvidersFrom for NgModules
    VideoService,
    HistoryService,
    {
      provide: APP_INITIALIZER,
      useFactory: initializeApp,
      deps: [VideoService, HistoryService],
      multi: true
    }
  ]
};
