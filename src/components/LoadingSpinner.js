// Modern Loading Spinner Component
export default function LoadingSpinner({ size = 'md', text = 'Loading...', fullScreen = false }) {
    const sizes = {
        sm: 'w-8 h-8',
        md: 'w-12 h-12',
        lg: 'w-16 h-16',
        xl: 'w-20 h-20'
    }

    const textSizes = {
        sm: 'text-sm',
        md: 'text-base',
        lg: 'text-lg',
        xl: 'text-xl'
    }

    const LoaderContent = () => (
        <div className="flex flex-col items-center justify-center space-y-4">
            {/* Modern Spinner with Gradient */}
            <div className="relative">
                {/* Outer ring */}
                <div className={`${sizes[size]} rounded-full border-4 border-gray-200`}></div>

                {/* Animated gradient ring */}
                <div className={`absolute top-0 left-0 ${sizes[size]} rounded-full border-4 border-transparent border-t-indigo-600 border-r-purple-600 animate-spin`}></div>

                {/* Inner pulse */}
                <div className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 ${size === 'sm' ? 'w-3 h-3' : size === 'md' ? 'w-4 h-4' : size === 'lg' ? 'w-6 h-6' : 'w-8 h-8'} bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full animate-pulse`}></div>
            </div>

            {/* Loading text with gradient */}
            {text && (
                <div className="text-center">
                    <p className={`${textSizes[size]} font-semibold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent animate-pulse`}>
                        {text}
                    </p>
                    {/* Animated dots */}
                    <div className="flex justify-center space-x-1 mt-2">
                        <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                        <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                        <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                    </div>
                </div>
            )}
        </div>
    )

    if (fullScreen) {
        return (
            <div className="fixed inset-0 bg-white bg-opacity-90 backdrop-blur-sm flex items-center justify-center z-50">
                <div className="bg-white rounded-2xl shadow-2xl p-8 border border-gray-100">
                    <LoaderContent />
                </div>
            </div>
        )
    }

    return (
        <div className="flex items-center justify-center p-8">
            <LoaderContent />
        </div>
    )
}

// Alternative: Skeleton Loader for content
export function SkeletonLoader({ lines = 3, className = '' }) {
    return (
        <div className={`animate-pulse space-y-4 ${className}`}>
            {[...Array(lines)].map((_, i) => (
                <div key={i} className="space-y-3">
                    <div className="h-4 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 rounded-lg bg-[length:200%_100%] animate-shimmer"></div>
                    <div className="h-4 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 rounded-lg w-5/6 bg-[length:200%_100%] animate-shimmer" style={{ animationDelay: '150ms' }}></div>
                </div>
            ))}
        </div>
    )
}

// Progress Bar Loader
export function ProgressBar({ progress = 0, showPercentage = true }) {
    return (
        <div className="w-full space-y-2">
            <div className="relative w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                {/* Background shimmer */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-30 animate-shimmer"></div>

                {/* Progress bar */}
                <div
                    className="h-full bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 rounded-full transition-all duration-500 ease-out bg-[length:200%_100%] animate-shimmer"
                    style={{ width: `${Math.min(progress, 100)}%` }}
                ></div>
            </div>

            {showPercentage && (
                <p className="text-sm text-center font-medium text-gray-600">
                    {Math.round(progress)}%
                </p>
            )}
        </div>
    )
}

// Dots Loader
export function DotsLoader({ size = 'md' }) {
    const dotSizes = {
        sm: 'w-2 h-2',
        md: 'w-3 h-3',
        lg: 'w-4 h-4'
    }

    return (
        <div className="flex space-x-2">
            <div className={`${dotSizes[size]} bg-indigo-600 rounded-full animate-bounce`} style={{ animationDelay: '0ms' }}></div>
            <div className={`${dotSizes[size]} bg-purple-600 rounded-full animate-bounce`} style={{ animationDelay: '150ms' }}></div>
            <div className={`${dotSizes[size]} bg-indigo-600 rounded-full animate-bounce`} style={{ animationDelay: '300ms' }}></div>
        </div>
    )
}
