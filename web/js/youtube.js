// --- BIẾN TOÀN CỤC JS ---
let playlist = [];
let local_durations = []; // Mảng chứa thời lượng
let currentIndex = -1;
let isShuffle = false;
let isLooping = false;
let isPlaying = false;
let isDragging = false; 
let currentOrderedIndices = [];
let currentShufflePos = -1;
let playedHistory = new Set();

// --- KHỞI TẠO TAB ---
function initYouTube() {
    loadMp3Files();
    
    // Gửi yêu cầu sync backend khi UI bật lại
    try {
        eel.ap_request_sync()();
    } catch(e) {}
    
    const volBar = document.getElementById('volume-bar');
    if (volBar) {
        volBar.removeAttribute('onchange');
        volBar.removeAttribute('oninput');
        volBar.addEventListener('input', changeVolume);
    }

    const progressBar = document.getElementById('progress-bar');
    if (progressBar) {
        progressBar.removeAttribute('onchange');
        progressBar.removeAttribute('oninput');
        
        progressBar.addEventListener('input', (e) => {
            isDragging = true;
            updateSliderUI('progress', e.target.value, 100);
        });

        progressBar.addEventListener('change', (e) => {
            eel.ap_set_progress(parseInt(e.target.value))();
            isDragging = false;
        });
    }
}

// --- SYNC STATE TỪ PYTHON ---
eel.expose(sync_music_state);
function sync_music_state(state) {
    isPlaying = state.is_playing;
    isLooping = state.is_looping;
    currentShufflePos = state.shuffle_pos;
    
    if (currentIndex !== state.current_idx && currentIndex !== -1) {
        playedHistory.add(currentIndex);
    }
    currentIndex = state.current_idx;
    
    let needsReorder = false;
    if (isShuffle !== state.is_shuffle) {
        needsReorder = true;
    } else if (state.is_shuffle && JSON.stringify(currentOrderedIndices) !== JSON.stringify(state.shuffled_indices)) {
        needsReorder = true;
    }

    isShuffle = state.is_shuffle;

    if (needsReorder) {
        if (isShuffle && state.shuffled_indices) {
            currentOrderedIndices = state.shuffled_indices;
        } else {
            currentOrderedIndices = playlist.map((_, i) => i);
        }
        renderPlaylistItems();
    }
    
    // UI Update Play/Pause Button
    const btnPlay = document.getElementById('btn-play');
    if (btnPlay) {
        if(isPlaying) {
            btnPlay.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>';
        } else {
            btnPlay.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>';
        }
    }
    
    // UI Update Loop/Shuffle
    const btnLoop = document.getElementById('btn-loop');
    if (btnLoop) {
        if(isLooping) {
            btnLoop.classList.add('text-spotify');
            btnLoop.classList.remove('text-gray-500', 'hover:text-white');
        } else {
            btnLoop.classList.remove('text-spotify');
            btnLoop.classList.add('text-gray-500', 'hover:text-white');
        }
    }
    
    const btnShuffle = document.getElementById('btn-shuffle');
    if (btnShuffle) {
        if(isShuffle) {
            btnShuffle.classList.add('text-spotify');
            btnShuffle.classList.remove('text-gray-500', 'hover:text-white');
        } else {
            btnShuffle.classList.remove('text-spotify');
            btnShuffle.classList.add('text-gray-500', 'hover:text-white');
        }
    }
    
    // UI Update Track info
    if (currentIndex >= 0 && currentIndex < playlist.length) {
        updatePlaylistUI(currentIndex);
    }
    
    // UI Update Time & Progress
    if (!isDragging && state.duration > 0) {
        let val = (state.progress / state.duration) * 100;
        const pb = document.getElementById('progress-bar');
        if (pb) pb.value = val;
        
        updateSliderUI('progress', val, 100);
        
        const currEl = document.getElementById('curr-time');
        const totEl = document.getElementById('total-time');
        if (currEl) currEl.innerText = formatTime(state.progress);
        if (totEl) totEl.innerText = formatTime(state.duration);
    }
    
    // UI Update Volume
    const volBar = document.getElementById('volume-bar');
    if(volBar && document.activeElement !== volBar) {
        volBar.value = state.volume;
        updateSliderUI('volume', state.volume, 100);
    }
}

