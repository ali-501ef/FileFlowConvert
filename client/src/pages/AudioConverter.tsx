import { Link } from "wouter";

export default function AudioConverter() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Link href="/" className="text-blue-600 hover:text-blue-800">← Back to Home</Link>
        </div>
        <div className="bg-white p-8 rounded-lg shadow-md">
          <h1 className="text-3xl font-bold mb-6">Audio Converter</h1>
          <p className="text-gray-600 mb-8">Upload an audio file to convert between different formats.</p>
          
          <div className="border-dashed border-2 border-gray-300 p-12 text-center rounded-lg">
            <p className="text-gray-500">Drag and drop your audio file here or click to browse</p>
            <input type="file" accept="audio/*" className="hidden" />
          </div>
        </div>
      </div>
    </div>
  );
}