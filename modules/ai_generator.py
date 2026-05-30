from google import genai
import json
import os
from config import BASE_DIR

class AIGenerator:
    def __init__(self):
        self.client = None
        self.api_key = None
        self.model_id = 'gemini-flash-latest' # Sử dụng bản latest để tự động chọn model khả dụng

    def _load_api_key(self):
        secrets_path = os.path.join(BASE_DIR, "data", "secrets.json")
        if os.path.exists(secrets_path):
            try:
                with open(secrets_path, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    key = data.get("gemini_api_key")
                    if key and key != "YOUR_GEMINI_API_KEY_HERE":
                        return key
            except:
                pass
        return None

    def _ensure_client(self):
        new_key = self._load_api_key()
        if new_key and new_key != self.api_key:
            self.api_key = new_key
            self.client = genai.Client(api_key=self.api_key)
        return self.client is not None

    def generate_toeic_questions(self, words_text):
        if not self._ensure_client():
            return {"status": "error", "msg": "Chưa cấu hình Gemini API Key trong data/secrets.json hoặc Key không hợp lệ."}

        # Xử lý danh sách từ (tách theo dấu phẩy hoặc xuống dòng)
        words = [w.strip() for w in words_text.replace('\n', ',').split(',') if w.strip()]
        if not words:
            return {"status": "error", "msg": "Không tìm thấy từ vựng nào để xử lý."}

        prompt = f"""
        Generate exactly ONE vocabulary entry for EACH of the following English words: {', '.join(words)}.
        For each word, generate premium dictionary-grade learning data.
        Return the result strictly as a JSON array of objects. 
        Each object MUST have:
        - "word": The word itself (all lowercase unless proper noun), e.g., "substantial".
        - "meaning_vn": Clear Vietnamese translation, e.g., "lớn lao, đáng kể".
        - "partOfSpeech": Lowercase grammatical part of speech, e.g., "adjective", "noun", "verb", "adverb".
        - "phonetic": International Phonetic Alphabet (IPA) representation, e.g., "/səbˈstæn.ʃəl/".
        - "definition_en": Simple, concise English definition, e.g., "large in size, value, or importance".
        - "definition_vn": Concise Vietnamese definition, e.g., "lớn về kích thước, giá trị hoặc tầm quan trọng".
        - "example": A realistic, helpful usage example sentence containing the word, e.g., "The findings show a substantial difference between the two groups.".
        - "topic": One of these specific topics: 'Daily Life', 'Business', 'Technology', 'Entertainment', 'Travel', 'Health', 'Education', 'Finance', 'General', 'Family', 'Sports'.
        - "level": English learner level: "A1", "A2", "B1", "B2", "C1", or "C2".

        Example format:
        [
            {{
                "word": "fate",
                "meaning_vn": "vận mệnh, số phận",
                "partOfSpeech": "noun",
                "phonetic": "/feɪt/",
                "definition_en": "a power that some people believe controls and decides everything that happens",
                "definition_vn": "sức mạnh mà một số người tin là kiểm soát và quyết định mọi việc xảy ra",
                "example": "We still don't know the fate of the missing plane.",
                "topic": "General",
                "level": "B1"
            }}
        ]
        """

        try:
            response = self.client.models.generate_content(
                model=self.model_id,
                contents=prompt
            )
            # Trích xuất JSON từ phản hồi
            content = response.text
            if "```json" in content:
                content = content.split("```json")[1].split("```")[0].strip()
            elif "```" in content:
                content = content.split("```")[1].split("```")[0].strip()
            
            questions = json.loads(content)
            if isinstance(questions, list):
                return {"status": "success", "data": questions}
            else:
                return {"status": "error", "msg": "AI trả về dữ liệu không đúng định dạng."}
        except Exception as e:
            return {"status": "error", "msg": f"Lỗi AI: {str(e)}"}

ai_gen = AIGenerator()
