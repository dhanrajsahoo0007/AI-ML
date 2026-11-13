from typing import List


def longest_common_prefix(strs: List[str]) -> str:
    if not strs:
        return ""
    base = strs[0]
    for i, ch in enumerate(base):
        for s in strs[1:]:
            if i == len(s) or s[i] != ch:
                return base[:i]
    return base
