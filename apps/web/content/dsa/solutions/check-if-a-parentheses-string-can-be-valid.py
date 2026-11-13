def can_be_valid(s: str, locked: str) -> bool:
    n = len(s)
    if n % 2:
        return False
    bal = 0
    for i in range(n):
        if locked[i] == "0" or s[i] == "(":
            bal += 1
        else:
            bal -= 1
        if bal < 0:
            return False
    bal = 0
    for i in range(n - 1, -1, -1):
        if locked[i] == "0" or s[i] == ")":
            bal += 1
        else:
            bal -= 1
        if bal < 0:
            return False
    return True
