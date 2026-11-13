def remove_digit(number: str, digit: str) -> str:
    n = len(number)
    for i in range(n - 1):
        if number[i] == digit and number[i] < number[i + 1]:
            return number[:i] + number[i + 1 :]
    j = number.rfind(digit)
    return number[:j] + number[j + 1 :]
