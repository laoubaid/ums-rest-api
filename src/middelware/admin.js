// verifying role is admin
async function requireAdmin(request, reply) {
    if (!request.user) {
        reply.code(401)
        throw new Error('not authenticated')
    }

    if (request.user.role !== 'admin') {
        reply.code(403)
        throw new Error('Admin access required!')
    }
}

export { requireAdmin }