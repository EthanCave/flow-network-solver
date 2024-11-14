import React, { useState, useRef, useEffect } from 'react';
import './App.css';

const App = () => {
  const canvasRef = useRef(null);
  const [points, setPoints] = useState([]);
  const [lines, setLines] = useState([]);
  const [mode, setMode] = useState('Drag Mode');
  const [selectedPoint, setSelectedPoint] = useState(null);
  const [flowLabels, setFlowLabels] = useState({});
  const [equations, setEquations] = useState([]);
  const [draggingPoint, setDraggingPoint] = useState(null);

  // Create a new point on click
  const createPoint = (x, y) => {
    const newPoint = { x, y, id: points.length };
    setPoints((prev) => [...prev, newPoint]);
  };

  // Create a flow (connection) between two points
  const createFlow = (start, end) => {
    const lineId = `${start.id}-${end.id}`;
    const label = prompt('Label the flow (variable/constant):');
    if (label === 'variable' || label === 'constant') {
      setFlowLabels((prevLabels) => ({
        ...prevLabels,
        [lineId]: label,
      }));
      setLines((prev) => [...prev, { start, end, lineId }]);
      updateEquations(); // Update equations when a flow is created
    }
  };

  // Update equations whenever flows or labels change
  const updateEquations = () => {
    const newEquations = lines.map((line) => {
      const label = flowLabels[line.lineId];
      if (label === 'variable') {
        return 'x = 0';  // Placeholder for variable equation
      } else if (label === 'constant') {
        return 'C = 1';  // Placeholder for constant equation
      }
      return null;
    }).filter((eq) => eq !== null);

    setEquations(newEquations);
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
    setMode((prevMode) => (prevMode === 'Drag Mode' ? 'Connect Mode' : 'Drag Mode'));
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
  };

  // Handle canvas clicks based on mode
  const handleCanvasClick = (e) => {
    const { offsetX, offsetY } = e.nativeEvent;

    if (mode === 'Drag Mode') {
      createPoint(offsetX, offsetY);
    } else if (mode === 'Connect Mode') {
      const clickedPoint = points.find(
        (point) =>
          Math.abs(point.x - offsetX) < 15 && Math.abs(point.y - offsetY) < 15
      );
      if (clickedPoint && selectedPoint) {
        createFlow(selectedPoint, clickedPoint);
        setSelectedPoint(null); // Reset selected point after connecting
      } else {
        setSelectedPoint(clickedPoint); // Set the first point for connection
      }
    }
  };

  // Mouse down for dragging points
  const handleMouseDown = (e) => {
    if (mode !== 'Drag Mode') return;

    const { offsetX, offsetY } = e.nativeEvent;
    const point = points.find((point) => {
      return (
        Math.abs(point.x - offsetX) < 15 && Math.abs(point.y - offsetY) < 15
      );
    });

    if (point) {
      setDraggingPoint(point);
    }
  };

  // Mouse move to drag the points
  const handleMouseMove = (e) => {
    if (draggingPoint) {
      const { offsetX, offsetY } = e.nativeEvent;
      setPoints((prevPoints) =>
        prevPoints.map((point) =>
          point.id === draggingPoint.id
            ? { ...point, x: offsetX, y: offsetY }
            : point
        )
      );
    }
  };

  // Mouse up to stop dragging the point
  const handleMouseUp = () => {
    setDraggingPoint(null);
  };

  // Draw an arrow at the end of the flow
  const drawArrow = (ctx, startX, startY, endX, endY) => {
    const arrowSize = 10;
    const angle = Math.atan2(endY - startY, endX - startX);

    // Draw the line first
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.lineWidth = 2;  // Set line width
    ctx.strokeStyle = '#FF5722';  // Set line color (orange)
    ctx.stroke();

    // Draw the arrowhead
    ctx.beginPath();
    ctx.moveTo(endX, endY);
    ctx.lineTo(endX - arrowSize * Math.cos(angle - Math.PI / 6), endY - arrowSize * Math.sin(angle - Math.PI / 6));
    ctx.moveTo(endX, endY);
    ctx.lineTo(endX - arrowSize * Math.cos(angle + Math.PI / 6), endY - arrowSize * Math.sin(angle + Math.PI / 6));
    ctx.stroke();
  };

  // UseEffect to draw on the canvas when points or lines change
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    ctx.clearRect(0, 0, canvas.width, canvas.height);  // Clear the canvas before re-drawing

    // Draw points
    points.forEach((point) => {
      ctx.beginPath();
      ctx.arc(point.x, point.y, 5, 0, Math.PI * 2);
      ctx.fillStyle = 'blue';
      ctx.fill();
    });

    // Draw lines between points
    lines.forEach((line) => {
      drawArrow(ctx, line.start.x, line.start.y, line.end.x, line.end.y);
    });
  }, [points, lines]);

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
          {mode}
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
