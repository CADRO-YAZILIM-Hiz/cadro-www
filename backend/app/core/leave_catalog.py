from __future__ import annotations

from typing import Any


def _lang_key(language: str | None) -> str:
    if not language:
        return "tr"
    normalized = language.lower()
    if normalized.startswith("de"):
        return "de"
    if normalized.startswith("ar"):
        return "ar"
    if normalized.startswith("en"):
        return "en"
    return "tr"


LEAVE_PROFILES: list[dict[str, Any]] = [
    {
        "code": "TR",
        "labels": {"tr": "Turkiye", "en": "Turkiye", "de": "Turkei", "ar": "تركيا"},
    },
    {
        "code": "KKTC",
        "labels": {"tr": "KKTC", "en": "TRNC", "de": "TRNZ", "ar": "شمال قبرص"},
    },
    {
        "code": "EU",
        "labels": {"tr": "Avrupa", "en": "Europe", "de": "Europa", "ar": "أوروبا"},
    },
    {
        "code": "MENA",
        "labels": {"tr": "MENA", "en": "MENA", "de": "MENA", "ar": "الشرق الاوسط وشمال افريقيا"},
    },
]


LEAVE_TYPES_BY_PROFILE: dict[str, list[dict[str, Any]]] = {
    "TR": [
        {"code": "ANNUAL", "labels": {"tr": "Yillik Izin", "en": "Annual Leave", "de": "Jahresurlaub", "ar": "إجازة سنوية"}},
        {"code": "EXCUSED", "labels": {"tr": "Mazeret Izni", "en": "Excuse Leave", "de": "Freistellung", "ar": "إجازة عذر"}},
        {"code": "SICK", "labels": {"tr": "Hastalik Izni", "en": "Sick Leave", "de": "Krankheitsurlaub", "ar": "إجازة مرضية"}},
        {"code": "MATERNITY", "labels": {"tr": "Dogum Izni", "en": "Maternity Leave", "de": "Mutterschaftsurlaub", "ar": "إجازة أمومة"}},
        {"code": "PATERNITY", "labels": {"tr": "Babalik Izni", "en": "Paternity Leave", "de": "Vaterschaftsurlaub", "ar": "إجازة أبوة"}},
        {"code": "NURSING", "labels": {"tr": "Emzirme Izni", "en": "Nursing Leave", "de": "Stillzeit", "ar": "إجازة رضاعة"}},
        {"code": "UNPAID", "labels": {"tr": "Ucretsiz Izin", "en": "Unpaid Leave", "de": "Unbezahlter Urlaub", "ar": "إجازة بدون أجر"}},
        {"code": "MARRIAGE", "labels": {"tr": "Evlilik Izni", "en": "Marriage Leave", "de": "Heiratsurlaub", "ar": "إجازة زواج"}},
        {"code": "BEREAVEMENT", "labels": {"tr": "Yakin Vefati Izni", "en": "Bereavement Leave", "de": "Trauerurlaub", "ar": "إجازة وفاة"}},
        {"code": "MILITARY", "labels": {"tr": "Askerlik Izni", "en": "Military Leave", "de": "Militaerdiensturlaub", "ar": "إجازة خدمة عسكرية"}},
        {"code": "WORK_INJURY", "labels": {"tr": "Is Kazasi Izni", "en": "Work Injury Leave", "de": "Arbeitsunfallurlaub", "ar": "إجازة إصابة عمل"}},
    ],
    "KKTC": [
        {"code": "ANNUAL", "labels": {"tr": "Yillik Izin", "en": "Annual Leave", "de": "Jahresurlaub", "ar": "إجازة سنوية"}},
        {"code": "EXCUSED", "labels": {"tr": "Mazeret Izni", "en": "Excuse Leave", "de": "Freistellung", "ar": "إجازة عذر"}},
        {"code": "SICK", "labels": {"tr": "Saglik Raporu / Hastalik Izni", "en": "Sick Report / Sick Leave", "de": "Krankschreibung / Krankheitsurlaub", "ar": "تقرير مرضي / إجازة مرضية"}},
        {"code": "MATERNITY", "labels": {"tr": "Dogum Izni", "en": "Maternity Leave", "de": "Mutterschaftsurlaub", "ar": "إجازة أمومة"}},
        {"code": "NURSING", "labels": {"tr": "Emzirme Izni", "en": "Nursing Leave", "de": "Stillzeit", "ar": "إجازة رضاعة"}},
        {"code": "UNPAID", "labels": {"tr": "Ucretsiz Izin", "en": "Unpaid Leave", "de": "Unbezahlter Urlaub", "ar": "إجازة بدون أجر"}},
        {"code": "MARRIAGE", "labels": {"tr": "Evlilik Izni", "en": "Marriage Leave", "de": "Heiratsurlaub", "ar": "إجازة زواج"}},
        {"code": "BEREAVEMENT", "labels": {"tr": "Yakin Vefati Izni", "en": "Bereavement Leave", "de": "Trauerurlaub", "ar": "إجازة وفاة"}},
        {"code": "BIRTH_EVENT", "labels": {"tr": "Dogum Olayi Izni", "en": "Birth Event Leave", "de": "Geburtsereignisurlaub", "ar": "إجازة مناسبة ولادة"}},
    ],
    "EU": [
        {"code": "ANNUAL", "labels": {"tr": "Yillik Izin", "en": "Annual Leave", "de": "Jahresurlaub", "ar": "إجازة سنوية"}},
        {"code": "SICK", "labels": {"tr": "Hastalik Izni", "en": "Sick Leave", "de": "Krankheitsurlaub", "ar": "إجازة مرضية"}},
        {"code": "MATERNITY", "labels": {"tr": "Dogum Izni", "en": "Maternity Leave", "de": "Mutterschaftsurlaub", "ar": "إجازة أمومة"}},
        {"code": "PATERNITY", "labels": {"tr": "Babalik Izni", "en": "Paternity Leave", "de": "Vaterschaftsurlaub", "ar": "إجازة أبوة"}},
        {"code": "PARENTAL", "labels": {"tr": "Ebeveyn Izni", "en": "Parental Leave", "de": "Elternzeit", "ar": "إجازة والدية"}},
        {"code": "CARERS", "labels": {"tr": "Bakim Veren Izni", "en": "Carer's Leave", "de": "Pflegeurlaub", "ar": "إجازة رعاية"}},
        {"code": "UNPAID", "labels": {"tr": "Ucretsiz Izin", "en": "Unpaid Leave", "de": "Unbezahlter Urlaub", "ar": "إجازة بدون أجر"}},
        {"code": "COMPENSATORY", "labels": {"tr": "Telafi Izni", "en": "Compensatory Leave", "de": "Ausgleichsurlaub", "ar": "إجازة تعويضية"}},
    ],
    "MENA": [
        {"code": "ANNUAL", "labels": {"tr": "Yillik Izin", "en": "Annual Leave", "de": "Jahresurlaub", "ar": "إجازة سنوية"}},
        {"code": "SICK", "labels": {"tr": "Hastalik Izni", "en": "Sick Leave", "de": "Krankheitsurlaub", "ar": "إجازة مرضية"}},
        {"code": "MATERNITY", "labels": {"tr": "Dogum Izni", "en": "Maternity Leave", "de": "Mutterschaftsurlaub", "ar": "إجازة أمومة"}},
        {"code": "PATERNITY", "labels": {"tr": "Babalik Izni", "en": "Paternity Leave", "de": "Vaterschaftsurlaub", "ar": "إجازة أبوة"}},
        {"code": "UNPAID", "labels": {"tr": "Ucretsiz Izin", "en": "Unpaid Leave", "de": "Unbezahlter Urlaub", "ar": "إجازة بدون أجر"}},
        {"code": "MARRIAGE", "labels": {"tr": "Evlilik Izni", "en": "Marriage Leave", "de": "Heiratsurlaub", "ar": "إجازة زواج"}},
        {"code": "BEREAVEMENT", "labels": {"tr": "Yakin Vefati Izni", "en": "Bereavement Leave", "de": "Trauerurlaub", "ar": "إجازة وفاة"}},
        {"code": "BIRTH_EVENT", "labels": {"tr": "Dogum Olayi Izni", "en": "Birth Event Leave", "de": "Geburtsereignisurlaub", "ar": "إجازة مناسبة ولادة"}},
        {"code": "STUDY", "labels": {"tr": "Egitim / Sinav Izni", "en": "Study / Exam Leave", "de": "Studien- / Prüfungsurlaub", "ar": "إجازة دراسة / امتحان"}},
        {"code": "PILGRIMAGE", "labels": {"tr": "Hac / Umre Izni", "en": "Pilgrimage Leave", "de": "Pilgerurlaub", "ar": "إجازة حج / عمرة"}},
    ],
}


