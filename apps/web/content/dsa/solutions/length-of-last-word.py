def length_of_last_word(s: str) -> int:
    c = 0
    for ch in reversed(s):
        if ch == " ":
            if c >= 1:
                return c
        else:
            c += 1
    return c
