import React, { useState } from 'react';
import './App.css';

function App() {
  const [repoUrl, setRepoUrl] = useState('');
  
  const [files, setFiles] = useState([]);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [summaries, setSummaries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [summaryForCode, setSummaryForCode] = useState(null);
  const [generatedCode, setGeneratedCode] = useState('');
  const [coding, setCoding] = useState(false);
  const [prUrl, setPrUrl] = useState('');
  const [creatingPr, setCreatingPr] = useState(false);
  const [error, setError] = useState(null);

  const handleFetchFiles = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('http://localhost:5001/api/github/repo-files', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ repoUrl }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch repository files.');
      }

      const data = await response.json();
      setFiles(data);
      setSelectedFiles([]); // Reset selection when new files are fetched
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (file) => {
    setSelectedFiles(prevSelected => {
      if (prevSelected.some(selected => selected.sha === file.sha)) {
        return prevSelected.filter(selected => selected.sha !== file.sha);
      } else {
        return [...prevSelected, file];
      }
    });
  };

  const handleGenerateSummaries = async () => {
    setGenerating(true);
    setError(null);

    try {
      const response = await fetch('http://localhost:5001/api/ai/generate-summaries', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ filePaths: selectedFiles.map(f => f.path), repoUrl }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate test case summaries.');
      }

      const data = await response.json();
      setSummaries(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleGenerateCode = async (summary) => {
    setSummaryForCode(summary);
    setCoding(true);
    setError(null);

    try {
      const response = await fetch('http://localhost:5001/api/ai/generate-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ summary: summary.summary, repoUrl, filePath: summary.file }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate test case code.');
      }

      const data = await response.json();
      setGeneratedCode(data.code);
    } catch (err) {
      setError(err.message);
    } finally {
      setCoding(false);
    }
  };

  const handleCreatePr = async () => {
    setCreatingPr(true);
    setPrUrl('');
    setError(null);

    try {
      const response = await fetch('http://localhost:5001/api/github/create-pr', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          repoUrl, 
          code: generatedCode, 
          filePath: `tests/${summaryForCode.file}.test.js`,
          branchName: `test-case/${summaryForCode.file}-${Date.now()}`,
          commitMessage: `feat: add test case for ${summaryForCode.file}`,
          prTitle: `Test Case for ${summaryForCode.file}`,
          prBody: `This PR adds an AI-generated test case for the ${summaryForCode.file} file.`
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to create pull request.');
      }

      const data = await response.json();
      setPrUrl(data.prUrl);
    } catch (err) {
      setError(err.message);
    } finally {
      setCreatingPr(false);
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>Test Case Generator</h1>
      </header>
      <main>
        <div className="repo-form">
          <input
            type="text"
            placeholder="Enter GitHub Repository URL"
            value={repoUrl}
            onChange={(e) => setRepoUrl(e.target.value)}
          />
          <button onClick={handleFetchFiles} disabled={loading}>
            {loading ? 'Loading...' : 'Fetch Files'}
          </button>
        </div>
        {error && <p className="error">{error}</p>}
        <div className="file-list">
          <h2>Repository Files</h2>
          <button onClick={handleGenerateSummaries} disabled={generating || selectedFiles.length === 0}>
            {generating ? 'Generating...' : 'Generate Test Case Summaries'}
          </button>
          <ul>
            {files.map((file) => (
              <li key={file.path}>
                <input
                  type="checkbox"
                  checked={selectedFiles.some(selected => selected.path === file.path)}
                  onChange={() => handleFileSelect(file)}
                />
                {file.path}
              </li>
            ))}
          </ul>
        </div>
        {summaries.length > 0 && (
          <div className="summary-list">
            <h2>Test Case Summaries</h2>
            <ul>
              {summaries.map((summary) => (
                <li key={summary.id}>
                  <strong>{summary.file}</strong>: {summary.summary}
                  <button onClick={() => handleGenerateCode(summary)} disabled={coding}>
                    {coding && summaryForCode?.id === summary.id ? 'Generating...' : 'Generate Code'}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
        {generatedCode && (
          <div className="code-display">
            <h2>Generated Test Case</h2>
            <pre>
              <code>{generatedCode}</code>
            </pre>
            <div className="pr-form">
              <button onClick={handleCreatePr} disabled={creatingPr}>
                {creatingPr ? 'Creating PR...' : 'Create Pull Request'}
              </button>
            </div>
          </div>
        )}
        {prUrl && (
          <div className="pr-link">
            <h2>Pull Request Created!</h2>
            <a href={prUrl} target="_blank" rel="noopener noreferrer">{prUrl}</a>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;

