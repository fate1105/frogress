let currentBook = null;
let rendition = null;
let currentFontSize = 100;
let currentTheme = 'sepia';
let currentFont = "'Literata', serif";
let selectedBooks = new Set();
let currentSeries = null;
let currentPartIndex = 0;
let currentFilename = "";
let modalSeriesParts = [];
let currentReadChapters = new Set();

// Cấu hình đọc sách nâng cao
let currentFlow = 'scrolled'; // 'scrolled' hoặc 'paginated'
let currentLineHeight = '1.6'; // '1.4', '1.6', '1.8', '2.0'
let currentMargin = 'medium'; // 'narrow', 'medium', 'wide'
let currentAlign = 'justify'; // 'justify', 'left'

function loadReaderConfig() {
    currentFontSize = parseInt(localStorage.getItem('epub_font_size')) || 100;
    currentTheme = localStorage.getItem('epub_theme') || 'sepia';
    currentFont = localStorage.getItem('epub_font') || "'Literata', serif";
    currentFlow = localStorage.getItem('epub_flow') || 'scrolled';
    currentLineHeight = localStorage.getItem('epub_line_height') || '1.6';
    currentMargin = localStorage.getItem('epub_margin') || 'medium';
    currentAlign = localStorage.getItem('epub_align') || 'justify';
}

function saveReaderConfig() {
    localStorage.setItem('epub_font_size', currentFontSize);
    localStorage.setItem('epub_theme', currentTheme);
    localStorage.setItem('epub_font', currentFont);
    localStorage.setItem('epub_flow', currentFlow);
    localStorage.setItem('epub_line_height', currentLineHeight);
    localStorage.setItem('epub_margin', currentMargin);
    localStorage.setItem('epub_align', currentAlign);
}

async function initEpub() {
    loadEpubList();
}

function showNotification(msg, type = "info") {
    // Simple toast fallback
    console.log(`[${type}] ${msg}`);
    if (window.showToast) {
        showToast(msg, type);
    } else {
        alert(msg);
    }
}

async function loadEpubList() {
    const listView = document.getElementById('epub-list-view');
    if (!listView) return;

    try {
        const books = await eel.get_epub_list()();
        listView.innerHTML = '';

        if (!books || books.length === 0) {
            listView.innerHTML = `<div id="epub-empty-state" class="col-span-full py-20 flex flex-col items-center justify-center text-dim bg-card/30 rounded-3xl border-2 border-dashed border-border">
                <span class="text-6xl mb-4">📚</span>
                <p class="text-lg font-medium">Chưa có linh thư nào trong tàng kinh các</p>
                <p class="text-sm">Hãy tải lên một file EPUB để bắt đầu tu luyện</p>
            </div>`;
            return;
        }

        // Tạo danh sách các file đã gộp vào series để ẩn đi
        const mergedFiles = new Set();
        books.forEach(b => {
            if (b.is_series && b.parts) {
                b.parts.forEach(p => mergedFiles.add(p));
            }
        });

        books.forEach(book => {
            if (!book.is_series && mergedFiles.has(book.filename)) return;

            const card = document.createElement('div');
            const isSelected = selectedBooks.has(book.filename);
            card.className = `group relative bg-card hover:bg-gray-800 border ${isSelected ? 'border-primary bg-primary/5' : 'border-border'} rounded-2xl p-4 transition-all hover:shadow-xl cursor-pointer`;

            card.innerHTML = `
                <div class="absolute top-3 right-3 z-10 flex gap-2">
                    <input type="checkbox" ${isSelected ? 'checked' : ''} class="w-5 h-5 rounded border-gray-600 bg-gray-700 text-primary focus:ring-primary transition-all" 
                        onclick="event.stopPropagation(); toggleBookSelection('${book.filename}')">
                </div>
                <div class="flex items-start gap-4" onclick="${book.is_series ? `openSeriesModal('${book.filename}')` : `openEpubReader('${book.filename}')`}">
                    <div class="w-16 h-24 bg-gray-800 rounded-lg flex items-center justify-center text-3xl shadow-inner group-hover:scale-105 transition-transform">
                        ${book.is_series ? '📚' : '📖'}
                    </div>
                    <div class="flex-1 min-w-0">
                        <div class="flex justify-between items-start">
                            <h3 class="font-bold text-title truncate group-hover:text-primary transition-colors pr-2">${book.title}</h3>
                        </div>
                        <p class="text-xs text-dim mt-1">${book.is_series ? (book.parts ? book.parts.length : 0) + ' tập' : 'EPUB Document'}</p>
                        <div class="mt-4 flex justify-end">
                            <button onclick="event.stopPropagation(); deleteEpub('${book.filename}')" class="p-1.5 text-dim hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all" title="Xóa linh thư">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                            </button>
                        </div>
                    </div>
                </div>
            `;
            listView.appendChild(card);
        });
    } catch (err) {
        console.error("Error loading epub list:", err);
    }
}

