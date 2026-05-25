const fs = require('fs');

const files = ['public/index.html', 'public/admin.html'];

for (const file of files) {
  let c = fs.readFileSync(file, 'utf8');

  // Replace font links to Orbitron
  c = c.replace(/family=Rajdhani:wght@500;600;700/g, 'family=Orbitron:wght@500;700;900');
  
  // Replace font usage to Orbitron
  c = c.replace(/'Rajdhani',sans-serif/g, "'Orbitron',sans-serif");

  // Colors Update
  c = c.replace(/--gold:#F0D83A;--gold-l:#F5E364;--gold-d:#C4AD1D;/g, '--gold:#FFE81F;--gold-l:#FFFF55;--gold-d:#D4C000;');
  c = c.replace(/--bg:#050505;--bg2:#0B0B0E;--bg3:#121217;--bg4:#1A1A22;/g, '--bg:#000000;--bg2:#080808;--bg3:#111111;--bg4:#1A1A1A;');
  c = c.replace(/--dim:#6B6B80;--mid:#9595B2;--bright:#E6E6F0;/g, '--dim:#555555;--mid:#888888;--bright:#EAEAEA;');
  c = c.replace(/--radius:4px;/g, '--radius:0px;');

  // Background replacement
  const oldBgRegex = /body::before\{content:'';position:fixed;inset:0;[^}]+\}/s;
  const newBg = `body::before{content:'';position:fixed;inset:0;
  background: 
    radial-gradient(var(--bg2) 15%, transparent 16%) 0 0,
    radial-gradient(var(--bg2) 15%, transparent 16%) 4px 4px,
    radial-gradient(rgba(255,255,255,.03) 15%, transparent 20%) 0 1px,
    radial-gradient(rgba(255,255,255,.03) 15%, transparent 20%) 4px 5px;
  background-size:8px 8px; background-color:var(--bg);
  pointer-events:none;z-index:0;}`;
  c = c.replace(oldBgRegex, newBg);

  // Sub-branding
  c = c.replace(/<span class="logo-tag">Wallpaper Hosting<\/span>/g, '<span class="logo-tag">High Quality Wallpapers</span>');
  c = c.replace(/<span class="logo-tag">Vault Master<\/span>/g, '<span class="logo-tag">WAYNE TECH ADMIN</span>');

  // Clip Paths (Tactical edges)
  // Find card and add clip path
  c = c.replace(/\.wall-card\{position:relative;border-radius:var\(--radius\);/g, '.wall-card{position:relative;border-radius:0;clip-path:polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px);');
  
  // Buttons clip path
  c = c.replace(/\.btn\{font-family:/g, '.btn{clip-path:polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px);font-family:');
  c = c.replace(/\.card-btn\{flex:1;font-family:/g, '.card-btn{clip-path:polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px);flex:1;font-family:');
  c = c.replace(/\.page-btn\{font-family:/g, '.page-btn{clip-path:polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px);font-family:');
  c = c.replace(/\.btn-login\{width:100%;font-family:/g, '.btn-login{clip-path:polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px);width:100%;font-family:');
  c = c.replace(/\.btn-upload\{width:100%;font-family:/g, '.btn-upload{clip-path:polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px);width:100%;font-family:');
  c = c.replace(/\.lb-dl-btn\{width:100%;font-family:/g, '.lb-dl-btn{clip-path:polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px);width:100%;font-family:');

  // Modals clip path
  c = c.replace(/\.modal\{background:var\(--bg3\);border:1px solid rgba\(201,168,76,\.2\);border-radius:var\(--radius\);/g, '.modal{background:var(--bg3);border:1px solid rgba(255,232,31,.2);border-radius:0;clip-path:polygon(16px 0, 100% 0, 100% calc(100% - 16px), calc(100% - 16px) 100%, 0 100%, 0 16px);');
  c = c.replace(/\.lb-info\{width:260px;flex-shrink:0;background:var\(--bg3\);border:1px solid rgba\(255,255,255,\.07\);border-radius:var\(--radius\);/g, '.lb-info{width:260px;flex-shrink:0;background:var(--bg3);border:1px solid rgba(255,255,255,.07);border-radius:0;clip-path:polygon(16px 0, 100% 0, 100% calc(100% - 16px), calc(100% - 16px) 100%, 0 100%, 0 16px);');
  c = c.replace(/\.card\{ background: var\(--bg3\); border-radius: var\(--radius\);/g, '.card{ background: var(--bg3); border-radius: 0; clip-path: polygon(16px 0, 100% 0, 100% calc(100% - 16px), calc(100% - 16px) 100%, 0 100%, 0 16px);');

  // Inputs
  c = c.replace(/\.search-input\{width:100%;background:var\(--bg3\);border:1px solid rgba\(255,255,255,\.08\);border-radius:var\(--radius\);/g, '.search-input{width:100%;background:var(--bg3);border:1px solid rgba(255,255,255,.08);border-radius:0;clip-path:polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px);');

  // Scanning animation instead of shimmer
  const oldScan = /\.wall-card img\.loading\{background:linear-gradient\(110deg,var\(--bg3\) 30%,var\(--bg4\) 50%,var\(--bg3\) 70%\);\s*background-size:200% 100%;animation:scan 1\.2s infinite ease-in-out\}\s*@keyframes scan\{0%\{background-position:200% 0\}100%\{background-position:-200% 0\}\}/;
  const newScan = `.wall-card img.loading{background:linear-gradient(to bottom,transparent 0%,var(--gold) 50%,transparent 100%);background-size:100% 200%;animation:laserscan 1.2s infinite linear;opacity:0.3;}
@keyframes laserscan{0%{background-position:0 -100%}100%{background-position:0 200%}}`;
  if(oldScan.test(c)) c = c.replace(oldScan, newScan);

  // Spinner to radar
  const oldSpinner = /\.spinner\{width:32px;height:32px;border:2px solid rgba\(201,168,76,\.2\);border-top-color:var\(--gold\);\s*border-radius:50%;animation:spin \.7s linear infinite;margin:0 auto 1rem\}\s*@keyframes spin\{to\{transform:rotate\(360deg\)\}\}/;
  const newSpinner = `.spinner{width:40px;height:40px;border-radius:50%;background:conic-gradient(from 0deg, transparent 70%, var(--gold) 100%);animation:spin 1s linear infinite;margin:0 auto 1rem;position:relative}
.spinner::before{content:'';position:absolute;inset:2px;background:var(--bg);border-radius:50%}
@keyframes spin{to{transform:rotate(360deg)}}`;
  if(oldSpinner.test(c)) c = c.replace(oldSpinner, newSpinner);

  fs.writeFileSync(file, c, 'utf8');
}
