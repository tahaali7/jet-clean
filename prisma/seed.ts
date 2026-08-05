import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  // Create admin
  await prisma.adminAccount.upsert({
    where: { id: 'admin' },
    update: {},
    create: { id: 'admin', name: 'طه علي', password: '19970880528' }
  })

  // Create branches
  const branches = [
    { name: 'بن غرسه' },
    { name: 'ابونواس' },
    { name: 'المنصور' },
    { name: 'عين زاره' }
  ]

  for (const b of branches) {
    await prisma.branch.upsert({
      where: { name: b.name },
      update: {},
      create: b
    })
  }

  const b1 = await prisma.branch.findUnique({ where: { name: 'بن غرسه' } })
  const b2 = await prisma.branch.findUnique({ where: { name: 'ابونواس' } })
  const b3 = await prisma.branch.findUnique({ where: { name: 'المنصور' } })
  const b4 = await prisma.branch.findUnique({ where: { name: 'عين زاره' } })

  const employees = [
    { id: 'ahmed_' + b1!.id, name: 'أحمد', branchId: b1!.id, shift: 'الفترة الصباحية', password: '1234' },
    { id: 'hashem_' + b1!.id, name: 'هاشم', branchId: b1!.id, shift: 'الفترة المسائية', password: '1234' },
    { id: 'haitham_' + b2!.id, name: 'هيثم', branchId: b2!.id, shift: 'الفترة الصباحية', password: '1234' },
    { id: 'iyad_' + b2!.id, name: 'اياد', branchId: b2!.id, shift: 'الفترة المسائية', password: '1234' },
    { id: 'wessam_' + b3!.id, name: 'وسام', branchId: b3!.id, shift: 'الفترة كاملة', password: '1234' },
    { id: 'osama_' + b4!.id, name: 'اسامه', branchId: b4!.id, shift: 'الفترة الصباحية', password: '1234' },
    { id: 'iyad2_' + b4!.id, name: 'اياد', branchId: b4!.id, shift: 'الفترة المسائية', password: '1234' },
  ]

  for (const emp of employees) {
    await prisma.employee.upsert({
      where: { id: emp.id },
      update: {},
      create: emp
    })
  }

  console.log('Seed completed!')
}

main().catch(console.error).finally(() => prisma.$disconnect())