async function openSeriesModal(filename) {
    const books = await eel.get_epub_list()();
    currentSeries = books.find(b => b.filename === filename);
    if (!currentSeries) return;

    modalSeriesParts = [...currentSeries.parts];
    renderSeriesModalParts();

    document.getElementById('series-modal-title').innerText = currentSeries.title;
    document.getElementById('series-modal').classList.remove('hidden');
}

function renderSeriesModalParts() {
    const list = document.getElementById('series-parts-list');
    list.innerHTML = '';

    modalSeriesParts.forEach((part, index) => {
        const item = document.createElement('div');
        item.className = 'flex items-center justify-between p-3 bg-gray-800/50 border border-border rounded-xl group';
        item.innerHTML = `
            <div class="flex items-center gap-3">
                <span class="text-xs font-bold text-primary w-6">#${index + 1}</span>
                <span class="text-sm text-title truncate max-w-[200px]">${part}</span>
            </div>
            <div class="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onclick="movePart(${index}, -1)" class="p-1.5 hover:bg-gray-700 rounded-lg" ${index === 0 ? 'disabled' : ''}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="18 15 12 9 6 15"/></svg>
                </button>
                <button onclick="movePart(${index}, 1)" class="p-1.5 hover:bg-gray-700 rounded-lg" ${index === modalSeriesParts.length - 1 ? 'disabled' : ''}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
                </button>
            </div>
        `;
        list.appendChild(item);
    });
}

function movePart(index, dir) {
    const newIndex = index + dir;
    if (newIndex < 0 || newIndex >= modalSeriesParts.length) return;

    const temp = modalSeriesParts[index];
    modalSeriesParts[index] = modalSeriesParts[newIndex];
    modalSeriesParts[newIndex] = temp;
    renderSeriesModalParts();
}

function closeSeriesModal() {
    document.getElementById('series-modal').classList.add('hidden');
}

async function saveSeriesOrder() {
    try {
        await eel.update_epub_series(currentSeries.filename, modalSeriesParts)();
        closeSeriesModal();
        openEpubReader(currentSeries.filename, true);
    } catch (err) {
        alert("Lỗi khi lưu thứ tự: " + err);
    }
}

function toggleBookSelection(filename) {
    if (selectedBooks.has(filename)) {
        selectedBooks.delete(filename);
    } else {
        selectedBooks.add(filename);
    }

    const mergeBtn = document.getElementById('btn-merge-epubs');
    if (selectedBooks.size >= 2) {
        mergeBtn.classList.remove('hidden');
    } else {
        mergeBtn.classList.add('hidden');
    }
    loadEpubList();
}

async function mergeSelectedEpubs() {
    const seriesName = await showPrompt(
        "Gộp linh thư", 
        "Mời đạo hữu nhập tên bộ truyện mới để quy về một mối (ví dụ: Phàm Nhân Tu Tiên - Trọn bộ):",
        "Tên bộ truyện..."
    );
    if (!seriesName) return;

    const filenames = Array.from(selectedBooks);
    try {
        const res = await eel.create_epub_series(seriesName, filenames)();
        if (res.status === "success") {
            selectedBooks.clear();
            const mergeBtn = document.getElementById('btn-merge-epubs');
            if (mergeBtn) mergeBtn.classList.add('hidden');
            loadEpubList();
            showNotification("Đã gộp linh thư thành công!", "success");
        } else {
            showNotification("Lỗi: " + res.msg, "error");
        }
    } catch (err) {
        console.error("Error merging epubs:", err);
        showNotification("Lỗi kết nối hệ thống", "error");
    }
}

