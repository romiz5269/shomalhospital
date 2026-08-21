DEFAULT_PM_CHECKLIST = [
    # PC
    ("بررسی آنتی‌ویروس", "pc", 30, 1),
    ("تعویض / بررسی خمیر سیلیکون CPU", "pc", 365, 2),
    ("بررسی باتری CMOS", "pc", 365, 3),
    ("بررسی و تمیزکاری فن‌ها", "pc", 90, 4),
    ("بررسی کابل‌ها و اتصالات", "pc", 90, 5),
    ("آپدیت ویندوز و درایورها", "pc", 30, 6),
    ("بررسی آنتی‌ویروس", "pc", 30, 7),
    ("بررسی فضای دیسک", "pc", 30, 8),
    # Server
    ("خاک‌گیری رک / سرور", "server", 90, 10),
    ("بررسی وضعیت RAID", "server", 30, 11),
    ("بررسی بک‌آپ", "server", 7, 12),
    ("بررسی سرویس‌ها و لاگ‌ها", "server", 7, 13),
    ("بررسی باتری UPS", "server", 90, 14),
    ("بررسی دما و فن سرور", "server", 30, 15),
    ("آپدیت OS و Patch امنیتی", "server", 30, 16),
    # HIS
    ("راه‌اندازی اولیه سرور HIS", "his", 0, 30),
    ("نصب و پیکربندی دیتابیس HIS", "his", 0, 31),
    ("تست سرویس‌های HIS و اتصال کلاینت", "his", 7, 32),
    ("بک‌آپ اولیه دیتابیس HIS", "his", 1, 33),
    ("مستندسازی IP و دسترسی‌ها", "his", 0, 34),
    # General
    ("فعال‌سازی / بررسی لایسنس ویندوز", "general", 180, 20),
    ("تست Ping و اتصال شبکه", "general", 30, 21),
    ("بررسی پرینتر و سطح تونر", "printer", 30, 22),
    ("تمیزکاری هد پرینتر", "printer", 90, 23),
    ("بررسی درایور و اتصال شبکه پرینتر", "printer", 30, 24),
    ("بررسی کاغذ و رول فیدر", "printer", 30, 25),
]


def seed_checklist_templates(db) -> None:
    from app.models import PMChecklistTemplate
    # Seed only once on empty table.
    # This prevents deleted custom items from reappearing after app restart.
    if db.query(PMChecklistTemplate).count() > 0:
        return
    for name, category, interval, order in DEFAULT_PM_CHECKLIST:
        db.add(PMChecklistTemplate(name=name, category=category, interval_days=interval, sort_order=order))
    db.commit()
