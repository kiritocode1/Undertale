"use client";

import type React from "react";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { InfoIcon, PlayIcon, PauseIcon, RefreshCwIcon, UploadIcon, Settings2Icon } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

export default function GameOfLife() {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const containerRef = useRef<HTMLDivElement>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);
	const [isRunning, setIsRunning] = useState(false);
	const [speed, setSpeed] = useState(100);
	const [cellSize, setCellSize] = useState(5);
	const [grid, setGrid] = useState<boolean[][]>([]);
	const animationFrameRef = useRef<number | null>(null);
	const lastUpdateTimeRef = useRef<number>(0);
	const [message, setMessage] = useState<{ type: "success" | "error" | "info"; text: string }>({
		type: "info",
		text: "Upload a matrix file or use the default pattern",
	});
	// const [showControls, setShowControls] = useState(true);

	// Initialize grid based on canvas size and window resize
	useEffect(() => {
		if (!canvasRef.current || !containerRef.current) return;

		const resizeCanvas = () => {
			const canvas = canvasRef.current;
			if (!canvas) return;

			// Set canvas to full container size
			canvas.width = containerRef.current?.clientWidth || window.innerWidth;
			canvas.height = containerRef.current?.clientHeight || window.innerHeight;

			// Calculate grid dimensions
			const cols = Math.floor(canvas.width / cellSize);
			const rows = Math.floor(canvas.height / cellSize);

			// Initialize empty grid
			const initialGrid = Array(rows)
				.fill(null)
				.map(() => Array(cols).fill(false));

			// Create a simple default pattern (a glider)
			const defaultPattern = [
				[0, 1, 0],
				[0, 0, 1],
				[1, 1, 1],
			];

			// Place the default pattern in the center of the grid
			const centerRow = Math.floor(rows / 2) - Math.floor(defaultPattern.length / 2);
			const centerCol = Math.floor(cols / 2) - Math.floor(defaultPattern[0].length / 2);

			for (let i = 0; i < defaultPattern.length; i++) {
				for (let j = 0; j < defaultPattern[i].length; j++) {
					if (defaultPattern[i][j] === 1) {
						initialGrid[centerRow + i][centerCol + j] = true;
					}
				}
			}

			// Add "404" text pattern
			const text404 = [
				[1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1],
				[1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1],
				[1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1],
				[1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1],
			];

			const text404Row = Math.floor(rows / 4);
			const text404Col = Math.floor(cols / 2) - Math.floor(text404[0].length / 2);

			for (let i = 0; i < text404.length; i++) {
				for (let j = 0; j < text404[i].length; j++) {
					if (text404[i][j] === 1) {
						initialGrid[text404Row + i][text404Col + j] = true;
					}
				}
			}

			setGrid(initialGrid);

			const context = canvas.getContext("2d");
			if (context) {
				drawGrid(initialGrid, context);
			}
		};

		// Initial setup
		resizeCanvas();

		// Add resize event listener
		window.addEventListener("resize", resizeCanvas);

		// Cleanup
		return () => {
			window.removeEventListener("resize", resizeCanvas);
		};
	}, [cellSize]);

	// Handle file upload button click
	const handleUploadClick = () => {
		fileInputRef.current?.click();
	};

	// Handle file selection
	const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0];
		if (!file) return;

		const reader = new FileReader();
		reader.onload = (e) => {
			try {
				const content = e.target?.result as string;

				// Try to parse the content as a JavaScript array of arrays
				// First, clean up the content to make it valid JSON
				let cleanedContent = content
					.replace(/\r?\n/g, "") // Remove newlines
					.replace(/\s+/g, " ") // Normalize whitespace
					.trim();

				// If the content is wrapped in brackets, keep it as is
				// Otherwise, add brackets to make it a valid array
				if (!cleanedContent.startsWith("[")) {
					cleanedContent = "[" + cleanedContent + "]";
				}

				// Parse the content as JSON
				let matrix: number[][];

				try {
					// Try to parse as JSON first
					matrix = JSON.parse(cleanedContent);
				} catch (jsonError) {
                    // If JSON parsing fails, try to evaluate as JavaScript
                    console.log(jsonError)
					try {
						// Use Function constructor to evaluate the string as JavaScript
						matrix = new Function("return " + cleanedContent)();
                    } catch (evalError) {
                        console.log(evalError)
						throw new Error("Could not parse file content as array");
					}
				}

				// Validate the matrix
				if (!Array.isArray(matrix) || !matrix.length || !Array.isArray(matrix[0])) {
					setMessage({
						type: "error",
						text: "Error: File does not contain a valid array of arrays",
					});
					return;
				}

				// Check if all elements are 0 or 1
				const isValid = matrix.every((row) => Array.isArray(row) && row.every((cell) => cell === 0 || cell === 1));

				if (!isValid) {
					setMessage({
						type: "error",
						text: "Error: Array should contain only 0s and 1s",
					});
					return;
				}

				// Apply the matrix to the grid
				applyMatrixToGrid(matrix);
				setMessage({
					type: "success",
					text: `Matrix loaded successfully! Size: ${matrix.length}x${matrix[0].length}`,
				});
			} catch (error) {
				setMessage({
					type: "error",
					text: "Error parsing file. Make sure it contains a valid array of arrays with 0s and 1s.",
				});
				console.error("Error parsing file:", error);
			}
		};
		reader.readAsText(file);
	};

	// Apply the matrix to the grid
	const applyMatrixToGrid = (matrix: number[][]) => {
		if (!canvasRef.current) return;

		const canvas = canvasRef.current;
		const context = canvas.getContext("2d");
		if (!context) return;

		// Calculate grid dimensions
		const cols = Math.floor(canvas.width / cellSize);
		const rows = Math.floor(canvas.height / cellSize);

		// Initialize a new grid
		const newGrid = Array(rows)
			.fill(null)
			.map(() => Array(cols).fill(false));

		// Calculate the center position to place the matrix
		const centerRow = Math.floor(rows / 2) - Math.floor(matrix.length / 2);
		const centerCol = Math.floor(cols / 2) - Math.floor(matrix[0].length / 2);

		// Place the matrix in the center of the grid
		for (let i = 0; i < matrix.length; i++) {
			for (let j = 0; j < matrix[i].length; j++) {
				const row = centerRow + i;
				const col = centerCol + j;

				// Make sure we're within the grid bounds
				if (row >= 0 && row < rows && col >= 0 && col < cols) {
					newGrid[row][col] = matrix[i][j] === 1;
				}
			}
		}

		setGrid(newGrid);
		drawGrid(newGrid, context);
	};

	// Draw the grid on the canvas
	const drawGrid = (grid: boolean[][], context: CanvasRenderingContext2D) => {
		const canvas = context.canvas;
		context.clearRect(0, 0, canvas.width, canvas.height);

		// Set background to black
		context.fillStyle = "black";
		context.fillRect(0, 0, canvas.width, canvas.height);

		// Draw cells
		for (let i = 0; i < grid.length; i++) {
			for (let j = 0; j < grid[i].length; j++) {
				if (grid[i][j]) {
					context.fillStyle = "white";
					context.fillRect(j * cellSize, i * cellSize, cellSize, cellSize);
				}
			}
		}
	};

	// Update the grid based on Conway's Game of Life rules
	const updateGrid = () => {
		const rows = grid.length;
		const cols = grid[0].length;
		const newGrid = Array(rows)
			.fill(null)
			.map(() => Array(cols).fill(false));

		for (let i = 0; i < rows; i++) {
			for (let j = 0; j < cols; j++) {
				const neighbors = countNeighbors(i, j);

				// Apply Conway's Game of Life rules
				if (grid[i][j]) {
					// Any live cell with 2 or 3 live neighbors survives
					newGrid[i][j] = neighbors === 2 || neighbors === 3;
				} else {
					// Any dead cell with exactly 3 live neighbors becomes a live cell
					newGrid[i][j] = neighbors === 3;
				}
			}
		}

		return newGrid;
	};

	// Count the number of live neighbors for a cell
	const countNeighbors = (row: number, col: number) => {
		const rows = grid.length;
		const cols = grid[0].length;
		let count = 0;

		// Check all 8 neighboring cells
		for (let i = -1; i <= 1; i++) {
			for (let j = -1; j <= 1; j++) {
				if (i === 0 && j === 0) continue; // Skip the cell itself

				const newRow = (row + i + rows) % rows; // Wrap around the grid
				const newCol = (col + j + cols) % cols;

				if (grid[newRow][newCol]) {
					count++;
				}
			}
		}

		return count;
	};

	// Animation loop
	const animate = (timestamp: number) => {
		if (!canvasRef.current) return;

		const context = canvasRef.current.getContext("2d");
		if (!context) return;

		// Update the grid at the specified speed
		if (timestamp - lastUpdateTimeRef.current >= speed) {
			const newGrid = updateGrid();
			setGrid(newGrid);
			drawGrid(newGrid, context);
			lastUpdateTimeRef.current = timestamp;
		}

		if (isRunning) {
			animationFrameRef.current = requestAnimationFrame(animate);
		}
	};

	// Start or stop the animation
	useEffect(() => {
		if (isRunning) {
			lastUpdateTimeRef.current = performance.now();
			animationFrameRef.current = requestAnimationFrame(animate);
		} else if (animationFrameRef.current) {
			cancelAnimationFrame(animationFrameRef.current);
		}

		return () => {
			if (animationFrameRef.current) {
				cancelAnimationFrame(animationFrameRef.current);
			}
		};
	}, [isRunning, grid, speed]);

	// Handle canvas click to toggle cell state
	const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
		if (!canvasRef.current) return;

		const canvas = canvasRef.current;
		const rect = canvas.getBoundingClientRect();
		const x = event.clientX - rect.left;
		const y = event.clientY - rect.top;

		const col = Math.floor(x / cellSize);
		const row = Math.floor(y / cellSize);

		// Toggle the cell state
		const newGrid = [...grid];
		newGrid[row][col] = !newGrid[row][col];

		setGrid(newGrid);

		const context = canvas.getContext("2d");
		if (context) {
			drawGrid(newGrid, context);
		}
	};

	// Reset the grid to initial state
	const handleReset = () => {
		// Stop the animation if it's running
		setIsRunning(false);

		// Re-initialize the grid
		if (canvasRef.current) {
			// Force a re-render by triggering the useEffect that depends on cellSize
			setCellSize((prev) => {
				// Toggle between current value and current value + 0.001 to trigger the effect
				return prev === Math.floor(prev) ? prev + 0.001 : Math.floor(prev);
			});
		}
	};

	// Step forward one generation
	const handleStep = () => {
		if (isRunning) return;

		if (canvasRef.current) {
			const context = canvasRef.current.getContext("2d");
			if (context) {
				const newGrid = updateGrid();
				setGrid(newGrid);
				drawGrid(newGrid, context);
			}
		}
	};

	// Toggle controls visibility
	// const toggleControls = () => {
	// 	setShowControls(!showControls);
	// };

	return (
		<div
			className="relative w-full h-screen overflow-hidden bg-black"
			ref={containerRef}
		>
			{/* Full screen canvas */}
			<canvas
				ref={canvasRef}
				onClick={handleCanvasClick}
				className="w-full h-full cursor-pointer"
			/>

			{/* Floating controls button */}
			<div className="absolute top-4 right-4 z-10">
				<Sheet>
					<SheetTrigger asChild>
						<Button
							variant="outline"
							size="icon"
							className="rounded-full bg-white/90 backdrop-blur-sm hover:bg-white"
						>
							<Settings2Icon className="h-5 w-5" />
						</Button>
					</SheetTrigger>
					<SheetContent className="w-[350px] sm:w-[540px] overflow-y-auto">
						<SheetHeader>
							<SheetTitle>Game of Life Controls</SheetTitle>
							<SheetDescription>Adjust settings and upload patterns</SheetDescription>
						</SheetHeader>

						<div className="space-y-6 py-4">
							{/* Controls */}
							<div className="space-y-4">
								<h3 className="text-lg font-medium">Simulation Controls</h3>
								<div className="flex flex-wrap gap-2">
									<Button
										onClick={() => setIsRunning(!isRunning)}
										variant={isRunning ? "destructive" : "default"}
									>
										{isRunning ? <PauseIcon className="mr-2 h-4 w-4" /> : <PlayIcon className="mr-2 h-4 w-4" />}
										{isRunning ? "Pause" : "Start"}
									</Button>

									<Button
										onClick={handleStep}
										variant="outline"
										disabled={isRunning}
									>
										Step
									</Button>

									<Button
										onClick={handleReset}
										variant="outline"
									>
										<RefreshCwIcon className="mr-2 h-4 w-4" />
										Reset
									</Button>
								</div>
							</div>

							{/* Sliders */}
							<div className="space-y-4">
								<h3 className="text-lg font-medium">Settings</h3>
								<div className="space-y-4">
									<div className="space-y-2">
										<div className="flex justify-between">
											<Label htmlFor="speed">Speed</Label>
											<span className="text-sm text-muted-foreground">{500 - speed + 10}ms</span>
										</div>
										<Slider
											id="speed"
											min={10}
											max={500}
											step={10}
											value={[500 - speed + 10]}
											onValueChange={(value) => setSpeed(500 - value[0] + 10)}
										/>
									</div>

									<div className="space-y-2">
										<div className="flex justify-between">
											<Label htmlFor="cell-size">Cell Size</Label>
											<span className="text-sm text-muted-foreground">{cellSize}px</span>
										</div>
										<Slider
											id="cell-size"
											min={1}
											max={20}
											step={1}
											value={[cellSize]}
											onValueChange={(value) => setCellSize(value[0])}
										/>
									</div>
								</div>
							</div>

							{/* File Upload */}
							<div className="space-y-4">
								<h3 className="text-lg font-medium">Upload Matrix</h3>
								<div className="grid w-full max-w-sm items-center gap-1.5">
									<Input
										ref={fileInputRef}
										type="file"
										accept=".txt,.json,.js"
										className="hidden"
										onChange={handleFileUpload}
									/>
									<Button
										onClick={handleUploadClick}
										variant="outline"
										className="w-full"
									>
										<UploadIcon className="mr-2 h-4 w-4" />
										Choose File
									</Button>
								</div>

								{message && (
									<Alert variant={message.type === "error" ? "destructive" : "default"}>
										<InfoIcon className="h-4 w-4" />
										<AlertTitle>{message.type === "error" ? "Error" : message.type === "success" ? "Success" : "Info"}</AlertTitle>
										<AlertDescription>{message.text}</AlertDescription>
									</Alert>
								)}
							</div>

							{/* Help */}
							<div className="space-y-4">
								<h3 className="text-lg font-medium">Help</h3>
								<Tabs defaultValue="instructions">
									<TabsList className="grid w-full grid-cols-2">
										<TabsTrigger value="instructions">Instructions</TabsTrigger>
										<TabsTrigger value="format">File Format</TabsTrigger>
									</TabsList>
									<TabsContent
										value="instructions"
										className="space-y-2 mt-2"
									>
										<p className="text-sm">Click on the grid to toggle cell states.</p>
										<p className="text-sm">Use the controls to start, pause, or reset the simulation.</p>
										<p className="text-sm">Adjust the speed and cell size using the sliders.</p>
									</TabsContent>
									<TabsContent
										value="format"
										className="space-y-2 mt-2"
									>
										<p className="text-sm">Upload a text file containing an array of arrays with 0s and 1s:</p>
										<pre className="bg-muted p-2 rounded text-xs overflow-x-auto">
											[<br />
											&nbsp;&nbsp;[0, 1, 0],
											<br />
											&nbsp;&nbsp;[0, 0, 1],
											<br />
											&nbsp;&nbsp;[1, 1, 1]
											<br />]
										</pre>
									</TabsContent>
								</Tabs>
							</div>
						</div>
					</SheetContent>
				</Sheet>
			</div>

			{/* Quick controls */}
			<div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-10">
				<div className="flex gap-2 bg-white/90 backdrop-blur-sm p-2 rounded-full">
					<Button
						onClick={() => setIsRunning(!isRunning)}
						variant="ghost"
						size="icon"
						className="rounded-full hover:bg-black/10"
					>
						{isRunning ? <PauseIcon className="h-5 w-5" /> : <PlayIcon className="h-5 w-5" />}
					</Button>
					<Button
						onClick={handleStep}
						variant="ghost"
						size="icon"
						className="rounded-full hover:bg-black/10"
						disabled={isRunning}
					>
						Step
					</Button>
					<Button
						onClick={handleReset}
						variant="ghost"
						size="icon"
						className="rounded-full hover:bg-black/10"
					>
						<RefreshCwIcon className="h-5 w-5" />
					</Button>
				</div>
			</div>
		</div>
	);
}
