import { Jimp } from 'jimp'; // Correct named import
import path from 'path'; // Import path module for resolving file paths
import fs from 'fs/promises'; // Import fs module for file operations

/**
 * loadSpriteAsMatrix
 * -------------------
 * Loads an image from a local file path, reads its pixel data,
 * and returns a 2D matrix of 0 (black) / 1 (white) values based on a threshold.
 *
 * @param filePath  Path to the PNG sprite file
 * @param threshold  grayscale cutoff [0–255] above which pixels count as "white"
 */
export async function loadSpriteAsMatrix(filePath: string, threshold: number = 128): Promise<number[][]> {
	try {
		// 1. Load image using Jimp's static read method
		const image = await Jimp.read(filePath);

		const width = image.bitmap.width;
		const height = image.bitmap.height;

		// 2. Build matrix by iterating through pixels
		const matrix: number[][] = [];
		for (let y = 0; y < height; y++) {
			const row: number[] = [];
			for (let x = 0; x < width; x++) {
				// Get pixel color and extract RGB components directly
				const pixel = image.getPixelColor(x, y);
				const r = (pixel >> 24) & 0xFF;
				const g = (pixel >> 16) & 0xFF;
				const b = (pixel >> 8) & 0xFF;

				// Convert to grayscale via average
				const gray = (r + g + b) / 3;
				row.push(gray > threshold ? 1 : 0);
			}
			matrix.push(row);
		}

		return matrix;

	} catch (error) {
		console.error("Error loading or processing image:", error);
		// Re-throw or return an empty matrix/handle error as appropriate
		throw error;
	}
}

/**
 * Downsamples a matrix by taking every nth element in both dimensions
 * This reduces the size by approximately 1/(factor^2)
 */
function downsampleMatrix(matrix: number[][], factor: number): number[][] {
	if (factor <= 1) return matrix; // No downsampling needed
	
	const result: number[][] = [];
	for (let y = 0; y < matrix.length; y += factor) {
		const row: number[] = [];
		for (let x = 0; x < matrix[y].length; x += factor) {
			row.push(matrix[y][x]);
		}
		result.push(row);
	}
	
	return result;
}

/**
 * Saves a matrix to a file in array format
 */
async function saveMatrixToFile(matrix: number[][], filePath: string): Promise<void> {
	try {
		// Format the matrix as a string in JS array format
		let content = '[\n';
		matrix.forEach((row, index) => {
			content += `  [${row.join(', ')}]${index < matrix.length - 1 ? ',' : ''}\n`;
		});
		content += ']\n';

		// Write to file
		await fs.writeFile(filePath, content, 'utf8');
		console.log(`Matrix saved to ${filePath}`);
	} catch (error) {
		console.error(`Error saving matrix to ${filePath}:`, error);
		throw error;
	}
}

// --- Example Usage ---

// Define the path to the image relative to the script's execution directory
const imagePath = 'sans.png';
const outputPath = 'input.txt';

// Ensure the image file 'flowey.png' exists in the same directory
// where you run the 'bun run' command, or provide a correct relative/absolute path.
loadSpriteAsMatrix(imagePath)
	.then(async (matrix) => {
		console.log(`Original matrix dimensions: ${matrix[0]?.length || 0}x${matrix.length}`);
		
		// Downsample the matrix to reduce size to approximately 1/40th
		const downsamplingFactor = 6.3; // Taking every ~6th pixel ≈ 1/36th (6²) the size
		const downsampledMatrix = downsampleMatrix(matrix, Math.round(downsamplingFactor));
		console.log(`Downsampled matrix dimensions: ${downsampledMatrix[0]?.length || 0}x${downsampledMatrix.length}`);
		
		// Save the downsampled matrix to input.txt
		await saveMatrixToFile(downsampledMatrix, outputPath);
		
		console.log("Matrix generation complete.");
	})
	.catch(err => {
		console.error("Failed to generate matrix:", err);
	});
