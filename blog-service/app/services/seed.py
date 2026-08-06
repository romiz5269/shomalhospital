from datetime import datetime, timezone

from app.db import db

SAMPLE_POSTS = [
    {
        "slug": "welcome-to-shomal-hospital",
        "titleFa": "به بیمارستان شمال خوش آمدید",
        "titleEn": "Welcome to Shomal Hospital",
        "excerptFa": "معرفی بیمارستان شمال — مرکز درمانی پیشرفته در آمل، مازندران.",
        "excerptEn": "Introducing Shomal Hospital — an advanced medical center in Amol, Mazandaran.",
        "contentFa": (
            "بیمارستان شمال در شهر آمل، استان مازندران، با بیش از دو دهه "
            "سابقه در ارائه خدمات درمانی با کیفیت به بیماران منطقه فعالیت می‌کند. "
            "این مرکز با بهره‌گیری از پزشکان متخصص، تجهیزات مدرن و بخش‌های تخصصی "
            "از جمله اورژانس، جراحی، قلب و عروق، و ICU، آماده پذیرش بیماران "
            "سرپایی و بستری است.\n\n"
            "ما متعهد به ارائه مراقبت‌های انسانی، شفافیت در ارتباط با بیماران "
            "و همکاری با بیمه‌های پایه و تکمیلی هستیم."
        ),
        "contentEn": (
            "Shomal Hospital, located in Amol, Mazandaran Province, "
            "has served the region for over two decades with high-quality medical care. "
            "Our facility features specialist physicians, modern equipment, and dedicated "
            "departments including Emergency, Surgery, Cardiology, and ICU — ready for "
            "both outpatient and inpatient services.\n\n"
            "We are committed to compassionate care, transparent communication, and "
            "cooperation with primary and supplementary insurance providers."
        ),
        "category": "news",
        "tags": ["بیمارستان شمال", "Shomal Hospital", "آمل", "Amol"],
        "isFeatured": True,
        "authorName": "روابط عمومی بیمارستان شمال",
    },
    {
        "slug": "cardiology-center-expansion",
        "titleFa": "گسترش مرکز قلب و عروق بیمارستان شمال",
        "titleEn": "Shomal Hospital Cardiology Center Expansion",
        "excerptFa": "افتتاح واحد جدید آنژیوگرافی و افزایش ظرفیت بستری بخش قلب.",
        "excerptEn": "New angiography unit opens with expanded cardiac inpatient capacity.",
        "contentFa": (
            "بخش قلب و عروق بیمارستان شمال با افتتاح واحد جدید آنژیوگرافی و "
            "اتاق عمل قلب، ظرفیت خود را برای انجام مداخلات عروقی و جراحی‌های "
            "قلب افزایش داده است. تیم متخصص ما شامل فوق‌تخصص‌های قلب، "
            "پرستاران آموزش‌دیده ICU و کارشناسان فیزیولوژی است.\n\n"
            "برای دریافت نوبت مشاوره قلب، از طریق سامانه نوبت‌دهی آنلاین "
            "بیمارستان یا تماس با مرکز پذیرش اقدام کنید."
        ),
        "contentEn": (
            "The Cardiology Department at Shomal Hospital has expanded with a new "
            "angiography suite and cardiac operating room, increasing capacity for "
            "interventional and surgical heart procedures. Our team includes "
            "cardiology subspecialists, trained ICU nurses, and cardiac physiologists.\n\n"
            "To book a cardiology consultation, use our online appointment system "
            "or contact the admission desk."
        ),
        "category": "health",
        "tags": ["قلب", "Cardiology", "آنژیوگرافی", "Angiography"],
        "isFeatured": False,
        "authorName": "بخش قلب و عروق",
    },
    {
        "slug": "free-diabetes-screening-event",
        "titleFa": "غربالگری رایگان دیابت — رویداد مهر",
        "titleEn": "Free Diabetes Screening Event — Mehr",
        "excerptFa": "رویداد سلامت عمومی با غربالگری رایگان دیابت و فشار خون.",
        "excerptEn": "Public health event with free diabetes and blood pressure screening.",
        "contentFa": "بیمارستان شمال رویداد غربالگری رایگان دیابت را برگزار می‌کند.",
        "contentEn": "Shomal Hospital hosts a free diabetes screening event.",
        "category": "event",
        "tags": ["رویداد", "Event"],
        "isFeatured": True,
        "authorName": "روابط عمومی",
    },
    {
        "slug": "heart-health-education-workshop",
        "titleFa": "کارگاه آموزشی سلامت قلب",
        "titleEn": "Heart Health Education Workshop",
        "excerptFa": "آموزش پیشگیری از بیماری‌های قلبی برای عموم.",
        "excerptEn": "Public workshop on heart disease prevention.",
        "contentFa": "کارگاه آموزشی رایگان سلامت قلب در سالن همایش بیمارستان.",
        "contentEn": "Free heart health workshop at the hospital conference hall.",
        "category": "education",
        "tags": ["آموزش", "Education"],
        "isFeatured": False,
        "authorName": "واحد آموزش",
    },
]


