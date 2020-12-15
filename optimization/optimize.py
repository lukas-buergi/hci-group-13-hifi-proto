#!/usr/bin/env python3
import math
import sys
import csv
import randomsearch as rs
import random
import numpy as np
from mpl_toolkits.mplot3d import Axes3D
import matplotlib.pyplot as plt
from matplotlib import cm
from matplotlib.ticker import LinearLocator, FormatStrFormatter
from scipy.optimize import minimize
from multiprocessing import Pool

# constant weights of the different cost summands
weight = {
  'wrongness' : 1.0,
  'resetThreshold' : 5,
}

class Measurement():
    def __init__(self, args):
        argsFloat = []
        for a in args:
            argsFloat.append(float(a))
        args = argsFloat
        self.time = args[0] # milliseconds
        self.x = args[1] # absolute
        self.y = args[2] # absolute
        self.d1x1 = args[3] # upper bounding rect x
        self.d1y1 = args[4] # ... y
        self.d1y2 = args[5] # ... height
        self.d1x2 = args[6] # ... width
        self.d2x1 = args[7] # lower bounding rect
        self.d2y1 = args[8]
        self.d2y2 = args[9]
        self.d2x2 = args[10]
        self.pageUpper = args[11]
        self.pageLower = args[12]
        
class SimulatedMeasurement():
    def __init__(self, args):
        self.time = float(args[0])
        self.pageUpper = float(args[1])
        self.pageLower = float(args[2])

class Model():
    TOP = 1
    BOTTOM = 0
    NONE = -1
    
    GAZE_REFERENCE_FREQUENCY = 6
    
    def __init__(self, gazeAveragingFactor, gazeSwitchThreshold, gazeBorder, resetThreshold):
        self.gazeAveragingFactor = gazeAveragingFactor
        self.gazeSwitchThreshold = gazeSwitchThreshold
        self.gazeBorder = gazeBorder
        self.resetThreshold = 1000 * resetThreshold # parameter is in s, but we consistently use ms here
        
        self.wrongTime = 0
        self.recentAverageGaze = 1
        self.currentNormalizedGaze = self.recentAverageGaze
        
        self.measurements = []
        self.simulation = []
    
    def boundingBox(self):
        m = self.measurements[-1]
        eyeGazeBorderPixels = self.gazeBorder * m.d1y2
        eyeGazeXMin = m.d1x1 + eyeGazeBorderPixels
        eyeGazeXMax = m.d1x1 + m.d1x2 - eyeGazeBorderPixels;
        eyeGazeY1Min = m.d1y1 + eyeGazeBorderPixels;
        eyeGazeY1Max = m.d1y1 + m.d1y2 - eyeGazeBorderPixels;
        eyeGazeY2Min = m.d2y1 + eyeGazeBorderPixels;
        eyeGazeY2Max = m.d2y1 + m.d2y2 - eyeGazeBorderPixels;
        if(eyeGazeXMin < m.x and m.x < eyeGazeXMax):
            if(eyeGazeY1Min < m.y and m.y < eyeGazeY1Max):
                return(self.TOP)
            elif(eyeGazeY2Min < m.y and m.y < eyeGazeY2Max):
                return(self.BOTTOM)
            else:
                return(self.NONE)
        else:
            return(self.NONE)
        
    def average(self, position):
        m = self.measurements[-1]
        if(len(self.simulation) == 0):
            sm = SimulatedMeasurement([m.time, m.pageUpper, m.pageLower])
            m2 = m
        else:
            sm = self.simulation[-1]
            m2 = self.measurements[-2]
        tdiff = m.time - m2.time # ms
        self.lastGazeTime = m.time
        tdiff = tdiff / 1000.0 # s
        trel = tdiff / (1.0 / self.GAZE_REFERENCE_FREQUENCY) # fraction of reference period that passed since last time
        oldDataWeight = math.pow(1-self.gazeAveragingFactor, trel)
        self.recentAverageGaze = self.recentAverageGaze * oldDataWeight + position * (1-oldDataWeight)
        diff = abs(self.currentNormalizedGaze - self.recentAverageGaze)
        #print("pages", sm.pageUpper, sm.pageLower, m.pageUpper, m.pageLower, "trel", trel, "oldDataWeight", oldDataWeight, "diff", diff, "self.recentAverageGaze", self.recentAverageGaze, "self.currentNormalizedGaze", self.currentNormalizedGaze)
        if(diff > self.gazeSwitchThreshold):
            self.currentNormalizedGaze = (self.currentNormalizedGaze + 1) % 2
            if(sm.pageUpper > sm.pageLower):
                return(SimulatedMeasurement([m.time, sm.pageUpper, sm.pageLower+2]))
            else:
                return(SimulatedMeasurement([m.time, sm.pageUpper+2, sm.pageLower]))
        else:
            return(SimulatedMeasurement([m.time, sm.pageUpper, sm.pageLower]))

    def add(self, measurement):
        # if it's the first we need the time of a "previous" sample
        if(self.measurements == []):
            self.lastGazeTime = measurement.time
            self.lastRight = measurement.time
        
        # keep track of measurements in this object
        self.measurements.append(measurement)
        
        # calculate next simulated measurement
        position = self.boundingBox()
        if(position != self.NONE):
            # position in bounding box
            sm=self.average(position)
        else:
            # position not in bounding box, reuse last page numbers
            sm = SimulatedMeasurement([measurement.time, measurement.pageUpper, measurement.pageLower])
            if(len(self.simulation) > 0):
                sm.pageUpper = self.simulation[-1].pageUpper
                sm.pageLower = self.simulation[-1].pageLower
                
        # are we currently wrong?
        if(sm.pageUpper != measurement.pageUpper or sm.pageLower != measurement.pageLower):
            self.wrongTime = sm.time - self.lastRight
        else:
            self.wrongTime = 0
            self.lastRight = sm.time
                
        # check if we have been wrong too long
        if(self.wrongTime > self.resetThreshold):
            self.wrongTime = 0
            # reset simulation
            sm=measurement
            self.lastRight = sm.time
            self.lastGazeTime = sm.time
        
        self.simulation.append(sm)
            
    def addAll(self, measurements):
        for m in measurements:
            self.add(m)

