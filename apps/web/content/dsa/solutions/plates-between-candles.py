from typing import List


def plates_between_candles(s: str, queries: List[List[int]]) -> List[int]:
    n = len(s)
    plate_pref = [0] * (n + 1)
    for i, ch in enumerate(s):
        plate_pref[i + 1] = plate_pref[i] + (ch == "*")
    nearest_left = [-1] * n
    last = -1
    for i, ch in enumerate(s):
        if ch == "|":
            last = i
        nearest_left[i] = last
    nearest_right = [n] * n
    nxt = n
    for i in range(n - 1, -1, -1):
        if s[i] == "|":
            nxt = i
        nearest_right[i] = nxt
    out: List[int] = []
    for left, right in queries:
        lc = nearest_right[left]
        rc = nearest_left[right]
        if lc == n or rc == -1 or lc > rc:
            out.append(0)
        else:
            out.append(plate_pref[rc + 1] - plate_pref[lc + 1])
    return out
