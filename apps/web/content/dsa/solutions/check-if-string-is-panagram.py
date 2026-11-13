def check_if_pangram(sentence: str) -> bool:
    counts = [0] * 26  # one slot per letter a..z
    for ch in sentence:
        counts[ord(ch) - ord("a")] += 1
    return all(c > 0 for c in counts)  # pangram iff every letter seen at least once
