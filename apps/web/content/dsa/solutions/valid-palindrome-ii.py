def _is_sub_palindrome(s: str, i: int, j: int) -> bool:
    while i < j:
        if s[i] != s[j]:
            return False
        i += 1
        j -= 1
    return True


def valid_palindrome(s: str) -> bool:
    i, j = 0, len(s) - 1
    while i < j:
        if s[i] == s[j]:
            i += 1
            j -= 1
        else:
            return _is_sub_palindrome(s, i + 1, j) or _is_sub_palindrome(s, i, j - 1)
    return True
