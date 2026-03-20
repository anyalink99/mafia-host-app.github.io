'use strict';
var fs = require('fs');
var path = require('path');
var root = path.join(__dirname, '..');
var www = path.join(root, 'www');
var dirs = ['css', 'js', 'icons', 'audio'];
var files = ['index.html', 'manifest.webmanifest', 'service-worker.js'];

if (fs.existsSync(www)) fs.rmSync(www, { recursive: true });
fs.mkdirSync(www, { recursive: true });

dirs.forEach(function (d) {
  var src = path.join(root, d);
  if (fs.existsSync(src)) fs.cpSync(src, path.join(www, d), { recursive: true });
});

files.forEach(function (f) {
  var from = path.join(root, f);
  if (!fs.existsSync(from)) {
    console.warn('skip missing:', f);
    return;
  }
  fs.copyFileSync(from, path.join(www, f));
});

console.log('Copied static assets to', www);
