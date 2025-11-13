/**
 * Venue Router - Agent Where Layer
 * Handles intelligent routing of trades across multiple venues
 * 
 * Flow:
 * 1. Check venue availability for token pair
 * 2. Apply routing strategy (priority-based, best liquidity, etc.)
 * 3. Return selected venue with routing metadata
 * 4. Log routing decision for audit
 */

import { PrismaClient, venue_t } from '@prisma/client';

const prisma = new PrismaClient();

export interface VenueAvailability {
  venue: venue_t;
  available: boolean;
  reason?: string;
  metadata?: {
    marketIndex?: number;
    minPosition?: number;
    maxLeverage?: number;
    isActive?: boolean;
  };
}

export interface VenueRoutingResult {
  selectedVenue: venue_t;
  routingReason: string;
  checkedVenues: string[];
  venueAvailability: Record<string, boolean>;
  availabilityDetails: VenueAvailability[];
  routingDurationMs: number;
}

export class VenueRouter {
  /**
   * Route a token to the best available venue
   * Default priority: HYPERLIQUID → OSTIUM
   */
  async routeToVenue(params: {
    tokenSymbol: string;
    agentId?: string;
    requestedVenue?: venue_t;
  }): Promise<VenueRoutingResult> {
    const startTime = Date.now();
    const { tokenSymbol, agentId, requestedVenue } = params;

    console.log(`[VenueRouter] Routing ${tokenSymbol} for agent ${agentId || 'global'}`);

    // If not a MULTI venue request, return as-is (backward compatibility)
    if (requestedVenue && requestedVenue !== 'MULTI') {
      return {
        selectedVenue: requestedVenue,
        routingReason: `Static venue: ${requestedVenue}`,
        checkedVenues: [requestedVenue],
        venueAvailability: { [requestedVenue]: true },
        availabilityDetails: [{
          venue: requestedVenue,
          available: true,
          reason: 'Static venue configured',
        }],
        routingDurationMs: Date.now() - startTime,
      };
    }

    // Get routing configuration
    const routingConfig = await this.getRoutingConfig(agentId);
    const venuePriority = routingConfig.venue_priority;

    console.log(`[VenueRouter] Venue priority: ${venuePriority.join(' → ')}`);

    // Check availability across all venues in priority order
    const availabilityDetails: VenueAvailability[] = [];
    
    for (const venue of venuePriority) {
      const availability = await this.checkVenueAvailability(venue as venue_t, tokenSymbol);
      availabilityDetails.push(availability);
      
      console.log(`[VenueRouter] ${venue}: ${availability.available ? '✅ Available' : '❌ Not available'} - ${availability.reason}`);
      
      // If venue is available and failover is enabled, select it
      if (availability.available && routingConfig.failover_enabled) {
        const routingDurationMs = Date.now() - startTime;
        
        return {
          selectedVenue: venue as venue_t,
          routingReason: `${venue}: ${availability.reason}`,
          checkedVenues: venuePriority,
          venueAvailability: Object.fromEntries(
            availabilityDetails.map(v => [v.venue, v.available])
          ),
          availabilityDetails,
          routingDurationMs,
        };
      }
    }

    // No venue available - return error as MULTI (will be handled by executor)
    const routingDurationMs = Date.now() - startTime;
    throw new Error(
      `No venue available for ${tokenSymbol}. Checked: ${venuePriority.join(', ')}`
    );
  }

  /**
   * Check if a venue supports a token
   */
  private async checkVenueAvailability(
    venue: venue_t,
    tokenSymbol: string
  ): Promise<VenueAvailability> {
    try {
      const market = await prisma.venue_markets.findUnique({
        where: {
          venue_token_symbol: {
            venue,
            token_symbol: tokenSymbol,
          },
        },
      });

      if (!market) {
        return {
          venue,
          available: false,
          reason: 'Market not found in database',
        };
      }

      if (!market.is_active) {
        return {
          venue,
          available: false,
          reason: 'Market exists but is not active',
          metadata: {
            marketIndex: market.market_index || undefined,
            minPosition: market.min_position ? parseFloat(market.min_position.toString()) : undefined,
            maxLeverage: market.max_leverage || undefined,
            isActive: market.is_active,
          },
        };
      }

      return {
        venue,
        available: true,
        reason: `Market ${market.market_name} available (Index: ${market.market_index})`,
        metadata: {
          marketIndex: market.market_index || undefined,
          minPosition: market.min_position ? parseFloat(market.min_position.toString()) : undefined,
          maxLeverage: market.max_leverage || undefined,
          isActive: market.is_active,
        },
      };
    } catch (error: any) {
      console.error(`[VenueRouter] Error checking ${venue} for ${tokenSymbol}:`, error.message);
      return {
        venue,
        available: false,
        reason: `Error: ${error.message}`,
      };
    }
  }

  /**
   * Get routing configuration for an agent (or global default)
   */
  private async getRoutingConfig(agentId?: string) {
    // Try to get agent-specific config
    if (agentId) {
      const agentConfig = await prisma.venue_routing_config.findUnique({
        where: { agent_id: agentId },
      });

      if (agentConfig) {
        console.log(`[VenueRouter] Using agent-specific routing config`);
        return agentConfig;
      }
    }

    // Try to get global config
    const globalConfig = await prisma.venue_routing_config.findUnique({
      where: { agent_id: null },
    });

    if (globalConfig) {
      console.log(`[VenueRouter] Using global routing config`);
      return globalConfig;
    }

    // Return default config
    console.log(`[VenueRouter] Using default routing config`);
    return {
      venue_priority: ['HYPERLIQUID', 'OSTIUM'],
      routing_strategy: 'FIRST_AVAILABLE',
      failover_enabled: true,
    };
  }

  /**
   * Log routing decision to history
   */
  async logRoutingDecision(params: {
    signalId: string;
    tokenSymbol: string;
    requestedVenue: venue_t;
    routingResult: VenueRoutingResult;
  }) {
    try {
      await prisma.venue_routing_history.create({
        data: {
          signal_id: params.signalId,
          token_symbol: params.tokenSymbol,
          requested_venue: params.requestedVenue,
          selected_venue: params.routingResult.selectedVenue,
          routing_reason: params.routingResult.routingReason,
          checked_venues: params.routingResult.checkedVenues,
          venue_availability: params.routingResult.venueAvailability,
          routing_duration_ms: params.routingResult.routingDurationMs,
        },
      });

      console.log(`[VenueRouter] Logged routing decision for signal ${params.signalId}`);
    } catch (error: any) {
      console.error(`[VenueRouter] Failed to log routing decision:`, error.message);
      // Don't throw - logging failure shouldn't break the trade
    }
  }

  /**
   * Get routing statistics
   */
  async getRoutingStats(params: {
    tokenSymbol?: string;
    timeWindow?: 'hour' | 'day' | 'week';
  }) {
    const timeFilter = this.getTimeFilter(params.timeWindow || 'day');

    const stats = await prisma.venue_routing_history.groupBy({
      by: ['selected_venue', 'token_symbol'],
      where: {
        created_at: { gte: timeFilter },
        ...(params.tokenSymbol && { token_symbol: params.tokenSymbol }),
      },
      _count: true,
      _avg: {
        routing_duration_ms: true,
      },
    });

    return stats;
  }

  private getTimeFilter(window: 'hour' | 'day' | 'week'): Date {
    const now = new Date();
    switch (window) {
      case 'hour':
        return new Date(now.getTime() - 60 * 60 * 1000);
      case 'day':
        return new Date(now.getTime() - 24 * 60 * 60 * 1000);
      case 'week':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }
  }
}

export const venueRouter = new VenueRouter();

