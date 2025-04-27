import { create } from "zustand"

// Define notification type for reuse
export type Notification = {
  id: string
  type: "info" | "success" | "warning" | "error"
  message: string
  duration?: number
}

// Define the UI state interface
interface UIState {
  // Sidebar state
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
  toggleSidebar: () => void

  // Modal states
  activeModal: string | null
  openModal: (modalId: string) => void
  closeModal: () => void

  // Loading states
  loadingStates: Record<string, boolean>
  setLoading: (key: string, isLoading: boolean) => void
  isLoading: (key: string) => boolean

  // Notifications
  notifications: Array<Notification>
  addNotification: (notification: Omit<Notification, "id">) => string
  removeNotification: (id: string) => void
  clearNotifications: () => void
}

// Create the UI store
export const useUIStore = create<UIState>()((set, get) => ({
  // Sidebar state
  sidebarOpen: true,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),

  // Modal states
  activeModal: null,
  openModal: (modalId) => set({ activeModal: modalId }),
  closeModal: () => set({ activeModal: null }),

  // Loading states
  loadingStates: {},
  setLoading: (key, isLoading) =>
    set((state) => ({
      loadingStates: {
        ...state.loadingStates,
        [key]: isLoading,
      },
    })),
  isLoading: (key) => get().loadingStates[key] || false,

  // Notifications
  notifications: [],
  addNotification: (notification) => {
    const id = Date.now().toString()
    set((state) => ({
      notifications: [...state.notifications, { ...notification, id }],
    }))

    // Auto-remove notification after duration if specified
    if (notification.duration) {
      setTimeout(() => {
        get().removeNotification(id)
      }, notification.duration)
    }

    return id
  },
  removeNotification: (id) =>
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    })),
  clearNotifications: () => set({ notifications: [] }),
}))
