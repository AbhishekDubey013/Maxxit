#!/usr/bin/env ts-node

/**
 * Test GAME Twitter OAuth with apt- key
 */

import { TwitterApi } from '@virtuals-protocol/game-twitter-node';

async function testGameTwitter() {
  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║                                                               ║');
  console.log('║   Testing GAME Twitter OAuth with apt- Key                   ║');
  console.log('║                                                               ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  const apiKey = 'apt-ebf0e27b43d39db0b1335eb2eb81e754';
  
  try {
    // Initialize with the apt- key
    console.log('🔑 Initializing Twitter client with apt- key...');
    const twitterClient = new TwitterApi({
      gameTwitterAccessToken: apiKey
    });

    // Test 1: Get authenticated user info
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  TEST 1: Get Authenticated User Info');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    const me = await twitterClient.v2.me({
      'user.fields': ['public_metrics', 'description', 'created_at']
    });
    
    console.log('✅ Authenticated User:');
    console.log(`   Username: @${me.data.username}`);
    console.log(`   Name: ${me.data.name}`);
    console.log(`   ID: ${me.data.id}`);
    if (me.data.description) {
      console.log(`   Bio: ${me.data.description.substring(0, 100)}...`);
    }
    if (me.data.public_metrics) {
      console.log(`   Followers: ${me.data.public_metrics.followers_count}`);
      console.log(`   Following: ${me.data.public_metrics.following_count}`);
      console.log(`   Tweets: ${me.data.public_metrics.tweet_count}`);
    }

    // Test 2: Search for crypto tweets
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  TEST 2: Search Tweets (crypto)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    const searchResults = await twitterClient.v2.search('crypto', {
      max_results: 5,
      'tweet.fields': ['public_metrics', 'created_at', 'author_id']
    });

    console.log(`✅ Found ${searchResults.data.data?.length || 0} tweets:\n`);
    
    if (searchResults.data.data && searchResults.data.data.length > 0) {
      for (const tweet of searchResults.data.data.slice(0, 3)) {
        console.log(`   📝 Tweet ID: ${tweet.id}`);
        console.log(`   📅 Created: ${tweet.created_at}`);
        console.log(`   📄 Text: ${tweet.text.substring(0, 100)}...`);
        if (tweet.public_metrics) {
          console.log(`   ❤️  Likes: ${tweet.public_metrics.like_count} | 🔁 Retweets: ${tweet.public_metrics.retweet_count}`);
        }
        console.log('');
      }
    }

    // Test 3: Get user by username
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  TEST 3: Get User by Username (elonmusk)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    const user = await twitterClient.v2.userByUsername('elonmusk', {
      'user.fields': ['public_metrics', 'created_at']
    });

    console.log('✅ User Info:');
    console.log(`   Username: @${user.data.username}`);
    console.log(`   Name: ${user.data.name}`);
    console.log(`   ID: ${user.data.id}`);
    if (user.data.public_metrics) {
      console.log(`   Followers: ${user.data.public_metrics.followers_count?.toLocaleString() || 'N/A'}`);
      console.log(`   Tweets: ${user.data.public_metrics.tweet_count?.toLocaleString() || 'N/A'}`);
    }

    // Test 4: Get user timeline
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  TEST 4: Get User Timeline (elonmusk)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    const timeline = await twitterClient.v2.userTimeline(user.data.id, {
      max_results: 5,
      'tweet.fields': ['created_at', 'public_metrics']
    });

    console.log(`✅ Found ${timeline.data.data?.length || 0} tweets:\n`);
    
    if (timeline.data.data && timeline.data.data.length > 0) {
      for (const tweet of timeline.data.data.slice(0, 3)) {
        console.log(`   📝 Tweet ID: ${tweet.id}`);
        console.log(`   📅 Created: ${tweet.created_at}`);
        console.log(`   📄 Text: ${tweet.text.substring(0, 100)}...`);
        if (tweet.public_metrics) {
          console.log(`   ❤️  Likes: ${tweet.public_metrics.like_count.toLocaleString()}`);
        }
        console.log('');
      }
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  🎉 SUCCESS - GAME Twitter OAuth is WORKING!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('✅ apt- key is functional');
    console.log('✅ Can fetch authenticated user info');
    console.log('✅ Can search tweets');
    console.log('✅ Can get user info by username');
    console.log('✅ Can fetch user timelines');
    console.log('\n🚀 Ready to integrate into tweet ingestion worker!\n');

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    if (error.data) {
      console.error('   Response:', JSON.stringify(error.data, null, 2));
    }
    process.exit(1);
  }
}

testGameTwitter();

