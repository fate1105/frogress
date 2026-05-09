import os
import json
from datetime import datetime, timedelta

def calculate_level(total_xp):
    """Tính toán cấp độ dựa trên tổng số Tu vi.
    Công thức: Cảnh giới 1 cần 308 Tu vi, các cấp sau x2.
    VD: L1->L2: 308, L2->L3: 616, L3->L4: 1232
    """
    level = 1
    current_xp = total_xp
    xp_needed = 308
    
    while current_xp >= xp_needed:
        current_xp -= xp_needed
        level += 1
        xp_needed *= 2  # x2 cho cấp tiếp theo
        
    return level, current_xp, xp_needed

def init_user_stats():
    return {
        "xp": 0,
        "level": 1,
        "coins": 0,
        "streak_days": 0,
        "last_active_date": "",
        "action_counts": {},
        "daily_quests": {},
        "achievements": []
    }

import random
import os
import json

def get_iso_week():
    now = datetime.now()
    return f"{now.isocalendar().year}-W{now.isocalendar().week}"

def load_lifestyle_quests():
    try:
        import sys as _sys
        if getattr(_sys, 'frozen', False):
            base = _sys._MEIPASS
        else:
            base = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        path = os.path.join(base, "data", "lifestyle_quests.json")
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except:
        return []

def process_daily_quests(stats):
    """Cập nhật và kiểm tra tiến độ Daily & Weekly Quests"""
    today = datetime.now().strftime("%Y-%m-%d")
    current_week = get_iso_week()
    
    # Reset daily quests
    if stats.get("last_quest_date") != today:
        stats["last_quest_date"] = today
        stats["action_counts"] = {}  # Reset bộ đếm hành động
        
        # 1 ngày tối đa 2 nhiệm vụ cố định (nhiệm vụ lifestyle ngẫu nhiên được đồng bộ trực tiếp sang Todo List)
        stats["daily_quests"] = {
            "combo_pomo_todo": {"title": "Phát Huy Song Hành", "desc": "Phối hợp Tu luyện và Nhiệm vụ tông môn", "goal": 2, "progress": 0, "reward": 25, "claimed": False, "icon": "menu-pomodoro.png"},
            "english_10": {"title": "Luyện Ngoại Ngữ", "desc": "Luyện 10 bí kíp ngoại ngữ chân kinh", "goal": 10, "progress": 0, "reward": 20, "claimed": False, "icon": "menu-english.png"}
        }

    # Reset weekly quests
    if stats.get("last_week_date") != current_week:
        stats["last_week_date"] = current_week
        stats["weekly_quests"] = {
            "week_pomo_10": {"title": "Đại Sư Tu Luyện", "desc": "Đạt 10 phiên Tu luyện trong tuần này", "goal": 10, "progress": 0, "reward": 100, "claimed": False, "icon": "menu-pomodoro.png"},
            "week_todo_15": {"title": "Sát Thủ Nhiệm Vụ", "desc": "Hoàn tất 15 Nhiệm vụ tông môn", "goal": 15, "progress": 0, "reward": 80, "claimed": False, "icon": "menu-todo.png"},
            "week_eng_50": {"title": "Bậc Thầy Chân Kinh", "desc": "Luyện 50 bí kíp ngoại ngữ chân kinh", "goal": 50, "progress": 0, "reward": 150, "claimed": False, "icon": "menu-english.png"}
        }
        
    return stats

def update_quest_progress(stats, quest_id, amount=1):
    """Cộng tiến trình cho một nhiệm vụ cụ thể (Daily hoặc Weekly)"""
    if "daily_quests" not in stats:
        stats = process_daily_quests(stats)
        
    # Check daily
    if quest_id in stats.get("daily_quests", {}):
        quest = stats["daily_quests"][quest_id]
        if quest["progress"] < quest["goal"]:
            quest["progress"] += amount
            if quest["progress"] > quest["goal"]:
                quest["progress"] = quest["goal"]
                
    # Check weekly
    if quest_id in stats.get("weekly_quests", {}):
        quest = stats["weekly_quests"][quest_id]
        if quest["progress"] < quest["goal"]:
            quest["progress"] += amount
            if quest["progress"] > quest["goal"]:
                quest["progress"] = quest["goal"]
                
    return stats

def check_anti_spam(stats, action_type, daily_limit):
    """Kiểm tra xem người dùng đã đạt giới hạn nhận XP trong ngày chưa"""
    if "action_counts" not in stats:
        stats["action_counts"] = {}
        
    count = stats["action_counts"].get(action_type, 0)
    if count >= daily_limit:
        return False, stats
        
    stats["action_counts"][action_type] = count + 1
    return True, stats

def update_streak(stats):
    """Cập nhật chuỗi ngày hoạt động liên tiếp"""
    today_dt = datetime.now().date()
    today_str = today_dt.strftime("%Y-%m-%d")
    
    last_date_str = stats.get("last_active_date", "")
    
    if last_date_str == today_str:
        return stats  # Đã tính trong hôm nay rồi
        
    if not last_date_str:
        stats["streak_days"] = 1
        stats["last_active_date"] = today_str
        return stats
        
    try:
        last_date_dt = datetime.strptime(last_date_str, "%Y-%m-%d").date()
        diff = (today_dt - last_date_dt).days
        
        if diff == 1:
            # Liên tiếp
            stats["streak_days"] += 1
        else:
            # Mất chuỗi
            stats["streak_days"] = 1
    except:
        stats["streak_days"] = 1
        
    stats["last_active_date"] = today_str
    return stats

def apply_streak_multiplier(base_xp, streak_days):
    """Áp dụng bonus Tu vi dựa trên streak"""
    # Vd: Tối đa +50% Tu vi cho streak >= 10 ngày
    multiplier = 1.0 + min(streak_days * 0.05, 0.5)
    return int(base_xp * multiplier)
