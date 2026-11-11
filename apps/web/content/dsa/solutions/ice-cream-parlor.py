from typing import List


def icecream_parlor(m: int, cost: List[int]) -> List[int]:
    index_by_price: dict[int, int] = {}
    for i, c in enumerate(cost):
        need = m - c
        if need in index_by_price:
            a, b = index_by_price[need] + 1, i + 1
            return [a, b] if a < b else [b, a]
        index_by_price[c] = i
    return []
