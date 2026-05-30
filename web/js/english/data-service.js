/**
 * DataService - Manages all data interactions for the English module.
 * Bridges the UI/Engine logic with the Eel backend.
 */
const DataService = {
    words: [],
    topics: {},

    async loadData() {
        try {
            // Call existing backend function
            const response = await eel.get_toeic_data()();
            this.words = response.vocal || [];
            this.processTopics();

            // Fetch user stats for cultivation level
            this.userStats = await eel.get_user_stats()();
            
            return this.words;
        } catch (error) {
            console.error("Failed to load English data:", error);
            return [];
        }
    },


    processTopics() {
        this.topics = {};
        this.words.forEach(word => {
            const topic = word.topic || 'General';
            if (!this.topics[topic]) {
                this.topics[topic] = {
                    name: topic,
                    total: 0,
                    mastered: 0,
                    learning: 0,
                    new: 0,
                    words: []
                };
            }
            
            const stats = this.topics[topic];
            stats.total++;
            stats.words.push(word);

            const status = word.status || 'new';
            if (status === 'mastered') stats.mastered++;
            else if (status === 'learning') stats.learning++;
            else stats.new++;
        });
    },

    getWordsByTopic(topicName) {
        if (topicName.toLowerCase() === 'all') return this.words;
        return this.words.filter(w => w.topic === topicName);
    },

    async updateWord(word) {
        try {
            // Find in local array and update
            const index = this.words.findIndex(w => w.id === word.id);
            if (index !== -1) {
                this.words[index] = word;
            }
            
            // Sync with backend
            await eel.update_toeic_item('vocal', word)();
            this.processTopics(); // Refresh stats
            return true;
        } catch (error) {
            console.error("Failed to update word:", error);
            return false;
        }
    },

    async deleteWord(wordId) {
        try {
            await eel.delete_toeic_item('vocal', wordId)();
            this.words = this.words.filter(w => w.id !== wordId);
            this.processTopics();
            return true;
        } catch (error) {
            console.error("Failed to delete word:", error);
            return false;
        }
    },

    getDueWords() {
        const now = new Date();
        return this.words.filter(word => {
            if (!word.next_review) return true; // New words
            return new Date(word.next_review) <= now;
        });
    },

    getStats() {
        const total = this.words.length;
        const mastered = this.words.filter(w => w.status === 'mastered').length;
        const learning = this.words.filter(w => w.status === 'learning').length;
        const due = this.getDueWords().length;
        
        return {
            total,
            mastered,
            learning,
            new: total - mastered - learning,
            due,
            memoryRate: total > 0 ? Math.round((mastered / total) * 100) : 0
        };
    }
};
