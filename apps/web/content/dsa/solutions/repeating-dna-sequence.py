from typing import List


def find_repeated_dna_sequences(s: str) -> List[str]:
    L = 10
    n = len(s)
    if n <= L:
        return []

    seen: set[str] = set()
    dup: set[str] = set()

    for i in range(n - L + 1):
        piece = s[i : i + L]
        if piece in seen:
            dup.add(piece)
        else:
            seen.add(piece)

    return list(dup)


# --- Glue (same as the starter) ---

def find_repeated_dna_sequences_tests(a0):  # the entry the tests call
    result = find_repeated_dna_sequences(a0)
    result = sorted(result, key=repr) if isinstance(result, list) else result
    return result
