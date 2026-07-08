'use client';

import { createClient } from '@/src/lib/supabase/client';
import { useRouter } from 'next/navigation';

export function LogoutButton(){
    const router = useRouter();
    const supabase = createClient();

    async function handleLogout(){
        await supabase.auth.signOut();
        router.push('/login');
        router.refresh();
    }
    return <button onClick={handleLogout}>Đăng xuất</button>
}