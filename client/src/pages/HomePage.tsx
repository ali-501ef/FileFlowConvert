import { Link } from "wouter";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <header className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">FileFlow</h1>
          <p className="text-xl text-gray-600">Universal File Conversion Platform</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Link href="/pdf-compress">
            <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow cursor-pointer">
              <h3 className="text-lg font-semibold mb-2">PDF Compress</h3>
              <p className="text-gray-600">Reduce PDF file size</p>
            </div>
          </Link>

          <Link href="/pdf-split">
            <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow cursor-pointer">
              <h3 className="text-lg font-semibold mb-2">PDF Split</h3>
              <p className="text-gray-600">Split PDF into multiple files</p>
            </div>
          </Link>

          <Link href="/pdf-merge">
            <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow cursor-pointer">
              <h3 className="text-lg font-semibold mb-2">PDF Merge</h3>
              <p className="text-gray-600">Combine multiple PDFs</p>
            </div>
          </Link>

          <Link href="/pdf-rotate">
            <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow cursor-pointer">
              <h3 className="text-lg font-semibold mb-2">PDF Rotate</h3>
              <p className="text-gray-600">Rotate PDF pages</p>
            </div>
          </Link>

          <Link href="/pdf-watermark">
            <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow cursor-pointer">
              <h3 className="text-lg font-semibold mb-2">PDF Watermark</h3>
              <p className="text-gray-600">Add watermarks to PDFs</p>
            </div>
          </Link>

          <Link href="/pdf-to-jpg">
            <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow cursor-pointer">
              <h3 className="text-lg font-semibold mb-2">PDF to JPG</h3>
              <p className="text-gray-600">Convert PDF to images</p>
            </div>
          </Link>

          <Link href="/pdf-to-word">
            <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow cursor-pointer">
              <h3 className="text-lg font-semibold mb-2">PDF to Word</h3>
              <p className="text-gray-600">Convert PDF to Word document</p>
            </div>
          </Link>

          <Link href="/jpg-to-pdf">
            <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow cursor-pointer">
              <h3 className="text-lg font-semibold mb-2">JPG to PDF</h3>
              <p className="text-gray-600">Convert images to PDF</p>
            </div>
          </Link>

          <Link href="/video-compress">
            <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow cursor-pointer">
              <h3 className="text-lg font-semibold mb-2">Video Compress</h3>
              <p className="text-gray-600">Reduce video file size</p>
            </div>
          </Link>

          <Link href="/video-trim">
            <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow cursor-pointer">
              <h3 className="text-lg font-semibold mb-2">Video Trim</h3>
              <p className="text-gray-600">Trim video duration</p>
            </div>
          </Link>

          <Link href="/audio-converter">
            <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow cursor-pointer">
              <h3 className="text-lg font-semibold mb-2">Audio Converter</h3>
              <p className="text-gray-600">Convert audio formats</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}