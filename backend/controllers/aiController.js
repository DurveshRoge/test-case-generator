import { GoogleGenerativeAI } from '@google/generative-ai';
import fetch from 'node-fetch';

export const generateSummaries = async (req, res) => {
  const { filePaths, repoUrl } = req.body;

  if (!filePaths || filePaths.length === 0) {
    return res.status(400).json({ error: 'No files selected.' });
  }

  try {
    // LAZY INITIALIZATION: Create the client inside the handler
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const summaries = await Promise.all(filePaths.map(async (filePath, index) => {
      // Fetch file content from our own API
      const contentResponse = await fetch(`http://localhost:${process.env.PORT || 5001}/api/github/file-content`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoUrl, filePath }),
      });

      if (!contentResponse.ok) {
        console.error(`Failed to fetch content for ${filePath}`);
        return {
          id: `summary-${index + 1}`,
          file: filePath,
          summary: 'Error: Could not fetch file content.',
        };
      }

      const { content } = await contentResponse.json();

      const prompt = `Analyze the following code from the file '${filePath}' and generate a single, concise, one-sentence summary of a potential test case. For example: 'Test that the component renders correctly with given props.'\n\n---\n\n${content}`;
      
      let summaryText;
      try {
        const result = await model.generateContent(prompt);
        summaryText = await result.response.text();
      } catch (apiError) {
        console.error(`Gemini API Error for ${filePath}:`, apiError);
        summaryText = 'Error: Failed to generate summary from AI service.';
      }

      return {
        id: `summary-${index + 1}`,
        file: filePath,
        summary: summaryText.trim(),
      };
    }));

    res.json(summaries);

  } catch (error) {
    console.error('Error generating summaries:', error);
    res.status(500).json({ error: 'Failed to generate test case summaries.' });
  }
};

export const generateCode = async (req, res) => {
  const { summary, repoUrl } = req.body;

  if (!summary) {
    return res.status(400).json({ error: 'No summary provided.' });
  }

  try {
    // LAZY INITIALIZATION: Create the client inside the handler
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    // Fetch file content again for context
    const contentResponse = await fetch(`http://localhost:${process.env.PORT || 5001}/api/github/file-content`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoUrl, filePath: summary.file }),
    });

    if (!contentResponse.ok) {
        throw new Error(`Failed to fetch content for ${summary.file}`);
    }

    const { content } = await contentResponse.json();

    const prompt = `Based on the following code from '${summary.file}' and the test case summary, generate the complete test case code. The test should be in a Jest/React Testing Library format. Do not include any explanations, just the raw code block.\n\nTest Summary: '${summary.summary}'\n\n---\nCode:\n${content}`;

    const result = await model.generateContent(prompt);
    const codeText = await result.response.text();

    // Clean up the response to get only the code
    const cleanedCode = codeText.replace(/```(javascript|jsx)?/g, '').replace(/```/g, '').trim();

    res.json({ code: cleanedCode });

  } catch (error) {
    console.error('Error generating code:', error);
    res.status(500).json({ error: 'Failed to generate test case code.' });
  }
};


