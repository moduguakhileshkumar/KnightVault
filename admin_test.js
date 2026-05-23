
const API = '';
let adminPw = '';
let editId = null;
let upTagsArr = [];
let editTagsArr = [];
let upCatsArr = [];
let editCatsArr = [];
let allTagsList = [];
let allCatsList = [];
let autoFocusIndex = -1;
let catAutoFocusIndex = -1;

async function loadAllTags() {
  try {
    const r = await fetch('/api/tags');
    allTagsList = await r.json();
  } catch(e) {}
}

async function loadCategories() {
  try {
    const r = await fetch('/api/categories');
    const cats = await r.json();
    allCatsList = cats.map(c => c.name);
  } catch(e) {}
}

function renderCats(prefix) {
  const wrap = document.getElementById(prefix + 'CatWrap');
  const input = document.getElementById(prefix + 'Cat');
  wrap.querySelectorAll('.tag-chip').forEach(el => el.remove());
  const arr = prefix === 'up' ? upCatsArr : editCatsArr;
  arr.forEach(cat => {
    const chip = document.createElement('div');
    chip.className = 'tag-chip';
    chip.innerHTML = `${esc(cat)} <button type="button" onclick="removeCategory('${esc(cat)}', '${prefix}'); event.stopPropagation();">✕</button>`;
    wrap.insertBefore(chip, input);
  });
}

function addCategory(cat, prefix) {
  cat = cat.trim().toLowerCase();
  if(!cat) return;
  const arr = prefix === 'up' ? upCatsArr : editCatsArr;
  if(!arr.includes(cat)) {
    arr.push(cat);
    if(!allCatsList.includes(cat)) allCatsList.push(cat);
    renderCats(prefix);
  }
  closeCatAutocomplete(prefix);
}

function removeCategory(cat, prefix) {
  if(prefix === 'up') upCatsArr = upCatsArr.filter(c => c !== cat);
  else editCatsArr = editCatsArr.filter(c => c !== cat);
  renderCats(prefix);
}

function renderTags(prefix) {
  const wrap = document.getElementById(prefix + 'TagWrap');
  const input = document.getElementById(prefix + 'TagInput');
  const arr = prefix === 'up' ? upTagsArr : editTagsArr;
  
  wrap.querySelectorAll('.tag-chip').forEach(el => el.remove());
  
  arr.forEach(tag => {
    const chip = document.createElement('div');
    chip.className = 'tag-chip';
    chip.innerHTML = `${esc(tag)} <button type="button" onclick="removeTag('${esc(tag)}', '${prefix}'); event.stopPropagation();">✕</button>`;
    wrap.insertBefore(chip, input);
  });
}

function addTag(tag, prefix) {
  tag = tag.trim().toLowerCase();
  if(!tag) return;
  const arr = prefix === 'up' ? upTagsArr : editTagsArr;
  if(!arr.includes(tag)) {
    arr.push(tag);
    if(!allTagsList.includes(tag)) allTagsList.push(tag);
    renderTags(prefix);
  }
  closeAutocomplete(prefix);
}

function removeTag(tag, prefix) {
  if(prefix === 'up') upTagsArr = upTagsArr.filter(t => t !== tag);
  else editTagsArr = editTagsArr.filter(t => t !== tag);
  renderTags(prefix);
}

function showAutocomplete(e, prefix) {
  const input = e.target;
  const list = document.getElementById(prefix + 'TagAuto');
  const val = input.value.trim().toLowerCase();
  
  autoFocusIndex = -1;
  list.innerHTML = '';
  
  if(!val) {
    list.style.display = 'none';
    return;
  }
  
  const arr = prefix === 'up' ? upTagsArr : editTagsArr;
  const matches = allTagsList.filter(t => t.includes(val) && !arr.includes(t)).slice(0, 8);
  
  let hasExact = false;
  
  matches.forEach((m) => {
    if(m === val) hasExact = true;
    const li = document.createElement('li');
    li.className = 'autocomplete-item';
    li.textContent = m;
    li.onmousedown = (ev) => { ev.preventDefault(); addTag(m, prefix); };
    list.appendChild(li);
  });
  
  if(!hasExact && !arr.includes(val)) {
    const li = document.createElement('li');
    li.className = 'autocomplete-item create';
    li.textContent = `Create "${val}"`;
    li.onmousedown = (ev) => { ev.preventDefault(); addTag(val, prefix); };
    list.appendChild(li);
  }
  
  list.style.display = 'block';
}

