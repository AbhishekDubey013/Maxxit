"""
Twitter API Proxy using GAME API
Similar to: https://github.com/abxglia/tweets-fetcher/blob/main/twitter_api.py
"""

from flask import Flask, jsonify, request
from flask_cors import CORS
import requests
import os
import logging

app = Flask(__name__)
CORS(app)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# GAME API Configuration
GAME_API_KEY = os.getenv('GAME_API_KEY', '')
GAME_API_URL = 'https://api.virtuals.io/api'

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'service': 'twitter-proxy',
        'game_api_configured': bool(GAME_API_KEY)
    })

@app.route('/tweets/<username>', methods=['GET'])
def get_tweets(username):
    """
    Fetch tweets for a user using GAME API
    
    Example: GET /tweets/elonmusk?max_results=10&since_id=123
    """
    try:
        # Clean username
        clean_username = username.replace('@', '')
        
        # Get query parameters
        max_results = int(request.args.get('max_results', 10))
        since_id = request.args.get('since_id')
        
        logger.info(f"Fetching tweets for @{clean_username} (max: {max_results})")
        
        if not GAME_API_KEY:
            logger.error("GAME_API_KEY not configured")
            return jsonify({
                'error': 'GAME API key not configured',
                'tweets': []
            }), 500
        
        # Call GAME API
        url = f"{GAME_API_URL}/twitter/user/{clean_username}/tweets"
        
        headers = {
            'Authorization': f'Bearer {GAME_API_KEY}',
            'Content-Type': 'application/json'
        }
        
        params = {
            'max_results': max_results
        }
        
        if since_id:
            params['since_id'] = since_id
        
        logger.info(f"Calling GAME API: {url}")
        response = requests.get(url, headers=headers, params=params, timeout=30)
        
        logger.info(f"GAME API response status: {response.status_code}")
        
        if response.status_code == 204:
            # No content - API returned empty
            logger.warning("GAME API returned 204 No Content")
            return jsonify({
                'data': [],
                'count': 0,
                'username': clean_username
            })
        
        if response.status_code != 200:
            logger.error(f"GAME API error: {response.status_code} - {response.text}")
            return jsonify({
                'error': f'GAME API returned {response.status_code}',
                'details': response.text,
                'tweets': []
            }), response.status_code
        
        # Parse response
        data = response.json()
        
        # Handle different response formats
        if isinstance(data, dict) and 'data' in data:
            tweets = data['data']
        elif isinstance(data, list):
            tweets = data
        else:
            tweets = []
        
        logger.info(f"Successfully fetched {len(tweets)} tweets")
        
        # Normalize tweet format
        normalized_tweets = []
        for tweet in tweets:
            normalized_tweets.append({
                'id': str(tweet.get('id') or tweet.get('tweet_id', '')),
                'text': tweet.get('text') or tweet.get('content', ''),
                'created_at': tweet.get('created_at') or tweet.get('timestamp', ''),
                'author_id': tweet.get('author_id'),
                'author_username': clean_username
            })
        
        return jsonify({
            'data': normalized_tweets,
            'count': len(normalized_tweets),
            'username': clean_username
        })
        
    except requests.exceptions.Timeout:
        logger.error("Request to GAME API timed out")
        return jsonify({
            'error': 'Request timeout',
            'tweets': []
        }), 504
        
    except Exception as e:
        logger.error(f"Error fetching tweets: {str(e)}", exc_info=True)
        return jsonify({
            'error': str(e),
            'tweets': []
        }), 500

@app.route('/test', methods=['GET'])
def test():
    """Test endpoint to verify proxy is working"""
    return jsonify({
        'message': 'Twitter proxy is working!',
        'game_api_key_set': bool(GAME_API_KEY),
        'endpoints': {
            'health': '/health',
            'tweets': '/tweets/<username>?max_results=10&since_id=123'
        }
    })

if __name__ == '__main__':
    port = int(os.getenv('PORT', 5002))
    
    if not GAME_API_KEY:
        logger.warning("⚠️  GAME_API_KEY not set! Proxy will not work properly.")
    else:
        logger.info(f"✅ GAME_API_KEY configured: {GAME_API_KEY[:10]}...")
    
    logger.info(f"🚀 Starting Twitter Proxy on port {port}")
    app.run(host='0.0.0.0', port=port, debug=True)

