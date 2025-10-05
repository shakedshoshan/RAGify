import React, { useState, useEffect, useRef } from 'react';
import { useGeneration, type ConversationMessage } from '../hooks/useGeneration';
import { useGetUserProjects } from '../hooks/project_hooks/useGetUserProjects';
import type { Project } from '../types/projects_types';

const ChatbotTestingPage: React.FC = () => {
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [apiKey, setApiKey] = useState<string>('');
  const [currentMessage, setCurrentMessage] = useState<string>('');
  const [conversationHistory, setConversationHistory] = useState<ConversationMessage[]>([]);
  const [showImplementationGuide, setShowImplementationGuide] = useState<boolean>(true);
  const [topK, setTopK] = useState<number>(5);
  
  const { generateResponse, isLoading, error, clearError } = useGeneration();
  const { projects, isLoading: projectsLoading, error: projectsError, refetch } = useGetUserProjects();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load conversation history from session storage on component mount
  useEffect(() => {
    const savedHistory = sessionStorage.getItem('chatbot-conversation-history');
    if (savedHistory) {
      try {
        setConversationHistory(JSON.parse(savedHistory));
      } catch (err) {
        console.error('Failed to parse conversation history from session storage:', err);
      }
    }
  }, []);

  // Save conversation history to session storage whenever it changes
  useEffect(() => {
    if (conversationHistory.length > 0) {
      sessionStorage.setItem('chatbot-conversation-history', JSON.stringify(conversationHistory));
    }
  }, [conversationHistory]);

  // Scroll to bottom when new messages are added
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversationHistory]);

  // Fetch projects on mount
  useEffect(() => {
    // Projects are automatically fetched by the hook when user is available
    // We can manually refetch if needed
    if (projectsError) {
      console.error('Failed to fetch user projects:', projectsError);
    }
  }, [projectsError]);

  const handleSendMessage = async () => {
    if (!currentMessage.trim() || !selectedProjectId || !apiKey) {
      return;
    }

    clearError();

    const request = {
      prompt: currentMessage.trim(),
      projectId: selectedProjectId,
      topK: topK,
      conversationHistory: conversationHistory
    };

    const response = await generateResponse(request, apiKey);
    
    if (response) {
      setConversationHistory(response.conversationHistory);
      setCurrentMessage('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const clearConversation = () => {
    setConversationHistory([]);
    sessionStorage.removeItem('chatbot-conversation-history');
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Chatbot Testing</h1>
          <p className="text-gray-600">Test your RAG chatbot with real conversations and see how it responds to user queries.</p>
        </div>

        {/* Implementation Guide */}
        {showImplementationGuide && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-xl font-semibold text-blue-900">How to Implement This API in Your Project</h2>
              <button
                onClick={() => setShowImplementationGuide(false)}
                className="text-blue-600 hover:text-blue-800"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="space-y-4 text-sm">
              <div>
                <h3 className="font-semibold text-blue-800 mb-2">Endpoint:</h3>
                <code className="bg-blue-100 px-2 py-1 rounded text-blue-900">POST /generation/generate</code>
              </div>

              <div>
                <h3 className="font-semibold text-blue-800 mb-2">Authentication:</h3>
                <p className="text-blue-700">Include your API key in the request header: <code className="bg-blue-100 px-1 rounded">X-API-Key: your-api-key</code></p>
              </div>

               <div>
                 <h3 className="font-semibold text-blue-800 mb-2">Request Body:</h3>
                 <pre className="bg-blue-100 p-3 rounded text-blue-900 overflow-x-auto">
{`{
  "prompt": "User's question",
  "projectId": "your-project-id",
  "topK": 5,
  "conversationHistory": [
    {
      "role": "user",
      "content": "Previous user message"
    },
    {
      "role": "assistant", 
      "content": "Previous bot response"
    }
  ]
}`}
                 </pre>
                 <p className="text-xs text-blue-600 mt-2">
                   <strong>topK:</strong> Number of document chunks to retrieve (1-20). Higher values provide more context but may include less relevant information.
                 </p>
               </div>

              <div>
                <h3 className="font-semibold text-blue-800 mb-2">Response:</h3>
                <pre className="bg-blue-100 p-3 rounded text-blue-900 overflow-x-auto">
{`{
  "answer": "Generated response",
  "query": "Processed query",
  "conversationHistory": [/* Updated history */]
}`}
                </pre>
              </div>

              <div>
                <h3 className="font-semibold text-blue-800 mb-2">Key Features:</h3>
                <ul className="list-disc list-inside text-blue-700 space-y-1">
                  <li>Maintains conversation context across multiple turns</li>
                  <li>Retrieves relevant information from your knowledge base</li>
                  <li>Publishes telemetry events for monitoring and analytics</li>
                  <li>Handles errors gracefully with detailed error messages</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Configuration Panel */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Configuration</h2>
              
              <div className="space-y-4">
                 <div>
                   <label htmlFor="project" className="block text-sm font-medium text-gray-700 mb-2">
                     Select Project
                   </label>
                   {projectsLoading ? (
                     <div className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 flex items-center">
                       <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500 mr-2"></div>
                       <span className="text-gray-500 text-sm">Loading your projects...</span>
                     </div>
                   ) : projectsError ? (
                     <div className="space-y-2">
                       <div className="w-full px-3 py-2 border border-red-300 rounded-md bg-red-50 text-red-700 text-sm">
                         Error loading projects: {projectsError}
                       </div>
                       <button
                         onClick={() => refetch()}
                         className="text-sm text-blue-600 hover:text-blue-800 underline"
                       >
                         Try again
                       </button>
                     </div>
                   ) : (
                     <select
                       id="project"
                       value={selectedProjectId}
                       onChange={(e) => setSelectedProjectId(e.target.value)}
                       className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                     >
                       <option value="">
                         {projects && projects.length > 0 ? "Choose a project..." : "No projects available"}
                       </option>
                       {projects?.map((project: Project) => (
                         <option key={project.id} value={project.project_id.toString()}>
                           {project.name}
                         </option>
                       ))}
                     </select>
                   )}
                   {projects && projects.length === 0 && !projectsLoading && !projectsError && (
                     <p className="text-sm text-gray-500 mt-1">
                       You don't have any projects yet. Create a project first to test your chatbot.
                     </p>
                   )}
                 </div>

                 <div>
                   <label htmlFor="apiKey" className="block text-sm font-medium text-gray-700 mb-2">
                     API Key
                   </label>
                   <input
                     type="password"
                     id="apiKey"
                     value={apiKey}
                     onChange={(e) => setApiKey(e.target.value)}
                     placeholder="Enter your API key"
                     className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                   />
                 </div>

                 <div>
                   <label htmlFor="topK" className="block text-sm font-medium text-gray-700 mb-2">
                     Number of Results (topK)
                   </label>
                   <input
                     type="number"
                     id="topK"
                     min="1"
                     max="20"
                     value={topK}
                     onChange={(e) => setTopK(Math.max(1, Math.min(20, parseInt(e.target.value) || 5)))}
                     className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                   />
                   <p className="text-xs text-gray-500 mt-1">
                     Number of relevant document chunks to retrieve (1-20). Higher values provide more context but may include less relevant information.
                   </p>
                 </div>

                <div className="pt-4 border-t border-gray-200">
                  <button
                    onClick={clearConversation}
                    className="w-full px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors"
                  >
                    Clear Conversation
                  </button>
                </div>

                 <div className="text-sm text-gray-600">
                   <p><strong>Messages:</strong> {conversationHistory.length}</p>
                   <p><strong>Results to retrieve:</strong> {topK}</p>
                   <p><strong>Session Storage:</strong> Active</p>
                 </div>
              </div>
            </div>
          </div>

          {/* Chat Interface */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-md flex flex-col h-[600px]">
              {/* Chat Header */}
              <div className="border-b border-gray-200 p-4">
                <h2 className="text-xl font-semibold text-gray-900">Chat Interface</h2>
                {selectedProjectId && (
                  <p className="text-sm text-gray-600">
                    Testing project: {projects?.find((p: Project) => p.project_id.toString() === selectedProjectId)?.name}
                  </p>
                )}
              </div>

              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {conversationHistory.length === 0 ? (
                  <div className="text-center text-gray-500 mt-8">
                    <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    <p>Start a conversation to test your chatbot!</p>
                    <p className="text-sm mt-2">Your conversation will be saved in session storage.</p>
                  </div>
                ) : (
                  conversationHistory.map((message, index) => (
                    <div
                      key={index}
                      className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                          message.role === 'user'
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-200 text-gray-900'
                        }`}
                      >
                        <div className="text-xs opacity-75 mb-1">
                          {message.role === 'user' ? 'You' : 'Assistant'}
                        </div>
                        <div className="whitespace-pre-wrap">{message.content}</div>
                      </div>
                    </div>
                  ))
                )}
                
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="max-w-xs lg:max-w-md px-4 py-2 rounded-lg bg-gray-200 text-gray-900">
                      <div className="text-xs opacity-75 mb-1">Assistant</div>
                      <div className="flex items-center space-x-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
                        <span>Thinking...</span>
                      </div>
                    </div>
                  </div>
                )}
                
                <div ref={messagesEndRef} />
              </div>

              {/* Error Display */}
              {error && (
                <div className="border-t border-red-200 bg-red-50 p-4">
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-red-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-sm text-red-700">{error}</p>
                    <button
                      onClick={clearError}
                      className="ml-auto text-red-600 hover:text-red-800"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              )}

              {/* Input Area */}
              <div className="border-t border-gray-200 p-4">
                <div className="flex space-x-3">
                  <textarea
                    value={currentMessage}
                    onChange={(e) => setCurrentMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder={
                      !selectedProjectId || !apiKey
                        ? "Please select a project and enter your API key first..."
                        : "Type your message... (Press Enter to send, Shift+Enter for new line)"
                    }
                    disabled={!selectedProjectId || !apiKey || isLoading}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none disabled:bg-gray-100 disabled:cursor-not-allowed"
                    rows={2}
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={!currentMessage.trim() || !selectedProjectId || !apiKey || isLoading}
                    className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                  >
                    {isLoading ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatbotTestingPage;