function updatePlaylistUI(index) {
    let track = playlist[index];
    if(!track) return;
    
    const titleEl = document.getElementById('player-title-large');
    const artistEl = document.getElementById('player-artist-large');
    const coverEl = document.getElementById('player-cover-large');
    
    if(titleEl) titleEl.innerText = track.title;
    if(artistEl) artistEl.innerText = track.artist || 'Unknown Artist';
    
    if(coverEl) {
        if (track.thumbnail) {
            coverEl.innerHTML = `<img src="thumbnails/${track.thumbnail}" class="w-full h-full object-cover">`;
        } else {
            coverEl.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#1ed760" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="opacity-50"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg>';
        }
    }

    document.querySelectorAll('.track-item').forEach((el) => {
        const origIdx = parseInt(el.dataset.originalIndex);
        const orderIdx = parseInt(el.dataset.orderIndex);
        
        const nameEl = el.querySelector('.track-name');
        const artistEl = el.querySelector('.track-artist');
        const statusEl = el.querySelector('.status-text');
        const iconEl = el.querySelector('.icon-cover');

        el.classList.remove('bg-white/10', 'border-l-4', 'border-spotify');
        nameEl.classList.remove('text-spotify', 'font-bold');
        nameEl.classList.add('text-gray-200');
        if (artistEl) artistEl.classList.remove('text-spotify/80');
        
        statusEl.classList.add('opacity-0', 'group-hover:opacity-100');
        statusEl.innerHTML = '▶ Phát';
        
        // Restore icon if not current
        if (playlist[origIdx].thumbnail) {
            iconEl.innerHTML = `<img src="thumbnails/${playlist[origIdx].thumbnail}" class="w-full h-full object-cover">`;
        } else {
            iconEl.innerHTML = '🎵';
        }
        
        let isPlayed = false;
        if (isShuffle) {
            isPlayed = orderIdx < currentShufflePos;
        } else {
            isPlayed = playedHistory.has(origIdx);
        }

        if(origIdx === index) {
            el.classList.add('bg-white/10', 'border-l-4', 'border-spotify');
            nameEl.classList.remove('text-gray-200');
            nameEl.classList.add('text-spotify', 'font-bold');
            if (artistEl) artistEl.classList.add('text-spotify/80');
            
            statusEl.classList.remove('opacity-0', 'group-hover:opacity-100');
            statusEl.innerHTML = '🔊 Đang phát';
            iconEl.innerHTML = '▶'; 
            el.style.opacity = '1';
        } else if (isPlayed) {
            el.style.opacity = '0.4';
        } else {
            el.style.opacity = '1';
        }
    });
}

// --- HÀM TIỆN ÍCH ---

function formatTime(seconds) {
    let min = Math.floor(seconds / 60);
    let sec = Math.floor(seconds % 60);
    return `${min}:${sec < 10 ? '0' : ''}${sec}`;
}

function updateSliderUI(idPrefix, val, max) {
    const percentage = (val / max) * 100;
    const fill = document.getElementById(`${idPrefix}-fill`);
    const thumb = document.getElementById(`${idPrefix}-thumb`);
    
    if (fill) fill.style.width = Math.min(100, Math.max(0, percentage)) + '%';
    if (thumb) thumb.style.left = Math.min(100, Math.max(0, percentage)) + '%';
}

// --- TƯƠNG TÁC XUỐNG PYTHON ---

function playTrack(index) {
    eel.ap_play_track(index)();
}

function togglePlay() {
    eel.ap_toggle_play()();
}

function nextTrack() {
    eel.ap_next_track()();
}

function prevTrack() {
    eel.ap_prev_track()();
}

function toggleLoop() {
    eel.ap_toggle_loop()();
}

function toggleShuffle() {
    eel.ap_toggle_shuffle()();
}

function changeVolume() {
    const volBar = document.getElementById('volume-bar');
    if(!volBar) return;
    eel.ap_set_volume(parseInt(volBar.value))();
    updateSliderUI('volume', parseInt(volBar.value), 100);
}

// --- LUỒNG DỮ LIỆU & THỐNG KÊ ---

