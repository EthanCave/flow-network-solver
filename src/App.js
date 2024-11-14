import React, { useState, useRef, useEffect } from 'react';
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
      setFlowLabels((prevLabels) => ({
        ...prevLabels,
        [lineId]: label,
      }));
      setLines((prev) => [...prev, { start, end, lineId }]);
      updateEquations([...lines, { start, end, lineId }], { ...flowLabels, [lineId]: label });
    } else {
      alert("Please enter a single letter for variables or a number for constants.");
    }
  };

  // Update equations whenever flows or labels change
// Update equations based on flows for each node
const updateEquations = () => {
  const nodeConnections = {}; // Track incoming and outgoing connections for each node

  // Step 1: Populate nodeConnections with input and output connections for each node
  lines.forEach((line) => {
    const { start, end } = line;
    const label = flowLabels[line.lineId];

    // Initialize nodes in nodeConnections if they don't already exist
    if (!nodeConnections[start.id]) nodeConnections[start.id] = { inputs: [], outputs: [] };
    if (!nodeConnections[end.id]) nodeConnections[end.id] = { inputs: [], outputs: [] };

    // Classify the label as an output from the start node and an input to the end node
    nodeConnections[start.id].outputs.push(label); // Flow leaves start node
    nodeConnections[end.id].inputs.push(label);    // Flow enters end node
  });

  const diagnostics = []; // Array to hold diagnostic information for each node
  const newEquations = []; // Array to hold the final equations

  // Output details for every node, regardless of its inputs and outputs
  Object.keys(nodeConnections).forEach((nodeId) => {
    const { inputs, outputs } = nodeConnections[nodeId];

    // Log inputs and outputs for each node
    diagnostics.push(`Node ${nodeId}: Inputs = [${inputs.join(", ")}], Outputs = [${outputs.join(", ")}]`);

    // Generate an equation for each node, even if it's trivial
    const inputSum = inputs.length > 0 ? inputs.join(" + ") : "0";
    const outputSum = outputs.length > 0 ? outputs.join(" + ") : "0";
    newEquations.push(`${outputSum} = ${inputSum}`);
  });

  if (diagnostics.length === 0) {
    diagnostics.push("No connections found between nodes.");
  }

  // Combine diagnostics and equations for display
  const combinedOutput = [...diagnostics, "Generated Equations:", ...newEquations];
  setEquations(combinedOutput);
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
  
  // Solve the network by converting flows into equations
  const solveNetwork = () => {
    const equations = [];
    const constants = [];
    lines.forEach((line) => {
      const flowLabel = flowLabels[line.lineId];
      if (flowLabel === 'variable') {
        equations.push([1, 0, -1]);
        constants.push(0);
      } else if (flowLabel === 'constant') {
        equations.push([0, 1, 1]);
        constants.push(1);
      }
    });

    const matrix = gaussianElimination(equations, constants);
    setEquations({ equations, matrix });
  };


// Gaussian elimination function
  const gaussianElimination = (matrix, constants) => {
    try {
      const augmentedMatrix = matrix.map((row, i) => row.concat([constants[i]]));
      const n = augmentedMatrix.length;

      for (let i = 0; i < n; i++) {
        let maxRow = i;
        for (let j = i + 1; j < n; j++) {
          if (Math.abs(augmentedMatrix[j][i]) > Math.abs(augmentedMatrix[maxRow][i])) {
            maxRow = j;
          }
        }

        [augmentedMatrix[i], augmentedMatrix[maxRow]] = [augmentedMatrix[maxRow], augmentedMatrix[i]];

        for (let j = i + 1; j < n; j++) {
          const factor = augmentedMatrix[j][i] / augmentedMatrix[i][i];
          for (let k = i; k < n + 1; k++) {
            augmentedMatrix[j][k] -= factor * augmentedMatrix[i][k];
          }
        }
      }

      const solution = Array(n).fill(0);
      for (let i = n - 1; i >= 0; i--) {
        solution[i] = augmentedMatrix[i][n] / augmentedMatrix[i][i];
        for (let j = i - 1; j >= 0; j--) {
          augmentedMatrix[j][n] -= augmentedMatrix[j][i] * solution[i];
        }
      }

      return solution;
    } catch (error) {
      console.error("Error solving the system:", error);
      return [];
    }
  };


  // Handle canvas clicks based on mode
  const handleCanvasClick = (e) => {
    const { offsetX, offsetY } = e.nativeEvent;
  
    if (mode === 'edit') {
      // Create a new point if in edit mode
      createPoint(offsetX, offsetY);
    } else if (mode === 'connect') {
      // Connect two points if in connection mode
      const clickedPoint = points.find(
        (point) => Math.abs(point.x - offsetX) < 15 && Math.abs(point.y - offsetY) < 15
      );
  
      if (clickedPoint && selectedPoint) {
        // Only create flow if points are distinct
        if (clickedPoint.id !== selectedPoint.id) {
          createFlow(selectedPoint, clickedPoint);
        }
        setSelectedPoint(null); // Reset selected point after connecting
      } else {
        setSelectedPoint(clickedPoint); // Set the first point for connection
      }
    }
  };

  // Mouse down for dragging points

  const handleMouseDown = (e) => {
    if (mode === "connect") return; // Disable dragging in connect mode
    
    const { offsetX, offsetY } = e.nativeEvent;
    
    const clickedPoint = points.find(
      (point) => Math.abs(point.x - offsetX) < 5 && Math.abs(point.y - offsetY) < 5
    );
    
    if (clickedPoint) {
      setDraggingPoint(clickedPoint);
    } else if (mode === "edit") {
      setPoints((prevPoints) => [
        ...prevPoints,
        { id: `point-${prevPoints.length + 1}`, x: offsetX, y: offsetY },
      ]);
    }
  };

  // Mouse move to drag the points

  const handleMouseMove = (e) => {
    if (draggingPoint && mode === "edit") {
      const { offsetX, offsetY } = e.nativeEvent;
      
      setPoints((prevPoints) =>
        prevPoints.map((point) =>
          point.id === draggingPoint.id
            ? { ...point, x: offsetX, y: offsetY }
            : point
        )
      );
  
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
    // End dragging without adding a new point
    setDraggingPoint(null);
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
      ctx.arc(point.x, point.y, 5, 0, Math.PI * 2);
      ctx.fillStyle = "blue";
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
    </div>
  );
  
  
};

export default App;
