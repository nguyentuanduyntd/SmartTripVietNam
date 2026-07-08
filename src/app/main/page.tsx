import { createClient } from '@/src/lib/supabase/server';

export default async function HomePage(){
    const supabase = await createClient();
    const { data: { user }} = await supabase.auth.getUser();

    return <div>{user ? `Xin chào ${user.email}` : 'Bạn chưa đăng nhập'}</div>;
}