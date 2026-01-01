# Firestore Security Rules Fix

## Problem
You're getting "missing or insufficient permissions" when saving budget because the Firestore security rules don't include the `budgetSettings` collection.

## Solution

### Step 1: Update Firestore Security Rules

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Click **Firestore Database** in the left sidebar
4. Click the **Rules** tab
5. Replace the current rules with the following:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Todo app tasks
    match /tasks/{taskId} {
      allow read, write: if request.auth != null;
    }

    // Game analytics games
    match /games/{gameId} {
      allow read, write: if request.auth != null;
    }

    // Game analytics budget settings
    match /budgetSettings/{budgetId} {
      allow read, write: if request.auth != null;
    }
  }
}
```

6. Click **Publish** to save the rules

### Step 2: Test the Budget Feature

1. Sign in to your app (if not already signed in)
2. Navigate to Game Analytics
3. Try saving a budget
4. It should now work without the permissions error!

## What These Rules Do

- **`request.auth != null`**: Only allows authenticated users to read/write data
- **Per-collection rules**: Each collection (tasks, games, budgetSettings) has its own access rules
- **User isolation**: The app code ensures each user only sees their own data via `userId` filtering

## Security Best Practices

For production, consider more granular rules:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Ensure users can only access their own data
    match /tasks/{taskId} {
      allow read, write: if request.auth != null
        && request.resource.data.userId == request.auth.uid;
    }

    match /games/{gameId} {
      allow read, write: if request.auth != null
        && request.resource.data.userId == request.auth.uid;
    }

    match /budgetSettings/{budgetId} {
      allow read, write: if request.auth != null
        && request.resource.data.userId == request.auth.uid;
    }
  }
}
```

This ensures users can't modify documents with a different `userId` than their own.
