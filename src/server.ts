import { APP_BASE_HREF } from '@angular/common';
import {
  renderApplication,
  ɵSERVER_CONTEXT
} from '@angular/platform-server';
import express from 'express';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import bootstrap from './main.server';

// The Express app is exported so that it can be used by serverless Functions.
export function app(): express.Express {
  const server = express();
  const serverDistFolder = dirname(fileURLToPath(import.meta.url));
  const browserDistFolder = resolve(serverDistFolder, '../browser');
  const indexHtml = join(serverDistFolder, 'index.server.html');

  server.set('view engine', 'html');
  server.set('views', browserDistFolder);

  // Example Express Rest API endpoints
  // server.get('/api/**', (req, res) => { });
  
  // Serve static files from /browser
  server.get('*.*', express.static(browserDistFolder, {
    maxAge: '1y'
  }));

  // All regular routes use the Angular engine
  server.get('*', (req, res, next) => {
    const { protocol, originalUrl, baseUrl, headers } = req;
    
    // Read the index.html template
    const document = readFileSync(indexHtml, 'utf-8');
    const url = `${protocol}://${headers.host}${originalUrl}`;

    // Render the app
    renderApplication(bootstrap, {
      document,
      url,
      platformProviders: [
        { provide: APP_BASE_HREF, useValue: baseUrl },
        { provide: ɵSERVER_CONTEXT, useValue: 'ssr' }
      ]
    }).then(html => {
      res.status(200).send(html);
    }).catch(err => {
      console.error('Error during rendering:', err);
      res.status(500).send('Server error');
      next(err);
    });
  });

  return server;
}

function run(): void {
  const port = process.env['PORT'] || 4000;

  // Start up the Node server
  const server = app();
  server.listen(port, () => {
    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

// Start the server if this module is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  run();
}