async function handleEpubUpload(event) {
    const files = Array.from(event.target.files).filter(f => f.name.endsWith('.epub'));
    if (!files.length) return;

    const progressCard = document.getElementById('upload-progress-card');
    const progressStatus = document.getElementById('upload-progress-status');
    const progressCount = document.getElementById('upload-progress-count');
    const progressBar = document.getElementById('upload-progress-bar');

    if (progressCard) progressCard.classList.remove('hidden');

    let completed = 0;
    const total = files.length;

    for (const file of files) {
        if (progressStatus) progressStatus.innerText = `Đang nạp: ${file.name}`;
        if (progressCount) progressCount.innerText = `${completed}/${total} Đã hoàn tất`;
        if (progressBar) progressBar.style.width = `${(completed / total) * 100}%`;

        try {
            const base64Data = await new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = (e) => resolve(e.target.result.split(',')[1]);
                reader.readAsDataURL(file);
            });

            const res = await eel.upload_epub(file.name, base64Data)();
            if (res.status === "success") {
                completed++;
            } else {
                console.error(`Lỗi nạp ${file.name}:`, res.msg);
                showNotification(`Lỗi nạp ${file.name}: ${res.msg}`, "error");
            }
        } catch (err) {
            console.error(`Lỗi hệ thống khi nạp ${file.name}:`, err);
        }
    }

    if (progressStatus) progressStatus.innerText = "Đã hoàn tất nạp linh thư!";
    if (progressCount) progressCount.innerText = `${completed}/${total} Thành công`;
    if (progressBar) progressBar.style.width = "100%";

    loadEpubList();

    setTimeout(() => {
        if (progressCard) progressCard.classList.add('hidden');
    }, 3000);
}

async function deleteEpub(filename) {
    const modal = document.getElementById('confirm-modal');
    const yesBtn = document.getElementById('confirm-modal-yes');
    const msg = document.getElementById('confirm-modal-msg');

    if (!modal || !yesBtn) return;

    msg.innerText = `Đạo hữu có chắc chắn muốn xóa "${filename}" khỏi tàng kinh các?`;
    modal.classList.remove('hidden');

    // Remove any previous listeners to avoid double deletion
    const newYesBtn = yesBtn.cloneNode(true);
    yesBtn.parentNode.replaceChild(newYesBtn, yesBtn);

    newYesBtn.onclick = async () => {
        modal.classList.add('hidden');
        const res = await eel.delete_epub(filename)();
        if (res.status === "success") {
            showNotification("Đã xóa linh thư", "success");
            loadEpubList();
        } else {
            showNotification("Lỗi: " + res.msg, "error");
        }
    };
}

function closeConfirmModal() {
    const modal = document.getElementById('confirm-modal');
    if (modal) modal.classList.add('hidden');
}

function closePromptModal(value = null) {
    const modal = document.getElementById('prompt-modal');
    if (modal) modal.classList.add('hidden');
    if (window.promptResolver) {
        window.promptResolver(value);
        window.promptResolver = null;
    }
}

async function showPrompt(title, msg, placeholder = "") {
    const modal = document.getElementById('prompt-modal');
    const titleEl = document.getElementById('prompt-modal-title');
    const msgEl = document.getElementById('prompt-modal-msg');
    const inputEl = document.getElementById('prompt-modal-input');
    const yesBtn = document.getElementById('prompt-modal-yes');
    
    if (!modal || !yesBtn) return null;

    titleEl.innerText = title;
    msgEl.innerText = msg;
    inputEl.value = "";
    inputEl.placeholder = placeholder;
    modal.classList.remove('hidden');
    inputEl.focus();

    return new Promise((resolve) => {
        window.promptResolver = resolve;
        
        const newYesBtn = yesBtn.cloneNode(true);
        yesBtn.parentNode.replaceChild(newYesBtn, yesBtn);
        
        newYesBtn.onclick = () => {
            const val = inputEl.value.trim();
            if (val) closePromptModal(val);
        };
        
        inputEl.onkeyup = (e) => {
            if (e.key === "Enter") {
                const val = inputEl.value.trim();
                if (val) closePromptModal(val);
            }
        };
    });
}

