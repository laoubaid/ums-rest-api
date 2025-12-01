
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken'
import {
    createUser,
    getUserByUsername,
    createPasswordResetToken,
    findPasswordResetToken,
    deletePasswordResetToken,
    updateUser,
    prisma
} from "../db.js";


async function authRoutes(server, ops) {

    // Route 1: login using username and password
    server.post('/login', async (request, reply) => {
        const { username, password } = request.body

        if (!password || !username) {
            reply.code(400)
            return { error: "username and password are requierd!" }
        }
        
        try {
            const user = await getUserByUsername(username)


            if (user) {
                const isMatch = await bcrypt.compare(password, user.password)

                if (isMatch) {
                    const jwtkn = jwt.sign(
                        {
                            userId: user.id,
                            username: user.username,
                            role: user.role
                        },
                        process.env.JWT_SEC,
                        { expiresIn: '7d' } // 7 days access token (refresh token not implemented yet)
                    )

                    return {
                        message: 'Login successful',
                        token: jwtkn,
                        user: {
                            id: user.id,
                            username: user.username,
                            email: user.email,
                            role: user.role
                        }
                    }
                }
            }
            reply.code(401)
            return { error: 'Invalid username or password' }

        } catch (err) {
            reply.code(500)
            return { error: 'Internal server error' }
        }
    })

    // Route 2: register a new user
    server.post('/register', async (request, reply) => {
        const { username, email, password } = request.body
        
        if (!username || !email || !password) {
            reply.code(400)
            return { error: "username, email and password are required" }
        }
        
        if (password && password.length < 4) {
            reply.code(400)
            return { error: 'Password must be at least 4 characters' }
        }

        try {
            const user = await createUser(username, email, password, 'user')

            reply.code(201)
            return {
                message: 'User registered successfully',
                user
            }

        } catch (err) {
            reply.code(400)
            return { error: 'Username or email already exists' }
        }

    })

    // Route 3: request password reset
    server.post('/forgot-password', async (request, reply) => {
        const { email } = request.body

        if (!email) {
            reply.code(400)
            return { error: 'Email is required!' }
        }

        try {
            const user = await prisma.user.findUnique({
                where: { email }
            })

            if (user) {
                const resetToken = await createPasswordResetToken(user.id)

                return { 
                    message: 'A reset link has been sent',
                    // !!! ONLY FOR DEVELOPMENT returnin the reset token as part of response to testit
                    devToken: resetToken.token 
                }
            }
            return { message: 'A reset link has been sent' }
        } catch (err) {
            reply.code(500)
            return { error: 'Internal server error', err }
        }
    })

    // Route 4: Reset password with token
    server.post('/reset-password', async (request, reply) => {
        const { token, newPassword } = request.body
        
        if (!token || !newPassword) {
            reply.code(400)
            return { error: 'Token and new password are required' }
        }
        
        if (newPassword.length < 4) {
            reply.code(400)
            return { error: 'Password must be at least 4 characters' }
        }
        
        try {
            // Find and validate token
            const resetToken = await findPasswordResetToken(token)
            
            if (!resetToken) {
                reply.code(400)
                return { error: 'Invalid or expired token' }
            }

            await updateUser(resetToken.userId, { password: newPassword })
            await deletePasswordResetToken(token)
            
            return { message: 'Password reset successfully' }

        } catch (err) {
            reply.code(500)
            return { error: 'Server error' }
        }
    })

}

export default authRoutes;
