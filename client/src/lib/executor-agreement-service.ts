import { PrismaClient } from '@prisma/client';
import { verifyExecutorAgreement } from './executor-agreement';

const prisma = new PrismaClient();

export interface ExecutorAgreementResult {
  isValid: boolean;
  error?: string;
  signalId: string;
  executorWallet?: string;
  agreementTimestamp?: Date;
}

export class ExecutorAgreementService {
  /**
   * Verifies the executor agreement for a given signal.
   * @param signalId The ID of the signal.
   * @returns An object indicating if the agreement is valid and any error message.
   */
  public static async verifySignalExecutorAgreement(
    signalId: string
  ): Promise<ExecutorAgreementResult> {
    const signal = await prisma.signal.findUnique({
      where: { id: signalId },
    });

    if (!signal) {
      return { isValid: false, error: 'Signal not found', signalId };
    }

    if (!signal.executorAgreementMessage || !signal.executorAgreementSignature || !signal.executorWallet) {
      return { isValid: false, error: 'Signal does not have an executor agreement', signalId };
    }

    // Verify the signature
    const isValid = verifyExecutorAgreement(
      signal.executorAgreementMessage,
      signal.executorAgreementSignature,
      signal.executorWallet
    );

    if (!isValid) {
      return { isValid: false, error: 'Invalid executor agreement signature', signalId };
    }

    return { 
      isValid: true, 
      signalId,
      executorWallet: signal.executorWallet,
      agreementTimestamp: signal.executorAgreementTimestamp
    };
  }

  /**
   * Checks if a signal has a valid executor agreement.
   * @param signalId The ID of the signal.
   * @returns True if the signal has a valid executor agreement, false otherwise.
   */
  public static async hasValidExecutorAgreement(signalId: string): Promise<boolean> {
    const result = await this.verifySignalExecutorAgreement(signalId);
    return result.isValid;
  }

  /**
   * Gets all signals that need executor agreement.
   * @returns Array of signals that are verified but don't have executor agreement.
   */
  public static async getSignalsNeedingExecutorAgreement(): Promise<any[]> {
    return await prisma.signal.findMany({
      where: {
        proofVerified: true,
        executorAgreementVerified: false,
        skippedReason: null
      },
      include: {
        agent: {
          select: {
            id: true,
            name: true,
            creatorWallet: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
  }

  /**
   * Gets all signals with executor agreements.
   * @returns Array of signals that have executor agreements.
   */
  public static async getSignalsWithExecutorAgreements(): Promise<any[]> {
    return await prisma.signal.findMany({
      where: {
        executorAgreementVerified: true
      },
      include: {
        agent: {
          select: {
            id: true,
            name: true,
            creatorWallet: true
          }
        }
      },
      orderBy: {
        executorAgreementTimestamp: 'desc'
      }
    });
  }
}
