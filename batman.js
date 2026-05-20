const fs = require('fs');

const files = ['public/index.html', 'public/admin.html'];

const oldSvg = `<svg width="32" height="32" viewBox="0 0 32 32" fill="none">
      <polygon points="16,1 19,11 30,11 21,17 24,28 16,22 8,28 11,17 2,11 13,11" fill="none" stroke="#C9A84C" stroke-width="1.1"/>
      <circle cx="16" cy="15.5" r="2.5" fill="#C9A84C" opacity=".7"/>
    </svg>`;

const newSvg = `<svg width="32" height="32" viewBox="0 0 34 24" fill="var(--gold)">
      <path d="M34,8.5 c-3.5,0 -7,4.5 -8.5,8.5 c0,-5 -2,-12 -6.5,-16.5 c-0.5,2.5 -1,4 -2,4 c-1,0 -1.5,-1.5 -2,-4 c-4.5,4.5 -6.5,11.5 -6.5,16.5 c-1.5,-4 -5,-8.5 -8.5,-8.5 c3.5,6 8.5,14.5 17,14.5 c8.5,0 13.5,-8.5 17,-14.5 Z" />
    </svg>`;

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');

  // Replace font imports
  content = content.replace(/family=Cinzel\+Decorative:wght@700&family=Cinzel:wght@400;600/g, 'family=Rajdhani:wght@500;600;700');
  
  // Replace font usage
  content = content.replace(/'Cinzel Decorative',serif/g, "'Rajdhani',sans-serif");
  content = content.replace(/'Cinzel',serif/g, "'Rajdhani',sans-serif");

  // Replace CSS Variables
  const oldVars = `--gold:#C9A84C;--gold-l:#E8C96A;--gold-d:#8B6914;
  --bg:#0A0A0F;--bg2:#111118;--bg3:#1A1A24;--bg4:#22222F;
  --dim:#7A7A9A;--mid:#AAAAC0;--bright:#E8E8F0;
  --radius:6px;`;
  
  const newVars = `--gold:#F0D83A;--gold-l:#F5E364;--gold-d:#C4AD1D;
  --bg:#050505;--bg2:#0A0A0C;--bg3:#101014;--bg4:#16161A;
  --dim:#666677;--mid:#9999AA;--bright:#EAEAEA;
  --radius:3px;`;
  
  content = content.replace(oldVars, newVars);

  // Replace noise background with grid background
  const oldBg = `background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.035'/%3E%3C/svg%3E");`;
  const newBg = `background-image:url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 0h40v40H0V0zm20 20h20v20H20V20zM0 20h20v20H0V20z' fill='%23F0D83A' fill-opacity='0.015' fill-rule='evenodd'/%3E%3C/svg%3E");`;
  
  content = content.replace(oldBg, newBg);

  // Replace SVG
  content = content.replace(oldSvg, newSvg);

  fs.writeFileSync(file, content, 'utf8');
}
