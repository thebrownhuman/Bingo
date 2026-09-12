import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';

// Mobile Safari/Chrome only apply `:active` styles at all when there's a
// touch listener registered on an ancestor — without one, tapping a button
// can leave it stuck showing its pressed/`:active` look until the next tap
// lands elsewhere. This dummy listener is the standard fix: it makes
// `:active` (and `:hover`) release normally on touchend everywhere in the app.
document.addEventListener('touchstart', () => {}, { passive: true });

bootstrapApplication(AppComponent, appConfig)
  .catch((err) => console.error(err));
