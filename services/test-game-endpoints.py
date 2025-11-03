"""
Test different GAME API endpoint patterns to find the working one
"""

import requests
import os
from dotenv import load_dotenv

# Load .env
load_dotenv('../.env')

GAME_API_KEY = os.getenv('GAME_API_KEY', 'apx-3c676fea465e611f3cabeb5254fc2ab3')
username = 'elonmusk'

# Different endpoint patterns to try
endpoints = [
    f'https://api.virtuals.io/api/twitter/user/{username}/tweets',
    f'https://api.virtuals.io/twitter/user/{username}/tweets',
    f'https://api.virtuals.io/api/v1/twitter/user/{username}/tweets',
    f'https://api.virtuals.io/v1/twitter/user/{username}/tweets',
    f'https://api.virtuals.io/api/tweets/{username}',
    f'https://api.virtuals.io/tweets/{username}',
    f'https://api.virtuals.io/api/twitter/{username}',
    f'https://api.virtuals.io/twitter/{username}',
]

headers = {
    'Authorization': f'Bearer {GAME_API_KEY}',
    'Content-Type': 'application/json'
}

print(f"Testing GAME API with token: {GAME_API_KEY[:15]}...")
print(f"Username: {username}")
print("=" * 70)

for i, url in enumerate(endpoints, 1):
    print(f"\n[{i}] Testing: {url}")
    try:
        response = requests.get(url, headers=headers, params={'max_results': 5}, timeout=10)
        print(f"    Status: {response.status_code}")
        
        if response.status_code == 200:
            try:
                data = response.json()
                print(f"    Response type: {type(data)}")
                if isinstance(data, dict):
                    print(f"    Keys: {list(data.keys())}")
                    if 'data' in data:
                        print(f"    Data count: {len(data['data'])}")
                        if data['data']:
                            print(f"    ✅ GOT TWEETS! First tweet: {data['data'][0].get('text', '')[:50]}...")
                elif isinstance(data, list):
                    print(f"    List length: {len(data)}")
                    if data:
                        print(f"    ✅ GOT TWEETS! First tweet: {data[0].get('text', '')[:50]}...")
            except:
                print(f"    Response text: {response.text[:200]}")
        elif response.status_code == 204:
            print(f"    ⚠️  No Content (empty)")
        else:
            print(f"    Error: {response.text[:200]}")
    except Exception as e:
        print(f"    ❌ Error: {str(e)}")

print("\n" + "=" * 70)
print("Test complete!")

