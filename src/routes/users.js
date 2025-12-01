
import { getAllUsers, getUserById, updateUser, deleteUser } from "../db.js";
import { requireAdmin } from "../middelware/admin.js";
import { verifyToken } from '../middelware/auth.js'

async function userRoutes(server) {

    // Route 1: get all users  [ --! ADMIN ONLY !-- ]
    server.get('/', {
        preHandler: [verifyToken, requireAdmin]  // the prehandler runs first as a check (if succeeded route handler runs)
    }, async (request, reply) => {

        try {
            const users = await getAllUsers()
            return { users }
        } catch (err) {
            reply.code(500)
            return { error: 'Internal server error' }
        }
    })

    // Route 2: get user by id    [ --! ADMIN ONLY !-- ]
    server.get('/:id', {
        preHandler: [verifyToken, requireAdmin]
    }, async (request, reply) => {

        try {
            const user = await getUserById(request.params.id)

            if (!user) {
                reply.code(404)
                return { error: 'User not Found' }
            }
            return { user }
            
        } catch (err) {
            reply.code(500)
            return { error: 'Internal server error' }
        }
    })

    // Route 3: get logedin user profile
    server.get('/me', {
        preHandler: verifyToken
    }, async (request, reply) => {
        
        try {
            const user = await getUserById(request.user.userId)

            if (!user) {
                reply.code(404)
                return { error: 'User not Found' }
            }
            return { user }
            
        } catch (err) {
            reply.code(500)
            return { error: 'Internal server error' }
        }
    })


    // Route 4: update logedin user profile
    server.put('/me', {
        preHandler: verifyToken
    }, async (request, reply) => {
        
        const { email, password } = request.body

        if (!email) {
            reply.code(400)
            return { error: 'Provide email to update' }
        }

        try {
            const user = await updateUser(request.user.userId, { email })

            return {
                message: 'Profile updated successfully',
                user
            }

        } catch (err) {
            reply.code(400)
            return { error: 'Email already exists or update failed' }
        }

    })

    //Route 5: delete logedin user
    server.delete('/me', {
        preHandler: verifyToken
    },async (request, reply) => {

        try {
            await deleteUser(request.user.userId)
            return { message: 'Account deleted successfully' }
        } catch (err) {
            reply.code(500)
            return { error: 'Internal server error' }
        }

    })

    // Route 6: update any user requires admin user  [ --! ADMIN ONLY !-- ]
    server.put('/:id', {
        preHandler: [verifyToken, requireAdmin]
    }, async (request, reply) => {

        const { email, password, role } = request.body

        if (!email && !password && !role) {
            reply.code(400)
            return { error: 'Provide email or password to update' }
        }

        try {
            const user = await updateUser(request.params.id, { email, password, role })

            return {
                message: 'Profile updated successfully',
                user
            }

        } catch (err) {
            reply.code(400)
            return { error: 'Email already exists or update failed' }
        }

    })

    //Route 7: delete any user requires admin role  [ --! ADMIN ONLY !-- ]
    server.delete('/:id', {
        preHandler: [verifyToken, requireAdmin]
    },async (request, reply) => {
        try {
            await deleteUser(request.params.id)
            return { message: 'Account deleted successfully' }
        } catch (err) {
            reply.code(500)
            return { error: 'Internal server error' }
        }

    })
}

export default userRoutes;
