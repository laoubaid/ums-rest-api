import jwt from 'jsonwebtoken'

// token verifying function
async function verifyToken(request, reply) {
    try {
        const authHeader = request.headers.authorization

        if (!authHeader)
            throw new Error("No Token")

        const token = authHeader.replace('Bearer ', '')

        // by now i have the token "header.payload.signature"

        const decoded = jwt.verify(token, process.env.JWT_SEC)

        request.user = decoded

    } catch (err) {
        reply.code(401) // status code for Unauthorized
        throw new Error('Invalid or expired token')
    }
}

export { verifyToken }
