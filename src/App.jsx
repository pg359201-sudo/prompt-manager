import React, { useState, useEffect } from 'react';
import { Search, Plus, Edit2, Trash2, Copy, Save, X, RefreshCw } from 'lucide-react';

const PromptManager = () => {
  const [prompts, setPrompts] = useState([]);
  const [filteredPrompts, setFilteredPrompts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [config, setConfig] = useState({
    sheetId: '',
    apiKey: ''
  });
  const [showConfig, setShowConfig] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    category: '',
    prompt: '',
    tags: ''
  });

  useEffect(() => {
    const savedSheetId = localStorage.getItem('sheetId');
    const savedApiKey = localStorage.getItem('apiKey');
    if (savedSheetId && savedApiKey) {
      setConfig({ sheetId: savedSheetId, apiKey: savedApiKey });
    }
  }, []);

  const loadPrompts = async () => {
    if (!config.sheetId || !config.apiKey) {
      setError('Por favor configura el Sheet ID y API Key');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${config.sheetId}/values/Prompts!A2:E?key=${config.apiKey}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error('Error al cargar los prompts. Verifica tu configuración.');
      }

      const data = await response.json();
      const rows = data.values || [];
      
      const loadedPrompts = rows.map((row, index) => ({
        id: index + 1,
        title: row[0] || '',
        category: row[1] || '',
        prompt: row[2] || '',
        tags: row[3] || '',
        createdAt: row[4] || new Date().toISOString()
      }));

      setPrompts(loadedPrompts);
      setFilteredPrompts(loadedPrompts);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const saveToSheet = async (updatedPrompts) => {
    if (!config.sheetId || !config.apiKey) {
      setError('Por favor configura el Sheet ID y API Key');
      return;
    }

    try {
      const values = updatedPrompts.map(p => [
        p.title,
        p.category,
        p.prompt,
        p.tags,
        p.createdAt
      ]);

      const url = `https://sheets.googleapis.com/v4/spreadsheets/${config.sheetId}/values/Prompts!A2:E?valueInputOption=RAW&key=${config.apiKey}`;
      
      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          values: values
        })
      });

      if (!response.ok) {
        throw new Error('Error al guardar en Google Sheets');
      }

      await loadPrompts();
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    if (config.sheetId && config.apiKey) {
      loadPrompts();
    }
  }, [config.sheetId, config.apiKey]);

  useEffect(() => {
    const filtered = prompts.filter(prompt =>
      prompt.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      prompt.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      prompt.tags.toLowerCase().includes(searchTerm.toLowerCase()) ||
      prompt.prompt.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredPrompts(filtered);
  }, [searchTerm, prompts]);

  const handleSaveConfig = () => {
    localStorage.setItem('sheetId', config.sheetId);
    localStorage.setItem('apiKey', config.apiKey);
    setShowConfig(false);
    loadPrompts();
  };

  const openModal = (prompt = null) => {
    if (prompt) {
      setEditingPrompt(prompt);
      setFormData({
        title: prompt.title,
        category: prompt.category,
        prompt: prompt.prompt,
        tags: prompt.tags
      });
    } else {
      setEditingPrompt(null);
      setFormData({ title: '', category: '', prompt: '', tags: '' });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingPrompt(null);
    setFormData({ title: '', category: '', prompt: '', tags: '' });
  };

  const handleSubmit = async () => {
    if (!formData.title || !formData.category || !formData.prompt) {
      setError('Por favor completa todos los campos requeridos');
      return;
    }
    
    let updatedPrompts;
    if (editingPrompt) {
      updatedPrompts = prompts.map(p =>
        p.id === editingPrompt.id
          ? { ...p, ...formData }
          : p
      );
    } else {
      const newPrompt = {
        id: prompts.length + 1,
        ...formData,
        createdAt: new Date().toISOString()
      };
      updatedPrompts = [...prompts, newPrompt];
    }

    await saveToSheet(updatedPrompts);
    closeModal();
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Estás seguro de eliminar este prompt?')) {
      const updatedPrompts = prompts.filter(p => p.id !== id);
      await saveToSheet(updatedPrompts);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert('Prompt copiado al portapapeles!');
  };

  const categories = [...new Set(prompts.map(p => p.category))];

  if (showConfig) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-xl p-6">
          <h2 className="text-2xl font-bold mb-6 text-gray-800">Configuración de Google Sheets</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Google Sheets ID
              </label>
              <input
                type="text"
                value={config.sheetId}
                onChange={(e) => setConfig({...config, sheetId: e.target.value})}
                placeholder="ID de tu Google Sheet"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">
                Lo encuentras en la URL: docs.google.com/spreadsheets/d/[SHEET_ID]/edit
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Google API Key
              </label>
              <input
                type="password"
                value={config.apiKey}
                onChange={(e) => setConfig({...config, apiKey: e.target.value})}
                placeholder="Tu API Key de Google"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">
                Créala en Google Cloud Console con acceso a Google Sheets API
              </p>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-800 font-medium mb-2">Instrucciones:</p>
              <ol className="text-xs text-yellow-700 space-y-1 list-decimal list-inside">
                <li>Crea un Google Sheet con una hoja llamada "Prompts"</li>
                <li>En la fila 1 pon: Title | Category | Prompt | Tags | Created At</li>
                <li>Haz el sheet público o comparte con la API key</li>
                <li>Habilita Google Sheets API en Google Cloud Console</li>
                <li>Crea una API Key y pégala aquí</li>
              </ol>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleSaveConfig}
                className="flex-1 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Guardar y Conectar
              </button>
              <button
                onClick={() => setShowConfig(false)}
                className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-bold text-gray-800">Administrador de Prompts</h1>
            <div className="flex gap-2">
              <button
                onClick={loadPrompts}
                disabled={isLoading}
                className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                Recargar
              </button>
              <button
                onClick={() => setShowConfig(true)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Configuración
              </button>
              <button
                onClick={() => openModal()}
                className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-5 h-5" />
                Nuevo Prompt
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
              {error}
            </div>
          )}

          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Buscar prompts por título, categoría, tags o contenido..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="text-sm text-gray-600 mb-1">Total Prompts</div>
            <div className="text-3xl font-bold text-blue-600">{prompts.length}</div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="text-sm text-gray-600 mb-1">Categorías</div>
            <div className="text-3xl font-bold text-green-600">{categories.length}</div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="text-sm text-gray-600 mb-1">Resultados</div>
            <div className="text-3xl font-bold text-purple-600">{filteredPrompts.length}</div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPrompts.map((prompt) => (
            <div key={prompt.id} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-xl font-semibold text-gray-800 mb-2">{prompt.title}</h3>
                  <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                    {prompt.category}
                  </span>
                </div>
              </div>

              <p className="text-gray-600 text-sm mb-4 line-clamp-3">{prompt.prompt}</p>

              {prompt.tags && (
                <div className="flex flex-wrap gap-1 mb-4">
                  {prompt.tags.split(',').map((tag, idx) => (
                    <span key={idx} className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded">
                      {tag.trim()}
                    </span>
                  ))}
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => copyToClipboard(prompt.prompt)}
                  className="flex-1 flex items-center justify-center gap-2 bg-green-50 text-green-700 px-3 py-2 rounded-lg hover:bg-green-100 transition-colors text-sm"
                >
                  <Copy className="w-4 h-4" />
                  Copiar
                </button>
                <button
                  onClick={() => openModal(prompt)}
                  className="flex items-center justify-center bg-blue-50 text-blue-700 px-3 py-2 rounded-lg hover:bg-blue-100 transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(prompt.id)}
                  className="flex items-center justify-center bg-red-50 text-red-700 px-3 py-2 rounded-lg hover:bg-red-100 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {filteredPrompts.length === 0 && !isLoading && (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <p className="text-gray-500 text-lg">No se encontraron prompts</p>
          </div>
        )}

        {isModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-800">
                    {editingPrompt ? 'Editar Prompt' : 'Nuevo Prompt'}
                  </h2>
                  <button
                    onClick={closeModal}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Título *
                    </label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData({...formData, title: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Categoría *
                    </label>
                    <input
                      type="text"
                      value={formData.category}
                      onChange={(e) => setFormData({...formData, category: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Prompt *
                    </label>
                    <textarea
                      rows={6}
                      value={formData.prompt}
                      onChange={(e) => setFormData({...formData, prompt: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tags (separados por comas)
                    </label>
                    <input
                      type="text"
                      value={formData.tags}
                      onChange={(e) => setFormData({...formData, tags: e.target.value})}
                      placeholder="ej: marketing, ventas, copywriting"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button
                      onClick={handleSubmit}
                      className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                    >
                      <Save className="w-5 h-5" />
                      {editingPrompt ? 'Actualizar' : 'Crear'} Prompt
                    </button>
                    <button
                      onClick={closeModal}
                      className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PromptManager;
