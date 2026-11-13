def add_minimum(word: str) -> int:
    ans = 0
    pos = 0
    expected = "abc"
    for ch in word:
        while ch != expected[pos]:
            ans += 1
            pos = (pos + 1) % 3
        pos = (pos + 1) % 3
    ans += (3 - pos) % 3
    return ans
