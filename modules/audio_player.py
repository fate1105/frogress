import os
import threading
import time
import random
import pygame

class AudioPlayerBackend:
    def __init__(self, downloads_folder):
        self.downloads_folder = downloads_folder
        self.playlist = []
        self.durations = []
        self.current_index = -1
        
        self.is_playing = False
        self.is_paused = False
        self.is_looping = False
        self.is_shuffle = False
        self.volume = 1.0
        self.seek_offset = 0.0
        
        self.shuffled_indices = []
        self.shuffle_pos = -1
        
        pygame.mixer.init()
        self.on_state_change = None
        
        # Thread lắng nghe tiến trình bài hát ngầm
        self.monitor_thread = threading.Thread(target=self._monitor_loop, daemon=True)
        self.monitor_thread.start()

    def set_playlist(self, playlist, durations):
        self.playlist = playlist
        self.durations = durations
        if self.is_shuffle and self.playlist:
            self._generate_shuffle_list()

    def _generate_shuffle_list(self):
        if not self.playlist:
            self.shuffled_indices = []
            return
        
        indices = list(range(len(self.playlist)))
        # Nếu đang phát bài nào đó, giữ nó ở vị trí đầu tiên của danh sách tráo
        if self.current_index in indices:
            indices.remove(self.current_index)
            random.shuffle(indices)
            self.shuffled_indices = [self.current_index] + indices
            self.shuffle_pos = 0
        else:
            random.shuffle(indices)
            self.shuffled_indices = indices
            self.shuffle_pos = -1

    def _get_abs_path(self, filename):
        return os.path.join(self.downloads_folder, filename)

    def play_track(self, index):
        if not self.playlist or index < 0 or index >= len(self.playlist): 
            return
        self.current_index = index
        
        if self.is_shuffle and self.shuffled_indices:
            try:
                self.shuffle_pos = self.shuffled_indices.index(index)
            except ValueError:
                self.shuffle_pos = -1
                
        filepath = self._get_abs_path(self.playlist[index])
        if not os.path.exists(filepath): 
            return
        
        try:
            self.seek_offset = 0.0
            pygame.mixer.music.load(filepath)
            pygame.mixer.music.set_volume(self.volume)
            pygame.mixer.music.play()
            self.is_playing = True
            self.is_paused = False
            self._notify()
        except Exception as e:
            print("AudioPlayer error load:", e)

    def toggle_play(self):
        if not self.playlist: return
        if self.current_index == -1:
            if self.is_shuffle and self.shuffled_indices:
                self.play_track(self.shuffled_indices[0])
            else:
                self.play_track(0)
            return
            
        if self.is_playing:
            if self.is_paused:
                pygame.mixer.music.unpause()
                self.is_paused = False
            else:
                pygame.mixer.music.pause()
                self.is_paused = True
            self._notify()
        else:
            # Nhạc đã dừng hẳn (hết bài), phát lại track hiện tại
            self.play_track(self.current_index)

    def next_track(self):
        if not self.playlist: return
        
        if self.is_shuffle and self.shuffled_indices:
            self.shuffle_pos += 1
            if self.shuffle_pos >= len(self.shuffled_indices):
                # Hết danh sách tráo, tráo lại một list mới hoàn toàn
                self._generate_shuffle_list()
                self.shuffle_pos = 0
            self.play_track(self.shuffled_indices[self.shuffle_pos])
        else:
            self.play_track((self.current_index + 1) % len(self.playlist))

    def prev_track(self):
        if not self.playlist: return
        
        if self.is_shuffle and self.shuffled_indices:
            self.shuffle_pos -= 1
            if self.shuffle_pos < 0:
                self.shuffle_pos = len(self.shuffled_indices) - 1
            self.play_track(self.shuffled_indices[self.shuffle_pos])
        else:
            idx = self.current_index - 1
            if idx < 0: idx = len(self.playlist) - 1
            self.play_track(idx)

    def set_volume(self, vol_percent):
        self.volume = max(0, min(100, vol_percent)) / 100.0
        pygame.mixer.music.set_volume(self.volume)

    def toggle_loop(self):
        self.is_looping = not self.is_looping
        self._notify()

    def toggle_shuffle(self):
        self.is_shuffle = not self.is_shuffle
        if self.is_shuffle:
            self._generate_shuffle_list()
        self._notify()

    def set_progress(self, percent):
        if self.current_index != -1 and self.is_playing:
            dur = self.durations[self.current_index] if self.current_index < len(self.durations) else 0
            pos = dur * (percent / 100.0)
            try:
                self.seek_offset = pos
                # Seek by playing from specific position
                pygame.mixer.music.play(start=pos)
                if self.is_paused: 
                    pygame.mixer.music.pause()
            except Exception as e:
                print("Seek error:", e)

    def _notify(self):
        if self.on_state_change:
            dur = 0
            if 0 <= self.current_index < len(self.durations):
                dur = self.durations[self.current_index]
                
            pos = 0
            if self.is_playing:
                raw_pos = pygame.mixer.music.get_pos()
                current_play_time = raw_pos / 1000.0 if raw_pos >= 0 else 0
                pos = self.seek_offset + current_play_time
                if pos > dur: pos = dur
                
            # Dữ liệu gói ghém chuẩn bị truyền lên JS
            self.on_state_change({
                'is_playing': self.is_playing and not self.is_paused,
                'is_looping': self.is_looping,
                'is_shuffle': self.is_shuffle,
                'current_idx': self.current_index,
                'shuffled_indices': self.shuffled_indices,
                'shuffle_pos': self.shuffle_pos,
                'duration': dur,
                'volume': int(self.volume * 100),
                'progress': pos
            })

    def _monitor_loop(self):
        while True:
            time.sleep(0.5)
            try:
                if self.is_playing and not self.is_paused:
                    if not pygame.mixer.music.get_busy():
                        # Nhạc hết bài, chuyển bài!
                        if self.is_looping:
                            self.play_track(self.current_index)
                        else:
                            self.next_track()
                    else:
                        self._notify()
            except Exception as e:
                print("Lỗi Monitor Thread:", e)

    def stop(self):
        try:
            pygame.mixer.music.stop()
            pygame.mixer.quit()
        except:
            pass
