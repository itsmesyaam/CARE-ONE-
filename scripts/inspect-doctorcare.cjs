const fs = require('node:fs');

const content = fs.readFileSync('C:/Users/bella/Downloads/DoctorCare Home Page – Home — desktop.html', 'utf8');
const manifestMatch = content.match(/<script type="__bundler\/manifest">([\s\S]*?)<\/script>/);
const templateMatch = content.match(/<script type="__bundler\/template">([\s\S]*?)<\/script>/);

console.log('Manifest match:', !!manifestMatch);
console.log('Template match:', !!templateMatch);

if (manifestMatch) {
  const manifest = JSON.parse(manifestMatch[1]);
  console.log('Manifest keys:', Object.keys(manifest));
  for (const k of Object.keys(manifest)) {
    console.log(k, manifest[k].mime, manifest[k].compressed);
  }
}

if (templateMatch) {
  const tmpl = JSON.parse(templateMatch[1]);
  console.log('Template length:', tmpl.length);
  fs.writeFileSync('scripts/extracted-template.html', tmpl);
  console.log('Wrote scripts/extracted-template.html (bytes:', tmpl.length, ')');
}
