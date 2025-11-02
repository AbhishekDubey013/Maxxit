#!/usr/bin/env python3
"""
Twitter/X API Proxy using GAME SDK
Runs locally on port 8001 to provide tweet data
"""

from flask import Flask, jsonify, request
from flask_cors import CORS
import os
import requests
from datetime import datetime

app = Flask(__name__)
CORS(app)

GAME_API_KEY = os.getenv('GAME_API_KEY')
GAME_API_BASE = 'https://api.virtuals.io/api'


@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({
        'status': 'ok',
        'service': 'twitter-proxy',
        'game_api_configured': bool(GAME_API_KEY)
    })


@app.route('/tweets/<username>', methods=['GET'])
def get_tweets(username):
    """
    Fetch tweets for a user
    Path param: username
    Query params: max_results (optional), since_id (optional)
    """
    if not GAME_API_KEY:
        return jsonify({
            'success': False,
            'error': 'GAME_API_KEY not configured'
        }), 500
    
    # Clean username
    username = username.replace('@', '')
    
    max_results = int(request.args.get('max_results', 10))
    since_id = request.args.get('since_id')
    
    try:
        # Call GAME API
        headers = {
            'Authorization': f'Bearer {GAME_API_KEY}',
            'Content-Type': 'application/json'
        }
        
        params = {
            'max_results': max_results
        }
        
        if since_id:
            params['since_id'] = since_id
        
        url = f'{GAME_API_BASE}/twitter/user/{username}/tweets'
        
        print(f'[Proxy] Fetching tweets for @{username}')
        print(f'[Proxy] URL: {url}')
        print(f'[Proxy] Headers: Authorization=Bearer {GAME_API_KEY[:15]}...')
        print(f'[Proxy] Params: {params}')
        
        response = requests.get(url, headers=headers, params=params, timeout=30)
        
        print(f'[Proxy] Response status: {response.status_code}')
        print(f'[Proxy] Response body: {response.text[:200]}')
        
        if response.status_code == 204:
            # No content - return empty array
            return jsonify({
                'success': True,
                'data': [],
                'username': username
            })
        
        if response.status_code != 200:
            return jsonify({
                'success': False,
                'error': f'GAME API error: {response.status_code}',
                'details': response.text
            }), response.status_code
        
        data = response.json()
        
        # Transform to expected format
        tweets = []
        if isinstance(data, list):
            tweets = data
        elif isinstance(data, dict) and 'data' in data:
            tweets = data['data']
        
        return jsonify({
            'success': True,
            'data': tweets,
            'username': username,
            'count': len(tweets)
        })
        
    except Exception as e:
        print(f'[Proxy] Error: {str(e)}')
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


if __name__ == '__main__':
    if not GAME_API_KEY:
        print('⚠️  Warning: GAME_API_KEY not set in environment')
        print('   Set it with: export GAME_API_KEY=your_key')
    
    port = int(os.getenv('TWITTER_PROXY_PORT', 8001))
    
    print('╔═══════════════════════════════════════════════════════════════╗')
    print('║                                                               ║')
    print('║     🐦 TWITTER/X API PROXY STARTING                          ║')
    print('║                                                               ║')
    print('╚═══════════════════════════════════════════════════════════════╝')
    print('')
    print(f'Port: {port}')
    print(f'GAME API Key: {"✅ Configured" if GAME_API_KEY else "❌ Missing"}')
    print('')
    print(f'Health: http://localhost:{port}/health')
    print(f'Tweets: http://localhost:{port}/tweets?username=elonmusk')
    print('')
    
    app.run(host='0.0.0.0', port=port, debug=False)

