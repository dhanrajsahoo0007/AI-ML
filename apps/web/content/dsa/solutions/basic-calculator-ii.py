def calculate(s: str) -> int:
    expr = s.replace(" ", "")
    stack: list[int] = []
    curr = 0
    prev_op = "+"
    n = len(expr)
    for i in range(n):
        ch = expr[i]
        if ch.isdigit():
            curr = curr * 10 + int(ch)
        if ch in "+-*/" or i == n - 1:
            if prev_op == "+":
                stack.append(curr)
            elif prev_op == "-":
                stack.append(-curr)
            elif prev_op == "*":
                stack.append(stack.pop() * curr)
            else:
                stack.append(int(stack.pop() / curr))
            if ch in "+-*/":
                prev_op = ch
            curr = 0
    return sum(stack)
