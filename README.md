# Gemini Traffic Sentinel 🚦

An AI-powered traffic violation detection system that leverages Google's Gemini 2.5 Flash model to analyze traffic feeds, identify violations, and automate penalty enforcement via email notifications.

[![YouTube Demo](https://img.shields.io/badge/Watch_Demo-FF0000?style=for-the-badge&logo=youtube&logoColor=white)](https://youtu.be/OsikvFCnkg8)

![Workflow Diagram](./project_diagrams/workflow%20diagram.png)

## 🌟 Features

*   **AI-Powered Detection**: Uses Google Gemini 2.5 Flash to analyze images/video frames for traffic violations (e.g., no helmet, signal jump, triple riding).
*   **Automated Evidence Storage**: Uploads violation snapshots to **Cloudinary** securely.
*   **Smart Deduplication**: Prevents duplicate violation recording for the same vehicle and crime type within a 2-hour window.
*   **Instant Notifications**: Integrates with **EmailJS** to send instant violation notices with evidence links to vehicle owners.
*   **Secure Database**: Stores all violation records and user data in **Firebase Firestore**.
*   **Authentication**: Secure login system using **Firebase Authentication**.

## 🛠️ Tech Stack

*   **Frontend**: React, Vite, TypeScript
*   **AI Model**: Google Gemini 2.5 Flash (gemini-2.5-flash-native-audio-preview-09-2025)
*   **Backend/BaaS**: Firebase (Auth, Firestore)
*   **Storage**: Cloudinary
*   **Notifications**: EmailJS

## 🚀 Getting Started

### Prerequisites
*   Node.js installed
*   API Keys for Google Gemini, Firebase, Cloudinary, and EmailJS

### Installation

1.  Clone the repository:
    ```bash
    git clone https://github.com/AxilBlaze/Gemini_Traffic_sentinel.git
    cd Gemini_Traffic_sentinel
    ```

2.  Install dependencies:
    ```bash
    npm install
    ```

3.  Configure Environment Variables:
    Copy the example env file and fill in your credentials.
    ```bash
    cp .env.example .env
    ```
    
    Update `.env` with your keys:
    *   `VITE_CLOUDINARY_*`: For image storage.
    *   `VITE_FIREBASE_*`: For database and auth.
    *   `VITE_EMAILJS_*`: For sending emails.
    *   `GEMINI_API_KEY`: For AI analysis.

4.  Run the application:
    ```bash
    npm run dev
    ```

## 📂 Workflow

1.  **Input**: Traffic feed (camera/image) is captured.
2.  **Analysis**: The image is sent to the Gemini AI model.
3.  **Detection**: If a violation is detected, the AI extracts details (Vehicle No, Violation Type).
4.  **Verification**: System checks for duplicates in Firestore (2-hour cooldown).
5.  **Storage**: Evidence image is uploaded to Cloudinary; Record saved to Firestore.
6.  **Action**: Email notification is triggered to the registered owner.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
