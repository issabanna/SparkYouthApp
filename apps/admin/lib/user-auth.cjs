const {
  createClient
} = require('@supabase/supabase-js');
const {
  createHash
} = require('node:crypto');
const sessions = new WeakMap();
const configured = () => !!process.env.SUPABASE_URL && !!process.env.SUPABASE_SERVICE_ROLE_KEY;
const client = () => createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false
  },
  global: {
    fetch: (url, options) => fetch(url, {
      ...options,
      signal: AbortSignal.timeout(15000)
    })
  }
});
function bearer(request) {
  const match = /^Bearer ([A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)$/.exec(request.headers.get('authorization') || '');
  return match && match[1].length < 16000 ? match[1] : null;
}
async function userForRequest(request) {
  if (!sessions.has(request)) sessions.set(request, (async () => {
    const token = bearer(request);
    if (!configured() || !token) return null;
    try {
      const {
        data,
        error
      } = await client().auth.getUser(token);
      return !error && data.user?.id ? data.user : null;
    } catch {
      return null;
    }
  })());
  return sessions.get(request);
}
const ownerForUser = user => createHash('sha256').update('supabase-user:' + user.id).digest('hex');
const publicSession = session => session ? {
  access_token: session.access_token,
  refresh_token: session.refresh_token,
  expires_at: session.expires_at,
  user: {
    id: session.user.id,
    email: session.user.email
  }
} : null;
module.exports = {
  configured,
  client,
  bearer,
  userForRequest,
  ownerForUser,
  publicSession
};
