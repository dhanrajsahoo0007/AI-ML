from typing import List


def designer_pdf_viewer(h: List[int], word: str) -> int:
    max_h = 0
    for c in word:
        max_h = max(max_h, h[ord(c) - ord("a")])
    return max_h * len(word)
