import yt_dlp
import os
import threading
import eel
from config import CONFIG_PATHS

# Lấy đường dẫn thư mục Downloads của hệ thống
HOME_DOWNLOADS = os.path.join(os.path.expanduser("~"), "Downloads")
OMNI_DIR = HOME_DOWNLOADS

class UniversalDownloader:
    def __init__(self):
        self._current_progress = {}

    def progress_hook(self, d):
        if d['status'] == 'downloading':
            p = d.get('_percent_str', '0%').replace('%', '').strip()
            # Cập nhật tiến độ lên UI thông qua eel
            filename = d.get('info_dict', {}).get('title', 'Unknown')
            try:
                eel.update_omni_progress(filename, p, "downloading")()
            except: pass
        elif d['status'] == 'finished':
            filename = d.get('info_dict', {}).get('title', 'Unknown')
            try:
                eel.update_omni_progress(filename, "100", "processing")()
            except: pass

    def download(self, url, mode='video', quality='best'):
        """
        mode: 'video' hoặc 'audio'
        quality: 'best', '720', '480' (chỉ áp dụng cho video)
        """
        # Video/Audio sẽ được tải về thư mục Downloads của máy tính
        output_dir = OMNI_DIR
        if not os.path.exists(output_dir):
            os.makedirs(output_dir)

        ydl_opts = {
            'progress_hooks': [self.progress_hook],
            'quiet': True,
            'no_warnings': True,
            'outtmpl': os.path.join(output_dir, '%(title)s.%(ext)s'),
            'noplaylist': True, # Chỉ tải 1 video duy nhất, không tải cả playlist
            'writethumbnail': True,
            'postprocessors': [
                {
                    'key': 'FFmpegMetadata',
                    'add_metadata': True,
                },
                {
                    'key': 'EmbedThumbnail',
                },
            ],
        }

        if mode == 'audio':
            ydl_opts['format'] = 'bestaudio/best'
            ydl_opts['postprocessors'].insert(0, {
                'key': 'FFmpegExtractAudio',
                'preferredcodec': 'mp3',
                'preferredquality': '320',
            })
        else:
            # Video mode
            if quality == 'best':
                ydl_opts['format'] = 'bestvideo+bestaudio/best'
            elif quality == '720':
                ydl_opts['format'] = 'bestvideo[height<=720]+bestaudio/best[height<=720]'
            elif quality == '480':
                ydl_opts['format'] = 'bestvideo[height<=480]+bestaudio/best[height<=480]'
            
            ydl_opts['merge_output_format'] = 'mp4'

        try:
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(url, download=True)
                title = info.get('title', 'Unknown')
                eel.update_omni_progress(title, "100", "completed")()
                return {"status": "success", "title": title}
        except Exception as e:
            print(f"Lỗi tải {url}: {e}")
            try:
                eel.update_omni_progress(url, "0", f"error: {str(e)}")()
            except: pass
            return {"status": "error", "msg": str(e)}

def start_download_thread(urls, mode, quality):
    downloader = UniversalDownloader()
    for url in urls:
        downloader.download(url, mode, quality)
    
    # Thông báo hoàn tất toàn bộ danh sách
    try:
        eel.omni_download_finished()()
    except: pass

    # Mở thư mục Downloads sau khi tải xong
    if os.path.exists(OMNI_DIR):
        os.startfile(OMNI_DIR)
