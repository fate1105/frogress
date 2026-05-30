/**
 * PracticeEngine - Manages study sessions and exercise logic
 * Implements re-queueing and session-based queue management.
 */
const PracticeEngine = {
    session: {
        cards: [],
        currentIndex: 0,
        mode: 'flashcard',
        stats: {
            correct: 0,
            total: 0,
            totalExp: 0,
            combo: 0,
            maxCombo: 0,
            responses: { 1: 0, 3: 0, 4: 0, 5: 0 }
        }
    },

    /**
     * Start a new session
     * @param {Array} words - Available words for the session
     * @param {String} mode - Practice mode
     */
    startSession(words, mode) {
        // Build Queue: Overdue > Due Today > New (Limit 20)
        const today = new Date().toISOString().split('T')[0];
        
        const overdue = words.filter(w => w.next_review && w.next_review < today);
        const dueToday = words.filter(w => w.next_review === today);
        const newWords = words.filter(w => !w.next_review);

        let queue = [...overdue, ...dueToday];
        
        // Fill up to 20 with new words
        if (queue.length < 20) {
            queue = [...queue, ...newWords.slice(0, 20 - queue.length)];
        } else {
            queue = queue.slice(0, 20);
        }

        // Shuffle queue initially
        queue = this._shuffle(queue);

        this.session = {
            cards: queue,
            mode: mode,
            currentIndex: 0,
            stats: {
                correct: 0,
                total: 0,
                totalExp: 0,
                combo: 0,
                maxCombo: 0,
                responses: { 1: 0, 3: 0, 4: 0, 5: 0 }
            }
        };

        return this.session;
    },

    getCurrentCard() {
        if (!this.session || this.session.currentIndex >= this.session.cards.length) return null;
        return this.session.cards[this.session.currentIndex];
    },

    /**
     * Handle user response (Replacing submitAnswer)
     * @param {Number} quality - Assessment (1, 3, 4, 5)
     */
    submitAnswer(quality) {
        const card = this.getCurrentCard();
        if (!card) return null;

        // Process SRS logic
        const update = SRSEngine.processCard(card, quality);
        
        // Track stats
        this.session.stats.total++;
        this.session.stats.responses[quality] = (this.session.stats.responses[quality] || 0) + 1;
        
        const isCorrect = quality >= 4;
        if (isCorrect) {
            this.session.stats.correct++;
            this.session.stats.combo++;
            this.session.stats.maxCombo = Math.max(this.session.stats.maxCombo, this.session.stats.combo);
            this.session.stats.totalExp += (quality === 5 ? 2 : 1);
            
            // Record to system for quests
            eel.record_english_study()();
        } else {
            this.session.stats.combo = 0;
        }

        // Update data service (save changes permanently)
        DataService.updateWord({ ...card, ...update });

        // Re-queue logic if in learning phase (Again or Hard)
        // update.state comes from SRSEngine.processCard
        if (update.state === 'LEARNING' || update.state === 'RELEARNING') {
            const steps = quality === 1 ? 5 : 8;
            this._requeueCard(card, steps);
        }

        this.session.currentIndex++;
        return { 
            card, 
            update, 
            isCorrect,
            isFinished: this.session.currentIndex >= this.session.cards.length 
        };
    },

    _requeueCard(card, steps) {
        const insertAt = Math.min(this.session.cards.length, this.session.currentIndex + steps + 1);
        // Insert a copy of the card so session state doesn't conflict with database state until end
        this.session.cards.splice(insertAt, 0, { ...card });
    },

    _shuffle(array) {
        const newArr = [...array];
        for (let i = newArr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
        }
        return newArr;
    },

    checkTyping(input, target) {
        const cleanInput = input.trim().toLowerCase();
        const cleanTarget = target.trim().toLowerCase();
        if (cleanInput === cleanTarget) return 5; 
        if (this.isCloseEnough(cleanInput, cleanTarget)) return 3;
        return 1; // Again
    },

    isCloseEnough(s1, s2) {
        if (Math.abs(s1.length - s2.length) > 2) return false;
        let dist = 0;
        for (let i = 0; i < Math.min(s1.length, s2.length); i++) {
            if (s1[i] !== s2[i]) dist++;
        }
        dist += Math.abs(s1.length - s2.length);
        return dist <= 2;
    },

    generateQuizOptions(word) {
        const card = this.session.cards.find(c => c.word === word) || {};
        const correctAnswer = card.meaning_vn || card.answer;
        
        // Get other meanings as distractors
        let distractors = DataService.words
            .filter(w => w.word !== word)
            .map(w => w.meaning_vn || w.answer)
            .filter(m => m !== correctAnswer);
            
        distractors = this._shuffle(distractors).slice(0, 3);
        
        return this._shuffle([correctAnswer, ...distractors]);
    }
};

window.PracticeEngine = PracticeEngine;