function base64ToArrayBuffer(base64) {
    const binary_string = window.atob(base64);
    const len = binary_string.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binary_string.charCodeAt(i);
    }
    return bytes.buffer;
}


async function openEpubReader(filename, isSeries = false) {
    loadReaderConfig();
    currentFilename = filename;
    const readerView = document.getElementById('epub-reader-view');
    const bookTitle = document.getElementById('reader-book-title');
    const loading = document.getElementById('reader-loading');
    const viewer = document.getElementById('epub-viewer');

    if (!readerView) return;

    bookTitle.innerText = currentSeries ? currentSeries.title : filename.replace('.epub', '');
    viewer.innerHTML = ''; // Clear previous content
    if (loading) loading.classList.remove('hidden');
    readerView.classList.remove('hidden');

    if (currentBook) {
        currentBook.destroy();
    }

    try {
        // Load progress
        const progress = await eel.get_epub_progress(filename)();
        if (progress.status === "success") {
            currentReadChapters = new Set(progress.read_chapters || []);
        } else {
            currentReadChapters = new Set();
        }

        const startCfi = (progress && progress.cfi) ? progress.cfi : undefined;

        if (isSeries) {
            const books = await eel.get_epub_list()();
            currentSeries = books.find(b => b.filename === filename);
            if (!currentSeries || !currentSeries.parts || currentSeries.parts.length === 0) {
                throw new Error("Không tìm thấy dữ liệu tập truyện trong bộ này.");
            }
            currentPartIndex = 0;
            await loadBookPart(currentSeries.parts[0], startCfi);
        } else {
            currentSeries = null;
            await loadBookPart(filename, startCfi);
        }
    } catch (err) {
        console.error("Error:", err);
        if (loading) loading.classList.add('hidden');
        const viewer = document.getElementById('epub-viewer');
        if (viewer) viewer.innerHTML = `<div class="flex items-center justify-center h-full text-red-500">${err.message}</div>`;
    }

    // Navigation & Keyboard
    const prev = () => handleNav('prev');
    const next = () => handleNav('next');

    document.getElementById('prev-page').onclick = prev;
    document.getElementById('next-page').onclick = next;

    const keyListener = (e) => {
        if (e.key === "ArrowLeft") prev();
        if (e.key === "ArrowRight") next();
    };
    document.removeEventListener("keyup", keyListener);
    document.addEventListener("keyup", keyListener);
}

