from typing import List


def int_to_roman(num: int) -> str:
    digits = [
        (1000, "M"),
        (900, "CM"),
        (500, "D"),
        (400, "CD"),
        (100, "C"),
        (90, "XC"),
        (50, "L"),
        (40, "XL"),
        (10, "X"),
        (9, "IX"),
        (5, "V"),
        (4, "IV"),
        (1, "I"),
    ]
    roman_parts: List[str] = []
    for value, symbol in digits:
        if num == 0:
            break
        count = num // value  # how many times this symbol fits
        num -= count * value
        roman_parts.append(symbol * count)  # append that many copies
    return "".join(roman_parts)
