def smallest_string(s: str) -> str:
    chars = list(s)
    n = len(chars)
    i = 0
    while i < n and chars[i] == "a":
        i += 1  # skip prefix already at smallest letter
    if i == n:
        chars[-1] = "z"  # e.g. "aa" -> "az"
    else:
        while i < n and chars[i] != "a":
            chars[i] = chr(ord(chars[i]) - 1)  # apply the allowed -1 map once per char
            i += 1
    return "".join(chars)
