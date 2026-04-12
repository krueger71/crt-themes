let clr = [
  "black   ",
  "red     ",
  "green   ",
  "yellow  ",
  "blue    ",
  "magenta ",
  "cyan    ",
  "white   "
];

// Print the 16 foreground colors on the default background
let x = "";
for (let fg = 0; fg < 16; fg++) {
  x +=
    "\x1b[3" + (fg % 8) + (fg >= 8 ? ";1" : "") + "m" + clr[fg % 8] + "\x1b[m";
}
console.log("default : " + x);

// Print the 16 foreground colors on the 16 background colors
for (let bg = 0; bg < 16; bg++) {
  let s = "\x1b[4" + (bg % 8) + (bg >= 8 ? ";1" : "") + "m";
  for (let fg = 0; fg < 16; fg++) {
    s += "\x1b[3" + (fg % 8) + (fg >= 8 ? ";1" : "") + "m" + clr[fg % 8];
  }
  s += "\x1b[m";
  console.log(clr[bg % 8] + ": " + s);
}
