def find_the_difference(s: str, t: str) -> str:
    x = 0
    for ch in t:
        x ^= ord(ch)
    for ch in s:
        x ^= ord(ch)
    return chr(x)
