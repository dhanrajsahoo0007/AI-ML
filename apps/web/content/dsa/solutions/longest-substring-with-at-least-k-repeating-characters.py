def longest_substring(s: str, k: int) -> int:
    if k == 1:
        return len(s)

    best = 0
    for max_unique in range(1, 27):
        freq: dict[str, int] = {}
        left = right = 0
        unique = 0
        no_less_than_k = 0
        n = len(s)

        while right < n:
            ch = s[right]
            if ch not in freq:
                freq[ch] = 0
                unique += 1
            freq[ch] += 1

            if freq[ch] == k:
                no_less_than_k += 1

            while unique > max_unique:
                left_ch = s[left]
                freq[left_ch] -= 1
                if freq[left_ch] == k - 1:
                    no_less_than_k -= 1
                if freq[left_ch] == 0:
                    unique -= 1
                    del freq[left_ch]
                left += 1

            if unique == no_less_than_k == max_unique:
                best = max(best, right - left + 1)

            right += 1

    return best