SAMPLE_DOCTORS = [
    {
        "nameFa": "دکتر محمدرضا کریمی",
        "nameEn": "Dr. Mohammadreza Karimi",
        "specialtyFa": "فوق‌تخصص قلب و عروق",
        "specialtyEn": "Interventional Cardiology",
        "departmentCode": "CRD",
        "imageUrl": "https://ui-avatars.com/api/?name=MK&background=003B8E&color=fff&size=256",
        "bioFa": "عضو هیئت علمی و مدیر بخش قلب و عروق بیمارستان شمال",
        "isFeatured": True,
        "sortOrder": 1,
    },
    {
        "nameFa": "دکتر فاطمه احمدی",
        "nameEn": "Dr. Fatemeh Ahmadi",
        "specialtyFa": "متخصص زنان و زایمان",
        "specialtyEn": "Obstetrics & Gynecology",
        "departmentCode": "OBG",
        "imageUrl": "https://ui-avatars.com/api/?name=FA&background=003B8E&color=fff&size=256",
        "bioFa": "جراح و متخصص زنان — بیمارستان شمال آمل",
        "isFeatured": True,
        "sortOrder": 2,
    },
    {
        "nameFa": "دکتر علی موسوی",
        "nameEn": "Dr. Ali Mousavi",
        "specialtyFa": "متخصص جراحی عمومی",
        "specialtyEn": "General Surgery",
        "departmentCode": "SUR",
        "imageUrl": "https://ui-avatars.com/api/?name=AM&background=003B8E&color=fff&size=256",
        "bioFa": "جراح عمومی با سابقه بیش از ۱۵ سال در بیمارستان شمال",
        "isFeatured": True,
        "sortOrder": 3,
    },
    {
        "nameFa": "دکتر سارا رضایی",
        "nameEn": "Dr. Sara Rezaei",
        "specialtyFa": "متخصص اطفال",
        "specialtyEn": "Pediatrics",
        "departmentCode": "PED",
        "imageUrl": "https://ui-avatars.com/api/?name=SR&background=003B8E&color=fff&size=256",
        "bioFa": "متخصص اطفال — ویزیت سرپایی و بستری",
        "isFeatured": True,
        "sortOrder": 4,
    },
    {
        "nameFa": "دکتر حسین نوری",
        "nameEn": "Dr. Hossein Nouri",
        "specialtyFa": "متخصص داخلی",
        "specialtyEn": "Internal Medicine",
        "departmentCode": "INT",
        "imageUrl": "https://ui-avatars.com/api/?name=HN&background=003B8E&color=fff&size=256",
        "bioFa": "متخصص داخلی — بیمارستان شمال",
        "isFeatured": False,
        "sortOrder": 5,
    },
    {
        "nameFa": "دکتر مریم جعفری",
        "nameEn": "Dr. Maryam Jafari",
        "specialtyFa": "متخصص رادیولوژی",
        "specialtyEn": "Radiology",
        "departmentCode": "RAD",
        "imageUrl": "https://ui-avatars.com/api/?name=MJ&background=003B8E&color=fff&size=256",
        "bioFa": "رادیولوژی تشخیصی — MRI و CT",
        "isFeatured": False,
        "sortOrder": 6,
    },
]


class SeedService:
    async def seed_sample_posts(self) -> None:
        now = datetime.now(timezone.utc)
        for post in SAMPLE_POSTS:
            existing = await db.blogpost.find_unique(where={"slug": post["slug"]})
            if existing:
                continue
            await db.blogpost.create(
                data={
                    **post,
                    "isPublished": True,
                    "publishedAt": now,
                    "isActive": True,
                }
            )


    async def seed_cms(self) -> None:
        from app.services.cms import cms_service

        await cms_service.ensure_defaults()

        for doc in SAMPLE_DOCTORS:
            existing = await db.doctor.find_first(
                where={"nameFa": doc["nameFa"], "deletedAt": None}
            )
            if existing:
                continue
            await db.doctor.create(data={**doc, "isActive": True})


seed_service = SeedService()
