/**
 * jitsiLoader
 *
 * SSR-safe dynamic import loader for lib-jitsi-meet SDK.
 * Provides centralized caching for the SDK module.
 *
 * @see JitsiAPI/4-JitsiMeetJS for SDK bootstrap notes
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

let cachedJitsiMeetJS: any = null
let initPromise: Promise<any> | null = null

/**
 * Dynamically loads and initializes the JitsiMeetJS SDK.
 * Safe to call on server-side (returns null) and caches the module client-side.
 */
export async function getJitsiMeetJS(): Promise<any> {
    // SSR guard
    if (typeof window === 'undefined') {
        return null
    }

    // Return cached instance if available
    if (cachedJitsiMeetJS) {
        return cachedJitsiMeetJS
    }

    // If already loading, wait for it
    if (initPromise) {
        return initPromise
    }

    // Start loading
    initPromise = (async () => {
        try {
            const jitsiModule = await import('lib-jitsi-meet')
            const JitsiMeetJS = jitsiModule.default || jitsiModule

            // Initialize the SDK
            JitsiMeetJS.init({
                disableAudioLevels: false,
                enableAnalyticsLogging: false,
            })

            // Set log level to reduce noise
            JitsiMeetJS.setLogLevel(JitsiMeetJS.logLevels.WARN)

            cachedJitsiMeetJS = JitsiMeetJS
            return JitsiMeetJS
        } catch (error) {
            console.error('Failed to load JitsiMeetJS:', error)
            initPromise = null
            throw error
        }
    })()

    return initPromise
}

/**
 * Checks if JitsiMeetJS is already loaded and initialized.
 */
export function isJitsiLoaded(): boolean {
    return cachedJitsiMeetJS !== null
}

/**
 * Gets the cached JitsiMeetJS instance synchronously.
 * Returns null if not yet loaded.
 */
export function getJitsiMeetJSSync(): any {
    return cachedJitsiMeetJS
}
