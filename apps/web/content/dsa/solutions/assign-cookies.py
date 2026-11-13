from typing import List


def find_content_children(g: List[int], s: List[int]) -> int:
    g.sort()  # smallest greed first
    s.sort()  # smallest cookie first
    child = 0  # index of the next child we still need to satisfy
    cookie = 0  # index of the next available cookie
    while child < len(g) and cookie < len(s):
        if s[cookie] >= g[child]:
            # Cookie is large enough for this child; consume both.
            child += 1
        # Whether we satisfied a child or not, this cookie cannot be reused.
        cookie += 1
    return child
