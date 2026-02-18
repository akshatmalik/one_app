import { Game } from './types';
import { getTotalHours, calculateMetrics } from './calculations';

/**
 * Export games data as CSV string
 */
export function exportAsCSV(games: Game[]): string {
  const headers = [
    'Name', 'Status', 'Price', 'Total Hours', 'Rating',
    'Platform', 'Genre', 'Franchise', 'Purchase Source',
    'Date Purchased', 'Start Date', 'End Date',
    'Cost Per Hour', 'Value Rating', 'ROI', 'Blend Score',
    'Play Sessions', 'Notes', 'Review',
  ];

  const rows = games.map(game => {
    const totalHours = getTotalHours(game);
    const metrics = calculateMetrics(game);
    const sessionCount = game.playLogs?.length || 0;

    return [
      escapeCsvField(game.name),
      game.status,
      game.price.toFixed(2),
      totalHours.toFixed(1),
      game.rating.toString(),
      game.platform || '',
      game.genre || '',
      game.franchise || '',
      game.purchaseSource || '',
      game.datePurchased || '',
      game.startDate || '',
      game.endDate || '',
      metrics.costPerHour.toFixed(2),
      metrics.valueRating,
      metrics.roi.toFixed(1),
      metrics.blendScore.toFixed(1),
      sessionCount.toString(),
      escapeCsvField(game.notes || ''),
      escapeCsvField(game.review || ''),
    ].join(',');
  });

  return [headers.join(','), ...rows].join('\n');
}

function escapeCsvField(field: string): string {
  if (field.includes(',') || field.includes('"') || field.includes('\n')) {
    return `"${field.replace(/"/g, '""')}"`;
  }
  return field;
}

/**
 * Export games data as formatted JSON string
 */
export function exportAsJSON(games: Game[]): string {
  const exportData = games.map(game => {
    const totalHours = getTotalHours(game);
    const metrics = calculateMetrics(game);

    return {
      name: game.name,
      status: game.status,
      price: game.price,
      totalHours,
      baselineHours: game.hours,
      rating: game.rating,
      platform: game.platform || null,
      genre: game.genre || null,
      franchise: game.franchise || null,
      purchaseSource: game.purchaseSource || null,
      acquiredFree: game.acquiredFree || false,
      originalPrice: game.originalPrice || null,
      subscriptionSource: game.subscriptionSource || null,
      datePurchased: game.datePurchased || null,
      startDate: game.startDate || null,
      endDate: game.endDate || null,
      notes: game.notes || null,
      review: game.review || null,
      playLogs: game.playLogs || [],
      metrics: {
        costPerHour: Math.round(metrics.costPerHour * 100) / 100,
        valueRating: metrics.valueRating,
        roi: Math.round(metrics.roi * 10) / 10,
        blendScore: Math.round(metrics.blendScore * 10) / 10,
        daysToComplete: metrics.daysToComplete,
      },
    };
  });

  return JSON.stringify({ exportedAt: new Date().toISOString(), gameCount: games.length, games: exportData }, null, 2);
}

/**
 * Export play logs as CSV for detailed session analysis
 */
export function exportPlayLogsAsCSV(games: Game[]): string {
  const headers = ['Date', 'Game', 'Hours', 'Notes', 'Genre', 'Platform'];

  const rows: string[] = [];
  games.forEach(game => {
    game.playLogs?.forEach(log => {
      rows.push([
        log.date,
        escapeCsvField(game.name),
        log.hours.toFixed(1),
        escapeCsvField(log.notes || ''),
        game.genre || '',
        game.platform || '',
      ].join(','));
    });
  });

  // Sort by date desc
  rows.sort((a, b) => b.localeCompare(a));

  return [headers.join(','), ...rows].join('\n');
}

/**
 * Trigger file download in the browser
 */
export function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
