import pytest
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))
from calc import add, divide

def test_add_happy_path():
    assert add(2, 3) == 5

def test_add_zero():
    assert add(5, 0) == 5

def test_divide_happy_path():
    assert divide(10, 2) == 5

def test_divide_by_zero_raises():
    with pytest.raises(ZeroDivisionError):
        divide(5, 0)

def test_divide_float():
    assert divide(7, 2) == 3.5
