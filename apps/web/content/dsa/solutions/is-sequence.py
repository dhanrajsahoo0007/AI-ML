def is_subsequence(s: str, t: str) -> bool:
    i = 0  # index in s (pattern we need in order)
    j = 0  # index in t (text we scan forward only)
    while i < len(s) and j < len(t):
        if s[i] == t[j]:
            i += 1  # matched next required character
        j += 1  # always advance through t
    return i == len(s)  # matched all of s
