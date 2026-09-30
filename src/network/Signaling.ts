const VERSION = 1;
export function encodeSignal(description: RTCSessionDescriptionInit) {
  return btoa(JSON.stringify({ version: VERSION, description: { type: description.type, sdp: description.sdp } }));
}
export function decodeSignal(code: string): RTCSessionDescriptionInit {
  if (code.length > 180_000) throw new Error('Connection code is too large. Paste only the generated code.');
  try {
    const raw = atob(code.trim().replace(/\s/g, ''));
    if (raw.length > 131_072) throw new Error('Too large');
    const data = JSON.parse(raw);
    if (data?.version !== VERSION || !['offer', 'answer'].includes(data?.description?.type) || typeof data?.description?.sdp !== 'string' || !data.description.sdp.startsWith('v=0')) throw new Error('Invalid format');
    return { type: data.description.type, sdp: data.description.sdp };
  } catch { throw new Error('Invalid connection code. Copy the complete offer or answer from the same game version.'); }
}
export function gatherIce(peer: RTCPeerConnection, signal: AbortSignal): Promise<boolean> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) { reject(new Error('Connection cancelled.')); return; }
    if (peer.iceGatheringState === 'complete') { resolve(true); return; }
    const cleanup = () => { clearTimeout(timeout); peer.removeEventListener('icegatheringstatechange', change); signal.removeEventListener('abort', abort); };
    const change = () => { if (peer.iceGatheringState === 'complete') { cleanup(); resolve(true); } };
    const abort = () => { cleanup(); reject(new Error('Connection cancelled.')); };
    const timeout = setTimeout(() => {
      cleanup();
      // A blocked public STUN endpoint must not prevent local-network play.
      if (peer.localDescription?.sdp.includes('a=candidate:')) resolve(false);
      else reject(new Error('Address discovery timed out. Go back and try creating a new connection.'));
    }, 8000);
    peer.addEventListener('icegatheringstatechange', change); signal.addEventListener('abort', abort, { once: true });
  });
}
