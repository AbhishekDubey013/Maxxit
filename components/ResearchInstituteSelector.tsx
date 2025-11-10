import { useState, useEffect } from 'react';
import { Check, Building2, ExternalLink, Twitter } from 'lucide-react';

interface ResearchInstitute {
  id: string;
  name: string;
  description: string | null;
  logo_url: string | null;
  website_url: string | null;
  x_handle: string | null;
  _count: {
    agent_research_institutes: number;
  };
}

interface ResearchInstituteSelectorProps {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}

export function ResearchInstituteSelector({
  selectedIds,
  onChange,
}: ResearchInstituteSelectorProps) {
  const [institutes, setInstitutes] = useState<ResearchInstitute[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchInstitutes();
  }, []);

  const fetchInstitutes = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/research-institutes');
      const data = await response.json();

      if (data.success) {
        setInstitutes(data.institutes);
      } else {
        setError('Failed to load research institutes');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load research institutes');
    } finally {
      setLoading(false);
    }
  };

  const toggleInstitute = (id: string) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter(i => i !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
        ⚠️ {error}
      </div>
    );
  }

  if (institutes.length === 0) {
    return (
      <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg text-gray-600">
        No research institutes available. Contact admin to add institutes.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="text-sm text-gray-600 mb-3">
        Select research institutes to follow. Your agent will automatically execute their trading signals with 5% position size.
      </div>

      <div className="grid grid-cols-1 gap-3">
        {institutes.map(institute => {
          const isSelected = selectedIds.includes(institute.id);

          return (
            <button
              key={institute.id}
              onClick={() => toggleInstitute(institute.id)}
              className={`
                relative p-4 rounded-lg border-2 transition-all text-left
                ${isSelected
                  ? 'border-blue-600 bg-blue-50'
                  : 'border-gray-200 bg-white hover:border-gray-300'
                }
              `}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3 flex-1">
                  {/* Logo or Icon */}
                  <div className={`
                    w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0
                    ${isSelected ? 'bg-blue-100' : 'bg-gray-100'}
                  `}>
                    {institute.logo_url ? (
                      <img
                        src={institute.logo_url}
                        alt={institute.name}
                        className="w-10 h-10 rounded-lg object-cover"
                      />
                    ) : (
                      <Building2 className={`w-6 h-6 ${isSelected ? 'text-blue-600' : 'text-gray-400'}`} />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <h3 className={`font-semibold ${isSelected ? 'text-blue-900' : 'text-gray-900'}`}>
                        {institute.name}
                      </h3>
                      {institute._count.agent_research_institutes > 0 && (
                        <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">
                          {institute._count.agent_research_institutes} agents
                        </span>
                      )}
                    </div>

                    {institute.description && (
                      <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                        {institute.description}
                      </p>
                    )}

                    {/* Links */}
                    <div className="flex items-center space-x-3 text-xs">
                      {institute.website_url && (
                        <a
                          href={institute.website_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="flex items-center space-x-1 text-blue-600 hover:text-blue-700"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>Website</span>
                        </a>
                      )}
                      {institute.x_handle && (
                        <a
                          href={`https://x.com/${institute.x_handle}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="flex items-center space-x-1 text-blue-600 hover:text-blue-700"
                        >
                          <Twitter className="w-3 h-3" />
                          <span>@{institute.x_handle}</span>
                        </a>
                      )}
                    </div>
                  </div>
                </div>

                {/* Checkmark */}
                <div className={`
                  w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ml-3
                  ${isSelected ? 'bg-blue-600' : 'bg-gray-200'}
                `}>
                  {isSelected && <Check className="w-4 h-4 text-white" />}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {selectedIds.length > 0 && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="text-sm text-blue-900">
            ✅ <strong>{selectedIds.length}</strong> institute{selectedIds.length !== 1 ? 's' : ''} selected
          </div>
          <div className="text-xs text-blue-700 mt-1">
            Your agent will automatically execute trading signals from these institutes with 5% position size per trade.
          </div>
        </div>
      )}
    </div>
  );
}

