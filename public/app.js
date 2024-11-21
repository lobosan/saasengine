function SaaSIdeaGenerator() {
  const [idea, setIdea] = React.useState(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState(null);

  const generateIdea = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/generate-idea', { method: 'POST' });
      
      if (!response.ok) {
        throw new Error('Failed to generate idea');
      }

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }

      setIdea(data.idea);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unknown error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{
      maxWidth: '600px',
      margin: '0 auto',
      padding: '20px',
      fontFamily: 'Arial, sans-serif',
      textAlign: 'center',
      backgroundColor: '#f4f4f4',
      minHeight: '100vh'
    }}>
      <h1>🚀 SaaS Idea Generator</h1>
      <button 
        onClick={generateIdea}
        disabled={isLoading}
        style={{
          padding: '10px 20px',
          fontSize: '16px',
          backgroundColor: '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '5px',
          cursor: isLoading ? 'not-allowed' : 'pointer'
        }}
      >
        {isLoading ? 'Generating...' : 'Generate SaaS Idea'}
      </button>
      
      {error && (
        <p style={{ color: 'red' }}>
          Error: {error}
        </p>
      )}
      
      {idea && (
        <div style={{
          marginTop: '20px',
          padding: '15px',
          backgroundColor: 'white',
          borderRadius: '10px',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
        }}>
          <h2>Your SaaS Idea 💡</h2>
          <p>{idea}</p>
        </div>
      )}
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<SaaSIdeaGenerator />);
