/**
 * Research Signal Worker (Microservice)
 * Generates signals from research institutes
 * Interval: 2 minutes (configurable via WORKER_INTERVAL)
 */

import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import express from 'express';

dotenv.config();

const prisma = new PrismaClient();
const PORT = process.env.PORT || 5005;
const INTERVAL = parseInt(process.env.WORKER_INTERVAL || '120000'); // 2 minutes default

// Health check server
const app = express();
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'research-signal-worker',
    interval: INTERVAL,
    timestamp: new Date().toISOString(),
  });
});

app.listen(PORT, () => {
  console.log(`🏥 Research Signal Worker health check on port ${PORT}`);
});

/**
 * Generate signals from research institutes
 */
async function generateResearchSignals() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  🔬 RESEARCH SIGNAL GENERATOR');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`Started at: ${new Date().toISOString()}\n`);

  try {
    // Get all active research institutes
    const institutes = await prisma.research_institutes.findMany({
      where: { is_active: true },
    });

    console.log(`📋 Found ${institutes.length} active research institute(s)\n`);

    if (institutes.length === 0) {
      console.log('⚠️  No active research institutes found\n');
      return;
    }

    let totalSignalsGenerated = 0;

    // Process each institute
    for (const institute of institutes) {
      console.log(`[${institute.name}] Processing...`);
      
      try {
        // Get agents subscribed to this institute
        const agentInstitutes = await prisma.agent_research_institutes.findMany({
          where: {
            research_institute_id: institute.id,
            agents: {
              status: 'ACTIVE',
            },
          },
          include: {
            agents: true,
          },
        });

        if (agentInstitutes.length === 0) {
          console.log(`[${institute.name}] ⏭️  No active agents subscribed`);
          continue;
        }

        console.log(`[${institute.name}] 🤖 ${agentInstitutes.length} active agent(s) subscribed`);

        // Get recent research signals (unprocessed)
        const recentReports = await prisma.research_signals.findMany({
          where: {
            institute_id: institute.id,
            created_at: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
            },
          },
          orderBy: {
            created_at: 'desc',
          },
          take: 10,
        });

        console.log(`[${institute.name}] 📊 Found ${recentReports.length} recent report(s)`);

        if (recentReports.length === 0) {
          console.log(`[${institute.name}] ⏭️  No recent reports to process`);
          continue;
        }

        // Process each report
        for (const report of recentReports) {
          // Generate signals for each subscribed agent
          for (const agentInstitute of agentInstitutes) {
            try {
              // Check if signal already exists
              const existingSignal = await prisma.signals.findFirst({
                where: {
                  agent_id: agentInstitute.agent_id,
                  token_symbol: report.token_symbol,
                  created_at: {
                    gte: new Date(report.created_at.getTime() - 5 * 60 * 1000), // Within 5 mins of report
                  },
                },
              });

              if (existingSignal) {
                // Signal already generated
                continue;
              }

              // Create signal
              await prisma.signals.create({
                data: {
                  agent_id: agentInstitute.agent_id,
                  token_symbol: report.token_symbol,
                  side: report.sentiment === 'BULLISH' ? 'LONG' : 'SHORT',
                  venue: agentInstitute.agents.venue,
                  rate: report.confidence || 5, // Default rate based on confidence
                  status: 'PENDING',
                  confidence: report.confidence,
                  source: 'RESEARCH',
                  source_id: report.id,
                },
              });

              totalSignalsGenerated++;
            } catch (error: any) {
              console.error(`[${institute.name}] Error generating signal:`, error.message);
            }
          }
        }

        console.log(`[${institute.name}] ✅ Processed ${recentReports.length} report(s)`);
      } catch (error: any) {
        console.error(`[${institute.name}] ❌ Error:`, error.message);
      }
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 SIGNAL GENERATION SUMMARY');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`  Institutes Processed: ${institutes.length}`);
    console.log(`  Signals Generated: ${totalSignalsGenerated}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  } catch (error: any) {
    console.error('[ResearchSignal] ❌ Fatal error:', error.message);
  }
}

/**
 * Main worker loop
 */
async function runWorker() {
  console.log('🚀 Research Signal Worker starting...');
  console.log(`⏱️  Interval: ${INTERVAL}ms (${INTERVAL / 1000}s)`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  // Run immediately on startup
  await generateResearchSignals();
  
  // Then run on interval
  setInterval(async () => {
    await generateResearchSignals();
  }, INTERVAL);
}

// Start worker
if (require.main === module) {
  runWorker().catch(error => {
    console.error('[ResearchSignal] ❌ Worker failed to start:', error);
    process.exit(1);
  });
}

export { generateResearchSignals };
