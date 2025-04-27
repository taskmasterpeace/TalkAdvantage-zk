# Guide to Extending Existing Stores

This document provides guidelines for extending the existing Zustand stores in the TalkAdvantage application.

## General Principles

1. **Single Responsibility**: Each store should have a clear, focused purpose
2. **Minimal Dependencies**: Avoid direct dependencies between stores
3. **Type Safety**: Always define proper TypeScript interfaces
4. **Persistence**: Be intentional about what state is persisted

## Step-by-Step Guide to Extending a Store

### 1. Update the State Interface

Add new properties to the state interface:

\`\`\`typescript
// Before
interface SettingsState {
  theme: ThemeOption;
  volume: number;
  // ...existing properties
}

// After
interface SettingsState {
  theme: ThemeOption;
  volume: number;
  // ...existing properties
  
  // New properties
  newFeatureEnabled: boolean;
  newFeatureOptions: string[];
}
\`\`\`

### 2. Add Default Values

Add default values for the new properties:

\`\`\`typescript
const defaultSettings = {
  // ...existing defaults
  
  // New defaults
  newFeatureEnabled: false,
  newFeatureOptions: ["option1", "option2"],
}
\`\`\`

### 3. Add Actions

Add actions to modify the new state:

\`\`\`typescript
// In the store creation
{
  // ...existing actions
  
  // New actions
  setNewFeatureEnabled: (enabled: boolean) => set({ newFeatureEnabled: enabled }),
  
  addNewFeatureOption: (option: string) => set((state) => ({
    newFeatureOptions: [...state.newFeatureOptions, option]
  })),
  
  removeNewFeatureOption: (option: string) => set((state) => ({
    newFeatureOptions: state.newFeatureOptions.filter(opt => opt !== option)
  })),
}
\`\`\`

### 4. Update Persistence Configuration

If the store uses persistence, update the configuration:

\`\`\`typescript
persist(
  // Store implementation
  {
    name: "store-name",
    partialize: (state) => ({
      // ...existing persisted properties
      
      // New persisted properties
      newFeatureEnabled: state.newFeatureEnabled,
      // Note: We're choosing NOT to persist newFeatureOptions
    }),
  }
)
\`\`\`

### 5. Document the Changes

Add comments explaining the purpose of the new state and actions:

\`\`\`typescript
/**
 * Controls the new feature functionality
 * @property newFeatureEnabled - Whether the new feature is enabled
 * @property newFeatureOptions - Available options for the new feature
 */
newFeatureEnabled: boolean;
newFeatureOptions: string[];

/**
 * Enables or disables the new feature
 * @param enabled - Whether to enable the feature
 */
setNewFeatureEnabled: (enabled: boolean) => void;
\`\`\`

## Example: Extending the Settings Store

Here's a complete example of extending the settings store to add notification preferences:

\`\`\`typescript
import { create } from "zustand";
import { persist } from "zustand/middleware";

// Add new types
export type NotificationChannel = "email" | "push" | "in-app";

// Update the interface
interface SettingsState {
  // Existing state
  theme: ThemeOption;
  volume: number;
  // ...other existing properties
  
  // New notification preferences
  notificationsEnabled: boolean;
  notificationChannels: NotificationChannel[];
  
  // Existing actions
  setTheme: (theme: ThemeOption) => void;
  setVolume: (volume: number) => void;
  // ...other existing actions
  
  // New actions
  setNotificationsEnabled: (enabled: boolean) => void;
  addNotificationChannel: (channel: NotificationChannel) => void;
  removeNotificationChannel: (channel: NotificationChannel) => void;
  resetNotificationPreferences: () => void;
}

// Update default settings
const defaultSettings = {
  // ...existing defaults
  
  // New defaults
  notificationsEnabled: true,
  notificationChannels: ["in-app"] as NotificationChannel[],
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      // Include existing state and actions
      ...defaultSettings,
      
      setTheme: (theme) => set({ theme }),
      setVolume: (volume) => set({ volume }),
      // ...other existing actions
      
      // Add new actions
      setNotificationsEnabled: (enabled) => set({ notificationsEnabled: enabled }),
      
      addNotificationChannel: (channel) => set((state) => {
        if (state.notificationChannels.includes(channel)) {
          return state; // No change if channel already exists
        }
        return {
          notificationChannels: [...state.notificationChannels, channel]
        };
      }),
      
      removeNotificationChannel: (channel) => set((state) => ({
        notificationChannels: state.notificationChannels.filter(c => c !== channel)
      })),
      
      resetNotificationPreferences: () => set({
        notificationsEnabled: defaultSettings.notificationsEnabled,
        notificationChannels: defaultSettings.notificationChannels,
      }),
    }),
    {
      name: "talkadvantage-settings",
      partialize: (state) => ({
        // Existing persisted state
        theme: state.theme,
        volume: state.volume,
        // ...other existing persisted state
        
        // New persisted state
        notificationsEnabled: state.notificationsEnabled,
        notificationChannels: state.notificationChannels,
      }),
    }
  )
);
\`\`\`

## Common Patterns for Different Types of State

### Adding Feature Flags

\`\`\`typescript
// In the interface
featureFlags: {
  experimentalFeature: boolean;
  betaFeature: boolean;
  // ...other feature flags
};

// In the actions
setFeatureFlag: (flag: keyof SettingsState['featureFlags'], value: boolean) => void;

// Implementation
setFeatureFlag: (flag, value) => set((state) => ({
  featureFlags: {
    ...state.featureFlags,
    [flag]: value
  }
})),
\`\`\`

### Adding User Preferences

\`\`\`typescript
// In the interface
preferences: {
  language: string;
  timezone: string;
  dateFormat: string;
  // ...other preferences
};

// In the actions
setPreference: <K extends keyof SettingsState['preferences']>(
  key: K, 
  value: SettingsState['preferences'][K]
) => void;

// Implementation
setPreference: (key, value) => set((state) => ({
  preferences: {
    ...state.preferences,
    [key]: value
  }
})),
\`\`\`

### Adding Collection Management

\`\`\`typescript
// In the interface
items: Record<string, Item>;
selectedItemId: string | null;

// In the actions
addItem: (item: Item) => void;
updateItem: (id: string, updates: Partial<Item>) => void;
removeItem: (id: string) => void;
selectItem: (id: string | null) => void;

// Implementation
addItem: (item) => set((state) => ({
  items: {
    ...state.items,
    [item.id]: item
  }
})),

updateItem: (id, updates) => set((state) => ({
  items: {
    ...state.items,
    [id]: {
      ...state.items[id],
      ...updates
    }
  }
})),

removeItem: (id) => set((state) => {
  const { [id]: _, ...remainingItems } = state.items;
  return { items: remainingItems };
}),

selectItem: (id) => set({ selectedItemId: id }),
\`\`\`

## Testing Store Extensions

When extending stores, make sure to test:

1. **State Updates**: Verify that actions correctly update the state
2. **Persistence**: Check that the right state is persisted
3. **Type Safety**: Ensure TypeScript types are correct
4. **Side Effects**: Test any side effects triggered by state changes

Example test:

\`\`\`typescript
import { renderHook, act } from '@testing-library/react-hooks';
import { useSettingsStore } from './settings-store';

describe('Settings Store', () => {
  beforeEach(() => {
    // Clear the store before each test
    act(() => {
      useSettingsStore.setState({
        // Reset to default state
      });
    });
  });

  test('should update notification preferences', () => {
    const { result } = renderHook(() => useSettingsStore());
    
    act(() => {
      result.current.setNotificationsEnabled(false);
    });
    
    expect(result.current.notificationsEnabled).toBe(false);
    
    act(() => {
      result.current.addNotificationChannel('email');
    });
    
    expect(result.current.notificationChannels).toContain('email');
  });
});
