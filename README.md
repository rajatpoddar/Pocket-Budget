
# Pocket Budget - Daily Income & Expenses Tracker

Pocket Budget is a comprehensive web application designed to help users manage their personal and freelance finances effectively. It offers features for tracking income and expenses, managing client projects, setting budget goals, and understanding financial overviews through a dashboard. The application also includes a subscription model and an admin panel for user and subscription management.

![Pocket Budget Mockup](https://placehold.co/1200x600.png?text=Pocket+Budget+App+Interface)
*<p align="center" style="font-size: small; color: grey;">(Replace with an actual screenshot of the application)</p>*

## Key Features

*   **Dashboard:** Visual overview of monthly income, expenses, net savings, project dues, and recent financial activities.
*   **Income Management:**
    *   Track various income sources.
    *   Categorize income (e.g., Salary, Freelance, Daily Fixed Income).
    *   Support for project-based income with client linking, project cost, and dues tracking.
    *   Quick add for daily fixed income.
*   **Expense Management:**
    *   Record and categorize expenses.
    *   View expenses in a sortable table.
*   **Category Management:**
    *   Create and manage custom categories for both income and expenses.
    *   Income categories can be configured for project tracking or as daily fixed income sources.
*   **Client Management:**
    *   Maintain a list of clients with contact details.
    *   View financial summaries per client (total paid, total dues).
*   **Budget Goals:**
    *   Set financial goals (e.g., vacation fund, emergency fund).
    *   Track progress towards achieving these goals.
*   **User Authentication:**
    *   Secure signup and login functionality using Firebase Authentication (Email/Password).
*   **Subscription Model:**
    *   15-day free trial for new users.
    *   Monthly and Yearly subscription plans.
    *   Users can request plans, which require admin approval.
    *   Subscription status and end dates are tracked.
*   **Admin Panel (for SUPER_ADMIN):**
    *   **User Management:** View all users, their subscription status, plan details, and directly manage their subscriptions (start trial, activate plans, end plans).
    *   **Subscription Management:** View and approve pending subscription requests from users.
    *   **Remove User Profile:** Admins can remove user data from Firestore (profile data, not Firebase Auth entry).
*   **Responsive Design:** Optimized for use on desktop and mobile devices.
*   **Theme Toggle:** Light and Dark mode support.

## Tech Stack

*   **Frontend:**
    *   Next.js (App Router, Server Components, Server Actions)
    *   React
    *   TypeScript
    *   Tailwind CSS for styling
    *   ShadCN UI for pre-built, accessible UI components
*   **State Management & Data Fetching:**
    *   TanStack Query (React Query) for server-state management and data fetching.
*   **Forms:**
    *   React Hook Form for form handling.
    *   Zod for schema validation.
*   **Backend & Database:**
    *   Firebase
        *   Firebase Authentication for user management.
        *   Firestore as the NoSQL database for storing application data.
*   **AI (Potential):**
    *   Genkit (Google's Generative AI toolkit) - Initial setup present for future AI feature integration.
*   **Deployment:**
    *   Configured for Firebase App Hosting (see `apphosting.yaml`).

## Project Structure

A brief overview of some key directories:

*   `src/app/`: Contains the Next.js App Router pages and layouts.
    *   `src/app/(app)/`: Authenticated user-facing pages.
    *   `src/app/(admin)/`: Admin-only pages.
    *   `src/app/api/`: API routes (if any, Genkit uses server actions primarily).
*   `src/components/`: Reusable React components.
    *   `src/components/ui/`: ShadCN UI components.
*   `src/hooks/`: Custom React hooks (e.g., `useAuth`, `useToast`).
*   `src/lib/`: Utility functions and Firebase initialization (`firebase.ts`).
*   `src/types/`: TypeScript type definitions.
*   `src/ai/`: Genkit related files (flows, configuration).
*   `public/`: Static assets.

## Prerequisites

*   Node.js (v18 or later recommended)
*   npm, yarn, or pnpm

## Getting Started

Follow these steps to get the project running locally:

1.  **Clone the repository:**
    ```bash
    git clone <your-repository-url>
    cd pocket-budget 
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    # or
    yarn install
    # or
    pnpm install
    ```

3.  **Firebase Setup:**
    *   Go to the [Firebase Console](https://console.firebase.google.com/) and create a new project (or use an existing one).
    *   **Enable Authentication:**
        *   In your Firebase project, go to Authentication -> Sign-in method.
        *   Enable the "Email/Password" provider.
    *   **Enable Firestore Database:**
        *   In your Firebase project, go to Firestore Database.
        *   Create a database (choose "Start in production mode" or "Start in test mode" - you'll configure rules next).
    *   **Get Firebase Configuration:**
        *   In your Firebase project settings (Project Overview > Project settings), find your web app's Firebase SDK setup snippet.
        *   You'll need these values for your environment variables.
    *   **Set up Environment Variables:**
        Create a `.env.local` file in the root of your project and add your Firebase configuration keys:
        ```env
        NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
        NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
        NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
        NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
        NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
        NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
        NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your_measurement_id
        ```
        Replace `your_...` with your actual Firebase project values.
    *   **Configure Super Admin:**
        *   After signing up with an email and password, find your User UID in the Firebase Authentication console.
        *   Update the `SUPER_ADMIN_UID` in `src/config.ts` with this UID to grant access to admin functionalities.
        ```typescript
        // src/config.ts
        export const SUPER_ADMIN_UID = "YOUR_ACTUAL_FIREBASE_ADMIN_USER_ID";
        ```
    *   **Set Firestore Security Rules:**
        *   In your Firebase project, go to Firestore Database -> Rules.
        *   Paste the security rules provided in the project documentation or a secure ruleset that allows users to manage their own data and admins to manage all data. (Refer to the rules provided during development for a starting point).
        *   **Important:** Ensure your rules are secure and follow the principle of least privilege.

4.  **Initial Data (Optional but Recommended):**
    *   Upon first signup, the application automatically creates a default "Freelance" income category for the new user.

## Running Locally

To run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

The application should now be running on `http://localhost:9002` (or the port specified in `package.json`).

If you plan to use Genkit AI features, you might need to run the Genkit developer UI separately:
```bash
npm run genkit:dev
# or
npm run genkit:watch
```
This typically starts on `http://localhost:4000`.

## Deployment

This project includes an `apphosting.yaml` file, indicating it's set up for deployment with [Firebase App Hosting](https://firebase.google.com/docs/app-hosting). Refer to the Firebase App Hosting documentation for deployment steps.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
1.  Fork the Project
2.  Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3.  Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4.  Push to the Branch (`git push origin feature/AmazingFeature`)
5.  Open a Pull Request

---

*This README was generated with assistance from an AI coding partner in Firebase Studio.*
