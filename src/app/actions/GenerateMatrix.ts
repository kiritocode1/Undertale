
"use server";

import { Jimp } from 'jimp'; 




// Remove fs import as we won't save to file here
// import fs from 'fs/promises';

/**

 * Generates a matrix from an uploaded image file
 * Returns a 2D matrix of 0 (black) / 1 (white) values based on a threshold
 */
export async function generateMatrixFromImage(
	imageData: Uint8Array, 
	threshold: number = 128
): Promise<number[][]> {
	try {
		// Convert Uint8Array to Buffer (required by Jimp)
		const buffer = Buffer.from(imageData);
		
		// Load image using Jimp from buffer
		const image = await Jimp.read(buffer);


		const width = image.bitmap.width;
		const height = image.bitmap.height;

		// Build matrix by iterating through pixels
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
				row.push(gray > threshold ? 1 : 0); // 1 for white/bright, 0 for black/dark
			}
			matrix.push(row);
		}

		return matrix;

	} catch (error) {

		console.error("Error processing image:", error);
		throw error;
	}
}

/**
 * Downsamples a matrix by taking every nth element in both dimensions
 * This reduces the size by approximately 1/(factor^2)
 */
export async function downsampleMatrix(matrix: number[][], factor: number): Promise<number[][]> {
	if (factor <= 1) return matrix; // No downsampling needed
	
	const result: number[][] = [];
	for (let y = 0; y < matrix.length; y += factor) {
		const row: number[] = [];
		for (let x = 0; x < (matrix[y]?.length || 0); x += factor) {
			row.push(matrix[y][x]);
		}
		result.push(row);
	}
	
	return result;

}
*/


/**
 * Process an image file and return a matrix suitable for Game of Life
 * This combines generating the matrix and downsampling it in one action
 */
export async function processImageToMatrix(
	imageData: Uint8Array, 
	downsampleFactor: number = 1,
	threshold: number = 128
): Promise<number[][]> {
	// Generate the initial matrix from the image
	const matrix = await generateMatrixFromImage(imageData, threshold);
	
	// Apply downsampling if factor > 1
	if (downsampleFactor > 1) {
		return downsampleMatrix(matrix, downsampleFactor);
	}
	
	return matrix;
}

/**
 * Saves a matrix to a file in array format
 */
export async function saveMatrixToFile(matrix: number[][], filePath: string): Promise<void> {
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