function handleTagKeydown(e, prefix) {
  const input = e.target;
  const list = document.getElementById(prefix + 'TagAuto');
  const items = list.querySelectorAll('.autocomplete-item');
  
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    if(items.length > 0) {
      autoFocusIndex = (autoFocusIndex + 1) % items.length;
      updateAutoActive(items);
    }
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    if(items.length > 0) {
      autoFocusIndex = (autoFocusIndex - 1 + items.length) % items.length;
      updateAutoActive(items);
    }
  } else if (e.key === 'Enter') {
    e.preventDefault();
    if (autoFocusIndex >= 0 && autoFocusIndex < items.length) {
      items[autoFocusIndex].onmousedown(e);
    } else if (input.value.trim()) {
      addTag(input.value, prefix);
    }
  } else if (e.key === 'Backspace' && input.value === '') {
    const arr = prefix === 'up' ? upTagsArr : editTagsArr;
    if(arr.length > 0) {
      arr.pop();
      renderTags(prefix);
      closeAutocomplete(prefix);
    }
  } else if (e.key === 'Escape') {
    closeAutocomplete(prefix);
  }
}

function updateAutoActive(items) {
  items.forEach((item, i) => {
    if(i === autoFocusIndex) item.classList.add('active');
    else item.classList.remove('active');
  });
}

function closeAutocomplete(prefix) {
  const list = document.getElementById(prefix + 'TagAuto');
  if (list) list.style.display = 'none';
  const input = document.getElementById(prefix + 'TagInput');
  if (input) input.value = '';
}

function showCatAutocomplete(e, prefix) {
  const input = e.target;
  const list = document.getElementById(prefix + 'CatAuto');
  const val = input.value.trim().toLowerCase();
  
  catAutoFocusIndex = -1;
  list.innerHTML = '';
  
  const matches = allCatsList.filter(c => c.includes(val)).slice(0, 8);
  let hasExact = false;
  
  matches.forEach((m) => {
    if(m === val) hasExact = true;
    const li = document.createElement('li');
    li.className = 'autocomplete-item';
    li.textContent = m;
    li.onmousedown = (ev) => { ev.preventDefault(); addCategory(m, prefix); };
    list.appendChild(li);
  });
  
  if(val && !hasExact) {
    const li = document.createElement('li');
    li.className = 'autocomplete-item create';
    li.textContent = `Create "${val}"`;
    li.onmousedown = (ev) => { ev.preventDefault(); addCategory(val, prefix); };
    list.appendChild(li);
  }
  
  if (matches.length > 0 || (val && !hasExact)) {
    list.style.display = 'block';
  } else {
    list.style.display = 'none';
  }
}

function handleCatKeydown(e, prefix) {
  const input = e.target;
  const list = document.getElementById(prefix + 'CatAuto');
  const items = list.querySelectorAll('.autocomplete-item');
  
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    if(items.length > 0) {
      catAutoFocusIndex = (catAutoFocusIndex + 1) % items.length;
      updateCatAutoActive(items);
    }
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    if(items.length > 0) {
      catAutoFocusIndex = (catAutoFocusIndex - 1 + items.length) % items.length;
      updateCatAutoActive(items);
    }
  } else if (e.key === 'Enter') {
    e.preventDefault();
    if (catAutoFocusIndex >= 0 && catAutoFocusIndex < items.length) {
      items[catAutoFocusIndex].onmousedown(e);
    } else if (input.value.trim()) {
      addCategory(input.value, prefix);
    }
  } else if (e.key === 'Backspace' && input.value === '') {
    const arr = prefix === 'up' ? upCatsArr : editCatsArr;
    if(arr.length > 0) {
      arr.pop();
      renderCats(prefix);
      closeCatAutocomplete(prefix);
    }
  } else if (e.key === 'Escape') {
    closeCatAutocomplete(prefix);
  }
}

function updateCatAutoActive(items) {
  items.forEach((item, i) => {
    if(i === catAutoFocusIndex) item.classList.add('active');
    else item.classList.remove('active');
  });
}

function closeCatAutocomplete(prefix) {
  const list = document.getElementById(prefix + 'CatAuto');
  if (list) list.style.display = 'none';
  const input = document.getElementById(prefix + 'Cat');
  if (input) input.value = '';
}

document.addEventListener('click', e => {
  if(!e.target.closest('#upTagWrap')) closeAutocomplete('up');
  if(!e.target.closest('#editTagWrap')) closeAutocomplete('edit');
  if(!e.target.closest('#upCatWrap')) closeCatAutocomplete('up');
  if(!e.target.closest('#editCatWrap')) closeCatAutocomplete('edit');
});

