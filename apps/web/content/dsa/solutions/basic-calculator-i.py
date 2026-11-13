def calculate(s: str) -> int:
    stack: list[int] = []
    total = 0
    num = 0
    sign = 1
    for ch in s:
        if ch.isdigit():
            num = num * 10 + int(ch)
        elif ch in "+-":
            total += sign * num
            num = 0
            sign = 1 if ch == "+" else -1
        elif ch == "(":
            stack.append(total)
            stack.append(sign)
            total = 0
            sign = 1
        elif ch == ")":
            total += sign * num
            num = 0
            total *= stack.pop()
            total += stack.pop()
    total += sign * num
    return total
