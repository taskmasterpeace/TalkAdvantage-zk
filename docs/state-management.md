# State Management Strategy

## State Categories

TalkAdvantage uses a structured approach to state management based on the following categories:

### 1. Global Persistent State

**Storage**: Zustand with persist middleware  
**Examples**: User settings, templates, saved sessions, recordings, analytics profiles

This state needs to persist across page refreshes and browser sessions. We use Zustand's persist middleware to automatically save and load this state from localStorage.

### 2. Global Ephemeral State

**Storage**: Zustand without persist  
**Examples**: Current recording session, application status, global UI state, loading indicators

This state is global but doesn't need to persist across refreshes. It's reset when the page is reloaded.

### 3. Authentication State

**Storage**: React Context + Supabase  
**Examples**: Current user, auth tokens, user profile

Authentication state is managed separately through React Context to handle auth-specific concerns and integrate with Supabase Auth.

### 4. Local UI State

**Storage**: React useState/useReducer  
**Examples**: Form inputs, modal open/closed, local loading states

This state is specific to a single component and doesn't affect other parts of the application.

### 5. Server State

**Storage**: React Query or SWR (future implementation)  
**Examples**: API data, query results, mutations

This state represents data from the server and needs caching, refetching, and synchronization.

## Store Organization

Each Zustand store follows a consistent pattern:

1. **State Interface**: Define a TypeScript interface for the store state
2. **Default State**: Define default values
3. **Actions**: Group related actions together
4. **Persistence**: Configure persistence options if needed

## State Access Patterns

1. **Component Access**: Use hooks to access state
   \`\`\`tsx
   const { recordings } = useRecordingsStore()
   \`\`\`

2. **Service Access**: Use store.getState() for non-React code
   \`\`\`tsx
   const settings = useSettingsStore.getState()
   \`\`\`

3. **Cross-Store Access**: Avoid direct dependencies between stores. Instead, create specialized hooks that combine multiple stores.
   \`\`\`tsx
   // Good: Use a specialized hook
   const { uploadRecording } = useRecordingManagement()
   
   // Avoid: Accessing multiple stores directly in components
   const { recordings } = useRecordingsStore()
   const { notifications } = useUIStore()
   \`\`\`

## Extending Stores

When extending stores, follow these guidelines:
1. Add new properties to the state interface
2. Add new actions that modify those properties
3. Update persistence configuration if needed
4. Document the changes

## Store Reference

### Settings Store
- **Purpose**: Manage user preferences and application settings
- **Persistence**: Yes
- **Key State**: theme, volume, aiModel, apiKeys

### UI Store
- **Purpose**: Manage global UI state
- **Persistence**: No
- **Key State**: sidebarOpen, activeModal, loadingStates, notifications

### Recordings Store
- **Purpose**: Manage audio recordings
- **Persistence**: Yes (recordings only)
- **Key State**: recordings, isLoading, error

### Analytics Store
- **Purpose**: Manage analytics profiles and analysis results
- **Persistence**: Yes (profiles and results)
- **Key State**: profiles, results, activeProfileId

### Session Store
- **Purpose**: Manage the current recording session
- **Persistence**: Yes (partial)
- **Key State**: currentRecording, transcript, bookmarks

### Template Store
- **Purpose**: Manage question templates
- **Persistence**: Yes
- **Key State**: templates, categories

## Best Practices

1. **Minimize Re-renders**: Only subscribe to the specific state properties you need
   \`\`\`tsx
   // Good: Only subscribe to what you need
   const isLoading = useUIStore(state => state.isLoading("recordingUpload"))
   
   // Avoid: Subscribing to the entire state
   const uiState = useUIStore()
   const isLoading = uiState.isLoading("recordingUpload")
   \`\`\`

2. **Use Selectors**: Create selectors for derived state
   \`\`\`tsx
   // In the store
   getFilteredRecordings: (options) => {
     // Filter logic here
   }
   
   // In the component
   const filteredRecordings = useRecordingsStore(state => 
     state.getFilteredRecordings({ searchQuery: "meeting" })
   )
   \`\`\`

3. **Batch Updates**: Batch multiple state updates together
   \`\`\`tsx
   // Good: Batch updates
   set(state => ({
     isLoading: false,
     error: null,
     data: newData
   }))
   
   // Avoid: Multiple separate updates
   set({ isLoading: false })
   set({ error: null })
   set({ data: newData })
   \`\`\`

4. **Handle Side Effects**: Keep side effects out of the store when possible
   \`\`\`tsx
   // Good: Handle side effects in components or hooks
   const handleSubmit = async () => {
     try {
       await api.saveData(data)
       useStore.getState().setData(data)
     } catch (error) {
       useStore.getState().setError(error.message)
     }
   }
   
   // Avoid: Complex side effects in the store
   setData: async (data) => {
     try {
       await api.saveData(data)
       set({ data })
     } catch (error) {
       set({ error: error.message })
     }
   }
   \`\`\`

5. **Type Everything**: Use TypeScript interfaces for all state and actions
\`\`\`

## 8. Guide for Extending Existing Stores