async function loadBookPart(filename, initialCfi = null) {
    const partTitle = document.getElementById('toc-part-title');
    if (partTitle) partTitle.innerText = filename.replace('.epub', '');

    const res = await eel.get_epub_data(filename)();
    if (res.status !== "success") throw new Error(res.msg);

    const arrayBuffer = base64ToArrayBuffer(res.data);
    if (currentBook) currentBook.destroy();

    currentBook = ePub(arrayBuffer);
    rendition = currentBook.renderTo("epub-viewer", {
        width: "100%", 
        height: "100%", 
        flow: "scrolled-doc", 
        manager: "default"
    });

    // Tiêm Google Fonts vào chương sách thông qua hook
    rendition.hooks.content.register(function(contents) {
        contents.addStylesheet("https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:ital,wght@0,300;0,400;0,500;0,700;1,400&family=Inter:wght@300;400;500;700&family=Literata:ital,opsz,wght@0,7..72,300;0,7..72,400;0,7..72,500;0,7..72,700;1,7..72,400&family=Playfair+Display:ital,wght@0,400..900;1,400..900&display=swap");
        
        // Lắng nghe phím di chuyển Trái / Phải bên trong iframe chương sách
        contents.document.addEventListener("keyup", (e) => {
            if (e.key === "ArrowLeft") handleNav('prev');
            if (e.key === "ArrowRight") handleNav('next');
        });
    });



    // Xử lý CFI "end" khi quay lại tập trước trong chuỗi Series
    let displayPromise;
    if (initialCfi === "end") {
        displayPromise = currentBook.loaded.spine.then(() => {
            const lastSpineItem = currentBook.spine.get(currentBook.spine.length - 1);
            if (lastSpineItem) {
                return rendition.display(lastSpineItem.href);
            } else {
                return rendition.display();
            }
        });
    } else {
        displayPromise = rendition.display(initialCfi || undefined);
    }

    displayPromise.then(() => {
        const loading = document.getElementById('reader-loading');
        if (loading) loading.classList.add('hidden');
        applyReaderStyles();
    }).catch(err => {
        console.warn("CFI navigation failed, falling back to start:", err);
        rendition.display();
        const loading = document.getElementById('reader-loading');
        if (loading) loading.classList.add('hidden');
        applyReaderStyles();
    });

    // Load TOC
    currentBook.loaded.navigation.then(nav => {
        const tocList = document.getElementById('toc-list');
        if (!tocList) return;
        tocList.innerHTML = '';

        // Flatten navigation if it has nested items
        const flatNav = [];
        const processItems = (items) => {
            items.forEach(item => {
                flatNav.push(item);
                if (item.subitems && item.subitems.length > 0) processItems(item.subitems);
            });
        };
        processItems(nav);

        flatNav.forEach(chapter => {
            const item = document.createElement('div');
            const isRead = currentReadChapters.has(chapter.href);
            item.className = `toc-item px-3 py-2 text-sm rounded-lg cursor-pointer transition-all truncate flex items-center justify-between ${isRead ? 'text-green-500/60' : 'text-dim hover:text-white hover:bg-primary/10'}`;
            item.innerHTML = `
                <span class="truncate pr-2">${chapter.label.trim()}</span>
                <span class="check-icon shrink-0">${isRead ? '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>' : ''}</span>
            `;
            item.setAttribute('data-href', chapter.href);
            item.onclick = async () => {
                await rendition.display(chapter.href);
                if (window.innerWidth < 768) toggleToc();
            };
            tocList.appendChild(item);
        });

        // Initial TOC Sync after a short delay to ensure rendition is ready
        setTimeout(() => syncToc(flatNav), 500);
    });

    rendition.on("relocated", (location) => {
        updatePagination();
        const cfi = location.start.cfi;

        currentBook.loaded.navigation.then(nav => {
            const flatNav = [];
            const processItems = (items) => {
                items.forEach(item => {
                    flatNav.push(item);
                    if (item.subitems && item.subitems.length > 0) processItems(item.subitems);
                });
            };
            processItems(nav);

            syncToc(flatNav, cfi);
        });
    });
}

function syncToc(nav, cfi = null) {
    if (!rendition || !nav) return;

    const currentIdx = rendition.currentLocation().start.index;
    const chapter = nav.find(c => {
        const baseHref = c.href.split('#')[0];
        const chapterItem = currentBook.spine.get(baseHref);
        return chapterItem && chapterItem.index === currentIdx;
    });

    if (chapter) {
        // Highlight active
        document.querySelectorAll('.toc-item').forEach(el => el.classList.remove('text-primary', 'bg-primary/5', 'font-bold'));

        const tocItems = document.querySelectorAll('.toc-item');
        let tocItem = null;
        for (const item of tocItems) {
            if (item.getAttribute('data-href') === chapter.href) {
                tocItem = item;
                break;
            }
        }

        if (tocItem) {
            tocItem.classList.add('text-primary', 'bg-primary/5', 'font-bold');
            tocItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

            // Mark as read
            if (!currentReadChapters.has(chapter.href)) {
                currentReadChapters.add(chapter.href);
                eel.save_epub_progress(currentFilename, cfi || rendition.currentLocation().start.cfi, Array.from(currentReadChapters))();

                tocItem.classList.add('text-green-500/60');
                const checkSpan = tocItem.querySelector('.check-icon');
                if (checkSpan && !checkSpan.innerHTML) {
                    checkSpan.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';
                }
            } else if (cfi) {
                eel.save_epub_progress(currentFilename, cfi)();
            }
        }
    }
}

