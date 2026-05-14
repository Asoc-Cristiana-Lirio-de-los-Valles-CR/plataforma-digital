import { auth } from '@/auth';
import { signOut } from '@/auth';

export default async function PerfilPage() {
  const session = await auth();
  const user = session?.user;

  return (
    <div className="p-6 max-w-lg mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-display font-semibold text-white">Mi perfil</h1>
      </div>

      <div className="p-5 rounded-2xl bg-white/5 border border-white/10 mb-4">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-14 h-14 rounded-full bg-[#461a7a]/60 border border-[#b48af7]/20 flex items-center justify-center text-2xl">
            {user?.name?.[0]?.toUpperCase() ?? '?'}
          </div>
          <div>
            <p className="font-semibold text-white">{user?.name}</p>
            <p className="text-sm text-white/40">{user?.email}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-900/40 text-emerald-300 border border-emerald-500/20 font-semibold">
            Asociado activo
          </span>
        </div>
      </div>

      <div className="p-4 rounded-2xl bg-white/5 border border-white/10 mb-6">
        <p className="text-xs text-white/30 text-center">
          Para actualizar tu información personal, contacta al administrador de la iglesia.
        </p>
      </div>

      <form
        action={async () => {
          'use server';
          await signOut({ redirectTo: '/es/asociados/login' });
        }}
      >
        <button
          type="submit"
          className="w-full py-3 rounded-xl bg-red-900/30 border border-red-500/20 text-red-300
                     hover:bg-red-900/50 transition-colors text-sm font-medium"
        >
          Cerrar sesión
        </button>
      </form>
    </div>
  );
}
