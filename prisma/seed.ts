import { PrismaClient, Role, ProjectStatus, TaskStatus, TaskPriority } from '@prisma/client'
import bcrypt from 'bcryptjs'
const prisma = new PrismaClient()

async function main() {
    console.log('🌱 Seeding TaskFlow Pro database...')

    // Hash passwords
    const adminPass = await bcrypt.hash('admin123', 12)
    const userPass = await bcrypt.hash('password', 12)

    // Clear existing data
    await prisma.auditLog.deleteMany()
    await prisma.notification.deleteMany()
    await prisma.fileAttachment.deleteMany()
    await prisma.taskComment.deleteMany()
    await prisma.task.deleteMany()
    await prisma.project.deleteMany()
    await prisma.user.deleteMany()
    await prisma.organization.deleteMany()

    // ═══ Organizations ═══
    const acmeCorp = await prisma.organization.create({
        data: { name: 'Acme Corporation', domain: 'acmecorp.com' },
    })

    const techVentures = await prisma.organization.create({
        data: { name: 'Tech Ventures', domain: 'techventures.io' },
    })

    // ═══ Users ═══
    const admin = await prisma.user.create({
        data: {
            name: 'Admin User',
            email: 'admin@acmecorp.com',
            password: adminPass,
            role: Role.SUPER_ADMIN,
            organizationId: acmeCorp.id,
        },
    })

    const pmUser = await prisma.user.create({
        data: {
            name: 'Sarah Johnson',
            email: 'sarah@acmecorp.com',
            password: userPass,
            role: Role.MANAGER,
            organizationId: acmeCorp.id,
        },
    })

    const devUser = await prisma.user.create({
        data: {
            name: 'Mike Chen',
            email: 'mike@acmecorp.com',
            password: userPass,
            role: Role.EMPLOYEE,
            organizationId: acmeCorp.id,
        },
    })

    const viewer = await prisma.user.create({
        data: {
            name: 'Jane Viewer',
            email: 'jane@acmecorp.com',
            password: userPass,
            role: Role.EMPLOYEE,
            organizationId: acmeCorp.id,
        },
    })

    // ═══ Projects ═══
    const projectA = await prisma.project.create({
        data: {
            name: 'Website Redesign',
            description: 'Complete overhaul of the corporate website with modern UI/UX, mobile responsiveness, and improved performance.',
            clientName: 'Internal',
            startDate: new Date('2026-01-15'),
            endDate: new Date('2026-04-30'),
            budget: 45000,
            status: ProjectStatus.ACTIVE,
            progress: 65,
            color: '#3B82F6',
            organizationId: acmeCorp.id,
            creatorId: admin.id,
            managerId: pmUser.id,
        },
    })

    const projectB = await prisma.project.create({
        data: {
            name: 'Mobile App Launch',
            description: 'Build and launch the company mobile application for both iOS and Android platforms.',
            clientName: 'Acme Corp',
            startDate: new Date('2026-02-01'),
            endDate: new Date('2026-06-30'),
            budget: 120000,
            status: ProjectStatus.ACTIVE,
            progress: 35,
            color: '#8B5CF6',
            organizationId: acmeCorp.id,
            creatorId: pmUser.id,
            managerId: pmUser.id,
        },
    })

    const projectC = await prisma.project.create({
        data: {
            name: 'CRM Integration',
            description: 'Integrate Salesforce CRM with internal systems for seamless data flow.',
            clientName: 'Sales Dept',
            startDate: new Date('2026-03-01'),
            endDate: new Date('2026-05-15'),
            budget: 30000,
            status: ProjectStatus.PLANNED,
            progress: 0,
            color: '#10B981',
            organizationId: acmeCorp.id,
            creatorId: admin.id,
            managerId: null,
        },
    })

    const projectD = await prisma.project.create({
        data: {
            name: 'Security Audit',
            description: 'Annual security audit and compliance review of all systems.',
            clientName: 'Compliance Team',
            startDate: new Date('2025-11-01'),
            endDate: new Date('2026-01-31'),
            budget: 15000,
            status: ProjectStatus.COMPLETED,
            progress: 100,
            color: '#F59E0B',
            organizationId: acmeCorp.id,
            creatorId: admin.id,
            managerId: pmUser.id,
        },
    })

    // ═══ Tasks for Website Redesign ═══
    const tasksData = [
        {
            title: 'Design homepage mockup',
            description: 'Create high-fidelity mockup for the new homepage design',
            dueDate: new Date('2026-02-28'),
            priority: TaskPriority.HIGH,
            status: TaskStatus.DONE,
            sortOrder: 0,
            projectId: projectA.id,
            assigneeId: devUser.id,
            creatorId: pmUser.id,
        },
        {
            title: 'Implement responsive navigation',
            description: 'Build the responsive navigation bar with mobile hamburger menu',
            dueDate: new Date('2026-03-10'),
            priority: TaskPriority.HIGH,
            status: TaskStatus.IN_PROGRESS,
            sortOrder: 1,
            projectId: projectA.id,
            assigneeId: devUser.id,
            creatorId: pmUser.id,
        },
        {
            title: 'Set up CI/CD pipeline',
            description: 'Configure GitHub Actions for automated testing and deployment',
            dueDate: new Date('2026-03-05'),
            priority: TaskPriority.MEDIUM,
            status: TaskStatus.TODO,
            sortOrder: 2,
            projectId: projectA.id,
            assigneeId: devUser.id,
            creatorId: admin.id,
        },
        {
            title: 'Content migration',
            description: 'Migrate existing content to the new CMS structure',
            dueDate: new Date('2026-03-20'),
            priority: TaskPriority.LOW,
            status: TaskStatus.TODO,
            sortOrder: 3,
            projectId: projectA.id,
            creatorId: pmUser.id,
        },
        {
            title: 'Performance optimization',
            description: 'Optimize Core Web Vitals and achieve Lighthouse 90+ score',
            dueDate: new Date('2026-04-15'),
            priority: TaskPriority.HIGH,
            status: TaskStatus.TODO,
            sortOrder: 4,
            projectId: projectA.id,
            assigneeId: devUser.id,
            creatorId: pmUser.id,
        },
    ]

    const tasks = []
    for (const data of tasksData) {
        tasks.push(await prisma.task.create({ data }))
    }

    // Tasks for Mobile App
    const mobileTasksData = [
        {
            title: 'Set up React Native project',
            description: 'Initialize RN project with TypeScript and configure navigation',
            dueDate: new Date('2026-02-20'),
            priority: TaskPriority.HIGH,
            status: TaskStatus.DONE,
            sortOrder: 0,
            projectId: projectB.id,
            assigneeId: devUser.id,
            creatorId: pmUser.id,
        },
        {
            title: 'Design authentication flow',
            description: 'Implement login/signup with biometric authentication support',
            dueDate: new Date('2026-03-15'),
            priority: TaskPriority.HIGH,
            status: TaskStatus.IN_PROGRESS,
            sortOrder: 1,
            projectId: projectB.id,
            assigneeId: devUser.id,
            creatorId: pmUser.id,
        },
        {
            title: 'Build dashboard screen',
            dueDate: new Date('2026-03-30'),
            priority: TaskPriority.MEDIUM,
            status: TaskStatus.TODO,
            sortOrder: 2,
            projectId: projectB.id,
            creatorId: pmUser.id,
        },
    ]

    for (const data of mobileTasksData) {
        await prisma.task.create({ data })
    }

    // ═══ Task Comments ═══
    await prisma.taskComment.createMany({
        data: [
            {
                content: 'The mockup looks great! Let\'s proceed with the implementation.',
                taskId: tasks[0].id,
                authorId: pmUser.id,
            },
            {
                content: 'I\'ve pushed the initial navigation component. Need review.',
                taskId: tasks[1].id,
                authorId: devUser.id,
            },
            {
                content: 'Please prioritize mobile breakpoints for the nav bar.',
                taskId: tasks[1].id,
                authorId: pmUser.id,
            },
        ],
    })

    // ═══ Notifications ═══
    await prisma.notification.createMany({
        data: [
            {
                type: 'TASK_ASSIGNED',
                title: 'New task assigned',
                message: 'You\'ve been assigned "Implement responsive navigation"',
                userId: devUser.id,
                link: `/dashboard/projects/${projectA.id}`,
            },
            {
                type: 'DEADLINE_REMINDER',
                title: 'Deadline approaching',
                message: '"Set up CI/CD pipeline" is due in 3 days',
                userId: devUser.id,
                link: `/dashboard/projects/${projectA.id}`,
            },
            {
                type: 'COMMENT_ADDED',
                title: 'New comment',
                message: 'Sarah commented on "Implement responsive navigation"',
                userId: devUser.id,
                link: `/dashboard/projects/${projectA.id}`,
            },
        ],
    })

    console.log('✅ Seeding complete!')
    console.log('')
    console.log('📧 Login Credentials:')
    console.log('   Admin:   admin@acmecorp.com / admin123')
    console.log('   PM:      sarah@acmecorp.com / password')
    console.log('   Dev:     mike@acmecorp.com  / password')
    console.log('   Viewer:  jane@acmecorp.com  / password')
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
