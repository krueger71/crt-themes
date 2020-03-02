let p = require('../package.json')
let crt = require('./crt.js');

let args = process.argv.slice(2);
let t = 'CRT ' + args[0];

const themes = p.config.themes;

console.log(JSON.stringify(crt.crtThemplate(t, themes[t].type, themes[t].fg, themes[t].bg, themes[t].opacities), null, 2));