async function checkAuth() {
  const r = await fetch('/api/check-admin');
  const d = await r.json();
  if (!d.passwordRequired) {
    document.getElementById('loginModal').classList.add('hidden');
    loadData();
    loadAllTags();
    loadCategories();
  }
}

async function login() {
  const pw = document.getElementById('pwInput').value;
  const r = await fetch('/api/verify-admin', {
    method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({password:pw})
  });
  const d = await r.json();
  if (d.ok) {
    adminPw = pw;
    document.getElementById('loginModal').classList.add('hidden');
    loadData();
    loadAllTags();
    loadCategories();
  } else {
    document.getElementById('loginErr').textContent = 'Incorrect Password';
  }
}

function switchTab(tab) {
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('panel-' + tab).classList.add('active');
  event.target.classList.add('active');
}

async function loadData() {
  loadWallpapers();
  loadSettings();
}

async function loadWallpapers() {
  try {
    const r = await fetch('/api/wallpapers?limit=1000');
    const d = await r.json();
    const tbody = document.getElementById('wallTableBody');
    if (!d.wallpapers.length) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">No wallpapers found.</td></tr>';
      return;
    }
    tbody.innerHTML = d.wallpapers.map(w => `
      <tr>
        <td><img src="${w.directLink}" class="thumb"></td>
        <td>${esc(w.title)}</td>
        <td>${(Array.isArray(w.category) ? w.category : [w.category]).filter(Boolean).map(c => `<span class="badge free" style="margin-right:2px;text-transform:capitalize;">${esc(c)}</span>`).join('')}</td>
        <td>
          <span class="badge ${w.isPaid ? 'paid' : 'free'}">${w.isPaid ? 'Premium $'+w.price : 'Free'}</span>
        </td>
        <td style="color:var(--dim);font-size:.75rem;">DL: ${w.downloads} | V: ${w.views}</td>
        <td>
          <button class="action-btn" onclick='openEdit(${JSON.stringify(w).replace(/'/g, "&apos;")})'>✎</button>
          <button class="action-btn del" onclick="deleteWall('${w._id}')">✕</button>
        </td>
      </tr>
    `).join('');
  } catch(e) {
    console.error(e);
  }
}

let predefinedTags = [];
let predefinedCategories = [];

async function loadSettings() {
  try {
    const r = await fetch('/api/settings');
    const d = await r.json();
    if(d) {
      if(d.adsensePublisherId) document.getElementById('setAdsense').value = d.adsensePublisherId;
      if(d.googleAnalyticsId) document.getElementById('setGa').value = d.googleAnalyticsId;
      predefinedTags = d.predefinedTags || [];
      predefinedCategories = d.predefinedCategories || [];
    }
  } catch(e) {}
}

async function addPredefinedCategory() {
  const cat = document.getElementById('newPredefinedCat').value.trim().toLowerCase();
  if (!cat || predefinedCategories.includes(cat)) return;
  predefinedCategories.push(cat);
  await saveSettings(false);
  document.getElementById('newPredefinedCat').value = '';
  await loadCategories();
  showToast(`Category "${cat}" added globally!`);
}

async function addPredefinedTag() {
  const tag = document.getElementById('newPredefinedTag').value.trim().toLowerCase();
  if (!tag || predefinedTags.includes(tag)) return;
  predefinedTags.push(tag);
  await saveSettings(false);
  document.getElementById('newPredefinedTag').value = '';
  await loadAllTags();
  showToast(`Tag "${tag}" added globally!`);
}

async function saveSettings(showAlert = true) {
  const pubId = document.getElementById('setAdsense').value.trim();
  const gaId = document.getElementById('setGa').value.trim();
  try {
    await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'x-admin-password': adminPw },
      body: JSON.stringify({ 
        adsensePublisherId: pubId, 
        googleAnalyticsId: gaId,
        predefinedTags,
        predefinedCategories
      })
    });
    if (showAlert) showToast('Settings saved!');
  } catch(e) {
    if (showAlert) showToast('Failed to save settings');
  }
}

function deleteWall(id) {
  if(!confirm("Delete this wallpaper permanently?")) return;
  fetch(`/api/wallpapers/${id}`, { method: 'DELETE', headers: { 'x-admin-password': adminPw }})
    .then(() => { showToast('Deleted successfully'); loadWallpapers(); });
}

