import { bootstrapApplication } from '@angular/platform-browser';
import { init } from '@master/css';
import { appConfig } from './app/app.config';
import { App } from './app/app';

// Start the Master CSS runtime engine: it injects a stylesheet into <head> and
// observes the DOM, generating atomic styles from class names on the fly.
init();

bootstrapApplication(App, appConfig)
  .catch((err) => console.error(err));
