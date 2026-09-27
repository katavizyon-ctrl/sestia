// Route Handlers' single identity entry point. Session V2 (see lib/session.js)
// is the actual resolver as of this commit; this file stays as a thin,
// stable re-export so every existing Conversation/Toparla/room route that
// imports from '@/lib/identity' needs no change.
export { getIdentity, isAccountIdentity } from '@/lib/session';
