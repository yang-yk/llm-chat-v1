'use client';

import { useState, useEffect } from 'react';
import type { ConfigResponse, PresetModel } from '@/lib/types';

interface SettingsModalProps {
  isOpen: boolean;
  config: ConfigResponse | null;
  onClose: () => void;
  onSave: (settings: {
    modelType: string;
    customApiUrl?: string;
    customModel?: string;
    customApiKey?: string;
    maxTokens?: number;
  }) => void;
}

export default function SettingsModal({ isOpen, config, onClose, onSave }: SettingsModalProps) {
  const [modelType, setModelType] = useState('codegeex');
  const [customApiUrl, setCustomApiUrl] = useState('');
  const [customModel, setCustomModel] = useState('');
  const [customApiKey, setCustomApiKey] = useState('');
  const [maxTokens, setMaxTokens] = useState(2000);

  useEffect(() => {
    if (config) {
      setModelType(config.current_model_type);
      setMaxTokens(config.max_tokens);
      if (config.current_model_type === 'custom') {
        setCustomApiUrl(config.llm_api_url);
        setCustomModel(config.llm_model);
        setCustomApiKey(config.llm_api_key);
      }
    }
  }, [config]);

  const handleSave = () => {
    const settings: any = {
      modelType,
      maxTokens,
    };

    if (modelType === 'custom') {
      settings.customApiUrl = customApiUrl;
      settings.customModel = customModel;
      settings.customApiKey = customApiKey;
    }

    onSave(settings);
  };

  if (!isOpen || !config) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl sm:rounded-2xl shadow-2xl max-w-2xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 sm:py-5 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <h2 className="text-lg sm:text-2xl font-bold text-gray-800 flex items-center gap-1.5 sm:gap-2">
            <span className="text-2xl sm:text-3xl">⚙️</span>
            <span>模型设置</span>
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 hover:bg-white/50 rounded-lg p-1.5 sm:p-2 transition-all"
            title="关闭"
          >
            <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-4 sm:p-6">
          <div className="space-y-4 sm:space-y-6">
            {/* 模型选择 */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                选择模型
              </label>
              <div className="space-y-2 sm:space-y-3">
                {config.preset_models.map((model: PresetModel) => (
                  <label
                    key={model.type}
                    className={`flex items-start p-3 sm:p-4 border-2 rounded-lg sm:rounded-xl cursor-pointer transition-all ${
                      modelType === model.type
                        ? 'border-blue-500 bg-blue-50 shadow-sm'
                        : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="modelType"
                      value={model.type}
                      checked={modelType === model.type}
                      onChange={(e) => setModelType(e.target.value)}
                      className="mt-1 mr-2 sm:mr-3 w-4 h-4 text-blue-600 flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm sm:text-base text-gray-800">{model.name}</div>
                      <div className="text-xs text-gray-600 mt-1 sm:mt-1.5 break-all">{model.url}</div>
                      <div className="text-xs text-gray-500 mt-0.5 truncate">模型: {model.model}</div>
                    </div>
                  </label>
                ))}

                <label
                  className={`flex items-start p-3 sm:p-4 border-2 rounded-lg sm:rounded-xl cursor-pointer transition-all ${
                    modelType === 'custom'
                      ? 'border-blue-500 bg-blue-50 shadow-sm'
                      : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="modelType"
                    value="custom"
                    checked={modelType === 'custom'}
                    onChange={(e) => setModelType(e.target.value)}
                    className="mt-1 mr-2 sm:mr-3 w-4 h-4 text-blue-600 flex-shrink-0"
                  />
                  <div className="flex-1">
                    <div className="font-semibold text-sm sm:text-base text-gray-800">自定义模型</div>
                    <div className="text-xs text-gray-600 mt-1">使用自定义 API 配置</div>
                  </div>
                </label>
              </div>
            </div>

            {/* 自定义模型配置 */}
            {modelType === 'custom' && (
              <div className="space-y-3 sm:space-y-4 p-4 sm:p-5 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg sm:rounded-xl border border-blue-200">
                <div className="text-sm font-semibold text-gray-700 mb-2 sm:mb-3 flex items-center gap-2">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                  </svg>
                  <span className="text-sm sm:text-base">自定义模型配置</span>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    API 地址
                  </label>
                  <input
                    type="text"
                    value={customApiUrl}
                    onChange={(e) => setCustomApiUrl(e.target.value)}
                    placeholder="例如: http://example.com/v1/chat/completions"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                  />
                  <p className="text-xs text-gray-500 mt-1.5">自定义模型 API 的访问地址</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    模型名称
                  </label>
                  <input
                    type="text"
                    value={customModel}
                    onChange={(e) => setCustomModel(e.target.value)}
                    placeholder="例如: gpt-4"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                  />
                  <p className="text-xs text-gray-500 mt-1.5">自定义模型的名称标识</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    API 密钥
                  </label>
                  <input
                    type="password"
                    value={customApiKey}
                    onChange={(e) => setCustomApiKey(e.target.value)}
                    placeholder="您的 API 密钥"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                  />
                  <p className="text-xs text-gray-500 mt-1.5">API 访问密钥（可选）</p>
                </div>
              </div>
            )}

            {/* 通用配置 */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                最大输出长度
              </label>
              <input
                type="number"
                value={maxTokens}
                onChange={(e) => setMaxTokens(parseInt(e.target.value))}
                min="1"
                max="100000"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1.5">
                模型单次回复的最大 token 数量（1-100000，默认 2000）
              </p>
            </div>
          </div>
        </div>

        <div className="flex gap-2 sm:gap-3 px-4 sm:px-6 py-3 sm:py-4 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="flex-1 px-4 sm:px-5 py-2.5 border-2 border-gray-300 text-gray-700 rounded-lg sm:rounded-xl hover:bg-white hover:border-gray-400 transition-all font-medium text-sm sm:text-base"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            className="flex-1 px-4 sm:px-5 py-2.5 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-lg sm:rounded-xl hover:from-blue-500 hover:to-blue-600 transition-all font-medium shadow-md hover:shadow-lg text-sm sm:text-base"
          >
            保存配置
          </button>
        </div>
      </div>
    </div>
  );
}
