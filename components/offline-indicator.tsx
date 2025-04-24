"use client"

import { useState, useEffect } from "react"
import { Wifi, WifiOff } from "lucide-react"
// import { registerConnectivityListeners, processSyncQueue } from "@/lib/offline-storage"

export function OfflineIndicator() {
  const [isOffline, setIsOffline] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)

  useEffect(() => {
    // Initial state  
    setIsOffline(!navigator.onLine)

    // Register event listeners
    // const unregister = registerConnectivityListeners({
    //   onOnline: async () => {
    //     setIsOffline(false)
    //     setIsSyncing(true)

    //     try {
    //       // Process sync queue when back online
    //       await processSyncQueue()
    //     } catch (error) {
    //       console.error("Error processing sync queue:", error)
    //     } finally {
    //       setIsSyncing(false)
    //     }
    //   },
    //   onOffline: () => {
    //     setIsOffline(true)
    //   },
    // })

    // return unregister
  }, [])

  if (!isOffline && !isSyncing) return null

  return (
    <div className={`offline-indicator ${isSyncing ? "bg-yellow-500" : "bg-red-500"}`}>
      <div className="flex items-center space-x-2">
        {isOffline ? (
          <>
            <WifiOff className="h-4 w-4" />
            <span>You are offline</span>
          </>
        ) : (
          <>
            <Wifi className="h-4 w-4" />
            <span>Syncing data...</span>
          </>
        )}
      </div>
    </div>
  )
}
