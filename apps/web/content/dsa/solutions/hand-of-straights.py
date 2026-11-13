from collections import Counter
from typing import List


def is_n_straight_hand(hand: List[int], groupSize: int) -> bool:
    if len(hand) % groupSize:
        return False
    cnt = Counter(hand)
    for x in sorted(cnt):
        need = cnt[x]
        if need == 0:
            continue
        for y in range(x, x + groupSize):
            if cnt[y] < need:
                return False
            cnt[y] -= need
    return True
