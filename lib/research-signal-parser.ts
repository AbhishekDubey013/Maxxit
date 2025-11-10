/**
 * Research Signal Parser
 * Uses LLM to extract structured trading signals from research institute text
 */

import Anthropic from '@anthropic-ai/sdk';

export interface ResearchSignalInput {
  instituteId: string;
  instituteName: string;
  signalText: string;
  sourceUrl?: string;
}

export interface ParsedSignal {
  token: string | null;
  side: 'LONG' | 'SHORT' | null;
  leverage: number;
  isValid: boolean;
  reasoning: string;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
}

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const SIGNAL_PARSER_PROMPT = `You are a professional trading signal parser. Your job is to extract structured data from research institute trading signals.

Extract the following from the signal text:
1. **Token**: The cryptocurrency symbol (e.g., BTC, ETH, SOL)
2. **Side**: Whether it's a LONG (buy) or SHORT (sell) signal
3. **Leverage**: Suggested leverage (1-10x). Default to 3x if not specified.
4. **Confidence**: Your confidence in this being a valid signal (HIGH/MEDIUM/LOW)

Rules:
- Only extract if the signal is CLEAR and ACTIONABLE
- Reject vague signals like "might go up" or "watch this"
- Token must be a valid crypto symbol
- Side must be explicitly LONG or SHORT
- Leverage between 1-10x
- If any critical field is missing/unclear, mark as INVALID

Return JSON format:
{
  "token": "BTC",
  "side": "LONG",
  "leverage": 3,
  "isValid": true,
  "reasoning": "Clear long signal with specific target",
  "confidence": "HIGH"
}`;

export async function parseResearchSignal(
  input: ResearchSignalInput
): Promise<ParsedSignal> {
  try {
    console.log(`[ResearchParser] Parsing signal from ${input.instituteName}`);
    console.log(`[ResearchParser] Text: "${input.signalText.substring(0, 100)}..."`);

    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 500,
      temperature: 0.3, // Lower temperature for more consistent parsing
      system: SIGNAL_PARSER_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Signal from ${input.instituteName}:

"${input.signalText}"

Extract trading signal data as JSON.`,
        },
      ],
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Claude');
    }

    // Parse LLM response
    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.log('[ResearchParser] ❌ No JSON found in response');
      return {
        token: null,
        side: null,
        leverage: 3,
        isValid: false,
        reasoning: 'Failed to parse LLM response',
        confidence: 'LOW',
      };
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // Validate parsed data
    const result: ParsedSignal = {
      token: parsed.token?.toUpperCase() || null,
      side: parsed.side?.toUpperCase() as 'LONG' | 'SHORT' | null,
      leverage: Math.min(10, Math.max(1, parsed.leverage || 3)),
      isValid: parsed.isValid === true,
      reasoning: parsed.reasoning || '',
      confidence: parsed.confidence || 'MEDIUM',
    };

    // Additional validation
    if (result.isValid) {
      if (!result.token || result.token.length > 10) {
        result.isValid = false;
        result.reasoning = 'Invalid token symbol';
      }
      if (!result.side || !['LONG', 'SHORT'].includes(result.side)) {
        result.isValid = false;
        result.reasoning = 'Invalid or missing side (LONG/SHORT)';
      }
    }

    console.log(`[ResearchParser] ✅ Result:`, {
      token: result.token,
      side: result.side,
      leverage: result.leverage,
      isValid: result.isValid,
      confidence: result.confidence,
    });

    return result;
  } catch (error: any) {
    console.error('[ResearchParser] ❌ Error:', error.message);
    return {
      token: null,
      side: null,
      leverage: 3,
      isValid: false,
      reasoning: `Parser error: ${error.message}`,
      confidence: 'LOW',
    };
  }
}

/**
 * Batch parse multiple signals
 */
export async function parseResearchSignalsBatch(
  inputs: ResearchSignalInput[]
): Promise<ParsedSignal[]> {
  const results: ParsedSignal[] = [];

  for (const input of inputs) {
    const result = await parseResearchSignal(input);
    results.push(result);
    
    // Small delay to avoid rate limits
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  return results;
}

/**
 * Test the parser with sample signals
 */
export async function testSignalParser() {
  const testSignals: ResearchSignalInput[] = [
    {
      instituteId: 'test-1',
      instituteName: 'Test Institute',
      signalText: 'BTC LONG signal activated. Entry: $95,000. Target: $100,000. Stop: $93,000. Leverage: 3x',
    },
    {
      instituteId: 'test-2',
      instituteName: 'Test Institute',
      signalText: 'Short ETH at current levels. High risk. Use 2x leverage max.',
    },
    {
      instituteId: 'test-3',
      instituteName: 'Test Institute',
      signalText: 'SOL looking bullish but waiting for confirmation. Watch closely.',
    },
    {
      instituteId: 'test-4',
      instituteName: 'Test Institute',
      signalText: 'DOGE might pump soon, just vibes',
    },
  ];

  console.log('\n🧪 Testing Research Signal Parser\n');
  console.log('='.repeat(60));

  for (const signal of testSignals) {
    console.log(`\nSignal: "${signal.signalText}"`);
    const result = await parseResearchSignal(signal);
    console.log('Result:', result);
    console.log('-'.repeat(60));
    
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

