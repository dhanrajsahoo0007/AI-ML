def count_and_say(n: int) -> str:
    cur = "1"
    for _ in range(n - 1):
        nxt: list[str] = []
        i = 0
        while i < len(cur):
            j = i
            while j < len(cur) and cur[j] == cur[i]:
                j += 1
            nxt.append(str(j - i))
            nxt.append(cur[i])
            i = j
        cur = "".join(nxt)
    return cur
