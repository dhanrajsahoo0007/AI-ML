def make_smallest_palindrome(s: str) -> str:
    left = 0
    right = len(s) - 1
    chars = list(s)
    while left < right:
        if chars[left] != chars[right]:
            if chars[left] < chars[right]:
                chars[right] = chars[left]
            else:
                chars[left] = chars[right]
        left += 1
        right -= 1
    return "".join(chars)
