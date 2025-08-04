// src/pages/Home.jsx
export default function Home() {
    return (
<div className="min-h-screen flex flex-col justify-center items-center bg-gradient-to-b from-purple-900 via-indigo-900 to-gray-900 text-white px-4">
        <h1 className="text-4xl md:text-6xl font-bold mb-4 text-center">AI-Powered Study Assistant</h1>
        <p className="text-lg md:text-xl text-center mb-8 max-w-xl">
    Generate notes, quizzes, and MCQs effortlessly from your own files.
        </p>
        <button className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-xl transition duration-300">
        Get Started
        </button>
    </div>
    );
}
