# YouTube Video Editor

An Angular-based web application for editing YouTube videos, creating clips, adding effects, and creating merged compilations.

## Features

- **YouTube Video Import**: Import any YouTube video using its URL
- **Create Clips**: Cut clips from YouTube videos with precise timestamp markers
- **Add Effects**: Apply visual filters, transitions, text overlays, and audio effects to clips
- **Merge Videos**: Combine multiple clips into a single video
- **Download**: Export your edited videos in various formats (MP4, WebM, MOV)
- **Project Management**: Save and manage your video projects

## Technology Stack

- **Framework**: Angular 19.2+ (with standalone components)
- **UI Components**: Angular Material
- **State Management**: RxJS Behavior Subjects
- **Video Processing**: HTML5 Video API + custom video data URL handling
- **Authentication**: Simple user authentication system
- **Storage**: Local storage for video history and user data

## Getting Started

### Prerequisites

- Node.js (v18+)
- npm (v9+)
- Angular CLI

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/youtube-video-editor.git
cd youtube-video-editor
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
ng serve
```

4. Open your browser and navigate to:
```
http://localhost:4200/
```

## Usage

1. **Login/Register**: Create an account or login
2. **Dashboard**: View your saved projects or create a new one
3. **Video Editor**:
   - Enter a YouTube URL and project title
   - Use the editing tools to create clips, add markers, and apply effects
   - Merge clips into a final video
   - Download your creation

## Project Structure

```
youtube-editor-app/
  youtube-editor/
    src/
      app/
        components/              # UI Components
          dashboard/             # Project management dashboard
          login/                 # Authentication screens
          video-editor/          # Main video editing interface
            dialogs/             # Dialog components for editing operations
        material/                # Angular Material configuration
        models/                  # Data models
        services/                # Application services
          auth.service.ts        # Authentication logic
          history.service.ts     # Project history management
          video.service.ts       # Video processing operations
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the project
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- YouTube IFrame API for video playback
- Angular Material for UI components
- The open-source community for inspiration and solutions