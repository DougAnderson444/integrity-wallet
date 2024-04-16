import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';
import { loadEnv } from 'vite';
import fs from 'fs';
import { encode } from '@stablelib/base64';

const devBase = 'http://localhost:4175';

let index = fs.readFileSync('./inner-app/dist/index.html', 'utf-8');
const template = fs.readFileSync('./inner-app/template.js', 'utf-8');
// replace backticks and ${} with escaped versions
index = index.replace(/`/g, '\\`').replace(/\$\{/g, '\\${');

const innerApp = template.replace('%%index%%', index);

const name = 'innerApp.js';
const dirName = 'inner-app';

// delete static/innerApp.js if it exists
if (fs.existsSync(`static/${name}`)) {
	fs.unlinkSync(`static/${name}`);
}

fs.writeFileSync(`static/${name}`, innerApp);
// also copy over files, create the dir and files if they don't exist
const assets = fs.readdirSync(`./${dirName}/dist/assets`);
if (!fs.existsSync('static/assets')) {
	fs.mkdirSync('static/assets');
}

// delete the destination assets if they exist
fs.readdirSync('static/assets').forEach((file) => {
	fs.unlinkSync(`static/assets/${file}`);
});

assets.forEach((asset) => {
	fs.copyFileSync(`./${dirName}/dist/assets/${asset}`, `static/assets/${asset}`);
});

export default defineConfig(({ command, mode }) => {
	let base;
	const env = loadEnv(mode, process.cwd(), '');

	if (command == 'serve') {
		base = devBase;
	} else {
		base = env.VITE_BASE || devBase;
	}

	// add the base to the urls in static/innerApp.js tags
	// so that the innerApp can load the correct urls
	const innerAppPath = `static/${name}`;
	console.log('Writing innerApp.js', innerApp);
	let innerAppFile = fs.readFileSync(innerAppPath, 'utf-8');
	innerAppFile = innerAppFile.replace(/"\/assets\//g, `"${base}/assets/`);
	fs.writeFileSync(innerAppPath, innerAppFile);

	return {
		plugins: [sveltekit()],
		test: {
			include: ['src/**/*.{test,spec}.{js,ts}']
		},
		server: {
			origin: base,
			fs: {
				strict: false
			}
		}
	};
});
