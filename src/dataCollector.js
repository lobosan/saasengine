import fetch from 'node-fetch';
import * as cheerio from 'cheerio';
import Parser from 'rss-parser';
import fs from 'fs/promises';
import path from 'path';

const parser = new Parser();
const CACHE_FILE = 'market_data_cache.json';
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour in milliseconds

async function logError(error, context = '') {
  const timestamp = new Date().toISOString();
  const logEntry = `${timestamp} - DataCollector - ${context}\nError: ${error.stack || error}\n\n`;
  
  try {
    await fs.appendFile('collector.log', logEntry);
  } catch (err) {
    console.error('Failed to write to collector log file:', err);
  }
  console.error(`DataCollector - ${context}:`, error);
}

export class DataCollector {
  constructor() {
    this.sources = {
      reddit: [
        'startups',
        'SaaS',
        'EntrepreneurRideAlong',
        'smallbusiness',
        'business',
        'Entrepreneur'
      ],
      blogs: [
        'https://news.ycombinator.com/rss',
        'https://techcrunch.com/feed',
        'https://feeds.feedburner.com/venturebeat/SZYF'
      ],
      websites: [
        'https://trends.google.com/trends/trendingsearches/daily/rss',
        'https://www.producthunt.com/feed'
      ]
    };
  }

  async getRedditData(subreddit, timeRange = 'month') {
    try {
      const response = await fetch(
        `https://www.reddit.com/r/${subreddit}/top.json?t=${timeRange}&limit=15`,
        {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
          }
        }
      );
      
      if (!response.ok) {
        throw new Error(`Reddit API error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      return data.data.children.map(post => ({
        title: post.data.title,
        content: post.data.selftext.slice(0, 500),
        url: `https://reddit.com${post.data.permalink}`,
        score: post.data.score,
        comments: post.data.num_comments,
        source: 'reddit',
        subreddit: post.data.subreddit
      }));
    } catch (error) {
      await logError(error, `Error fetching from r/${subreddit}`);
      return [];
    }
  }

  async getRSSFeed(url) {
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`RSS feed error: ${response.status} ${response.statusText}`);
      }
      
      const feed = await parser.parseURL(url);
      return feed.items.slice(0, 10).map(item => ({
        title: item.title,
        content: (item.contentSnippet || item.content || '').slice(0, 300),
        url: item.link,
        date: item.pubDate,
        source: 'rss',
        feedUrl: url
      }));
    } catch (error) {
      await logError(error, `Error fetching RSS feed ${url}`);
      return [];
    }
  }

  async getProductHuntData() {
    try {
      const feed = await parser.parseURL('https://www.producthunt.com/feed');
      return feed.items.slice(0, 10).map(item => ({
        title: item.title,
        description: item.contentSnippet || '',
        url: item.link,
        date: item.pubDate,
        source: 'producthunt'
      }));
    } catch (error) {
      await logError(error, 'Error fetching ProductHunt data');
      return [];
    }
  }

  async loadCachedData() {
    try {
      const cacheExists = await fs.access(CACHE_FILE)
        .then(() => true)
        .catch(() => false);
      
      if (!cacheExists) {
        return null;
      }

      const cacheContent = await fs.readFile(CACHE_FILE, 'utf-8');
      const cache = JSON.parse(cacheContent);
      
      if (Date.now() - cache.timestamp < CACHE_DURATION) {
        console.log('Using cached market data...');
        return cache.data;
      }
      
      return null;
    } catch (error) {
      await logError(error, 'Error loading cache');
      return null;
    }
  }

  async saveCacheData(data) {
    try {
      const cache = {
        timestamp: Date.now(),
        data
      };
      await fs.writeFile(CACHE_FILE, JSON.stringify(cache, null, 2));
      console.log('Market data cached successfully');
    } catch (error) {
      await logError(error, 'Error saving cache');
    }
  }

  async collectAllData() {
    try {
      const cachedData = await this.loadCachedData();
      if (cachedData) {
        return cachedData;
      }

      console.log('Collecting fresh market data...');
      const data = {
        reddit: [],
        rss: [],
        producthunt: []
      };

      // Collect Reddit data with some delay between requests
      const redditResults = [];
      for (const subreddit of this.sources.reddit) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        const posts = await this.getRedditData(subreddit);
        redditResults.push(posts);
      }
      data.reddit = redditResults.flat();

      // Collect RSS feeds sequentially with delay
      const rssResults = [];
      for (const feedUrl of [...this.sources.blogs, ...this.sources.websites]) {
        const feed = await this.getRSSFeed(feedUrl);
        rssResults.push(feed);
      }
      data.rss = rssResults.flat();

      // Collect ProductHunt data
      data.producthunt = await this.getProductHuntData();

      if (!data.reddit.length && !data.rss.length && !data.producthunt.length) {
        throw new Error('No data collected from any source');
      }

      await this.saveCacheData(data);
      return data;
    } catch (error) {
      await logError(error, 'Error collecting data');
      throw error; // Re-throw to be handled by the server
    }
  }

  extractKeyInsights(data) {
    const insights = {
      trends: [],
      insights: [],
      sourceCount: {
        reddit: data.reddit.length,
        rss: data.rss.length,
        producthunt: data.producthunt.length
      },
      topPosts: []
    };

    // Get top Reddit posts
    insights.topPosts.push(...data.reddit
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map(post => ({
        title: post.title,
        score: post.score,
        url: post.url,
        source: `Reddit r/${post.subreddit}`
      })));

    // Get top RSS items
    insights.topPosts.push(...data.rss
      .slice(0, 3)
      .map(item => ({
        title: item.title,
        url: item.url,
        source: 'RSS'
      })));

    // Get top ProductHunt items
    insights.topPosts.push(...data.producthunt
      .slice(0, 3)
      .map(item => ({
        title: item.title,
        url: item.url,
        source: 'ProductHunt'
      })));

    // Extract common keywords and phrases
    const allContent = [
      ...data.reddit.map(p => p.title + ' ' + p.content),
      ...data.rss.map(p => p.title + ' ' + p.content),
      ...data.producthunt.map(p => p.title + ' ' + p.description)
    ].join(' ');

    // Extract trending topics (simple keyword frequency)
    const words = allContent.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 3);

    const wordFreq = {};
    words.forEach(word => {
      wordFreq[word] = (wordFreq[word] || 0) + 1;
    });

    insights.trends = Object.entries(wordFreq)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([word]) => word);

    return insights;
  }
}
