import React, { useState, useRef, useEffect } from 'react';
import './App.css';

const App = () => {
  const canvasRef = useRef(null);
  const [points, setPoints] = useState([]);
  const [lines, setLines] = useState([]);
  const [selectedPoint, setSelectedPoint] = useState(null);
  const [flowLabels, setFlowLabels] = useState({});
  const [equations, setEquations] = useState([]);
  const [mode, setMode] = useState("edit");
  const [buttonLabel, setButtonLabel] = useState("Edit Mode");
  const [draggingPoint, setDraggingPoint] = useState(null);
  const [steps] = useState([]);
  const [currentStep, setCurrentStep] = useState(0);


  const updateEquations = (lines, flowLabels) => {
    const nodeConnections = {};
    const newEquations = []; 

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
    console.log("Generated equations:", newEquations); 
    setEquations(newEquations);
  };

  const createPoint = (x, y) => {
    const newPoint = { x, y, id: points.length };
    setPoints((prev) => [...prev, newPoint]);
  };
  const createFlow = (start, end) => {
    if (start.id === end.id) return; 
    
  
    const label = prompt('Enter a constant (number) or variable (letter) for this flow:');
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
  
const removePoint = (e) => {
  e.preventDefault()
    const { offsetX, offsetY } = e.nativeEvent;

    const pointIndex = points.findIndex((point) => {
      return (
        Math.abs(point.x - offsetX) < 15 && Math.abs(point.y - offsetY) < 15
      );
    });

    if (pointIndex !== -1) {
      setPoints((prev) => prev.filter((_, index) => index !== pointIndex));
      setLines((prev) => prev.filter(
        (line) =>
          line.start.id !== points[pointIndex].id &&
          line.end.id !== points[pointIndex].id
      ));
    }
  };

  const toggleMode = () => {
    if (mode === "edit") {
      setMode("connect");
      setButtonLabel("Switch to Edit Mode");
    } else {
      setMode("edit");
      setButtonLabel("Switch to Connect Mode");
    }
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
        setSelectedPoint(null);
      } else {
        setSelectedPoint(clickedPoint);
      }
    }
  };

  const handleMouseDown = (e) => {
    if (mode === "connect") return;
    const { offsetX, offsetY } = e.nativeEvent;
  
    const clickedPoint = points.find(
      (point) => Math.abs(point.x - offsetX) < 10 && Math.abs(point.y - offsetY) < 10
    );
  
    if (clickedPoint) {
      setDraggingPoint(clickedPoint);
    } else if (mode === "edit") {
      createPoint(offsetX, offsetY);
    }
  };
  
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
    setDraggingPoint(null);
  };
  const drawArrow = (ctx, startX, startY, endX, endY, label) => {
    const arrowSize = 10;
    const angle = Math.atan2(endY - startY, endX - startX);
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#FF5722';
    ctx.stroke();
  
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

    const midX = (startX + endX) / 2;
    const midY = (startY + endY) / 2;
    ctx.fillStyle = 'black';
    ctx.font = '12px Arial';
    ctx.fillText(label, midX, midY);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  
    points.forEach((point) => {
      ctx.beginPath();
      ctx.arc(point.x, point.y, 10, 0, Math.PI * 2);
      ctx.fillStyle = "orange";
      ctx.fill();
    });
  
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
        <button className="solve-button" onClick={null}>
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
