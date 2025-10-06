#!/usr/bin/env python3
import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from virtuals_tweepy import Client
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="Twitter API Proxy")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class Tweet(BaseModel):
    id: str
    text: str
    created_at: str
    author_id: str

class TweetsResponse(BaseModel):
    username: str
    tweets: List[Tweet]

def get_client():
    token = os.getenv("GAME_API_KEY") or os.getenv("GAME_TWITTER_ACCESS_TOKEN")
    if not token:
        raise HTTPException(status_code=500, detail="GAME_API_KEY not found")
    return Client(game_twitter_access_token=token)

@app.get("/health")
def health():
    return {"status": "healthy"}

@app.get("/tweets/{username}")
def get_tweets(username: str, max_results: int = 10, since_id: Optional[str] = None):
    try:
        client = get_client()
        clean_username = username.lstrip('@')
        
        # Get user ID
        user = client.get_user(username=clean_username)
        if not user.data:
            raise HTTPException(status_code=404, detail=f"User {username} not found")
        
        user_id = user.data.id
        
        # Get tweets with all necessary fields
        params = {
            'max_results': min(max_results, 100),
            'tweet_fields': ['created_at', 'author_id', 'text'],
        }
        if since_id:
            params['since_id'] = since_id
            
        response = client.get_users_tweets(user_id, **params)
        
        tweets = []
        if response.data:
            for tweet in response.data:
                # Properly format the date
                created_at = tweet.created_at if hasattr(tweet, 'created_at') and tweet.created_at else None
                tweets.append({
                    'id': str(tweet.id),
                    'text': tweet.text,
                    'created_at': created_at.isoformat() if created_at else None,
                    'author_id': str(tweet.author_id) if hasattr(tweet, 'author_id') and tweet.author_id else None,
                })
        
        return TweetsResponse(username=clean_username, tweets=tweets)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    print("🚀 Twitter API Proxy starting on http://localhost:8001")
    uvicorn.run(app, host="0.0.0.0", port=8001)
