/**
 * UIManager - Handles all UI rendering and DOM interactions for the English module.
 * Designed with a cultivation theme (dark, glow, motion).
 */
const UIManager = {
    activeView: 'home', // 'home', 'topics', 'list', 'practice'
    viewMode: 'grid', // 'grid' or 'table'
    currentTopic: null,



    init() {
        this.renderHome();
        this.initKeyboardShortcuts();
    },

    initKeyboardShortcuts() {
        document.removeEventListener('keydown', this._keyboardHandler);
        
        this._keyboardHandler = (e) => {
            if (this.activeView !== 'practice') return;
            
            const activeTag = document.activeElement.tagName;
            const isTyping = activeTag === 'INPUT' || activeTag === 'TEXTAREA';
            
            // 1. If continue button exists (Feedback Screen)
            const continueBtn = document.getElementById('btn-practice-continue');
            if (continueBtn) {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    continueBtn.click();
                }
                return;
            }
            
            // 2. If in Typing / Listening Mode (Active Question)
            const mode = PracticeEngine.session.mode;
            if (mode === 'typing' || mode === 'listening') {
                if (e.key === 'Enter' && isTyping) {
                    e.preventDefault();
                    UIManager.checkTypingAnswer();
                }
                return;
            }
            
            // If typing in input, ignore other shortcuts
            if (isTyping) return;
            
            // 3. If in Flashcard Mode
            if (mode === 'flashcard' || mode === 'reverse') {
                const flashcard = document.getElementById('flashcard');
                if (flashcard) {
                    const isFlipped = flashcard.classList.contains('flipped');
                    if (!isFlipped) {
                        if (e.key === ' ' || e.key === 'Enter') {
                            e.preventDefault();
                            flashcard.classList.add('flipped');
                        }
                    } else {
                        // Card is flipped - handle SM2 assessments
                        if (e.key === '1') UIManager.handleAnswer(1); // Again
                        else if (e.key === '2' || e.key === '3') UIManager.handleAnswer(3); // Hard
                        else if (e.key === ' ' || e.key === 'Enter' || e.key === '4') UIManager.handleAnswer(4); // Good
                        else if (e.key === '5') UIManager.handleAnswer(5); // Easy
                    }
                }
                return;
            }
            
            // 4. If in Quiz Mode
            if (mode === 'quiz') {
                if (['1', '2', '3', '4'].includes(e.key)) {
                    e.preventDefault();
                    const optionBtn = document.querySelector(`.quiz-option-btn[data-index="${e.key}"]`);
                    if (optionBtn) optionBtn.click();
                }
                return;
            }
        };
        
        document.addEventListener('keydown', this._keyboardHandler);
    },

    async renderHome() {
        this.activeView = 'home';
        const stats = DataService.getStats();
        const container = document.getElementById('english-module-container');
        if (!container) return;

        // Build Topic Chips
        const topics = Object.values(DataService.topics);
        const topicChips = ['Tất cả', ...topics.map(t => t.name)].map((name, i) => `
            <button onclick="${name === 'Tất cả' ? 'UIManager.renderHome()' : `UIManager.renderWordList('${name}')`}" 
                    class="px-5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${i === 0 ? 'bg-black text-white shadow-lg' : 'text-dim hover:bg-white/5'}">
                ${name}
            </button>
        `).join('');

        container.innerHTML = `
            <div class="animate-[fadeIn_0.5s] space-y-10">
                <!-- 1. Top Alert Bar -->
                <div class="w-full bg-card border border-border rounded-3xl p-5 flex items-center gap-5 shadow-xl">





                    <div class="w-10 h-10 rounded-full bg-dark flex items-center justify-center text-primary text-xl">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                    </div>
                    <div>
                        <h2 class="text-white font-bold text-base leading-tight">${stats.due === 0 ? 'Bạn đã ôn hết rồi!' : `Đạo hữu còn ${stats.due} bí kíp cần ôn!`}</h2>
                        <p class="text-dim text-xs">${stats.due === 0 ? 'Không có từ nào cần ôn hôm nay' : 'Hãy tập trung tinh thần để đột phá cảnh giới.'}</p>
                    </div>
                </div>

                <!-- 2. Stat Cards (3 Columns) -->
                <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <!-- Learned Card -->
                    <div class="bg-card border border-border p-6 rounded-[32px] flex items-center justify-between group shadow-lg">





                        <div class="flex items-center gap-4">
                            <div class="w-12 h-12 rounded-xl bg-dark flex items-center justify-center text-xl text-white">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"></path><path d="M6 12v5c0 2 2 3 6 3s6-1 6-3v-5"></path></svg>
                            </div>
                            <div>
                                <h3 class="text-3xl font-black text-white">${stats.total}</h3>
                                <p class="text-dim text-xs font-medium">Từ đã học</p>
                            </div>
                        </div>
                        <button onclick="UIManager.renderWordList('all')" class="bg-primary text-white px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest hover:brightness-110 transition-all shadow-lg shadow-primary/20">Xem tất cả</button>
                    </div>

                    <!-- Due Card -->
                    <div class="bg-card border border-border p-6 rounded-[32px] flex items-center gap-4 group cursor-pointer hover:bg-dark/40 transition-all shadow-lg" onclick="UIManager.startDailyReview()">





                        <div class="w-12 h-12 rounded-xl bg-dark flex items-center justify-center text-xl text-primary">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                        </div>
                        <div>
                            <h3 class="text-3xl font-black text-white">${stats.due}</h3>
                            <p class="text-dim text-xs font-medium">Cần ôn hôm nay</p>
                        </div>
                    </div>

                    <!-- Mastered Card -->
                    <div class="bg-card border border-border p-6 rounded-[32px] flex items-center gap-4 group shadow-lg">





                        <div class="w-12 h-12 rounded-xl bg-dark flex items-center justify-center text-xl text-spotify">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"></path><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"></path><path d="M4 22h16"></path><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"></path><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"></path><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"></path></svg>
                        </div>
                        <div>
                            <h3 class="text-3xl font-black text-white">${stats.mastered}</h3>
                            <p class="text-dim text-xs font-medium">Đã thuộc</p>
                        </div>
                    </div>
                </div>

                <!-- 3. Topic Filters -->
                <div class="flex gap-3 overflow-x-auto pb-2 no-scrollbar border-b border-border/50">
                    ${topicChips}
                </div>

                <!-- 4. Topic/Course Cards -->
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    ${this._renderTopicCards(topics)}
                </div>
            </div>
        `;
    },


    createStatCard(label, value, icon, borderClass) {
        return `
            <div class="bg-card p-5 rounded-2xl border border-border shadow-lg flex items-center gap-4 group hover:bg-dark/40 transition-all">





                <div class="text-3xl">${icon}</div>
                <div>
                    <p class="text-dim text-[10px] font-bold uppercase tracking-widest">${label}</p>
                    <p class="text-white font-black text-xl">${value}</p>
                </div>
            </div>
        `;
    },

    renderWordList(topicName) {
        this.activeView = 'list';
        this.currentTopic = topicName;
        const words = DataService.getWordsByTopic(topicName);

        const container = document.getElementById('english-module-container');

        const content = this.viewMode === 'grid' ? this._renderWordCards(words) : this._renderWordTable(words);

        container.innerHTML = `
            <div class="animate-[fadeIn_0.5s]">
                <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                    <div class="flex items-center gap-4">
                        <button onclick="UIManager.renderHome()" class="p-3 rounded-2xl bg-dark border border-border text-dim hover:text-white transition-all">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"></polyline></svg>
                        </button>

                        <div>
                            <h2 class="text-2xl font-black text-white tracking-tight">${topicName}</h2>
                            <p class="text-dim text-xs">${words.length} bí kíp</p>
                        </div>
                    </div>
                    <div class="flex items-center gap-3 w-full md:w-auto">
                        <!-- View Toggle -->
                        <div class="flex bg-dark p-1 rounded-xl mr-2">

                            <button onclick="UIManager.toggleViewMode('grid')" class="p-2 rounded-lg transition-all ${this.viewMode === 'grid' ? 'bg-primary text-white shadow-lg' : 'text-dim hover:text-white'}">
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
                            </button>
                            <button onclick="UIManager.toggleViewMode('table')" class="p-2 rounded-lg transition-all ${this.viewMode === 'table' ? 'bg-primary text-white shadow-lg' : 'text-dim hover:text-white'}">
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>
                            </button>
                        </div>

                        <div class="relative flex-1 md:w-64">
                            <input type="text" placeholder="Tìm kiếm bí kíp..." class="w-full bg-dark rounded-xl py-2.5 pl-10 pr-4 text-sm text-white outline-none transition-all">

                            <svg class="absolute left-3 top-1/2 -translate-y-1/2 text-dim" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                        </div>
                        <button onclick="UIManager.startPractice('${topicName}')" class="bg-primary text-white font-black px-6 py-2.5 rounded-xl text-sm hover:brightness-110 transition-all shadow-lg">Tu Luyện</button>

                    </div>
                </div>
                ${content}
            </div>
        `;
    },

    toggleViewMode(mode) {
        this.viewMode = mode;
        if (this.currentTopic) {
            this.renderWordList(this.currentTopic);
        }
    },


    _renderWordCards(words) {
        let wordsHtml = '';
        words.forEach(word => {
            const tier = SRSEngine.getTier(word.srs_level || 0);
            wordsHtml += `
                <div class="bg-card p-5 rounded-2xl border border-border shadow-lg hover:shadow-primary/5 transition-all group flex flex-col gap-3 relative overflow-hidden">





                    <div class="flex justify-between items-start">
                        <span class="text-[9px] font-bold px-2 py-0.5 rounded-full ${tier.color}">${tier.label}</span>

                        <div class="flex gap-2">
                             <button class="text-dim hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity" onclick="UIManager.deleteWord('${word.id}')"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg></button>
                        </div>
                    </div>
                    <div>
                        <div class="flex items-center gap-3">
                            <h4 class="text-white font-black text-2xl group-hover:text-primary transition-colors">${word.word}</h4>
                            ${word.audio_url ? `<button onclick="playVocabAudio('${word.audio_url}')" class="w-8 h-8 rounded-full bg-dark flex items-center justify-center text-dim hover:text-spotify hover:bg-spotify/10 transition-all"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5L6 9H2v6h4l5 4V5z"></path><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg></button>` : ''}
                        </div>
                        <p class="text-xl font-medium text-dim/60 mt-1 font-mono">${word.phonetic || ''}</p>
                        <div class="flex items-center gap-2 mt-2">
                            <span class="text-[9px] font-black uppercase text-primary/60 bg-primary/5 px-2 py-0.5 rounded">${word.partOfSpeech || ''}</span>
                            <p class="text-white font-bold text-base">${word.meaning_vn || word.answer}</p>
                        </div>
                    </div>
                    <div class="space-y-3">
                        <p class="text-sm text-dim italic line-clamp-3 leading-relaxed">${word.definition_vn || ''}</p>
                        ${word.example ? `<p class="text-sm text-white/40 border-l-2 border-primary/20 pl-3 italic">"${highlightWord(word.example, word.word)}"</p>` : ''}
                    </div>

                </div>
            `;
        });
        return `<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">${wordsHtml}</div>`;
    },

    _renderWordTable(words) {
        let rowsHtml = '';
        words.forEach((word, index) => {
            const tier = SRSEngine.getTier(word.srs_level || 0);
            rowsHtml += `
                <tr class="border-b border-border hover:bg-white/5 transition-colors group">
                    <td class="py-4 px-4 text-xs font-bold text-dim">${index + 1}</td>
                    <td class="py-4 px-4">
                        <div class="flex items-center gap-3">
                            <span class="text-white font-black text-lg">${word.word}</span>
                            <span class="text-[9px] font-black uppercase text-primary/60 bg-primary/5 px-2 py-0.5 rounded">${word.partOfSpeech || ''}</span>
                            ${word.audio_url ? `<button onclick="playVocabAudio('${word.audio_url}')" class="text-dim hover:text-spotify"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 5L6 9H2v6h4l5 4V5z"></path></svg></button>` : ''}
                        </div>
                        <p class="text-xs text-dim font-mono">${word.phonetic || ''}</p>

                    </td>
                    <td class="py-4 px-4">
                        <p class="text-white font-bold text-sm">${word.meaning_vn || word.answer}</p>
                    </td>
                    <td class="py-4 px-4 max-w-xs">
                        <p class="text-sm text-dim italic line-clamp-2 leading-relaxed">${word.definition_vn || ''}</p>
                    </td>
                    <td class="py-4 px-4">
                        <span class="text-xs font-bold px-3 py-1 rounded-full ${tier.color}">${tier.label}</span>
                    </td>
                </tr>
            `;
        });

        return `
            <div class="bg-card rounded-3xl border border-border overflow-hidden shadow-xl">
                <table class="w-full text-left border-collapse">
                    <thead class="bg-dark/30 border-b border-border">





                        <tr>
                            <th class="py-4 px-4 text-[10px] font-black text-dim uppercase tracking-widest w-12">#</th>
                            <th class="py-4 px-4 text-[10px] font-black text-dim uppercase tracking-widest">Từ vựng</th>
                            <th class="py-4 px-4 text-[10px] font-black text-dim uppercase tracking-widest">Ý nghĩa</th>
                            <th class="py-4 px-4 text-[10px] font-black text-dim uppercase tracking-widest">Định nghĩa</th>
                            <th class="py-4 px-4 text-[10px] font-black text-dim uppercase tracking-widest">Cảnh giới</th>
                        </tr>

                    </thead>
                    <tbody>
                        ${rowsHtml}
                    </tbody>
                </table>
            </div>
        `;
    },


    deleteWord(id) {
        if (confirm("Đạo hữu có chắc muốn xóa bí kíp này?")) {
            DataService.deleteWord(id).then(() => {
                this.renderHome();
            });
        }
    },



    startDailyReview() {
        const words = DataService.getDueWords();
        if (words.length === 0) {
            alert("Đạo hữu đã hoàn thành tất cả bài tập hôm nay! Hãy nghỉ ngơi.");
            return;
        }
        this.showPracticeSetup(words);
    },

    startPractice(topicName) {
        const words = DataService.getWordsByTopic(topicName);
        this.showPracticeSetup(words);
    },

    showPracticeSetup(words) {
        const container = document.getElementById('english-module-container');
        container.innerHTML = `
            <div class="flex items-center justify-center min-h-[60vh] animate-[fadeIn_0.5s]">
                <div class="bg-card p-8 rounded-3xl border border-border shadow-2xl max-w-md w-full text-center space-y-8">
                    <div>
                        <h2 class="text-2xl font-black text-white">Thiết Lập Tu Luyện</h2>
                        <p class="text-dim text-sm mt-1">Chọn phương thức rèn luyện tâm đắc</p>
                    </div>

                    <div class="grid grid-cols-2 gap-4">
                        ${this.createModeBtn('flashcard', '🎴', 'Flashcard')}
                        ${this.createModeBtn('reverse', '🔄', 'Flashcard Ngược')}
                        ${this.createModeBtn('typing', '⌨️', 'Điền Từ')}
                        ${this.createModeBtn('listening', '🎧', 'Nghe & Gõ')}
                        <div class="col-span-2">
                            ${this.createModeBtn('quiz', '📝', 'Trắc Nghiệm')}
                        </div>
                    </div>

                    <button onclick="UIManager.initPracticeSession(${JSON.stringify(words.map(w => w.id)).replace(/"/g, '&quot;')})" class="w-full bg-primary text-white font-black py-4 rounded-2xl shadow-xl hover:brightness-110 transition-all">Bắt Đầu Đột Phá</button>
                    
                    <button onclick="UIManager.renderHome()" class="text-dim hover:text-white text-xs font-bold uppercase tracking-widest">Hủy Bỏ</button>
                </div>
            </div>
        `;

        // Default mode
        this.selectedMode = 'flashcard';
    },

    createModeBtn(mode, icon, label) {
        return `
            <button onclick="UIManager.selectMode('${mode}', this)" class="mode-btn p-4 rounded-2xl bg-dark border border-border text-center group transition-all hover:border-primary/30">
                <div class="text-2xl mb-1">${icon}</div>
                <div class="text-[10px] font-bold text-dim uppercase group-hover:text-primary">${label}</div>
            </button>
        `;
    },

    selectMode(mode, btn) {
        this.selectedMode = mode;
        document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('border-primary', 'bg-primary/5'));
        btn.classList.add('border-primary', 'bg-primary/5');
    },

    initPracticeSession(wordIds) {
        const words = DataService.words.filter(w => wordIds.includes(w.id));
        PracticeEngine.startSession(words, this.selectedMode);
        this.renderPracticeScreen();
    },
    renderPracticeScreen() {
        this.activeView = 'practice';
        const card = PracticeEngine.getCurrentCard();
        if (!card) {
            this.renderPracticeResults();
            return;
        }

        const container = document.getElementById('english-module-container');
        const progress = Math.round(((PracticeEngine.session.currentIndex) / PracticeEngine.session.cards.length) * 100);

        container.innerHTML = `
            <div class="animate-[fadeIn_0.5s] max-w-2xl mx-auto space-y-6">
                <!-- Practice Header -->
                <div class="flex justify-between items-center bg-card/40 p-4 rounded-2xl border border-border">
                    <button onclick="UIManager.renderHome()" class="text-dim hover:text-white"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"></polyline></svg></button>
                    <div class="flex-1 px-8">
                        <div class="w-full h-1.5 bg-dark rounded-full overflow-hidden">
                            <div class="h-full bg-primary transition-all duration-500" style="width: ${progress}%"></div>
                        </div>
                    </div>
                    <div class="text-[10px] font-mono font-bold text-primary">${PracticeEngine.session.currentIndex + 1} / ${PracticeEngine.session.cards.length}</div>
                </div>

                <!-- Main Card Area -->
                <div id="practice-card-container" class="min-h-[400px] flex items-center justify-center">
                    ${this.renderCardContent(card)}
                </div>
                <div class="flex justify-center gap-8 text-[10px] font-bold uppercase tracking-widest text-dim">
                    <div class="flex items-center gap-2">🔥 Streak: <span class="text-orange-500">${PracticeEngine.session.stats.combo}</span></div>
                    <div class="flex items-center gap-2">✨ Exp: <span class="text-white">${PracticeEngine.session.stats.totalExp}</span></div>
                </div>
            </div>
        `;

        // Auto-focus typing input
        setTimeout(() => {
            const input = document.getElementById('typing-input');
            if (input) input.focus();
        }, 100);
    },

    renderCardContent(card) {
        const mode = PracticeEngine.session.mode;

        if (mode === 'flashcard' || mode === 'reverse') {
            const front = mode === 'flashcard' ? card.word : (card.meaning_vn || card.answer);
            const back = mode === 'flashcard' ? (card.meaning_vn || card.answer) : card.word;

            return `
                <div id="flashcard" onclick="this.classList.toggle('flipped')" class="w-full max-w-md h-[400px] perspective-1000 cursor-pointer group select-none">
                    <div class="flip-card-inner preserve-3d">
                        <!-- Front -->
                        <div class="flip-card-front absolute inset-0 bg-card rounded-[40px] border border-border shadow-2xl flex flex-col items-center justify-center p-8 backface-hidden">
                            <div class="w-16 h-1 bg-white/10 rounded-full mb-8"></div>
                            <p class="text-dim text-[10px] font-black uppercase tracking-[0.3em] mb-4">Front Side</p>
                            <h3 class="text-5xl font-black text-white text-center tracking-tighter">${front}</h3>
                            ${card.audio_url ? `
                                <button onclick="event.stopPropagation(); playVocabAudio('${card.audio_url}')" class="mt-8 w-14 h-14 rounded-full bg-primary/10 border border-primary/20 text-primary flex items-center justify-center hover:scale-110 transition-all shadow-lg">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M11 5L6 9H2v6h4l5 4V5z"></path><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>
                                </button>
                            ` : ''}
                            <p class="text-dim/40 text-[9px] font-bold uppercase tracking-widest mt-auto mb-4 animate-pulse">Click to Reveal</p>
                        </div>
                        <!-- Back -->
                        <div class="flip-card-back absolute inset-0 bg-card rounded-[40px] border border-border shadow-2xl flex flex-col items-center justify-between p-8 backface-hidden rotate-y-180">
                            <div class="w-full text-center">
                                <p class="text-dim text-[10px] font-black uppercase tracking-[0.3em] mb-6">Back Side</p>
                                <h3 class="text-4xl font-black text-white tracking-tight">${back}</h3>
                                <div class="flex items-center justify-center gap-2 mt-2">
                                    <span class="text-[9px] font-black uppercase text-primary/60 bg-primary/5 px-2 py-0.5 rounded">${card.partOfSpeech || ''}</span>
                                    <span class="text-xs text-dim font-mono">${card.phonetic || ''}</span>
                                </div>
                            </div>
                            
                            <div class="w-full text-center space-y-4 px-2 overflow-y-auto custom-scrollbar max-h-[160px] py-4">
                                <p class="text-white font-bold text-lg leading-snug">${card.meaning_vn || card.answer}</p>
                                <p class="text-dim text-sm italic leading-relaxed">${card.definition_vn || ''}</p>
                                ${card.example ? `<p class="text-white/60 text-xs italic border-l-2 border-primary/20 pl-4 py-1 text-left">"${highlightWord(card.example, card.word)}"</p>` : ''}
                            </div>
                            
                            <!-- Control Buttons -->
                            <div class="flex gap-2 w-full pt-4" onclick="event.stopPropagation()">
                                <button onclick="UIManager.handleAnswer(1)" class="flex-1 py-3 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 font-black text-[10px] hover:bg-red-500 hover:text-white transition-all uppercase tracking-widest">Again</button>
                                <button onclick="UIManager.handleAnswer(3)" class="flex-1 py-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500 font-black text-[10px] hover:bg-amber-500 hover:text-white transition-all uppercase tracking-widest">Hard</button>
                                <button onclick="UIManager.handleAnswer(4)" class="flex-1 py-3 rounded-2xl bg-primary/10 border border-primary/20 text-primary font-black text-[10px] hover:bg-primary hover:text-white transition-all uppercase tracking-widest">Good</button>
                                <button onclick="UIManager.handleAnswer(5)" class="flex-1 py-3 rounded-2xl bg-white/5 border border-white/10 text-white font-black text-[10px] hover:bg-white hover:text-black transition-all uppercase tracking-widest">Easy</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }

        if (mode === 'typing') {
            return `
                <div class="bg-card p-8 rounded-3xl border-2 border-border shadow-2xl w-full max-w-md space-y-6 text-center animate-[fadeIn_0.3s]">
                    <p class="text-dim text-[10px] font-bold uppercase tracking-widest">Dịch sang tiếng Anh</p>
                    <h3 class="text-3xl font-black text-white">${card.meaning_vn || card.answer}</h3>
                    <p class="text-dim text-xs italic">"${card.definition_vn || ''}"</p>
                    
                    <div class="pt-4">
                        <input type="text" id="typing-input" placeholder="Gõ câu trả lời..." class="w-full bg-dark border-2 border-border focus:border-primary rounded-2xl p-4 text-center text-xl text-white outline-none transition-all shadow-inner" onkeypress="if(event.key === 'Enter') UIManager.checkTypingAnswer()" autofocus>
                    </div>
                    
                    <button onclick="UIManager.checkTypingAnswer()" class="w-full bg-primary text-white font-black py-3 rounded-xl shadow-lg mt-2">Kiểm Tra</button>
                </div>
            `;
        }

        if (mode === 'quiz') {
            const options = PracticeEngine.generateQuizOptions(card.word);
            return `
                <div class="bg-card p-8 rounded-3xl border-2 border-border shadow-2xl w-full max-w-md space-y-6 animate-[fadeIn_0.3s]">
                    <div class="text-center">
                        <p class="text-dim text-[10px] font-bold uppercase tracking-widest mb-2">Chọn nghĩa đúng</p>
                        <h3 class="text-4xl font-black text-white">${card.word}</h3>
                    </div>
                    
                    <div class="grid grid-cols-1 gap-3 pt-4">
                        ${options.map((opt, idx) => `
                            <button data-index="${idx + 1}" onclick="UIManager.checkQuizAnswer('${opt.replace(/'/g, "\\'")}', '${(card.meaning_vn || card.answer).replace(/'/g, "\\'")}')" class="quiz-option-btn p-4 rounded-2xl bg-dark border border-border text-left hover:border-primary/50 hover:bg-primary/5 transition-all text-sm font-bold text-gray-300 group flex items-center justify-between">
                                <span><span class="text-dim mr-2 font-mono text-xs">${idx + 1}.</span> ${opt}</span>
                                <span class="text-[10px] text-dim group-hover:text-primary font-mono opacity-0 group-hover:opacity-100 transition-opacity">Phím [${idx + 1}]</span>
                            </button>
                        `).join('')}
                    </div>
                </div>
            `;
        }

        if (mode === 'listening') {
            // Play audio automatically on load
            setTimeout(() => playVocabAudio(card.audio_url), 500);

            return `
                <div class="bg-card p-8 rounded-3xl border-2 border-border shadow-2xl w-full max-w-md space-y-6 text-center animate-[fadeIn_0.3s]">
                    <p class="text-dim text-[10px] font-bold uppercase tracking-widest">Nghe và Gõ lại từ</p>
                    
                    <div class="flex justify-center">
                        <button onclick="playVocabAudio('${card.audio_url}')" class="w-20 h-20 rounded-full bg-spotify/10 border-2 border-spotify/30 text-spotify flex items-center justify-center hover:scale-110 transition-all shadow-lg group">
                            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="group-hover:animate-pulse"><path d="M11 5L6 9H2v6h4l5 4V5z"></path><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>
                        </button>
                    </div>

                    <p class="text-dim text-xs italic">"${card.meaning_vn || card.answer}"</p>
                    
                    <div class="pt-4">
                        <input type="text" id="typing-input" placeholder="Nghe và gõ từ..." class="w-full bg-dark border-2 border-border focus:border-spotify rounded-2xl p-4 text-center text-xl text-white outline-none transition-all shadow-inner" onkeypress="if(event.key === 'Enter') UIManager.checkTypingAnswer()" autofocus>
                    </div>
                    
                    <button onclick="UIManager.checkTypingAnswer()" class="w-full bg-spotify text-black font-black py-3 rounded-xl shadow-lg mt-2 hover:brightness-110 transition-all">Kiểm Tra Linh Cảm</button>
                </div>
            `;
        }

    },

    handleAnswer(quality) {
        const result = PracticeEngine.submitAnswer(quality);
        if (result && !result.isFinished) {
            this.renderPracticeScreen();
        } else {
            this.renderPracticeResults();
        }
    },

    checkTypingAnswer() {
        const input = document.getElementById('typing-input');
        if (!input) return;

        const card = PracticeEngine.getCurrentCard();
        const quality = PracticeEngine.checkTyping(input.value, card.word);

        const isCorrect = quality >= 3;
        const container = document.getElementById('practice-card-container');

        // Feedback
        if (isCorrect) {
            container.innerHTML = `
                <div class="text-center space-y-4 animate-[bounce_0.5s]">
                    <div class="text-6xl">✨</div>
                    <h3 class="text-3xl font-black text-spotify">Chính Xác!</h3>
                    <p class="text-white text-xl">${card.word}</p>
                    <button id="btn-practice-continue" onclick="UIManager.handleAnswer(5)" class="px-8 py-3 bg-spotify text-black font-black rounded-xl mt-4">Tiếp Tục</button>
                </div>
            `;
        } else {
            container.innerHTML = `
                <div class="text-center space-y-4 animate-[shake_0.5s]">
                    <div class="text-6xl">❌</div>
                    <h3 class="text-3xl font-black text-red-500">Sai Mất Rồi!</h3>
                    <p class="text-dim text-sm">Đáp án đúng là:</p>
                    <p class="text-white text-xl font-bold">${card.word}</p>
                    <button id="btn-practice-continue" onclick="UIManager.handleAnswer(1)" class="px-8 py-3 bg-gray-700 text-white font-black rounded-xl mt-4">Tiếp Tục</button>
                </div>
            `;
        }
    },

    checkQuizAnswer(selected, correct) {
        const isCorrect = selected === correct;
        const container = document.getElementById('practice-card-container');

        if (isCorrect) {
            container.innerHTML = `
                <div class="text-center space-y-4 animate-[bounce_0.5s]">
                    <div class="text-6xl">✨</div>
                    <h3 class="text-3xl font-black text-spotify">Chính Xác!</h3>
                    <button id="btn-practice-continue" onclick="UIManager.handleAnswer(5)" class="px-8 py-3 bg-spotify text-black font-black rounded-xl mt-4">Tiếp Tục</button>
                </div>
            `;
        } else {
            container.innerHTML = `
                <div class="text-center space-y-4">
                    <div class="text-6xl">❌</div>
                    <h3 class="text-3xl font-black text-red-500">Sai Rồi!</h3>
                    <p class="text-dim text-sm">Đáp án đúng là:</p>
                    <p class="text-white text-xl font-bold">${correct}</p>
                    <button id="btn-practice-continue" onclick="UIManager.handleAnswer(1)" class="px-8 py-3 bg-gray-700 text-white font-black rounded-xl mt-4">Tiếp Tục</button>
                </div>
            `;
        }
    },

    renderPracticeResults() {
        this.activeView = 'results';
        const stats = PracticeEngine.session.stats;
        const total = PracticeEngine.session.cards.length;
        const accuracy = Math.round((stats.correct / total) * 100);

        const container = document.getElementById('english-module-container');
        container.innerHTML = `
            <div class="max-w-md mx-auto bg-card rounded-3xl border-2 border-primary/30 shadow-2xl p-8 text-center space-y-8 animate-[fadeIn_0.5s]">
                <div class="relative">
                    <div class="w-24 h-24 bg-primary/20 rounded-full mx-auto flex items-center justify-center text-4xl shadow-[0_0_20px_rgba(59,130,246,0.3)]">🏆</div>
                    <div class="absolute inset-0 bg-primary/10 rounded-full animate-ping"></div>
                </div>

                <div>
                    <h2 class="text-3xl font-black text-white tracking-tight">Tu Luyện Hoàn Tất</h2>
                    <p class="text-dim text-sm mt-1">Đạo hữu đã có một phiên rèn luyện tinh tấn</p>
                </div>

                <div class="grid grid-cols-2 gap-4">
                    <div class="p-4 rounded-2xl bg-dark/40 border border-border">
                        <p class="text-dim text-[10px] font-bold uppercase">Độ Chính Xác</p>
                        <p class="text-white font-black text-2xl">${accuracy}%</p>
                    </div>
                    <div class="p-4 rounded-2xl bg-dark/40 border border-border">
                        <p class="text-dim text-[10px] font-bold uppercase">Tu Vi Tích Lũy</p>
                        <p class="text-spotify font-black text-2xl">+${stats.totalExp}</p>
                    </div>
                    <div class="p-4 rounded-2xl bg-dark/40 border border-border">
                        <p class="text-dim text-[10px] font-bold uppercase">Chuỗi Combo</p>
                        <p class="text-orange-500 font-black text-2xl">${stats.maxCombo}</p>
                    </div>
                    <div class="p-4 rounded-2xl bg-dark/40 border border-border">
                        <p class="text-dim text-[10px] font-bold uppercase">Số Câu Đúng</p>
                        <p class="text-primary font-black text-2xl">${stats.correct}/${total}</p>
                    </div>
                </div>

                <div class="space-y-3">
                    <button onclick="UIManager.renderHome()" class="w-full bg-primary text-white font-black py-4 rounded-2xl shadow-xl hover:brightness-110 transition-all">Thu Nhận Tu Vi</button>
                    <button onclick="UIManager.startDailyReview()" class="w-full bg-dark border border-border text-dim hover:text-white font-bold py-3 rounded-2xl transition-all">Tu Luyện Tiếp</button>
                </div>
            </div>
        `;
    },

    showHelpModal() {
        const modal = document.getElementById('english-help-modal');
        if (modal) {
            modal.classList.remove('hidden');
            setTimeout(() => {
                modal.classList.remove('opacity-0');
                modal.querySelector('div').classList.remove('scale-95');
                modal.querySelector('div').classList.add('scale-100');
            }, 10);
        }
    },

    hideHelpModal() {
        const modal = document.getElementById('english-help-modal');
        if (modal) {
            modal.classList.add('opacity-0');
            modal.querySelector('div').classList.remove('scale-100');
            modal.querySelector('div').classList.add('scale-95');
            setTimeout(() => {
                modal.classList.add('hidden');
            }, 300);
        }
    },

    _renderTopicCards(topics) {
        return topics.map(topic => {
            const percent = Math.round((topic.mastered / topic.total) * 100) || 0;
            const coverStyle = this._getTopicCover(topic.name);

            return `
                <div onclick="UIManager.renderWordList('${topic.name}')" class="group cursor-pointer relative overflow-hidden rounded-[40px] aspect-[16/10] bg-card border border-border hover:shadow-2xl transition-all">




                    <div class="absolute inset-0 transition-transform duration-1000 group-hover:scale-110">
                        ${coverStyle}
                    </div>
                    
                    <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent p-6 flex flex-col justify-end">
                        <div class="space-y-4">
                            <div class="space-y-2">
                                <div class="flex justify-between items-end">
                                    <span class="text-[10px] font-black text-white/40 uppercase tracking-widest">Tiến độ lĩnh hội</span>
                                    <span class="text-xs font-black text-white">${topic.mastered}<span class="text-white/40"> / ${topic.total}</span></span>
                                </div>
                                <div class="w-full h-2 bg-dark/50 rounded-full overflow-hidden p-0.5 border border-border/30">
                                    <div class="h-full bg-primary rounded-full transition-all duration-1000 shadow-[0_0_8px_rgba(59,130,246,0.5)]" style="width: ${percent}%"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;

        }).join('');
    },

    _getTopicCover(name) {
        return `
            <div class="w-full h-full bg-dark flex items-center justify-center relative overflow-hidden">
                <div class="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent"></div>
                <!-- Clean Plain Name -->
                <span class="text-7xl font-black text-white uppercase tracking-tighter select-none z-10">${name}</span>
                
                <!-- Subtle Grid Decor -->
                <div class="absolute inset-0 opacity-[0.03] pattern-grid-white/50"></div>
                
                <div class="absolute top-6 left-6 text-[8px] font-bold text-dim uppercase tracking-[0.2em]">
                    Archive // ${name.slice(0, 3)}
                </div>
            </div>
        `;
    }

};

