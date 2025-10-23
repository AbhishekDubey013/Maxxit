import { ethers } from 'ethers';

export interface AgentSignatureData {
  signalId: string;
  agentId: string;
  tokenSymbol: string;
  side: string;
  amount: string;
  timestamp: Date;
  agentWallet: string;
  message: string;
  signature: string;
}

export const EXECUTOR_AGREEMENT_SIGNATURE_PREFIX = "I hereby agree to execute this trading signal on behalf of the agent. This signature serves as my authorization for signal ID:";

/**
 * Creates an executor agreement signature using the executor's private key.
 * @param signalId The ID of the signal being executed.
 * @param agentId The ID of the agent.
 * @param tokenSymbol The token being traded.
 * @param side The side of the trade (BUY/SELL).
 * @param amount The amount being traded.
 * @param executorPrivateKey The executor's private key for signing.
 * @returns The signed agreement data.
 */
export async function createExecutorAgreementSignature(
  signalId: string,
  agentId: string,
  tokenSymbol: string,
  side: string,
  amount: string,
  executorPrivateKey: string
): Promise<AgentSignatureData> {
  const timestamp = new Date();
  const message = `${EXECUTOR_AGREEMENT_SIGNATURE_PREFIX} ${signalId} for agent ${agentId} trading ${side} ${amount} ${tokenSymbol} at ${timestamp.toISOString()}`;

  try {
    // Create wallet from executor's private key
    const wallet = new ethers.Wallet(executorPrivateKey);
    
    // Sign the message
    const signature = await wallet.signMessage(message);
    
    return {
      signalId,
      agentId,
      tokenSymbol,
      side,
      amount,
      timestamp,
      agentWallet: wallet.address, // This is actually the executor's wallet
      message,
      signature
    };
  } catch (error: any) {
    console.error("Executor agreement signing failed:", error);
    throw new Error(`Executor agreement signing failed: ${error.message || error}`);
  }
}

/**
 * Verifies an executor agreement signature against a message and an address.
 * @param message The original message that was signed.
 * @param signature The signature to verify.
 * @param executorAddress The expected address of the executor.
 * @returns True if the signature is valid for the message and address, false otherwise.
 */
export function verifyExecutorAgreementSignature(
  message: string,
  signature: string,
  executorAddress: string
): boolean {
  try {
    const recoveredAddress = ethers.utils.verifyMessage(message, signature);
    return recoveredAddress.toLowerCase() === executorAddress.toLowerCase();
  } catch (error) {
    console.error("Executor agreement signature verification failed:", error);
    return false;
  }
}

/**
 * Validates automated agent signature data structure.
 * @param data The data to validate.
 * @returns True if the data is valid, false otherwise.
 */
export function validateAutomatedAgentSignatureData(data: any): data is AgentSignatureData {
  return (
    data &&
    typeof data.signalId === 'string' &&
    typeof data.agentId === 'string' &&
    typeof data.tokenSymbol === 'string' &&
    typeof data.side === 'string' &&
    typeof data.amount === 'string' &&
    data.timestamp instanceof Date &&
    typeof data.agentWallet === 'string' &&
    typeof data.message === 'string' &&
    typeof data.signature === 'string'
  );
}

/**
 * Generate a unique automated agent signature hash for database storage.
 * @param message The original message that was signed.
 * @param signature The signature.
 * @returns A unique hash for the signature.
 */
export function generateAutomatedAgentSignatureHash(message: string, signature: string): string {
  return ethers.utils.keccak256(
    ethers.utils.defaultAbiCoder.encode(
      ['string', 'string'],
      [message, signature]
    )
  );
}