async function loadMp3Files() {
    playlist = await eel.get_downloaded_mp3()();
    
    const countEl = document.getElementById('total-songs');
    if (countEl) countEl.innerText = `${playlist.length} bài hát`;
    
    const queueCountEl = document.getElementById('queue-count');
    if (queueCountEl) queueCountEl.innerText = `${playlist.length} Bài hát`;
    
    currentOrderedIndices = playlist.map((_, i) => i);
    renderPlaylistItems();
    
    calculateTotalDuration(playlist);
}

function renderPlaylistItems() {
    let listDiv = document.getElementById('mp3-list');
    if(!listDiv) return;
    listDiv.innerHTML = ''; 
    
    if (playlist.length === 0) {
        listDiv.innerHTML = '<p class="text-gray-500 p-8 text-center italic">Playlist trống. Hãy tải bài hát đầu tiên của bạn!</p>';
        const durEl = document.getElementById('total-duration');
        if (durEl) durEl.innerText = '0 phút';
        return;
    }

    currentOrderedIndices.forEach((originalIndex, orderIndex) => {
        let track = playlist[originalIndex];
        let div = document.createElement('div');
        div.className = 'track-item grid grid-cols-[2fr_1fr] items-center px-4 py-3 rounded-lg hover:bg-white/5 cursor-pointer transition-colors group mb-1 border-l-4 border-transparent';
        div.dataset.originalIndex = originalIndex;
        div.dataset.orderIndex = orderIndex;
        div.onclick = () => playTrack(originalIndex);
        
        div.innerHTML = `
            <div class="flex items-center gap-4 overflow-hidden">
                <div class="icon-cover w-10 h-10 bg-gray-800 rounded flex items-center justify-center group-hover:bg-gray-700 transition-colors shadow-md text-lg overflow-hidden shrink-0">
                    ${track.thumbnail ? `<img src="thumbnails/${track.thumbnail}" class="w-full h-full object-cover">` : '🎵'}
                </div>
                <div class="flex flex-col overflow-hidden">
                    <div class="track-name truncate text-sm font-medium text-gray-200 transition-colors" title="${track.title}">${track.title}</div>
                    <div class="track-artist truncate text-xs text-gray-400" title="${track.artist}">${track.artist}</div>
                </div>
            </div>
            <div class="status-text text-right text-xs text-spotify opacity-0 group-hover:opacity-100 transition-opacity font-bold tracking-wider">
                ▶ Phát
            </div>
        `;
        listDiv.appendChild(div);
    });

    if (currentIndex >= 0 && currentIndex < playlist.length) {
        updatePlaylistUI(currentIndex);
    }
}

async function calculateTotalDuration(tracks) {
    const durEl = document.getElementById('total-duration');
    
    // Sử dụng trực tiếp thời lượng đã được Python ffprobe lưu trữ để tránh tốn RAM tải file nhiều lần
    local_durations = tracks.map(track => parseFloat(track.duration) || 0);
    
    // GỬI CHUỖI PLAYLIST + DURATION XUỐNG PYTHON ĐỂ NÓ NẮM DATA CHẠY NGẦM
    eel.ap_set_playlist(playlist, local_durations)();
    
    let totalSeconds = local_durations.reduce((a, b) => a + b, 0);
    let mins = Math.floor(totalSeconds / 60);
    if (durEl) durEl.innerText = `Khoảng ${mins} phút`;
}

// --- DOWNLOAD LOGIC ---

function toggleDownloadForm() {
    const section = document.getElementById('download-section');
    if (section) section.classList.toggle('hidden');
}

async function startDownload() {
    let text = document.getElementById('ytb-links').value;
    let statusEl = document.getElementById('ytb-status');
    
    let response = await eel.start_ytb_download(text)();
    statusEl.innerText = response.msg;
    statusEl.style.color = response.status === 'warning' ? '#f59e0b' : '#1ed760';
    
    if(response.status !== 'warning') {
        document.getElementById('ytb-links').value = '';
    }
}

// --- YOUTUBE DOWNLODER CALLBACKS ---
eel.expose(update_ytb_progress);
function update_ytb_progress(msg, color) {
    let statusEl = document.getElementById('ytb-status');
    if(statusEl) { 
        statusEl.innerText = msg;
        statusEl.style.color = color === 'blue' ? '#3b82f6' : (color === 'green' ? '#1ed760' : 'white');
    }
}

eel.expose(refresh_mp3_list);
function refresh_mp3_list() {
    loadMp3Files(); // Load lại mảng playlist và tự động submit file mới xuống Python
}