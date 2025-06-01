
// src/config.ts

/**
 * IMPORTANT: Replace this placeholder with your actual Firebase Admin User ID.
 * This UID is used to grant access to super admin functionalities like the user management page.
 * You can find your Firebase User UID in the Firebase console under Authentication -> Users table.
 */
export const SUPER_ADMIN_UID = "m34GUCh2qfamoop6EfzMbcZyV163";

/**
 * Alternatively, if you prefer role-based access using a Firestore field:
 * 1. Add an 'isAdmin: true' field to your admin user's document in Firestore (e.g., /users/YOUR_ADMIN_UID).
 * 2. Update the checks in src/app/(admin)/layout.tsx and src/components/layout/sidebar-nav.tsx
 *    to use `userProfile?.isAdmin === true` instead of or in addition to the SUPER_ADMIN_UID check.
 */