async function handleNav(dir) {
    if (!rendition) return;

    if (dir === 'next') {
        const status = await rendition.next();
        // If we reached the end of current book and it's a series
        if (currentSeries && currentPartIndex < currentSeries.parts.length - 1) {
            // Check if we are really at the end
            const loc = rendition.currentLocation();
            if (loc && loc.atEnd) {
                currentPartIndex++;
                showNotification(`Đang chuyển sang Tập ${currentPartIndex + 1}...`, "info");
                await loadBookPart(currentSeries.parts[currentPartIndex]);
            }
        }
    } else {
        await rendition.prev();
        if (currentSeries && currentPartIndex > 0) {
            const loc = rendition.currentLocation();
            if (loc && loc.atStart) {
                currentPartIndex--;
                showNotification(`Quay lại Tập ${currentPartIndex + 1}...`, "info");
                await loadBookPart(currentSeries.parts[currentPartIndex], "end");
            }
        }
    }
}

function updatePagination() {
    if (!rendition || !currentBook) return;
    const currentLocation = rendition.currentLocation();
    const progressBar = document.getElementById('reader-progress-bar');
    const paginationText = document.getElementById('reader-pagination');

    let percentage = 0;
    let text = "-- / --";

    if (currentLocation && currentLocation.start) {
        if (currentBook.locations && currentBook.locations.length() > 0) {
            const progress = currentBook.locations.percentageFromCfi(currentLocation.start.cfi);
            percentage = Math.floor(progress * 100);
            text = `Tiến độ: ${percentage}%`;
        } else {
            const start = currentLocation.start.displayed.page;
            const total = currentLocation.start.displayed.total;
            text = `Trang ${start} / ${total}`;
            if (total > 0) percentage = Math.floor((start / total) * 100);
        }
    }

    if (currentSeries) {
        text = `[Tập ${currentPartIndex + 1}] ${text}`;
    }

    if (progressBar) progressBar.style.width = `${percentage}%`;
    if (paginationText) paginationText.innerText = text;
}

function closeEpubReader() {
    document.getElementById('epub-reader-view').classList.add('hidden');
    if (currentBook) {
        currentBook.destroy();
        currentBook = null;
        rendition = null;
    }
}

function toggleReaderSettings() {
    document.getElementById('reader-settings').classList.toggle('hidden');
}

function toggleToc() {
    const toc = document.getElementById('reader-toc');
    if (toc) {
        toc.classList.toggle('hidden');
        
        // Tự động căn chỉnh lại khổ giấy và số cột của sách khi mở/đóng mục lục
        if (rendition) {
            rendition.resize();
            setTimeout(() => {
                if (rendition) rendition.resize();
            }, 350); // Tránh xung đột chuyển động trượt của sidebar (300ms)
        }
    }
}

function changeFontSize(delta) {
    currentFontSize += delta;
    currentFontSize = Math.max(50, Math.min(300, currentFontSize));
    saveReaderConfig();
    applyReaderStyles();
}

function setReaderTheme(theme) {
    currentTheme = theme;
    saveReaderConfig();
    applyReaderStyles();
}

function setReaderFont(font) {
    currentFont = font;
    saveReaderConfig();
    applyReaderStyles();
}



function changeLineHeight(lh) {
    currentLineHeight = lh;
    saveReaderConfig();
    applyReaderStyles();
}

function changeMargin(margin) {
    currentMargin = margin;
    saveReaderConfig();
    applyReaderStyles();
}

function changeAlign(align) {
    currentAlign = align;
    saveReaderConfig();
    applyReaderStyles();
}

