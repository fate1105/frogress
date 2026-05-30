/**
 * SRSEngine - Advanced SM-2 Spaced Repetition System
 * Based on Anki-style logic for optimal long-term memory.
 */
const SRSEngine = {
    // Constants
    CONSTANTS: {
        EASE_MIN: 1.30,
        EASE_MAX: 3.50,
        EASE_DEFAULT: 2.50,
        INTERVAL_MIN: 1,
        INTERVAL_MAX: 365,
        LEECH_THRESHOLD: 8,
        HARD_MULTIPLIER: 1.20,
        EASY_BONUS: 1.30,
        FUZZ_RANGE: 0.05, // ±5%
        OVERDUE_BONUS_FACTOR: 0.5
    },

    /**
     * Process a word assessment and return updated SRS metadata
     * @param {Object} word - The word object
     * @param {Number} quality - Assessment quality (1: Again, 3: Hard, 4: Good, 5: Easy)
     */
    processCard(word, quality) {
        // Initialize SRS fields if missing
        const srs = {
            level: word.srs_level || 0,
            interval: word.interval || 0,
            ease: word.ease_factor || this.CONSTANTS.EASE_DEFAULT,
            lapses: word.lapses || 0,
            state: word.state || 'NEW', // NEW, LEARNING, REVIEW, RELEARNING
            next_review: word.next_review
        };

        // 1. Handle Lapses (Leech Detection)
        if (quality === 1 && srs.state === 'REVIEW') {
            srs.lapses += 1;
        }

        // 2. State Transitions & Logic
        if (srs.state === 'NEW' || srs.state === 'LEARNING' || srs.state === 'RELEARNING') {
            this._handleLearningPhase(srs, quality);
        } else {
            this._handleReviewPhase(srs, quality);
        }

        // 3. Update Ease Factor
        this._updateEase(srs, quality);

        // 4. Final Constraints
        srs.interval = Math.min(this.CONSTANTS.INTERVAL_MAX, srs.interval);
        
        // Calculate next review date
        const nextReviewDate = new Date();
        nextReviewDate.setDate(nextReviewDate.getDate() + srs.interval);

        return {
            srs_level: srs.level,
            interval: srs.interval,
            ease_factor: parseFloat(srs.ease.toFixed(2)),
            lapses: srs.lapses,
            state: srs.state,
            next_review: nextReviewDate.toISOString().split('T')[0],
            status: srs.level >= 10 ? 'mastered' : 'learning'
        };
    },

    _handleLearningPhase(srs, quality) {
        // Learning Logic: Again/Hard stay in learning, Good/Easy graduate
        if (quality === 1 || quality === 3) {
            srs.state = srs.state === 'RELEARNING' ? 'RELEARNING' : 'LEARNING';
            srs.interval = 0; // Stays in current session
        } else if (quality === 4) { // Good
            if (srs.state === 'RELEARNING') {
                // If relearning, graduate with 50% of previous interval
                srs.interval = Math.max(1, Math.round(srs.interval * 0.5));
            } else {
                srs.interval = 1; // Graduate to 1 day
            }
            srs.state = 'REVIEW';
            srs.level += 1;
        } else if (quality === 5) { // Easy
            srs.interval = 4; // Graduate to 4 days
            srs.state = 'REVIEW';
            srs.level += 2;
        }
    },

    _handleReviewPhase(srs, quality) {
        if (quality === 1) { // Again
            srs.state = 'RELEARNING';
            // Save current interval for RELEARNING calculation later
            srs.interval = srs.interval; 
            srs.interval = 0; // Review immediately in session
            return;
        }

        // Calculate overdue bonus
        let overdueDays = 0;
        if (srs.next_review) {
            const today = new Date();
            const due = new Date(srs.next_review);
            overdueDays = Math.max(0, Math.floor((today - due) / (1000 * 60 * 60 * 24)));
        }
        const bonus = Math.round(overdueDays * this.CONSTANTS.OVERDUE_BONUS_FACTOR);

        let nextInterval = srs.interval;

        if (quality === 3) { // Hard
            nextInterval = Math.round(srs.interval * this.CONSTANTS.HARD_MULTIPLIER);
        } else if (quality === 4) { // Good
            nextInterval = Math.round(srs.interval * srs.ease);
        } else if (quality === 5) { // Easy
            nextInterval = Math.round(srs.interval * srs.ease * this.CONSTANTS.EASY_BONUS);
        }

        // Apply bonus and forward progress rule
        srs.interval = Math.max(nextInterval + bonus, srs.interval + 1);
        srs.level += 1;
    },

    _updateEase(srs, quality) {
        if (quality === 1) srs.ease -= 0.20;
        else if (quality === 3) srs.ease -= 0.15;
        else if (quality === 5) srs.ease += 0.15;

        // Clamp ease
        srs.ease = Math.max(this.CONSTANTS.EASE_MIN, Math.min(this.CONSTANTS.EASE_MAX, srs.ease));
    },

    /**
     * Get visual tier based on SRS level
     */
    getTier(level) {
        if (level === 0) return { label: "Nhập Môn", color: "text-gray-400 bg-gray-500/10 border-gray-500/20" };
        if (level < 3) return { label: "Tiểu Thành", color: "text-blue-400 bg-blue-500/10 border-blue-500/20" };
        if (level < 6) return { label: "Đại Thành", color: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20" };
        if (level < 9) return { label: "Viên Mãn", color: "text-purple-400 bg-purple-500/10 border-purple-500/20" };
        if (level < 12) return { label: "Đại Viên Mãn", color: "text-orange-400 bg-orange-500/10 border-orange-500/20" };
        return { label: "Xuất Thần Nhập Hóa", color: "text-white bg-white/10 border-white/20" };
    },

    /**
     * Apply Fuzzing to interval (Server-side simulation)
     */
    applyFuzz(interval) {
        const range = Math.max(1, Math.round(interval * this.CONSTANTS.FUZZ_RANGE));
        const fuzz = Math.floor(Math.random() * (2 * range + 1)) - range;
        return interval + fuzz;
    }
};

window.SRSEngine = SRSEngine;
