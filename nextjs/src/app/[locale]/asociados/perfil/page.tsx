import { auth, signOut } from '@/auth';

const DIRECTUS_URL = process.env.DIRECTUS_URL ?? 'http://directus:8055';
const ADMIN_TOKEN = process.env.DIRECTUS_ADMIN_TOKEN!;

async function getMemberData(userId: string) {
  try {
    const res = await fetch(
      `${DIRECTUS_URL}/items/member_profiles?filter[user_id][_eq]=${userId}&fields=nombre,email,tipo_identificacion,numero_identificacion,fecha_nacimiento,fecha_bautismo,telefono,ultima_actividad&limit=1`,
      { headers: { Authorization: `Bearer ${ADMIN_TOKEN}` }, cache: 'no-store' }
    );
    const { data } = await res.json();
    return data?.[0] ?? null;
  } catch {
    return null;
  }
}

const TIPO_LABEL: Record<string, string> = {
  cedula_identidad: 'Cédula de Identidad',
  dimex: 'DIMEX',
  pasaporte: 'Pasaporte',
};

export default async function PerfilPage() {
  const session = await auth();
  const user = session?.user;
  const profile = user?.id ? await getMemberData(user.id) : null;

  return (
    <div className="p-6 max-w-lg mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-display font-semibold text-white">Mi perfil</h1>
      </div>

      {/* Header card */}
      <div className="p-5 rounded-2xl bg-white/5 border border-white/10 mb-4">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-14 h-14 rounded-full bg-[#461a7a]/60 border border-[#b48af7]/20 flex items-center justify-center text-2xl font-semibold text-white">
            {(profile?.nombre ?? user?.name)?.[0]?.toUpperCase() ?? '?'}
          </div>
          <div>
            <p className="font-semibold text-white">{profile?.nombre ?? user?.name}</p>
            <p className="text-sm text-white/40">{profile?.email ?? user?.email}</p>
          </div>
        </div>
        <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-900/40 text-emerald-300 border border-emerald-500/20 font-semibold">
          Asociado activo
        </span>
      </div>

      {/* Profile data */}
      {profile && (
        <div className="p-5 rounded-2xl bg-white/5 border border-white/10 mb-4 space-y-3">
          {profile.tipo_identificacion && (
            <div>
              <p className="text-xs text-white/40 font-medium">{TIPO_LABEL[profile.tipo_identificacion] ?? profile.tipo_identificacion}</p>
              <p className="text-sm text-white">{profile.numero_identificacion ?? '—'}</p>
            </div>
          )}
          {profile.fecha_nacimiento && (
            <div>
              <p className="text-xs text-white/40 font-medium">Fecha de nacimiento</p>
              <p className="text-sm text-white">{new Date(profile.fecha_nacimiento + 'T12:00:00').toLocaleDateString('es-CR')}</p>
            </div>
          )}
          {profile.telefono && (
            <div>
              <p className="text-xs text-white/40 font-medium">Teléfono</p>
              <p className="text-sm text-white">{profile.telefono}</p>
            </div>
          )}
          {profile.fecha_bautismo && (
            <div>
              <p className="text-xs text-white/40 font-medium">Fecha de bautismo</p>
              <p className="text-sm text-white">{new Date(profile.fecha_bautismo + 'T12:00:00').toLocaleDateString('es-CR')}</p>
            </div>
          )}
        </div>
      )}

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
          className="w-full py-3 rounded-xl bg-red-900/30 border border-red-500/20 text-red-300 hover:bg-red-900/50 transition-colors text-sm font-medium"
        >
          Cerrar sesión
        </button>
      </form>
    </div>
  );
}
