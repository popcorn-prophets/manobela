/**
 * Fetches ICE servers from the backend.
 */
export async function fetchIceServers(): Promise<RTCConfiguration> {
  const res = await fetch(`${process.env.EXPO_PUBLIC_API_BASE}/ice-servers`);
  const data = await res.json();

  return {
    iceServers: data.iceServers.map((s: any) => {
      const server: any = { urls: s.urls };
      if (s.username && s.credential) {
        server.username = s.username;
        server.credential = s.credential;
      }
      return server;
    }),
  };
}
