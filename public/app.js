function SaaSIdeaGenerator() {
  const [idea, setIdea] = React.useState(null);
  const [marketInsights, setMarketInsights] = React.useState(null);
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
      setMarketInsights(data.marketInsights);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unknown error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const formatNumber = (num) => {
    return new Intl.NumberFormat().format(num);
  };

  return (
    <div style={{
      maxWidth: '800px',
      margin: '0 auto',
      padding: '20px',
      fontFamily: 'Arial, sans-serif',
      backgroundColor: '#f4f4f4',
      minHeight: '100vh'
    }}>
      <h1 style={{ textAlign: 'center' }}>🚀 B2B SaaS Idea Generator</h1>
      <p style={{ textAlign: 'center', color: '#666' }}>
        Generating ideas based on real market data from Reddit, ProductHunt, and industry trends
      </p>
      
      <div style={{ textAlign: 'center', marginBottom: '30px' }}>
        <button 
          onClick={generateIdea}
          disabled={isLoading}
          style={{
            padding: '12px 24px',
            fontSize: '16px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            transition: 'background-color 0.3s'
          }}
        >
          {isLoading ? 'Analyzing Market & Generating Idea...' : 'Generate B2B SaaS Idea'}
        </button>
      </div>
      
      {error && (
        <div style={{ 
          color: 'white',
          backgroundColor: '#dc3545',
          padding: '15px',
          borderRadius: '5px',
          marginBottom: '20px'
        }}>
          Error: {error}
        </div>
      )}
      
      {marketInsights && (
        <div style={{
          backgroundColor: 'white',
          padding: '20px',
          borderRadius: '10px',
          marginBottom: '20px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <h3>Market Research Insights</h3>
          <div style={{ display: 'flex', justifyContent: 'space-around', marginBottom: '20px' }}>
            <div>
              <strong>Reddit Posts Analyzed:</strong> {formatNumber(marketInsights.sourceCount.reddit)}
            </div>
            <div>
              <strong>RSS Articles:</strong> {formatNumber(marketInsights.sourceCount.rss)}
            </div>
            <div>
              <strong>ProductHunt Products:</strong> {formatNumber(marketInsights.sourceCount.producthunt)}
            </div>
          </div>
          
          {marketInsights.topPosts && marketInsights.topPosts.length > 0 && (
            <div>
              <h4>Top Trending Discussions</h4>
              <ul style={{ listStyle: 'none', padding: 0 }}>
                {marketInsights.topPosts.map((post, index) => (
                  <li key={index} style={{ marginBottom: '10px' }}>
                    <a 
                      href={post.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ 
                        color: '#007bff',
                        textDecoration: 'none'
                      }}
                    >
                      {post.title}
                    </a>
                    <span style={{ color: '#666', fontSize: '0.9em' }}>
                      {' '}(Score: {formatNumber(post.score)})
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
      
      {idea && (
        <div style={{
          backgroundColor: 'white',
          padding: '25px',
          borderRadius: '10px',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
        }}>
          <h2>Your B2B SaaS Idea 💡</h2>
          <div style={{ lineHeight: '1.6' }}>
            <h3 style={{ color: '#007bff', marginBottom: '15px' }}>{idea.idea}</h3>
            <p style={{ fontSize: '1.1em', marginBottom: '20px' }}>{idea.description}</p>
            
            <h4 style={{ color: '#444', marginBottom: '10px' }}>Target Market</h4>
            <p style={{ marginBottom: '20px' }}>{idea.targetMarket}</p>
            
            <h4 style={{ color: '#444', marginBottom: '10px' }}>Key Features</h4>
            <ul style={{ marginBottom: '20px', paddingLeft: '20px' }}>
              {idea.keyFeatures.map((feature, index) => (
                <li key={index} style={{ marginBottom: '5px' }}>{feature}</li>
              ))}
            </ul>
            
            <h4 style={{ color: '#444', marginBottom: '10px' }}>Suggested Tech Stack</h4>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
              {idea.techStack.map((tech, index) => (
                <span key={index} style={{
                  backgroundColor: '#f0f0f0',
                  padding: '5px 10px',
                  borderRadius: '15px',
                  fontSize: '0.9em'
                }}>
                  {tech}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<SaaSIdeaGenerator />);
