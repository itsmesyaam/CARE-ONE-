const { execSync } = require('child_process');

try {
  execSync(
    'npx.cmd esbuild design/patient/reference/entry.jsx --bundle --outfile=design/patient/reference/bundle.js --format=iife --define:process.env.NODE_ENV=\'"production"\'',
    { stdio: 'inherit' }
  );
  console.log('Successfully bundled design reference.');
} catch (e) {
  console.error(e);
  process.exit(1);
}
