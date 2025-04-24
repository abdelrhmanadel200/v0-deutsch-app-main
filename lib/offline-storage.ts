// Offline Storage Utilities

// Open IndexedDB database
export async function openDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open("deutschLearningDB", 1)

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result

      // Create object stores if they don't exist
      if (!db.objectStoreNames.contains("courses")) {
        db.createObjectStore("courses", { keyPath: "id" })
      }

      if (!db.objectStoreNames.contains("materials")) {
        db.createObjectStore("materials", { keyPath: "id" })
      }

      if (!db.objectStoreNames.contains("tests")) {
        db.createObjectStore("tests", { keyPath: "id" })
      }

      if (!db.objectStoreNames.contains("flashcards")) {
        db.createObjectStore("flashcards", { keyPath: "id" })
      }

      if (!db.objectStoreNames.contains("sync_queue")) {
        const syncStore = db.createObjectStore("sync_queue", { keyPath: "id", autoIncrement: true })
        syncStore.createIndex("timestamp", "timestamp", { unique: false })
      }
    }

    request.onsuccess = (event) => {
      resolve((event.target as IDBOpenDBRequest).result)
    }

    request.onerror = (event) => {
      reject((event.target as IDBOpenDBRequest).error)
    }
  })
}

// Store data in IndexedDB
export async function storeData(storeName: string, data: any) {
  const db = await openDatabase()

  return new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(storeName, "readwrite")
    const store = transaction.objectStore(storeName)

    const request = Array.isArray(data)
      ? data.reduce((acc, item) => {
          store.put(item)
          return acc
        }, null)
      : store.put(data)

    transaction.oncomplete = () => {
      resolve()
    }

    transaction.onerror = () => {
      reject(transaction.error)
    }
  })
}

// Retrieve data from IndexedDB
export async function getData(storeName: string, key?: string) {
  const db = await openDatabase()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, "readonly")
    const store = transaction.objectStore(storeName)

    const request = key ? store.get(key) : store.getAll()

    request.onsuccess = () => {
      resolve(request.result)
    }

    request.onerror = () => {
      reject(request.error)
    }
  })
}

// Queue action for sync when online
export async function queueActionForSync(action: any) {
  const db = await openDatabase()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction("sync_queue", "readwrite")
    const store = transaction.objectStore("sync_queue")

    const request = store.add({
      action,
      timestamp: Date.now(),
    })

    request.onsuccess = () => {
      resolve({ queued: true })
    }

    request.onerror = () => {
      reject(request.error)
    }
  })
}

// Process sync queue when online
export async function processSyncQueue() {
  const db = await openDatabase()

  return new Promise(async (resolve, reject) => {
    const transaction = db.transaction(["sync_queue"], "readwrite")
    const store = transaction.objectStore("sync_queue")

    const request = store.getAll()

    request.onsuccess = async () => {
      const actions = request.result

      if (actions.length === 0) {
        resolve({ processed: 0 })
        return
      }

      try {
        // Process each action
        for (const item of actions) {
          await processAction(item.action)
          await deleteQueueItem(item.id)
        }

        resolve({ processed: actions.length })
      } catch (error) {
        reject(error)
      }
    }

    request.onerror = () => {
      reject(request.error)
    }
  })
}

// Process a single queued action
async function processAction(action: any) {
  // Implementation depends on action type
  // This is a placeholder for the actual implementation
  console.log("Processing action:", action)

  // Example implementation:
  // if (action.type === 'submit_test') {
  //   await submitTestToServer(action.data)
  // } else if (action.type === 'update_flashcard') {
  //   await updateFlashcardOnServer(action.data)
  // }
}

// Delete item from sync queue
async function deleteQueueItem(id: number) {
  const db = await openDatabase()

  return new Promise<void>((resolve, reject) => {
    const transaction = db.transaction("sync_queue", "readwrite")
    const store = transaction.objectStore("sync_queue")

    const request = store.delete(id)

    request.onsuccess = () => {
      resolve()
    }

    request.onerror = () => {
      reject(request.error)
    }
  })
}

// Download course for offline use
export async function downloadCourseForOffline(courseId: string, supabase: any) {
  try {
    // Fetch course data
    const { data: course } = await supabase.from("courses").select("*").eq("id", courseId).single()

    // Fetch related materials
    const { data: materials } = await supabase.from("study_materials").select("*").eq("course_id", courseId)

    // Fetch tests
    const { data: tests } = await supabase.from("tests").select("*, questions(*)").eq("course_id", courseId)

    // Fetch flashcards
    const { data: flashcards } = await supabase.from("flashcards").select("*").eq("course_id", courseId)

    // Store in IndexedDB
    await storeData("courses", course)
    await storeData("materials", materials || [])
    await storeData("tests", tests || [])
    await storeData("flashcards", flashcards || [])

    return { success: true, message: "Course downloaded for offline use" }
  } catch (error) {
    console.error("Error downloading course:", error)
    return { success: false, message: "Failed to download course" }
  }
}

// Check if online
export function isOnline() {
  return navigator.onLine
}

// Register event listeners for online/offline status
// export function registerConnectivityListeners(callbacks: {
//   onOnline?: () => void
//   onOffline?: () => void
// }) {
//   window.addEventListener("online", () => {
//     callbacks.onOnline?.()
//   })

//   window.addEventListener("offline", () => {
//     callbacks.onOffline?.()
//   })

//   return () => {
//     window.removeEventListener("online", callbacks.onOnline || (() => {}))
//     window.removeEventListener("offline", callbacks.onOffline || (() => {}))
//   }
// }
