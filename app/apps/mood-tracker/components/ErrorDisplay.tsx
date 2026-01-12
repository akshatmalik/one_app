interface ErrorDisplayProps {
  error: Error | null;
  onDismiss?: () => void;
}

export function ErrorDisplay({ error, onDismiss }: ErrorDisplayProps) {
  if (!error) return null;

  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <span className="text-red-600 text-xl">⚠️</span>
          <div>
            <p className="font-medium text-red-900">Error</p>
            <p className="text-sm text-red-700 mt-1">{error.message}</p>
          </div>
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="text-red-400 hover:text-red-600 transition-colors"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}
