const $ = (id) => document.getElementById(id);
let peer, conn, call, localStream, myName = '', friendName = 'Friend', audioCtx;
const meters = [];

// ---------- helpers ----------
const showErr = (m) => { $('err').textContent = m || ''; };
function sys(text) {
  const d = document.createElement('div'); d.className = 'sys'; d.textContent = text;
  $('log').append(d); $('log').scrollTop = 1e9;
}
function addMsg(name, text, me) {
  const d = document.createElement('div'); d.className = 'msg' + (me ? ' me' : '');
  const s = document.createElement('small'); s.textContent = name;
  const t = document.createElement('span'); t.textContent = text;
  d.append(s, t); $('log').append(d); $('log').scrollTop = 1e9;
}
function renderPeople() {
  const ul = $('people'); ul.innerHTML = '';
  const add = (id, name, muted) => {
    const li = document.createElement('li'); li.id = id; if (muted) li.classList.add('muted');
    li.innerHTML = '<span class="dot"></span><span class="name"></span>';
    li.querySelector('.name').textContent = name; ul.append(li);
  };
  add('p-me', myName + ' (you)', !localStream.getAudioTracks()[0].enabled);
  if (conn && conn.open) add('p-friend', friendName, false);
}
function watchSpeaking(stream, liId) {
  audioCtx = audioCtx || new AudioContext();
  const an = audioCtx.createAnalyser(); an.fftSize = 512;
  audioCtx.createMediaStreamSource(stream).connect(an);
  const buf = new Uint8Array(an.frequencyBinCount);
  meters.push(setInterval(() => {
    an.getByteTimeDomainData(buf);
    const peak = Math.max(...buf.map((v) => Math.abs(v - 128)));
    const li = $(liId); if (li) li.classList.toggle('speaking', peak > 14);
  }, 100));
}

// ---------- connection ----------
async function getMic() {
  try {
    localStream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
    });
  } catch { throw new Error('Microphone access was blocked. Allow it in your system settings and try again.'); }
}

function setupConn(c) {
  conn = c;
  c.on('open', () => {
    c.send({ type: 'hello', name: myName });
    $('status').textContent = 'Connected';
    renderPeople();
  });
  c.on('data', (d) => {
    if (d.type === 'hello') { friendName = d.name || 'Friend'; renderPeople(); sys(friendName + ' joined'); }
    if (d.type === 'chat') addMsg(friendName, d.text, false);
    if (d.type === 'mute') { const li = $('p-friend'); if (li) li.classList.toggle('muted', d.muted); }
  });
  c.on('close', () => { $('status').textContent = 'Friend left the room'; sys(friendName + ' left'); conn = null; renderPeople(); });
}

function setupCall(c) {
  call = c;
  c.on('stream', (remote) => {
    $('remoteAudio').srcObject = remote;
    watchSpeaking(remote, 'p-friend');
  });
}

function enterRoom(code) {
  $('join').classList.add('hidden'); $('room').classList.remove('hidden');
  $('roomCode').textContent = code; renderPeople();
  watchSpeaking(localStream, 'p-me');
  $('chatInput').focus();
}

async function start(joinCode) {
  showErr('');
  myName = $('name').value.trim() || 'Me';
  try { await getMic(); } catch (e) { return showErr(e.message); }

  const id = joinCode ? undefined : 'hang-' + Math.random().toString(36).slice(2, 8);
  peer = new Peer(id);
  peer.on('error', (e) => {
    const msg = e.type === 'peer-unavailable' ? 'No room found with that code.'
      : e.type === 'unavailable-id' ? 'That code is taken. Try again.'
      : 'Connection problem: ' + e.type;
    if ($('room').classList.contains('hidden')) { showErr(msg); localStream.getTracks().forEach((t) => t.stop()); }
    else sys(msg);
  });
  peer.on('open', (myId) => {
    if (joinCode) {
      setupConn(peer.connect(joinCode));
      setupCall(peer.call(joinCode, localStream));
      enterRoom(joinCode); $('status').textContent = 'Connecting…';
    } else {
      enterRoom(myId);
    }
  });
  // Host side: answer friend's incoming connection and call
  peer.on('connection', setupConn);
  peer.on('call', (c) => { c.answer(localStream); setupCall(c); });
}

// ---------- UI wiring ----------
$('create').onclick = () => start();
$('joinBtn').onclick = () => {
  const code = $('code').value.trim();
  if (!code) return showErr('Enter the room code your friend gave you.');
  start(code);
};
$('code').addEventListener('keydown', (e) => { if (e.key === 'Enter') $('joinBtn').click(); });

$('copy').onclick = async () => {
  await navigator.clipboard.writeText($('roomCode').textContent);
  $('copy').textContent = 'Copied'; setTimeout(() => ($('copy').textContent = 'Copy'), 1200);
};

$('mute').onclick = () => {
  const t = localStream.getAudioTracks()[0]; t.enabled = !t.enabled;
  $('mute').textContent = t.enabled ? 'Mute mic' : 'Unmute mic';
  if (conn && conn.open) conn.send({ type: 'mute', muted: !t.enabled });
  renderPeople();
};

$('chatForm').onsubmit = (e) => {
  e.preventDefault();
  const text = $('chatInput').value.trim();
  if (!text) return;
  if (!conn || !conn.open) return sys('Nobody is connected yet.');
  conn.send({ type: 'chat', text });
  addMsg(myName, text, true); $('chatInput').value = '';
};

$('leave').onclick = () => {
  meters.forEach(clearInterval);
  if (call) call.close(); if (conn) conn.close(); if (peer) peer.destroy();
  localStream.getTracks().forEach((t) => t.stop());
  location.reload();
};

// ---------- update notice ----------
if (window.updater) {
  window.updater.onUpdate((u) => {
    const btn = $('updateBtn');
    $('updateBar').classList.remove('hidden');
    btn.classList.remove('hidden');
    if (u.state === 'downloading') {
      $('updateText').textContent = 'Downloading update ' + u.version + '…';
      btn.classList.add('hidden');
    } else if (u.state === 'ready') {
      $('updateText').textContent = 'Update ' + u.version + ' is ready';
      btn.textContent = 'Restart to update';
      btn.onclick = () => window.updater.install();
    } else {
      $('updateText').textContent = 'Version ' + u.version + ' is available';
      btn.textContent = 'Download';
      btn.onclick = () => window.updater.open(u.url);
    }
  });
}
