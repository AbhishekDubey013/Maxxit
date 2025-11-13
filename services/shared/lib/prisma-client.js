"use strict";
/**
 * Singleton Prisma Client
 *
 * This ensures only one instance of PrismaClient exists across the application,
 * preventing connection pool exhaustion and improving performance.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
exports.disconnectPrisma = disconnectPrisma;
exports.checkDatabaseHealth = checkDatabaseHealth;
const client_1 = require("@prisma/client");
// Global is used here to maintain a singleton instance across hot reloads in development
const globalForPrisma = global;
exports.prisma = globalForPrisma.prisma || new client_1.PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    errorFormat: 'pretty',
});
if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = exports.prisma;
}
/**
 * Gracefully disconnect Prisma Client
 */
async function disconnectPrisma() {
    await exports.prisma.$disconnect();
}
/**
 * Health check for database connection
 */
async function checkDatabaseHealth() {
    try {
        await exports.prisma.$queryRaw `SELECT 1`;
        return true;
    }
    catch (error) {
        console.error('❌ Database health check failed:', error);
        return false;
    }
}
//# sourceMappingURL=prisma-client.js.map