function openEdit(w) {
  editId = w._id;
  document.getElementById('editTitle').value = w.title;
  editCatsArr = Array.isArray(w.category) ? [...w.category] : [w.category].filter(Boolean);
  renderCats('edit');
  document.getElementById('editCat').value = '';
  editTagsArr = [...(w.tags || [])];
  renderTags('edit');
  document.getElementById('editTagInput').value = '';
  document.getElementById('editIsPaid').checked = w.isPaid;
  document.getElementById('editPrice').value = w.price || '';
  document.getElementById('editPrice').style.display = w.isPaid ? 'block' : 'none';
  document.getElementById('editModal').classList.remove('hidden');
}

async function submitEdit() {
  const title = document.getElementById('editTitle').value.trim();
  const isPaid = document.getElementById('editIsPaid').checked;
  const price = document.getElementById('editPrice').value;
  
  try {
    await fetch(`/api/wallpapers/${editId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'x-admin-password': adminPw },
      body: JSON.stringify({ title, category: editCatsArr, tags: editTagsArr, isPaid, price: parseFloat(price)||0 })
    });
    document.getElementById('editModal').classList.add('hidden');
    showToast('Wallpaper updated!');
    loadWallpapers();
  } catch(e) {
    showToast('Update failed');
  }
}

// UPLOAD
function previewFile(e) {
  const f = e.target.files[0];
  if(!f) return;
  const img = document.getElementById('upPreview');
  img.src = URL.createObjectURL(f);
  img.style.display = 'block';
  if(!document.getElementById('upTitle').value)
    document.getElementById('upTitle').value = f.name.replace(/\.[^.]+$/, '').replace(/[_-]/g, ' ');
}

function submitUpload() {
  const file = document.getElementById('upFile').files[0];
  if(!file) return showToast('Select a file');
  const titleVal = document.getElementById('upTitle').value.trim();
  const catInput = document.getElementById('upCat').value.trim();
  if (catInput) {
    catInput.split(',').forEach(c => {
      const cat = c.trim().toLowerCase();
      if (cat && !upCatsArr.includes(cat)) upCatsArr.push(cat);
    });
    document.getElementById('upCat').value = '';
    renderCats('up');
  }
  
  const tagInput = document.getElementById('upTagInput').value.trim();
  if (tagInput) {
    tagInput.split(',').forEach(t => {
      const tag = t.trim().toLowerCase();
      if (tag && !upTagsArr.includes(tag)) upTagsArr.push(tag);
    });
    document.getElementById('upTagInput').value = '';
    renderTags('up');
  }

  if (!titleVal) return showToast('Please enter a title');
  if (upCatsArr.length === 0) return showToast('Please add at least one category');

  const fd = new FormData();
  fd.append('image', file);
  fd.append('title', titleVal);
  fd.append('category', upCatsArr.join(','));
  fd.append('tags', upTagsArr.join(','));
  fd.append('isPaid', document.getElementById('upIsPaid').checked);
  fd.append('price', document.getElementById('upPrice').value || 0);

  const btn = document.getElementById('uploadBtn');
  btn.disabled = true;
  btn.textContent = 'Uploading...';
  document.getElementById('progWrap').style.display = 'block';

  const xhr = new XMLHttpRequest();
  xhr.open('POST', '/api/upload');
  xhr.setRequestHeader('x-admin-password', adminPw);
  xhr.upload.onprogress = e => {
    if(e.lengthComputable) {
      document.getElementById('progBar').style.width = (e.loaded / e.total * 100) + '%';
    }
  };
  xhr.onload = () => {
    btn.disabled = false;
    btn.textContent = 'Upload Wallpaper';
    document.getElementById('progWrap').style.display = 'none';
    document.getElementById('progBar').style.width = '0%';
    if(xhr.status === 201) {
      showToast('Uploaded successfully!');
      document.getElementById('upFile').value = '';
      document.getElementById('upPreview').style.display = 'none';
      document.getElementById('upTitle').value = '';
      upCatsArr = [];
      renderCats('up');
      upTagsArr = [];
      renderTags('up');
      document.getElementById('upTagInput').value = '';
      document.getElementById('upIsPaid').checked = false;
      document.getElementById('upPrice').value = '';
      document.getElementById('upPriceWrap').style.display = 'none';
      loadWallpapers();
      switchTab('wallpapers');
    } else {
      try {
        const err = JSON.parse(xhr.responseText);
        showToast('Upload failed: ' + (err.error || 'Unknown'));
      } catch(e) {
        showToast('Upload failed');
      }
    }
  };
  xhr.send(fd);
}

// Utils
function esc(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;'); }
let toastTimer;
function showToast(m) {
  const t = document.getElementById('toast');
  t.textContent = m; t.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(()=>t.classList.remove('show'), 3000);
}

checkAuth();
