'use client'

import { AnimatePresence } from 'framer-motion'
import LoadingScreen from './LoadingScreen'
import { usePageLoading } from '../hooks/usePageLoading'

interface PageWrapperProps {
  children: React.ReactNode
}

export default function PageWrapper({ children }: PageWrapperProps) {
  const isLoading = usePageLoading()

  return (
    <>
      <AnimatePresence mode="wait">
        {isLoading && <LoadingScreen />}
      </AnimatePresence>
      {!isLoading && children}
    </>
  )
}