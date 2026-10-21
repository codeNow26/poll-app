import type { Supabase } from '../services/supabase';

export type VotesChannel = ReturnType<Supabase['subscribeToVotes']>;