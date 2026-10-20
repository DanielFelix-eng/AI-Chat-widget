import jwt from 'jsonwebtoken'

export const generateToken = (res, userId) => {
    if (!process.env.JWT_SECRET) {
        throw new Error('JWT_SECRET is not set in environment variables')
    }

    const token = jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '1d' })

    res.cookie('token', token, {
        httpOnly: true,
        secure: true,
        sameSite: 'none',
        maxAge: 24 * 60 * 60 * 1000,
    })

    return token
}



