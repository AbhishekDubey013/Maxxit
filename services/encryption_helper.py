"""
AES-256-GCM Decryption Helper for Python Services
Matches the encryption/decryption logic in lib/deployment-agent-address.ts
"""

import os
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.backends import default_backend


def get_encryption_key() -> bytes:
    """Get the encryption key from environment variables"""
    # Try both ENCRYPTION_KEY and MASTER_ENCRYPTION_KEY
    key_hex = os.getenv('ENCRYPTION_KEY') or os.getenv('MASTER_ENCRYPTION_KEY')
    
    if not key_hex:
        raise ValueError(
            "ENCRYPTION_KEY or MASTER_ENCRYPTION_KEY environment variable not set. "
            "This is required to decrypt agent private keys from user_agent_addresses table."
        )
    
    # Convert hex string to bytes
    try:
        return bytes.fromhex(key_hex)
    except ValueError as e:
        raise ValueError(f"Invalid encryption key format (must be hex): {e}")


def decrypt_private_key(encrypted_hex: str, iv_hex: str, tag_hex: str) -> str:
    """
    Decrypt a private key using AES-256-GCM
    
    Args:
        encrypted_hex: Encrypted private key (hex string)
        iv_hex: Initialization vector (hex string)
        tag_hex: Authentication tag (hex string)
        
    Returns:
        Decrypted private key (string)
        
    Raises:
        ValueError: If decryption fails or key is missing
    """
    try:
        # Get encryption key
        key = get_encryption_key()
        
        # Convert hex strings to bytes
        encrypted = bytes.fromhex(encrypted_hex)
        iv = bytes.fromhex(iv_hex)
        tag = bytes.fromhex(tag_hex)
        
        # Combine encrypted data with authentication tag (AESGCM expects them together)
        ciphertext = encrypted + tag
        
        # Create AESGCM cipher
        aesgcm = AESGCM(key)
        
        # Decrypt
        plaintext = aesgcm.decrypt(iv, ciphertext, None)
        
        # Convert bytes to string
        return plaintext.decode('utf-8')
        
    except Exception as e:
        error_msg = str(e)
        if 'Insufficient key' in error_msg or 'authentication tag' in error_msg.lower():
            raise ValueError(
                "Decryption failed: The encryption key does not match the key used to encrypt this data. "
                "Please verify that ENCRYPTION_KEY or MASTER_ENCRYPTION_KEY is set correctly."
            )
        elif 'ENCRYPTION_KEY' in error_msg:
            raise ValueError(
                "Decryption failed: ENCRYPTION_KEY environment variable is missing. "
                "The private key was encrypted with a different key. "
                "Please set ENCRYPTION_KEY or MASTER_ENCRYPTION_KEY environment variable."
            )
        else:
            raise ValueError(f"Failed to decrypt private key: {error_msg}")


# Test the module when run directly
if __name__ == "__main__":
    # Check if encryption key is available
    try:
        key = get_encryption_key()
        print("✅ ENCRYPTION_KEY found")
        print(f"   Key length: {len(key)} bytes (expected: 32)")
        if len(key) != 32:
            print("⚠️  WARNING: Key should be 32 bytes for AES-256")
    except ValueError as e:
        print(f"❌ {e}")

