export async function register() {
  // تشغيل الترحيل عند بدء السيرفر
  const { ensureMigrations } = await import('@/lib/db')
  await ensureMigrations()
}
