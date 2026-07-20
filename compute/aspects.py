"""
aspects.py — джйотишевские аспекты (граха-дришти) между планетами.
Счёт по знакам: distance = ((sign_to - sign_from) mod 12) + 1, где 1 = тот же знак.
Правила аспектов — из config/aspects.yaml (правка без деплоя).
"""

PLANETS_RU = {
    'Su': 'Солнце', 'Mo': 'Луна', 'Ma': 'Марс', 'Me': 'Меркурий',
    'Ju': 'Юпитер', 'Ve': 'Венера', 'Sa': 'Сатурн', 'Ra': 'Раху', 'Ke': 'Кету',
}
# порядок вывода
_ORDER = ['Su', 'Mo', 'Ma', 'Me', 'Ju', 'Ve', 'Sa', 'Ra', 'Ke']


def _aspect_distances(code: str, rules: dict) -> set:
    d = set()
    if rules.get('seventh_all', True):
        d.add(7)
    for x in rules.get('special', {}).get(code, []):
        d.add(x)
    for x in rules.get('nodes_special', {}).get(code, []):
        d.add(x)
    return d


def compute(planets: dict, rules: dict) -> dict:
    """planets: {code:{sign,...}} -> {aspects:[...], conjunctions:[...]}."""
    codes = [c for c in _ORDER if c in planets]

    directed = []
    for a in codes:
        sa = planets[a]['sign']
        dists = _aspect_distances(a, rules)
        for b in codes:
            if a == b:
                continue
            sb = planets[b]['sign']
            dist = ((sb - sa) % 12) + 1
            if dist == 1:
                continue  # соединение — отдельно
            if dist in dists:
                directed.append({'from': a, 'to': b, 'distance': dist,
                                 'special': dist != 7})

    pairset = {(x['from'], x['to']) for x in directed}
    for x in directed:
        x['mutual'] = (x['to'], x['from']) in pairset
        x['from_ru'] = PLANETS_RU[x['from']]
        x['to_ru'] = PLANETS_RU[x['to']]

    conjunctions = []
    if rules.get('show_conjunction', True):
        for i, a in enumerate(codes):
            for b in codes[i + 1:]:
                if planets[a]['sign'] == planets[b]['sign']:
                    conjunctions.append({
                        'a': a, 'b': b,
                        'a_ru': PLANETS_RU[a], 'b_ru': PLANETS_RU[b],
                        'sign_ru': planets[a]['sign_ru'],
                    })

    return {'aspects': directed, 'conjunctions': conjunctions}
