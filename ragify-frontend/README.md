# RAGify Frontend 🖥️

### React Dashbord for RAG Management

The RAGify dashboard allows users to manage their RAG projects, upload documents, and generate API keys for their own RAG-as-a-Service applications.

---

## 🚀 Features

- **Project Dashboard**: Create and manage multiple RAG instances.
- **Document Management**: Upload PDFs, CSVs, and plain text with ease.
- **API Key Control**: Generate, update, and revoke API keys for your projects.
- **Project Configuration**: Set chunking parameters, choose models, and define custom AI personas.
- **Usage Monitoring**: (Coming Soon) View RAG query stats and credit usage.

---

## 🏗️ Technology Stack

- **React 19**: Modern UI component architecture.
- **Vite**: Ultra-fast build tool and development server.
- **Tailwind CSS v4**: Utility-first CSS framework for modern styling.
- **Redux Toolkit**: Efficient state management.
- **React Router v7**: Declarative routing for a seamless single-page experience.
- **Firebase Auth**: Secure user authentication.

---

## 🛠️ Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- [npm](https://www.npmjs.com/)

### Installation

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Environment Variables**
   Create a `.env` file in the `ragify-frontend` directory with your Firebase and API configuration:
   ```env
   VITE_FIREBASE_API_KEY=your_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   VITE_FIREBASE_APP_ID=your_app_id
   VITE_API_BASE_URL=http://localhost:5000
   ```

3. **Development Mode**
   ```bash
   npm run dev
   ```

---

## 📄 License

This project is licensed under the MIT License.
