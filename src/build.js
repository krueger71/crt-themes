let p = require('../package.json')
let tpl = require('./all-color-theme.json')
let crt = require('./crt.js');

let args = process.argv.slice(2);
let t = 'CRT ' + args[0];

const themes = p.config.themes;

// Create output
console.log(JSON.stringify(crt.crtTemplate(t, themes[t].type, themes[t].fg, themes[t].bg, themes[t].opacities, tpl), null, 2));
