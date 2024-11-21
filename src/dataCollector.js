import fetch from 'node-fetch';
import * as cheerio from 'cheerio';
import Parser from 'rss-parser';

const parser = new Parser();

export class DataCollector {
  constructor() {
    this.sources = {
      reddit: [
        'startups',
        'SaaS',
        'EntrepreneurRideAlong'
      ],
      blogs: [
        'https://hnrss.org/newest?q=saas'  // HackerNews SaaS stories
      ],
      websites: [
        'https://trends.google.com/trends/trendingsearches/daily/rss'
      ]
    };
  }

  async getRedditData(subreddit, timeRange = 'month') {
    try {
      const response = await fetch(
        `https://www.reddit.com/r/${subreddit}/top.json?t=${timeRange}&limit=10`,
        {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
          }
        }
      );
      const data = await response.json();
      return data.data.children.map(post => ({
        title: post.data.title,
        content: post.data.selftext.slice(0, 500), // Limit content length
        url: `https://reddit.com${post.data.permalink}`,
        score: post.data.score,
        comments: post.data.num_comments
      }));
    } catch (error) {
      console.error(`Error fetching from r/${subreddit}:`, error);
      return [];
    }
  }

  async getRSSFeed(url) {
    try {
      const feed = await parser.parseURL(url);
      return feed.items.slice(0, 5).map(item => ({
        title: item.title,
        content: (item.contentSnippet || item.content || '').slice(0, 300), // Limit content length
        url: item.link,
        date: item.pubDate
      }));
    } catch (error) {
      console.error(`Error fetching RSS feed ${url}:`, error);
      return [];
    }
  }

  async collectAllData() {
    const data = {
      reddit: [],
      rss: []
    };

    // Collect Reddit data
    for (const subreddit of this.sources.reddit) {
      const posts = await this.getRedditData(subreddit);
      data.reddit.push(...posts);
    }

    // Collect RSS feeds
    for (const feedUrl of [...this.sources.blogs, ...this.sources.websites]) {
      const feed = await this.getRSSFeed(feedUrl);
      data.rss.push(...feed);
    }

    return data;
  }

  extractKeyInsights(data) {
    // Get top posts from each source
    const topPosts = {
      reddit: data.reddit
        .sort((a, b) => b.score - a.score)
        .slice(0, 5)
        .map(post => ({
          title: post.title,
          score: post.score,
          url: post.url
        })),
      rss: data.rss
        .slice(0, 3)
        .map(item => ({
          title: item.title,
          url: item.url
        }))
    };

    // Create a concise summary for the AI
    const summary = {
      trends: topPosts.reddit.map(post => post.title).join('. '),
      insights: topPosts.rss.map(item => item.title).join('. '),
      sourceCount: {
        reddit: data.reddit.length,
        rss: data.rss.length
      },
      topPosts: topPosts.reddit
    };

    return summary;
  }
}
