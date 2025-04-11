"use server"; // Add server action directive

import {Jimp} from 'jimp'; // Keep Jimp import

// Remove fs import as we won't save to file here
// import fs from 'fs/promises';

/**
 * loadSpriteAsMatrix
 * 
 * -------------------
 * Loads an image from an ArrayBuffer, reads its pixel data,
 * and returns a 2D matrix of 0 (black) / 1 (white) values based on a threshold.
 *
 * @param imageBuffer ArrayBuffer containing the image data
 * @param threshold  grayscale cutoff [0–255] above which pixels count as "white"
 */
export async function loadSpriteAsMatrix(imageBuffer: ArrayBuffer, threshold: number = 128): Promise<number[][]> {
	try {
		// 1. Load image using Jimp's static read method from the buffer
		const image = await Jimp.read(Buffer.from(imageBuffer)); // Read from buffer

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
				row.push(gray > threshold ? 1 : 0); // 1 for white/bright, 0 for black/dark
			}
			matrix.push(row);
		}

		return matrix;

	} catch (error) {
		console.error("Error loading or processing image:", error);
		// Re-throw or return an empty matrix/handle error as appropriate
		throw new Error("Failed to process image."); // Throw a more specific error
	}
}

// Remove downsampleMatrix function
/*
function downsampleMatrix(matrix: number[][], factor: number): number[][] {
	// ... implementation ...
}
*/

// Remove saveMatrixToFile function
/*
async function saveMatrixToFile(matrix: number[][], filePath: string): Promise<void> {
	// ... implementation ...
}
*/

// Remove Example Usage section
/*
// --- Example Usage ---
// ... example code ...
*/
