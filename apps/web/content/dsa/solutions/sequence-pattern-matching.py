def is_subsequence(s: str, t: str) -> bool:
    if not s:
        return True
    i = 0
    for ch in t:
        if ch == s[i]:
            i += 1
            if i == len(s):
                return True
    return False
