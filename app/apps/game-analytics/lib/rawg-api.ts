// RAWG API integration for fetching game images and metadata
// RAWG is a free video game database API: https://rawg.io/apidocs

const RAWG_API_KEY = process.env.NEXT_PUBLIC_RAWG_API_KEY || 'demo-key';
const RAWG_BASE_URL = 'https://api.rawg.io/api';

export interface RAWGGame {
  id: number;
  name: string;
  background_image: string | null;
  rating: number;
  released: string;
}

export interface RAWGSearchResponse {
  results: RAWGGame[];
}

export async function searchGameImage(gameName: string): Promise<string | null> {
  try {
    const response = await fetch(
      `${RAWG_BASE_URL}/games?key=${RAWG_API_KEY}&search=${encodeURIComponent(gameName)}&page_size=1`
    );

    if (!response.ok) {
      console.error('RAWG API error:', response.status);
      return null;
    }

    const data: RAWGSearchResponse = await response.json();

    if (data.results && data.results.length > 0) {
      return data.results[0].background_image;
    }

    return null;
  } catch (error) {
    console.error('Error fetching game image:', error);
    return null;
  }
}

export async function fetchGameMetadata(gameName: string): Promise<RAWGGame | null> {
  try {
    const response = await fetch(
      `${RAWG_BASE_URL}/games?key=${RAWG_API_KEY}&search=${encodeURIComponent(gameName)}&page_size=1`
    );

    if (!response.ok) {
      return null;
    }

    const data: RAWGSearchResponse = await response.json();

    if (data.results && data.results.length > 0) {
      return data.results[0];
    }

    return null;
  } catch (error) {
    console.error('Error fetching game metadata:', error);
    return null;
  }
}
