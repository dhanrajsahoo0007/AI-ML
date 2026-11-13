def max_depth(s: str) -> int:
    curr = 0
    max_curr = 0
    for char in s:
        if char == "(":
            curr += 1
            max_curr = max(max_curr, curr)
        elif char == ")":
            curr -= 1
    return max_curr
