export default function UploadSection({
  selectedFiles = [],
  uploading = false,
  onFilesChange = () => {},
  onUpload = () => {},
  errorMessage = '',
}) {
  return (
    <div className="mt-6">
      <h3 className="text-lg font-medium text-gray-900">Upload PDFs</h3>
      <p className="text-sm text-gray-600">Select one or more PDF files to start a new chat thread.</p>
      <div className="mt-3 flex items-center gap-3">
        <input
          type="file"
          accept="application/pdf"
          multiple
          onChange={onFilesChange}
          className="block w-full text-sm text-gray-900 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
        />
        <button
          onClick={onUpload}
          disabled={uploading || selectedFiles.length === 0}
          className="px-4 py-2 rounded-md text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {uploading ? 'Uploading…' : 'Upload & Create Thread'}
        </button>
      </div>
      {selectedFiles.length > 0 && (
        <p className="mt-2 text-sm text-gray-600">Selected: {selectedFiles.length} file(s)</p>
      )}
      {errorMessage && (
        <p className="mt-2 text-sm text-red-600">{errorMessage}</p>
      )}
    </div>
  )
}
