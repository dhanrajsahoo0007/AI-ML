def valid_word_abbreviation(word: str, abbr: str) -> bool:
    i = 0
    j = 0
    n, m = len(word), len(abbr)
    while j < m:
        if abbr[j].isdigit():
            if abbr[j] == "0":
                return False
            val = 0
            while j < m and abbr[j].isdigit():
                val = val * 10 + int(abbr[j])
                j += 1
            i += val
            if i > n:
                return False
        else:
            if i >= n or word[i] != abbr[j]:
                return False
            i += 1
            j += 1
    return i == n