function applyReaderStyles() {
    if (!rendition) return;
    const themes = {
        light: { bg: '#fdfdfd', fg: '#1a1a1a', title: '#2563eb', border: 'rgba(0, 0, 0, 0.08)', progressBg: 'rgba(0, 0, 0, 0.06)', buttonHover: 'rgba(0, 0, 0, 0.05)', activeBg: 'rgba(37, 99, 235, 0.08)' },
        sepia: { bg: '#f4ecd8', fg: '#5b4636', title: '#8c6239', border: 'rgba(91, 70, 54, 0.12)', progressBg: 'rgba(91, 70, 54, 0.08)', buttonHover: 'rgba(91, 70, 54, 0.06)', activeBg: 'rgba(140, 98, 57, 0.1)' },
        solarized: { bg: '#eee8d5', fg: '#586e75', title: '#268bd2', border: 'rgba(88, 110, 117, 0.12)', progressBg: 'rgba(88, 110, 117, 0.08)', buttonHover: 'rgba(88, 110, 117, 0.06)', activeBg: 'rgba(38, 139, 210, 0.1)' },
        dark: { bg: '#1a1a1a', fg: '#d1d1d1', title: '#60a5fa', border: 'rgba(255, 255, 255, 0.08)', progressBg: 'rgba(255, 255, 255, 0.08)', buttonHover: 'rgba(255, 255, 255, 0.06)', activeBg: 'rgba(96, 165, 250, 0.12)' },
        night: { bg: '#0d0d0d', fg: '#888888', title: '#3b82f6', border: 'rgba(255, 255, 255, 0.05)', progressBg: 'rgba(255, 255, 255, 0.06)', buttonHover: 'rgba(255, 255, 255, 0.04)', activeBg: 'rgba(59, 130, 246, 0.1)' }
    };
    const config = themes[currentTheme] || themes.dark;
    const bg = config.bg;
    const fg = config.fg;

    // Dynamic theme styling for reader wrapper, header, footer, TOC
    let styleEl = document.getElementById('reader-dynamic-theme-css');
    if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = 'reader-dynamic-theme-css';
        document.head.appendChild(styleEl);
    }
    
    styleEl.innerHTML = `
        #reader-header,
        #reader-footer,
        #reader-toc,
        #reader-toc-header,
        #reader-content-col {
            background-color: ${bg} !important;
            border-color: ${config.border} !important;
            color: ${fg} !important;
        }

        #reader-settings {
            background-color: ${bg}f2 !important;
            border-color: ${config.border} !important;
            color: ${fg} !important;
        }

        #reader-book-title {
            color: ${fg} !important;
        }

        #reader-pagination {
            color: ${fg} !important;
            opacity: 0.6;
        }

        #reader-toc-header h3 {
            color: ${fg} !important;
            opacity: 0.5;
        }

        /* Buttons in Header & Footer */
        #reader-close-btn,
        #show-toc-btn,
        #reader-settings-btn,
        #prev-page,
        #next-page {
            color: ${fg} !important;
            opacity: 0.7;
            background-color: transparent !important;
            transition: all 0.2s ease;
        }

        #reader-close-btn:hover,
        #show-toc-btn:hover,
        #reader-settings-btn:hover,
        #prev-page:hover,
        #next-page:hover {
            opacity: 1 !important;
            background-color: ${config.buttonHover} !important;
            color: ${config.title} !important;
        }

        /* Progress Bar Container and Fill */
        #reader-progress-container {
            background-color: ${config.progressBg} !important;
            border-color: ${config.border} !important;
        }

        #reader-progress-bar {
            background-color: ${config.title} !important;
        }

        /* Table of Contents Item Styling */
        .toc-item {
            opacity: 0.7;
            transition: all 0.2s ease;
        }

        .toc-item:not(.text-green-500\\/60) {
            color: ${fg} !important;
        }

        .toc-item.text-green-500\\/60 {
            color: #22c55e !important;
            opacity: 0.6;
        }

        .toc-item:hover {
            opacity: 1 !important;
            background-color: ${config.buttonHover} !important;
            color: ${config.title} !important;
        }

        .toc-item.text-primary {
            color: ${config.title} !important;
            background-color: ${config.activeBg} !important;
            opacity: 1 !important;
            font-weight: bold !important;
        }
    `;

    // Sync UI elements
    const fontSizeLabel = document.getElementById('font-size-label');
    if (fontSizeLabel) fontSizeLabel.innerText = `${currentFontSize}%`;
    
    const fontSelect = document.getElementById('font-family-select');
    if (fontSelect) fontSelect.value = currentFont;

    // Tinh toán margin và padding tương thích điện thoại di động
    let paddingValue = '30px';
    if (currentMargin === 'narrow') {
        paddingValue = window.innerWidth < 768 ? '12px !important' : '20px 24px !important';
    } else if (currentMargin === 'medium') {
        paddingValue = window.innerWidth < 768 ? '16px !important' : '30px 40px !important';
    } else if (currentMargin === 'wide') {
        paddingValue = window.innerWidth < 768 ? '20px !important' : '40px 60px !important';
    }

    // Bôi đen văn bản đồng bộ với màu theme hiện tại
    const selectionBg = config.title + '33';

    try { rendition.themes.unregister('custom'); } catch (e) { }
    rendition.themes.register('custom', {
        'html': { 'overflow-x': 'hidden !important' },
        'body': {
            'background': bg + ' !important',
            'color': fg + ' !important',
            'font-family': currentFont + ' !important',
            'font-size': (currentFontSize * 1.4) + '% !important',
            'line-height': currentLineHeight + ' !important',
            'padding': paddingValue,
            'text-rendering': 'optimizeLegibility !important',
            'font-variant-ligatures': 'common-ligatures !important',
            'overflow-x': 'hidden !important',
            'box-sizing': 'border-box !important'
        },
        '::selection': {
            'background': selectionBg + ' !important',
            'color': fg + ' !important'
        },
        'p::selection, span::selection, div::selection, li::selection, a::selection': {
            'background': selectionBg + ' !important',
            'color': fg + ' !important'
        },
        'p, span, div, li, a': { 'font-family': currentFont + ' !important', 'color': fg + ' !important' },
        'p': { 
            'margin-bottom': '1.5em !important', 
            'text-indent': '2em !important',
            'text-align': currentAlign + ' !important',
            'line-height': currentLineHeight + ' !important'
        },
        'h1, h2, h3, h4, h5, h6': { 'color': config.title + ' !important', 'text-align': 'center !important' }
    });
    rendition.themes.select('custom');

    // Đồng bộ trạng thái active của các nút cài đặt hiển thị
    // Theme Buttons
    document.querySelectorAll("[id^='theme-btn-']").forEach(btn => {
        btn.classList.remove('border-primary', 'scale-110', 'shadow-md');
        btn.classList.add('border-transparent');
    });
    const activeThemeBtn = document.getElementById(`theme-btn-${currentTheme}`);
    if (activeThemeBtn) {
        activeThemeBtn.classList.remove('border-transparent');
        activeThemeBtn.classList.add('border-primary', 'scale-110', 'shadow-md');
    }



    // Line Height Buttons
    document.querySelectorAll("[id^='lh-']").forEach(btn => {
        const lhVal = btn.id.split('-')[1];
        if (lhVal === currentLineHeight) {
            btn.className = "flex-1 py-1 text-[10px] font-bold rounded-lg transition-all bg-primary text-white shadow-sm";
        } else {
            btn.className = "flex-1 py-1 text-[10px] font-bold rounded-lg transition-all text-dim hover:text-white";
        }
    });

    // Margin Buttons
    document.querySelectorAll("[id^='margin-']").forEach(btn => {
        const marginVal = btn.id.split('-')[1];
        if (marginVal === currentMargin) {
            btn.className = "flex-1 py-1 text-[10px] font-bold rounded-lg transition-all bg-primary text-white shadow-sm";
        } else {
            btn.className = "flex-1 py-1 text-[10px] font-bold rounded-lg transition-all text-dim hover:text-white";
        }
    });

    // Align Buttons
    const justifyBtn = document.getElementById('align-justify-btn');
    const leftBtn = document.getElementById('align-left-btn');
    if (justifyBtn && leftBtn) {
        if (currentAlign === 'justify') {
            justifyBtn.className = "flex-1 py-1 text-xs font-bold rounded-lg transition-all bg-primary text-white shadow-sm";
            leftBtn.className = "flex-1 py-1 text-xs font-bold rounded-lg transition-all text-dim hover:text-white";
        } else {
            justifyBtn.className = "flex-1 py-1 text-xs font-bold rounded-lg transition-all text-dim hover:text-white";
            leftBtn.className = "flex-1 py-1 text-xs font-bold rounded-lg transition-all bg-primary text-white shadow-sm";
        }
    }

    const container = document.getElementById('epub-viewer-container');
    const viewer = document.getElementById('epub-viewer');
    if (container) container.style.backgroundColor = bg;
    if (viewer) viewer.style.backgroundColor = bg;
}




