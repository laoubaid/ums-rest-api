import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcrypt';

const prisma = new PrismaClient()



// create user 
async function  createUser(username, email, password, role = 'user') {
    const hash = await bcrypt.hash(password, 10)

    const user = await prisma.user.create({
        data: {
            username,
            email,
            password: hash,
            role
        }, select: {
            id: true,
            username: true,
            email: true,
            role: true
        }
    })

    return user;
}

// get all users
async function getAllUsers() {
    
    const users = await prisma.user.findMany({
        select: {
            id: true,
            username: true,
            email: true,
            role: true,
            createdAt: true
        }
    })

    return users;
}

// get user by Id
async function getUserById(id) {
    
    const user = await prisma.user.findUnique({
        where: {
            id: parseInt(id)
        },
        select: {
            id: true,
            username: true,
            email: true,
            role: true,
            createdAt: true
        }
    })

    return user;
}

// get user by username
async function getUserByUsername(username) {
    const user = await prisma.user.findUnique({
        where: {
            username: username
        }
    })

    return user;
}

// updating the user data
async function updateUser(id, updates) {
    const data = {}
    
    if (updates.email !== undefined)
        data.email = updates.email
    if (updates.role !== undefined)
        data.role = updates.role
    if (updates.password !== undefined) {
        const hash = await bcrypt.hash(updates.password, 10)
        data.password = hash
    }

    const user = await prisma.user.update({
        where: {
            id: parseInt(id)
        },
        data: data,
        select: {
            id: true,
            username: true,
            email: true,
            role: true,
            updatedAt: true
        }
    })

    return user;
}

// deleting a user
async function deleteUser(id) {
    
    const user = await prisma.user.delete({
        where: {
            id: parseInt(id)
        }
    })

    return user;
}

async function createPasswordResetToken(id) {
    
    const crypto = await import('crypto')

    const token = crypto.randomBytes(12).toString('hex')


    const expiresAt = new Date(Date.now() + 60 * 15 * 1000)  // 15 min from now 

    await prisma.passwordReset.deleteMany({
        where: { id }
    })
    
    const resetToken = await prisma.passwordReset.create({
        data: {
            token,
            userId: id,
            expiresAt
        }
    })

    return resetToken;
}

// Find valid reset token
async function findPasswordResetToken(token) {
    const resetToken = await prisma.passwordReset.findUnique({
        where: { token },
        include: { user: true }
    })
    
    if (!resetToken) {
        return null
    }
    
    if (resetToken.expiresAt < new Date()) {
        await prisma.passwordReset.delete({
            where: { id: resetToken.id }
        })
        return null
    }
    
    return resetToken;
}


async function deletePasswordResetToken(token) {
    await prisma.passwordReset.delete({
        where: { token }
    })
}


////// Temporary ///////
async function createAdminIfNeeded() {
    let user = await getUserByUsername('admin')

    if (!user) {
        user = await createUser('admin', 'admin@example.com', 'admin', 'admin')
        if (user)
            console.log("\x1b[32m%s\x1b[0m", 'Admin user created: username=admin, password=admin123')
    }
}

async function createTempUsers() {
    const tempUsers = [
        { username: 'test', email: 'test@test.com', password: 'test', role: 'user' },
        { username: 'one',  email: 'one@test.com',  password: '1111', role: 'user' },
        { username: 'two',  email: 'two@test.com',  password: '2222', role: 'user' }
    ];

    for (const u of tempUsers) {
        const existing = await getUserByUsername(u.username);
        
        if (!existing) {
            try {
                await createUser(u.username, u.email, u.password, u.role);
                console.log(`Temp user created: username=${u.username}, password=${u.password}`);
            } catch (err) {
                console.error(`Failed to create ${u.username}:`, err.message);
            }
        } else {
            console.log(`User ${u.username} already exists, skipping...`);
        }
    }
}

// Initialize all temp data
async function initializeTempData() {
    console.log('🚀 Setting up temporary data...\n');
    
    await createAdminIfNeeded();
    await createTempUsers();
    
    console.log('\n✨ Temporary data setup complete!');
}

//////////////////////////////////////////////////


export {
    prisma,
    createUser,
    getAllUsers,
    getUserById,
    getUserByUsername ,
    updateUser,
    deleteUser,
    
    createPasswordResetToken,
    findPasswordResetToken,
    deletePasswordResetToken,

    /// tmp
    initializeTempData
}
