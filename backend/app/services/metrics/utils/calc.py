from typing import Optional

"""
Documentation for calc.py insert below this line.

Methods:
    in_range: Checks if a value is within a specified range.
"""

def in_range(val: Optional[float], rng: tuple[float, float]) -> Optional[bool]:
    if val is None:
        return None
    return rng[0] <= val <= rng[1]
