import React, { useState, useRef, useEffect } from 'react';
import { lusolve } from 'mathjs';
import './App.css';

const App = () => {
  const canvasRef = useRef(null);
  const [points, setPoints] = useState([]);
  const [lines, setLines] = useState([]);
  const [selectedPoint, setSelectedPoint] = useState(null);
  const [flowLabels, setFlowLabels] = useState({});
  const [equations, setEquations] = useState([]);
  const [mode, setMode] = useState("edit"); // "edit" or "connect"
  const [buttonLabel, setButtonLabel] = useState("Edit Mode");
  const [draggingPoint, setDraggingPoint] = useState(null);
  const [eliminationSteps, setEliminationSteps] = useState([]);
  const [steps, setSteps] = useState([]);
  const [currentStep, setCurrentStep] = useState(0);


  const updateEquations = (lines, flowLabels) => {
    const nodeConnections = {}; // Track incoming and outgoing connections for each node
    const newEquations = []; // Array to hold the final equations

    lines.forEach((line) => {
      const { start, end } = line;
      const label = flowLabels[line.lineId];
      if (!nodeConnections[start.id]) nodeConnections[start.id] = { inputs: [], outputs: [] };
      if (!nodeConnections[end.id]) nodeConnections[end.id] = { inputs: [], outputs: [] };
      nodeConnections[start.id].outputs.push(label);
      nodeConnections[end.id].inputs.push(label);
    });

    Object.keys(nodeConnections).forEach((nodeId) => {
      const { inputs, outputs } = nodeConnections[nodeId];
      if (inputs.length > 0 && outputs.length > 0) {
        const inputSum = inputs.join(" + ");
        const outputSum = outputs.join(" + ");
        newEquations.push(`${outputSum} = ${inputSum}`);
      }
    });
    console.log("Generated equations:", newEquations); // Log the equations generated
    setEquations(newEquations);
  };

  // Solve network and set elimination steps
  function solveNetwork(equations) {
    // Check if `equations` is defined and is an array
    if (!Array.isArray(equations)) {
        console.error("Expected an array of equations, but got:", equations);
        return null;
    }

    const variables = new Set();

    // Process each equation to find variables
    equations.forEach(eq => {
        const variableMatches = eq.match(/[a-zA-Z]+/g);
        variableMatches.forEach(variable => variables.add(variable));
    });

    const variableList = Array.from(variables);
    const variableIndex = variableList.reduce((obj, v, i) => {
        obj[v] = i;
        return obj;
    }, {});

    const leftMatrix = [];
    const rightConstants = [];

    equations.forEach(eq => {
        const [leftSide, rightSide] = eq.split("=").map(side => side.trim());

        const leftCoefficients = Array(variableList.length).fill(0);
        let rightConstant = 0;

        const leftTerms = leftSide.split(/(?=\+|-)/).map(term => term.trim());
        leftTerms.forEach(term => {
            const variableMatch = term.match(/[a-zA-Z]+/);
            const coefficientMatch = term.match(/-?\d+/);

            if (variableMatch) {
                const variable = variableMatch[0];
                const coefficient = coefficientMatch ? parseFloat(coefficientMatch[0]) : 1;
                const index = variableIndex[variable];
                leftCoefficients[index] = coefficient;
            } else if (coefficientMatch) {
                rightConstant -= parseFloat(coefficientMatch[0]);
            }
        });

        const rightTerms = rightSide.split(/(?=\+|-)/).map(term => term.trim());
        rightTerms.forEach(term => {
            const constantMatch = term.match(/-?\d+/);
            if (constantMatch) {
                rightConstant += parseFloat(constantMatch[0]);
            }
        });

        leftMatrix.push(leftCoefficients);
        rightConstants.push(rightConstant);
    });

    console.log("Left Matrix:", leftMatrix);
    console.log("Right Constants:", rightConstants);

    const result = {};
    if (leftMatrix.length === 2 && leftMatrix[0].length === 2) {
        const [[a, b], [c, d]] = leftMatrix;
        const [e, f] = rightConstants;
        const determinant = a * d - b * c;
        if (determinant !== 0) {
            result[variableList[0]] = (e * d - b * f) / determinant;
            result[variableList[1]] = (a * f - e * c) / determinant;
        } else {
            console.error("No unique solution for this system.");
            return null;
        }
    } else if (leftMatrix.length === 3 && leftMatrix[0].length === 3) {
        const [[a, b, c], [d, e, f], [g, h, i]] = leftMatrix;
        const [j, k, l] = rightConstants;

        const determinant = a * (e * i - f * h) - b * (d * i - f * g) + c * (d * h - e * g);
        if (determinant !== 0) {
            result[variableList[0]] =
                (j * (e * i - f * h) - b * (k * i - f * l) + c * (k * h - e * l)) /
                determinant;
            result[variableList[1]] =
                (a * (k * i - f * l) - j * (d * i - f * g) + c * (d * l - k * g)) /
                determinant;
            result[variableList[2]] =
                (a * (e * l - k * h) - b * (d * l - k * g) + j * (d * h - e * g)) /
                determinant;
        } else {
            console.error("No unique solution for this system.");
            return null;
        }
    } else {
        console.error("Unsupported matrix size. Use a library for larger systems.");
        return null;
    }

    return result;
}



  
  
  
  
  

  const evaluateExpression = (expr) => {
    try {
      return eval(expr);
    } catch (error) {
      console.error("Error evaluating expression:", expr);
      return NaN;
    }
  };

  const parseTerms = (expr) => {
    const terms = [];
    const regex = /([+-]?\s*\d*)\s*([a-z])/g;
    let match;
    while ((match = regex.exec(expr)) !== null) {
      const coefficient = match[1] === "" || match[1] === "+" ? 1 : parseFloat(match[1].replace(/\s+/g, ""));
      const variable = match[2];
      terms.push({ variable, coefficient });
    }
    return terms;
  };
  
  // Create a new point on click
  const createPoint = (x, y) => {
    const newPoint = { x, y, id: points.length };
    setPoints((prev) => [...prev, newPoint]);
  };

  // Create a flow (connection) between two points
  const createFlow = (start, end) => {
    if (start.id === end.id) return; // Prevent self-loops
    
  
    const label = prompt('Enter a constant (number) or variable (letter) for this flow:');
  
    // Check if label is valid (letters for variables, numbers for constants)
    const isVariable = /^[A-Za-z]$/.test(label);
    const isConstant = /^[0-9]+$/.test(label);
  
    if (isVariable || isConstant) {
      const lineId = `${start.id}-${end.id}`;
      setFlowLabels((prevLabels) => {
        const updatedLabels = { ...prevLabels, [lineId]: label };
        return updatedLabels;
      });
  
      setLines((prevLines) => {
        const updatedLines = [...prevLines, { start, end, lineId }];
        updateEquations(updatedLines, { ...flowLabels, [lineId]: label });
        return updatedLines;
      });
    } else {
      alert("Please enter a single letter for variables or a number for constants.");
    }
  };
  
  // Remove a point using right-click
const removePoint = (e) => {
  e.preventDefault(); // Prevent the default context menu
    const { offsetX, offsetY } = e.nativeEvent;

    // Find the clicked point based on proximity to the click
    const pointIndex = points.findIndex((point) => {
      return (
        Math.abs(point.x - offsetX) < 15 && Math.abs(point.y - offsetY) < 15
      );
    });

    // If point is found, remove it from the state
    if (pointIndex !== -1) {
      setPoints((prev) => prev.filter((_, index) => index !== pointIndex));
      setLines((prev) => prev.filter(
        (line) =>
          line.start.id !== points[pointIndex].id &&
          line.end.id !== points[pointIndex].id
      )); // Remove lines associated with the point
    }
  };

  // Toggle between Drag Mode and Connect Mode
  const toggleMode = () => {
    if (mode === "edit") {
      setMode("connect");
      setButtonLabel("Switch to Edit Mode");
    } else {
      setMode("edit");
      setButtonLabel("Switch to Connect Mode");
    }
  };
  
  // Solve the network by converting flows into equation


// Gaussian elimination function
const gaussianEliminationWithSteps = (matrix, constants) => {
  const steps = [];
  const n = matrix.length;

  for (let i = 0; i < n; i++) {
    // Pivot to bring the highest value to the diagonal
    let maxRow = i;
    for (let k = i + 1; k < n; k++) {
      if (Math.abs(matrix[k][i]) > Math.abs(matrix[maxRow][i])) {
        maxRow = k;
      }
    }
    [matrix[i], matrix[maxRow]] = [matrix[maxRow], matrix[i]];
    [constants[i], constants[maxRow]] = [constants[maxRow], constants[i]];

    steps.push(`Pivot on row ${i + 1}. Matrix: ${JSON.stringify(matrix)} Constants: ${JSON.stringify(constants)}`);

    // Elimination process
    for (let k = i + 1; k < n; k++) {
      const factor = matrix[k][i] / matrix[i][i];
      for (let j = i; j < n; j++) {
        matrix[k][j] -= factor * matrix[i][j];
      }
      constants[k] -= factor * constants[i];

      steps.push(`Eliminate row ${k + 1} using row ${i + 1}. Matrix: ${JSON.stringify(matrix)} Constants: ${JSON.stringify(constants)}`);
    }
  }

  // Back substitution
  const x = Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    x[i] = constants[i];
    for (let k = i + 1; k < n; k++) {
      x[i] -= matrix[i][k] * x[k];
    }
    x[i] /= matrix[i][i];
    steps.push(`Solve for variable ${i + 1}. Solution: ${JSON.stringify(x)}`);
  }

  return [x, steps];
};


