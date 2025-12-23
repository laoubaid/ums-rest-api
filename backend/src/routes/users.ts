import { FastifyInstance } from "fastify";
import { deleteUser, getAllUsers, getUserById, updateUser } from "../db";

const UserIdSchema = {
    params: {
        type: 'object',
        required: ['id'],
        properties: {
            id: { type: 'string', pattern: '^[0-9]+$' }
        }
    }
} as const;

const UpdateProfileSchema = {
    body: {
        type: 'object',
        properties: {
            email: { type: 'string', format: 'email' },
            password: { type: 'string' },
            role: { type: 'string' }
        }
    }
} as const;

export default async function userRoutes(server: FastifyInstance): Promise<void> {

    // get all users
    server.get('/', {
        preHandler: [server.authenticate]
    }, async (_request, reply) => {
        try {
            const users = await getAllUsers();

            return reply.send({ users });

        } catch (error) {
            return reply.code(500).send({ error: 'Internal server error' });
        }
    });

    // get logged in user data
    server.get('/me', {
        preHandler: [server.authenticate]
    }, async (request, reply) => {
        try {

            const user = await getUserById(request.user!.userId);

            if (!user) {
                return reply.code(404).send({
                    error: 'User not found'
                });
            }

            return reply.send({ user });

        } catch (err) {
            return reply.code(500).send({ error: 'Internal server error' });
        }
    });

    // update logged in user data
    server.put<{
        Body: { email: string }  // only email updates available for now
    }>('/me', {
        preHandler: [server.authenticate],
        schema: UpdateProfileSchema
    }, async (request, reply) => {
        try {

            const { email } = request.body;

            if (!email) {
                return reply.code(400).send({
                    error: 'Provide email to update'
                });
            }

            const user = await updateUser(request.user!.userId, { email });

            return reply.send({
                message: 'Profile updated successfully',
                user
            });

        } catch (err) {
            return reply.code(400).send({ error: 'Email already exists or update failed' });
        }
    });

    // delete logged in user account
    server.delete('/me', {
        preHandler: [server.authenticate]
    }, async (request, reply) => {
        try {

            await deleteUser(request.user!.userId);

            return reply.send({ message: 'Account deleted successfully' });

        } catch (error) {
            return reply.code(500).send({ error: 'Internal server error' });
        }
    })

    // // update any user requires admin user  [ --! ADMIN ONLY !-- ]
    // server.put<{
    //     Params: { id: string };
    //     Body: UpdateUserBody;
    // }>('/:id', {
    //     preHandler: [verifyToken, requireAdmin],
    //     schema: UpdateProfileSchema
    // }, async (request, reply) => {
    //     try {

    //         const { email, password, role } = request.body;

    //         if (!email) {
    //             return reply.code(400).send({ error: 'Provide email to update' });
    //         }

    //         const userId = parseInt(request.params.id, 10);
    //         if (isNaN(userId)) {
    //             return reply.code(400).send({ error: 'Invalid user ID' });
    //         }

    //         const user = await updateUser(userId, { email, password, role });

    //         return reply.send({
    //             message: 'Profile updated successfully',
    //             user
    //         });

    //     } catch (err) {
    //         return reply.code(400).send({ error: 'Email already exists or update failed' });
    //     }
    // })

    // // delete any user requires admin role  [ --! ADMIN ONLY !-- ]
    // server.delete<{
    //     Params: { id: string }
    // }>('/:id', {
    //     preHandler: [verifyToken, requireAdmin],
    //     schema: UserIdSchema
    // }, async (request, reply) => {
    //     try {

    //         const userId = parseInt(request.params.id, 10);
    //         if (isNaN(userId)) {
    //             return reply.code(400).send({ error: 'Invalid user ID' });
    //         }

    //         await deleteUser(userId);

    //         return reply.send({ message: 'Account deleted successfully' });

    //     } catch (error) {
    //         return reply.code(500).send({ error: 'Internal server error' });
    //     }
    // })

    // get user by id
    server.get<{
        Params: { id: string }
    }>('/:id', {
        preHandler: [server.authenticate],
        schema: UserIdSchema
    }, async (request, reply) => {
        try {

            const userId = parseInt(request.params.id, 10);

            if (isNaN(userId)) {
                return reply.code(400).send({
                    error: 'Invalid user ID'
                });
            }

            const user = await getUserById(userId);

            if (!user) {
                return reply.code(404).send({ error: 'User not found' });
            }

            return reply.send({ user });

        } catch (error) {
            return reply.code(500).send({ error: 'Internal server error' });
        }
    });

}

