import os
import json
import shutil
import base64
from config import CONFIG_PATHS

class EpubManager:
    def __init__(self):
        self.epub_dir = CONFIG_PATHS["epub_data"]
        os.makedirs(self.epub_dir, exist_ok=True)
        self.metadata_file = os.path.join(self.epub_dir, "metadata.json")
        self._init_metadata()

    def _init_metadata(self):
        if not os.path.exists(self.metadata_file):
            with open(self.metadata_file, "w", encoding="utf-8") as f:
                json.dump([], f)

    def get_epub_list(self):
        try:
            with open(self.metadata_file, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            print(f"Error reading epub metadata: {e}")
            return []

    def save_epub(self, filename, base64_data):
        try:
            # Clean filename
            safe_filename = "".join([c for c in filename if c.isalnum() or c in "._- "]).strip()
            file_path = os.path.join(self.epub_dir, safe_filename)
            
            # Decode and save file
            file_bytes = base64.b64decode(base64_data)
            with open(file_path, "wb") as f:
                f.write(file_bytes)
            
            # Update metadata
            metadata = self.get_epub_list()
            # Check if exists
            exists = False
            for item in metadata:
                if item["filename"] == safe_filename:
                    exists = True
                    break
            
            if not exists:
                metadata.append({
                    "title": safe_filename.replace(".epub", ""),
                    "filename": safe_filename,
                    "added_at": os.path.getctime(file_path)
                })
                
                with open(self.metadata_file, "w", encoding="utf-8") as f:
                    json.dump(metadata, f, indent=4, ensure_ascii=False)
            
            return {"status": "success", "filename": safe_filename}
        except Exception as e:
            return {"status": "error", "msg": str(e)}

    def create_series(self, series_name, filenames):
        try:
            metadata = self.get_epub_list()
            series_id = f"series_{int(os.path.getctime(self.metadata_file))}_{len(metadata)}.series"
            
            new_series = {
                "title": series_name,
                "filename": series_id,
                "is_series": True,
                "parts": filenames,
                "added_at": os.path.getctime(self.metadata_file)
            }
            
            metadata.append(new_series)
            
            with open(self.metadata_file, "w", encoding="utf-8") as f:
                json.dump(metadata, f, indent=4, ensure_ascii=False)
            
            return {"status": "success"}
        except Exception as e:
            return {"status": "error", "msg": str(e)}

    def update_series_parts(self, series_filename, new_parts):
        try:
            metadata = self.get_epub_list()
            for item in metadata:
                if item["filename"] == series_filename:
                    item["parts"] = new_parts
                    break
            
            with open(self.metadata_file, "w", encoding="utf-8") as f:
                json.dump(metadata, f, indent=4, ensure_ascii=False)
            
            return {"status": "success"}
        except Exception as e:
            return {"status": "error", "msg": str(e)}

    def delete_epub(self, filename):
        try:
            # Nếu là file thật thì mới xóa vật lý
            if not filename.endswith('.series'):
                file_path = os.path.join(self.epub_dir, filename)
                if os.path.exists(file_path):
                    os.remove(file_path)
            
            metadata = self.get_epub_list()
            metadata = [item for item in metadata if item["filename"] != filename]
            
            with open(self.metadata_file, "w", encoding="utf-8") as f:
                json.dump(metadata, f, indent=4, ensure_ascii=False)
            
            return {"status": "success"}
        except Exception as e:
            return {"status": "error", "msg": str(e)}

    def save_reading_progress(self, filename, cfi, read_chapters=None):
        try:
            metadata = self.get_epub_list()
            updated = False
            for item in metadata:
                if item["filename"] == filename:
                    item["last_cfi"] = cfi
                    if read_chapters is not None:
                        # Merge read chapters
                        current_read = set(item.get("read_chapters", []))
                        current_read.update(read_chapters)
                        item["read_chapters"] = list(current_read)
                    updated = True
                    break
            
            if updated:
                with open(self.metadata_file, "w", encoding="utf-8") as f:
                    json.dump(metadata, f, indent=4, ensure_ascii=False)
            
            return {"status": "success"}
        except Exception as e:
            return {"status": "error", "msg": str(e)}

    def get_reading_progress(self, filename):
        try:
            metadata = self.get_epub_list()
            for item in metadata:
                if item["filename"] == filename:
                    return {
                        "status": "success", 
                        "cfi": item.get("last_cfi"),
                        "read_chapters": item.get("read_chapters", [])
                    }
            return {"status": "error", "msg": "Progress not found"}
        except Exception as e:
            return {"status": "error", "msg": str(e)}

    def get_epub_data(self, filename):
        try:
            file_path = os.path.join(self.epub_dir, filename)
            if not os.path.exists(file_path):
                return {"status": "error", "msg": "File not found"}
                
            with open(file_path, "rb") as f:
                data = f.read()
                return {"status": "success", "data": base64.b64encode(data).decode('utf-8')}
        except Exception as e:
            return {"status": "error", "msg": str(e)}

epub_manager = EpubManager()