class Optimization():
    def __init__(self, files):
        self.measurementFiles = files
        
    def cost(self, x):
        if(not (0 <= x[0] and x[0] <= 1 and 0 <= x[1] and x[1] <= 1 and 0 <= x[2] and x[2] < 0.5 and 1 < x[3])):
            print("Parameter out of bounds: ", str(x), " returning arbitrary large number.", file=sys.stderr)
            return(1000000)
        gazeAveragingFactor = x[0]
        gazeSwitchThreshold = x[1]
        gazeBorder = x[2]
        resetThreshold = x[3]
        
        # run simulation
        measurements = {}
        simulations = {}
        for measurement in self.measurementFiles:
            with open("data/" + measurement, newline='') as csvfile:
                reader = csv.reader(csvfile)
                header = reader.__next__()
                measurements[measurement] = []
                for row in reader:
                    measurements[measurement].append(Measurement(row))
                # too short measurements make no sense and are probably unintentional
                assert(len(measurements[measurement]) > 10)
            simulations[measurement] = Model(gazeAveragingFactor, gazeSwitchThreshold, gazeBorder, resetThreshold)
            simulations[measurement].addAll(measurements[measurement])
        
        # determine the cost
        wrongTime = 0.0
        time = 0.0
        for key, simulation in simulations.items():
            simulationLength = simulation.measurements[-1].time - simulation.measurements[0].time
            # while we have a current and a previous time step, starting at the last time step...
            while len(simulation.simulation) > 1:
                sim = simulation.simulation.pop()
                mea = simulation.measurements.pop()
                timeDiff = mea.time - simulation.measurements[-1].time
                time += timeDiff
                if(sim.pageUpper != mea.pageUpper or sim.pageLower != mea.pageLower):
                    wrongTime += timeDiff
        # divide by number of simulations to get average of wrongness fractions
        cost = wrongTime / time
        
        cost *= weight['wrongness']
                    
        # a low reset threshold is bad because it means the simulated user turned pages manually all the time
        cost += weight['resetThreshold'] / resetThreshold
        return(cost)
   
def optimize(function, dimensions, lower_boundary, upper_boundary, max_iter, maximize=False):
    """
    credits to https://github.com/angelgaspar/randomsearch.git

    """
    best_solution = np.array([float()] * dimensions)
    plot_data = np.array([])
    for i in range(dimensions):
        best_solution[i] = random.uniform(lower_boundary[i], upper_boundary[i])

    for _ in range(max_iter):

        new_solution = [lower_boundary[d] + random.random() * (upper_boundary[d] - lower_boundary[d]) for d in
                        range(dimensions)]
        try:
            solution1 = function(best_solution)
            plot_data = np.append(plot_data,solution1)


            if np.greater_equal(new_solution, lower_boundary).all() and np.less_equal(new_solution, upper_boundary).all():
                solution2 = function(new_solution)
            elif maximize:
                solution2 = -100000.0
            else:
                solution2 = 100000.0

            if solution2 > solution1 and maximize:
                best_solution = new_solution
            elif solution2 < solution1 and not maximize:
                best_solution = new_solution
        except:
            best_solution = new_solution

    best_fitness = function(best_solution)

    return best_fitness, best_solution, plot_data

def randomSearch(files): 
    opt = Optimization(files)
    a,b = rs.optimize(opt.cost, 4, [0, 0, 0 , 1000000], [1, 1, 0.5, 1000000], 100)
    print("Best achieved cost: ", a)
    print("avg factor: ", b[0])
    print("switch: ", b[1])
    print("border: ", b[2])
    print("reset: ", b[3], "(reset cost:", weight['resetThreshold'] / b[3], ")")

def plotCostHelper(v):
    opt = Optimization(measurementFiles[0:3])
    x = v[0]
    y = v[1]
    return(opt.cost([x, y, 0.30796802554860314, 1000000]))

