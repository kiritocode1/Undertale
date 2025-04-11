import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * scaleMatrix
 * -----------
 * Scales a 2D matrix of numbers using nearest-neighbor interpolation.
 *
 * @param matrix The input matrix (number[][])
 * @param factor The scaling factor (e.g., 0.5 for half size, 2 for double size)
 * @returns A new scaled matrix (number[][])
 */
export function scaleMatrix(matrix: number[][], factor: number): number[][] {
	if (factor <= 0) {
		console.warn("Scaling factor must be positive.");
		return matrix; // Return original matrix if factor is invalid
	}
	if (!matrix || matrix.length === 0 || !Array.isArray(matrix[0]) || matrix[0].length === 0) {
		return []; // Return empty if input is invalid
	}

	const originalHeight = matrix.length;
	const originalWidth = matrix[0].length;
	const newHeight = Math.max(1, Math.round(originalHeight * factor)); // Ensure at least 1x1
	const newWidth = Math.max(1, Math.round(originalWidth * factor));

	const newMatrix: number[][] = [];

	for (let y = 0; y < newHeight; y++) {
		const row: number[] = [];
		for (let x = 0; x < newWidth; x++) {
			// Find the corresponding pixel in the original matrix (nearest neighbor)
			const originalY = Math.min(originalHeight - 1, Math.floor(y / factor));
			const originalX = Math.min(originalWidth - 1, Math.floor(x / factor));

			// Check bounds just in case, though Math.min should prevent out of bounds
			if (originalY >= 0 && originalY < originalHeight && originalX >= 0 && originalX < originalWidth) {
				row.push(matrix[originalY][originalX]);
			} else {
				// Should not happen with the Math.min logic, but as a fallback push 0
				console.warn(`Calculated out-of-bounds index: (${originalX}, ${originalY}) for factor ${factor}`);
				row.push(0);
			}
		}
		newMatrix.push(row);
	}

	return newMatrix;
}
