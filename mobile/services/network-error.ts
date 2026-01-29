const NO_INTERNET_MESSAGE = 'No internet connection. Please check your network and try again.';
const WRONG_API_URL_MESSAGE = 'Wrong API URL. Please verify the API base URL in settings.';
const BACKEND_UNAVAILABLE_MESSAGE = 'Backend is not available. Please try again later.';
const UNKNOWN_ERROR_MESSAGE = 'Unknown error. Please try again.';

// ADD PATTERNS HERE:

const NO_INTERNET_PATTERNS = [
  'network request failed',
  'offline',
  'not connected',
  'internet connection appears to be offline',
  'no internet',
  'network is unreachable',
  'enetwork',
  'failed to fetch',
  'the internet connection appears to be offline',
];

const WRONG_API_URL_PATTERNS = [
  'enotfound',
  'eai_again',
  'host not found',
  'getaddrinfo',
  'name or service not known',
  'invalid host',
  'dns',
  'unknown host',
  'cannot resolve host',
  'could not resolve',
  'unsupported url',
  'invalid url',
  'failed to resolve',
];

const BACKEND_UNAVAILABLE_PATTERNS = [
  // Websocket / Transport Error
  'code=1006',
  'code=1001',
  'code=1011',
  'websocket closed',
  'websocket error',
  'socket closed',
  'connection closed',
  'handshake',
  'unexpected response code',
  'server returned',
  'connection failed',

  // tcp/http Failures
  'econnrefused',
  'connection refused',
  'econnreset',
  'socket hang up',
  'timeout',
  'timed out',
  'bad gateway',
  'service unavailable',
  'gateway timeout',

  // MISC
  'network is down',
  'connection lost',
  'broken pipe',
];

const matchesPattern = (message: string, patterns: string[]) =>
  patterns.some((pattern) => message.includes(pattern));

export const mapNetworkErrorMessage = (rawMessage?: string | null, status?: number): string => {
  if (status === 0) return NO_INTERNET_MESSAGE;
  if (status === 404) return WRONG_API_URL_MESSAGE;
  if (status && status >= 500) return BACKEND_UNAVAILABLE_MESSAGE;

  const normalized = (rawMessage ?? '').toLowerCase().trim();

  if (matchesPattern(normalized, NO_INTERNET_PATTERNS)) return NO_INTERNET_MESSAGE;

  if (matchesPattern(normalized, WRONG_API_URL_PATTERNS)) return WRONG_API_URL_MESSAGE;

  if (matchesPattern(normalized, BACKEND_UNAVAILABLE_PATTERNS)) return BACKEND_UNAVAILABLE_MESSAGE;

  return UNKNOWN_ERROR_MESSAGE;
};