LEGACY_LEAVE_TYPE_ALIASES = {
    "YILLIK": "ANNUAL",
    "ANNUAL_LEAVE": "ANNUAL",
    "MAZERET": "EXCUSED",
    "EXCUSE": "EXCUSED",
    "HASTALIK": "SICK",
    "SICK_LEAVE": "SICK",
    "DOGUM": "MATERNITY",
    "ANALIK": "MATERNITY",
    "UCRETSIZ": "UNPAID",
    "ÜCRETSIZ": "UNPAID",
    "UCRETSIZ_IZIN": "UNPAID",
    "EMZIRME": "NURSING",
}


def normalize_leave_type(value: str | None) -> str:
    if not value:
        return "ANNUAL"
    upper_value = value.strip().upper()
    return LEGACY_LEAVE_TYPE_ALIASES.get(upper_value, upper_value)


def normalize_leave_country(value: str | None, fallback: str = "TR") -> str:
    if not value:
        return fallback
    upper_value = value.strip().upper()
    if upper_value in LEAVE_TYPES_BY_PROFILE:
        return upper_value
    return fallback


def infer_leave_country(leave_type: str) -> str:
    normalized = normalize_leave_type(leave_type)
    for profile_code, leave_types in LEAVE_TYPES_BY_PROFILE.items():
        if any(item["code"] == normalized for item in leave_types):
            return profile_code
    return "TR"


