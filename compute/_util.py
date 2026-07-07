"""Вспомогательное для заглушек: детерминированный псевдослучай.

Чтобы демо-данные были стабильны для одного профиля в течение суток
(как будет вести себя реальный суточный кэш), а не прыгали при каждом
запросе. Заменяется вместе с телом compute-функций.
"""
import hashlib


def seed_int(*parts) -> int:
    """Стабильное целое из произвольных частей (строк/чисел)."""
    raw = "|".join(str(p) for p in parts)
    digest = hashlib.sha256(raw.encode("utf-8")).hexdigest()
    return int(digest[:8], 16)


def pick(seed: int, options: list):
    return options[seed % len(options)]
