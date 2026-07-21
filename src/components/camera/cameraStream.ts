// Camera lifecycle helpers, kept out of the React component so the safety-critical
// bits are unit-testable in the node test env. NOTE: this file is scanned by
// tests/camera-privacy.test.ts — never add network/storage APIs here.

export function cameraSupported(): boolean {
  return typeof window !== 'undefined'
    && typeof navigator !== 'undefined'
    && !!navigator.mediaDevices?.getUserMedia
    && window.isSecureContext
}

export function stopStream(stream: MediaStream | null): void {
  stream?.getTracks().forEach((t) => t.stop())
}
