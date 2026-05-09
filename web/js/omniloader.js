let omniMode = 'video';
let omniQueue = {};

function initOmniloader() {
    console.log("OmniLoader initialized");
    omniQueue = {};
}

function setOmniMode(mode) {
    omniMode = mode;
    const vBtn = document.getElementById('mode-video');
    const aBtn = document.getElementById('mode-audio');
    const qCont = document.getElementById('quality-container');

    if (mode === 'video') {
        vBtn.className = "flex-1 py-2 px-4 rounded-lg font-bold text-sm transition-all bg-primary text-white shadow-lg";
        aBtn.className = "flex-1 py-2 px-4 rounded-lg font-bold text-sm transition-all text-gray-400 hover:text-white";
        qCont.style.opacity = "1";
        qCont.style.pointerEvents = "auto";
    } else {
        aBtn.className = "flex-1 py-2 px-4 rounded-lg font-bold text-sm transition-all bg-primary text-white shadow-lg";
        vBtn.className = "flex-1 py-2 px-4 rounded-lg font-bold text-sm transition-all text-gray-400 hover:text-white";
        qCont.style.opacity = "0.5";
        qCont.style.pointerEvents = "none";
    }
}

async function startOmniDownload() {
    const urlsText = document.getElementById('omni-urls').value;
    const quality = document.getElementById('omni-quality').value;

    if (!urlsText.trim()) {
        showToast("Vui lòng dán link video vào!", "warning");
        return;
    }

    const res = await eel.start_universal_download(urlsText, omniMode, quality)();
    showToast(res.msg, res.status);

    if (res.status === 'info') {
        document.getElementById('omni-queue-container').classList.remove('hidden');
        document.getElementById('omni-total-status').innerText = "Đang xử lý...";
    }
}

// --- EEL EXPOSED CALLBACKS ---

eel.expose(update_omni_progress)
function update_omni_progress(id, percent, status) {
    const queueMap = document.getElementById('omni-queue');
    if (!queueMap) return;

    if (!document.getElementById(`omni-item-${id}`)) {
        const itemHtml = `
            <div id="omni-item-${id}" class="bg-card p-4 rounded-xl border border-border flex flex-col gap-3 animate-[fadeIn_0.3s]">
                <div class="flex justify-between items-center gap-4">
                    <span class="text-sm font-semibold text-white truncate max-w-[70%]">${id}</span>
                    <span id="omni-percent-${id}" class="text-xs font-bold text-primary">${percent}%</span>
                </div>
                <div class="w-full bg-dark h-1.5 rounded-full overflow-hidden">
                    <div id="omni-bar-${id}" class="bg-primary h-full transition-all duration-300" style="width: ${percent}%"></div>
                </div>
                <div class="flex justify-between items-center">
                    <span id="omni-status-${id}" class="text-[10px] uppercase font-bold text-gray-500">${status}</span>
                    <span class="text-[10px] text-gray-600">${omniMode === 'video' ? 'MP4' : 'MP3'}</span>
                </div>
            </div>
        `;
        queueMap.insertAdjacentHTML('afterbegin', itemHtml);
    } else {
        const bar = document.getElementById(`omni-bar-${id}`);
        const pText = document.getElementById(`omni-percent-${id}`);
        const sText = document.getElementById(`omni-status-${id}`);

        if (bar) bar.style.width = `${percent}%`;
        if (pText) pText.innerText = `${percent}%`;
        
        if (sText) {
            if (status === 'completed') {
                sText.innerText = "HOÀN TẤT";
                sText.classList.remove('text-gray-500');
                sText.classList.add('text-green-500');
                bar.classList.add('bg-green-500');
            } else if (status.startsWith('error')) {
                sText.innerText = "LỖI";
                sText.classList.add('text-red-500');
                bar.classList.add('bg-red-500');
            } else {
                sText.innerText = status.toUpperCase();
            }
        }
    }
}

eel.expose(omni_download_finished)
function omni_download_finished() {
    document.getElementById('omni-total-status').innerText = "TẤT CẢ ĐÃ XONG";
    showToast("Tất cả video đã được tải xong!", "success");
}