def get_leave_type_label(leave_type: str, leave_country: str | None = None, language: str | None = None) -> str:
    lang = _lang_key(language)
    normalized_country = normalize_leave_country(leave_country, fallback=infer_leave_country(leave_type))
    normalized_type = normalize_leave_type(leave_type)
    for item in LEAVE_TYPES_BY_PROFILE.get(normalized_country, []):
        if item["code"] == normalized_type:
            return item["labels"].get(lang) or item["labels"]["tr"]
    return normalized_type.replace("_", " ").title()


def get_leave_profiles(language: str | None = None) -> list[dict[str, str]]:
    lang = _lang_key(language)
    return [
        {
            "code": item["code"],
            "label": item["labels"].get(lang) or item["labels"]["tr"],
        }
        for item in LEAVE_PROFILES
    ]


def get_leave_types_for_country(country_code: str | None, language: str | None = None) -> list[dict[str, str]]:
    lang = _lang_key(language)
    normalized_country = normalize_leave_country(country_code)
    return [
        {
            "code": item["code"],
            "label": item["labels"].get(lang) or item["labels"]["tr"],
        }
        for item in LEAVE_TYPES_BY_PROFILE.get(normalized_country, [])
    ]


def get_leave_catalog(language: str | None = None) -> dict[str, Any]:
    profiles = get_leave_profiles(language)
    return {
        "profiles": profiles,
        "types_by_country": {
            profile["code"]: get_leave_types_for_country(profile["code"], language)
            for profile in profiles
        },
    }


def is_leave_type_allowed(country_code: str | None, leave_type: str | None) -> bool:
    normalized_country = normalize_leave_country(country_code)
    normalized_type = normalize_leave_type(leave_type)
    return any(item["code"] == normalized_type for item in LEAVE_TYPES_BY_PROFILE.get(normalized_country, []))
