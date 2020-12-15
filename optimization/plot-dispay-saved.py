#!/usr/bin/env python3
import sys
import pickle
from mpl_toolkits.mplot3d import Axes3D
import matplotlib.pyplot as plt
from matplotlib import cm
from matplotlib.ticker import LinearLocator, FormatStrFormatter

if __name__ == "__main__":
  with open(sys.argv[1], "rb") as f:
    fig = pickle.load(f)
    plt.show()
