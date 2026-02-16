import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ntugltfyugwnnelihsgo.supabase.co';
const supabaseKey = 'sb_publishable_FAbXfnodeCwvc0zutP80Sw_HxKuSHfe'; // This is the anon key from .env

const supabase = createClient(supabaseUrl, supabaseKey);

async function forceUpdate() {
    console.log('Forcing avatar update for CampWilkins...');

    // 1. Get User
    const { data: user, error: userError } = await supabase
        .from('profiles')
        .select('*')
        .ilike('username', 'campwilkins%')
        .maybeSingle();

    if (userError || !user) {
        console.error('User search failed:', userError);
        return;
    }
    console.log('Found user:', user.username, user.id);

    // 2. Hardcoded specific file from previous success log: avatar_1771262206107.png
    const fileName = 'avatar_1771262206107.png';
    const publicUrl = `${supabaseUrl}/storage/v1/object/public/avatars/${user.id}/${fileName}`;

    console.log('Setting URL:', publicUrl);

    // 3. Update
    const { data: updated, error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id)
        .select();

    if (updateError) {
        console.error('Update failed:', updateError);
    } else {
        console.log('Update SUCCESS:', updated);
    }
}

forceUpdate();
