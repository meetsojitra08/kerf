const ONE_MIB = 1024 * 1024;

async function sha256Hex(buffer: ArrayBuffer): Promise<string> {
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Computes a fast, collision-resistant fingerprint for a file without reading the entire content.
 * Formula: size + mtime + SHA-256(first 1 MiB) + SHA-256(last 1 MiB)
 */
export async function computeFileFingerprint(file: Blob, mtime: number = 0): Promise<string> {
  const size = file.size;
  const lastModified = mtime || (file instanceof File ? file.lastModified : 0);

  // Slice first 1 MiB
  const firstChunkBlob = file.slice(0, Math.min(ONE_MIB, size));
  const firstChunkBuffer = await firstChunkBlob.arrayBuffer();
  const firstHash = await sha256Hex(firstChunkBuffer);

  // Slice last 1 MiB
  let lastHash = firstHash;
  if (size > ONE_MIB) {
    const lastChunkBlob = file.slice(Math.max(0, size - ONE_MIB), size);
    const lastChunkBuffer = await lastChunkBlob.arrayBuffer();
    lastHash = await sha256Hex(lastChunkBuffer);
  }

  return `${size}_${lastModified}_${firstHash}_${lastHash}`;
}
