## SyncHandler

- Manages queue and calls action

## SyncHandlerActions

- Imports component-specific db `submit` functions and exports a single `Actions` object.

## Component-specific db functions

- Specify the shape of the data for local storage and for the database (these may differ)
- Specify the actual logic for submitting to the database

## Data flow: Component 🠖 database (2: store once, transform before db submit)

- _database/component.ts: `sync` function
  - Receives full component-shaped object
  - Queues { storageKey, action } with SyncHandler

- SyncHandler.ts: `enqueue`
  - Receives { storageKey, action } from component `sync` function
  - Adds { storageKey, action } to SyncHandler.queue
  - Starts queue

- SyncHandler.ts: `startQueue`
  - Checks SyncHandler.ready
  - Checks that queue item's nextAttemptAt is not in the future
  - Calls specified submit function from `Actions` with storageKey

- _database/component.ts: `submit` function
  - Receives SyncHandler, storageKey from SyncHandler queue
  - Fetches component-shaped object from storage
  - Transforms component-shaped object into database-shaped payload
  - Attempts to perform database operation with payload
  - Returns { data, error }

- SyncHandler.ts: `startQueue`
  - Receives { data, error } from `submit` function
  - If successful, removes item from queue
  - If unsuccessful, updates nextAttemptAt and continues

## Server-validated submissions

- MultipleChoiceQuestion objects are stored locally in a minimal form (just scrubbed items)
- The server can rehydrate these into the full question object before submitting to the database
  itself, thus securing everything except `.wasSelected`
- Not going to implement this at the moment because low stakes

<!-- ## Data flow: Component 🠖 database (1: transform payload once, store separately)

- _database/component.ts: `sync` function
  - Receives full component-shaped object
  - Transforms object to database shape (payload)
  - Queues { payload, action } with SyncHandler

- SyncHandler.ts: `enqueue`
  - Receives { payload, action } from component `sync` function
  - Adds { payload, action } to SyncHandler.queue
  - Stashes payload in local storage
  - Starts queue

- SyncHandler.ts: `startQueue`
  - Checks SyncHandler.ready
  - Checks that queue item's nextAttemptAt is not in the future
  - Fetches stashed payload from local storage
  - Calls specified submit function from `Actions` with payload

- _database/component.ts: `submit` function
  - Receives SyncHandler, payload from SyncHandler queue
  - Attempts to perform database operation
  - Returns { data, error }

- SyncHandler.ts: `startQueue`
  - Receives { data, error } from `submit` function
  - If successful, removes item from queue and deletes local storage stash
  - If unsuccessful, updates nextAttemptAt and continues -->
