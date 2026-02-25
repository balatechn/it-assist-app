import { PrismaClient, Role } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
    // Clear existing
    await prisma.user.deleteMany()
    await prisma.company.deleteMany()

    // Seed Companies
    const rainland = await prisma.company.create({
        data: { name: 'Rainland Auto Corp', domain: 'rainlandautocorp.com' },
    })

    const globalTech = await prisma.company.create({
        data: { name: 'Global Tech', domain: 'globaltech.com' },
    })

    // Seed SUPER_ADMIN
    await prisma.user.create({
        data: {
            name: 'Super Admin',
            email: 'admin@rainlandautocorp.com',
            password: 'password', // Demo plain password matching
            role: Role.SUPER_ADMIN,
            companyId: rainland.id,
        },
    })

    // Seed Some Dummy Assets
    await prisma.systemAsset.createMany({
        data: [
            {
                companyId: rainland.id, department: 'Engineering', location: 'HQ',
                product: 'MacBook Pro M2', serialNo: 'C02XXXXX1', make: 'Apple',
                osVersion: 'macOS Sonoma', config: '16GB RAM / 512GB SSD', status: 'Active',
                cost: 1999.00
            },
            {
                companyId: globalTech.id, department: 'Sales', location: 'Remote',
                product: 'Dell XPS 15', serialNo: 'D18XXX', make: 'Dell',
                osVersion: 'Windows 11 Pro', config: '32GB RAM / 1TB SSD', status: 'Active',
                cost: 2199.00
            }
        ]
    })

    // Seed Expiring Licenses Demo
    await prisma.softwareLicense.create({
        data: {
            companyId: rainland.id, softwareName: 'Creative Cloud All Apps',
            category: 'Design', licenseType: 'Subscription', totalPurchased: 5,
            licensesInUse: 4, cost: 79.99, renewalDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // Expires in 10 days
            vendor: 'Adobe'
        }
    })

    console.log('Seeding finished.')
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
