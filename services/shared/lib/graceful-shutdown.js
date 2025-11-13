"use strict";
/**
 * Graceful Shutdown Handler
 *
 * Ensures all resources are properly cleaned up before the process exits.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerCleanup = registerCleanup;
exports.setupGracefulShutdown = setupGracefulShutdown;
const prisma_client_1 = require("./prisma-client");
const cleanupFunctions = [];
/**
 * Register a cleanup function to be called on shutdown
 */
function registerCleanup(fn) {
    cleanupFunctions.push(fn);
}
/**
 * Setup graceful shutdown handlers
 */
function setupGracefulShutdown(serviceName, server) {
    let isShuttingDown = false;
    const shutdown = async (signal) => {
        if (isShuttingDown) {
            console.log(`⏳ ${serviceName} is already shutting down...`);
            return;
        }
        isShuttingDown = true;
        console.log(`\n🛑 ${serviceName} received ${signal}, starting graceful shutdown...`);
        // Close HTTP server first (stop accepting new requests)
        if (server) {
            await new Promise((resolve) => {
                server.close(() => {
                    console.log(`✅ ${serviceName} HTTP server closed`);
                    resolve();
                });
            });
        }
        // Run custom cleanup functions
        for (const cleanup of cleanupFunctions) {
            try {
                await cleanup();
            }
            catch (error) {
                console.error(`❌ Error during cleanup:`, error);
            }
        }
        // Disconnect Prisma
        try {
            await (0, prisma_client_1.disconnectPrisma)();
            console.log(`✅ ${serviceName} Prisma disconnected`);
        }
        catch (error) {
            console.error(`❌ Error disconnecting Prisma:`, error);
        }
        console.log(`✅ ${serviceName} graceful shutdown complete`);
        process.exit(0);
    };
    // Handle termination signals
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
    // Handle uncaught errors
    process.on('uncaughtException', (error) => {
        console.error(`❌ ${serviceName} uncaught exception:`, error);
        shutdown('uncaughtException');
    });
    process.on('unhandledRejection', (reason, promise) => {
        console.error(`❌ ${serviceName} unhandled rejection at:`, promise, 'reason:', reason);
        shutdown('unhandledRejection');
    });
}
//# sourceMappingURL=graceful-shutdown.js.map