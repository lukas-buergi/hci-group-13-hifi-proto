#!/usr/bin/env python3
import math
import csv

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
    
    def __init__(self, gazeAveragingFactor, gazeSwitchThreshold, gazeBorder):
        self.gazeAveragingFactor = gazeAveragingFactor
        self.gazeSwitchThreshold = gazeSwitchThreshold
        self.gazeBorder = gazeBorder
        
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
        tdiff = m.time - self.lastGazeTime # ms
        self.lastGazeTime = m.time
        tdiff = tdiff / 1000.0 # s
        trel = tdiff / (1.0 / self.GAZE_REFERENCE_FREQUENCY) # fraction of reference period that passed since last time
        oldDataWeight = math.pow(1-self.gazeAveragingFactor, trel)
        self.recentAverageGaze = self.recentAverageGaze * oldDataWeight + position * (1-oldDataWeight)
        if(abs(self.currentNormalizedGaze - self.recentAverageGaze) > self.gazeSwitchThreshold):
            if(m.pageUpper > m.pageLower):
                return(SimulatedMeasurement([m.time, m.pageUpper, m.pageLower+2]))
            else:
                return(SimulatedMeasurement([m.time, m.pageUpper+2, m.pageLower]))
        else:
            return(SimulatedMeasurement([m.time, m.pageUpper, m.pageLower]))
        

    def add(self, measurement):
        if(self.measurements == []):
            self.lastGazeTime = measurement.time
        self.measurements.append(measurement)
        position = self.boundingBox()
        if(position != self.NONE):
            sm=self.average(position)
        else:
            sm=measurement
        self.simulation.append(sm)
            
    def addAll(self, measurements):
        for m in measurements:
            self.add(m)

def cost(gazeAveragingFactor, gazeSwitchThreshold, gazeBorder):
    # run simulation
    measurementFiles = ['exampleData.csv']
    measurements = {}
    simulations = {}
    for measurement in measurementFiles:
        with open(measurement, newline='') as csvfile:
            reader = csv.reader(csvfile)
            header = reader.__next__()
            measurements[measurement] = []
            for row in reader:
                measurements[measurement].append(Measurement(row))
        simulations[measurement] = Model(gazeAveragingFactor, gazeSwitchThreshold, gazeBorder)
        simulations[measurement].addAll(measurements[measurement])
    
    # determine the cost
    cost = 0
    for key, simulation in simulations.items():
        while len(simulation.simulation) > 0:
            sim = simulation.simulation.pop()
            mea = simulation.measurements.pop()
            if(sim.pageUpper != mea.pageUpper or sim.pageLower != mea.pageLower):
                cost += 1
    return(cost)
    
if __name__ == "__main__":
    print("Cost: " + str(cost(0.2, 0.8, 0.05)))
