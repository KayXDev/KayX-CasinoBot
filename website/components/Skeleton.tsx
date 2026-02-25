'use client'

import { ReactNode } from 'react'

interface SkeletonProps {
  className?: string
  children?: ReactNode
}

export function Skeleton({ className = '', children }: SkeletonProps) {
  return (
    <div className={`bg-gray-700/50 animate-pulse rounded ${className}`}>
      {children}
    </div>
  )
}

export function BlogPostSkeleton() {
  return (
    <div className="casino-card rounded-xl overflow-hidden">
      {/* Image skeleton */}
      <Skeleton className="h-40 w-full" />
      
      {/* Content skeleton */}
      <div className="p-5">
        <div className="flex items-center justify-between mb-3">
          <Skeleton className="h-6 w-20" />
          <Skeleton className="h-4 w-16" />
        </div>
        
        <Skeleton className="h-6 w-3/4 mb-2" />
        <Skeleton className="h-4 w-full mb-2" />
        <Skeleton className="h-4 w-5/6 mb-4" />
        
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Skeleton className="w-5 h-5 rounded-full" />
            <Skeleton className="h-4 w-16" />
          </div>
          <div className="flex items-center space-x-3">
            <Skeleton className="h-4 w-8" />
            <Skeleton className="h-4 w-8" />
            <Skeleton className="h-4 w-8" />
          </div>
        </div>
      </div>
    </div>
  )
}

export function BlogPostPageSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Back button skeleton */}
        <div className="mb-6">
          <Skeleton className="h-10 w-32" />
        </div>
        
        {/* Post header skeleton */}
        <div className="casino-card rounded-xl p-8 mb-8">
          <Skeleton className="h-8 w-3/4 mb-4" />
          <Skeleton className="h-6 w-1/2 mb-6" />
          
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Skeleton className="w-10 h-10 rounded-full" />
              <div>
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-8 w-16" />
            </div>
          </div>
        </div>
        
        {/* Content skeleton */}
        <div className="casino-card rounded-xl p-8 mb-8">
          <div className="space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-32 w-full rounded-lg" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        </div>
        
        {/* Comments skeleton */}
        <div className="casino-card rounded-xl p-8">
          <Skeleton className="h-6 w-32 mb-6" />
          
          <div className="space-y-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-start space-x-4">
                <Skeleton className="w-8 h-8 rounded-full flex-shrink-0" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-24 mb-2" />
                  <Skeleton className="h-4 w-full mb-1" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}