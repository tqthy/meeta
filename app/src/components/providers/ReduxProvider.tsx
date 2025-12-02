'use client'
import { Provider } from 'react-redux'
import { enableMapSet } from 'immer'
import { store } from '@/store'
import { ReactNode } from 'react'

// Enable MapSet plugin for Immer to handle Map and Set objects in Redux
enableMapSet()

interface ReduxProviderProps {
    children: ReactNode
}

/**
 * Redux Provider để wrap app
 */
export function ReduxProvider({ children }: ReduxProviderProps) {
    return <Provider store={store}>{children}</Provider>
}
