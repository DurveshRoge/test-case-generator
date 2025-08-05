# Test Case Generator

This is a full-stack application designed to automatically generate test cases for code files from a GitHub repository. It provides a user-friendly interface to connect to GitHub, select files, generate test case summaries and code using AI (currently mocked), and create a pull request with the new test file.

## Features

- **GitHub Integration**: Connects to any GitHub repository using a Personal Access Token (PAT).
- **File Listing**: Fetches and displays a list of all files from the repository's default branch.
- **File Selection**: Allows the user to select one or more files for test case generation.
- **Live AI-Powered Generation**:
  - Connects to the Google Gemini API to generate intelligent test case summaries.
  - Generates full test case code based on the file's content and the selected summary.
- **Pull Request Creation**: Automatically creates a new branch, commits the generated test file, and opens a pull request on GitHub.
- **Clean UI/UX**: A modern, step-by-step interface built with React.

## Tech Stack

- **Frontend**: React, CSS
- **Backend**: Node.js, Express.js
- **API**: GitHub REST API (via `@octokit/rest`), Google Gemini API

---

## How It Works

The application follows a simple, linear workflow from the user's perspective, orchestrated by the frontend and backend working together.

### Frontend Logic (`/frontend`)

The frontend is a single-page application built with React that manages the user interface and application state.

1.  **User Input**: The user enters a GitHub repository URL.
2.  **Fetch Files**: On clicking "Fetch Files", the frontend makes a `POST` request to the backend's `/api/github/repo-files` endpoint.
3.  **Display Files**: The list of files received from the backend is displayed with checkboxes.
4.  **Generate Summaries**: The user selects files and clicks "Generate Test Case Summaries". This sends the selected file paths and the repository URL to the `/api/ai/generate-summaries` endpoint.
5.  **Display Summaries**: The AI-generated summaries are displayed, each with a "Generate Code" button.
6.  **Generate Code**: Clicking this button sends the specific summary and repository URL to the `/api/ai/generate-code` endpoint.
7.  **Display Code**: The generated code is displayed in a formatted `<pre>` block, along with a "Create Pull Request" button.
8.  **Create PR**: Clicking this button sends all the necessary information (repo URL, PAT, code, etc.) to the `/api/github/create-pr` endpoint.
9.  **Display PR Link**: Upon success, the frontend displays a direct link to the newly created pull request on GitHub.

### Backend Logic (`/backend`)

The backend is a Node.js server using the Express framework to provide a REST API for the frontend.

1.  **Server Setup**: An Express server is configured with `cors` to allow requests from the frontend and `body-parser` to handle JSON request bodies.
2.  **Modular Routes**: The API is organized into two main routes:
    -   `/api/github`: Handles all direct interactions with the GitHub API.
    -   `/api/ai`: Handles the logic for generating summaries and code (currently mocked).
3.  **GitHub Controller (`/controllers/githubController.js`)**:
    -   `getRepoFiles`: Uses `@octokit/rest` to authenticate with the user's PAT and fetch the repository's file tree.
    -   `getFileContent`: Fetches the raw content of a specific file from the repository. This is used to provide context to the AI.
    -   `createPullRequest`: A multi-step process that uses `@octokit/rest` to:
        1.  Get the repository's default branch and the SHA of its latest commit.
        2.  Create a new branch from that commit.
        3.  Create a blob (file content) with the generated code.
        4.  Create a tree that points to the new blob.
        5.  Create a commit that points to the new tree.
        6.  Update the new branch to point to the new commit.
        7.  Create the pull request.
4.  **AI Controller (`/controllers/aiController.js`)**:
    -   This controller connects to the Google Gemini API.
    -   `generateSummaries`: For each selected file, it first fetches the file's content using the `/api/github/file-content` endpoint. It then sends this content to the Gemini API to generate a test case summary.
    -   `generateCode`: It fetches the file's content again and sends it along with the user-selected summary to the Gemini API to generate the complete test code.

---

## Setup and Running the Project

**Prerequisites**: Node.js and npm installed.

### Backend

1.  Navigate to the backend directory:
    ```bash
    cd backend
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Create a `.env` file in the `backend` directory and add your environment variables. You must include your GitHub PAT and your Gemini API Key.
    ```
    PORT=5001
    GITHUB_PAT=your_github_personal_access_token_here
    GEMINI_API_KEY=your_gemini_api_key_here
    ```
4.  Start the backend server:
    ```bash
    npm start
    ```
    The server will be running on `http://localhost:5001`.

### Frontend

1.  Navigate to the frontend directory:
    ```bash
    cd ../frontend
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Start the frontend development server:
    ```bash
    npm start
    ```
    The application will open in your browser at `http://localhost:3000`.

## Future Improvements

- **Real AI Integration**: Replace the mock functions in `aiController.js` with API calls to a service like OpenAI's GPT models.
- **Enhanced Error Handling**: Provide more specific feedback to the user on API errors.
- **Framework Selection**: Allow the user to choose the testing framework (e.g., Jest, Mocha, PyTest) for the generated code.
- **In-App Code Editor**: Allow the user to edit the generated code before creating the pull request.
