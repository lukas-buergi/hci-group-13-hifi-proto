#!/usr/bin/env bash
python3 -m venv optimization-python-env
. optimization-python-env/bin/activate
cd optimization-python-env
git clone https://github.com/matplotlib/matplotlib.git
pip install matplotlib
