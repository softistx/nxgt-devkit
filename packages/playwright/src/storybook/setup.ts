import { afterEach } from 'vitest';
import { capturePreview } from './capture';

// The setup file `storybookProject` adds to every Storybook project. The
// capture is a no-op unless that project was given `capture`.
afterEach(capturePreview);