def plotCost():
    def f(xs, ys):
        #return([opt.cost([x, y, 0.30796802554860314, 1000000]) for x, y in zip(xs, ys)])
        pool = Pool()
        result = pool.map(plotCostHelper, zip(xs, ys))
        return(result)
        
    fig = plt.figure()
    ax = fig.gca(projection='3d')
    ax.set_xlabel('avg factor')
    ax.set_ylabel('switch')
    ax.set_zlabel('Cost')
    
    # Make data.
    X = np.arange(0, 1, 0.2)
    Y = np.arange(0, 1, 0.2)
    X, Y = np.meshgrid(X, Y)
    
    zs = np.array(f(np.ravel(X), np.ravel(Y)))
    Z = zs.reshape(X.shape)

    # Plot the surface.
    surf = ax.plot_surface(X, Y, Z, cmap=cm.coolwarm,
                           linewidth=0, antialiased=False)

    # Customize the z axis.
    ax.set_zlim(0, 1)

    # Add a color bar which maps values to colors.
    fig.colorbar(surf, shrink=0.5, aspect=5)

    plt.show()
    
def nelderMead(func, initialValue):
    res = minimize(func, initialValue, method='Nelder-Mead', options={'disp' : True, 'maxiter' : 1000, 'return_all' : True})
    return(func(res.x))

def powell(func, initialValue):
    res = minimize(func, initialValue, method='Powell', bounds=[(0,1),(0,1),(0,0.5),(1,1000001)], options={'disp' : True, 'return_all' : True})
    return(func(res.x))

def randomizedNelderMead(files):
    opt = Optimization(files)
    f = lambda params : nelderMead(opt.cost, params)
    a,b = rs.optimize(f, 4, [0, 0, 0 , 5], [1, 1, 0.5, 30], 10)
    print("Best achieved cost: ", a)
    print("avg factor: ", b[0])
    print("switch: ", b[1])
    print("border: ", b[2])
    print("reset: ", b[3], "(reset cost:", weight['resetThreshold'] / b[3], ")")
    
def randomizedPowell(files):
    opt = Optimization(files)
    f = lambda params : powell(opt.cost, params)
    a,b = rs.optimize(f, 4, [0, 0, 0 , 1000000], [1, 1, 0.5, 1000000], 10)
    print("Best achieved cost: ", a)
    print("avg factor: ", b[0])
    print("switch: ", b[1])
    print("border: ", b[2])
    print("reset: ", b[3], "(reset cost:", weight['resetThreshold'] / b[3], ")")
    
if __name__ == "__main__":
    measurementFiles = ['flurinGatheredDataPage1-11endedAt21_07_24.csv', 'lukasJustReadingGatheredDataPage1-4endedAt18_08_42.csv', 'lukasJustReadingGatheredDataPage7-12endedAt18_14_56.csv', 'exampleData.csv', 'perfectArtificalTestData.csv']

    params = [  [0.9, 0.1, 0, 1000000], # good for the artificial example
                [0.2, 0.8 , 0.05, 1000000], # values in prototype so far
                [0.045, 0.9, 0.3, 10], # old opt output
            ]

    if(False):
       randomSearch(measurementFiles[0:3])

    if(False):
        randomizedNelderMead(measurementFiles[0:3])
        
    if(False):
        randomizedPowell(measurementFiles[0:3])
        
    if(False):
        # example values
        opt = Optimization(measurementFiles[-1:])
        for p in params:
            print("Example: cost(" + str(p) + ") = " + str(opt.cost(p)), "(reset cost:", weight['resetThreshold'] / p[3], ")")
    
    if(False):
        # Powell with example values
        opt = Optimization(measurementFiles[0:3])
        for p in params:
            r = minimize(opt.cost, p, method='Powell', bounds=[(0,1),(0,1),(0,0.5),(1,1000001)], options={'disp' : True, 'return_all' : True})
            # 'direc': [[0.1,0,0,0],[0,0.1,0,0],[0,0,0.1,0],[0,0,0,0.1]], 
            print("Example: ", str(p), "->", str(r.x), "cost(" + str(r.x) + ") = ", opt.cost(r.x), "(reset cost:", weight['resetThreshold'] / r.x[3], ")")
    
    if(False):
        # Nelder-Mead with fixed iv
        opt = Optimization(measurementFiles[0:3])
        params = [0.045, 0.9, 0.3, 10] # pretty good
        res = minimize(opt.cost, params, method='Nelder-Mead', options={'disp':True, 'maxiter':1000, 'return_all':True})
        print("avg factor: ", res.x[0])
        print("switch: ", res.x[1])
        print("border: ", res.x[2])
        print("reset: ", res.x[3], "(reset cost:", weight['resetThreshold'] / res.x[3], ")")


    if(False):
        # something with plots
        opt = Optimization(measurementFiles[0:3])
        a,b,c = optimize(opt.cost, 4,[0,0,0,1],[1,1,1,30],1000)

    if(True):
        # plot cost over first two arguments, using hard coded files
        plotCost()
