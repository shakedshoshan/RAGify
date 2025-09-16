import React, { useState } from 'react';
import { useText, useCsvUpload, type TextPayload, type CsvUploadOptions } from '../hooks';

const TextPage: React.FC = () => {
  const { createText, isLoading, error, clearError } = useText();
  const { uploadCsv, isLoading: isCsvLoading, error: csvError, clearError: clearCsvError } = useCsvUpload();
  
  // Tab state
  const [activeTab, setActiveTab] = useState<'text' | 'csv'>('text');
  
  // Text form state
  const [formData, setFormData] = useState<TextPayload>({
    project_id: '',
    name: '',
    text: '',
  });
  const [result, setResult] = useState<{ success: boolean; message: string; id?: string } | null>(null);
  
  // CSV upload state
  const [csvFormData, setCsvFormData] = useState<CsvUploadOptions & { file: File | null }>({
    project_id: '',
    name: '',
    delimiter: ',',
    skipEmptyLines: true,
    file: null,
  });
  const [csvResult, setCsvResult] = useState<{ success: boolean; message: string; id?: string; data?: any } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setResult(null);

    // Basic validation
    if (!formData.project_id.trim() || !formData.name.trim() || !formData.text.trim()) {
      setResult({ success: false, message: 'Please fill in all fields' });
      return;
    }

    const response = await createText(formData);
    if (response) {
      setResult({ 
        success: true, 
        message: 'Text created successfully!', 
        id: response.id 
      });
      setFormData({ project_id: '', name: '', text: '' });
    } else {
      setResult({ 
        success: false, 
        message: 'Failed to create text. Please try again.' 
      });
    }
  };

  const handleCsvSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearCsvError();
    setCsvResult(null);

    // Basic validation
    if (!csvFormData.project_id.trim() || !csvFormData.file) {
      setCsvResult({ success: false, message: 'Please fill in project ID and select a CSV file' });
      return;
    }

    const response = await uploadCsv(csvFormData.file, {
      project_id: csvFormData.project_id,
      name: csvFormData.name || csvFormData.file.name,
      delimiter: csvFormData.delimiter,
      skipEmptyLines: csvFormData.skipEmptyLines,
    });

    if (response) {
      setCsvResult({ 
        success: true, 
        message: 'CSV uploaded successfully!', 
        id: response.id,
        data: response.data
      });
      setCsvFormData({ 
        project_id: '', 
        name: '', 
        delimiter: ',', 
        skipEmptyLines: true, 
        file: null 
      });
    } else {
      setCsvResult({ 
        success: false, 
        message: 'Failed to upload CSV. Please try again.' 
      });
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleCsvChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setCsvFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setCsvFormData(prev => ({
      ...prev,
      file,
      name: file ? file.name.replace('.csv', '') : '',
    }));
  };

  const handleClear = () => {
    setFormData({ project_id: '', name: '', text: '' });
    setResult(null);
    clearError();
  };

  const handleCsvClear = () => {
    setCsvFormData({ 
      project_id: '', 
      name: '', 
      delimiter: ',', 
      skipEmptyLines: true, 
      file: null 
    });
    setCsvResult(null);
    clearCsvError();
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Add Content to Project
          </h1>
          <p className="text-lg text-gray-600">
            Upload text content or CSV files to your project
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white rounded-t-xl shadow-lg">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8 px-8" aria-label="Tabs">
              <button
                onClick={() => setActiveTab('text')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'text'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <svg className="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Text Input
              </button>
              <button
                onClick={() => setActiveTab('csv')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'csv'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <svg className="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                CSV Upload
              </button>
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-b-xl shadow-lg p-8">
          {activeTab === 'text' ? (
            /* Text Input Tab */
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Project ID Field */}
              <div>
                <label htmlFor="project_id" className="block text-sm font-semibold text-gray-700 mb-2">
                  Project ID <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="project_id"
                  name="project_id"
                  value={formData.project_id}
                  onChange={handleChange}
                  placeholder="Enter your project ID"
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                />
              </div>

              {/* Name Field */}
              <div>
                <label htmlFor="name" className="block text-sm font-semibold text-gray-700 mb-2">
                  Text Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Enter a name for your text"
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                />
              </div>

              {/* Text Content Field */}
              <div>
                <label htmlFor="text" className="block text-sm font-semibold text-gray-700 mb-2">
                  Text Content <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="text"
                  name="text"
                  value={formData.text}
                  onChange={handleChange}
                  placeholder="Enter your text content here..."
                  required
                  rows={6}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 resize-vertical"
                />
                <p className="mt-2 text-sm text-gray-500">
                  Character count: {formData.text.length}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-3 px-6 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 flex items-center justify-center"
                >
                  {isLoading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Creating Text...
                    </>
                  ) : (
                    'Create Text'
                  )}
                </button>
                
                <button
                  type="button"
                  onClick={handleClear}
                  disabled={isLoading}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 disabled:bg-gray-100 text-gray-700 font-semibold py-3 px-6 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-all duration-200"
                >
                  Clear Form
                </button>
              </div>
            </form>
          ) : (
            /* CSV Upload Tab */
            <form onSubmit={handleCsvSubmit} className="space-y-6">
              {/* Project ID Field */}
              <div>
                <label htmlFor="csv_project_id" className="block text-sm font-semibold text-gray-700 mb-2">
                  Project ID <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="csv_project_id"
                  name="project_id"
                  value={csvFormData.project_id}
                  onChange={handleCsvChange}
                  placeholder="Enter your project ID"
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                />
              </div>

              {/* File Upload Field */}
              <div>
                <label htmlFor="csv_file" className="block text-sm font-semibold text-gray-700 mb-2">
                  CSV File <span className="text-red-500">*</span>
                </label>
                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg hover:border-gray-400 transition-colors">
                  <div className="space-y-1 text-center">
                    <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                      <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <div className="flex text-sm text-gray-600">
                      <label htmlFor="csv_file" className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500">
                        <span>Upload a file</span>
                        <input
                          id="csv_file"
                          name="file"
                          type="file"
                          accept=".csv"
                          onChange={handleFileChange}
                          className="sr-only"
                        />
                      </label>
                      <p className="pl-1">or drag and drop</p>
                    </div>
                    <p className="text-xs text-gray-500">CSV files only, up to 10MB</p>
                  </div>
                </div>
                {csvFormData.file && (
                  <p className="mt-2 text-sm text-gray-600">
                    Selected: <span className="font-medium">{csvFormData.file.name}</span> ({(csvFormData.file.size / 1024).toFixed(1)} KB)
                  </p>
                )}
              </div>

              {/* Name Field */}
              <div>
                <label htmlFor="csv_name" className="block text-sm font-semibold text-gray-700 mb-2">
                  Name (optional)
                </label>
                <input
                  type="text"
                  id="csv_name"
                  name="name"
                  value={csvFormData.name}
                  onChange={handleCsvChange}
                  placeholder="Enter a name for your CSV (defaults to filename)"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                />
              </div>

              {/* Advanced Options */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="delimiter" className="block text-sm font-semibold text-gray-700 mb-2">
                    Delimiter
                  </label>
                  <select
                    id="delimiter"
                    name="delimiter"
                    value={csvFormData.delimiter}
                    onChange={handleCsvChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  >
                    <option value=",">Comma (,)</option>
                    <option value=";">Semicolon (;)</option>
                    <option value="\t">Tab</option>
                    <option value="|">Pipe (|)</option>
                  </select>
                </div>

                <div className="flex items-center">
                  <input
                    id="skipEmptyLines"
                    name="skipEmptyLines"
                    type="checkbox"
                    checked={csvFormData.skipEmptyLines}
                    onChange={handleCsvChange}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="skipEmptyLines" className="ml-2 block text-sm text-gray-700">
                    Skip empty lines
                  </label>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <button
                  type="submit"
                  disabled={isCsvLoading}
                  className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-semibold py-3 px-6 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-all duration-200 flex items-center justify-center"
                >
                  {isCsvLoading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Uploading CSV...
                    </>
                  ) : (
                    'Upload CSV'
                  )}
                </button>
                
                <button
                  type="button"
                  onClick={handleCsvClear}
                  disabled={isCsvLoading}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 disabled:bg-gray-100 text-gray-700 font-semibold py-3 px-6 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-all duration-200"
                >
                  Clear Form
                </button>
              </div>
            </form>
          )}

          {/* Error Display for Text Tab */}
          {activeTab === 'text' && error && (
            <div className="mt-6 p-4 bg-red-50 border-l-4 border-red-400 rounded-r-lg">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">Error</h3>
                  <p className="mt-1 text-sm text-red-700">{error}</p>
                  <button
                    onClick={clearError}
                    className="mt-2 text-sm text-red-600 hover:text-red-500 underline"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Error Display for CSV Tab */}
          {activeTab === 'csv' && csvError && (
            <div className="mt-6 p-4 bg-red-50 border-l-4 border-red-400 rounded-r-lg">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">Error</h3>
                  <p className="mt-1 text-sm text-red-700">{csvError}</p>
                  <button
                    onClick={clearCsvError}
                    className="mt-2 text-sm text-red-600 hover:text-red-500 underline"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Success/Result Display for Text Tab */}
          {activeTab === 'text' && result && (
            <div className={`mt-6 p-4 rounded-lg border-l-4 ${
              result.success 
                ? 'bg-green-50 border-green-400' 
                : 'bg-yellow-50 border-yellow-400'
            }`}>
              <div className="flex">
                <div className="flex-shrink-0">
                  {result.success ? (
                    <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
                <div className="ml-3">
                  <h3 className={`text-sm font-medium ${
                    result.success ? 'text-green-800' : 'text-yellow-800'
                  }`}>
                    {result.success ? 'Success!' : 'Warning'}
                  </h3>
                  <p className={`mt-1 text-sm ${
                    result.success ? 'text-green-700' : 'text-yellow-700'
                  }`}>
                    {result.message}
                    {result.id && (
                      <span className="block mt-1 font-mono text-xs bg-gray-100 px-2 py-1 rounded">
                        ID: {result.id}
                      </span>
                    )}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Success/Result Display for CSV Tab */}
          {activeTab === 'csv' && csvResult && (
            <div className={`mt-6 p-4 rounded-lg border-l-4 ${
              csvResult.success 
                ? 'bg-green-50 border-green-400' 
                : 'bg-yellow-50 border-yellow-400'
            }`}>
              <div className="flex">
                <div className="flex-shrink-0">
                  {csvResult.success ? (
                    <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
                <div className="ml-3">
                  <h3 className={`text-sm font-medium ${
                    csvResult.success ? 'text-green-800' : 'text-yellow-800'
                  }`}>
                    {csvResult.success ? 'Success!' : 'Warning'}
                  </h3>
                  <p className={`mt-1 text-sm ${
                    csvResult.success ? 'text-green-700' : 'text-yellow-700'
                  }`}>
                    {csvResult.message}
                    {csvResult.id && (
                      <span className="block mt-1 font-mono text-xs bg-gray-100 px-2 py-1 rounded">
                        ID: {csvResult.id}
                      </span>
                    )}
                    {csvResult.data && (
                      <div className="mt-2 text-xs text-gray-600">
                        <p>Rows: {csvResult.data.rowCount}</p>
                        <p>Headers: {csvResult.data.headers?.join(', ')}</p>
                      </div>
                    )}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Info */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>All fields marked with <span className="text-red-500">*</span> are required</p>
        </div>
      </div>
    </div>
  );
};

export default TextPage;
