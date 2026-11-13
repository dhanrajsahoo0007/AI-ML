def roman_to_int(s: str) -> int:
    val = {
        "I": 1,
        "V": 5,
        "X": 10,
        "L": 50,
        "C": 100,
        "D": 500,
        "M": 1000,
        "IV": 4,
        "IX": 9,
        "XL": 40,
        "XC": 90,
        "CD": 400,
        "CM": 900,
    }
    amount = 0
    i = 0
    n = len(s)
    while i < n:
        # Peek two chars when possible so IV/IX/... map before single-letter fallback.
        if i < n - 1 and s[i : i + 2] in val:
            amount += val[s[i : i + 2]]
            i += 2
        else:
            amount += val[s[i]]
            i += 1
    return amount
