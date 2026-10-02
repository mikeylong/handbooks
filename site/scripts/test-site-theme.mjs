import {toolkitModule} from './handbook-toolkit.mjs';
process.argv[2] = new URL('../output/site/', import.meta.url).pathname;
await toolkitModule('test-site-theme.mjs');