const handleNextStep = () => {
  if (currentStep < steps.length - 1) {
    setCurrentStep(currentStep + 1);
  }
};

const handlePreviousStep = () => {
  if (currentStep > 0) {
    setCurrentStep(currentStep - 1);
  }
};


  // Handle canvas clicks based on mode
  const handleCanvasClick = (e) => {
    const { offsetX, offsetY } = e.nativeEvent;
  
    if (mode === 'edit') {
    } else if (mode === 'connect') {
      const clickedPoint = points.find(
        (point) => Math.abs(point.x - offsetX) < 15 && Math.abs(point.y - offsetY) < 15
      );
  
      if (clickedPoint && selectedPoint) {
        if (clickedPoint.id !== selectedPoint.id) {
          createFlow(selectedPoint, clickedPoint);
        }
        setSelectedPoint(null); // Reset selected point after connecting
      } else {
        setSelectedPoint(clickedPoint);
      }
    }
  };
  

  // Mouse down for dragging points

  const handleMouseDown = (e) => {
    if (mode === "connect") return; // Disable dragging in connect mode
    
    const { offsetX, offsetY } = e.nativeEvent;
  
    // Find the point that was clicked on (within a small radius)
    const clickedPoint = points.find(
      (point) => Math.abs(point.x - offsetX) < 10 && Math.abs(point.y - offsetY) < 10
    );
  
    if (clickedPoint) {
      // Set the selected point for dragging if it exists
      setDraggingPoint(clickedPoint);
    } else if (mode === "edit") {
      // Only create a new point if not dragging an existing point
      createPoint(offsetX, offsetY);
    }
  };
  

  // Mouse move to drag the points

  const handleMouseMove = (e) => {
    if (draggingPoint && mode === "edit") {
      const { offsetX, offsetY } = e.nativeEvent;
      
      // Update the position of the point being dragged
      setPoints((prevPoints) =>
        prevPoints.map((point) =>
          point.id === draggingPoint.id
            ? { ...point, x: offsetX, y: offsetY }
            : point
        )
      );
  
      // Update line positions to follow the dragged point
      setLines((prevLines) =>
        prevLines.map((line) =>
          line.start.id === draggingPoint.id
            ? { ...line, start: { ...line.start, x: offsetX, y: offsetY } }
            : line.end.id === draggingPoint.id
            ? { ...line, end: { ...line.end, x: offsetX, y: offsetY } }
            : line
        )
      );
    }
  };
  
  const handleMouseUp = () => {
    setDraggingPoint(null); // Clear the dragging state
  };

  // Draw an arrow at the end of the flow
  const drawArrow = (ctx, startX, startY, endX, endY, label) => {
    const arrowSize = 10;
    const angle = Math.atan2(endY - startY, endX - startX);
  
    // Draw the line
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#FF5722';
    ctx.stroke();
  
    // Draw the arrowhead
    ctx.beginPath();
    ctx.moveTo(endX, endY);
    ctx.lineTo(
      endX - arrowSize * Math.cos(angle - Math.PI / 6),
      endY - arrowSize * Math.sin(angle - Math.PI / 6)
    );
    ctx.moveTo(endX, endY);
    ctx.lineTo(
      endX - arrowSize * Math.cos(angle + Math.PI / 6),
      endY - arrowSize * Math.sin(angle + Math.PI / 6)
    );
    ctx.stroke();
  
    // Draw the label at the midpoint of the line
    const midX = (startX + endX) / 2;
    const midY = (startY + endY) / 2;
    ctx.fillStyle = 'black';
    ctx.font = '12px Arial';
    ctx.fillText(label, midX, midY);
  };

  // UseEffect to draw on the canvas when points or lines change
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  
    // Draw points
    points.forEach((point) => {
      ctx.beginPath();
      ctx.arc(point.x, point.y, 10, 0, Math.PI * 2);
      ctx.fillStyle = "orange";
      ctx.fill();
    });
  
    // Draw lines with labels
    lines.forEach((line) => {
      const label = flowLabels[line.lineId];
      drawArrow(ctx, line.start.x, line.start.y, line.end.x, line.end.y, label);
    });
  }, [points, lines, flowLabels]);
  

  return (
    <div className="App">
      <div className="canvas-container" onContextMenu={removePoint}>
        <canvas
          ref={canvasRef}
          width={800}
          height={600}
          onClick={handleCanvasClick}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
        />
      </div>
  
      <div className="controls">
        <button className="mode-button" onClick={toggleMode}>
          {buttonLabel}
        </button>
        <button className="solve-button" onClick={solveNetwork}>
          Solve Network
        </button>
      </div>
  
      <div className="equations">
        <h3>Equations:</h3>
        {equations.length > 0 ? (
          equations.map((eq, index) => <div key={index}>{eq}</div>)
        ) : (
          <p>No equations available</p>
        )}
      </div>

      <div className="steps">
        <h3>Gaussian Elimination Steps:</h3>
        {steps.length > 0 ? (
          <div>
            <p>{steps[currentStep]}</p>
            <button onClick={handlePreviousStep} disabled={currentStep === 0}>
              Previous
            </button>
            <button onClick={handleNextStep} disabled={currentStep === steps.length - 1}>
              Next
            </button>
          </div>
        ) : (
          <p>No steps available</p>
        )}
      </div>
    </div>
  );
  
  
};

export default App;
